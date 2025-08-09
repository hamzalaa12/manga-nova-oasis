import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Link2, Gift, Heart } from "lucide-react";
import SEO from "@/components/SEO";

const Ads = () => {
  const handleViewAd = () => {
    // يمكن إضافة منطق مشاهدة الإعلان هنا لاحقاً
    window.open('https://example.com/ad', '_blank');
  };

  const handleViewLink = () => {
    // يمكن إضافة منطق مشاهدة الرابط هنا لاحقاً
    window.open('https://ouo.io/Nv5QRq', '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="مشاهدة الإعلانات - مانجا لو"
        description="ادعم الموقع من خلال مشاهدة الإعلانات والروابط"
        keywords="إعلانات، دعم الموقع، روابط"
      />
      
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        {/* رسالة الشكر */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-4 rounded-full">
              <Heart className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            شكراً لدعمك الموقع
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            مساهمتك تساعدنا في تقديم محتوى أفضل وتطوير الموقع باستمرار. 
            اختر إحدى الطرق أدناه لدعم الموقع والحصول على المكافآت
          </p>
        </div>

        {/* البطاقتان الرئيسيتان */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {/* بطاقة مشاهدة إعلان */}
          <Card className="group hover:shadow-2xl transition-all duration-500 border-2 border-green-200 hover:border-green-400 hover:scale-105 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto w-20 h-20 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Gift className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-2xl text-green-700 mb-3">مشاهدة إعلان</CardTitle>
              <CardDescription className="text-base text-green-600">
                شاهد الإعلانات واحصل على نقاط مجانية ومكافآت رائعة
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="bg-white/70 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-700 font-medium mb-2">المكافآت المتاحة:</p>
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <Gift className="h-4 w-4" />
                  <span>نقاط مجانية • مكافآت خاصة • محتوى حصري</span>
                </div>
              </div>
              <Button
                onClick={handleViewAd}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 text-lg group-hover:scale-105 transition-transform duration-300"
                size="lg"
              >
                <Gift className="h-5 w-5 mr-2" />
                مشاهدة إعلان الآن
              </Button>
            </CardContent>
          </Card>

          {/* بطا��ة مشاهدة رابط */}
          <Card className="group hover:shadow-2xl transition-all duration-500 border-2 border-blue-200 hover:border-blue-400 hover:scale-105 bg-gradient-to-br from-blue-50 to-sky-50">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-400 to-sky-500 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Link2 className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-2xl text-blue-700 mb-3">مشاهدة رابط</CardTitle>
              <CardDescription className="text-base text-blue-600">
                زيارة الروابط المفيدة والمواقع الشريكة لدعم الموقع
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="bg-white/70 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-700 font-medium mb-2">ماذا ستجد:</p>
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <ExternalLink className="h-4 w-4" />
                  <span>مواقع مفيدة • محتوى إضافي • خدمات مميزة</span>
                </div>
              </div>
              <Button
                onClick={handleViewLink}
                className="w-full bg-gradient-to-r from-blue-500 to-sky-600 hover:from-blue-600 hover:to-sky-700 text-white font-semibold py-3 text-lg group-hover:scale-105 transition-transform duration-300"
                size="lg"
              >
                <Link2 className="h-5 w-5 mr-2" />
                زيارة رابط الآن
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* رسالة شكر إضافية */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-8 max-w-3xl mx-auto">
            <div className="flex justify-center mb-4">
              <Heart className="h-8 w-8 text-rose-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              💝 نقدر دعمكم المستمر
            </h3>
            <p className="text-gray-600 text-lg leading-relaxed">
              كل مشاهدة ونقرة منكم تساعدنا في الاستمرار وتقديم أفضل محتوى مانجا باللغة العربية. 
              شكراً لكونكم جزءاً من عائلة مانجا لو ❤️
            </p>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Ads;
