-- إضافة عمود is_spoiler إلى جدول التعليقات إذا لم يكن موجوداً
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_spoiler BOOLEAN DEFAULT FALSE;

-- إضافة عمود formatting_style لأنماط الكتابة
ALTER TABLE comments ADD COLUMN IF NOT EXISTS formatting_style JSONB DEFAULT '{}';

-- إضافة عمود rich_content للمحتوى المنسق
ALTER TABLE comments ADD COLUMN IF NOT EXISTS rich_content JSONB DEFAULT NULL;

-- إضافة فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_comments_spoiler ON comments(is_spoiler) WHERE is_spoiler = true;
CREATE INDEX IF NOT EXISTS idx_comments_formatting ON comments USING GIN(formatting_style) WHERE formatting_style != '{}';

-- تحديث التعليقات الموجودة لضمان عدم وجود قيم null
UPDATE comments SET is_spoiler = FALSE WHERE is_spoiler IS NULL;
UPDATE comments SET formatting_style = '{}' WHERE formatting_style IS NULL;

-- إنشاء جدول لتفاعلات التعليقات (إعجاب، عدم إعجاب)
CREATE TABLE IF NOT EXISTS comment_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike', 'love', 'laugh', 'angry', 'sad')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, COALESCE(user_id, session_id), reaction_type)
);

-- تمكين RLS للجدول الجديد
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان للتفاعلات
CREATE POLICY "Users can view all reactions" 
ON comment_reactions FOR SELECT 
USING (true);

CREATE POLICY "Users can manage their own reactions" 
ON comment_reactions FOR ALL 
USING (
  (user_id = auth.uid()) OR 
  (user_id IS NULL AND session_id IS NOT NULL)
);

-- إنشاء مشاهدة لعد التفاعلات
CREATE OR REPLACE VIEW comment_reactions_summary AS
SELECT 
  comment_id,
  reaction_type,
  COUNT(*) as count
FROM comment_reactions
GROUP BY comment_id, reaction_type;

-- إنشاء دالة لتحديث أوقات التعديل
CREATE OR REPLACE FUNCTION update_comment_reactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء مشغل لتحديث أوقات التعديل
CREATE TRIGGER update_comment_reactions_updated_at
  BEFORE UPDATE ON comment_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_reactions_updated_at();