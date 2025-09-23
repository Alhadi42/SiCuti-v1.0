-- Update the test user to confirm their email
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  confirmation_token = NULL,
  confirmation_sent_at = NULL,
  updated_at = NOW()
WHERE email = 'testadmin@example.com';

-- Verify the update
SELECT 
  id, 
  email, 
  email_confirmed_at, 
  confirmation_token,
  created_at,
  updated_at
FROM auth.users 
WHERE email = 'testadmin@example.com';
