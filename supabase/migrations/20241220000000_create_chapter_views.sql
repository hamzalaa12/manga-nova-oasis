-- Create chapter_views table if it doesn't exist
CREATE TABLE IF NOT EXISTS chapter_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index to prevent duplicate views per user/session
CREATE UNIQUE INDEX IF NOT EXISTS idx_chapter_views_user 
ON chapter_views(chapter_id, user_id) 
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chapter_views_session 
ON chapter_views(chapter_id, session_id) 
WHERE session_id IS NOT NULL AND user_id IS NULL;

-- Add views_count column to chapters table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'chapters' AND column_name = 'views_count') THEN
    ALTER TABLE chapters ADD COLUMN views_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create trigger function to update chapter views count
CREATE OR REPLACE FUNCTION update_chapter_views_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chapters 
    SET views_count = views_count + 1,
        updated_at = NOW()
    WHERE id = NEW.chapter_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chapters 
    SET views_count = GREATEST(views_count - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.chapter_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for chapter views
DROP TRIGGER IF EXISTS trigger_update_chapter_views_count ON chapter_views;
CREATE TRIGGER trigger_update_chapter_views_count
  AFTER INSERT OR DELETE ON chapter_views
  FOR EACH ROW
  EXECUTE FUNCTION update_chapter_views_count();

-- Enable RLS
ALTER TABLE chapter_views ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view chapter views" 
ON chapter_views FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert chapter views" 
ON chapter_views FOR INSERT 
WITH CHECK (true);

-- Update existing chapters views count (one-time sync)
UPDATE chapters 
SET views_count = (
  SELECT COUNT(*) 
  FROM chapter_views 
  WHERE chapter_views.chapter_id = chapters.id
)
WHERE views_count IS NULL OR views_count = 0;
