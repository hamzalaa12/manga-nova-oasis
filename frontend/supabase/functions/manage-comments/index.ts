import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CommentRequest {
  action: "create" | "update" | "delete" | "report" | "like" | "hide";
  commentId?: string;
  chapterId?: string;
  content?: string;
  parentId?: string;
  isSpoiler?: boolean;
  isLike?: boolean;
  reason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      action,
      commentId,
      chapterId,
      content,
      parentId,
      isSpoiler,
      isLike,
      reason,
    }: CommentRequest = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Get user from authorization header
    const authHeader = req.headers.get("Authorization");
    let userId = null;
    let sessionId = null;
    let isAdmin = false;

    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data: userData } = await supabaseClient.auth.getUser(token);
        userId = userData.user?.id || null;

        if (userId) {
          const { data: profile } = await supabaseClient
            .from("profiles")
            .select("role")
            .eq("user_id", userId)
            .single();
          isAdmin = profile?.role === "admin";
        }
      } catch (error) {
        console.log("Could not get user from token:", error);
      }
    }

    if (!userId) {
      const ip = req.headers.get("x-forwarded-for") || "unknown";
      const userAgent = req.headers.get("user-agent") || "unknown";
      sessionId = `${ip}-${userAgent}`.slice(0, 100);
    }

    // Check if user is banned
    const { data: bannedUser } = await supabaseClient
      .from("banned_users")
      .select("*")
      .or(`user_id.eq.${userId},session_id.eq.${sessionId}`)
      .maybeSingle();

    if (
      bannedUser &&
      (bannedUser.banned_until === null ||
        new Date(bannedUser.banned_until) > new Date())
    ) {
      return new Response(
        JSON.stringify({ error: "المستخدم محظور من التعليق" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        },
      );
    }

    switch (action) {
      case "create":
        if (!content || !chapterId) {
          throw new Error("المحتوى ومعرف الفصل مطلوبان");
        }

        // Filter banned words
        const { data: filteredContent } = await supabaseClient.rpc(
          "filter_banned_words",
          { content_text: content },
        );

        const { data: newComment, error: createError } = await supabaseClient
          .from("chapter_comments")
          .insert({
            chapter_id: chapterId,
            user_id: userId,
            parent_id: parentId || null,
            content: filteredContent || content,
            is_spoiler: isSpoiler || false,
          })
          .select("*")
          .single();

        if (createError) throw createError;

        return new Response(
          JSON.stringify({ success: true, comment: newComment }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );

      case "update":
        if (!commentId || !content) {
          throw new Error("معرف التعليق والمحتوى مطلوبان");
        }

        // Check ownership or admin
        const { data: commentToUpdate } = await supabaseClient
          .from("chapter_comments")
          .select("user_id")
          .eq("id", commentId)
          .single();

        if (
          !commentToUpdate ||
          (commentToUpdate.user_id !== userId && !isAdmin)
        ) {
          throw new Error("غير مسموح بتعديل هذا التعليق");
        }

        const { data: filteredUpdateContent } = await supabaseClient.rpc(
          "filter_banned_words",
          { content_text: content },
        );

        const { error: updateError } = await supabaseClient
          .from("chapter_comments")
          .update({
            content: filteredUpdateContent || content,
            edited_at: new Date().toISOString(),
            edited_by: isAdmin ? userId : null,
          })
          .eq("id", commentId);

        if (updateError) throw updateError;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      case "delete":
        if (!commentId) {
          throw new Error("معرف التعليق مطلوب");
        }

        // Check ownership or admin
        const { data: commentToDelete } = await supabaseClient
          .from("chapter_comments")
          .select("user_id")
          .eq("id", commentId)
          .single();

        if (
          !commentToDelete ||
          (commentToDelete.user_id !== userId && !isAdmin)
        ) {
          throw new Error("غير مسموح بحذف هذا التعليق");
        }

        const { error: deleteError } = await supabaseClient
          .from("chapter_comments")
          .update({ is_deleted: true })
          .eq("id", commentId);

        if (deleteError) throw deleteError;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      case "like":
        if (!commentId || isLike === undefined) {
          throw new Error("معرف التعليق ونوع الإعجاب مطلوبان");
        }

        if (!userId) {
          throw new Error("يجب تسجيل الدخول للإعجاب");
        }

        // Remove existing like/dislike
        await supabaseClient
          .from("comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", userId);

        // Add new like/dislike
        const { error: likeError } = await supabaseClient
          .from("comment_likes")
          .insert({
            comment_id: commentId,
            user_id: userId,
            is_like: isLike,
          });

        if (likeError) throw likeError;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      case "report":
        if (!commentId || !reason) {
          throw new Error("معرف التعليق والسبب مطلوبان");
        }

        const { error: reportError } = await supabaseClient
          .from("comment_reports")
          .insert({
            comment_id: commentId,
            user_id: userId,
            session_id: sessionId,
            reason: reason,
          });

        if (reportError) throw reportError;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      case "hide":
        if (!commentId || !isAdmin) {
          throw new Error("صلاحيات الأدمن مطلوبة");
        }

        const { error: hideError } = await supabaseClient
          .from("chapter_comments")
          .update({ is_hidden: true })
          .eq("id", commentId);

        if (hideError) throw hideError;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      default:
        throw new Error("عملية غير مدعومة");
    }
  } catch (error) {
    console.error("Error in manage-comments function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "خطأ في الخادم" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
