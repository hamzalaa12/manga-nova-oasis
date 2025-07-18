-- Add slug column to manga table
ALTER TABLE public.manga ADD COLUMN slug TEXT;

-- Create function to generate slug from title
CREATE OR REPLACE FUNCTION generate_slug(title TEXT)
RETURNS TEXT AS $$
DECLARE
    slug TEXT;
BEGIN
    -- Convert title to lowercase and replace spaces with hyphens
    slug := lower(trim(title));
    -- Replace Arabic/English spaces and special characters
    slug := regexp_replace(slug, '[^a-z0-9\u0600-\u06FF]+', '-', 'g');
    -- Remove leading/trailing hyphens
    slug := trim(slug, '-');
    -- Ensure slug is not empty
    IF slug = '' OR slug IS NULL THEN
        slug := 'untitled';
    END IF;
    
    RETURN slug;
END;
$$ LANGUAGE plpgsql;

-- Create function to ensure unique slug
CREATE OR REPLACE FUNCTION ensure_unique_slug(base_slug TEXT, manga_id UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    final_slug TEXT;
    counter INTEGER := 0;
    exists_count INTEGER;
BEGIN
    final_slug := base_slug;
    
    LOOP
        -- Check if slug exists (excluding current manga if updating)
        SELECT COUNT(*) INTO exists_count
        FROM public.manga 
        WHERE slug = final_slug 
        AND (manga_id IS NULL OR id != manga_id);
        
        -- If slug doesn't exist, we can use it
        IF exists_count = 0 THEN
            EXIT;
        END IF;
        
        -- If slug exists, add counter and try again
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to auto-generate slug
CREATE OR REPLACE FUNCTION auto_generate_manga_slug()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate slug only if it's not provided or if title changed
    IF NEW.slug IS NULL OR NEW.slug = '' OR (TG_OP = 'UPDATE' AND OLD.title != NEW.title AND NEW.slug = OLD.slug) THEN
        NEW.slug := ensure_unique_slug(generate_slug(NEW.title), NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_manga_slug ON public.manga;
CREATE TRIGGER trigger_auto_generate_manga_slug
    BEFORE INSERT OR UPDATE ON public.manga
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_manga_slug();

-- Update existing manga records to have slugs
UPDATE public.manga 
SET slug = ensure_unique_slug(generate_slug(title), id)
WHERE slug IS NULL OR slug = '';

-- Add unique constraint on slug
ALTER TABLE public.manga ADD CONSTRAINT manga_slug_unique UNIQUE (slug);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_manga_slug ON public.manga(slug);
