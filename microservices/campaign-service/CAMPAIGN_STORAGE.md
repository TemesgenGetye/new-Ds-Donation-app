# Campaign Service - Storage and Data Flow

## ✅ Yes! Creating a Campaign Will Add Data to the New Database

When you create a campaign through the `campaign-service`:

1. **Data goes to Campaign Database** (xhkixkkslqvhkzsxddge.supabase.co)
   - The campaign record is stored in the `campaigns` table
   - All campaign data (title, description, goal_amount, etc.) is saved there

2. **Images go to Campaign Storage Bucket**
   - Campaign images are uploaded to the `campaigns` storage bucket
   - The `image_url` in the campaign record points to the image in storage

## Storage Bucket Setup

The migration includes a **`campaigns` storage bucket** for campaign images.

### Bucket Configuration:
- **Bucket ID**: `campaigns`
- **Public**: Yes (anyone can view images)
- **Location**: Same Supabase project as campaigns table

### Storage Policies:

1. **Upload Images** ✅
   - Authenticated users can upload campaign images
   - Policy: `"Authenticated users can upload campaign images"`

2. **View Images** ✅
   - Anyone can view campaign images (public bucket)
   - Policy: `"Anyone can view campaign images"`

3. **Update Images** ✅
   - Users can update their own uploaded images
   - Policy: `"Users can update own campaign images"`

4. **Delete Images** ✅
   - Users can delete their own uploaded images
   - Policy: `"Users can delete own campaign images"`

## How It Works

### Creating a Campaign with Image:

```
1. User uploads image
   ↓
2. Image stored in 'campaigns' bucket (Campaign Database)
   ↓
3. Get image URL from storage
   ↓
4. Create campaign record with image_url
   ↓
5. Campaign saved to 'campaigns' table (Campaign Database)
```

### Example Code Flow:

```typescript
// 1. Upload image to storage bucket
const { data: imageData, error: uploadError } = await supabase
  .storage
  .from('campaigns')  // Campaign storage bucket
  .upload(`campaigns/${campaignId}/${filename}`, imageFile);

// 2. Get public URL
const { data: { publicUrl } } = supabase
  .storage
  .from('campaigns')
  .getPublicUrl(imageData.path);

// 3. Create campaign with image_url
const { data: campaign } = await supabase
  .from('campaigns')
  .insert({
    title: 'My Campaign',
    description: '...',
    image_url: publicUrl,  // Points to storage bucket
    // ... other fields
  });
```

## Storage Bucket URL Structure

Images will be stored at:
```
https://xhkixkkslqvhkzsxddge.supabase.co/storage/v1/object/public/campaigns/{path}
```

Example:
```
https://xhkixkkslqvhkzsxddge.supabase.co/storage/v1/object/public/campaigns/campaigns/123e4567-e89b-12d3-a456-426614174000/image.jpg
```

## Important Notes

✅ **Campaign data** → Campaign Database (`campaigns` table)
✅ **Campaign images** → Campaign Database (`campaigns` storage bucket)
✅ **Everything is in the same Supabase project** (xhkixkkslqvhkzsxddge.supabase.co)

❌ Campaign data/images are **NOT** in the main database
❌ They are completely separate from donations, requests, messages

## After Running Migration

After you run the migration SQL in your new Supabase database:

1. ✅ `campaigns` table will be created
2. ✅ `campaigns` storage bucket will be created
3. ✅ Storage policies will be set up
4. ✅ You can start creating campaigns with images!

## Testing

To test that everything works:

1. **Create a campaign** via campaign-service API
2. **Check Campaign Database** - you should see the campaign in `campaigns` table
3. **Upload an image** - it should go to `campaigns` storage bucket
4. **Verify image URL** - the `image_url` in campaign should point to the storage bucket
