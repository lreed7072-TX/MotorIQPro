/*
  # Add SELECT policy for users table
  
  1. Changes
    - Adds a policy to allow all authenticated users to view other users
    - This is necessary for assigning work orders to technicians and viewing team members
    
  2. Security
    - Only allows SELECT operations
    - Users can see basic information about other users (name, role, phone) for work coordination
*/

-- Create the SELECT policy for all authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'All authenticated users can view users'
  ) THEN
    EXECUTE 'CREATE POLICY "All authenticated users can view users"
      ON users FOR SELECT
      TO authenticated
      USING (true)';
  END IF;
END $$;
