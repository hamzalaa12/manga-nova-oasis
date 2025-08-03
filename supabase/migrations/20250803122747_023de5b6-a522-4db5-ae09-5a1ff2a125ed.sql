-- إنشاء bucket للصور الشخصية
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- إنشاء policies للصور الشخصية
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- تحديث جدول comments ليدعم الردود
ALTER TABLE comments ADD COLUMN parent_id uuid REFERENCES comments(id);
ALTER TABLE comments ADD COLUMN is_pinned boolean NOT NULL DEFAULT false;

-- إنشاء جدول الإشعارات الشخصية
CREATE TABLE user_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS على جدول الإشعارات
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Policies للإشعارات
CREATE POLICY "Users can view their own notifications" 
ON user_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON user_notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- جدول اشتراكات الإشعارات
CREATE TABLE notification_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  manga_id uuid NOT NULL REFERENCES manga(id) ON DELETE CASCADE,
  notify_new_chapters boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, manga_id)
);

-- Enable RLS على جدول الاشتراكات
ALTER TABLE notification_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies للاشتراكات
CREATE POLICY "Users can manage their own subscriptions" 
ON notification_subscriptions 
FOR ALL 
USING (auth.uid() = user_id);

-- إضافة trigger لتحديث updated_at
CREATE TRIGGER update_user_notifications_updated_at
BEFORE UPDATE ON user_notifications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- إضافة فهارس لتحسين الأداء
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX idx_user_notifications_is_read ON user_notifications(is_read);
CREATE INDEX idx_notification_subscriptions_user_id ON notification_subscriptions(user_id);
CREATE INDEX idx_notification_subscriptions_manga_id ON notification_subscriptions(manga_id);

-- دالة لإنشاء إشعار شخصي
CREATE OR REPLACE FUNCTION create_user_notification(
  target_user_id uuid,
  notification_type text,
  notification_title text,
  notification_message text,
  notification_data jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO user_notifications (user_id, type, title, message, data)
  VALUES (target_user_id, notification_type, notification_title, notification_message, notification_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- دالة لإشعار المشتركين بفصل جديد
CREATE OR REPLACE FUNCTION notify_subscribers_new_chapter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  manga_title text;
  subscriber_record record;
BEGIN
  -- الحصول على عنوان المانجا
  SELECT title INTO manga_title FROM manga WHERE id = NEW.manga_id;
  
  -- إشعار جميع المشتركين
  FOR subscriber_record IN 
    SELECT user_id FROM notification_subscriptions 
    WHERE manga_id = NEW.manga_id AND notify_new_chapters = true
  LOOP
    PERFORM create_user_notification(
      subscriber_record.user_id,
      'new_chapter',
      'فصل جديد متاح!',
      format('تم نشر الفصل %s من %s', NEW.chapter_number, manga_title),
      jsonb_build_object(
        'manga_id', NEW.manga_id,
        'chapter_id', NEW.id,
        'chapter_number', NEW.chapter_number,
        'manga_title', manga_title
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- trigger لإشعار المشتركين عند إضافة فصل جديد
CREATE TRIGGER notify_new_chapter
AFTER INSERT ON chapters
FOR EACH ROW
EXECUTE FUNCTION notify_subscribers_new_chapter();