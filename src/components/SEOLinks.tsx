import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen, Grid, Star } from "lucide-react";

interface SEOLinksProps {
  type: 'manga' | 'chapter' | 'home';
  data?: any;
}

const SEOLinks = ({ type, data }: SEOLinksProps) => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  if (type === 'home') {
    return (
      <div className="space-y-6">
        {/* روابط الأنواع الرئيسية */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Grid className="h-5 w-5" />
              تصفح حسب النوع
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to="/type/manga" className="block">
                <Button variant="outline" className="w-full h-auto p-4 flex flex-col gap-2">
                  <BookOpen className="h-6 w-6" />
                  <span className="font-medium">مانجا</span>
                  <span className="text-xs text-muted-foreground">القصص المصورة اليابانية</span>
                </Button>
              </Link>
              <Link to="/type/manhwa" className="block">
                <Button variant="outline" className="w-full h-auto p-4 flex flex-col gap-2">
                  <BookOpen className="h-6 w-6" />
                  <span className="font-medium">مانهوا</span>
                  <span className="text-xs text-muted-foreground">القصص المصورة الكورية</span>
                </Button>
              </Link>
              <Link to="/type/manhua" className="block">
                <Button variant="outline" className="w-full h-auto p-4 flex flex-col gap-2">
                  <BookOpen className="h-6 w-6" />
                  <span className="font-medium">مانها</span>
                  <span className="text-xs text-muted-foreground">القصص المصورة الصينية</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* روابط التصنيفات الشائعة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              التصنيفات الشائعة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {['أكشن', 'مغامرة', 'كوميديا', 'دراما', 'خيال', 'رومانسي', 'إثارة', 'رعب'].map(genre => (
                <Link key={genre} to={`/genre/${encodeURIComponent(genre)}`}>
                  <Badge variant="secondary" className="hover:bg-primary hover:text-primary-foreground transition-colors">
                    {genre}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type === 'manga' && data) {
    return (
      <div className="space-y-4">
        {/* روابط التصنيفات للمانجا */}
        {data.genre && data.genre.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">تصنيفات مشابهة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {data.genre.slice(0, 6).map((genre: string) => (
                  <Link key={genre} to={`/genre/${encodeURIComponent(genre)}`}>
                    <Badge variant="outline" className="hover:bg-primary hover:text-primary-foreground transition-colors">
                      {genre}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* روابط للنوع نفسه */}
        {data.manga_type && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">المزيد من نفس النوع</CardTitle>
            </CardHeader>
            <CardContent>
              <Link to={`/type/${data.manga_type}`}>
                <Button variant="outline" className="w-full">
                  <ArrowRight className="h-4 w-4 ml-2" />
                  تصفح المزيد من {data.manga_type === 'manga' ? 'المانجا' : data.manga_type === 'manhwa' ? 'المانهوا' : 'المانها'}
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* رابط للعودة للرئيسية */}
        <Card>
          <CardContent className="pt-6">
            <Link to="/">
              <Button variant="ghost" className="w-full">
                <ArrowRight className="h-4 w-4 ml-2" />
                العودة للصفحة الرئيسية
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type === 'chapter' && data) {
    return (
      <div className="space-y-4">
        {/* رابط لصفحة المانجا */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{data.manga?.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to={`/manga/${data.manga?.slug}`}>
              <Button variant="outline" className="w-full">
                <BookOpen className="h-4 w-4 ml-2" />
                عرض جميع فصول {data.manga?.title}
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* روابط التصنيفات */}
        {data.manga?.genre && data.manga.genre.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-2">
                {data.manga.genre.slice(0, 4).map((genre: string) => (
                  <Link key={genre} to={`/genre/${encodeURIComponent(genre)}`}>
                    <Badge variant="secondary">{genre}</Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* رابط للنوع */}
        {data.manga?.manga_type && (
          <Card>
            <CardContent className="pt-6">
              <Link to={`/type/${data.manga.manga_type}`}>
                <Button variant="ghost" size="sm" className="w-full">
                  <ArrowRight className="h-4 w-4 ml-2" />
                  المزيد من {data.manga.manga_type === 'manga' ? 'المانجا' : data.manga.manga_type === 'manhwa' ? 'المانهوا' : 'المانها'}
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* رابط للعودة للرئيسية */}
        <Card>
          <CardContent className="pt-6">
            <Link to="/">
              <Button variant="ghost" size="sm" className="w-full">
                <ArrowRight className="h-4 w-4 ml-2" />
                الصفحة الرئيسية
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default SEOLinks;
