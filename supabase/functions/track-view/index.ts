import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mangaId, type = "manga" } = await req.json();

    if (!mangaId) {
      throw new Error("mangaId is required");
    }

    console.log(`Processing ${type} view for ID: ${mangaId}`);

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Get user from authorization header (if provided)
    const authHeader = req.headers.get("Authorization");
    let userId = null;
    let sessionId = null;

    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data: userData } = await supabaseClient.auth.getUser(token);
        userId = userData.user?.id || null;
        console.log("User ID:", userId);
      } catch (error) {
        console.log("Could not get user from token:", error);
      }
    }

    // If no user, create session ID from IP and User-Agent
    if (!userId) {
      const ip =
        req.headers.get("x-forwarded-for") ||
        req.headers.get("cf-connecting-ip") ||
        "unknown";
      const userAgent = req.headers.get("user-agent") || "unknown";
      sessionId = `${ip}-${userAgent}`.slice(0, 100);
      console.log("Session ID:", sessionId);
    }

    // Check if view already exists
    let existingView = null;
    try {
      if (userId) {
        const { data } = await supabaseClient
          .from(tableName)
          .select("id")
          .eq(idField, mangaId)
          .eq("user_id", userId)
          .maybeSingle();
        existingView = data;
      } else if (sessionId) {
        const { data } = await supabaseClient
          .from(tableName)
          .select("id")
          .eq(idField, mangaId)
          .eq("session_id", sessionId)
          .maybeSingle();
        existingView = data;
      }
    } catch (error) {
      console.log("Error checking existing view:", error);
    }

    console.log("Existing view:", existingView);

    // If view doesn't exist, add it
    if (!existingView) {
      try {
        // Prepare insert data
        const insertData: any = {
          user_id: userId,
          session_id: sessionId,
        };
        insertData[idField] = mangaId;

        // Insert new view record - let the trigger handle the counter update
        const { error: viewError } = await supabaseClient
          .from(tableName)
          .insert(insertData);

        if (viewError) {
          console.error("Error inserting view:", viewError);
          throw viewError;
        }

        console.log("View recorded successfully");

        return new Response(
          JSON.stringify({
            success: true,
            newView: true,
            message: "View recorded successfully",
            mangaId: mangaId,
            type: type,
            userId: userId,
            sessionId: sessionId,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
        );
      } catch (error) {
        console.error("Error processing new view:", error);
        throw error;
      }
    } else {
      console.log("View already exists");
      return new Response(
        JSON.stringify({
          success: true,
          newView: false,
          message: "View already recorded for this user/session",
          existingViewId: existingView.id,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }
  } catch (error) {
    console.error("Error in track-view function:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
