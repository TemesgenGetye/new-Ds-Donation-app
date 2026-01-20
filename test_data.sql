-- Test Data for Admin Approval System
-- This script creates test data to verify the admin dashboard works

-- 1. Create test users (you'll need to create these in auth first)
-- Then update their profiles:

-- Test recipient with verification request
UPDATE public.profiles 
SET 
  recipient_status = 'requested',
  verification_image_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
  role = 'recipient'
WHERE email = 'recipient@test.com';

-- Test recipient with pending campaign
UPDATE public.profiles 
SET 
  recipient_status = 'approved',
  role = 'recipient'
WHERE email = 'campaign@test.com';

-- Test donor with pending donation
UPDATE public.profiles 
SET role = 'donor'
WHERE email = 'donor@test.com';

-- 2. Create test campaigns (pending)
INSERT INTO public.campaigns (
  id,
  recipient_id,
  title,
  description,
  category,
  location,
  goal_amount,
  status,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  (SELECT id FROM public.profiles WHERE email = 'campaign@test.com' LIMIT 1),
  'Help with Medical Bills',
  'I need help paying for my medical treatment. Any amount would be greatly appreciated.',
  'Medical',
  'New York, NY',
  5000,
  'pending',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  (SELECT id FROM public.profiles WHERE email = 'campaign@test.com' LIMIT 1),
  'Education Fund',
  'I need help paying for my college tuition this semester.',
  'Education',
  'Los Angeles, CA',
  3000,
  'pending',
  NOW(),
  NOW()
);

-- 3. Create test donations (pending)
INSERT INTO public.donations (
  id,
  donor_id,
  title,
  description,
  category,
  location,
  status,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  (SELECT id FROM public.profiles WHERE email = 'donor@test.com' LIMIT 1),
  'Laptop for Student',
  'I have a gently used laptop that would be perfect for a student in need.',
  'Electronics',
  'Chicago, IL',
  'pending',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  (SELECT id FROM public.profiles WHERE email = 'donor@test.com' LIMIT 1),
  'Winter Clothing',
  'Warm winter jackets and clothing for families in need.',
  'Clothing',
  'Boston, MA',
  'pending',
  NOW(),
  NOW()
);

-- 4. Create admin user (if not exists)
-- First create the user in auth, then run:
UPDATE public.profiles 
SET role = 'admin'
WHERE email = 'admin@test.com'; 
