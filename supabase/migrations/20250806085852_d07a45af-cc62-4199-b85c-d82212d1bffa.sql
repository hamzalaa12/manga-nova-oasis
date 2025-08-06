-- Update profiles table to add banned_until column if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_until TIMESTAMP WITH TIME ZONE;