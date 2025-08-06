import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  FileText, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle,
  BookOpen,
  Upload
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission, getRoleDisplayName, getRoleColor } from '@/types/user';
import AddMangaForm from './AddMangaForm';
import AddChapterForm from './AddChapterForm';
import ContentModeration from '../ContentModeration';
import LimitedUserManagement from './LimitedUserManagement';

const ContentManagement = () => {
  const { userRole } = useAuth();
  const [activeContentTab, setActiveContentTab] = useState('overview');

  // فحص الصلاحيات
  const canSubmitContent = hasPermission(userRole, "can_submit_content");
  const canPublishDirectly = hasPermission(userRole, "can_publish_directly");
  const canManageUsers = hasPermission(userRole, "can_manage_users");

  // حساب عدد ا��تبويبات في ContentManagement
  const getContentTabCount = () => {
    let count = 1; // overview tab is always visible
    if (canSubmitContent) count += 2; // add-manga, add-chapter
    if (canManageUsers) count++; // review
    if (userRole === 'tribe_leader') count++; // limited user management
    return count;
  };

  // إذا لم يكن لديه صلاحية رفع المحتوى أو إدارة المستخدمين، عرض رسالة
  if (!canSubmitContent && !canManageUsers) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <XCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">غير مخول</h3>
          <p className="text-muted-foreground">
            ليس لديك صلاحية لإدارة المحتوى. يتطلب رتبة "مقاتل مبتدئ" على الأقل.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ترحيب ومعلومات الرتبة */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">مرحباً في قسم إدارة ��لمحتوى</h2>
              <p className="text-sm text-muted-foreground">
                يمكنك هنا إضافة المانجا والفصول الجديدة
              </p>
            </div>
            <div className="text-left">
              <Badge className={getRoleColor(userRole)} variant="secondary">
                {getRoleDisplayName(userRole)}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                {canPublishDirectly ? "نشر مباشر" : "يتطلب مراجعة"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* لوحة معلومات المحتوى */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">إجمالي المانجا</p>
                <p className="text-2xl font-bold">--</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">إجمالي الفصول</p>
                <p className="text-2xl font-bold">--</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium">في انتظار المراجعة</p>
                <p className="text-2xl font-bold">--</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Upload className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">رفعاتك اليوم</p>
                <p className="text-2xl font-bold">--</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* أدوات المحتوى */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            إدارة المحتوى
          </CardTitle>
          <CardDescription>
            إضافة ومراجعة المانجا والفصول
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeContentTab} onValueChange={setActiveContentTab}>
            <TabsList className={`grid w-full grid-cols-${getContentTabCount()}`}>
              <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
              {canSubmitContent && (
                <TabsTrigger value="add-manga">إضافة مانجا</TabsTrigger>
              )}
              {canSubmitContent && (
                <TabsTrigger value="add-chapter">إضافة فصل</TabsTrigger>
              )}
              {canManageUsers && (
                <TabsTrigger value="review">مراجعة المحتوى</TabsTrigger>
              )}
            </TabsList>

            {/* نظرة عامة */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {canSubmitContent && (
                  <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveContentTab('add-manga')}>
                    <CardContent className="p-6 text-center">
                      <BookOpen className="h-12 w-12 mx-auto mb-3 text-primary" />
                      <h3 className="font-semibold mb-2">إضافة مانجا جديدة</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        أضف مانجا جديدة مع المعلومات والغلاف
                      </p>
                      <Badge variant={canPublishDirectly ? "default" : "secondary"}>
                        {canPublishDirectly ? "نشر مباشر" : "يتطلب مراجعة"}
                      </Badge>
                    </CardContent>
                  </Card>
                )}

                {canSubmitContent && (
                  <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveContentTab('add-chapter')}>
                    <CardContent className="p-6 text-center">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-primary" />
                      <h3 className="font-semibold mb-2">إضافة فصل جديد</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        أضف فصل جديد لمانجا موجودة
                      </p>
                      <Badge variant={canPublishDirectly ? "default" : "secondary"}>
                        {canPublishDirectly ? "نشر مباشر" : "يتطلب مراجعة"}
                      </Badge>
                    </CardContent>
                  </Card>
                )}

                {canManageUsers && (
                  <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveContentTab('review')}>
                    <CardContent className="p-6 text-center">
                      <Eye className="h-12 w-12 mx-auto mb-3 text-primary" />
                      <h3 className="font-semibold mb-2">مراجعة المحتوى</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        مراجعة المحتوى المنتظر للموافقة
                      </p>
                      <Badge variant="outline">
                        مدير فقط
                      </Badge>
                    </CardContent>
                  </Card>
                )}

                {/* إحصائيات سريعة */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-3">إحصائيات سريعة</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">مانجا منشورة:</span>
                        <span className="text-sm font-medium">--</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">فصول منشورة:</span>
                        <span className="text-sm font-medium">--</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">في انتظار المراجعة:</span>
                        <span className="text-sm font-medium">--</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">رفعاتك هذا الأسبوع:</span>
                        <span className="text-sm font-medium">--</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* معلومات الصلاحيات */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">صلاحياتك الحالية:</h4>
                  <div className="flex flex-wrap gap-2">
                    {canSubmitContent && (
                      <Badge variant="secondary">
                        <Upload className="h-3 w-3 mr-1" />
                        رفع المحتوى
                      </Badge>
                    )}
                    {canPublishDirectly && (
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        نشر مباشر
                      </Badge>
                    )}
                    {canManageUsers && (
                      <Badge variant="destructive">
                        <Eye className="h-3 w-3 mr-1" />
                        مراجعة المحتوى
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {canPublishDirectly 
                      ? "يمكنك نشر المحتوى مباشرة دون الحاجة لمراجعة."
                      : "سيتم مراجعة محتواك من قبل المديرين قبل النشر."
                    }
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* إضافة مانجا */}
            {canSubmitContent && (
              <TabsContent value="add-manga" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      إضافة مانجا جديدة
                    </CardTitle>
                    <CardDescription>
                      أضف مانجا جديدة مع جميع المعلومات المطلوبة
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AddMangaForm onSuccess={() => {
                      setActiveContentTab('overview');
                      // يمكن إضافة تحديث للإحصائيات هنا
                    }} />
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* إضافة فصل */}
            {canSubmitContent && (
              <TabsContent value="add-chapter" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      إضافة فصل جديد
                    </CardTitle>
                    <CardDescription>
                      أضف فصل جديد لمانجا موجودة في الموقع
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AddChapterForm onSuccess={() => {
                      setActiveContentTab('overview');
                      // يمكن إضافة تحديث للإحصائيات هنا
                    }} />
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* مراجعة المحتوى */}
            {canManageUsers && (
              <TabsContent value="review" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      مراجعة المحتوى
                    </CardTitle>
                    <CardDescription>
                      مراجعة المحتوى المنتظر للموافقة من المساهمين
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ContentModeration />
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* إرشادات ونصائح */}
      <Card>
        <CardHeader>
          <CardTitle>إرشادات إضافة المحتوى</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">✅ نصائح لإضافة مانجا جيدة:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• استخدم عنوان واضح ومفهوم</li>
                <li>• أضف وصف شامل للقصة</li>
                <li>• اختر صورة غلاف عالية الجودة</li>
                <li>• حدد التصنيفات المناسبة</li>
                <li>• تأكد من صحة معلومات المؤلف</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">⚡ نصائح لإضافة فصول:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• رتب الصفحات بشكل صحيح</li>
                <li>• استخدم أرقام فصول متسلسلة</li>
                <li>• تأكد من جودة الصور</li>
                <li>• أضف عنوان للفصل إن وجد</li>
                <li>• راجع المحتوى قبل النشر</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContentManagement;
