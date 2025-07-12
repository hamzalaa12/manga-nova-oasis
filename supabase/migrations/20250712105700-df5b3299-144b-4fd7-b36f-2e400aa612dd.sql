-- Add new columns to chapters table for premium features
ALTER TABLE public.chapters 
ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN price DECIMAL(10,2) DEFAULT NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.chapters.is_premium IS 'Whether this chapter requires payment';
COMMENT ON COLUMN public.chapters.is_private IS 'Whether this chapter is private/draft';
COMMENT ON COLUMN public.chapters.price IS 'Price for premium chapters in USD';