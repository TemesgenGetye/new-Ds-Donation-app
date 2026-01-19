/*
  # Create donation app database schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `full_name` (text)
      - `phone` (text, nullable)
      - `role` (enum: donor, recipient, admin)
      - `avatar_url` (text, nullable)
      - `location` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `donations`
      - `id` (uuid, primary key)
      - `donor_id` (uuid, references profiles)
      - `title` (text)
      - `description` (text)
      - `category` (text)
      - `location` (text)
      - `image_url` (text, nullable)
      - `status` (enum: available, claimed, completed)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `requests`
      - `id` (uuid, primary key)
      - `donation_id` (uuid, references donations)
      - `recipient_id` (uuid, references profiles)
      - `message` (text)
      - `status` (enum: pending, approved, rejected)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `ratings`
      - `id` (uuid, primary key)
      - `donation_id` (uuid, references donations)
      - `recipient_id` (uuid, references profiles)
      - `donor_id` (uuid, references profiles)
      - `rating` (integer, 1-5)
      - `comment` (text, nullable)
      - `created_at` (timestamp)
    
    - `reports`
      - `id` (uuid, primary key)
      - `reporter_id` (uuid, references profiles)
      - `reported_id` (uuid, references profiles)
      - `type` (enum: user, donation)
      - `reason` (text)
      - `description` (text, nullable)
      - `status` (enum: pending, reviewed, resolved)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for cross-user interactions (donations, requests, ratings)

  3. Storage
    - Create storage bucket for donation images and documents
    - Set up policies for authenticated users to upload files
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('donor', 'recipient', 'admin');
CREATE TYPE donation_status AS ENUM ('available', 'claimed', 'completed');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE report_type AS ENUM ('user', 'donation');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved');

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text,
  role user_role NOT NULL DEFAULT 'recipient',
  avatar_url text,
  location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create donations table
CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  location text NOT NULL,
  image_url text,
  status donation_status DEFAULT 'available',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create requests table
CREATE TABLE IF NOT EXISTS requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id uuid NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  status request_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(donation_id, recipient_id)
);

-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id uuid NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  donor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(donation_id, recipient_id)
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type report_type NOT NULL,
  reason text NOT NULL,
  description text,
  status report_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Donations policies
CREATE POLICY "Anyone can read available donations"
  ON donations
  FOR SELECT
  TO authenticated
  USING (status = 'available' OR donor_id = auth.uid());

CREATE POLICY "Donors can manage own donations"
  ON donations
  FOR ALL
  TO authenticated
  USING (donor_id = auth.uid())
  WITH CHECK (donor_id = auth.uid());

-- Requests policies
CREATE POLICY "Users can read requests for their donations or own requests"
  ON requests
  FOR SELECT
  TO authenticated
  USING (
    recipient_id = auth.uid() OR 
    donation_id IN (SELECT id FROM donations WHERE donor_id = auth.uid())
  );

CREATE POLICY "Recipients can create requests"
  ON requests
  FOR INSERT
  TO authenticated
  WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "Donors can update requests for their donations"
  ON requests
  FOR UPDATE
  TO authenticated
  USING (donation_id IN (SELECT id FROM donations WHERE donor_id = auth.uid()));

-- Ratings policies
CREATE POLICY "Users can read ratings for donations they're involved in"
  ON ratings
  FOR SELECT
  TO authenticated
  USING (
    recipient_id = auth.uid() OR 
    donor_id = auth.uid() OR
    donation_id IN (SELECT id FROM donations WHERE donor_id = auth.uid())
  );

CREATE POLICY "Recipients can create ratings for completed donations"
  ON ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    recipient_id = auth.uid() AND
    donation_id IN (
      SELECT d.id FROM donations d
      JOIN requests r ON d.id = r.donation_id
      WHERE r.recipient_id = auth.uid() AND r.status = 'approved'
    )
  );

-- Reports policies
CREATE POLICY "Users can read own reports"
  ON reports
  FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "Users can create reports"
  ON reports
  FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Create storage bucket for donations
INSERT INTO storage.buckets (id, name, public) 
VALUES ('donations', 'donations', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload donation images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'donations');

CREATE POLICY "Anyone can view donation images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'donations');

CREATE POLICY "Users can update own uploaded images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'donations' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own uploaded images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'donations' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_category ON donations(category);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_donation_id ON requests(donation_id);
CREATE INDEX IF NOT EXISTS idx_requests_recipient_id ON requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_ratings_donation_id ON ratings(donation_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donations_updated_at
  BEFORE UPDATE ON donations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();