import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Settings, Heart, History, Bell, Camera, Trash2, Upload, BarChart3, Calendar, BookOpen, Star, Shield, Users, Flag } from 'lucide-react';
import { getRoleDisplayName, getRoleColor } from '@/types/user';
import SEO from '@/components/SEO';
import { useFavorites } from '@/hooks/useFavorites';
import { useNotifications } from '@/hooks/useNotifications';
import { useProfile } from '@/hooks/useProfile';
import { useReadingHistory } from '@/hooks/useReadingHistory';
import { useImageUpload } from '@/hooks/useImageUpload';
import { Link } from 'react-router-dom';
import ProfileDashboard from '@/components/ProfileDashboard';

const Profile = () => {
  const { user, profile, userRole, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="الملف الشخصي - مانجا العرب"
        description="إدارة ملفك الشخصي ومفضلاتك وإعداداتك"
        url="/profile"
        type="website"
      />
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* بطاقة المستخدم */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <div className="relative mx-auto w-24 h-24 mb-4">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="text-2xl">
                      {(profile?.display_name || user.email)?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <AvatarUploadButton />
                </div>
                
                <CardTitle className="flex items-center justify-center gap-2">
                  {profile?.display_name || 'مستخدم'}
                  <Badge 
                    className={getRoleColor(userRole)}
                    variant="secondary"
                  >
                    {getRoleDisplayName(userRole)}
                  </Badge>
                </CardTitle>
                
                <CardDescription>
                  {user.email}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>عضو منذ:</span>
                    <span>{new Date(user.created_at).toLocaleDateString('ar')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>آخر دخول:</span>
                    <span>اليوم</span>
                  </div>
                </div>

                {profile?.bio && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm">{profile.bio}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* محتوى الملف الشخصي */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-7' : 'grid-cols-6'}`}>
                <TabsTrigger value="dashboard" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  لوحة المعلومات
                </TabsTrigger>
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  الملف الشخصي
                </TabsTrigger>
                <TabsTrigger value="favorites" className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  المفضلة
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  سجل القراءة
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  الإشعارات
                </TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="admin" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    لوحة الإدارة
                  </TabsTrigger>
                )}
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  الإعدادات
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="mt-6">
                <ProfileDashboard />
              </TabsContent>

              <TabsContent value="profile" className="mt-6">
                <ProfileSettings />
              </TabsContent>

              <TabsContent value="favorites" className="mt-6">
                <FavoritesList />
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                <ReadingHistoryComponent />
              </TabsContent>

              <TabsContent value="notifications" className="mt-6">
                <NotificationsList />
              </TabsContent>

              <TabsContent value="settings" className="mt-6">
                <AccountSettings />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

// مكون إعدادات الملف الشخصي
const ProfileSettings = () => {
  const { profile, user } = useAuth();
  const { updateProfile, loading } = useProfile();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      display_name: displayName,
      bio: bio
    });
  };

  return (
    <div className="space-y-6">
      {/* معلومات الملف الشخصي */}
      <Card>
        <CardHeader>
          <CardTitle>تعديل الملف الشخصي</CardTitle>
          <CardDescription>قم بتعديل معلوماتك الشخصية هنا</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">الاسم المعروض</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="أدخل اسمك المعروض"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">نبذة عنك</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="اكتب نبذة مختصرة عنك..."
                className="min-h-[100px]"
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* معلومات الح��اب */}
      <Card>
        <CardHeader>
          <CardTitle>معلومات الحساب</CardTitle>
          <CardDescription>معلومات حسابك الأساسية</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>البريد الإلكتروني</Label>
                <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
              </div>
              <div>
                <Label>تاريخ التسجيل</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('ar') : 'غير متوفر'}
                </p>
              </div>
              <div>
                <Label>آخر تحديث للملف</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString('ar') : 'غير متوفر'}
                </p>
              </div>
              <div>
                <Label>حالة البريد الإلكتروني</Label>
                <Badge variant={user?.email_confirmed_at ? "default" : "destructive"} className="mt-1">
                  {user?.email_confirmed_at ? "مؤكد" : "غير مؤكد"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// مكون قائمة المفضلة
const FavoritesList = () => {
  const { favorites, loading } = useFavorites();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>المانجا المفضلة</CardTitle>
          <CardDescription>المانجا التي أضفتها إلى قائمة المفضلة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>المانجا المفضلة</CardTitle>
        <CardDescription>المانجا التي أضفتها إلى قائمة المفضلة</CardDescription>
      </CardHeader>
      <CardContent>
        {favorites.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد مانجا في المفضلة بعد</p>
            <p className="text-sm">ابدأ بإضافة مانجا إلى قائمة المفضلة!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((favorite) => (
              <Card key={favorite.id} className="overflow-hidden">
                <div className="aspect-[3/4] relative">
                  <img
                    src={favorite.manga.cover_image_url || '/placeholder.svg'}
                    alt={favorite.manga.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-3">
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                    {favorite.manga.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    {favorite.manga.author}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      ⭐ {favorite.manga.rating || 'N/A'}
                    </Badge>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/manga/${favorite.manga.slug || favorite.manga.id}`}>
                        قراءة
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// مكون رفع الصورة الشخصية
const AvatarUploadButton = () => {
  const { uploadAvatar, removeAvatar, uploading } = useImageUpload();
  const { profile } = useAuth();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadAvatar(file);
    }
  };

  return (
    <div className="absolute bottom-0 right-0">
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        id="avatar-upload"
        disabled={uploading}
      />
      <div className="flex gap-1">
        <Button
          size="sm"
          className="w-8 h-8 rounded-full p-0"
          onClick={() => document.getElementById('avatar-upload')?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </Button>
        {profile?.avatar_url && (
          <Button
            size="sm"
            variant="destructive"
            className="w-8 h-8 rounded-full p-0"
            onClick={removeAvatar}
            disabled={uploading}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

// مكون سجل القراءة المحسن
const ReadingHistoryComponent = () => {
  const { readingHistory, stats, loading, clearReadingHistory } = useReadingHistory();

  if (loading) {
    return (
      <div className="space-y-6">
        {/* إحصائيات القراءة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              إحصائيات القراءة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* إحصائيات القراءة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            إحصائيات القراءة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.totalMangaRead}</p>
              <p className="text-sm text-muted-foreground">مانجا مقروءة</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <History className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.totalChaptersRead}</p>
              <p className="text-sm text-muted-foreground">فصل مكتمل</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Star className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.favoriteGenres.length}</p>
              <p className="text-sm text-muted-foreground">أنواع مفضلة</p>
            </div>
          </div>

          {stats.favoriteGenres.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-medium mb-2">الأنواع المفضلة:</h4>
              <div className="flex flex-wrap gap-2">
                {stats.favoriteGenres.map((genre) => (
                  <Badge key={genre} variant="secondary">
                    {genre}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* سجل القراءة الحديث */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              سجل القراءة الحديث
            </CardTitle>
            <CardDescription>آخر الفصول التي قرأتها</CardDescription>
          </div>
          {readingHistory.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearReadingHistory}>
              <Trash2 className="h-4 w-4 mr-2" />
              مسح السجل
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {readingHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا يوجد سجل قراءة بعد</p>
              <p className="text-sm">ابدأ بقراءة بعض الفصول!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {readingHistory.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <img
                    src={item.manga.cover_image_url || '/placeholder.svg'}
                    alt={item.manga.title}
                    className="w-12 h-16 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium line-clamp-1">{item.manga.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      الفصل {item.chapter.chapter_number}
                      {item.chapter.title && ` - ${item.chapter.title}`}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(item.last_read_at).toLocaleDateString('ar')}
                      </span>
                      {item.completed && (
                        <Badge variant="secondary" className="text-xs">
                          مكتمل
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/manga/${item.manga.slug || item.manga_id}`}>
                        عرض المانجا
                      </Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link to={`/read/${item.manga.slug || item.manga_id}/${item.chapter.chapter_number}`}>
                        متابعة القراءة
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// مكون قائمة الإشعارات
const NotificationsList = () => {
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>الإشعارات</CardTitle>
          <CardDescription>آخر الإشعارات والتحديثات</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>الإشعارات</CardTitle>
          <CardDescription>آخر الإشعارات والتحديثات</CardDescription>
        </div>
        {notifications.length > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            تحديد الكل كمقروء
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد إشعارات</p>
            <p className="text-sm">ستظهر إشعاراتك هنا</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border ${
                  notification.is_read ? 'bg-background' : 'bg-muted/50'
                }`}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{notification.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(notification.created_at).toLocaleDateString('ar')}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// مكون إعدادات الحساب
const AccountSettings = () => {
  const { changePassword, loading } = useProfile();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: 'خطأ',
        description: 'كلمات المرور غير متطابقة',
        variant: 'destructive'
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'خطأ',
        description: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
        variant: 'destructive'
      });
      return;
    }

    const success = await changePassword(currentPassword, newPassword);
    if (success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleDeleteAccount = async () => {
    // هذا سيتطلب تأكيد إضافي من المستخدم
    toast({
      title: 'تحذير',
      description: 'هذه الميزة غير متوفرة حالياً. يرجى التواصل مع الدعم لحذف حسابك.',
      variant: 'destructive'
    });
  };

  return (
    <div className="space-y-6">
      {/* تغيير كلمة المرور */}
      <Card>
        <CardHeader>
          <CardTitle>تغيير كلمة المرور</CardTitle>
          <CardDescription>قم بتحديث كلمة مرورك لحماية حسابك</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الحالية"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة"
                required
              />
              <p className="text-xs text-muted-foreground">
                يجب أن تكون كلمة المرور 6 أحرف على الأقل
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور الجديدة"
                required
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* إعدادات أمان إضافية */}
      <Card>
        <CardHeader>
          <CardTitle>الأمان والخصوصية</CardTitle>
          <CardDescription>إدارة إعدادات الأمان الخاصة بك</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">تسجيل الخروج من جميع الأجهزة</h4>
                <p className="text-sm text-muted-foreground">قم بتسجيل الخروج من جميع المتصفحات والأجهزة</p>
              </div>
              <Button variant="outline" onClick={signOut}>
                تسجيل الخر��ج
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* المنطقة الخطرة */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">المنطقة الخطرة</CardTitle>
          <CardDescription>عمليات لا يمكن التراجع عنها</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-destructive rounded-lg">
              <div>
                <h4 className="font-medium text-destructive">حذف الحساب</h4>
                <p className="text-sm text-muted-foreground">
                  حذف حسابك نهائياً وجميع البيانات ال��رتبطة به
                </p>
              </div>
              <Button variant="destructive" onClick={handleDeleteAccount}>
                حذف الحساب
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
