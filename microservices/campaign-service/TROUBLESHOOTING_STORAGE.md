# Troubleshooting Image Upload Issues

## Common Issues and Solutions

### 1. ❌ "Bucket does not exist" Error

**Problem**: The storage bucket hasn't been created yet.

**Solution**:
1. Go to your Supabase dashboard: https://xhkixkkslqvhkzsxddge.supabase.co
2. Navigate to **Storage** in the left sidebar
3. Check if `campaigns` bucket exists
4. If not, run the migration SQL again, or create it manually:
   ```sql
   INSERT INTO storage.buckets (id, name, public) 
   VALUES ('campaigns', 'campaigns', true);
   ```

### 2. ❌ "New row violates row-level security policy" Error

**Problem**: Storage policies are blocking the upload.

**Solution**: The migration includes policies, but you might need to:
1. Check if policies exist in Supabase dashboard:
   - Go to **Storage** → **Policies** → `campaigns` bucket
2. If policies don't exist, run this SQL:
   ```sql
   -- Allow authenticated users to upload
   CREATE POLICY "Authenticated users can upload campaign images"
     ON storage.objects
     FOR INSERT
     TO authenticated, service_role
     WITH CHECK (bucket_id = 'campaigns');
   
   -- Allow public to view
   CREATE POLICY "Anyone can view campaign images"
     ON storage.objects
     FOR SELECT
     TO public
     USING (bucket_id = 'campaigns');
   ```

### 3. ❌ "Invalid API key" or "Unauthorized" Error

**Problem**: Using wrong Supabase credentials.

**Solution**: 
1. Check your `.env` file has:
   ```
   CAMPAIGN_SUPABASE_URL=https://xhkixkkslqvhkzsxddge.supabase.co
   CAMPAIGN_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
2. Restart the campaign-service:
   ```bash
   docker compose restart campaign-service
   ```

### 4. ❌ "Permission denied" Error

**Problem**: Storage policies are too restrictive.

**Solution**: For testing, you can temporarily allow public uploads:
```sql
-- Drop existing policy
DROP POLICY IF EXISTS "Authenticated users can upload campaign images" ON storage.objects;

-- Create more permissive policy (for testing only!)
CREATE POLICY "Public can upload campaign images"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'campaigns');
```

**⚠️ Warning**: This allows anyone to upload. Use only for testing!

### 5. ❌ Bucket exists but upload still fails

**Problem**: Bucket configuration issue.

**Solution**: 
1. Check bucket is public:
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'campaigns';
   ```
   Should show `public = true`

2. If not public, update it:
   ```sql
   UPDATE storage.buckets 
   SET public = true 
   WHERE id = 'campaigns';
   ```

## Quick Fix: Manual Bucket Creation

If the SQL migration isn't working, create the bucket manually:

1. Go to Supabase Dashboard → **Storage**
2. Click **New bucket**
3. Name: `campaigns`
4. Public bucket: **Yes** ✅
5. Click **Create bucket**

Then add the policies via SQL Editor:
```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload campaign images"
  ON storage.objects
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (bucket_id = 'campaigns');

-- Allow public to view
CREATE POLICY "Anyone can view campaign images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'campaigns');
```

## Testing the Upload

After fixing, test with this curl command:

```bash
# Test upload (replace with your actual file and credentials)
curl -X POST \
  'https://xhkixkkslqvhkzsxddge.supabase.co/storage/v1/object/campaigns/test.jpg' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: image/jpeg' \
  --data-binary @test.jpg
```

## Verify Everything is Set Up

Run this SQL to check:
```sql
-- Check bucket exists
SELECT * FROM storage.buckets WHERE id = 'campaigns';

-- Check policies exist
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%campaign%';
```

Both queries should return results.
