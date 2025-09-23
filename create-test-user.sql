-- Create a test user with admin_unit role
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'testadmin@example.com',
    crypt('testpassword123', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"], "role": "admin_unit"}',
    '{"name": "Test Admin", "role": "admin_unit", "unit_kerja": "TEST_UNIT"}',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create a profile for the test user
INSERT INTO public.users (
    id,
    name,
    username,
    password,
    email,
    role,
    unit_kerja,
    status,
    created_at,
    updated_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Test Admin',
    'testadmin',
    crypt('testpassword123', gen_salt('bf')), -- Hashed password
    'testadmin@example.com',
    'admin_unit',  -- Fixed role value
    'TEST_UNIT',   -- unit_kerja value
    'active',      -- status value
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON TABLE public.leave_proposals TO authenticated;
GRANT ALL ON TABLE public.leave_proposal_items TO authenticated;

-- Output success message
SELECT 'Test user created successfully' as message;
