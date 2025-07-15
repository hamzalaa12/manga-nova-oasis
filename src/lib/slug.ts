/**
 * توليد slug من العنوان
 * @param title العنوان المراد تحويله لـ slug
 * @returns slug منسق
 */
export function generateSlug(title: string): string {
  if (!title) return "manga";

  return (
    title
      .toLowerCase()
      // إزالة الأحرف الخاصة والاحتفاظ بالأحرف والأرقام والمسافات والشرطات
      .replace(/[^\w\s\u0600-\u06FF-]/g, "")
      // تحويل المسافات إلى شرطات
      .replace(/\s+/g, "-")
      // إزالة الشرطات الزائدة
      .replace(/^-+|-+$/g, "")
      // تقصير الطول إذا كان طويلاً جداً
      .substring(0, 50)
      // إزالة الشرطة في النهاية إذا تم قطع النص
      .replace(/-+$/, "") || "manga"
  );
}

/**
 * التحقق من صحة slug
 * @param slug الـ slug المراد فحصه
 * @returns true إذا كان صالحاً
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9\u0600-\u06FF]+(?:-[a-z0-9\u0600-\u06FF]+)*$/.test(slug);
}

/**
 * استخراج ID من slug أو إرجاع slug إذا كان صالحاً
 * @param slugOrId القيمة المراد فحصها
 * @returns object يحتوي على نوع القيمة والقيمة نفسها
 */
export function parseSlugOrId(slugOrId: string): {
  type: "slug" | "id";
  value: string;
} {
  // فحص إذا كانت القيمة UUID (ID)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(slugOrId)) {
    return { type: "id", value: slugOrId };
  }

  return { type: "slug", value: slugOrId };
}
