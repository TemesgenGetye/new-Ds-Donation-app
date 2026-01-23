-- Fixed migration - removed foreign key references
-- Run this in your new Supabase project SQL editor

-- Create messages table (without foreign keys since campaigns/donations are in separate DBs)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID, -- Reference to campaign (no FK - campaigns in separate DB)
  donation_id UUID, -- Reference to donation (no FK - donations in separate DB)
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON messages(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_donation_id ON messages(donation_id) WHERE donation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read) WHERE read = false;

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running)
DROP POLICY IF EXISTS "Users can read their own messages" ON messages;
DROP POLICY IF EXISTS "Users can create messages as sender" ON messages;
DROP POLICY IF EXISTS "Users can update messages they received" ON messages;
DROP POLICY IF EXISTS "Users can delete their sent messages" ON messages;

-- RLS Policies for messages table

-- Policy: Users can read messages where they are sender or receiver
CREATE POLICY "Users can read their own messages"
  ON messages
  FOR SELECT
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id
  );

-- Policy: Users can insert messages where they are the sender
CREATE POLICY "Users can create messages as sender"
  ON messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Policy: Users can update messages where they are the receiver (to mark as read)
CREATE POLICY "Users can update messages they received"
  ON messages
  FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Policy: Users can delete their own sent messages
CREATE POLICY "Users can delete their sent messages"
  ON messages
  FOR DELETE
  USING (auth.uid() = sender_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (for re-running)
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messages_updated_at();

-- Create storage bucket for message attachments (if needed for future)
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist (for re-running)
DROP POLICY IF EXISTS "Users can upload message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their message attachments" ON storage.objects;

-- Storage policies for message attachments
CREATE POLICY "Users can upload message attachments"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'message-attachments' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view message attachments"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'message-attachments' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their message attachments"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'message-attachments' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their message attachments"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'message-attachments' AND
    auth.role() = 'authenticated'
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON messages TO anon, authenticated;

COMMENT ON TABLE messages IS 'Chat messages between users, linked to campaigns or donations';
COMMENT ON COLUMN messages.campaign_id IS 'Optional: Link message to a campaign (UUID reference, no FK)';
COMMENT ON COLUMN messages.donation_id IS 'Optional: Link message to a donation (UUID reference, no FK)';
COMMENT ON COLUMN messages.sender_id IS 'User ID of the message sender';
COMMENT ON COLUMN messages.receiver_id IS 'User ID of the message receiver';
COMMENT ON COLUMN messages.read IS 'Whether the message has been read by the receiver';
