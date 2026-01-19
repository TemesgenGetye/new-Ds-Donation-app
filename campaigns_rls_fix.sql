-- Fix RLS policies for campaigns table
-- This script adds the missing RLS policies for the campaigns table

-- Enable RLS on campaigns table if not already enabled
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

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
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'donor'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'donor'
    )
  );

-- Allow admins to manage all campaigns
CREATE POLICY "Admins can manage all campaigns"
  ON campaigns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  ); 