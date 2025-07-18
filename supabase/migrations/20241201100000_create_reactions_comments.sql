-- إنشاء جداول التفاعلات والتعليقات

-- جدول التفاعلات
CREATE TABLE IF NOT EXISTS chapter_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT, -- للمستخدمين غير المسجلين
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('sad', 'angry', 'surprised', 'love', 'laugh', 'like')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chapter_id, user_id, reaction_type),
    UNIQUE(chapter_id, session_id, reaction_type)
);

-- جدول التعليقات
CREATE TABLE IF NOT EXISTS chapter_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES chapter_comments(id) ON DELETE CASCADE, -- للردود
    content TEXT NOT NULL,
    is_spoiler BOOLEAN DEFAULT FALSE,
    is_hidden BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    is_reported BOOLEAN DEFAULT FALSE,
    report_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    dislike_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    edited_at TIMESTAMPTZ,
    edited_by UUID REFERENCES auth.users(id) -- للإدمن الذي عدّل التعليق
);

-- جدول الإعجاب/عدم الإعجاب للتعليقات
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES chapter_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT, -- للمستخدم��ن غير المسجلين
    is_like BOOLEAN NOT NULL, -- true للإعجاب، false لعدم الإعجاب
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id),
    UNIQUE(comment_id, session_id)
);

-- جدول البلاغات
CREATE TABLE IF NOT EXISTS comment_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES chapter_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id),
    UNIQUE(comment_id, session_id)
);

-- جدول المستخدمين المحظورين
CREATE TABLE IF NOT EXISTS banned_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT,
    banned_by UUID REFERENCES auth.users(id),
    reason TEXT,
    banned_until TIMESTAMPTZ, -- NULL للحظر الدائم
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id),
    UNIQUE(session_id)
);

-- جدول الكلمات الممنوعة
CREATE TABLE IF NOT EXISTS banned_words (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    word TEXT NOT NULL UNIQUE,
    replacement TEXT DEFAULT '***',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إدراج بعض الكلمات الممنوعة الأساسية
INSERT INTO banned_words (word, replacement) VALUES 
('spam', '***'),
('تحرق', '[محتوى محروق]'),
('spoiler', '[محتوى محروق]')
ON CONFLICT (word) DO NOTHING;

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_chapter_reactions_chapter_id ON chapter_reactions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_reactions_user_id ON chapter_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_chapter_comments_chapter_id ON chapter_comments(chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_comments_parent_id ON chapter_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_chapter_comments_user_id ON chapter_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_comment_id ON comment_reports(comment_id);

-- تحديث عدادات التعليقات تلقائياً
CREATE OR REPLACE FUNCTION update_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث عداد الإعجاب/عدم الإعجاب
    IF TG_TABLE_NAME = 'comment_likes' THEN
        UPDATE chapter_comments 
        SET 
            like_count = (SELECT COUNT(*) FROM comment_likes WHERE comment_id = COALESCE(NEW.comment_id, OLD.comment_id) AND is_like = true),
            dislike_count = (SELECT COUNT(*) FROM comment_likes WHERE comment_id = COALESCE(NEW.comment_id, OLD.comment_id) AND is_like = false)
        WHERE id = COALESCE(NEW.comment_id, OLD.comment_id);
    END IF;
    
    -- تحديث عداد البلاغات
    IF TG_TABLE_NAME = 'comment_reports' THEN
        UPDATE chapter_comments 
        SET 
            report_count = (SELECT COUNT(*) FROM comment_reports WHERE comment_id = COALESCE(NEW.comment_id, OLD.comment_id)),
            is_reported = (SELECT COUNT(*) FROM comment_reports WHERE comment_id = COALESCE(NEW.comment_id, OLD.comment_id)) > 0
        WHERE id = COALESCE(NEW.comment_id, OLD.comment_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ربط الـ triggers
DROP TRIGGER IF EXISTS comment_likes_trigger ON comment_likes;
CREATE TRIGGER comment_likes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON comment_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_counts();

DROP TRIGGER IF EXISTS comment_reports_trigger ON comment_reports;
CREATE TRIGGER comment_reports_trigger
    AFTER INSERT OR UPDATE OR DELETE ON comment_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_counts();

-- دالة فحص المستخدمين المحظورين
CREATE OR REPLACE FUNCTION is_user_banned(user_id_param UUID DEFAULT NULL, session_id_param TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM banned_users 
        WHERE 
            (user_id_param IS NOT NULL AND user_id = user_id_param)
            OR (session_id_param IS NOT NULL AND session_id = session_id_param)
            AND (banned_until IS NULL OR banned_until > NOW())
    );
END;
$$ LANGUAGE plpgsql;

-- دالة فحص الكلمات الممنوعة
CREATE OR REPLACE FUNCTION filter_banned_words(content_text TEXT)
RETURNS TEXT AS $$
DECLARE
    result_text TEXT := content_text;
    banned_word RECORD;
BEGIN
    FOR banned_word IN 
        SELECT word, replacement FROM banned_words WHERE is_active = TRUE
    LOOP
        result_text := REPLACE(result_text, banned_word.word, banned_word.replacement);
    END LOOP;
    
    RETURN result_text;
END;
$$ LANGUAGE plpgsql;
