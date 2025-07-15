-- Add slug column to chapters table
ALTER TABLE chapters ADD COLUMN slug TEXT;

-- Create unique index on slug within manga_id context
CREATE UNIQUE INDEX chapters_manga_slug_idx ON chapters(manga_id, slug);

-- Function to generate chapter slug
CREATE OR REPLACE FUNCTION generate_chapter_slug(chapter_title TEXT, chapter_number INTEGER, manga_id_val TEXT)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- If chapter has a title, use it for slug
    IF chapter_title IS NOT NULL AND LENGTH(TRIM(chapter_title)) > 0 THEN
        base_slug := LOWER(
            REGEXP_REPLACE(
                REGEXP_REPLACE(chapter_title, '[^\w\s\u0600-\u06FF-]', '', 'g'),
                '\s+', '-', 'g'
            )
        );
        -- Remove leading/trailing hyphens
        base_slug := TRIM(BOTH '-' FROM base_slug);
        
        -- If result is empty after processing, fall back to chapter number
        IF base_slug = '' THEN
            base_slug := 'chapter-' || chapter_number;
        END IF;
    ELSE
        -- No title, use chapter number
        base_slug := 'chapter-' || chapter_number;
    END IF;
    
    final_slug := base_slug;
    
    -- Check for uniqueness within the same manga and add counter if needed
    WHILE EXISTS (
        SELECT 1 FROM chapters 
        WHERE manga_id = manga_id_val AND slug = final_slug
    ) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Generate slugs for existing chapters
UPDATE chapters 
SET slug = generate_chapter_slug(title, chapter_number, manga_id) 
WHERE slug IS NULL;

-- Make slug NOT NULL after setting values
ALTER TABLE chapters ALTER COLUMN slug SET NOT NULL;

-- Create trigger to auto-generate slug for new chapters
CREATE OR REPLACE FUNCTION auto_generate_chapter_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := generate_chapter_slug(NEW.title, NEW.chapter_number, NEW.manga_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chapters_auto_slug
    BEFORE INSERT OR UPDATE ON chapters
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_chapter_slug();
