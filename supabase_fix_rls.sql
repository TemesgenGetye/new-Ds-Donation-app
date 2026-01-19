-- Fix RLS policies for profile updates
-- This script adds the necessary policies to allow users to update their own profile

-- 1. Enable RLS on profiles table if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing policies that might conflict
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to upload verification images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to verification images" ON storage.objects;

-- 3. Create a comprehensive policy for users to manage their own profile
CREATE POLICY "Users can manage own profile"
ON public.profiles
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Create a policy for storage access to verification bucket
-- This allows authenticated users to upload to the verification bucket
CREATE POLICY "Allow authenticated users to upload verification images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'verification' 
  AND auth.role() = 'authenticated'
);

-- 5. Create a policy for storage access to read verification images
CREATE POLICY "Allow public read access to verification images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'verification');

-- 6. Create a policy for storage access to update verification images (if needed)
CREATE POLICY "Allow authenticated users to update verification images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'verification' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'verification' AND auth.role() = 'authenticated');

-- Create enum types if not exist
DO $$ BEGIN
  CREATE TYPE report_type AS ENUM ('user', 'donation', 'campaign', 'request');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'dismissed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Create the reports table if not exists
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES profiles(id) NOT NULL,
  reported_id uuid NOT NULL,
  type report_type NOT NULL,
  reason text NOT NULL,
  description text,
  status report_status DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Policy: Any authenticated user can insert a report
CREATE POLICY IF NOT EXISTS "Users can insert reports" ON reports
  FOR INSERT USING (auth.uid() = reporter_id);

-- Policy: Admins can select, update, and delete reports
CREATE POLICY IF NOT EXISTS "Admins can manage reports" ON reports
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY IF NOT EXISTS "Admins can update reports" ON reports
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY IF NOT EXISTS "Admins can delete reports" ON reports
  FOR DELETE USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
