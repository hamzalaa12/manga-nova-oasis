-- إضافة الأعمدة المطلوبة لجدول التعليقات
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_spoiler BOOLEAN DEFAULT FALSE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS formatting_style JSONB DEFAULT '{}';
ALTER TABLE comments ADD COLUMN IF NOT EXISTS rich_content JSONB DEFAULT NULL;

-- إضافة فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_comments_spoiler ON comments(is_spoiler) WHERE is_spoiler = true;
CREATE INDEX IF NOT EXISTS idx_comments_formatting ON comments USING GIN(formatting_style) WHERE formatting_style != '{}';

-- تحديث التعليقات الموجودة
UPDATE comments SET is_spoiler = FALSE WHERE is_spoiler IS NULL;
UPDATE comments SET formatting_style = '{}' WHERE formatting_style IS NULL;

-- إنشاء جدول لتفاعلات التعليقات
CREATE TABLE IF NOT EXISTS comment_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike', 'love', 'laugh', 'angry', 'sad')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إضافة قيد التفرد بعد إنشاء الجدول
ALTER TABLE comment_reactions ADD CONSTRAINT unique_user_comment_reaction 
UNIQUE (comment_id, user_id, reaction_type);

ALTER TABLE comment_reactions ADD CONSTRAINT unique_session_comment_reaction 
UNIQUE (comment_id, session_id, reaction_type);

-- تمكين RLS
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان
CREATE POLICY "Users can view all reactions" 
ON comment_reactions FOR SELECT 
USING (true);

CREATE POLICY "Users can manage their own reactions" 
ON comment_reactions FOR ALL 
USING (
  (user_id = auth.uid()) OR 
  (user_id IS NULL AND session_id IS NOT NULL)
);

-- إنشاء دالة لتحديث أوقات التعديل
CREATE OR REPLACE FUNCTION update_comment_reactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء مشغل للتحديث
CREATE TRIGGER update_comment_reactions_updated_at
  BEFORE UPDATE ON comment_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_reactions_updated_at();