// أنواع البيانات لنظام المستخدمين

export type UserRole =
  | "user"
  | "beginner_fighter"
  | "elite_fighter"
  | "leader"
  | "admin";

export interface UserProfile {
  user_id: string;
  display_name: string;
  role: UserRole;
  avatar_url?: string;
  bio?: string;
  join_date: string;
  last_active: string;
  is_banned: boolean;
  ban_until?: string;
  ban_reason?: string;
}

export interface UserFavorite {
  id: string;
  user_id: string;
  manga_id: string;
  created_at: string;
  manga?: {
    id: string;
    title: string;
    cover_image_url: string;
    slug: string;
  };
}

export interface Notification {
  id: string;
  user_id: string;
  type:
    | "new_chapter"
    | "new_manga"
    | "report"
    | "new_user"
    | "content_approved"
    | "content_rejected";
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

export interface ContentSubmission {
  id: string;
  user_id: string;
  type: "manga" | "chapter";
  content_id?: string;
  data: any;
  status: "pending" | "approved" | "rejected";
  reviewed_by?: string;
  review_notes?: string;
  created_at: string;
  reviewed_at?: string;
  user?: UserProfile;
}

export interface Report {
  id: string;
  reporter_id?: string;
  reported_user_id: string;
  target_type: "comment" | "manga" | "user";
  target_id: string;
  reason: string;
  description?: string;
  status: "pending" | "resolved" | "dismissed";
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  reporter?: UserProfile;
  reported_user?: UserProfile;
}

export interface ReadingProgress {
  id: string;
  user_id: string;
  manga_id: string;
  chapter_id?: string;
  chapter_number?: number;
  last_read_at: string;
  manga?: {
    id: string;
    title: string;
    cover_image_url: string;
    slug: string;
  };
}

// دوال مساعدة للأدوار
export const getRoleDisplayName = (role: UserRole): string => {
  switch (role) {
    case "user":
      return "مستخدم عادي";
    case "beginner_fighter":
      return "مقاتل مبتدئ";
    case "elite_fighter":
      return "مقاتل نخبوي";
    case "leader":
      return "زعيم الطائفة";
    case "admin":
      return "مدير الموقع";
    default:
      return "مستخدم عادي";
  }
};

export const getRoleColor = (role: UserRole): string => {
  switch (role) {
    case "user":
      return "bg-gray-500";
    case "beginner_fighter":
      return "bg-green-500";
    case "elite_fighter":
      return "bg-blue-500";
    case "leader":
      return "bg-purple-500";
    case "admin":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
};

export const hasPermission = (role: UserRole, permission: string): boolean => {
  switch (permission) {
    case "can_submit_content":
      return ["beginner_fighter", "elite_fighter", "leader", "admin"].includes(
        role,
      );
    case "can_moderate_comments":
      return ["elite_fighter", "leader", "admin"].includes(role);
    case "can_ban_users":
      return ["elite_fighter", "leader", "admin"].includes(role);
    case "can_publish_directly":
      return ["leader", "admin"].includes(role);
    case "can_manage_users":
      return role === "admin";
    case "can_assign_roles":
      return role === "admin";
    default:
      return false;
  }
};
