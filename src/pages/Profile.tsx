import { useState } from 'react';
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
import { User, Settings, Heart, History, Bell, Camera } from 'lucide-react';
import { getRoleDisplayName, getRoleColor } from '@/types/user';
import SEO from '@/components/SEO';

const Profile = () => {
  const { user, profile, userRole, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

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
                  <Button
                    size="sm"
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full p-0"
                    onClick={() => {
                      // تغيير الصورة الشخصية
                    }}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
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
              <TabsList className="grid w-full grid-cols-5">
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
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  الإعدادات
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-6">
                <ProfileSettings />
              </TabsContent>

              <TabsContent value="favorites" className="mt-6">
                <FavoritesList />
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                <ReadingHistory />
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
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');

  return (
    <Card>
      <CardHeader>
        <CardTitle>تعديل الملف الشخصي</CardTitle>
        <CardDescription>قم بتعديل معلوماتك الشخصية هنا</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <Button>حفظ التغييرات</Button>
      </CardContent>
    </Card>
  );
};

// مكون قائمة المفضلة
const FavoritesList = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>المانجا المفضلة</CardTitle>
        <CardDescription>المانجا التي أضفتها إلى قائمة المفضلة</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>لا توجد مانجا في المفضلة بعد</p>
          <p className="text-sm">ابدأ بإضافة مانجا إلى قائمة المفضلة!</p>
        </div>
      </CardContent>
    </Card>
  );
};

// مكون سجل القراءة
const ReadingHistory = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>سجل القراءة</CardTitle>
        <CardDescription>الفصول التي قرأتها مؤخراً</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>لا يوجد سجل قراءة بعد</p>
          <p className="text-sm">ابدأ بقراءة بعض الفصول!</p>
        </div>
      </CardContent>
    </Card>
  );
};

// مكون قائمة الإشعارات
const NotificationsList = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>الإشعارات</CardTitle>
        <CardDescription>آخر الإشعارات والتحديثات</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>لا توجد إشعارات</p>
          <p className="text-sm">ستظهر إشعاراتك هنا</p>
        </div>
      </CardContent>
    </Card>
  );
};

// مكون إعدادات الحساب
const AccountSettings = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>إعدادات الحساب</CardTitle>
        <CardDescription>إدارة حسابك وكلمة المرور</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
          <Input id="currentPassword" type="password" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
          <Input id="newPassword" type="password" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
          <Input id="confirmPassword" type="password" />
        </div>

        <Button variant="destructive">تغيير كلمة المرور</Button>
      </CardContent>
    </Card>
  );
};

export default Profile;