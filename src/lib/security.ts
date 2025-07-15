/**
 * دوال الأمان وتحسين الأداء
 */

// Cache للبيانات المتكررة
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

/**
 * Cache البيانات مع TTL
 * @param key مفتاح الكاش
 * @param data البيانات
 * @param ttlMs مدة انتهاء الصلاحية بالميلي ثانية
 */
export function setCache(
  key: string,
  data: any,
  ttlMs: number = 5 * 60 * 1000,
) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  });
}

/**
 * جلب البيانات من الكاش
 * @param key مفتاح الكاش
 * @returns البيانات أو null إذا انتهت الصلاحية
 */
export function getCache(key: string): any | null {
  const cached = cache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > cached.ttl) {
    cache.delete(key);
    return null;
  }

  return cached.data;
}

/**
 * تنظيف الكاش من البيانات المنتهية الصلاحية
 */
export function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > value.ttl) {
      cache.delete(key);
    }
  }
}

/**
 * تنظيف جميع الكاش
 */
export function clearCache() {
  cache.clear();
}

/**
 * فحص صحة slug
 * @param slug الـ slug المراد فحصه
 * @returns true إذا كان آمناً
 */
export function isSecureSlug(slug: string): boolean {
  // فحص الطول
  if (!slug || slug.length < 1 || slug.length > 100) {
    return false;
  }

  // فحص الأحرف المسموحة فقط
  const safePattern = /^[a-z0-9\u0600-\u06FF]+(?:-[a-z0-9\u0600-\u06FF]+)*$/i;
  return safePattern.test(slug);
}

/**
 * تنظيف وفحص المدخلات
 * @param input المدخل
 * @returns المدخل المنظف
 */
export function sanitizeInput(input: string): string {
  if (!input) return "";

  return input
    .trim()
    .replace(/[<>\"'&]/g, "") // إزالة أحرف HTML خطيرة
    .substring(0, 1000); // تحديد الطول الأقصى
}

/**
 * فحص rate limiting بسيط
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * فحص الـ rate limiting
 * @param key مفتاح المستخدم (IP أو ID)
 * @param maxRequests أقصى عدد طلبات
 * @param windowMs نافزة الوقت بالميلي ثانية
 * @returns true إذا كان مسموح
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 100,
  windowMs: number = 60 * 1000,
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * تنظيف rate limit map
 */
export function cleanupRateLimit() {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

/**
 * تشفير بسيط للبيانات الحساسة
 * @param text النص المراد تشفيره
 * @returns النص المشفر
 */
export function simpleEncrypt(text: string): string {
  return btoa(encodeURIComponent(text));
}

/**
 * فك التشفير
 * @param encrypted النص المشفر
 * @returns النص الأصلي
 */
export function simpleDecrypt(encrypted: string): string {
  try {
    return decodeURIComponent(atob(encrypted));
  } catch {
    return "";
  }
}

/**
 * إنشاء hash بسيط من النص
 * @param text النص
 * @returns hash
 */
export function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// تنظيف دوري للكاش وrate limit
if (typeof window !== "undefined") {
  setInterval(
    () => {
      cleanupCache();
      cleanupRateLimit();
    },
    5 * 60 * 1000,
  ); // كل 5 دقائق
}
