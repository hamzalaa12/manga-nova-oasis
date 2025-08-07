import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bookmark,
  BookmarkX,
  MessageCircle,
  Calendar,
  ExternalLink,
  Trash2,
  Search,
  Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SpoilerContent from "@/components/ui/spoiler-content";
import { getRoleDisplayName, getRoleColor } from "@/types/user";

interface BookmarkedComment {
  id: string;
  comment_id: string;
  created_at: string;
  comment: {
    id: string;
    content: string;
    is_spoiler: boolean;
    created_at: string;
    chapter_id: string;
    manga_id: string;
    profiles: {
      display_name: string;
      role: string;
      avatar_url?: string;
    };
  };
  chapter: {
    chapter_number: number;
    title: string;
  };
  manga: {
    title: string;
    slug: string;
  };
}

const BookmarkedComments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "manga">("newest");

  // جلب التعليقات المفضلة
  const { data: bookmarkedComments = [], isLoading } = useQuery({
    queryKey: ["bookmarked-comments", user?.id, sortBy],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("comment_bookmarks")
        .select(`
          *,
          comment:comments!comment_bookmarks_comment_id_fkey (
            id,
            content,
            is_spoiler,
            created_at,
            chapter_id,
            manga_id,
            profiles!comments_user_id_fkey (display_name, role, avatar_url)
          ),
          chapter:chapters!comment_bookmarks_comment_id_fkey (chapter_number, title),
          manga:manga!comment_bookmarks_comment_id_fkey (title, slug)
        `)
        .eq("user_id", user.id);

      // تطبيق الترتيب
      switch (sortBy) {
        case "oldest":
          query = query.order("created_at", { ascending: true });
          break;
        case "manga":
          query = query.order("manga(title)", { ascending: true });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  // إزالة من المفضلة
  const removeBookmarkMutation = useMutation({
    mutationFn: async (bookmarkId: string) => {
      const { error } = await supabase
        .from("comment_bookmarks")
        .delete()
        .eq("id", bookmarkId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarked-comments"] });
      toast({
        title: "تمت الإزالة",
        description: "تم إزالة التعليق من المفضلة",
      });
    },
  });

  // فلترة التعليقات حسب البحث
  const filteredComments = bookmarkedComments.filter((bookmark) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      bookmark.comment?.content?.toLowerCase().includes(searchLower) ||
      bookmark.comment?.profiles?.display_name?.toLowerCase().includes(searchLower) ||
      bookmark.manga?.title?.toLowerCase().includes(searchLower) ||
      bookmark.chapter?.title?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const navigateToComment = (bookmark: BookmarkedComment) => {
    const mangaSlug = bookmark.manga?.slug;
    const chapterNumber = bookmark.chapter?.chapter_number;
    const commentId = bookmark.comment?.id;
    
    if (mangaSlug && chapterNumber && commentId) {
      window.open(`/manga/${mangaSlug}/chapter/${chapterNumber}#comment-${commentId}`, '_blank');
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">يجب تسجيل الدخول لعرض التعليقات المفضلة</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            التعليقات المفضلة
            <Badge variant="secondary">
              {filteredComments.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* أدوات البحث والفلترة */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="البحث في التعليقات المفضلة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">الأحدث أولاً</SelectItem>
                <SelectItem value="oldest">الأقدم أولاً</SelectItem>
                <SelectItem value="manga">حسب المانجا</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* قائمة التعليقات */}
          <ScrollArea className="h-[600px]">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">جاري التحميل...</p>
              </div>
            ) : filteredComments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bookmark className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">
                  {searchTerm ? "لا توجد نتائج" : "لا توجد تعليقات مفضلة"}
                </p>
                <p className="text-sm">
                  {searchTerm 
                    ? "جرب البحث بكلمات مختلفة" 
                    : "ابدأ بحفظ التعليقات المفيدة في المفضلة"
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredComments.map((bookmark) => (
                  <Card key={bookmark.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      {/* معلومات المانجا والفصل */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium">{bookmark.manga?.title}</span>
                          <span>•</span>
                          <span>الفصل {bookmark.chapter?.chapter_number}</span>
                          {bookmark.chapter?.title && (
                            <>
                              <span>•</span>
                              <span>{bookmark.chapter.title}</span>
                            </>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigateToComment(bookmark)}
                            className="h-8 w-8 p-0"
                            title="الانتقال للتعليق"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBookmarkMutation.mutate(bookmark.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            title="إزالة من المفضلة"
                          >
                            <BookmarkX className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* معلومات التعليق */}
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={bookmark.comment?.profiles?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {(bookmark.comment?.profiles?.display_name || "م").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {bookmark.comment?.profiles?.display_name || "مستخدم"}
                            </span>
                            <Badge 
                              className={`${getRoleColor(bookmark.comment?.profiles?.role as any)} text-xs`} 
                              variant="secondary"
                            >
                              {getRoleDisplayName(bookmark.comment?.profiles?.role as any)}
                            </Badge>
                          </div>
                          
                          {/* محتوى التعليق */}
                          <div className="text-sm leading-relaxed">
                            <SpoilerContent
                              content={bookmark.comment?.content || ""}
                              isSpoiler={bookmark.comment?.is_spoiler || false}
                              onReveal={() => {}}
                            />
                          </div>
                        </div>
                      </div>

                      {/* تاريخ الحفظ والتعليق */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>حُفظ في: {formatDate(bookmark.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            <span>كُتب في: {formatDate(bookmark.comment?.created_at || "")}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookmarkedComments;
