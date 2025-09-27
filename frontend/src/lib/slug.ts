/**
 * Convert text to URL-friendly slug
 */
export function createSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      // Replace Arabic and English spaces and special characters with hyphens
      .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, "") ||
    // Handle empty results
    "untitled"
  );
}

/**
 * Extract manga slug from manga data
 */
export function getMangaSlug(manga: {
  slug?: string | null;
  title?: string;
  id?: string;
}): string {
  if (manga.slug) {
    return manga.slug;
  }

  if (manga.title) {
    return createSlug(manga.title);
  }

  return manga.id || "unknown";
}

/**
 * Create chapter URL path using manga slug and chapter number
 */
export function getChapterUrl(
  mangaSlug: string,
  chapterNumber: number,
): string {
  return `/read/${mangaSlug}/${chapterNumber}`;
}

/**
 * Create manga details URL using slug
 */
export function getMangaUrl(mangaSlug: string): string {
  return `/manga/${mangaSlug}`;
}

/**
 * Parse manga identifier - could be slug or ID
 */
export function parseMangaIdentifier(identifier: string): {
  type: "slug" | "id";
  value: string;
} {
  // UUIDs have a specific format with hyphens
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(identifier)) {
    return { type: "id", value: identifier };
  }

  return { type: "slug", value: identifier };
}
