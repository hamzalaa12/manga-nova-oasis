-- Create ads table
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ads_is_active ON public.ads(is_active);
CREATE INDEX IF NOT EXISTS idx_ads_created_at ON public.ads(created_at DESC);

-- Add RLS (Row Level Security)
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Policy for admins to manage ads
CREATE POLICY "Admins can manage ads" ON public.ads
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role IN ('admin', 'site_admin')
        )
    );

-- Policy for everyone to view active ads
CREATE POLICY "Everyone can view active ads" ON public.ads
    FOR SELECT
    USING (is_active = true);

-- Policy for updating click count (public can update click_count)
CREATE POLICY "Public can update click count" ON public.ads
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_ads_updated_at
    BEFORE UPDATE ON public.ads
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Insert some sample ads (optional)
INSERT INTO public.ads (title, description, url, reward_points, duration_seconds, is_active) VALUES
('دعم الموقع', 'ادعم موقعنا للحصول على محتوى أفضل', 'https://ko-fi.com/mangafas', 10, 5, true),
('متجر الكتب', 'اكتشف أفضل الكتب والمانجا', 'https://bookstore.example.com', 5, 3, true),
('تطبيق القراءة', 'حمل تطبيقنا لتجربة قراءة أفضل', 'https://app.mangafas.com', 15, 10, false);
