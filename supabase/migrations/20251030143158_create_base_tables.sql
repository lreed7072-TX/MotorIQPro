/*
  # Create Base Tables - Users, Customers, Manufacturers

  1. New Tables
    - `users` - Extended user profiles with roles and certifications
      - `id` (uuid, PK, FK to auth.users)
      - `full_name` (text)
      - `role` (enum: admin, supervisor, technician, viewer)
      - `certification_level` (text)
      - `employee_id` (text, unique)
      - `phone` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `customers` - Customer companies and contacts
      - `id` (uuid, PK)
      - `company_name` (text)
      - `contact_person` (text)
      - `email` (text)
      - `phone` (text)
      - `address` (jsonb)
      - `created_at` (timestamptz)
    
    - `manufacturers` - Equipment manufacturers
      - `id` (uuid, PK)
      - `name` (text, unique)
      - `contact_info` (jsonb)
      - `support_url` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on roles
*/

-- Create role enum
CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'technician', 'viewer');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'technician',
  certification_level text,
  employee_id text UNIQUE,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create manufacturers table
CREATE TABLE IF NOT EXISTS manufacturers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  contact_info jsonb DEFAULT '{}'::jsonb,
  support_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor'));

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can manage all users"
  ON users FOR ALL
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- RLS Policies for customers table
CREATE POLICY "All authenticated users can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and supervisors can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor'))
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor'));

-- RLS Policies for manufacturers table
CREATE POLICY "All authenticated users can view manufacturers"
  ON manufacturers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage manufacturers"
  ON manufacturers FOR ALL
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to users table
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
