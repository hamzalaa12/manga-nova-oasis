-- Create table to track manga views by users
CREATE TABLE public.manga_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manga_id UUID NOT NULL REFERENCES public.manga(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT, -- للمستخدمين غير المسجلين
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicate views
CREATE UNIQUE INDEX idx_manga_views_user_unique 
ON public.manga_views (manga_id, user_id) 
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX idx_manga_views_session_unique 
ON public.manga_views (manga_id, session_id) 
WHERE session_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.manga_views ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own manga views" 
ON public.manga_views 
FOR SELECT 
USING (user_id = auth.uid() OR session_id IS NOT NULL);

CREATE POLICY "Users can insert their own manga views" 
ON public.manga_views 
FOR INSERT 
WITH CHECK (user_id = auth.uid() OR session_id IS NOT NULL);