-- Add admin policy for profiles access
-- This allows admins to read all profiles for the reports page

CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Also add admin policy for reports to allow admins to read all reports
CREATE POLICY "Admins can read all reports"
  ON reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  ); 