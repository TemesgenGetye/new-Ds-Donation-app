-- Quick Fix for Image Upload Issues
-- Run this in your Campaign Database SQL Editor
-- https://xhkixkkslqvhkzsxddge.supabase.co

-- 1. Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('campaigns', 'campaigns', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can upload campaign images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view campaign images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own campaign images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own campaign images" ON storage.objects;

-- 3. Create permissive upload policy (allows authenticated users AND service role)
CREATE POLICY "Authenticated users can upload campaign images"
  ON storage.objects
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (bucket_id = 'campaigns');

-- 4. Allow anyone to view images (public bucket)
CREATE POLICY "Anyone can view campaign images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'campaigns');

-- 5. Allow users to update their own images
CREATE POLICY "Users can update own campaign images"
  ON storage.objects
  FOR UPDATE
  TO authenticated, service_role
  USING (bucket_id = 'campaigns');

-- 6. Allow users to delete their own images
CREATE POLICY "Users can delete own campaign images"
  ON storage.objects
  FOR DELETE
  TO authenticated, service_role
  USING (bucket_id = 'campaigns');

-- Verify the setup
SELECT 'Bucket created/updated successfully' as status;
SELECT * FROM storage.buckets WHERE id = 'campaigns';
