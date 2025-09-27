-- Create user roles enum with the requested roles
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM (
  'user',
  'beginner_fighter', 
  'elite_fighter',
  'tribe_leader',
  'admin',
  'site_admin'
);

-- Update profiles table to use the new role system
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;
ALTER TABLE public.profiles ADD COLUMN role user_role NOT NULL DEFAULT 'user';

-- Create user_restrictions table for managing user restrictions
CREATE TABLE IF NOT EXISTS public.user_restrictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restriction_type TEXT NOT NULL CHECK (restriction_type IN ('ban', 'comment_ban', 'upload_ban', 'temporary_restriction')),
  reason TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id, restriction_type)
);

-- Enable RLS on user_restrictions
ALTER TABLE public.user_restrictions ENABLE ROW LEVEL SECURITY;

-- Add banned_until column to profiles for legacy support  
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_until TIMESTAMP WITH TIME ZONE;

-- Create policies for user_restrictions
CREATE POLICY "Users can view their own restrictions" 
ON public.user_restrictions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all restrictions" 
ON public.user_restrictions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'site_admin', 'tribe_leader', 'elite_fighter')
  )
);

CREATE POLICY "Admins can create restrictions" 
ON public.user_restrictions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'site_admin', 'tribe_leader', 'elite_fighter')
  )
);

CREATE POLICY "Admins can update restrictions" 
ON public.user_restrictions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'site_admin', 'tribe_leader', 'elite_fighter')
  )
);

CREATE POLICY "Admins can delete restrictions" 
ON public.user_restrictions 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'site_admin', 'tribe_leader', 'elite_fighter')
  )
);

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION has_user_restriction(
  check_user_id UUID,
  restriction_type TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_restrictions
    WHERE user_id = check_user_id
    AND restriction_type = has_user_restriction.restriction_type
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to add user restriction
CREATE OR REPLACE FUNCTION add_user_restriction(
  target_user_id UUID,
  restriction_type TEXT,
  reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  current_user_role user_role;
BEGIN
  -- Check if current user has permission to add restrictions
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  IF current_user_role NOT IN ('admin', 'site_admin', 'tribe_leader', 'elite_fighter') THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions';
  END IF;
  
  -- Insert or update restriction
  INSERT INTO public.user_restrictions (user_id, restriction_type, reason, created_by, expires_at)
  VALUES (target_user_id, restriction_type, reason, auth.uid(), expires_at)
  ON CONFLICT (user_id, restriction_type)
  DO UPDATE SET
    reason = EXCLUDED.reason,
    created_by = EXCLUDED.created_by,
    expires_at = EXCLUDED.expires_at,
    is_active = true,
    created_at = now();
    
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to remove user restriction
CREATE OR REPLACE FUNCTION remove_user_restriction(
  target_user_id UUID,
  restriction_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  current_user_role user_role;
BEGIN
  -- Check if current user has permission to remove restrictions
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  IF current_user_role NOT IN ('admin', 'site_admin', 'tribe_leader', 'elite_fighter') THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions';
  END IF;
  
  -- Deactivate restriction
  UPDATE public.user_restrictions
  SET is_active = false
  WHERE user_id = target_user_id AND restriction_type = remove_user_restriction.restriction_type;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to delete user completely (for admins only)
CREATE OR REPLACE FUNCTION delete_user_completely(
  target_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  current_user_role user_role;
BEGIN
  -- Check if current user has permission to delete users
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  IF current_user_role NOT IN ('admin', 'site_admin') THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions';
  END IF;
  
  -- Delete user profile and related data
  DELETE FROM public.profiles WHERE user_id = target_user_id;
  DELETE FROM public.user_restrictions WHERE user_id = target_user_id;
  DELETE FROM public.favorites WHERE user_id = target_user_id;
  DELETE FROM public.reading_progress WHERE user_id = target_user_id;
  DELETE FROM public.comments WHERE user_id = target_user_id;
  DELETE FROM public.notifications WHERE user_id = target_user_id;
  DELETE FROM public.user_notifications WHERE user_id = target_user_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_restrictions_user_id ON public.user_restrictions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_restrictions_type_active ON public.user_restrictions(restriction_type, is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);