-- تحديث جدول التفاعلات لدعم الإيموجيات الجديدة
ALTER TABLE chapter_reactions 
DROP CONSTRAINT IF EXISTS chapter_reactions_reaction_type_check;

ALTER TABLE chapter_reactions 
ADD CONSTRAINT chapter_reactions_reaction_type_check 
CHECK (reaction_type IN ('sad', 'angry', 'surprised', 'love', 'laugh', 'like', 'fire', 'wow', 'cry', 'party'));

-- إضافة فهارس محسّنة للأداء
CREATE INDEX IF NOT EXISTS idx_chapter_reactions_type_chapter ON chapter_reactions(reaction_type, chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_reactions_created_at ON chapter_reactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chapter_comments_created_at ON chapter_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chapter_comments_is_deleted ON chapter_comments(is_deleted) WHERE is_deleted = false;

-- تحسين دالة فلترة الكلمات الممنوعة
CREATE OR REPLACE FUNCTION filter_banned_words(content_text TEXT)
RETURNS TEXT AS $$
DECLARE
    result_text TEXT := content_text;
    banned_word RECORD;
BEGIN
    -- تحويل النص إلى أحرف صغيرة للمقارنة
    FOR banned_word IN 
        SELECT word, replacement FROM banned_words 
        WHERE is_active = TRUE 
        ORDER BY LENGTH(word) DESC -- البدء بالكلمات الأطول
    LOOP
        result_text := REGEXP_REPLACE(
            result_text, 
            '\y' || banned_word.word || '\y', 
            banned_word.replacement, 
            'gi'
        );
    END LOOP;
    
    RETURN result_text;
END;
$$ LANGUAGE plpgsql;

-- إضافة دالة لإحصائيات التفاعلات
CREATE OR REPLACE FUNCTION get_chapter_reaction_stats(chapter_id_param UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_object_agg(reaction_type, reaction_count)
    INTO result
    FROM (
        SELECT 
            reaction_type,
            COUNT(*) as reaction_count
        FROM chapter_reactions 
        WHERE chapter_id = chapter_id_param
        GROUP BY reaction_type
    ) stats;
    
    RETURN COALESCE(result, '{}'::json);
END;
$$ LANGUAGE plpgsql;

-- إضافة دالة للحصول على أفضل التعليقات
CREATE OR REPLACE FUNCTION get_top_comments(chapter_id_param UUID, limit_param INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    content TEXT,
    like_count INTEGER,
    created_at TIMESTAMPTZ,
    user_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.content,
        c.like_count,
        c.created_at,
        COALESCE(p.display_name, 'مستخدم') as user_name
    FROM chapter_comments c
    LEFT JOIN profiles p ON c.user_id = p.id
    WHERE c.chapter_id = chapter_id_param 
        AND c.is_deleted = false 
        AND c.is_hidden = false
        AND c.parent_id IS NULL -- التعليقات الرئيسية فقط
    ORDER BY 
        c.like_count DESC, 
        c.created_at DESC
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- إضافة trigger لمنع الكلمات الممنوعة تلقائياً
CREATE OR REPLACE FUNCTION prevent_banned_words()
RETURNS TRIGGER AS $$
BEGIN
    NEW.content := filter_banned_words(NEW.content);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_banned_words_trigger ON chapter_comments;
CREATE TRIGGER prevent_banned_words_trigger
    BEFORE INSERT OR UPDATE ON chapter_comments
    FOR EACH ROW
    EXECUTE FUNCTION prevent_banned_words();

-- إضافة بعض الكلمات الممنوعة الإضافية
INSERT INTO banned_words (word, replacement) VALUES 
('بغيض', '[محتوى غير مناسب]'),
('مقرف', '[محتوى غير مناسب]'),
('تافه', '[محتوى غير مناسب]'),
('احمق', '[محتوى غير مناسب]')
ON CONFLICT (word) DO NOTHING;
