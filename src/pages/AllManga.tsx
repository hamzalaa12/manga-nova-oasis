import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { generateSlug } from "@/lib/slug";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";

interface MangaItem {
  id: string;
  title: string;
  slug?: string;
  manga_type: string;
}

const AllManga = () => {
  const [manga, setManga] = useState<MangaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchManga();
  }, []);

  const fetchManga = async () => {
    try {
      const { data, error } = await supabase
        .from("manga")
        .select("id, title, slug, manga_type")
        .order("title");

      if (error) throw error;
      setManga(data || []);
    } catch (error) {
      console.error("Error fetching manga:", error);
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">جميع المانجا المتاحة</h1>
        <p className="text-muted-foreground mb-8">
          هذه قائمة بجميع المانجا الموجودة مع روابطها الجديدة (slugs)
        </p>

        <div className="grid gap-4">
          {manga.map((item) => {
            const slug = item.slug || generateSlug(item.title);
            const mangaUrl = `/manga/${slug}`;

            return (
              <div
                key={item.id}
                className="p-4 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">
                      <Link
                        to={mangaUrl}
                        className="text-primary hover:text-primary-glow transition-colors"
                      >
                        {item.title}
                      </Link>
                    </h3>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>
                        <strong>URL:</strong> {mangaUrl}
                      </div>
                      <div>
                        <strong>Slug:</strong> {slug}
                      </div>
                      <div>
                        <strong>ID:</strong> {item.id}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    <Badge variant="outline">{item.manga_type}</Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {manga.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">لا توجد مانجا متاحة</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default AllManga;
