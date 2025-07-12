import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, Calendar, Eye, User, Bookmark, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface Manga {
  id: string;
  title: string;
  description: string;
  cover_image_url: string;
  manga_type: string;
  status: string;
  genre: string[];
  author: string;
  artist: string;
  release_year: number;
  rating: number;
  views_count: number;
  created_at: string;
}

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  description: string;
  views_count: number;
  created_at: string;
}

const MangaDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [manga, setManga] = useState<Manga | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchMangaDetails();
      fetchChapters();
    }
  }, [id]);

  const fetchMangaDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('manga')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setManga(data);

      // Update views count
      await supabase
        .from('manga')
        .update({ views_count: (data.views_count || 0) + 1 })
        .eq('id', id);
    } catch (error) {
      console.error('Error fetching manga details:', error);
    }
  };

  const fetchChapters = async () => {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('manga_id', id)
        .order('chapter_number', { ascending: true });

      if (error) throw error;
      setChapters(data || []);
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInArabic = (status: string) => {
    switch (status) {
      case 'ongoing': return 'مستمر';
      case 'completed': return 'مكتمل';
      case 'hiatus': return 'متوقف مؤقتاً';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  const getTypeInArabic = (type: string) => {
    switch (type) {
      case 'manga': return 'مانجا';
      case 'manhwa': return 'مانهوا';
      case 'manhua': return 'مانها';
      default: return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">جاري التحميل...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!manga) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">المانجا غير موجودة</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link to="/" className="inline-flex items-center gap-2 text-primary hover:text-primary-glow transition-colors mb-6">
          <ArrowRight className="h-4 w-4" />
          العودة للرئيسية
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Manga Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <img
                    src={manga.cover_image_url || '/placeholder.svg'}
                    alt={manga.title}
                    className="w-full h-80 object-cover rounded-lg mb-4"
                  />
                  <h1 className="text-2xl font-bold mb-2">{manga.title}</h1>
                  
                  <div className="flex flex-wrap gap-2 justify-center mb-4">
                    <Badge variant="secondary">{getTypeInArabic(manga.manga_type)}</Badge>
                    <Badge variant={manga.status === 'ongoing' ? 'default' : 'outline'}>
                      {getStatusInArabic(manga.status)}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    {manga.author && (
                      <div className="flex items-center justify-center gap-2">
                        <User className="h-4 w-4" />
                        المؤلف: {manga.author}
                      </div>
                    )}
                    {manga.artist && manga.artist !== manga.author && (
                      <div className="flex items-center justify-center gap-2">
                        <User className="h-4 w-4" />
                        الرسام: {manga.artist}
                      </div>
                    )}
                    {manga.release_year && (
                      <div className="flex items-center justify-center gap-2">
                        <Calendar className="h-4 w-4" />
                        سنة الإصدار: {manga.release_year}
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-2">
                      <Eye className="h-4 w-4" />
                      المشاهدات: {manga.views_count?.toLocaleString() || 0}
                    </div>
                  </div>

                  {manga.genre && manga.genre.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">التصنيفات:</p>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {manga.genre.map((genre, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {genre}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button className="w-full mt-4">
                    <Bookmark className="h-4 w-4 ml-2" />
                    إضافة للمفضلة
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {manga.description && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold mb-4">القصة</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {manga.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Chapters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">الفصول ({chapters.length})</h2>
                  {chapters.length > 0 && (
                    <Link to={`/read/${chapters[0].id}`}>
                      <Button>
                        <Play className="h-4 w-4 ml-2" />
                        بدء القراءة
                      </Button>
                    </Link>
                  )}
                </div>

                {chapters.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    لا توجد فصول متاحة حالياً
                  </p>
                ) : (
                  <div className="space-y-2">
                    {chapters.map((chapter) => (
                      <Link key={chapter.id} to={`/read/${chapter.id}`}>
                        <div className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">
                                الفصل {chapter.chapter_number}
                                {chapter.title && `: ${chapter.title}`}
                              </h3>
                              {chapter.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {chapter.description}
                                </p>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground text-left">
                              <div className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {chapter.views_count || 0}
                              </div>
                              <div>{formatDate(chapter.created_at)}</div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MangaDetails;