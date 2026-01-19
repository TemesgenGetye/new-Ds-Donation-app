-- Enable realtime for profiles table
-- This allows real-time updates when profile data changes

ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Enable realtime for campaigns table as well for consistency
ALTER PUBLICATION supabase_realtime ADD TABLE campaigns;

-- Enable realtime for reports table
ALTER PUBLICATION supabase_realtime ADD TABLE reports; 