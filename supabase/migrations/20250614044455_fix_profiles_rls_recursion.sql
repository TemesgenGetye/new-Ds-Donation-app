-- Fix infinite recursion in profiles RLS policies
-- The admin policy was causing infinite recursion because it was querying the profiles table
-- while the same policy was being applied to that query

-- Drop the problematic admin policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can read all reports" ON reports;

-- Create a better admin policy that doesn't cause recursion
-- We'll use a function to check admin status instead of direct query
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the current user has admin role in their profile
  -- This function bypasses RLS to avoid recursion
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new admin policies using the function
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR  -- Users can always read their own profile
    is_admin()          -- Admins can read all profiles
  );

CREATE POLICY "Admins can read all reports"
  ON reports
  FOR SELECT
  TO authenticated
  USING (
    reporter_id = auth.uid() OR  -- Users can read their own reports
    is_admin()                   -- Admins can read all reports
  );

-- Also fix the donations policy that might have similar issues
DROP POLICY IF EXISTS "Anyone can read available donations" ON donations;
CREATE POLICY "Anyone can read available donations"
  ON donations
  FOR SELECT
  TO authenticated
  USING (
    status = 'available' OR 
    donor_id = auth.uid() OR
    is_admin()
  ); 