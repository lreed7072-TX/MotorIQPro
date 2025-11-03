/*
  # Create Company Settings and Form Builder System

  1. New Tables
    - `company_settings` - Store company branding and information
      - `id` (uuid, primary key)
      - `company_name` (text)
      - `company_logo_url` (text)
      - `address` (text)
      - `city` (text)
      - `state` (text)
      - `zip_code` (text)
      - `phone` (text)
      - `email` (text)
      - `website` (text)
      - `updated_at` (timestamptz)
      - `updated_by` (uuid)
    
    - `custom_forms` - Store custom form templates
      - `id` (uuid, primary key)
      - `name` (text) - Form name
      - `description` (text)
      - `form_fields` (jsonb) - Array of field definitions
      - `ai_generated` (boolean) - Whether AI helped create it
      - `ai_prompt` (text) - Original AI prompt if applicable
      - `created_by` (uuid)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `work_order_form_responses` - Store filled form responses
      - `id` (uuid, primary key)
      - `work_order_id` (uuid) - FK to work_orders
      - `work_session_id` (uuid, nullable) - FK to work_sessions
      - `custom_form_id` (uuid) - FK to custom_forms
      - `responses` (jsonb) - Form field responses
      - `completed_by` (uuid)
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Only admins can update company settings
    - Admins and managers can create/edit custom forms
    - All authenticated users can view forms
    - Users can fill out forms for work orders they have access to
*/

-- Create company_settings table (singleton table with one row)
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text DEFAULT 'MotorIQ Pro',
  company_logo_url text,
  address text,
  city text,
  state text,
  zip_code text,
  phone text,
  email text,
  website text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default company settings if none exist
INSERT INTO company_settings (id, company_name)
SELECT gen_random_uuid(), 'MotorIQ Pro'
WHERE NOT EXISTS (SELECT 1 FROM company_settings);

-- Create custom_forms table
CREATE TABLE IF NOT EXISTS custom_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  form_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_generated boolean DEFAULT false,
  ai_prompt text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create work_order_form_responses table
CREATE TABLE IF NOT EXISTS work_order_form_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES work_orders(id) ON DELETE CASCADE NOT NULL,
  work_session_id uuid REFERENCES work_sessions(id) ON DELETE SET NULL,
  custom_form_id uuid REFERENCES custom_forms(id) ON DELETE CASCADE NOT NULL,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_custom_forms_created_by ON custom_forms(created_by);
CREATE INDEX IF NOT EXISTS idx_work_order_form_responses_wo ON work_order_form_responses(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_form_responses_form ON work_order_form_responses(custom_form_id);

-- Enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_form_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_settings
CREATE POLICY "Everyone can view company settings"
  ON company_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can update company settings"
  ON company_settings FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- RLS Policies for custom_forms
CREATE POLICY "Authenticated users can view custom forms"
  ON custom_forms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can create custom forms"
  ON custom_forms FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager'));

CREATE POLICY "Admins and managers can update custom forms"
  ON custom_forms FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager'))
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager'));

CREATE POLICY "Admins and managers can delete custom forms"
  ON custom_forms FOR DELETE
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager'));

-- RLS Policies for work_order_form_responses
CREATE POLICY "Users can view form responses for accessible work orders"
  ON work_order_form_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders
      WHERE work_orders.id = work_order_form_responses.work_order_id
      AND (
        work_orders.assigned_to = auth.uid() OR
        work_orders.created_by = auth.uid() OR
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager')
      )
    )
  );

CREATE POLICY "Users can create form responses for accessible work orders"
  ON work_order_form_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = completed_by AND
    EXISTS (
      SELECT 1 FROM work_orders
      WHERE work_orders.id = work_order_form_responses.work_order_id
      AND (
        work_orders.assigned_to = auth.uid() OR
        work_orders.created_by = auth.uid() OR
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager')
      )
    )
  );

-- Add updated_at triggers
CREATE TRIGGER company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER custom_forms_updated_at
  BEFORE UPDATE ON custom_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
