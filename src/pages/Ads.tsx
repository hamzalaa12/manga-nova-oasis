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
        description="ادعم الموقع من خلال مشاهدة ��لإعلانات واحصل على نقاط مجانية"
        keywords="إعلانات، دعم الموقع، نقاط مجانية، مانجا"
      />
      
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">مشاهدة الإعلانات</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            ادعم الموقع من خلال مشاهدة الإعلانات. احصل على نقاط مجانية واستمتع بمحتوى إضافي!
          </p>
        </div>

        {!ads || ads.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📢</div>
            <h2 className="text-xl font-semibold mb-2">لا توجد إعلانات متاحة حالياً</h2>
            <p className="text-muted-foreground">تحقق مرة أخرى لاحقاً للحصول على إعلانات جديدة</p>
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
