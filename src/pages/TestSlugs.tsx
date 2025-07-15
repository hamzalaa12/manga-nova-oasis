import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateSlug } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface MangaItem {
  id: string;
  title: string;
  slug?: string;
}

const TestSlugs = () => {
  const [manga, setManga] = useState<MangaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchManga();
  }, []);

  const fetchManga = async () => {
    try {
      const { data, error } = await supabase
        .from("manga")
        .select("id, title, slug")
        .limit(10);

      if (error) throw error;
      setManga(data || []);
    } catch (error) {
      console.error("Error fetching manga:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSlug = async (mangaItem: MangaItem) => {
    try {
      const newSlug = generateSlug(mangaItem.title);
      const { error } = await supabase
        .from("manga")
        .update({ slug: newSlug })
        .eq("id", mangaItem.id);

      if (error) throw error;

      toast({
        title: "تم التحديث!",
        description: `تم تحديث slug لـ "${mangaItem.title}"`,
      });

      fetchManga();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في التحديث",
        variant: "destructive",
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">اختبار Slugs</h1>

        <div className="space-y-4">
          {manga.map((item) => (
            <div key={item.id} className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">{item.title}</h3>
              <div className="text-sm text-muted-foreground mb-2">
                <strong>ID:</strong> {item.id}
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                <strong>Current Slug:</strong> {item.slug || "لا يوجد"}
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                <strong>Generated Slug:</strong> {generateSlug(item.title)}
              </div>
              <div className="text-sm text-muted-foreground mb-4">
                <strong>New URL:</strong> /manga/{generateSlug(item.title)}
              </div>
              <Button
                onClick={() => updateSlug(item)}
                size="sm"
                disabled={item.slug === generateSlug(item.title)}
              >
                {item.slug === generateSlug(item.title) ? "محدث" : "تحديث Slug"}
              </Button>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TestSlugs;
