import { supabase } from "@/integrations/supabase/client";

export interface NotificationData {
  mangaId?: string;
  chapterId?: string;
  submissionId?: string;
  reportId?: string;
  userId?: string;
}

export const createNotification = async (
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: NotificationData,
) => {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      message,
      data,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error creating notification:", error);
    return false;
  }
};

// إشعار للمديرين عند تقديم محتوى جديد
export const notifyAdminsOfSubmission = async (
  submissionType: "manga" | "chapter",
  submissionId: string,
  submitterName: string,
) => {
  try {
    // جلب جميع المديرين
    const { data: admins } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("role", "admin");

    if (admins && admins.length > 0) {
      const notifications = admins.map((admin) => ({
        user_id: admin.user_id,
        type: "content_submission",
        title: `طلب ${submissionType === "manga" ? "مانجا" : "فصل"} جديد`,
        message: `تم تقديم طلب ${submissionType === "manga" ? "مانجا" : "فصل"} جديد من ${submitterName}`,
        data: { submissionId, submissionType },
      }));

      const { error } = await supabase
        .from("notifications")
        .insert(notifications);

      if (error) throw error;
    }
  } catch (error) {
    console.error("Error notifying admins:", error);
  }
};

// إشعار المستخدم بقبول أو رفض المحتوى
export const notifyUserOfSubmissionStatus = async (
  userId: string,
  submissionType: "manga" | "chapter",
  status: "approved" | "rejected",
  notes?: string,
) => {
  const title =
    status === "approved"
      ? `تم قبول ${submissionType === "manga" ? "المان��ا" : "الفصل"}`
      : `تم رفض ${submissionType === "manga" ? "المانجا" : "الفصل"}`;

  const message =
    status === "approved"
      ? `تم قبول ${submissionType === "manga" ? "المانجا" : "الفصل"} الذي قدمته ونشره بنجاح`
      : `تم رفض ${submissionType === "manga" ? "المانجا" : "الفصل"} الذي قدمته${notes ? `: ${notes}` : ""}`;

  await createNotification(
    userId,
    status === "approved" ? "content_approved" : "content_rejected",
    title,
    message,
  );
};

// إشعار بفصل جديد للمستخدمين الذين أضافوا المانجا للمفضلة
export const notifyFavoriteUsersOfNewChapter = async (
  mangaId: string,
  mangaTitle: string,
  chapterNumber: number,
) => {
  try {
    // جلب المستخدمين الذين أضافوا هذه المانجا للمفضلة
    const { data: favoriteUsers } = await supabase
      .from("user_favorites")
      .select("user_id")
      .eq("manga_id", mangaId);

    if (favoriteUsers && favoriteUsers.length > 0) {
      const notifications = favoriteUsers.map((favorite) => ({
        user_id: favorite.user_id,
        type: "new_chapter",
        title: "فصل جديد متاح!",
        message: `تم نشر فصل جديد (${chapterNumber}) من ${mangaTitle}`,
        data: { mangaId, chapterNumber },
      }));

      const { error } = await supabase
        .from("notifications")
        .insert(notifications);

      if (error) throw error;
    }
  } catch (error) {
    console.error("Error notifying favorite users:", error);
  }
};

// إشعار بمستخدم جديد للمديرين
export const notifyAdminsOfNewUser = async (
  newUserName: string,
  newUserId: string,
) => {
  try {
    const { data: admins } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("role", "admin");

    if (admins && admins.length > 0) {
      const notifications = admins.map((admin) => ({
        user_id: admin.user_id,
        type: "new_user",
        title: "مستخدم جديد انضم",
        message: `انضم ${newUserName} إلى الموقع`,
        data: { newUserId },
      }));

      const { error } = await supabase
        .from("notifications")
        .insert(notifications);

      if (error) throw error;
    }
  } catch (error) {
    console.error("Error notifying admins of new user:", error);
  }
};

// إشعار ببلاغ جديد
export const notifyAdminsOfNewReport = async (
  reportId: string,
  targetType: string,
  reason: string,
) => {
  try {
    const { data: admins } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("role", "admin");

    if (admins && admins.length > 0) {
      const notifications = admins.map((admin) => ({
        user_id: admin.user_id,
        type: "report",
        title: "بلاغ جديد",
        message: `تم تقديم بلاغ جديد على ${targetType}: ${reason}`,
        data: { reportId, targetType },
      }));

      const { error } = await supabase
        .from("notifications")
        .insert(notifications);

      if (error) throw error;
    }
  } catch (error) {
    console.error("Error notifying admins of report:", error);
  }
};
