# نظام الـ Slug للمانجا

## نظرة عامة

تم تنفيذ نظام slug لتحسين URLs وجعلها أكثر قابلية للقراءة وSEO-friendly. الآن بدلاً من:

- `/manga/uuid-string`
- `/read/uuid-string`

أصبح لدينا:

- `/manga/solo-leveling`
- `/read/solo-leveling/1`

## المكونات المحدثة

### 1. قاعدة البيانات

- **Migration**: `supabase/migrations/20250101000000_add_slug_to_manga.sql`
- أضيف حقل `slug` إلى جدول `manga`
- تم إنشاء functions لتوليد slugs تلقائياً من العنوان
- تم إنشاء trigger لتحديث slug عند تغيير العنوان
- تم إضافة unique constraint على حقل slug

### 2. نوع البيانات

- **ملف**: `src/integrations/supabase/types.ts`
- تم تحديث interface لجدول manga لتشمل حقل `slug`

### 3. دوال المساعدة

- **ملف**: `src/lib/slug.ts`
- `createSlug()`: تحويل النص إلى slug
- `getMangaSlug()`: استخراج slug من بيانات المانجا
- `getChapterUrl()`: إنشاء رابط الفصل
- `getMangaUrl()`: إنشاء رابط المانجا
- `parseMangaIdentifier()`: تحديد نوع المعرف (slug أو UUID)

### 4. التوجيه

- **ملف**: `src/App.tsx`
- تم تحديث routes لدعم:
  - `/manga/:slug`
  - `/read/:slug/:chapter`
  - `/read/:id` (للتوافق مع النظام القديم)

### 5. المكونات المحدثة

#### MangaCard

- **ملف**: `src/components/MangaCard.tsx`
- تم إضافة prop `slug`
- استخدام `getMangaUrl()` لإنشاء الروابط

#### MangaDetails

- **ملف**: `src/pages/MangaDetails.tsx`
- دعم استقبال slug أو ID من URL
- تحديث روابط الفصول لاستخدام format جديد

#### ChapterReader

- **ملف**: `src/pages/ChapterReader.tsx`
- دعم النمط الجديد `/read/manga-slug/chapter-number`
- الحفاظ على التوافق مع النمط القديم
- تح��يث روابط التنقل

#### صفحات القوائم

- **MangaGrid**: `src/components/MangaGrid.tsx`
- **MangaByGenre**: `src/pages/MangaByGenre.tsx`
- **MangaByType**: `src/pages/MangaByType.tsx`
- تم تحديث جميع الاستعلامات لتشمل `slug`
- تمرير slug prop إلى MangaCard

## كيفية عمل النظام

### إنشاء Slug

1. عند إضافة مانجا جديدة، يتم توليد slug تلقائياً من العنوان
2. تحويل النص إلى أحرف صغيرة
3. استبدال المسافات والرموز الخاصة بـ `-`
4. التأكد من عدم وجود slug مماثل (إضافة رقم إذا لزم الأمر)

### التنقل

1. **بطاقات المانجا**: تستخدم slug في الروابط
2. **صفحة التفاصيل**: تدعم كلاً من slug وUUID
3. **روابط الفصول**: تستخدم format `manga-slug/chapter-number`

### التوافق مع النظام القديم

- الروابط القديمة بـ UUID ما زالت تعمل
- يتم التحويل تلقائياً للنظام الجديد
- لا حاجة لتحديث الروابط الموجودة

## مثال عملي

### قبل التحديث

```
المانجا: /manga/123e4567-e89b-12d3-a456-426614174000
الفصل: /read/789e4567-e89b-12d3-a456-426614174001
```

### بعد التحديث

```
المانجا: /manga/solo-leveling
الفصل: /read/solo-leveling/1
```

## اختبار النظام

1. تصفح المانجا والضغط على البطاقات
2. التحقق من URLs في شريط العناوين
3. اختبار التنقل بين الفصول
4. التأكد من عمل الروابط القديمة

## ملاحظات مهمة

- Slugs مُحدثة تلقائياً عند تغيير عنوان المانجا
- النظام يدعم النصوص العربية والإنجليزية
- كل slug فريد في قاعدة البيانات
- الأداء محسن بـ index على حقل slug
