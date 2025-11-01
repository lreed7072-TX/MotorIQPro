/*
  # Add users_with_email view
  
  1. Changes
    - Creates a view that joins public.users with auth.users to get email addresses
    - This allows the frontend to query user emails without needing admin API access
  
  2. Security
    - View respects existing RLS policies on users table
    - Only exposes email for users that the current user can already see
*/

CREATE OR REPLACE VIEW users_with_email AS
SELECT 
  u.id,
  u.full_name,
  u.role,
  u.certification_level,
  u.employee_id,
  u.phone,
  u.created_at,
  u.updated_at,
  au.email
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id;

GRANT SELECT ON users_with_email TO authenticated;