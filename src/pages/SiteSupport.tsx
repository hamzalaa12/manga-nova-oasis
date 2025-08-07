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
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Watch Ads Card */}
          <Card className="relative overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-all">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-sm">
              مجاني
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-right">
                <Play className="h-6 w-6 text-primary" />
                مشاهدة الإعلانات
              </CardTitle>
              <CardDescription className="text-right">
                ادعم الموقع مجاناً من خلال مشاهدة إعلانات قصيرة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted rounded-lg p-4">
                  <h4 className="font-semibold mb-2 text-right">فوائد مشاهدة الإعلانات:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground text-right">
                    <li className="flex items-center gap-2 justify-end">
                      <span>دعم تطوير الموقع وإضافة محتوى جديد</span>
                      <Star className="h-4 w-4 text-yellow-500" />
                    </li>
                    <li className="flex items-center gap-2 justify-end">
                      <span>تحسين سرعة وأداء الموقع</span>
                      <Star className="h-4 w-4 text-yellow-500" />
                    </li>
                    <li className="flex items-center gap-2 justify-end">
                      <span>إضافة مانجا ومانهوا جديدة</span>
                      <Star className="h-4 w-4 text-yellow-500" />
                    </li>
                  </ul>
                </div>
                
                <Button 
                  onClick={handleWatchAd}
                  className="w-full text-lg py-6"
                  disabled={isAdVisible}
                >
                  <Play className="h-5 w-5 ml-2" />
                  مشاهدة إعلان داعم
                </Button>
              </div>
            </CardContent>
          </Card>

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

      {/* Ad Modal */}
      {isAdVisible && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
          <div className="bg-background rounded-lg p-6 max-w-2xl w-full mx-4 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={closeAd}
              disabled={!adWatched}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">إعلان داعم للموقع</h3>
              
              {/* Ad Content Placeholder */}
              <div className="bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg p-8 mb-4 min-h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-pulse">
                    <div className="w-24 h-24 bg-primary/30 rounded-full mx-auto mb-4"></div>
                    <div className="h-4 bg-primary/30 rounded w-3/4 mx-auto mb-2"></div>
                    <div className="h-4 bg-primary/30 rounded w-1/2 mx-auto"></div>
                  </div>
                  
                  {!adWatched && (
                    <div className="mt-6">
                      <p className="text-sm text-muted-foreground">
                        جاري تحميل الإعلان...
                      </p>
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-1000"
                          style={{
                            width: adWatched ? '100%' : '0%',
                            animation: 'progress 5s linear forwards'
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {adWatched && (
                    <div className="mt-6">
                      <p className="text-green-600 font-semibold">
                        ✓ تم إكمال الإعلان - شكراً لد��مك!
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                {adWatched 
                  ? "يمكنك الآن إغلاق الإعلان" 
                  : "يرجى انتظار انتهاء الإعلان لدعم الموقع"
                }
              </p>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default SiteSupport;
