import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  User,
  Edit3,
  Upload,
  MessageSquare,
  Ban,
  Eye,
  Star,
  Users,
  Settings,
  Bell,
  Heart,
  History,
  BookOpen,
  Trash2,
  UserX,
  Plus,
  FileText,
  Globe,
  Flag,
  CheckCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { UserRole, getRoleDisplayName, getRoleColor, getUserRoleIcon } from '@/types/user';

interface UserPermissionsProps {
  userRole: UserRole;
  className?: string;
}

interface Permission {
  icon: React.ReactNode;
  title: string;
  description: string;
  available: boolean;
}

interface RolePermissions {
  icon: string;
  title: string;
  description: string;
  permissions: Permission[];
}

const UserPermissions: React.FC<UserPermissionsProps> = ({ userRole, className = "" }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>(userRole);
  const [isRoleChanged, setIsRoleChanged] = useState(false);

  // React to role changes with animation
  useEffect(() => {
    if (currentRole !== userRole) {
      setIsRoleChanged(true);
      // Update role after a brief moment to show animation
      setTimeout(() => {
        setCurrentRole(userRole);
        setIsRoleChanged(false);
      }, 500);
    }
  }, [userRole, currentRole]);

  const getRolePermissions = (role: UserRole): RolePermissions => {
    const basePermissions: Permission[] = [
      {
        icon: <Edit3 className="h-4 w-4" />,
        title: "تعديل الملف الشخصي",
        description: "تغيير الصورة الشخصية والمعلومات",
        available: true
      },
      {
        icon: <Heart className="h-4 w-4" />,
        title: "إدارة المفضلة",
        description: "إضافة وإزالة المانجا من المفضلة",
        available: true
      },
      {
        icon: <History className="h-4 w-4" />,
        title: "سجل القراءة",
        description: "عرض وإدارة تاريخ القراءة",
        available: true
      },
      {
        icon: <MessageSquare className="h-4 w-4" />,
        title: "كتابة التعليقات",
        description: "التعليق على المانجا والفصول",
        available: true
      },
      {
        icon: <Bell className="h-4 w-4" />,
        title: "الإشعارات",
        description: "استقبال إشعارات الفصول الجديدة",
        available: true
      }
    ];

    switch (role) {
      case "user":
        return {
          icon: "👤",
          title: "مستخدم عادي",
          description: "الصلاحيات الأساسية للمستخدم المسجل",
          permissions: basePermissions
        };

      case "beginner_fighter":
        return {
          icon: "🥉",
          title: "مقاتل مبتدئ",
          description: "صلاحيات المستخدم العادي + رفع المحتوى للمراجعة",
          permissions: [
            ...basePermissions,
            {
              icon: <Upload className="h-4 w-4" />,
              title: "رفع مانجا أو فصل جديد",
              description: "يتطلب موافقة من مدير الموقع قبل النشر",
              available: true
            }
          ]
        };

      case "elite_fighter":
        return {
          icon: "🥈",
          title: "مقاتل نخبة", 
          description: "صلاحيات المقاتل المبتدئ + إدارة التعليقات والحظر",
          permissions: [
            ...basePermissions,
            {
              icon: <Upload className="h-4 w-4" />,
              title: "رفع مانجا أو فصل جديد",
              description: "يتطلب موافقة من مدير الموقع قبل النشر",
              available: true
            },
            {
              icon: <Edit3 className="h-4 w-4" />,
              title: "تعديل التعليقات",
              description: "تعديل أو حذف التعليقات المسيئة",
              available: true
            },
            {
              icon: <Ban className="h-4 w-4" />,
              title: "حظر المست��دمين",
              description: "حظر أصحاب التعليقات المسيئة",
              available: true
            }
          ]
        };

      case "tribe_leader":
        return {
          icon: "🥇",
          title: "قائد القبيلة",
          description: "صلاحيات مقاتل النخبة + النشر المباشر وإدارة المحتوى",
          permissions: [
            ...basePermissions,
            {
              icon: <Upload className="h-4 w-4" />,
              title: "رفع ونشر مباشر",
              description: "رفع مانجا أو فصل بدون الحاجة لموافقة",
              available: true
            },
            {
              icon: <Edit3 className="h-4 w-4" />,
              title: "تعديل المحتوى",
              description: "تعديل أو حذف المانجا والفصول",
              available: true
            },
            {
              icon: <MessageSquare className="h-4 w-4" />,
              title: "إدارة التعليقات",
              description: "تعديل وحذف أي تعليق",
              available: true
            },
            {
              icon: <Ban className="h-4 w-4" />,
              title: "ح��ر المستخدمين",
              description: "حظر المستخدمين المسيئين",
              available: true
            }
          ]
        };

      case "admin":
        return {
          icon: "🛡️",
          title: "مدير",
          description: "صلاحيات قائد القبيلة + إدارة شاملة للمستخدمين",
          permissions: [
            ...basePermissions,
            {
              icon: <Upload className="h-4 w-4" />,
              title: "رفع ونشر مباشر",
              description: "رفع وإدارة أي محتوى",
              available: true
            },
            {
              icon: <Users className="h-4 w-4" />,
              title: "إدارة المستخدمين",
              description: "عرض وإدارة جميع المستخدمين",
              available: true
            },
            {
              icon: <UserX className="h-4 w-4" />,
              title: "حذف الحسابات",
              description: "حذف أو حظر أي مستخدم",
              available: true
            },
            {
              icon: <Edit3 className="h-4 w-4" />,
              title: "تغيير الرتب",
              description: "تغيي�� رتب المستخدمين (user ← beginner_fighter)",
              available: true
            },
            {
              icon: <Bell className="h-4 w-4" />,
              title: "إشعارات إدارية",
              description: "استقبال إشعارات الرفع والبلاغات",
              available: true
            }
          ]
        };

      case "site_admin":
        return {
          icon: "👑",
          title: "مدير الموقع",
          description: "جميع الصلاحيات + إدارة إعدادات الموقع والمديرين",
          permissions: [
            ...basePermissions,
            {
              icon: <Upload className="h-4 w-4" />,
              title: "إدارة المحتوى الكاملة",
              description: "رفع وإدارة وحذف أي محتوى",
              available: true
            },
            {
              icon: <Users className="h-4 w-4" />,
              title: "إدارة شاملة للمستخدمين",
              description: "كامل الصلاحيات على جميع المستخدمين",
              available: true
            },
            {
              icon: <Settings className="h-4 w-4" />,
              title: "إعدادات الموقع",
              description: "إدارة إعدادات الموقع بالكامل",
              available: true
            },
            {
              icon: <Shield className="h-4 w-4" />,
              title: "إدارة المديرين",
              description: "التحكم في صلاحيات المديرين الآخرين",
              available: true
            },
            {
              icon: <Bell className="h-4 w-4" />,
              title: "جميع الإشعارات",
              description: "استقبال كل أنواع الإشعارات",
              available: true
            }
          ]
        };

      default:
        return getRolePermissions("user");
    }
  };

  const roleData = getRolePermissions(currentRole);

  return (
    <div className={className}>
      {/* إشعار تغيير الرتبة */}
      {isRoleChanged && (
        <Card className="mb-4 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
              <span className="font-medium">تم تحديث رتبتك...</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className={`transition-all duration-500 ${isRoleChanged ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <span className="text-2xl">{roleData.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span>صلاحياتك الحالية</span>
              <Badge className={getRoleColor(currentRole)} variant="secondary">
                {roleData.title}
              </Badge>
            </div>
          </div>
        </CardTitle>
        <CardDescription>
          {roleData.description}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {roleData.permissions.map((permission, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  permission.available
                    ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
                    : 'bg-gray-50 border-gray-200 dark:bg-gray-950/30 dark:border-gray-700'
                }`}
              >
                <div className={`flex-shrink-0 ${
                  permission.available ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {permission.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-medium ${
                    permission.available ? 'text-green-900 dark:text-green-100' : 'text-gray-500'
                  }`}>
                    {permission.title}
                  </h4>
                  <p className={`text-xs ${
                    permission.available
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-gray-400'
                  }`}>
                    {permission.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ملاحظات حسب الرتبة */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              ملاحظات مهمة
            </h4>
            <div className="text-xs text-muted-foreground space-y-1">
              {currentRole === "beginner_fighter" && (
                <p>• يتطلب محتواك موافقة مدير الموقع قبل النشر</p>
              )}
              {(currentRole === "elite_fighter" || currentRole === "tribe_leader") && (
                <p>• يمكنك حظر المستخدمين مؤقتاً فقط، الحظر الدائم يتطلب صلاحيات أعلى</p>
              )}
              {currentRole === "admin" && (
                <p>• لا يمكنك تغيير رتبة مستخدم إلى admin أو site_admin</p>
              )}
              {currentRole === "site_admin" && (
                <p>• تملك جميع الصلاحيات، استخدمها بحكمة</p>
              )}
              <p>• جميع الأعمال الإدارية مسجلة ومراقبة</p>
            </div>
          </div>

          {/* ترقية الرتبة */}
          {currentRole !== "site_admin" && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <Star className="h-4 w-4" />
                الترقية للرتبة التالية
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {currentRole === "user" && "كن نشطاً في المجتمع لتصبح مقاتل مبتدئ"}
                {currentRole === "beginner_fighter" && "ساهم بمحتوى جيد واكسب ثقة المديرين"}
                {currentRole === "elite_fighter" && "أظهر قيادة ومساعدة في إدارة المجتمع"}
                {currentRole === "tribe_leader" && "تواصل مع إدارة الموقع للترشح لمنصب إداري"}
                {currentRole === "admin" && "يتطلب ترشيح من مدير الموقع"}
              </p>
            </div>
          )}

          {/* أزرار الإجراءات للإدارة */}
          {currentRole !== "user" && (
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-sm mb-3 text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                الإجراءات المتاحة لك
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* رفع المحتوى */}
                {(currentRole === "beginner_fighter" || currentRole === "elite_fighter" || currentRole === "tribe_leader" || currentRole === "admin" || currentRole === "site_admin") && (
                  <>
                    <Link to="/admin?tab=content">
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Plus className="h-4 w-4 mr-2" />
                        إضافة مانجا جديدة
                      </Button>
                    </Link>
                    <Link to="/admin?tab=content">
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <FileText className="h-4 w-4 mr-2" />
                        إضافة فصل جديد
                      </Button>
                    </Link>
                  </>
                )}

                {/* إدارة التعليقات */}
                {(currentRole === "elite_fighter" || currentRole === "tribe_leader" || currentRole === "admin" || currentRole === "site_admin") && (
                  <Link to="/admin?tab=reports">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      إدارة التعليقات
                    </Button>
                  </Link>
                )}

                {/* إدارة المستخدمين */}
                {(currentRole === "admin" || currentRole === "site_admin") && (
                  <Link to="/admin?tab=users">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      إدارة المستخدمين
                    </Button>
                  </Link>
                )}

                {/* الإبلاغات */}
                {(currentRole === "elite_fighter" || currentRole === "tribe_leader" || currentRole === "admin" || currentRole === "site_admin") && (
                  <Link to="/admin?tab=reports">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Flag className="h-4 w-4 mr-2" />
                      مراجعة البلاغات
                    </Button>
                  </Link>
                )}

                {/* إعدادات الموقع */}
                {currentRole === "site_admin" && (
                  <Link to="/admin?tab=seo">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Settings className="h-4 w-4 mr-2" />
                      إعدادات الموقع
                    </Button>
                  </Link>
                )}

                {/* لوحة الإدارة الكاملة */}
                <Link to="/admin" className="md:col-span-2">
                  <Button className="w-full">
                    <Globe className="h-4 w-4 mr-2" />
                    الانتقال للوحة الإدارة الكاملة
                  </Button>
                </Link>
              </div>

              <div className="mt-3 text-xs text-blue-700 dark:text-blue-300 text-center">
                💡 جميع أعمالك الإدارية مسجلة ومراقبة للأمان
              </div>
            </div>
          )}
        </div>
      </CardContent>
      </Card>
    </div>
  );
};

export default UserPermissions;
