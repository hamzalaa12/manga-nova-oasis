-- جداول نظام التعليقات المحسن

-- جدول التفاعلات مع التعليقات (محسن)
CREATE TABLE IF NOT EXISTS comment_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike', 'love', 'laugh', 'angry', 'sad', 'wow', 'fire', 'star')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- جدول البلاغات ضد التعليقات
CREATE TABLE IF NOT EXISTS comment_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  resolution_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول الإشعارات للتعليقات
CREATE TABLE IF NOT EXISTS comment_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  manga_id UUID REFERENCES manga(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('comment_reply', 'comment_reaction', 'comment_mentioned', 'comment_pinned', 'comment_reported')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول إعدادات الإشعارات
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  comment_replies BOOLEAN DEFAULT TRUE,
  comment_reactions BOOLEAN DEFAULT TRUE,
  comment_mentions BOOLEAN DEFAULT TRUE,
  comment_moderations BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT FALSE,
  push_notifications BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول المفضلة للتعليقات
CREATE TABLE IF NOT EXISTS comment_bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- جدول مشاهدات التعليقات
CREATE TABLE IF NOT EXISTS comment_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- جدول المستخدمين المحظورين
CREATE TABLE IF NOT EXISTS banned_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  banned_by UUID NOT NULL REFERENCES auth.users(id),
  banned_until TIMESTAMP WITH TIME ZONE,
  is_permanent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تحديث جدول التعليقات لإضافة حقول جديدة
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS is_reported BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS report_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS hidden_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS hidden_reason TEXT;

-- إضافة فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON comment_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_status ON comment_reports(status);
CREATE INDEX IF NOT EXISTS idx_comment_reports_comment_id ON comment_reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_notifications_user_id ON comment_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_notifications_is_read ON comment_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_comment_bookmarks_user_id ON comment_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_views_comment_id ON comment_views(comment_id);
CREATE INDEX IF NOT EXISTS idx_banned_users_user_id ON banned_users(user_id);

-- إضافة RLS policies

-- comment_reactions policies
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all reactions" ON comment_reactions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own reactions" ON comment_reactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions" ON comment_reactions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions" ON comment_reactions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- comment_reports policies
ALTER TABLE comment_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert reports" ON comment_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own reports" ON comment_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Moderators can view all reports" ON comment_reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('elite_fighter', 'tribe_leader', 'admin', 'site_admin')
    )
  );

CREATE POLICY "Moderators can update reports" ON comment_reports
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('tribe_leader', 'admin', 'site_admin')
    )
  );

-- comment_notifications policies
ALTER TABLE comment_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON comment_notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON comment_notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON comment_notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON comment_notifications
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- notification_settings policies
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own settings" ON notification_settings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- comment_bookmarks policies
ALTER TABLE comment_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bookmarks" ON comment_bookmarks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- comment_views policies
ALTER TABLE comment_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all views" ON comment_views
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert views" ON comment_views
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- banned_users policies
ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Moderators can view banned users" ON banned_users
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('elite_fighter', 'tribe_leader', 'admin', 'site_admin')
    )
  );

CREATE POLICY "Moderators can manage bans" ON banned_users
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('elite_fighter', 'tribe_leader', 'admin', 'site_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('elite_fighter', 'tribe_leader', 'admin', 'site_admin')
    )
  );

-- إضافة triggers لتحديث الإحصائيات

-- Trigger لتحديث عداد البلاغات
CREATE OR REPLACE FUNCTION update_comment_report_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments 
    SET 
      report_count = COALESCE(report_count, 0) + 1,
      is_reported = TRUE
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments 
    SET 
      report_count = GREATEST(COALESCE(report_count, 0) - 1, 0),
      is_reported = CASE WHEN COALESCE(report_count, 0) - 1 <= 0 THEN FALSE ELSE TRUE END
    WHERE id = OLD.comment_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comment_report_count_trigger
  AFTER INSERT OR DELETE ON comment_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_report_count();

-- إضافة دالة للتحقق من حالة الحظر
CREATE OR REPLACE FUNCTION is_user_banned(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM banned_users 
    WHERE banned_users.user_id = is_user_banned.user_id
    AND (
      is_permanent = TRUE 
      OR banned_until > NOW()
    )
  );
END;
$$ LANGUAGE plpgsql;

-- إضافة دالة لإنشاء الإشعارات تلقائياً
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  parent_comment comments%ROWTYPE;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- إشعار للرد على التعليق
  IF NEW.parent_id IS NOT NULL THEN
    SELECT * INTO parent_comment FROM comments WHERE id = NEW.parent_id;
    
    IF parent_comment.user_id != NEW.user_id THEN
      SELECT display_name INTO notification_title FROM profiles WHERE id = NEW.user_id;
      notification_message := 'رد ' || COALESCE(notification_title, 'شخص ما') || ' على تعليقك';
      
      INSERT INTO comment_notifications (
        user_id,
        from_user_id,
        comment_id,
        chapter_id,
        manga_id,
        type,
        title,
        message,
        metadata
      ) VALUES (
        parent_comment.user_id,
        NEW.user_id,
        NEW.id,
        NEW.chapter_id,
        NEW.manga_id,
        'comment_reply',
        'رد جديد على تعليقك',
        notification_message,
        jsonb_build_object('parent_comment_id', parent_comment.id)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comment_notification_trigger
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notification();

-- إضافة دالة لإنشاء إشعارات التفاعل
CREATE OR REPLACE FUNCTION create_reaction_notification()
RETURNS TRIGGER AS $$
DECLARE
  comment_owner UUID;
  reactor_name TEXT;
  reaction_label TEXT;
BEGIN
  -- الحصول على صاحب التعليق
  SELECT user_id INTO comment_owner FROM comments WHERE id = NEW.comment_id;
  
  -- عدم إرسال إشعار للمستخدم نفسه
  IF comment_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- الحصول على اسم المتفاعل
  SELECT display_name INTO reactor_name FROM profiles WHERE id = NEW.user_id;
  
  -- تحديد نوع التفاعل
  CASE NEW.reaction_type
    WHEN 'like' THEN reaction_label := 'أعجب';
    WHEN 'love' THEN reaction_label := 'أحب';
    WHEN 'laugh' THEN reaction_label := 'ضحك على';
    WHEN 'angry' THEN reaction_label := 'غضب من';
    WHEN 'sad' THEN reaction_label := 'حزن على';
    ELSE reaction_label := 'تفاعل مع';
  END CASE;
  
  INSERT INTO comment_notifications (
    user_id,
    from_user_id,
    comment_id,
    type,
    title,
    message,
    metadata
  ) VALUES (
    comment_owner,
    NEW.user_id,
    NEW.comment_id,
    'comment_reaction',
    'تفاعل جديد على تعليقك',
    COALESCE(reactor_name, 'شخص ما') || ' ' || reaction_label || ' تعليقك',
    jsonb_build_object('reaction_type', NEW.reaction_type)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reaction_notification_trigger
  AFTER INSERT ON comment_reactions
  FOR EACH ROW
  EXECUTE FUNCTION create_reaction_notification();
