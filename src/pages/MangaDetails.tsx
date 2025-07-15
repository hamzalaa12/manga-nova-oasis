import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, Calendar, Eye, User, Bookmark, Play, Edit, Trash2, Lock, DollarSign, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
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
  is_premium: boolean;
  is_private: boolean;
  price: number;
}

const MangaDetails = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, userProfile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [manga, setManga] = useState<Manga | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchMangaDetails();
      fetchChapters();
    }
  }, [id]);

  const fetchMangaDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('manga')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      setManga(data);

      // Track view using the new system
    fetchChapters(data.id);
await trackMangaView(data.id);
    } catch (error) {
      console.error('Error fetching manga details:', error);
    }
  };

  const trackMangaView = async (mangaId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if user is logged in
      if (sessionData.session?.access_token) {
        headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
      }

      await supabase.functions.invoke('track-view', {
        body: { 
          mangaId: mangaId,
          type: 'manga'
        },
        headers
      });
    } catch (error) {
      console.error('Error tracking view:', error);
      // Don't fail the page load if view tracking fails
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

  const handleDeleteChapter = async (chapterId: string, chapterNumber: number) => {
    try {
      const { error } = await supabase
        .from('chapters')
        .delete()
        .eq('id', chapterId);

      if (error) throw error;

      toast({
        title: 'تم الحذف!',
        description: `تم حذف الفصل ${chapterNumber} بنجاح`,
      });

      // Refresh chapters list
      fetchChapters();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: 'فشل في حذف الفصل',
        variant: 'destructive',
      });
    }
  };

  const handleTogglePremium = async (chapterId: string, isPremium: boolean) => {
    try {
      const { error } = await supabase
        .from('chapters')
        .update({ is_premium: !isPremium })
        .eq('id', chapterId);

      if (error) throw error;

      toast({
        title: 'تم التحديث!',
        description: isPremium ? 'تم جعل الفصل مجاني' : 'تم جعل الفصل مدفوع',
      });

      fetchChapters();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث حالة الفصل',
        variant: 'destructive',
      });
    }
  };

  const handleTogglePrivate = async (chapterId: string, isPrivate: boolean) => {
    try {
      const { error } = await supabase
        .from('chapters')
        .update({ is_private: !isPrivate })
        .eq('id', chapterId);

      if (error) throw error;

      toast({
        title: 'تم التحديث!',
        description: isPrivate ? 'تم نشر الفصل' : 'تم جعل الفصل خاص',
      });

      fetchChapters();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث حالة الفصل',
        variant: 'destructive',
      });
    }
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
                      <div key={chapter.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <Link to={`/read/${chapter.id}`} className="flex-1">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium">
                                  الفصل {chapter.chapter_number}
                                  {chapter.title && `: ${chapter.title}`}
                                </h3>
                                {chapter.is_premium && (
                                  <Badge variant="secondary" className="text-xs">
                                    <DollarSign className="h-3 w-3 ml-1" />
                                    مدفوع
                                  </Badge>
                                )}
                                {chapter.is_private && (
                                  <Badge variant="outline" className="text-xs">
                                    <Lock className="h-3 w-3 ml-1" />
                                    خاص
                                  </Badge>
                                )}
                              </div>
                              {chapter.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {chapter.description}
                                </p>
                              )}
                            </div>
                          </Link>
                          
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-muted-foreground text-left">
                              <div className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {chapter.views_count || 0}
                              </div>
                              <div>{formatDate(chapter.created_at)}</div>
                            </div>
                            
                            {isAdmin && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleTogglePremium(chapter.id, chapter.is_premium)}>
                                    <DollarSign className="h-4 w-4 ml-2" />
                                    {chapter.is_premium ? 'جعله مجاني' : 'جعله مدفوع'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleTogglePrivate(chapter.id, chapter.is_private)}>
                                    <Lock className="h-4 w-4 ml-2" />
                                    {chapter.is_private ? 'نشر الفصل' : 'جعله خاص'}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <Trash2 className="h-4 w-4 ml-2" />
                                        حذف الفصل
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          هل أنت متأكد من حذف الفصل {chapter.chapter_number}؟ 
                                          هذا الإجراء لا يمكن التراجع عنه.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => handleDeleteChapter(chapter.id, chapter.chapter_number)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          حذف
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      </div>
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
