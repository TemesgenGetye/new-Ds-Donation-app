-- Migration script for request-service database
-- Run this in your new Supabase project SQL editor

-- Create request_status enum (drop first if exists to avoid errors)
DROP TYPE IF EXISTS request_status CASCADE;
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');

-- Create requests table
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID NOT NULL, -- Reference to donation (no FK - donations in separate DB)
  recipient_id UUID NOT NULL, -- Reference to profile (no FK - profiles in separate DB)
  message TEXT NOT NULL,
  status request_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(donation_id, recipient_id)
);

-- Create updated_at trigger function (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_requests_updated_at ON requests;
CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for requests table

-- Policy: Users can view their own requests (as recipient)
CREATE POLICY "Users can view their own requests as recipient"
  ON requests
  FOR SELECT
  USING (auth.uid() = recipient_id);

-- Policy: Users can view requests for their donations (as donor)
-- Note: Since donations are in a separate DB, we'll allow authenticated users to view all requests
-- In production, you might want to add additional validation
CREATE POLICY "Authenticated users can view all requests"
  ON requests
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Users can create requests (as recipient)
CREATE POLICY "Users can create requests"
  ON requests
  FOR INSERT
  WITH CHECK (auth.uid() = recipient_id);

-- Policy: Users can update their own requests (as recipient)
CREATE POLICY "Users can update their own requests"
  ON requests
  FOR UPDATE
  USING (auth.uid() = recipient_id);

-- Policy: Users can delete their own requests (as recipient)
CREATE POLICY "Users can delete their own requests"
  ON requests
  FOR DELETE
  USING (auth.uid() = recipient_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_requests_donation_id ON requests(donation_id);
CREATE INDEX IF NOT EXISTS idx_requests_recipient_id ON requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at DESC);

-- Grant necessary permissions
GRANT ALL ON requests TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
