-- Create storage bucket for chapter images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chapter-images', 'chapter-images', true);

-- Create policies for chapter images bucket
CREATE POLICY "Anyone can view chapter images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'chapter-images');

CREATE POLICY "Admins can upload chapter images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'chapter-images' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'::user_role
  )
);

CREATE POLICY "Admins can update chapter images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'chapter-images' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'::user_role
  )
);

CREATE POLICY "Admins can delete chapter images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'chapter-images' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'::user_role
  )
);