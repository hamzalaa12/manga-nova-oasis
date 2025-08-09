-- Add type column to ads table
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'ad';

-- Update existing rows to have default type
UPDATE public.ads SET type = 'ad' WHERE type IS NULL;

-- Add check constraint for type values
ALTER TABLE public.ads ADD CONSTRAINT check_ad_type CHECK (type IN ('ad', 'link'));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_ads_type ON public.ads(type);

-- Update some existing records to be links (optional - for demonstration)
-- UPDATE public.ads SET type = 'link' WHERE reward_points = 0 AND duration_seconds = 0 AND image_url IS NULL;
