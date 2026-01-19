-- Simple fix: Remove all admin policies to prevent recursion
-- This allows the app to work while we figure out a better admin solution

-- Drop all problematic policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can read all reports" ON reports;

-- Ensure basic user policies are in place
CREATE POLICY IF NOT EXISTS "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Fix donations policy
DROP POLICY IF EXISTS "Anyone can read available donations" ON donations;
CREATE POLICY "Anyone can read available donations"
  ON donations
  FOR SELECT
  TO authenticated
  USING (status = 'available' OR donor_id = auth.uid());

-- Fix reports policy
DROP POLICY IF EXISTS "Users can read own reports" ON reports;
CREATE POLICY "Users can read own reports"
  ON reports
  FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid()); 