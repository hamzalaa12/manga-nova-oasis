import { supabase } from "@/integrations/supabase/client";
import { generateChapterSlug } from "@/lib/slug";

/**
 * تحديث جميع الفصول الموجودة بـ slug إذا لم تكن تحتوي على واحد
 */
export async function updateChapterSlugs() {
  try {
    console.log("Starting to update chapter slugs...");

    // جلب جميع الفصول
    const { data: allChapters, error: fetchError } = await supabase
      .from("chapters")
      .select("id, title, chapter_number, manga_id, slug");

    if (fetchError) {
      console.error("Error fetching chapters:", fetchError);
      return;
    }

    console.log(`Found ${allChapters?.length || 0} chapter entries`);

    // فلترة الفصول التي تحتاج لـ slug
    const chaptersWithoutSlug =
      allChapters?.filter((chapter) => !chapter.slug) || [];

    if (chaptersWithoutSlug.length === 0) {
      console.log("All chapters already have slugs");
      return;
    }

    console.log(
      `Updating ${chaptersWithoutSlug.length} chapters without slugs`,
    );

    // تحديث كل chapter بـ slug
    for (const chapter of chaptersWithoutSlug) {
      const slug = generateChapterSlug(chapter.title, chapter.chapter_number);
      console.log(
        `Updating chapter ${chapter.chapter_number} with slug: "${slug}"`,
      );

      const { error: updateError } = await supabase
        .from("chapters")
        .update({ slug })
        .eq("id", chapter.id);

      if (updateError) {
        console.error(`Error updating chapter ${chapter.id}:`, updateError);
      }
    }

    console.log("Finished updating chapter slugs");
  } catch (error) {
    console.error("Error in updateChapterSlugs:", error);
  }
}

/**
 * إضافة حقل slug للفصول إذا لم يكن موجود
 */
export async function addChapterSlugColumnIfMissing() {
  try {
    console.log("Checking if chapter slug column exists...");

    // محاولة جلب slug من قاعدة البيانات للتحقق من وجود العمود
    const { error } = await supabase.from("chapters").select("slug").limit(1);

    if (error && error.message.includes('column "slug" does not exist')) {
      console.log(
        "Chapter slug column does not exist, it needs to be added via migration",
      );
      return false;
    }

    console.log("Chapter slug column exists");
    return true;
  } catch (error) {
    console.error("Error checking chapter slug column:", error);
    return false;
  }
}

/**
 * إحصائيات slug للفصول
 */
export async function getChapterSlugStats() {
  try {
    const { data: allChapters, error } = await supabase
      .from("chapters")
      .select("id, slug, title, chapter_number");

    if (error) {
      console.error("Error fetching chapter stats:", error);
      return null;
    }

    const total = allChapters?.length || 0;
    const withSlug = allChapters?.filter((c) => c.slug).length || 0;
    const withoutSlug = total - withSlug;

    return {
      total,
      withSlug,
      withoutSlug,
      percentage: total > 0 ? Math.round((withSlug / total) * 100) : 0,
    };
  } catch (error) {
    console.error("Error getting chapter slug stats:", error);
    return null;
  }
}
