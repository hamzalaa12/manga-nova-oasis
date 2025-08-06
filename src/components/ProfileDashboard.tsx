import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BookOpen,
  Calendar,
  TrendingUp,
  Clock,
  Star,
  Target,
  Award,
  Activity,
  Users,
  Shield,
  Flag,
  MessageSquare,
  Upload,
  Eye
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/types/user';
import { useReadingHistory } from '@/hooks/useReadingHistory';
import { useFavorites } from '@/hooks/useFavorites';
import { supabase } from '@/integrations/supabase/client';

interface AdvancedStats {
  weeklyReadingGoal: number;
  currentWeekProgress: number;
  monthlyStats: {
    chaptersRead: number;
    timeSpent: number;
    newMangaDiscovered: number;
  };
  yearlyStats: {
    totalChapters: number;
    completedManga: number;
    averageRating: number;
  };
  achievements: Achievement[];
  readingStreak: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

const ProfileDashboard = () => {
  const { user, userRole } = useAuth();
  const { stats } = useReadingHistory();
  const { favorites } = useFavorites();
  const [advancedStats, setAdvancedStats] = useState<AdvancedStats>({
    weeklyReadingGoal: 10,
    currentWeekProgress: 0,
    monthlyStats: {
      chaptersRead: 0,
      timeSpent: 0,
      newMangaDiscovered: 0
    },
    yearlyStats: {
      totalChapters: 0,
      completedManga: 0,
      averageRating: 0
    },
    achievements: [],
    readingStreak: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAdvancedStats();
    }
  }, [user, stats]);

  const loadAdvancedStats = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get current week's reading progress
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const { count: weeklyProgress } = await supabase
        .from('reading_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('last_read_at', startOfWeek.toISOString())
        .eq('completed', true);

      // Get monthly stats
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: monthlyChapters } = await supabase
        .from('reading_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('last_read_at', startOfMonth.toISOString())
        .eq('completed', true);

      // Get yearly stats
      const startOfYear = new Date();
      startOfYear.setMonth(0, 1);
      startOfYear.setHours(0, 0, 0, 0);

      const { count: yearlyChapters } = await supabase
        .from('reading_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('last_read_at', startOfYear.toISOString())
        .eq('completed', true);

      // Calculate reading streak
      const readingStreak = await calculateReadingStreak();

      // Generate achievements
      const achievements = generateAchievements({
        totalChapters: stats.totalChaptersRead,
        totalManga: stats.totalMangaRead,
        favorites: favorites.length,
        streak: readingStreak
      });

      setAdvancedStats({
        weeklyReadingGoal: 10,
        currentWeekProgress: weeklyProgress || 0,
        monthlyStats: {
          chaptersRead: monthlyChapters || 0,
          timeSpent: (monthlyChapters || 0) * 15, // Estimate 15 minutes per chapter
          newMangaDiscovered: 0 // This would need separate tracking
        },
        yearlyStats: {
          totalChapters: yearlyChapters || 0,
          completedManga: stats.totalMangaRead,
          averageRating: 0 // This would need separate tracking
        },
        achievements,
        readingStreak
      });
    } catch (error) {
      console.error('Error loading advanced stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateReadingStreak = async (): Promise<number> => {
    if (!user) return 0;

    try {
      const { data } = await supabase
        .from('reading_progress')
        .select('last_read_at')
        .eq('user_id', user.id)
        .order('last_read_at', { ascending: false })
        .limit(100);

      if (!data || data.length === 0) return 0;

      let streak = 0;
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      const readDates = new Set(
        data.map(item => new Date(item.last_read_at).toDateString())
      );

      while (readDates.has(currentDate.toDateString())) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      }

      return streak;
    } catch (error) {
      console.error('Error calculating reading streak:', error);
      return 0;
    }
  };

  const generateAchievements = (userStats: {
    totalChapters: number;
    totalManga: number;
    favorites: number;
    streak: number;
  }): Achievement[] => {
    const achievements: Achievement[] = [
      {
        id: 'first_chapter',
        title: 'القارئ المبتدئ',
        description: 'قراءة أول فصل',
        icon: '📖',
        unlocked: userStats.totalChapters >= 1,
        progress: Math.min(userStats.totalChapters, 1),
        maxProgress: 1
      },
      {
        id: 'chapter_10',
        title: 'قارئ نشط',
        description: 'قراء�� 10 فصول',
        icon: '🔥',
        unlocked: userStats.totalChapters >= 10,
        progress: Math.min(userStats.totalChapters, 10),
        maxProgress: 10
      },
      {
        id: 'chapter_50',
        title: 'عاشق المانجا',
        description: 'قراءة 50 فصل',
        icon: '💫',
        unlocked: userStats.totalChapters >= 50,
        progress: Math.min(userStats.totalChapters, 50),
        maxProgress: 50
      },
      {
        id: 'chapter_100',
        title: 'محترف القراءة',
        description: 'قراءة 100 فصل',
        icon: '👑',
        unlocked: userStats.totalChapters >= 100,
        progress: Math.min(userStats.totalChapters, 100),
        maxProgress: 100
      },
      {
        id: 'manga_5',
        title: 'م��تكشف المانجا',
        description: 'قراءة 5 مانجا مختلفة',
        icon: '🌟',
        unlocked: userStats.totalManga >= 5,
        progress: Math.min(userStats.totalManga, 5),
        maxProgress: 5
      },
      {
        id: 'streak_7',
        title: 'قارئ منتظم',
        description: 'قراءة لمدة 7 أيام متتالية',
        icon: '��',
        unlocked: userStats.streak >= 7,
        progress: Math.min(userStats.streak, 7),
        maxProgress: 7
      },
      {
        id: 'favorites_10',
        title: 'جامع المف��لات',
        description: 'إضافة 10 مانجا للمفضلة',
        icon: '��️',
        unlocked: userStats.favorites >= 10,
        progress: Math.min(userStats.favorites, 10),
        maxProgress: 10
      }
    ];

    return achievements.map(achievement => ({
      ...achievement,
      unlockedAt: achievement.unlocked ? new Date().toISOString() : undefined
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">جاري التحمي��...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* الهدف الأسبوعي */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            الهدف الأسبوعي
          </CardTitle>
          <CardDescription>تقدمك نحو هدف القراءة الأسبوعي</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {advancedStats.currentWeekProgress} من {advancedStats.weeklyReadingGoal} فصل
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round((advancedStats.currentWeekProgress / advancedStats.weeklyReadingGoal) * 100)}%
              </span>
            </div>
            <Progress 
              value={(advancedStats.currentWeekProgress / advancedStats.weeklyReadingGoal) * 100} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* الإحصائيات المتقدمة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            إحصائيات مفصلة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="monthly" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly">هذا الشهر</TabsTrigger>
              <TabsTrigger value="yearly">هذا العام</TabsTrigger>
            </TabsList>
            
            <TabsContent value="monthly" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{advancedStats.monthlyStats.chaptersRead}</p>
                  <p className="text-sm text-muted-foreground">فصل مقروء</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{Math.round(advancedStats.monthlyStats.timeSpent / 60)}</p>
                  <p className="text-sm text-muted-foreground">ساعة قراءة</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{advancedStats.readingStreak}</p>
                  <p className="text-sm text-muted-foreground">يوم متتالي</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="yearly" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{advancedStats.yearlyStats.totalChapters}</p>
                  <p className="text-sm text-muted-foreground">فصل هذا العام</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <Star className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{advancedStats.yearlyStats.completedManga}</p>
                  <p className="text-sm text-muted-foreground">مانجا مكتملة</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{new Date().getFullYear()}</p>
                  <p className="text-sm text-muted-foreground">السنة الحالية</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* الإنجازات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            الإنجازات
          </CardTitle>
          <CardDescription>
            حصلت على {advancedStats.achievements.filter(a => a.unlocked).length} من {advancedStats.achievements.length} إنجاز
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {advancedStats.achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-4 border rounded-lg ${
                  achievement.unlocked 
                    ? 'bg-primary/5 border-primary/20' 
                    : 'bg-muted/50 border-muted'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{achievement.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium ${achievement.unlocked ? 'text-primary' : 'text-muted-foreground'}`}>
                      {achievement.title}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {achievement.description}
                    </p>
                    {!achievement.unlocked && achievement.progress !== undefined && achievement.maxProgress && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>{achievement.progress}/{achievement.maxProgress}</span>
                          <span>{Math.round((achievement.progress / achievement.maxProgress) * 100)}%</span>
                        </div>
                        <Progress 
                          value={(achievement.progress / achievement.maxProgress) * 100} 
                          className="h-1"
                        />
                      </div>
                    )}
                    {achievement.unlocked && (
                      <Badge variant="secondary" className="mt-2">
                        مُحقق
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* إحصائيات الإدارة */}
      {userRole !== "user" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              إحصائيات الإدارة
            </CardTitle>
            <CardDescription>
              أنشطتك وصلاحياتك الإدارية
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* رفع المحتوى */}
              {hasPermission(userRole, "can_submit_content") && (
                <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p className="text-xl font-bold text-green-900 dark:text-green-100">المحتوى</p>
                  <p className="text-sm text-green-700 dark:text-green-300">رفع مباشر</p>
                </div>
              )}

              {/* إدارة التعليقات */}
              {hasPermission(userRole, "can_moderate_comments") && (
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-xl font-bold text-blue-900 dark:text-blue-100">التعليقات</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">إدارة ومراقبة</p>
                </div>
              )}

              {/* حظر المستخدمين */}
              {hasPermission(userRole, "can_ban_users") && (
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                  <Flag className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                  <p className="text-xl font-bold text-orange-900 dark:text-orange-100">الحظر</p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">إدارة المخالفين</p>
                </div>
              )}

              {/* إدارة المستخدمين */}
              {hasPermission(userRole, "can_manage_users") && (
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                  <Users className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <p className="text-xl font-bold text-purple-900 dark:text-purple-100">المستخدمين</p>
                  <p className="text-sm text-purple-700 dark:text-purple-300">إدارة شاملة</p>
                </div>
              )}
            </div>

            {/* أز��ار الإجراءات السريعة */}
            <div className="mt-6 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {hasPermission(userRole, "can_submit_content") && (
                  <a href="/admin?tab=content" className="block">
                    <div className="p-3 text-center bg-muted/50 hover:bg-muted rounded-lg transition-colors cursor-pointer">
                      <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-sm font-medium">إضافة محتوى</p>
                    </div>
                  </a>
                )}

                {hasPermission(userRole, "can_moderate_comments") && (
                  <a href="/admin?tab=reports" className="block">
                    <div className="p-3 text-center bg-muted/50 hover:bg-muted rounded-lg transition-colors cursor-pointer">
                      <Eye className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-sm font-medium">مراجعة التعليقات</p>
                    </div>
                  </a>
                )}

                {hasPermission(userRole, "can_manage_users") && (
                  <a href="/admin?tab=users" className="block">
                    <div className="p-3 text-center bg-muted/50 hover:bg-muted rounded-lg transition-colors cursor-pointer">
                      <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-sm font-medium">إدارة المستخدمين</p>
                    </div>
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProfileDashboard;
