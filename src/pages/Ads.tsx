import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Clock, Eye, Gift, Plus, Link2 } from "lucide-react";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Ad {
  id: string;
  title: string;
  description: string;
  url: string;
  image_url?: string;
  reward_points?: number;
  duration_seconds?: number;
  is_active: boolean;
  click_count: number;
  created_at: string;
  type?: 'link' | 'ad';
}

interface QuickLinkFormData {
  title: string;
  url: string;
  description: string;
}

interface QuickAdFormData {
  title: string;
  url: string;
  description: string;
  image_url: string;
  reward_points: number;
  duration_seconds: number;
}

const fetchActiveAds = async (): Promise<Ad[]> => {
  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

const Ads = () => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [canClose, setCanClose] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isAdDialogOpen, setIsAdDialogOpen] = useState(false);
  const [linkFormData, setLinkFormData] = useState<QuickLinkFormData>({
    title: '',
    url: '',
    description: '',
  });
  const [adFormData, setAdFormData] = useState<QuickAdFormData>({
    title: '',
    url: '',
    description: '',
    image_url: '',
    reward_points: 5,
    duration_seconds: 0,
  });

  const { data: ads, isLoading, error } = useQuery({
    queryKey: ['active-ads'],
    queryFn: fetchActiveAds,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Countdown timer for ads with duration
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && selectedAd?.duration_seconds) {
      setCanClose(true);
    }
  }, [countdown, selectedAd]);

  const handleAdClick = async (ad: Ad) => {
    try {
      // Update click count
      await supabase
        .from('ads')
        .update({ click_count: ad.click_count + 1 })
        .eq('id', ad.id);

      // If ad has duration, show countdown
      if (ad.duration_seconds && ad.duration_seconds > 0) {
        setSelectedAd(ad);
        setCountdown(ad.duration_seconds);
        setCanClose(false);
      } else {
        // Open link directly
        window.open(ad.url, '_blank');
        
        toast({
          title: "شكراً لك!",
          description: ad.reward_points ? `تم إضافة ${ad.reward_points} نقطة لحسابك` : "شكراً لدعم الموقع",
        });
      }
    } catch (error) {
      console.error('Error handling ad click:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء معالجة الإعلان",
        variant: "destructive",
      });
    }
  };

  const handleCloseAd = () => {
    if (selectedAd) {
      window.open(selectedAd.url, '_blank');

      toast({
        title: "شكراً لك!",
        description: selectedAd.reward_points ? `تم إضافة ${selectedAd.reward_points} نقطة لحسابك` : "شكراً لدعم الموقع",
      });
    }

    setSelectedAd(null);
    setCountdown(0);
    setCanClose(false);
  };

  const handleAddLink = async () => {
    if (!linkFormData.title || !linkFormData.url) {
      toast({
        title: "خطأ",
        description: "العنوان والرابط مطلوبان",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from('ads').insert([{
        title: linkFormData.title,
        description: linkFormData.description,
        url: linkFormData.url,
        reward_points: 0,
        duration_seconds: 0,
        is_active: true,
        type: 'link'
      }]);

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: "تم إضافة الرابط بنجاح",
      });

      setIsLinkDialogOpen(false);
      setLinkFormData({ title: '', url: '', description: '' });
      // Refresh the data
      window.location.reload();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في إضافة الرابط",
        variant: "destructive",
      });
    }
  };

  const handleAddAd = async () => {
    if (!adFormData.title || !adFormData.url) {
      toast({
        title: "خطأ",
        description: "العنوان والرابط مطلوبان",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from('ads').insert([{
        title: adFormData.title,
        description: adFormData.description,
        url: adFormData.url,
        image_url: adFormData.image_url,
        reward_points: adFormData.reward_points,
        duration_seconds: adFormData.duration_seconds,
        is_active: true,
        type: 'ad'
      }]);

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: "تم إضافة الإعلان بنجاح",
      });

      setIsAdDialogOpen(false);
      setAdFormData({
        title: '',
        url: '',
        description: '',
        image_url: '',
        reward_points: 5,
        duration_seconds: 0,
      });
      // Refresh the data
      window.location.reload();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في إضافة الإعلان",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">جاري تحميل الإعلانات...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">حدث خطأ في تحميل الإعلانات</h2>
            <Button onClick={() => window.location.reload()}>إعادة المحاولة</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Ad viewer overlay
  if (selectedAd) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
        <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{selectedAd.title}</h3>
              {countdown > 0 ? (
                <Badge variant="secondary" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {countdown} ثانية
                </Badge>
              ) : (
                <Button onClick={handleCloseAd} disabled={!canClose}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  زيارة الرابط
                </Button>
              )}
            </div>
            
            {selectedAd.image_url && (
              <img 
                src={selectedAd.image_url} 
                alt={selectedAd.title}
                className="w-full h-64 object-cover rounded-lg mb-4"
              />
            )}
            
            <p className="text-muted-foreground mb-4">{selectedAd.description}</p>
            
            {selectedAd.reward_points && (
              <div className="flex items-center gap-2 text-green-600 mb-4">
                <Gift className="h-4 w-4" />
                <span>احصل على {selectedAd.reward_points} نقطة</span>
              </div>
            )}
            
            {countdown === 0 && (
              <Button onClick={handleCloseAd} className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                زيارة الرابط والحصول على المكافأة
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="مشاهدة الإعلانات - مانجافاس"
        description="ادعم الموقع من خلال مشاهدة ��لإعل��نات واحصل على نقاط مجانية"
        keywords="إعلانات، دعم الموقع، نقاط مجانية، مانجا"
      />
      
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-start mb-8">
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold mb-4">مشاهدة الإعلانات</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              ادعم الموقع من خلال مشاهدة الإعلانات. احصل على نقاط مجانية واستمتع بمحتوى إضافي!
            </p>
          </div>

          {/* أزرار الإدارة في أقصى اليمين */}
          {isAdmin && (
            <div className="flex flex-col gap-3 mr-4">
              <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    إضافة رابط
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>إضافة رابط جديد</DialogTitle>
                    <DialogDescription>
                      أضف رابط سريع للمستخدمين
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="link-title">العنوان</Label>
                      <Input
                        id="link-title"
                        value={linkFormData.title}
                        onChange={(e) => setLinkFormData({...linkFormData, title: e.target.value})}
                        placeholder="عنوان الرابط"
                      />
                    </div>
                    <div>
                      <Label htmlFor="link-url">الرابط</Label>
                      <Input
                        id="link-url"
                        type="url"
                        value={linkFormData.url}
                        onChange={(e) => setLinkFormData({...linkFormData, url: e.target.value})}
                        placeholder="https://example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="link-description">الوصف</Label>
                      <Textarea
                        id="link-description"
                        value={linkFormData.description}
                        onChange={(e) => setLinkFormData({...linkFormData, description: e.target.value})}
                        placeholder="وصف الرابط"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button onClick={handleAddLink}>
                      إضافة الرابط
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isAdDialogOpen} onOpenChange={setIsAdDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    إضافة إعلان
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>إضافة إعلان جديد</DialogTitle>
                    <DialogDescription>
                      أضف إعلان مع صورة ومكافآت
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="ad-title">العنوان</Label>
                      <Input
                        id="ad-title"
                        value={adFormData.title}
                        onChange={(e) => setAdFormData({...adFormData, title: e.target.value})}
                        placeholder="عنوان الإعلان"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ad-url">الرابط</Label>
                      <Input
                        id="ad-url"
                        type="url"
                        value={adFormData.url}
                        onChange={(e) => setAdFormData({...adFormData, url: e.target.value})}
                        placeholder="https://example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ad-description">الوصف</Label>
                      <Textarea
                        id="ad-description"
                        value={adFormData.description}
                        onChange={(e) => setAdFormData({...adFormData, description: e.target.value})}
                        placeholder="وصف الإعلان"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ad-image">رابط الصورة</Label>
                      <Input
                        id="ad-image"
                        type="url"
                        value={adFormData.image_url}
                        onChange={(e) => setAdFormData({...adFormData, image_url: e.target.value})}
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ad-points">نقاط المكافأة</Label>
                        <Input
                          id="ad-points"
                          type="number"
                          min="0"
                          value={adFormData.reward_points}
                          onChange={(e) => setAdFormData({...adFormData, reward_points: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="ad-duration">مدة الانتظار (ثانية)</Label>
                        <Input
                          id="ad-duration"
                          type="number"
                          min="0"
                          value={adFormData.duration_seconds}
                          onChange={(e) => setAdFormData({...adFormData, duration_seconds: parseInt(e.target.value) || 0})}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAdDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button onClick={handleAddAd}>
                      إضافة الإعلان
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* البطاقات الرئيسية */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* بطاقة مشاهدة رابط */}
          <Card className="hover:shadow-lg transition-all duration-300 border-2 border-blue-200 hover:border-blue-400">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Link2 className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl text-blue-700">مشاهدة رابط</CardTitle>
              <CardDescription>
                اضغط هنا لمشاهدة الروابط السريعة والمفيدة
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  const linkAds = ads?.filter(ad => (!ad.image_url && !ad.duration_seconds && ad.reward_points === 0)) || [];
                  if (linkAds.length === 0) {
                    toast({
                      title: "لا توجد روابط",
                      description: "لا توجد روابط متاحة حالياً",
                      variant: "destructive",
                    });
                    return;
                  }
                  // عرض أول رابط متاح
                  const firstLink = linkAds[0];
                  window.open(firstLink.url, '_blank');
                  // تحديث عداد النقرات
                  supabase.from('ads').update({ click_count: firstLink.click_count + 1 }).eq('id', firstLink.id);
                  toast({
                    title: "شكراً لك!",
                    description: "شكراً لدعم الموقع",
                  });
                }}
              >
                <Link2 className="h-4 w-4 mr-2" />
                مشاهدة رابط الآن
              </Button>
            </CardContent>
          </Card>

          {/* بطاقة مشاهدة إعلان */}
          <Card className="hover:shadow-lg transition-all duration-300 border-2 border-green-200 hover:border-green-400">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Gift className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-xl text-green-700">مشاهدة إعلان</CardTitle>
              <CardDescription>
                اضغط هنا لمشاهدة الإعلانات والحصول على نقاط مجانية
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => {
                  const adAds = ads?.filter(ad => (ad.image_url || ad.duration_seconds || (ad.reward_points && ad.reward_points > 0))) || [];
                  if (adAds.length === 0) {
                    toast({
                      title: "لا توجد إعلانات",
                      description: "لا توجد إعلانات متاحة حالياً",
                      variant: "destructive",
                    });
                    return;
                  }
                  // عرض أول إعلان متاح
                  const firstAd = adAds[0];
                  handleAdClick(firstAd);
                }}
              >
                <Gift className="h-4 w-4 mr-2" />
                مشاهدة إعلان الآن
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* جميع الإعلانات والروابط */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-center mb-6">جميع الإعلانات والروابط</h2>
        </div>

        {!ads || ads.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📢</div>
            <h2 className="text-xl font-semibold mb-2">لا توجد إعلانات متاحة حالياً</h2>
            <p className="text-muted-foreground">تحقق مرة أخرى لاحقاً ل��حصول على إعلانات جديدة</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ads.map((ad) => (
              <Card key={ad.id} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  {ad.image_url && (
                    <img 
                      src={ad.image_url} 
                      alt={ad.title}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}
                  <CardTitle className="text-lg">{ad.title}</CardTitle>
                  <CardDescription>{ad.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    {ad.reward_points && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Gift className="h-3 w-3" />
                        {ad.reward_points} نقطة
                      </Badge>
                    )}
                    
                    {ad.duration_seconds && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {ad.duration_seconds}ث
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {ad.click_count} مشاهدة
                    </span>
                  </div>
                  
                  <Button 
                    onClick={() => handleAdClick(ad)} 
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    مشاهدة الإعلان
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
};

export default Ads;
