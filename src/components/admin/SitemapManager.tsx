import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Globe, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  ExternalLink,
  MapPin,
  Clock
} from 'lucide-react';
import { useSitemap } from '@/hooks/useSitemap';
import { useToast } from '@/hooks/use-toast';

const SitemapManager = () => {
  const { generateSitemap, isGenerating } = useSitemap();
  const { toast } = useToast();
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [sitemapContent, setSitemapContent] = useState<string | null>(null);

  const handleGenerateSitemap = async () => {
    try {
      const content = await generateSitemap();
      if (content) {
        setSitemapContent(content);
        setLastGenerated(new Date().toLocaleString('ar'));
        
        // إنشاء ملف للتنزيل
        const blob = new Blob([content], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sitemap.xml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error generating sitemap:', error);
    }
  };

  const openCurrentSitemap = () => {
    window.open('/sitemap.xml', '_blank');
  };

  const openRobotsTxt = () => {
    window.open('/robots.txt', '_blank');
  };

  const urlCount = sitemapContent ? 
    (sitemapContent.match(/<url>/g) || []).length : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            إدارة خريطة الموقع (Sitemap)
          </CardTitle>
          <CardDescription>
            إدارة ملفات SEO المهمة لفهرسة الموقع في محركات البحث
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* معلومات الحالة الحالية */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">خريطة الموقع الحالية</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={openCurrentSitemap}
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  عرض sitemap.xml
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">ملف Robots</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={openRobotsTxt}
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  عرض robots.txt
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">آخر تحديث</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {lastGenerated || 'لم يتم إنشاء خريطة بعد'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* إنشاء خريطة موقع جديدة */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">إنشاء خريطة موقع محدثة</CardTitle>
              <CardDescription>
                إنشاء ملف sitemap.xml يحتوي على جميع صفحات المانجا والفصول الحديثة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleGenerateSitemap}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    إنشاء وتنزيل Sitemap
                  </>
                )}
              </Button>

              {sitemapContent && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    تم إنشاء خريطة الموقع بنجاح! تحتوي على {urlCount} رابط.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* إرشادات SEO */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">نصائح تحسين محركات البحث</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">ملفات SEO المطلوبة:</h4>
                  <div className="space-y-1">
                    <Badge variant="outline" className="text-xs">✅ robots.txt</Badge>
                    <Badge variant="outline" className="text-xs">✅ sitemap.xml</Badge>
                    <Badge variant="outline" className="text-xs">✅ Meta Tags</Badge>
                    <Badge variant="outline" className="text-xs">✅ Structured Data</Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">صفحات محسنة للفهرسة:</h4>
                  <div className="space-y-1">
                    <Badge variant="secondary" className="text-xs">🏠 الصفحة الرئيسية</Badge>
                    <Badge variant="secondary" className="text-xs">📚 صفحات المانجا</Badge>
                    <Badge variant="secondary" className="text-xs">📖 صفحات الفصول</Badge>
                    <Badge variant="secondary" className="text-xs">🏷️ صفحات التصنيفات</Badge>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  <strong>نصيحة:</strong> قم بإعادة إنشاء خريطة الموقع بانتظام (أسبوعياً) للتأكد من تضمين المحتوى الجديد.
                  يمكنك أيضاً إرسال الخريطة لـ Google Search Console لتسريع الفهرسة.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default SitemapManager;
