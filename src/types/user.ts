// أنواع البيانات لنظام المستخدمين

export type UserRole =
  | "user"
  | "beginner_fighter"
  | "elite_fighter"
  | "tribe_leader"
  | "admin"
  | "site_admin";



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
}

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
  banned_until?: string | null;
  // Extended properties for admin management
  is_banned?: boolean;
  ban_reason?: string;
  ban_expires_at?: string;
}

export interface Report {
  id: string;
  reporter_id?: string;
  reported_user_id: string;
  comment_id?: string;
  manga_id?: string;
  reason: string;
  description?: string;
  status: "pending" | "resolved" | "dismissed" | "reviewed";
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface ReadingProgressItem {
  id: string;
  user_id: string;
  manga_id: string;
  chapter_id: string;
  page_number: number;
  completed: boolean;
  last_read_at: string;
  created_at: string;
  updated_at: string;
  manga: {
    title: string;
    slug: string;
    cover_image_url: string;
    author: string;
  };
  chapter: {
    chapter_number: number;
    title: string;
  };
}

export type RestrictionType = 'ban' | 'comment_ban' | 'upload_ban' | 'temporary_restriction';

export interface UserRestriction {
  id: string;
  user_id: string;
  restriction_type: RestrictionType;
  reason: string;
  created_by: string;
  created_at: string;
  expires_at?: string | null;
  is_active: boolean;
}

// دوال مساعدة للأدوار
export const getRoleDisplayName = (role: UserRole): string => {
  switch (role) {
    case "user":
      return "مستخدم عادي";
    case "beginner_fighter":
      return "مقاتل مبتدئ";
    case "elite_fighter":
      return "مقاتل نخبة";
    case "tribe_leader":
      return "قائد قبيلة";
    case "admin":
      return "مدير";
    case "site_admin":
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
    case "tribe_leader":
      return "bg-purple-500";
    case "admin":
      return "bg-orange-500";
    case "site_admin":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
};

export const getUserRoleIcon = (role: UserRole): string => {
  switch (role) {
    case "user":
      return "👤";
    case "beginner_fighter":
      return "⚔️";
    case "elite_fighter":
      return "🏆";
    case "tribe_leader":
      return "👑";
    case "admin":
      return "🛡️";
    case "site_admin":
      return "⚡";
    default:
      return "👤";
  }
};

export const hasPermission = (role: UserRole, permission: string): boolean => {
  switch (permission) {
    case "can_submit_content":
      return ["beginner_fighter", "elite_fighter", "tribe_leader", "admin", "site_admin"].includes(role);
    case "can_moderate_comments":
      return ["elite_fighter", "tribe_leader", "admin", "site_admin"].includes(role);
    case "can_ban_users":
      return ["elite_fighter", "tribe_leader", "admin", "site_admin"].includes(role);
    case "can_publish_directly":
      return ["tribe_leader", "admin", "site_admin"].includes(role);
    case "can_manage_users":
      return ["admin", "site_admin"].includes(role);
    case "can_assign_roles":
      return role === "site_admin";
    case "can_pin_comments":
      return ["tribe_leader", "admin", "site_admin"].includes(role);
    case "can_delete_any_comment":
      return ["elite_fighter", "tribe_leader", "admin", "site_admin"].includes(role);
    default:
      return false;
  }
};
