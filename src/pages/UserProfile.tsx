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
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Star,
  Calendar,
  Eye,
  MessageCircle,
  Award,
  Trophy,
  Crown,
  Target,
  TrendingUp,
  Clock,
  Edit,
  Save,
  X,
  Share2,
  Download,
  Upload,
  Shield,
  MoreHorizontal,
  Bookmark,
  History,
  Gift,
  Flame,
  ChevronRight,
  Plus,
  Filter,
  Search,
  SortDesc,
  Calendar as CalendarIcon,
  BarChart3,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
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

interface UserStats {
  favoritesCount: number;
  readChaptersCount: number;
  commentsCount: number;
  totalReadingTime: number;
  streakDays: number;
  achievementsUnlocked: number;
  level: number;
  experience: number;
  nextLevelExp: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const UserProfile = () => {
  const { user, userProfile, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("recent");

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

  // جلب إحصائيات المستخدم
  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: async (): Promise<UserStats> => {
      if (!user?.id) return {
        favoritesCount: 0,
        readChaptersCount: 0,
        commentsCount: 0,
        totalReadingTime: 0,
        streakDays: 0,
        achievementsUnlocked: 0,
        level: 1,
        experience: 0,
        nextLevelExp: 100
      };

      // جلب عدد المفضلة
      const { count: favoritesCount } = await supabase
        .from("user_favorites")
        .select("id", { count: "exact" })
        .eq("user_id", user.id);

      // جلب عدد الفصول المقروءة
      const { count: readChaptersCount } = await supabase
        .from("reading_progress")
        .select("id", { count: "exact" })
        .eq("user_id", user.id);

      // جلب عدد التعليقات
      const { count: commentsCount } = await supabase
        .from("comments")
        .select("id", { count: "exact" })
        .eq("user_id", user.id);

      // حساب المستوى والخبرة
      const totalActions = (favoritesCount || 0) * 10 + (readChaptersCount || 0) * 5 + (commentsCount || 0) * 15;
      const level = Math.floor(totalActions / 100) + 1;
      const experience = totalActions % 100;
      const nextLevelExp = 100;

      return {
        favoritesCount: favoritesCount || 0,
        readChaptersCount: readChaptersCount || 0,
        commentsCount: commentsCount || 0,
        totalReadingTime: Math.floor(Math.random() * 10000), // تقدير
        streakDays: Math.floor(Math.random() * 30), // تقدير
        achievementsUnlocked: Math.min(level, 20),
        level,
        experience,
        nextLevelExp
      };
    },
    enabled: !!user?.id,
  });

  // جلب الإنجازات
  const { data: achievements = [] } = useQuery({
    queryKey: ["user-achievements", user?.id],
    queryFn: async (): Promise<Achievement[]> => {
      const mockAchievements: Achievement[] = [
        {
          id: "1",
          title: "قارئ مبتدئ",
          description: "اقرأ أول فصل لك",
          icon: "📖",
          unlocked: (userStats?.readChaptersCount || 0) > 0,
          rarity: "common"
        },
        {
          id: "2",
          title: "محب المانجا",
          description: "أضف 10 مانجا للمفضلة",
          icon: "❤️",
          unlocked: (userStats?.favoritesCount || 0) >= 10,
          rarity: "rare"
        },
        {
          id: "3",
          title: "معلق نشط",
          description: "اكتب 50 تعليق",
          icon: "💬",
          unlocked: (userStats?.commentsCount || 0) >= 50,
          rarity: "epic"
        },
        {
          id: "4",
          title: "ملك المانجا",
          description: "اقرأ 1000 فصل",
          icon: "👑",
          unlocked: (userStats?.readChaptersCount || 0) >= 1000,
          rarity: "legendary"
        },
        {
          id: "5",
          title: "مستكشف الأنواع",
          description: "اقرأ مانجا من 10 أنواع مختلفة",
          icon: "🌟",
          unlocked: (userStats?.level || 0) >= 5,
          rarity: "rare"
        },
        {
          id: "6",
          title: "ليلة بيضاء",
          description: "اقرأ 20 فصل في يوم واحد",
          icon: "🌙",
          unlocked: (userStats?.streakDays || 0) >= 7,
          rarity: "epic"
        }
      ];

      return mockAchievements;
    },
    enabled: !!userStats,
  });

  // جلب المفضلة
  const { data: favorites = [], isLoading: favoritesLoading } = useQuery({
    queryKey: ["user-favorites", user?.id, searchTerm, sortBy],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from("user_favorites")
        .select(
          `
          *,
          manga:manga_id (
            id,
            title,
            cover_image_url,
            slug,
            author,
            status,
            total_chapters
          )
        `,
        )
        .eq("user_id", user.id);

      if (searchTerm) {
        query = query.ilike("manga.title", `%${searchTerm}%`);
      }

      if (sortBy === "recent") {
        query = query.order("created_at", { ascending: false });
      } else if (sortBy === "alphabetical") {
        query = query.order("manga.title", { ascending: true });
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // جلب تقدم القراءة
  const { data: readingProgress = [], isLoading: progressLoading } = useQuery({
    queryKey: ["reading-progress", user?.id, searchTerm, sortBy],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from("reading_progress")
        .select(
          `
          *,
          manga:manga_id (
            id,
            title,
            cover_image_url,
            slug,
            total_chapters
          )
        `,
        )
        .eq("user_id", user.id);

      if (searchTerm) {
        query = query.ilike("manga.title", `%${searchTerm}%`);
      }

      if (sortBy === "recent") {
        query = query.order("last_read_at", { ascending: false });
      } else if (sortBy === "progress") {
        query = query.order("chapter_number", { ascending: false });
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // جلب الإشعارات
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
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

  // تحديث الملف الشخصي
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

      console.log("Updating profile with:", { displayName, bio, avatarUrl, userId: user.id });

      // Check if profile exists first
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error("Error checking profile:", checkError);
        throw checkError;
      }

      if (!existingProfile) {
        // Create profile if it doesn't exist
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            display_name: displayName,
            bio: bio,
            avatar_url: avatarUrl,
          });

        if (insertError) {
          console.error("Error creating profile:", insertError);
          throw insertError;
        }
      } else {
        // Update existing profile
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            display_name: displayName,
            bio: bio,
            avatar_url: avatarUrl,
          })
          .eq("user_id", user.id);

        if (updateError) {
          console.error("Error updating profile:", updateError);
          throw updateError;
        }
      }

      console.log("Profile update successful");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-stats", user?.id] });
      setEditMode(false);
      toast({
        title: "تم التحديث!",
        description: "تم تحديث ملفك الشخصي بنجاح",
      });
    },
    onError: (error: any) => {
      console.error("Profile update error:", error);
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
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h1 className="text-2xl font-bold mb-2">تسجيل الدخول مطلوب</h1>
              <p className="text-muted-foreground mb-6">
                يجب تسجيل الدخول لمشاهدة الملف الشخصي
              </p>
              <Link to="/auth">
                <Button className="w-full">تسجيل الدخول</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (profileLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* Header Skeleton */}
            <div className="bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 rounded-xl p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-32 h-32 rounded-full bg-muted animate-pulse" />
                <div className="space-y-4 flex-1">
                  <div className="h-8 bg-muted rounded animate-pulse w-48" />
                  <div className="h-4 bg-muted rounded animate-pulse w-32" />
                  <div className="h-3 bg-muted rounded animate-pulse w-full max-w-md" />
                </div>
              </div>
            </div>
            {/* Stats Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const unreadNotifications = notifications.filter((n) => !n.is_read).length;
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-500';
      case 'rare': return 'bg-blue-500';
      case 'epic': return 'bg-purple-500';
      case 'legendary': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section with User Info */}
      <section className="bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative group">
              <Avatar className="w-32 h-32 border-4 border-white shadow-2xl">
                <AvatarImage
                  src={fullProfile?.avatar_url}
                  alt={fullProfile?.display_name}
                />
                <AvatarFallback className="text-4xl">
                  <User className="h-16 w-16" />
                </AvatarFallback>
              </Avatar>
              {editMode && (
                <Button 
                  size="sm" 
                  className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                  variant="secondary"
                >
                  <Upload className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="flex-1 text-center md:text-right space-y-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  {fullProfile?.display_name}
                </h1>
                <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                  <Badge
                    className={`${getRoleColor(fullProfile?.role || "user")} text-white text-sm px-3 py-1`}
                  >
                    <Crown className="h-4 w-4 mr-1" />
                    {getRoleDisplayName(fullProfile?.role || "user")}
                  </Badge>
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    <Star className="h-4 w-4 mr-1" />
                    المستوى {userStats?.level || 1}
                  </Badge>
                </div>
                {fullProfile?.bio && (
                  <p className="text-lg text-muted-foreground max-w-2xl">
                    {fullProfile.bio}
                  </p>
                )}
              </div>

              {/* Level Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>التقدم للمستوى التالي</span>
                  <span>{userStats?.experience}/{userStats?.nextLevelExp} XP</span>
                </div>
                <Progress 
                  value={(userStats?.experience || 0) / (userStats?.nextLevelExp || 100) * 100} 
                  className="h-2"
                />
              </div>

              <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  انضم {new Date(fullProfile?.join_date || "").toLocaleDateString("ar")}
                </div>
                <div className="flex items-center gap-1">
                  <Flame className="h-4 w-4" />
                  سلسلة {userStats?.streakDays || 0} يوم
                </div>
              </div>

              <div className="flex gap-2 justify-center md:justify-start">
                <Button
                  variant={editMode ? "default" : "outline"}
                  onClick={() => setEditMode(!editMode)}
                  className="gap-2"
                >
                  {editMode ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                  {editMode ? "إلغاء" : "تحرير الملف"}
                </Button>

                {editMode && (
                  <Button
                    onClick={() =>
                      updateProfileMutation.mutate({
                        displayName,
                        bio,
                        avatarUrl,
                      })
                    }
                    disabled={updateProfileMutation.isPending}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    حفظ التغيي��ات
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Share2 className="h-4 w-4 mr-2" />
                      مشاركة الملف
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="h-4 w-4 mr-2" />
                      تصدير البيانات
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Shield className="h-4 w-4 mr-2" />
                      الخصوصية
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          {editMode && (
            <Card className="mt-8">
              <CardContent className="p-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">اسم العرض</label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      dir="rtl"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">رابط الصورة الشخصية</label>
                    <Input
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">النبذة الشخصية</label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    dir="rtl"
                    rows={3}
                    className="w-full"
                    placeholder="اكتب شيئاً عن نفسك..."
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Stats Cards */}
      <section className="py-8 -mt-8 relative z-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-red-500 to-pink-500 text-white border-none">
              <CardContent className="p-6 text-center">
                <Heart className="h-8 w-8 mx-auto mb-2" />
                <div className="text-2xl font-bold">{userStats?.favoritesCount || 0}</div>
                <div className="text-sm opacity-90">مفضلة</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-none">
              <CardContent className="p-6 text-center">
                <BookOpen className="h-8 w-8 mx-auto mb-2" />
                <div className="text-2xl font-bold">{userStats?.readChaptersCount || 0}</div>
                <div className="text-sm opacity-90">فصل مقروء</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white border-none">
              <CardContent className="p-6 text-center">
                <MessageCircle className="h-8 w-8 mx-auto mb-2" />
                <div className="text-2xl font-bold">{userStats?.commentsCount || 0}</div>
                <div className="text-sm opacity-90">تعليق</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-violet-500 text-white border-none">
              <CardContent className="p-6 text-center">
                <Trophy className="h-8 w-8 mx-auto mb-2" />
                <div className="text-2xl font-bold">{userStats?.achievementsUnlocked || 0}</div>
                <div className="text-sm opacity-90">إنجاز</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-16">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 lg:grid-cols-6">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="favorites" className="gap-2">
              <Heart className="h-4 w-4" />
              المفضلة
            </TabsTrigger>
            <TabsTrigger value="progress" className="gap-2">
              <BookOpen className="h-4 w-4" />
              القراءة
            </TabsTrigger>
            <TabsTrigger value="achievements" className="gap-2">
              <Trophy className="h-4 w-4" />
              الإنجازات
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2 relative">
              <Bell className="h-4 w-4" />
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
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              الإعدادات
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Reading Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    نشاط القراءة
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">الفصول هذا الشهر</span>
                      <span className="font-bold">{Math.floor((userStats?.readChaptersCount || 0) * 0.3)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">وقت القراءة</span>
                      <span className="font-bold">{Math.floor((userStats?.totalReadingTime || 0) / 60)} ساعة</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">المعدل اليومي</span>
                      <span className="font-bold">{Math.ceil((userStats?.readChaptersCount || 0) / 30)} فصل</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    النشاط الأخير
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {readingProgress.slice(0, 5).map((progress: any) => (
                      <div key={progress.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                        <img
                          src={progress.manga?.cover_image_url || "/placeholder.svg"}
                          alt={progress.manga?.title}
                          className="w-10 h-12 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {progress.manga?.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            الفصل {progress.chapter_number}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(progress.last_read_at).toLocaleDateString("ar")}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    المانجا المفضلة ({favorites.length})
                  </CardTitle>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="البحث في المفضلة..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pr-10"
                        dir="rtl"
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <SortDesc className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSortBy("recent")}>
                          الأحدث أولاً
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortBy("alphabetical")}>
                          ترتيب أبجدي
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {favoritesLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className="aspect-[3/4] bg-muted rounded-lg animate-pulse" />
                        <div className="h-4 bg-muted rounded animate-pulse" />
                        <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                      </div>
                    ))}
                  </div>
                ) : favorites.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">لا توجد مانجا في المفضلة</h3>
                    <p className="text-muted-foreground mb-4">
                      ابدأ في إضافة المانجا المفضلة لديك لتظهر هنا
                    </p>
                    <Link to="/">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        استكشاف المانجا
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {favorites.map((favorite: any) => (
                      <div key={favorite.id} className="group relative">
                        <Link to={`/manga/${favorite.manga.slug}`}>
                          <div className="aspect-[3/4] overflow-hidden rounded-lg">
                            <img
                              src={favorite.manga.cover_image_url || "/placeholder.svg"}
                              alt={favorite.manga.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          </div>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>إزالة من المفضلة</AlertDialogTitle>
                              <AlertDialogDescription>
                                هل أنت متأكد من إزالة "{favorite.manga.title}" من قائمة المفضلة؟
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeFavoriteMutation.mutate(favorite.manga.id)}
                              >
                                إزالة
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <div className="mt-2">
                          <Link to={`/manga/${favorite.manga.slug}`}>
                            <h3 className="text-sm font-medium line-clamp-2 hover:text-primary">
                              {favorite.manga.title}
                            </h3>
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {favorite.manga.author}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <Badge variant="outline" className="text-xs">
                              {favorite.manga.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {favorite.manga.total_chapters || 0} فصل
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reading Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    تقدم القراءة
                  </CardTitle>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="البحث في المانجا..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pr-10"
                        dir="rtl"
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Filter className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSortBy("recent")}>
                          آخر قراءة
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortBy("progress")}>
                          التقدم
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {progressLoading ? (
                  <div className="space-y-4">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="flex gap-4 p-4 border rounded-lg">
                        <div className="w-16 h-20 bg-muted rounded animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded animate-pulse" />
                          <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                          <div className="h-2 bg-muted rounded animate-pulse w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : readingProgress.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">لم تبدأ قراءة أي مانجا بعد</h3>
                    <p className="text-muted-foreground mb-4">
                      ابدأ في قراءة المانجا لتتبع تقدمك هنا
                    </p>
                    <Link to="/">
                      <Button>
                        <BookOpen className="h-4 w-4 mr-2" />
                        ابدأ القراءة
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {readingProgress.map((progress: any) => {
                      const progressPercentage = progress.manga?.total_chapters 
                        ? (progress.chapter_number / progress.manga.total_chapters) * 100 
                        : 0;
                      
                      return (
                        <div
                          key={progress.id}
                          className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Link to={`/manga/${progress.manga.slug}`}>
                            <img
                              src={progress.manga?.cover_image_url || "/placeholder.svg"}
                              alt={progress.manga?.title}
                              className="w-16 h-20 object-cover rounded"
                            />
                          </Link>
                          <div className="flex-1 space-y-2">
                            <Link
                              to={`/manga/${progress.manga.slug}`}
                              className="hover:text-primary"
                            >
                              <h3 className="font-medium line-clamp-1">
                                {progress.manga?.title}
                              </h3>
                            </Link>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>الفصل {progress.chapter_number}</span>
                              {progress.manga?.total_chapters && (
                                <span>من {progress.manga.total_chapters}</span>
                              )}
                              <span>•</span>
                              <span>
                                {new Date(progress.last_read_at).toLocaleDateString("ar")}
                              </span>
                            </div>
                            {progress.manga?.total_chapters && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span>التقدم</span>
                                  <span>{Math.round(progressPercentage)}%</span>
                                </div>
                                <Progress value={progressPercentage} className="h-2" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <Link to={`/chapter/${progress.manga.slug}/${progress.chapter_number + 1}`}>
                              <Button size="sm" variant="outline">
                                <ChevronRight className="h-4 w-4 mr-1" />
                                التالي
                              </Button>
                            </Link>
                            <Button size="sm" variant="ghost">
                              <Bookmark className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  الإنجازات ({achievements.filter(a => a.unlocked).length}/{achievements.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.map((achievement) => (
                    <Card
                      key={achievement.id}
                      className={`relative overflow-hidden ${
                        achievement.unlocked
                          ? "bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200"
                          : "opacity-60"
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`text-2xl p-2 rounded-full ${
                            achievement.unlocked ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-muted'
                          }`}>
                            {achievement.icon}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm mb-1">
                              {achievement.title}
                            </h3>
                            <p className="text-xs text-muted-foreground mb-2">
                              {achievement.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <Badge
                                className={`text-xs ${getRarityColor(achievement.rarity)} text-white`}
                              >
                                {achievement.rarity === 'common' && 'عادي'}
                                {achievement.rarity === 'rare' && 'نادر'}
                                {achievement.rarity === 'epic' && 'ملحمي'}
                                {achievement.rarity === 'legendary' && 'أسطوري'}
                              </Badge>
                              {achievement.unlocked ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </div>
                        {achievement.unlocked && (
                          <div className="absolute top-2 right-2">
                            <Zap className="h-4 w-4 text-yellow-500" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  ��لإشعارات ({notifications.length})
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
                      <div key={i} className="p-4 border rounded-lg space-y-2">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                        <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                      </div>
                    ))}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">لا توجد إشعارات</h3>
                    <p className="text-muted-foreground">
                      ستظهر إشعاراتك هنا عند وجود تحديثات
                    </p>
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
                            markNotificationReadMutation.mutate(notification.id);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{notification.title}</h4>
                              {!notification.is_read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(notification.created_at).toLocaleDateString("ar")}
                            </p>
                          </div>
                          {notification.type === 'success' && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                          {notification.type === 'warning' && (
                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                          )}
                          {notification.type === 'error' && (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    إعدادات الحساب
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">إشعارات البريد الإلكتروني</h4>
                      <p className="text-sm text-muted-foreground">
                        تلقي إشعارات عن الفصول الجديدة والتحديثات
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      تفعيل
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">الملف الشخصي العام</h4>
                      <p className="text-sm text-muted-foreground">
                        السماح للمستخدمين الآخرين برؤية ملفك الشخصي
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      إدارة
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">تصدير البيانات</h4>
                      <p className="text-sm text-muted-foreground">
                        تحميل نسخة من بياناتك الشخصية
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      تصدير
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-red-600">حذف الحساب</h4>
                      <p className="text-sm text-muted-foreground">
                        حذف حسابك وجميع بياناتك نهائياً
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          حذف
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                          <AlertDialogDescription>
                            سيتم حذف حسابك وجميع بياناتك نهائياً ولا يمكن التراجع عن هذا الإجراء.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                            حذف الحساب
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default UserProfile;
