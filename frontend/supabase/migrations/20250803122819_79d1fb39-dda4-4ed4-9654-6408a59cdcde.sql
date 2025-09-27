-- إصلاح المشاكل الأمنية للدوال الجديدة
-- إضافة search_path للدوال الجديدة

-- تحديث دالة create_user_notification
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
SET search_path = public
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

-- تحديث دالة notify_subscribers_new_chapter
CREATE OR REPLACE FUNCTION notify_subscribers_new_chapter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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