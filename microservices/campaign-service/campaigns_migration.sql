-- Migration to create campaigns table in the new Supabase database
-- This is a copy of the campaigns table structure for campaign-service

-- Create campaign status enum
CREATE TYPE campaign_status AS ENUM ('pending', 'active', 'paused', 'completed', 'rejected');

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  goal_amount numeric(10, 2),
  collected_amount numeric(10, 2) DEFAULT 0,
  category text NOT NULL,
  location text NOT NULL,
  image_url text,
  status campaign_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaigns
-- Allow anyone to read active campaigns
CREATE POLICY "Anyone can read active campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (status = 'active' OR recipient_id = auth.uid());

-- Allow recipients to manage their own campaigns
CREATE POLICY "Recipients can manage own campaigns"
  ON campaigns
  FOR ALL
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Allow donors to update collected_amount for any campaign
CREATE POLICY "Donors can update campaign collected amount"
  ON campaigns
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow admins to manage all campaigns
CREATE POLICY "Admins can manage all campaigns"
  ON campaigns
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaigns_recipient_id ON campaigns(recipient_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_category ON campaigns(category);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for campaigns table
ALTER PUBLICATION supabase_realtime ADD TABLE campaigns;

-- ============================================
-- STORAGE BUCKET FOR CAMPAIGN IMAGES
-- ============================================

-- Create storage bucket for campaign images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('campaigns', 'campaigns', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for campaign images
-- Allow authenticated users to upload campaign images
-- Also allow service role for backend uploads
CREATE POLICY "Authenticated users can upload campaign images"
  ON storage.objects
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (bucket_id = 'campaigns');

-- Alternative: Allow public uploads (less secure but easier for testing)
-- Uncomment if you want to allow anyone to upload (not recommended for production)
-- CREATE POLICY "Public can upload campaign images"
--   ON storage.objects
--   FOR INSERT
--   TO public
--   WITH CHECK (bucket_id = 'campaigns');

-- Allow anyone to view campaign images (public bucket)
CREATE POLICY "Anyone can view campaign images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'campaigns');

-- Allow users to update their own uploaded campaign images
CREATE POLICY "Users can update own campaign images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'campaigns' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own uploaded campaign images
CREATE POLICY "Users can delete own campaign images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'campaigns' AND auth.uid()::text = (storage.foldername(name))[1]);
