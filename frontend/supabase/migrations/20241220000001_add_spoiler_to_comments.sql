-- Add is_spoiler column to comments table
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_spoiler BOOLEAN DEFAULT FALSE;

-- Create index for spoiler comments
CREATE INDEX IF NOT EXISTS idx_comments_spoiler ON comments(is_spoiler) WHERE is_spoiler = true;

-- Update existing comments to have spoiler as false by default
UPDATE comments SET is_spoiler = FALSE WHERE is_spoiler IS NULL;
