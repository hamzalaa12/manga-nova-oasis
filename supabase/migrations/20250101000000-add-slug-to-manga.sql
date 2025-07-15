-- Add slug column to manga table
ALTER TABLE manga ADD COLUMN slug TEXT;

-- Create unique index on slug
CREATE UNIQUE INDEX manga_slug_idx ON manga(slug);

-- Function to generate slug from title
CREATE OR REPLACE FUNCTION generate_slug(title TEXT)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Convert title to slug (basic version)
    base_slug := LOWER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(title, '[^\w\s-]', '', 'g'),
            '\s+', '-', 'g'
        )
    );
    
    -- Remove leading/trailing hyphens
    base_slug := TRIM(BOTH '-' FROM base_slug);
    
    -- Ensure slug is not empty
    IF base_slug = '' THEN
        base_slug := 'manga';
    END IF;
    
    final_slug := base_slug;
    
    -- Check for uniqueness and add counter if needed
    WHILE EXISTS (SELECT 1 FROM manga WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Generate slugs for existing manga
UPDATE manga 
SET slug = generate_slug(title) 
WHERE slug IS NULL;

-- Make slug NOT NULL after setting values
ALTER TABLE manga ALTER COLUMN slug SET NOT NULL;

-- Create trigger to auto-generate slug for new manga
CREATE OR REPLACE FUNCTION auto_generate_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := generate_slug(NEW.title);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER manga_auto_slug
    BEFORE INSERT OR UPDATE ON manga
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_slug();
