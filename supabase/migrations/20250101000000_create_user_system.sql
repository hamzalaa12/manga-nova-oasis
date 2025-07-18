-- إنشاء نظام المستخدمين والأدوار والمفضلة والإشعارات

-- تحديث جدول الملفات الشخصية بالأدوار الجديدة
DO $$ 
BEGIN
    -- إضافة عمود الأدوار إذا لم يكن موجوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';
    END IF;
END $$;

-- إنشاء نوع البيانات للأدوار
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('user', 'beginner_fighter', 'elite_fighter', 'leader', 'admin');
    END IF;
END $$;

-- تحديث عمود الأدوار ليستخدم النوع الجديد
ALTER TABLE profiles ALTER COLUMN role TYPE user_role USING role::user_role;

-- إضافة المزيد من المعلومات للملف الشخصي
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS join_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_until TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- جدول المانجا المفضلة
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    manga_id UUID NOT NULL REFERENCES manga(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, manga_id)
);

-- جدول الإشعارات
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'new_chapter', 'new_manga', 'report', 'new_user', 'content_approved', 'content_rejected'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- معلومات إضافية مثل manga_id, chapter_id, etc.
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول طلبات المحتوى (للمقاتلين المبتدئين)
CREATE TABLE IF NOT EXISTS content_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'manga' or 'chapter'
    content_id UUID, -- references manga.id or chapters.id
    data JSONB NOT NULL, -- بيانات المحتوى المقترح
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    reviewed_by UUID REFERENCES auth.users(id),
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- جدول البلاغات
CREATE TABLE IF NOT EXISTS reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL, -- 'comment', 'manga', 'user'
    target_id UUID NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول متابعة القراءة
CREATE TABLE IF NOT EXISTS reading_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    manga_id UUID NOT NULL REFERENCES manga(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
    chapter_number NUMERIC,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, manga_id)
);

-- إنشاء الفهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_manga_id ON user_favorites(manga_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_submissions_user_id ON content_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_content_submissions_status ON content_submissions(status);
CREATE INDEX IF NOT EXISTS idx_reports_target_type_id ON reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id ON reading_progress(user_id);

-- دوال مساعدة لإدارة المفضلة
CREATE OR REPLACE FUNCTION toggle_favorite(user_id_param UUID, manga_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    favorite_exists BOOLEAN;
BEGIN
    -- التحقق من وجود المفضلة
    SELECT EXISTS(
        SELECT 1 FROM user_favorites 
        WHERE user_id = user_id_param AND manga_id = manga_id_param
    ) INTO favorite_exists;
    
    IF favorite_exists THEN
        -- حذف من المفضلة
        DELETE FROM user_favorites 
        WHERE user_id = user_id_param AND manga_id = manga_id_param;
        RETURN FALSE;
    ELSE
        -- إضافة للمفضلة
        INSERT INTO user_favorites (user_id, manga_id) 
        VALUES (user_id_param, manga_id_param);
        RETURN TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- دالة لإنشاء إشعار
CREATE OR REPLACE FUNCTION create_notification(
    user_id_param UUID,
    type_param TEXT,
    title_param TEXT,
    message_param TEXT,
    data_param JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (user_id_param, type_param, title_param, message_param, data_param)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- دالة للحصول على دور المستخدم
CREATE OR REPLACE FUNCTION get_user_role(user_id_param UUID)
RETURNS user_role AS $$
DECLARE
    user_role_result user_role;
BEGIN
    SELECT role INTO user_role_result
    FROM profiles
    WHERE user_id = user_id_param;
    
    RETURN COALESCE(user_role_result, 'user'::user_role);
END;
$$ LANGUAGE plpgsql;

-- دالة للتحقق من الصلاحيات
CREATE OR REPLACE FUNCTION has_permission(user_id_param UUID, permission_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role_val user_role;
BEGIN
    SELECT get_user_role(user_id_param) INTO user_role_val;
    
    CASE permission_type
        WHEN 'can_submit_content' THEN
            RETURN user_role_val IN ('beginner_fighter', 'elite_fighter', 'leader', 'admin');
        WHEN 'can_moderate_comments' THEN
            RETURN user_role_val IN ('elite_fighter', 'leader', 'admin');
        WHEN 'can_ban_users' THEN
            RETURN user_role_val IN ('elite_fighter', 'leader', 'admin');
        WHEN 'can_publish_directly' THEN
            RETURN user_role_val IN ('leader', 'admin');
        WHEN 'can_manage_users' THEN
            RETURN user_role_val = 'admin';
        WHEN 'can_assign_roles' THEN
            RETURN user_role_val = 'admin';
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- تحديث آخر نشاط للمستخدم
CREATE OR REPLACE FUNCTION update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles 
    SET last_active = NOW() 
    WHERE user_id = auth.uid();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ترايجر لتحديث النشاط عند تسجيل الدخول
-- CREATE OR REPLACE TRIGGER update_activity_trigger
--     AFTER INSERT OR UPDATE ON auth.sessions
--     FOR EACH ROW EXECUTE FUNCTION update_user_activity();

-- سياسات الأمان (RLS)
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

-- سياسات المفضلة
CREATE POLICY "Users can manage their own favorites" ON user_favorites
    FOR ALL USING (auth.uid() = user_id);

-- سياسات الإشعارات
CREATE POLICY "Users can read their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can create notifications" ON notifications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'leader')
        )
    );

-- سياسات طلبات المحتوى
CREATE POLICY "Users can submit content" ON content_submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their submissions" ON content_submissions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Moderators can review submissions" ON content_submissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'leader', 'elite_fighter')
        )
    );

-- سياسات البلاغات
CREATE POLICY "Users can create reports" ON reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their reports" ON reports
    FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Moderators can manage reports" ON reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'leader', 'elite_fighter')
        )
    );

-- سياسات تقدم القراءة
CREATE POLICY "Users can manage their reading progress" ON reading_progress
    FOR ALL USING (auth.uid() = user_id);

-- إدراج بعض البيانات التجريبية للأدوار
INSERT INTO profiles (user_id, role, display_name) 
VALUES 
(gen_random_uuid(), 'admin', 'مدير الموقع')
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON TABLE user_favorites IS 'جدول المانجا المفضلة للمستخدمين';
COMMENT ON TABLE notifications IS 'جدول الإشعارات';
COMMENT ON TABLE content_submissions IS 'جدول طلبات المحتوى من المقاتلين المبتدئين';
COMMENT ON TABLE reports IS 'جدول البلاغات';
COMMENT ON TABLE reading_progress IS 'جدول متابعة تقدم القراءة';
