import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  User,
  Heart,
  Bell,
  BookOpen,
  Settings,
  Upload,
  Shield,
  Users,
  Flag,
  Clock,
  Edit,
  Save,
  X,
  Star,
  Calendar,
  Eye,
  MessageCircle,
  Award,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  UserProfile as UserProfileType,
  UserRole,
  getRoleDisplayName,
  getRoleColor,
  hasPermission,
} from "@/types/user";
import { Link } from "react-router-dom";

const UserProfile = () => {
  const { user, userProfile, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // جلب معلومات المستخدم المحدثة
  const { data: fullProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data as UserProfileType;
    },
    enabled: !!user?.id,
  });

  // جلب المفضلة
  const { data: favorites = [], isLoading: favoritesLoading } = useQuery({
    queryKey: ["user-favorites", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("user_favorites")
        .select(
          `
          *,
          manga:manga_id (
            id,
            title,
            cover_image_url,
            slug
          )
        `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // جلب الإشعارات
  const { data: notifications = [], isLoading: notificationsLoading } =
    useQuery({
      queryKey: ["user-notifications", user?.id],
      queryFn: async () => {
        if (!user?.id) return [];

        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        return data || [];
      },
      enabled: !!user?.id,
    });

  // جلب تقدم القراءة
  const { data: readingProgress = [], isLoading: progressLoading } = useQuery({
    queryKey: ["reading-progress", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("reading_progress")
        .select(
          `
          *,
          manga:manga_id (
            id,
            title,
            cover_image_url,
            slug
          )
        `,
        )
        .eq("user_id", user.id)
        .order("last_read_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // جلب طلبات المحتوى (للمقاتلين المبتدئين والنخبة)
  const { data: contentSubmissions = [] } = useQuery({
    queryKey: ["content-submissions", user?.id],
    queryFn: async () => {
      if (
        !user?.id ||
        !fullProfile ||
        !hasPermission(fullProfile.role, "can_submit_content")
      )
        return [];

      const { data, error } = await supabase
        .from("content_submissions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled:
      !!user?.id &&
      !!fullProfile &&
      hasPermission(fullProfile?.role || "user", "can_submit_content"),
  });

  // جلب البلاغات (للمديرين)
  const { data: reports = [] } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      if (!isAdmin) return [];

      const { data, error } = await supabase
        .from("reports")
        .select(
          `
          *,
          reporter:reporter_id (display_name),
          reported_user:reported_user_id (display_name)
        `,
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // جلب جميع المستخدمين (للمديرين)
  const { data: allUsers = [] } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      if (!isAdmin) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("join_date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // تحديث الملف ال��خصي
  const updateProfileMutation = useMutation({
    mutationFn: async ({
      displayName,
      bio,
      avatarUrl,
    }: {
      displayName: string;
      bio: string;
      avatarUrl: string;
    }) => {
      if (!user?.id) throw new Error("المستخدم غير مسجل الدخول");

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          bio: bio,
          avatar_url: avatarUrl,
        })
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
      setEditMode(false);
      toast({
        title: "تم التحديث!",
        description: "تم تحديث ملفك الشخصي بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في تحديث الملف الشخصي",
        variant: "destructive",
      });
    },
  });

  // حذف من المفضلة
  const removeFavoriteMutation = useMutation({
    mutationFn: async (mangaId: string) => {
      if (!user?.id) throw new Error("المستخدم غير مسجل الدخول");

      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("manga_id", mangaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-favorites", user?.id] });
      toast({
        title: "تم الحذف!",
        description: "تم حذف المانجا من المفضلة",
      });
    },
  });

  // تحديث دور المستخدم (للمديرين فقط)
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({
      userId,
      newRole,
    }: {
      userId: string;
      newRole: UserRole;
    }) => {
      if (!isAdmin) throw new Error("ليس لديك صلاحية لهذا الإجراء");

      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast({
        title: "تم التحديث!",
        description: "تم تحديث دور المستخدم بنجاح",
      });
    },
  });

  // وضع علامة قراءة على الإشعار
  const markNotificationReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user-notifications", user?.id],
      });
    },
  });

  useEffect(() => {
    if (fullProfile) {
      setDisplayName(fullProfile.display_name);
      setBio(fullProfile.bio || "");
      setAvatarUrl(fullProfile.avatar_url || "");
    }
  }, [fullProfile]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h1 className="text-2xl font-bold mb-2">تسجيل الدخول مطلوب</h1>
              <p className="text-muted-foreground mb-6">
                يجب تسجيل الدخول لمشاهدة الملف الشخصي
              </p>
              <Link to="/auth">
                <Button>تسجيل الدخول</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card Skeleton */}
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="w-24 h-24 mx-auto rounded-full bg-muted animate-pulse" />
                    <div className="h-6 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* Content Skeleton */}
            <div className="lg:col-span-2">
              <div className="space-y-6">
                <div className="h-40 bg-muted rounded animate-pulse" />
                <div className="h-40 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const unreadNotifications = notifications.filter((n) => !n.is_read).length;
  const pendingReports = reports.filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* بطاقة الملف الشخصي */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <Avatar className="w-24 h-24 mx-auto">
                    <AvatarImage
                      src={fullProfile?.avatar_url}
                      alt={fullProfile?.display_name}
                    />
                    <AvatarFallback>
                      <User className="h-12 w-12" />
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <h1 className="text-2xl font-bold">
                      {fullProfile?.display_name}
                    </h1>
                    <Badge
                      className={`${getRoleColor(fullProfile?.role || "user")} text-white mt-2`}
                    >
                      {getRoleDisplayName(fullProfile?.role || "user")}
                    </Badge>
                  </div>

                  {fullProfile?.bio && (
                    <p className="text-muted-foreground text-sm">
                      {fullProfile.bio}
                    </p>
                  )}

                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center justify-center gap-2">
                      <Calendar className="h-4 w-4" />
                      انضم{" "}
                      {new Date(
                        fullProfile?.join_date || "",
                      ).toLocaleDateString("ar")}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="h-4 w-4" />
                      آخر نشاط{" "}
                      {new Date(
                        fullProfile?.last_active || "",
                      ).toLocaleDateString("ar")}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant={editMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEditMode(!editMode)}
                      className="flex-1"
                    >
                      {editMode ? (
                        <X className="h-4 w-4 mr-2" />
                      ) : (
                        <Edit className="h-4 w-4 mr-2" />
                      )}
                      {editMode ? "إلغاء" : "تحرير"}
                    </Button>

                    {editMode && (
                      <Button
                        size="sm"
                        onClick={() =>
                          updateProfileMutation.mutate({
                            displayName,
                            bio,
                            avatarUrl,
                          })
                        }
                        disabled={updateProfileMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        حفظ
                      </Button>
                    )}
                  </div>

                  {editMode && (
                    <div className="space-y-4 text-left">
                      <div>
                        <label className="text-sm font-medium">اسم العرض</label>
                        <Input
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          dir="rtl"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">
                          النبذة الشخصية
                        </label>
                        <Textarea
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          dir="rtl"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">
                          رابط الصورة الشخصية
                        </label>
                        <Input
                          value={avatarUrl}
                          onChange={(e) => setAvatarUrl(e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* المحتوى الرئيسي */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="favorites" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6">
                <TabsTrigger value="favorites" className="text-xs">
                  <Heart className="h-4 w-4 mr-1" />
                  المفضلة
                </TabsTrigger>
                <TabsTrigger value="progress" className="text-xs">
                  <BookOpen className="h-4 w-4 mr-1" />
                  القراءة
                </TabsTrigger>
                <TabsTrigger value="notifications" className="text-xs relative">
                  <Bell className="h-4 w-4 mr-1" />
                  الإشعارات
                  {unreadNotifications > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs"
                    >
                      {unreadNotifications}
                    </Badge>
                  )}
                </TabsTrigger>
                {hasPermission(
                  fullProfile?.role || "user",
                  "can_submit_content",
                ) && (
                  <TabsTrigger value="submissions" className="text-xs">
                    <Upload className="h-4 w-4 mr-1" />
                    طلباتي
                  </TabsTrigger>
                )}
                {isAdmin && (
                  <>
                    <TabsTrigger value="reports" className="text-xs relative">
                      <Flag className="h-4 w-4 mr-1" />
                      البلاغات
                      {pendingReports > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs"
                        >
                          {pendingReports}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="users" className="text-xs">
                      <Users className="h-4 w-4 mr-1" />
                      المستخدمين
                    </TabsTrigger>
                  </>
                )}
              </TabsList>

              {/* تبويب المفضلة */}
              <TabsContent value="favorites">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5" />
                      المانجا المفضلة ({favorites.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {favoritesLoading ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="space-y-2">
                            <div className="aspect-[3/4] bg-muted rounded animate-pulse" />
                            <div className="h-4 bg-muted rounded animate-pulse" />
                          </div>
                        ))}
                      </div>
                    ) : favorites.length === 0 ? (
                      <div className="text-center py-8">
                        <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          لا توجد مانجا في المفضلة
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {favorites.map((favorite: any) => (
                          <div key={favorite.id} className="group relative">
                            <Link to={`/manga/${favorite.manga.slug}`}>
                              <img
                                src={
                                  favorite.manga.cover_image_url ||
                                  "/placeholder.svg"
                                }
                                alt={favorite.manga.title}
                                className="w-full aspect-[3/4] object-cover rounded-lg group-hover:scale-105 transition-transform"
                              />
                            </Link>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() =>
                                removeFavoriteMutation.mutate(favorite.manga.id)
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <h3 className="text-sm font-medium mt-2 line-clamp-2">
                              {favorite.manga.title}
                            </h3>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* تبويب تقدم القراءة */}
              <TabsContent value="progress">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      تقدم القراءة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {progressLoading ? (
                      <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex gap-4">
                            <div className="w-16 h-20 bg-muted rounded animate-pulse" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-muted rounded animate-pulse" />
                              <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : readingProgress.length === 0 ? (
                      <div className="text-center py-8">
                        <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          لم تبدأ قراءة أي مانجا بعد
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {readingProgress.map((progress: any) => (
                          <div
                            key={progress.id}
                            className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50"
                          >
                            <Link to={`/manga/${progress.manga.slug}`}>
                              <img
                                src={
                                  progress.manga.cover_image_url ||
                                  "/placeholder.svg"
                                }
                                alt={progress.manga.title}
                                className="w-16 h-20 object-cover rounded"
                              />
                            </Link>
                            <div className="flex-1">
                              <Link
                                to={`/manga/${progress.manga.slug}`}
                                className="hover:text-primary"
                              >
                                <h3 className="font-medium">
                                  {progress.manga.title}
                                </h3>
                              </Link>
                              <p className="text-sm text-muted-foreground">
                                آخر قراءة: الفصل {progress.chapter_number}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(
                                  progress.last_read_at,
                                ).toLocaleDateString("ar")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* تبويب الإشعارات */}
              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      الإشعارات ({notifications.length})
                      {unreadNotifications > 0 && (
                        <Badge variant="destructive">
                          {unreadNotifications} غير مقروء
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {notificationsLoading ? (
                      <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="p-4 border rounded-lg space-y-2"
                          >
                            <div className="h-4 bg-muted rounded animate-pulse" />
                            <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                          </div>
                        ))}
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="text-center py-8">
                        <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">لا توجد إشعارات</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {notifications.map((notification: any) => (
                          <div
                            key={notification.id}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              notification.is_read
                                ? "bg-muted/30"
                                : "bg-blue-50 dark:bg-blue-900/20 border-blue-200"
                            }`}
                            onClick={() => {
                              if (!notification.is_read) {
                                markNotificationReadMutation.mutate(
                                  notification.id,
                                );
                              }
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium">
                                  {notification.title}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {new Date(
                                    notification.created_at,
                                  ).toLocaleDateString("ar")}
                                </p>
                              </div>
                              {!notification.is_read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* تبويب طلبات المحتوى */}
              {hasPermission(
                fullProfile?.role || "user",
                "can_submit_content",
              ) && (
                <TabsContent value="submissions">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        طلبات المحتوى ({contentSubmissions.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {contentSubmissions.length === 0 ? (
                        <div className="text-center py-8">
                          <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            لم تقم بتقديم أي طلبات بعد
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {contentSubmissions.map((submission: any) => (
                            <div
                              key={submission.id}
                              className="p-4 border rounded-lg"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium">
                                  {submission.type === "manga"
                                    ? "مانجا جديدة"
                                    : "فصل جديد"}
                                </h4>
                                <Badge
                                  variant={
                                    submission.status === "approved"
                                      ? "default"
                                      : submission.status === "rejected"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                >
                                  {submission.status === "pending"
                                    ? "قيد المراجعة"
                                    : submission.status === "approved"
                                      ? "مقبول"
                                      : "مرفوض"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                تم التقديم في{" "}
                                {new Date(
                                  submission.created_at,
                                ).toLocaleDateString("ar")}
                              </p>
                              {submission.review_notes && (
                                <p className="text-sm mt-2 p-2 bg-muted rounded">
                                  ملاحظات المراجع: {submission.review_notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* تبويب البلاغات (للمديرين) */}
              {isAdmin && (
                <TabsContent value="reports">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Flag className="h-5 w-5" />
                        البلاغات ({reports.length})
                        {pendingReports > 0 && (
                          <Badge variant="destructive">
                            {pendingReports} قيد المراجعة
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {reports.length === 0 ? (
                        <div className="text-center py-8">
                          <Flag className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            لا توجد بلاغات
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {reports.map((report: any) => (
                            <div
                              key={report.id}
                              className="p-4 border rounded-lg"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium">
                                  بلاغ على{" "}
                                  {report.target_type === "comment"
                                    ? "تعليق"
                                    : report.target_type === "manga"
                                      ? "مانجا"
                                      : "مستخدم"}
                                </h4>
                                <Badge
                                  variant={
                                    report.status === "resolved"
                                      ? "default"
                                      : report.status === "dismissed"
                                        ? "secondary"
                                        : "destructive"
                                  }
                                >
                                  {report.status === "pending"
                                    ? "قيد المراجعة"
                                    : report.status === "resolved"
                                      ? "تم الحل"
                                      : "مرفوض"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                السبب: {report.reason}
                              </p>
                              {report.description && (
                                <p className="text-sm mb-2">
                                  {report.description}
                                </p>
                              )}
                              <div className="text-xs text-muted-foreground">
                                <p>
                                  المبلغ:{" "}
                                  {report.reporter?.display_name || "مجهول"}
                                </p>
                                <p>
                                  تاريخ البلاغ:{" "}
                                  {new Date(
                                    report.created_at,
                                  ).toLocaleDateString("ar")}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* تبويب إدارة المستخدمين (للمديرين) */}
              {isAdmin && (
                <TabsContent value="users">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        إدارة المستخدمين ({allUsers.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {allUsers.map((user: any) => (
                          <div
                            key={user.user_id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage
                                  src={user.avatar_url}
                                  alt={user.display_name}
                                />
                                <AvatarFallback>
                                  <User className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-medium">
                                  {user.display_name}
                                </h4>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    className={`${getRoleColor(user.role)} text-white text-xs`}
                                  >
                                    {getRoleDisplayName(user.role)}
                                  </Badge>
                                  {user.is_banned && (
                                    <Badge
                                      variant="destructive"
                                      className="text-xs"
                                    >
                                      محظور
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  انضم{" "}
                                  {new Date(user.join_date).toLocaleDateString(
                                    "ar",
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Award className="h-4 w-4 mr-1" />
                                    تغيير الدور
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>
                                      تغيير دور المستخدم
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <p>المستخدم: {user.display_name}</p>
                                    <div className="grid grid-cols-1 gap-2">
                                      {(
                                        [
                                          "user",
                                          "beginner_fighter",
                                          "elite_fighter",
                                          "leader",
                                          "admin",
                                        ] as UserRole[]
                                      ).map((role) => (
                                        <Button
                                          key={role}
                                          variant={
                                            user.role === role
                                              ? "default"
                                              : "outline"
                                          }
                                          onClick={() =>
                                            updateUserRoleMutation.mutate({
                                              userId: user.user_id,
                                              newRole: role,
                                            })
                                          }
                                        >
                                          {getRoleDisplayName(role)}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default UserProfile;
