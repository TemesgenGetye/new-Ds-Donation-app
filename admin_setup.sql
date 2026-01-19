-- Admin Approval System Setup
-- This script adds pending status to campaigns and donations for admin approval

-- 1. Update campaigns table to include pending status
ALTER TABLE public.campaigns 
DROP CONSTRAINT IF EXISTS campaigns_status_check;

ALTER TABLE public.campaigns 
ADD CONSTRAINT campaigns_status_check 
CHECK (status IN ('pending', 'active', 'paused', 'completed', 'rejected'));

-- Set default status to pending for new campaigns
ALTER TABLE public.campaigns 
ALTER COLUMN status SET DEFAULT 'pending';

-- 2. Update donations table to include pending status
ALTER TABLE public.donations 
DROP CONSTRAINT IF EXISTS donations_status_check;

ALTER TABLE public.donations 
ADD CONSTRAINT donations_status_check 
CHECK (status IN ('pending', 'available', 'claimed', 'completed', 'rejected'));

-- Set default status to pending for new donations
ALTER TABLE public.donations 
ALTER COLUMN status SET DEFAULT 'pending';

-- 3. Create RLS policies for admin access
-- Allow admins to view all profiles for verification approval
CREATE POLICY "Admins can view all profiles for verification"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow admins to update profile verification status
CREATE POLICY "Admins can update profile verification status"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow admins to view all campaigns for approval
CREATE POLICY "Admins can view all campaigns"
ON public.campaigns
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow admins to update campaign status
CREATE POLICY "Admins can update campaign status"
ON public.campaigns
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow admins to view all donations for approval
CREATE POLICY "Admins can view all donations"
ON public.donations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow admins to update donation status
CREATE POLICY "Admins can update donation status"
ON public.donations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 4. Update existing campaigns and donations to pending if they don't have a status
UPDATE public.campaigns 
SET status = 'pending' 
WHERE status IS NULL OR status NOT IN ('pending', 'active', 'paused', 'completed', 'rejected');

UPDATE public.donations 
SET status = 'pending' 
WHERE status IS NULL OR status NOT IN ('pending', 'available', 'claimed', 'completed', 'rejected'); 