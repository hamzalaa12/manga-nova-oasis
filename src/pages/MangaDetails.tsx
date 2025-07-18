import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Calendar,
  Eye,
  User,
  Bookmark,
  Play,
  Edit,
  Trash2,
  Lock,
  DollarSign,
  MoreHorizontal,
  Settings,
} from "lucide-react";
import { parseMangaIdentifier, getChapterUrl, getMangaSlug } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EditMangaDialog from "@/components/admin/EditMangaDialog";
import { Skeleton } from "@/components/ui/skeleton";
import LoadingSpinner from "@/components/ui/loading-spinner";

interface Manga {
  id: string;
  slug: string;
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
  const navigate = useNavigate();
  const { user, userProfile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [manga, setManga] = useState<Manga | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchMangaDetails();
    }
  }, [slug]);

  const fetchMangaDetails = async () => {
    if (!slug) return;

    try {
      const identifier = parseMangaIdentifier(slug);
      let query = supabase.from("manga").select("*");

      if (identifier.type === "slug") {
        query = query.eq("slug", identifier.value);
      } else {
        query = query.eq("id", identifier.value);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === "PGRST116") {
          // No rows returned
          throw new Error("المانجا غير موجودة");
        }
        throw error;
      }

      if (!data) {
        throw new Error("لم يتم العثور على بيانات المانجا");
      }

      setManga(data);

      // جلب الفصول والتتبع في نفس الوقت
      await Promise.all([
        fetchChaptersForManga(data.id),
        trackMangaView(data.id),
      ]);
    } catch (error: any) {
      console.error("Error fetching manga details:", error.message || error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في تحميل تفاصيل المانجا",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const fetchChaptersForManga = async (mangaId: string) => {
    try {
      const { data, error } = await supabase
        .from("chapters")
        .select("*")
        .eq("manga_id", mangaId)
        .order("chapter_number", { ascending: true });

      if (error) throw error;
      setChapters(data || []);
    } catch (error: any) {
      console.error("Error fetching chapters:", error.message || error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في تحميل الفصول",
        variant: "destructive",
      });
    }
  };

  const trackMangaView = async (mangaId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add authorization header if user is logged in
      if (sessionData.session?.access_token) {
        headers["Authorization"] = `Bearer ${sessionData.session.access_token}`;
      }

      await supabase.functions.invoke("track-view", {
        body: {
          mangaId: mangaId,
          type: "manga",
        },
        headers,
      });
    } catch (error) {
      console.error("Error tracking view:", error);
      // Don't fail the page load if view tracking fails
    }
  };

  const getStatusInArabic = (status: string) => {
    switch (status) {
      case "ongoing":
        return "مستمر";
      case "completed":
        return "مكتمل";
      case "hiatus":
        return "متوقف مؤقتاً";
      case "cancelled":
        return "ملغي";
      default:
        return status;
    }
  };

  const getTypeInArabic = (type: string) => {
    switch (type) {
      case "manga":
        return "مانجا";
      case "manhwa":
        return "مانهوا";
      case "manhua":
        return "مانها";
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-SA");
  };

  const handleDeleteChapter = async (
    chapterId: string,
    chapterNumber: number,
  ) => {
    try {
      const { error } = await supabase
        .from("chapters")
        .delete()
        .eq("id", chapterId);

      if (error) throw error;

      toast({
        title: "تم الحذف!",
        description: `تم حذف الفصل ${chapterNumber} بنجاح`,
      });

      // Refresh chapters list
      if (manga?.id) {
        fetchChaptersForManga(manga.id);
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل في حذف الفصل",
        variant: "destructive",
      });
    }
  };

  const handleTogglePremium = async (chapterId: string, isPremium: boolean) => {
    try {
      const { error } = await supabase
        .from("chapters")
        .update({ is_premium: !isPremium })
        .eq("id", chapterId);

      if (error) throw error;

      toast({
        title: "تم التحديث!",
        description: isPremium ? "تم جعل الفصل مجاني" : "تم جعل الفصل مدفوع",
      });

      if (manga?.id) {
        fetchChaptersForManga(manga.id);
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل في تحديث حالة الفصل",
        variant: "destructive",
      });
    }
  };

  const handleTogglePrivate = async (chapterId: string, isPrivate: boolean) => {
    try {
      const { error } = await supabase
        .from("chapters")
        .update({ is_private: !isPrivate })
        .eq("id", chapterId);

      if (error) throw error;

      toast({
        title: "تم التحديث!",
        description: isPrivate ? "تم نشر الفصل" : "تم جعل الفصل خاص",
      });

      if (manga?.id) {
        fetchChaptersForManga(manga.id);
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل في تحديث حالة الفصل",
        variant: "destructive",
      });
    }
  };

  const handleDeleteManga = async () => {
    if (!manga?.id) return;

    try {
      const { error } = await supabase
        .from("manga")
        .delete()
        .eq("id", manga.id);

      if (error) throw error;

      toast({
        title: "تم الحذف!",
        description: "تم حذف المانجا بنجاح",
      });

      // العودة للصفحة الرئيسية
      navigate("/");
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل في حذف المانجا",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          {/* Back Button Skeleton */}
          <Skeleton className="h-6 w-32 mb-6" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Manga Info Skeleton */}
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <Skeleton className="w-full h-80 rounded-lg" />
                    <Skeleton className="h-8 w-3/4 mx-auto" />
                    <div className="flex gap-2 justify-center">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Content Skeleton */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description Skeleton */}
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-24 mb-4" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </CardContent>
              </Card>

              {/* Chapters Skeleton */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-10 w-24" />
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={index}
                        className="p-4 border border-border rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-4 w-64" />
                          </div>
                          <div className="text-right space-y-1">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-20" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
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
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-primary hover:text-primary-glow transition-colors mb-6"
        >
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
                    src={manga.cover_image_url || "/placeholder.svg"}
                    alt={manga.title}
                    className="w-full h-80 object-cover rounded-lg mb-4"
                  />
                  <h1 className="text-2xl font-bold mb-2">{manga.title}</h1>

                  <div className="flex flex-wrap gap-2 justify-center mb-4">
                    <Badge variant="secondary">
                      {getTypeInArabic(manga.manga_type)}
                    </Badge>
                    <Badge
                      variant={
                        manga.status === "ongoing" ? "default" : "outline"
                      }
                    >
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
                      <p className="text-sm font-medium mb-2">التصن��فات:</p>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {manga.genre.map((genre, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs"
                          >
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

                  {/* أدوات الأدمن */}
                  {isAdmin && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        className="flex-1"
                        size="sm"
                        onClick={() => setIsEditDialogOpen(true)}
                      >
                        <Edit className="h-4 w-4 ml-2" />
                        تحرير
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4 ml-2" />
                            حذف
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من حذف "{manga.title}"؟ سيتم حذف جميع
                              الفصول المرتبطة بها أيضاً. هذا الإجراء لا يمكن
                              التراجع عنه.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeleteManga}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              حذف المانجا
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
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
                  <h2 className="text-xl font-bold">
                    الفصول ({chapters.length})
                  </h2>
                  {chapters.length > 0 && manga && (
                    <Link
                      to={getChapterUrl(
                        getMangaSlug(manga),
                        chapters[0].chapter_number,
                      )}
                    >
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
                      <div
                        key={chapter.id}
                        className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <Link
                            to={
                              manga
                                ? getChapterUrl(
                                    getMangaSlug(manga),
                                    chapter.chapter_number,
                                  )
                                : `/read/${chapter.id}`
                            }
                            className="flex-1"
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium">
                                  الفصل {chapter.chapter_number}
                                  {chapter.title && `: ${chapter.title}`}
                                </h3>
                                {chapter.is_premium && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
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
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleTogglePremium(
                                        chapter.id,
                                        chapter.is_premium,
                                      )
                                    }
                                  >
                                    <DollarSign className="h-4 w-4 ml-2" />
                                    {chapter.is_premium
                                      ? "جعله مجاني"
                                      : "جعله مدفوع"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleTogglePrivate(
                                        chapter.id,
                                        chapter.is_private,
                                      )
                                    }
                                  >
                                    <Lock className="h-4 w-4 ml-2" />
                                    {chapter.is_private
                                      ? "نشر الفصل"
                                      : "جعله خاص"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem
                                        onSelect={(e) => e.preventDefault()}
                                      >
                                        <Trash2 className="h-4 w-4 ml-2" />
                                        حذف الفصل
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          تأكيد الحذف
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          هل أنت متأكد من حذف الفصل{" "}
                                          {chapter.chapter_number}؟ هذا الإجراء
                                          لا يمكن التراجع عنه.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          إلغاء
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleDeleteChapter(
                                              chapter.id,
                                              chapter.chapter_number,
                                            )
                                          }
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

      {/* مودال تحرير المانجا */}
      {manga && (
        <EditMangaDialog
          manga={manga}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onMangaUpdated={fetchMangaDetails}
        />
      )}

      <Footer />
    </div>
  );
};

export default MangaDetails;
