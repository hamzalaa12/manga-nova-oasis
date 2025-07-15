import { supabase } from "@/integrations/supabase/client";
import { parseSlugOrId } from "./slug";
import { getCache, setCache, isSecureSlug, sanitizeInput } from "./security";

/**
 * جلب المانجا بطريقة محسنة مع cache
 * @param slugOrId الـ slug أو ID
 * @returns بيانات المانجا
 */
export async function fetchMangaOptimized(slugOrId: string) {
  // تنظيف المدخل
  const cleanInput = sanitizeInput(slugOrId);
  if (!cleanInput) throw new Error("Invalid input");

  // فحص الكاش أولاً
  const cacheKey = `manga_${cleanInput}`;
  const cached = getCache(cacheKey);
  if (cached) {
    console.log("Using cached manga data");
    return cached;
  }

  const { type, value } = parseSlugOrId(cleanInput);

  // فحص أمان الـ slug
  if (type === "slug" && !isSecureSlug(value)) {
    throw new Error("Invalid slug format");
  }

  let query = supabase.from("manga").select("*");

  if (type === "slug") {
    query = query.eq("slug", value);
  } else {
    query = query.eq("id", value);
  }

  const { data, error } = await query.single();

  if (error) throw error;

  // حفظ في الكاش لمدة 10 دقائق
  setCache(cacheKey, data, 10 * 60 * 1000);

  return data;
}

/**
 * جلب الفصل بطريقة محسنة مع cache
 * @param mangaSlugOrId slug أو ID المانجا
 * @param chapterSlugOrId slug أو ID الفصل
 * @returns بيانات الفصل والمانجا
 */
export async function fetchChapterOptimized(
  mangaSlugOrId: string,
  chapterSlugOrId?: string,
) {
  const cleanMangaInput = sanitizeInput(mangaSlugOrId);
  const cleanChapterInput = chapterSlugOrId
    ? sanitizeInput(chapterSlugOrId)
    : "";

  if (!cleanMangaInput) throw new Error("Invalid manga input");

  if (cleanChapterInput) {
    // Route الجديد: /read/:mangaSlug/:chapterSlug
    const cacheKey = `chapter_${cleanMangaInput}_${cleanChapterInput}`;
    const cached = getCache(cacheKey);
    if (cached) {
      console.log("Using cached chapter data");
      return cached;
    }

    // جلب المانجا أولاً
    const mangaData = await fetchMangaOptimized(cleanMangaInput);

    // ثم جلب الفصل
    const { type: chapterType, value: chapterValue } =
      parseSlugOrId(cleanChapterInput);

    if (chapterType === "slug" && !isSecureSlug(chapterValue)) {
      throw new Error("Invalid chapter slug format");
    }

    let chapterQuery = supabase
      .from("chapters")
      .select("*")
      .eq("manga_id", mangaData.id);

    if (chapterType === "slug") {
      chapterQuery = chapterQuery.eq("slug", chapterValue);
    } else {
      chapterQuery = chapterQuery.eq("id", chapterValue);
    }

    const { data: chapterData, error: chapterError } =
      await chapterQuery.single();

    if (chapterError) throw chapterError;

    const result = { manga: mangaData, chapter: chapterData };

    // حفظ في الكاش لمدة 5 دقائق
    setCache(cacheKey, result, 5 * 60 * 1000);

    return result;
  } else {
    // Route القديم: /read/:id
    const cacheKey = `old_chapter_${cleanMangaInput}`;
    const cached = getCache(cacheKey);
    if (cached) {
      console.log("Using cached old chapter data");
      return cached;
    }

    const { type, value } = parseSlugOrId(cleanMangaInput);

    if (type === "slug" && !isSecureSlug(value)) {
      throw new Error("Invalid slug format");
    }

    let chapterQuery = supabase.from("chapters").select("*");

    if (type === "slug") {
      chapterQuery = chapterQuery.eq("slug", value);
    } else {
      chapterQuery = chapterQuery.eq("id", value);
    }

    const { data: chapterData, error: chapterError } =
      await chapterQuery.single();

    if (chapterError) throw chapterError;

    // جلب بيانات المانجا
    const mangaData = await fetchMangaOptimized(chapterData.manga_id);

    const result = { manga: mangaData, chapter: chapterData };

    // حفظ في الكاش لمدة 5 دقائق
    setCache(cacheKey, result, 5 * 60 * 1000);

    return result;
  }
}

/**
 * جلب فصول المانجا بطريقة محسنة
 * @param mangaId ID المانجا
 * @returns قائمة الفصول
 */
export async function fetchChaptersOptimized(mangaId: string) {
  const cleanId = sanitizeInput(mangaId);
  if (!cleanId) throw new Error("Invalid manga ID");

  const cacheKey = `chapters_${cleanId}`;
  const cached = getCache(cacheKey);
  if (cached) {
    console.log("Using cached chapters data");
    return cached;
  }

  const { data, error } = await supabase
    .from("chapters")
    .select("id, chapter_number, title, slug, is_premium, is_private")
    .eq("manga_id", cleanId)
    .order("chapter_number", { ascending: true });

  if (error) throw error;

  // حفظ في الكاش لمدة 3 دقائق
  setCache(cacheKey, data || [], 3 * 60 * 1000);

  return data || [];
}

/**
 * جلب قائمة المانجا مع pagination محسن
 * @param page رقم الصفحة
 * @param limit عدد العناصر لكل صفحة
 * @param filters فلاتر البحث
 * @returns قائمة المانجا
 */
export async function fetchMangaListOptimized(
  page: number = 1,
  limit: number = 12,
  filters: {
    type?: string;
    genre?: string;
    search?: string;
    sortBy?: "latest" | "popular" | "rating";
  } = {},
) {
  const offset = (page - 1) * limit;

  // تنظيف الفلاتر
  const cleanFilters = {
    type: filters.type ? sanitizeInput(filters.type) : undefined,
    genre: filters.genre ? sanitizeInput(filters.genre) : undefined,
    search: filters.search
      ? sanitizeInput(filters.search).substring(0, 100)
      : undefined,
    sortBy: filters.sortBy || "latest",
  };

  const cacheKey = `manga_list_${page}_${limit}_${JSON.stringify(cleanFilters)}`;
  const cached = getCache(cacheKey);
  if (cached) {
    console.log("Using cached manga list");
    return cached;
  }

  let query = supabase
    .from("manga")
    .select(
      "id, title, slug, cover_image_url, rating, views_count, status, genre, manga_type, updated_at",
    )
    .range(offset, offset + limit - 1);

  // تطبيق الفلاتر
  if (cleanFilters.type && cleanFilters.type !== "all") {
    query = query.eq("manga_type", cleanFilters.type);
  }

  if (cleanFilters.genre && cleanFilters.genre !== "all") {
    query = query.contains("genre", [cleanFilters.genre]);
  }

  if (cleanFilters.search) {
    query = query.ilike("title", `%${cleanFilters.search}%`);
  }

  // ترتيب النتائج
  switch (cleanFilters.sortBy) {
    case "popular":
      query = query.order("views_count", { ascending: false });
      break;
    case "rating":
      query = query.order("rating", { ascending: false });
      break;
    default:
      query = query.order("updated_at", { ascending: false });
  }

  const { data, error } = await query;

  if (error) throw error;

  // حفظ في الكاش لمدة 2 دقيقة
  setCache(cacheKey, data || [], 2 * 60 * 1000);

  return data || [];
}

/**
 * بحث ذكي في المانجا والفصول
 * @param searchTerm مصطلح البحث
 * @param limit عدد النتائج الأقصى
 * @returns نتائج البحث
 */
export async function smartSearch(searchTerm: string, limit: number = 10) {
  const cleanTerm = sanitizeInput(searchTerm).substring(0, 50);
  if (!cleanTerm || cleanTerm.length < 2) {
    throw new Error("Search term too short");
  }

  const cacheKey = `search_${cleanTerm}_${limit}`;
  const cached = getCache(cacheKey);
  if (cached) {
    console.log("Using cached search results");
    return cached;
  }

  // البحث في المانجا
  const { data: mangaResults, error: mangaError } = await supabase
    .from("manga")
    .select("id, title, slug, cover_image_url, manga_type")
    .or(`title.ilike.%${cleanTerm}%, author.ilike.%${cleanTerm}%`)
    .limit(limit);

  if (mangaError) throw mangaError;

  const results = {
    manga: mangaResults || [],
    timestamp: Date.now(),
  };

  // حفظ في الكاش لمدة دقيقة واحدة
  setCache(cacheKey, results, 60 * 1000);

  return results;
}
