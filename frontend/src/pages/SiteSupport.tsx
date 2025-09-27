import { Heart, ArrowRight, Gift, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import Header from "@/components/Header";

const SiteSupport = () => {

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <Heart className="h-16 w-16 text-red-500" />
          </div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            ادعم موقع مانجا لو
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            ساعدنا في الحفاظ على الموقع وتطويره من خلال التبرع
          </p>
        </div>

        {/* Support Options */}
        <div className="flex justify-center max-w-2xl mx-auto">
          {/* Donation Card */}
          <Card className="relative overflow-hidden border-2 border-secondary/20 hover:border-secondary/40 transition-all">
            <div className="absolute top-0 right-0 bg-secondary text-secondary-foreground px-3 py-1 text-sm">
              تبرع
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-right">
                <Gift className="h-6 w-6 text-secondary" />
                التبرع المباشر
              </CardTitle>
              <CardDescription className="text-right">
                ادعم الموقع بشكل مباشر من خلال التبرع المالي
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted rounded-lg p-4">
                  <h4 className="font-semibold mb-2 text-right">مزايا المتبرعين:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground text-right">
                    <li className="flex items-center gap-2 justify-end">
                      <span>تجربة خالية من الإعلانات</span>
                      <Star className="h-4 w-4 text-yellow-500" />
                    </li>
                    <li className="flex items-center gap-2 justify-end">
                      <span>وصول مبكر للمحتوى الجديد</span>
                      <Star className="h-4 w-4 text-yellow-500" />
                    </li>
                    <li className="flex items-center gap-2 justify-end">
                      <span>شارة مميزة للمت��رعين</span>
                      <Star className="h-4 w-4 text-yellow-500" />
                    </li>
                  </ul>
                </div>
                
                <Button 
                  variant="secondary"
                  className="w-full text-lg py-6"
                  disabled
                >
                  <Gift className="h-5 w-5 ml-2" />
                  قريباً - التبرع المباشر
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistics Section */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-8">تأثير دعمكم</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="bg-primary/10 rounded-lg p-6">
              <div className="text-3xl font-bold text-primary mb-2">500+</div>
              <div className="text-sm text-muted-foreground">مانجا متاحة</div>
            </div>
            <div className="bg-secondary/10 rounded-lg p-6">
              <div className="text-3xl font-bold text-secondary mb-2">10K+</div>
              <div className="text-sm text-muted-foreground">فصل منشور</div>
            </div>
            <div className="bg-accent/10 rounded-lg p-6">
              <div className="text-3xl font-bold text-accent-foreground mb-2">50K+</div>
              <div className="text-sm text-muted-foreground">مستخدم نشط</div>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-12">
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowRight className="h-4 w-4" />
              العودة للصفحة الرئيسية
            </Button>
          </Link>
        </div>
      </div>

    </div>
  );
};

export default SiteSupport;
