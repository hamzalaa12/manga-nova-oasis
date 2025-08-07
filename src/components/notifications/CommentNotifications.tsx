import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Bell,
  MessageCircle,
  Heart,
  Reply,
  Flag,
  Pin,
  Check,
  X,
  Eye,
  Trash2,
  Settings,
  Volume2,
  VolumeX
} from "lucide-react";

interface Notification {
  id: string;
  user_id: string;
  type: 'comment_reply' | 'comment_reaction' | 'comment_mentioned' | 'comment_pinned' | 'comment_reported';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata?: {
    comment_id?: string;
    chapter_id?: string;
    manga_id?: string;
    from_user_id?: string;
    reaction_type?: string;
  };
  from_user?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface NotificationSettings {
  comment_replies: boolean;
  comment_reactions: boolean;
  comment_mentions: boolean;
  comment_moderations: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
}

const CommentNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // جلب الإشعارات
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["comment-notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("comment_notifications")
        .select(`
          *,
          from_user:profiles!comment_notifications_from_user_id_fkey (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  // جلب إعدادات الإشعارات
  const { data: settings } = useQuery({
    queryKey: ["notification-settings", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      // إعدادات افتراضية إذا لم توجد
      return data || {
        comment_replies: true,
        comment_reactions: true,
        comment_mentions: true,
        comment_moderations: true,
        email_notifications: false,
        push_notifications: false
      };
    },
    enabled: !!user,
  });

  // تحديث حالة القراءة
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const { error } = await supabase
        .from("comment_notifications")
        .update({ is_read: true })
        .in("id", notificationIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comment-notifications"] });
    },
  });

  // حذف الإشعار
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("comment_notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comment-notifications"] });
      toast({
        title: "تم الحذف",
        description: "تم حذف الإشعار بنجاح",
      });
    },
  });

  // تحديث إعدادات الإشعارات
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<NotificationSettings>) => {
      if (!user) throw new Error("يجب تسجيل الدخول");

      const { error } = await supabase
        .from("notification_settings")
        .upsert({
          user_id: user.id,
          ...settings,
          ...newSettings
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
      toast({
        title: "تم التحديث",
        description: "تم تحديث إعدادات الإشعارات بنجاح",
      });
    },
  });

  // عدد الإشعارات غير المقروءة
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // تحديد أيقونة نوع الإشعار
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'comment_reply':
        return <Reply className="h-4 w-4 text-blue-500" />;
      case 'comment_reaction':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'comment_mentioned':
        return <MessageCircle className="h-4 w-4 text-green-500" />;
      case 'comment_pinned':
        return <Pin className="h-4 w-4 text-yellow-500" />;
      case 'comment_reported':
        return <Flag className="h-4 w-4 text-orange-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  // تنسيق وقت الإشعار
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 0) return `منذ ${diffDays} يوم`;
    if (diffHours > 0) return `منذ ${diffHours} ساعة`;
    if (diffMinutes > 0) return `منذ ${diffMinutes} دقيقة`;
    return "الآن";
  };

  // التنقل إلى التعليق
  const navigateToComment = (notification: Notification) => {
    const { metadata } = notification;
    if (metadata?.chapter_id && metadata?.comment_id) {
      // تحديث حالة القراءة
      if (!notification.is_read) {
        markAsReadMutation.mutate([notification.id]);
      }
      
      // التنقل إلى صفحة الفصل مع التركيز على التعليق
      window.location.href = `/chapter/${metadata.chapter_id}#comment-${metadata.comment_id}`;
    }
  };

  // تشغيل/إيقاف نوع إشعار معين
  const toggleNotificationType = (type: keyof NotificationSettings) => {
    if (settings) {
      updateSettingsMutation.mutate({
        [type]: !settings[type]
      });
    }
  };

  // تحديد الخلفية حسب حالة القراءة
  const getNotificationBg = (notification: Notification) => {
    if (!notification.is_read) {
      return "bg-blue-50 border-blue-200 hover:bg-blue-100";
    }
    return "bg-white hover:bg-gray-50";
  };

  if (!user) return null;

  return (
    <div className="relative">
      {/* زر الإشعارات */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs flex items-center justify-center p-0"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent 
          className="w-80 p-0" 
          align="end"
          sideOffset={5}
        >
          {/* رأس الإشعارات */}
          <div className="p-4 border-b bg-muted/50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">الإشعارات</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const unreadIds = notifications
                        .filter(n => !n.is_read)
                        .map(n => n.id);
                      markAsReadMutation.mutate(unreadIds);
                    }}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    قراءة الكل
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* إعدادات الإشعارات */}
          {showSettings && settings && (
            <div className="p-4 border-b bg-gray-50">
              <h4 className="font-medium mb-3">إعدادات الإشعارات</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">ردود التعليقات</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleNotificationType('comment_replies')}
                  >
                    {settings.comment_replies ? 
                      <Volume2 className="h-4 w-4 text-green-500" /> : 
                      <VolumeX className="h-4 w-4 text-gray-400" />
                    }
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">تفاعلات التعليقات</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleNotificationType('comment_reactions')}
                  >
                    {settings.comment_reactions ? 
                      <Volume2 className="h-4 w-4 text-green-500" /> : 
                      <VolumeX className="h-4 w-4 text-gray-400" />
                    }
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">الإشارات</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleNotificationType('comment_mentions')}
                  >
                    {settings.comment_mentions ? 
                      <Volume2 className="h-4 w-4 text-green-500" /> : 
                      <VolumeX className="h-4 w-4 text-gray-400" />
                    }
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* قائمة الإشعارات */}
          <ScrollArea className="h-96">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                جاري التحميل...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد إشعارات</p>
              </div>
            ) : (
              <div className="p-1">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-b cursor-pointer transition-colors ${getNotificationBg(notification)}`}
                    onClick={() => navigateToComment(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-1 ml-2">
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger 
                                asChild 
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <X className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!notification.is_read) {
                                      markAsReadMutation.mutate([notification.id]);
                                    }
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  تحديد كمقروء
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotificationMutation.mutate(notification.id);
                                  }}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  حذف
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {formatTime(notification.created_at)}
                          </span>
                          {notification.from_user && (
                            <span className="text-xs text-gray-500">
                              من: {notification.from_user.display_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* تذييل */}
          {notifications.length > 0 && (
            <div className="p-3 border-t bg-muted/50 text-center">
              <Button variant="ghost" size="sm" className="text-xs">
                عرض جميع الإشعارات
              </Button>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default CommentNotifications;
