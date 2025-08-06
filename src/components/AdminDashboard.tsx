import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Users,
  Shield,
  AlertTriangle,
  Trash2,
  Ban,
  UserCheck,
  Calendar,
  MessageSquare,
  Heart,
  BookOpen,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Flag,
  Plus,
  Globe
} from 'lucide-react';
import { useUserManagement } from '@/hooks/useUserManagement';
import { useReports } from '@/hooks/useReports';
import { useRoleUpdate } from '@/hooks/useRoleUpdate';
import { useUserRestrictions, RestrictionType } from '@/hooks/useUserRestrictions';
import { useAuth } from '@/hooks/useAuth';
import { UserRole, getRoleDisplayName, getRoleColor, hasPermission } from '@/types/user';
import ContentModeration from './ContentModeration';
import RestrictionsMenu from './RestrictionsMenu';
import SitemapManager from './admin/SitemapManager';
import ContentManagement from './admin/ContentManagement';

const AdminDashboard = () => {
  const { user: currentUser, refreshProfile, userRole } = useAuth();

  // فحص الصلاحيات
  const canManageUsers = hasPermission(userRole, "can_manage_users");
  const canSubmitContent = hasPermission(userRole, "can_submit_content");
  const canModerateComments = hasPermission(userRole, "can_moderate_comments");
  const isSiteAdmin = userRole === "site_admin";

  // حساب عدد التبويبات المرئية
  const getTabCount = () => {
    let count = 0;
    if (canManageUsers) count++;
    if (canModerateComments) count++;
    if (canSubmitContent) count++;
    if (isSiteAdmin) count++;
    return Math.max(count, 1);
  };
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    users,
    loading: usersLoading,
    banUser,
    unbanUser,
    deleteUser,
    getUserStats,
    refreshUsers
  } = useUserManagement();

  const { updateUserRole } = useRoleUpdate();

  // دالة لتحديد التبويب الافتراضي حسب الرتبة
  const getDefaultTab = (): string => {
    if (userRole === 'beginner_fighter' || userRole === 'elite_fighter') {
      return 'content';
    }
    if (userRole === 'tribe_leader') {
      return 'content';
    }
    if (canManageUsers) {
      return 'users';
    }
    if (canModerateComments) {
      return 'reports';
    }
    if (canSubmitContent) {
      return 'content';
    }
    return 'users';
  };

  // التبويب الحالي من URL أو افتراضي
  const currentTab = searchParams.get('tab') || getDefaultTab();

  const {
    reports,
    stats: reportStats,
    loading: reportsLoading,
    updateReportStatus,
    deleteReport,
    getStatusText,
    getReasonText
  } = useReports();

  const {
    restrictions,
    addRestriction,
    removeRestriction,
    getUserRestrictions
  } = useUserRestrictions();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');
  const [banReason, setBanReason] = useState('');
  const [banType, setBanType] = useState<'temporary' | 'permanent'>('temporary');
  const [banDuration, setBanDuration] = useState('7'); // days
  const [localUsers, setLocalUsers] = useState(users);

  // ت��ديث المستخدمين ��لمحليين عند تغيير البيانات الأصلية
  useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  const filteredUsers = localUsers.filter(user => {
    const matchesSearch = user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const filteredReports = reports.filter(report => 
    report.status === 'pending' || report.status === 'reviewed'
  );

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    console.log(`Admin dashboard: Changing user ${userId} role to ${newRole}`);

    // تحديث فوري للواجهة
    setLocalUsers(prevUsers =>
      prevUsers.map(user =>
        user.user_id === userId
          ? { ...user, role: newRole, updated_at: new Date().toISOString() }
          : user
      )
    );

    try {
      const success = await updateUserRole(userId, newRole);
      if (success) {
        console.log('Role change succeeded, refreshing user data');

        // إذا كان المستخدم المحدث هو المستخدم الحالي، حدث الملف الشخصي
        if (userId === currentUser?.id) {
          console.log('Current user role changed, refreshing profile');
          setTimeout(() => {
            refreshProfile();
          }, 1000);
        }

        // إعادة تحميل بيانات المستخدمين بعد تأخير
        setTimeout(() => {
          refreshUsers();
        }, 1500);
      } else {
        console.error('Role change failed - reverting UI change');
        // إذا فشل�� أرجع التغيير في الواجهة
        setLocalUsers(users);
      }
    } catch (error) {
      console.error('Error in handleRoleChange:', error);
      // إذا حدث خطأ، أرجع التغيير في الوا��هة
      setLocalUsers(users);
    }
  };

  const handleBanUser = async (userId: string) => {
    if (!banReason.trim()) return;

    const expiresAt = banType === 'temporary' 
      ? new Date(Date.now() + parseInt(banDuration) * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    await banUser(userId, banReason, banType, expiresAt);
    setBanReason('');
  };

  return (
    <div className="space-y-6">
      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المستخدمين المحظورين</CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.is_banned).length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الإبلاغات المعلقة</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportStats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإبلاغات</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportStats.total}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={currentTab} onValueChange={(value) => setSearchParams({ tab: value })} className="w-full">
        <TabsList className={`grid w-full grid-cols-${getTabCount()}`}>
          {canManageUsers && (
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              إدارة المستخدمين
            </TabsTrigger>
          )}
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            الإبلاغات
          </TabsTrigger>
          <TabsTrigger value="content">إدارة ��لمحتوى</TabsTrigger>
          <TabsTrigger value="seo">تحسين محركات البحث</TabsTrigger>
        </TabsList>

        {/* إدارة المستخدمين */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>إدارة المستخدمين</CardTitle>
              <CardDescription>
                إدارة حسابات المستخدمين ورتبهم وحالة الحظر
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* فلترة وبحث */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="البحث بالاسم أو البريد الإلكتروني..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole | 'all')}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="فلترة حسب الرتبة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الرتب</SelectItem>
                    <SelectItem value="user">م��تخدم عادي</SelectItem>
                    <SelectItem value="beginner_fighter">مقاتل مبتدئ</SelectItem>
                    <SelectItem value="elite_fighter">مقاتل نخبة</SelectItem>
                    <SelectItem value="tribe_leader">قائد قبيلة</SelectItem>
                    <SelectItem value="admin">مدير</SelectItem>
                    <SelectItem value="site_admin">مدير الموقع</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* قائمة المستخدمين */}
              <div className="space-y-4">
                {usersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      onRoleChange={handleRoleChange}
                      onBan={handleBanUser}
                      onUnban={unbanUser}
                      onDelete={deleteUser}
                      banReason={banReason}
                      setBanReason={setBanReason}
                      banType={banType}
                      setBanType={setBanType}
                      banDuration={banDuration}
                      setBanDuration={setBanDuration}
                      addRestriction={addRestriction}
                      removeRestriction={removeRestriction}
                      getUserRestrictions={getUserRestrictions}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* الإبلاغات */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>إدارة الإبلاغات</CardTitle>
              <CardDescription>
                مراجعة والرد على الإبلاغات الم��سلة من المس��خدمين
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد إبلاغات جديدة</p>
                  </div>
                ) : (
                  filteredReports.map((report) => (
                    <ReportCard 
                      key={report.id} 
                      report={report}
                      onUpdateStatus={updateReportStatus}
                      onDelete={deleteReport}
                      getStatusText={getStatusText}
                      getReasonText={getReasonText}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* إدارة ا��محتوى */}
        <TabsContent value="content" className="space-y-4">
          <ContentManagement />
        </TabsContent>

        {/* تحسين محركات البحث */}
        <TabsContent value="seo" className="space-y-4">
          <SitemapManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// مكون بطاقة المستخدم
const UserCard = ({
  user,
  onRoleChange,
  onBan,
  onUnban,
  onDelete,
  banReason,
  setBanReason,
  banType,
  setBanType,
  banDuration,
  setBanDuration,
  addRestriction,
  removeRestriction,
  getUserRestrictions
}: any) => {
  const [userStats, setUserStats] = useState({ commentsCount: 0, favoritesCount: 0, chaptersRead: 0 });
  const { getUserStats } = useUserManagement();

  console.log(`UserCard rendered for user ${user.user_id} with role ${user.role} (updated: ${user.updated_at})`);

  useEffect(() => {
    getUserStats(user.user_id).then(setUserStats);
  }, [user.user_id, getUserStats]);

  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={user.avatar_url} />
          <AvatarFallback>
            {(user.display_name || user.email)?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{user.display_name || 'بدون اسم'}</h3>
            <Badge
              key={`badge-${user.user_id}-${user.role}-${user.updated_at}`}
              className={getRoleColor(user.role)}
              variant="secondary"
            >
              {getRoleDisplayName(user.role)}
            </Badge>
            {user.is_banned && (
              <Badge variant="destructive">محظور</Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground">{user.email}</p>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {userStats.commentsCount} تعليق
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {userStats.favoritesCount} مفضلة
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {userStats.chaptersRead} فصل مقروء
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              انضم {new Date(user.created_at).toLocaleDateString('ar')}
            </span>
          </div>

          {user.ban_reason && (
            <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm">
              <strong>سبب ا����ظر:</strong> {user.ban_reason}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {/* تغ��ير الرت��ة */}
          <Select
            key={`${user.user_id}-${user.role}-${user.updated_at}`}
            value={user.role}
            onValueChange={(newRole) => onRoleChange(user.user_id, newRole)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">��ستخدم عا��ي</SelectItem>
              <SelectItem value="beginner_fighter">مقاتل مبتدئ</SelectItem>
              <SelectItem value="elite_fighter">مقاتل نخبة</SelectItem>
              <SelectItem value="tribe_leader">قائد قبيلة</SelectItem>
              <SelectItem value="admin">مدير</SelectItem>
              <SelectItem value="site_admin">مدير الموقع</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1">
            {/* Restrictions Menu */}
            <RestrictionsMenu
              userId={user.user_id}
              userName={user.display_name || user.email}
              addRestriction={addRestriction}
              removeRestriction={removeRestriction}
              getUserRestrictions={getUserRestrictions}
            />

            {user.is_banned ? (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onUnban(user.user_id)}
              >
                <UserCheck className="h-4 w-4" />
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Ban className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>حظر المستخدم</AlertDialogTitle>
                    <AlertDialogDescription>
                      هل أنت متأكد من رغبتك في حظر هذا المستخدم؟
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>سبب الحظر</Label>
                      <Input 
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                        placeholder="أدخل سبب الحظر..."
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id="temporary"
                          checked={banType === 'temporary'}
                          onChange={() => setBanType('temporary')}
                        />
                        <Label htmlFor="temporary">مؤقت</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id="permanent"
                          checked={banType === 'permanent'}
                          onChange={() => setBanType('permanent')}
                        />
                        <Label htmlFor="permanent">دائم</Label>
                      </div>
                    </div>

                    {banType === 'temporary' && (
                      <div>
                        <Label>مدة الحظر (بالأيام)</Label>
                        <Input
                          type="number"
                          value={banDuration}
                          onChange={(e) => setBanDuration(e.target.value)}
                          min="1"
                          max="365"
                        />
                      </div>
                    )}
                  </div>

                  <AlertDialogFooter>
                    <AlertDialogCancel>��لغاء</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => onBan(user.user_id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      حظر المستخدم
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>حذف المستخدم</AlertDialogTitle>
                  <AlertDialogDescription>
                    هل أنت مت��ك�� من رغبتك في حذف هذا المستخدم نهائياً؟ 
                    سيتم حذف جميع بيانات�� وتعليقاته ولا يمكن التراجع عن ه��ا الإجراء.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onDelete(user.user_id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    حذف نهائي
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </Card>
  );
};

// مكون بطاقة الإبلاغ
const ReportCard = ({ 
  report, 
  onUpdateStatus, 
  onDelete, 
  getStatusText, 
  getReasonText 
}: any) => {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{getReasonText(report.reason)}</Badge>
              <Badge 
                variant={
                  report.status === 'pending' ? 'default' : 
                  report.status === 'resolved' ? 'secondary' : 'destructive'
                }
              >
                {getStatusText(report.status)}
              </Badge>
            </div>
            <p className="text-sm font-medium">
              تم الإبلاغ بوا��طة: {report.reporter.display_name || report.reporter.email}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(report.created_at).toLocaleString('ar')}
            </p>
          </div>

          <div className="flex gap-1">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onUpdateStatus(report.id, 'resolved')}
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onUpdateStatus(report.id, 'dismissed')}
            >
              <XCircle className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => onDelete(report.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {report.description && (
          <div className="p-3 bg-muted rounded text-sm">
            <strong>التفاصيل:</strong> {report.description}
          </div>
        )}

        {report.manga && (
          <div className="text-sm">
            <strong>المانجا المبل�� عنها:</strong> {report.manga.title}
          </div>
        )}

        {report.comment && (
          <div className="p-3 bg-muted rounded text-sm">
            <strong>التعليق المبلغ عنه:</strong> {report.comment.content}
          </div>
        )}

        {report.reported_user && (
          <div className="text-sm">
            <strong>المستخدم المبلغ عنه:</strong> {report.reported_user.display_name || report.reported_user.email}
          </div>
        )}
      </div>
    </Card>
  );
};

export default AdminDashboard;
