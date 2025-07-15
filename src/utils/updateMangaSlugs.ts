import { supabase } from "@/integrations/supabase/client";
import { generateSlug } from "@/lib/slug";

/**
 * تحديث جميع المانجا الموجودة بـ slug إذا لم تكن تحتوي على واحد
 */
export async function updateMangaSlugs() {
  try {
    console.log("Starting to update manga slugs...");

    // جلب جميع المانجا
    const { data: allManga, error: fetchError } = await supabase
      .from("manga")
      .select("id, title, slug");

    if (fetchError) {
      console.error("Error fetching manga:", fetchError);
      return;
    }

    console.log(`Found ${allManga?.length || 0} manga entries`);

    // فلترة المانجا التي تحتاج لـ slug
    const mangaWithoutSlug = allManga?.filter((manga) => !manga.slug) || [];

    if (mangaWithoutSlug.length === 0) {
      console.log("All manga already have slugs");
      return;
    }

    console.log(`Updating ${mangaWithoutSlug.length} manga without slugs`);

    // تحديث كل manga بـ slug
    for (const manga of mangaWithoutSlug) {
      const slug = generateSlug(manga.title);
      console.log(`Updating "${manga.title}" with slug: "${slug}"`);

      const { error: updateError } = await supabase
        .from("manga")
        .update({ slug })
        .eq("id", manga.id);

      if (updateError) {
        console.error(`Error updating manga ${manga.id}:`, updateError);
      }
    }

    console.log("Finished updating manga slugs");
  } catch (error) {
    console.error("Error in updateMangaSlugs:", error);
  }
}

/**
 * إضافة حقل slug إذا لم يكن موجود
 */
export async function addSlugColumnIfMissing() {
  try {
    console.log("Checking if slug column exists...");

    // محاولة جلب slug من قاعدة البيانات للتحقق من وجود ��لعمود
    const { error } = await supabase.from("manga").select("slug").limit(1);

    if (error && error.message.includes('column "slug" does not exist')) {
      console.log(
        "Slug column does not exist, it needs to be added via migration",
      );
      return false;
    }

    console.log("Slug column exists");
    return true;
  } catch (error) {
    console.error("Error checking slug column:", error);
    return false;
  }
}
