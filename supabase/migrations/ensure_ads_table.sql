-- Migration to ensure ads table exists with all required columns
-- This migration can be run multiple times safely

-- Create ads table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.ads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    image_url TEXT,
    reward_points INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    click_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    type VARCHAR(20) DEFAULT 'ad'
);

-- Add type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ads' AND column_name = 'type') THEN
        ALTER TABLE public.ads ADD COLUMN type VARCHAR(20) DEFAULT 'ad';
    END IF;
END $$;

-- Add check constraint for type values if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'check_ad_type') THEN
        ALTER TABLE public.ads ADD CONSTRAINT check_ad_type CHECK (type IN ('ad', 'link'));
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_ads_is_active ON public.ads(is_active);
CREATE INDEX IF NOT EXISTS idx_ads_created_at ON public.ads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ads_type ON public.ads(type);

-- Enable RLS
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage ads" ON public.ads;
DROP POLICY IF EXISTS "Everyone can view active ads" ON public.ads;
DROP POLICY IF EXISTS "Public can update click count" ON public.ads;

-- Recreate policies
CREATE POLICY "Admins can manage ads" ON public.ads
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role IN ('admin', 'site_admin')
        )
    );

CREATE POLICY "Everyone can view active ads" ON public.ads
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "Public can update click count" ON public.ads
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Create or replace updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS handle_ads_updated_at ON public.ads;
CREATE TRIGGER handle_ads_updated_at
    BEFORE UPDATE ON public.ads
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Create an RPC function to help with table initialization
CREATE OR REPLACE FUNCTION create_ads_table_if_not_exists()
RETURNS BOOLEAN AS $$
BEGIN
    -- Just return true since the table creation is handled above
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample data if table is empty
INSERT INTO public.ads (title, description, url, reward_points, duration_seconds, is_active, type)
SELECT * FROM (
    VALUES 
    ('دعم الموقع', 'ادعم موقعنا للحصول على محتوى أفضل', 'https://ko-fi.com/mangafas', 10, 5, true, 'ad'),
    ('راب�� سريع', 'رابط مفيد للمستخدمين', 'https://example.com', 0, 0, true, 'link'),
    ('متجر الكتب', 'اكتشف أفضل الكتب والمانجا', 'https://bookstore.example.com', 5, 3, true, 'ad')
) AS v(title, description, url, reward_points, duration_seconds, is_active, type)
WHERE NOT EXISTS (SELECT 1 FROM public.ads LIMIT 1);
