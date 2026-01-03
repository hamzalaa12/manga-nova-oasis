import { supabase } from "@/integrations/supabase/client";
import { createSlug } from "@/lib/slug";

export async function ensureMangaHasSlugs() {
  try {
    console.log("Checking for manga without slugs...");

    // جلب المانجا التي لا تحتوي على slug
    const { data: mangaWithoutSlugs, error } = await supabase
      .from("manga")
      .select("id, title, slug")
      .or("slug.is.null,slug.eq.");

    if (error) {
      console.error("Error fetching manga:", error);
      return false;
    }

    if (!mangaWithoutSlugs || mangaWithoutSlugs.length === 0) {
      console.log("All manga already have slugs!");
      return true;
    }

    console.log(
      `Found ${mangaWithoutSlugs.length} manga without slugs. Fixing...`,
    );

    // تحديث كل مانجا بـ slug جديد
    for (const manga of mangaWithoutSlugs) {
      if (!manga.title) continue;

      const baseSlug = createSlug(manga.title);
      let finalSlug = baseSlug;
      let counter = 0;

      // التأكد من أن الـ slug فريد
      while (true) {
        const { data: existing } = await supabase
          .from("manga")
          .select("id")
          .eq("slug", finalSlug)
          .neq("id", manga.id);

        if (!existing || existing.length === 0) {
          break; // الـ slug متاح
        }

        counter++;
        finalSlug = `${baseSlug}-${counter}`;
      }

      // تحديث المانجا بالـ slug الجديد
      const { error: updateError } = await supabase
        .from("manga")
        .update({ slug: finalSlug })
        .eq("id", manga.id);

      if (updateError) {
        console.error(`Error updating manga ${manga.title}:`, updateError);
      } else {
        console.log(`✓ Updated "${manga.title}" with slug: ${finalSlug}`);
      }
    }

    console.log("✅ Finished ensuring all manga have slugs!");
    return true;
  } catch (error) {
    console.error("Error in ensureMangaHasSlugs:", error);
    return false;
  }
}
