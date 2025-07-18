-- إصلاح نظام المشاهدات وضمان عمل العدادات

-- تحديث جميع العدادات إلى القيم الصحيحة
UPDATE manga 
SET views_count = COALESCE(
    (SELECT COUNT(*) FROM manga_views WHERE manga_id = manga.id), 
    0
) 
WHERE views_count IS NULL OR views_count = 0;

UPDATE chapters 
SET views_count = COALESCE(
    (SELECT COUNT(*) FROM manga_views WHERE manga_id = chapters.id), 
    0
) 
WHERE views_count IS NULL OR views_count = 0;

-- إنشاء trigger لتحديث عدادات المانجا تلقائياً
CREATE OR REPLACE FUNCTION update_manga_views_count()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث عداد المانجا
    IF TG_OP = 'INSERT' THEN
        IF NEW.manga_id IS NOT NULL THEN
            UPDATE manga 
            SET views_count = COALESCE(views_count, 0) + 1 
            WHERE id = NEW.manga_id;
        END IF;
        
        -- تحديث عداد الفصل إذا كان الـ manga_id يشير لفصل
        UPDATE chapters 
        SET views_count = COALESCE(views_count, 0) + 1 
        WHERE id = NEW.manga_id;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ربط الـ trigger بجدول manga_views
DROP TRIGGER IF EXISTS manga_views_trigger ON manga_views;
CREATE TRIGGER manga_views_trigger
    AFTER INSERT ON manga_views
    FOR EACH ROW
    EXECUTE FUNCTION update_manga_views_count();

-- إنشاء index لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_manga_views_manga_id ON manga_views(manga_id);
CREATE INDEX IF NOT EXISTS idx_manga_views_user_id ON manga_views(user_id);
CREATE INDEX IF NOT EXISTS idx_manga_views_session_id ON manga_views(session_id);

-- تأكد من أن العدادات ليست null
ALTER TABLE manga ALTER COLUMN views_count SET DEFAULT 0;
ALTER TABLE chapters ALTER COLUMN views_count SET DEFAULT 0;

UPDATE manga SET views_count = 0 WHERE views_count IS NULL;
UPDATE chapters SET views_count = 0 WHERE views_count IS NULL;
