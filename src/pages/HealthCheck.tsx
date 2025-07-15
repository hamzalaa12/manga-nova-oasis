import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface HealthCheck {
  name: string;
  status: "success" | "error" | "warning" | "loading";
  message: string;
  details?: any;
}

const HealthCheckPage = () => {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(false);

  const runHealthChecks = async () => {
    setLoading(true);
    const newChecks: HealthCheck[] = [];

    // فحص الاتصال بقاعدة البيانات
    try {
      const { error } = await supabase.from("manga").select("id").limit(1);
      if (error) throw error;
      newChecks.push({
        name: "اتصال قاعدة البيانات",
        status: "success",
        message: "الاتصال بقاعدة البيانات يعمل بشكل طبيعي",
      });
    } catch (error: any) {
      newChecks.push({
        name: "اتصال قاعدة البيانات",
        status: "error",
        message: `فشل في الاتصال: ${error.message}`,
        details: error,
      });
    }

    // فحص جدول المانجا
    try {
      const { data, error } = await supabase
        .from("manga")
        .select("id, title, slug")
        .limit(5);

      if (error) throw error;

      newChecks.push({
        name: "جدول المانجا",
        status: "success",
        message: `تم العثور على ${data?.length || 0} مانجا`,
        details: data,
      });

      // فحص وجود حقل slug
      const mangaWithSlugs = data?.filter((manga) => manga.slug) || [];
      if (mangaWithSlugs.length === 0) {
        newChecks.push({
          name: "حقل Slug",
          status: "warning",
          message: "لا توجد مانجا تحتوي على slugs، قد تحتاج لتحديث البيانات",
        });
      } else {
        newChecks.push({
          name: "حقل Slug",
          status: "success",
          message: `${mangaWithSlugs.length} من أصل ${data?.length} مانجا تحتوي على slugs`,
        });
      }
    } catch (error: any) {
      newChecks.push({
        name: "جدول المانجا",
        status: "error",
        message: `خطأ في جلب بيانات المانجا: ${error.message}`,
        details: error,
      });
    }

    // فحص جدول الفصول
    try {
      const { data, error } = await supabase
        .from("chapters")
        .select("id, title, manga_id")
        .limit(5);

      if (error) throw error;

      newChecks.push({
        name: "جدول الفصول",
        status: "success",
        message: `تم العثور على ${data?.length || 0} فصول`,
        details: data,
      });
    } catch (error: any) {
      newChecks.push({
        name: "جدول الفصول",
        status: "error",
        message: `خطأ في جلب بيانات الفصول: ${error.message}`,
        details: error,
      });
    }

    // فحص جدول ال��ستخدمين
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, role")
        .limit(3);

      if (error) throw error;

      newChecks.push({
        name: "جدول المستخدمين",
        status: "success",
        message: `تم العثور على ${data?.length || 0} مستخدمين`,
        details: data,
      });
    } catch (error: any) {
      newChecks.push({
        name: "جدول المستخدمين",
        status: "error",
        message: `خطأ في جلب بيانات المستخدمين: ${error.message}`,
        details: error,
      });
    }

    // فحص الجلسة الحالية
    try {
      const { data: session, error } = await supabase.auth.getSession();
      if (error) throw error;

      newChecks.push({
        name: "المصادقة",
        status: session.session ? "success" : "warning",
        message: session.session
          ? "المستخدم مسجل دخول"
          : "المستخدم غير مسجل دخول",
        details: session,
      });
    } catch (error: any) {
      newChecks.push({
        name: "المصادقة",
        status: "error",
        message: `خطأ في فحص المصادقة: ${error.message}`,
        details: error,
      });
    }

    // فحص الـ environment variables
    const envChecks = [
      { name: "VITE_SUPABASE_URL", value: import.meta.env.VITE_SUPABASE_URL },
      {
        name: "VITE_SUPABASE_ANON_KEY",
        value: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
    ];

    envChecks.forEach((env) => {
      newChecks.push({
        name: `Environment Variable: ${env.name}`,
        status: env.value ? "success" : "error",
        message: env.value ? "متوفر" : "غير متوفر",
      });
    });

    setChecks(newChecks);
    setLoading(false);
  };

  useEffect(() => {
    runHealthChecks();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800">سليم</Badge>;
      case "error":
        return <Badge variant="destructive">خطأ</Badge>;
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-800">تحذير</Badge>;
      default:
        return <Badge variant="outline">فحص...</Badge>;
    }
  };

  const successCount = checks.filter((c) => c.status === "success").length;
  const errorCount = checks.filter((c) => c.status === "error").length;
  const warningCount = checks.filter((c) => c.status === "warning").length;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">فحص صحة الموقع</h1>
              <p className="text-muted-foreground">
                فحص شامل لجميع مكونات الموقع والتأكد من عملها بشكل صحيح
              </p>
            </div>
            <Button
              onClick={runHealthChecks}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              إعادة فحص
            </Button>
          </div>

          {/* ملخص النتائج */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600">
                  ✅ يعمل بشكل طبيعي
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{successCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-yellow-600">
                  ⚠️ تحذيرات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{warningCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600">
                  ❌ أخطاء
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{errorCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* تفاصيل الفحوصات */}
          <div className="space-y-4">
            {checks.map((check, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(check.status)}
                      <div>
                        <h3 className="font-medium">{check.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {check.message}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(check.status)}
                  </div>

                  {check.details && (
                    <details className="mt-3">
                      <summary className="text-sm text-muted-foreground cursor-pointer">
                        عرض التفاصيل
                      </summary>
                      <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto">
                        {JSON.stringify(check.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {checks.length === 0 && !loading && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  لم يتم تشغيل أي فحوصات بعد
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default HealthCheckPage;
