/*
  # Create Procedure Tables

  1. New Tables
    - `procedure_templates` - Reusable procedure workflows
      - `id` (uuid, PK)
      - `equipment_type_id` (uuid, FK)
      - `name` (text)
      - `version` (text)
      - `procedure_type` (enum)
      - `estimated_duration` (interval)
      - `required_tools` (jsonb)
      - `safety_requirements` (jsonb)
      - `is_active` (boolean)
      - `created_by` (uuid, FK)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `procedure_steps` - Individual steps in procedures
      - `id` (uuid, PK)
      - `procedure_template_id` (uuid, FK)
      - `step_number` (integer)
      - `title` (text)
      - `description` (text)
      - `instructions` (text)
      - `step_type` (enum)
      - `acceptance_criteria` (jsonb)
      - `measurements_required` (jsonb)
      - `photo_required` (boolean)
      - `estimated_time` (interval)
      - `safety_notes` (text)
      - `reference_documents` (jsonb)

  2. Security
    - Enable RLS on all tables
    - All authenticated users can view procedures
    - Only admins can create/modify procedures
*/

-- Create enums
CREATE TYPE procedure_type AS ENUM ('teardown', 'inspection', 'rebuild', 'test');
CREATE TYPE step_type AS ENUM ('action', 'inspection', 'measurement', 'decision');

-- Create procedure_templates table
CREATE TABLE IF NOT EXISTS procedure_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_type_id uuid REFERENCES equipment_types(id) ON DELETE CASCADE,
  name text NOT NULL,
  version text DEFAULT '1.0',
  procedure_type procedure_type NOT NULL,
  estimated_duration interval,
  required_tools jsonb DEFAULT '[]'::jsonb,
  safety_requirements jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create procedure_steps table
CREATE TABLE IF NOT EXISTS procedure_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_template_id uuid REFERENCES procedure_templates(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  title text NOT NULL,
  description text,
  instructions text NOT NULL,
  step_type step_type NOT NULL DEFAULT 'action',
  acceptance_criteria jsonb DEFAULT '{}'::jsonb,
  measurements_required jsonb DEFAULT '[]'::jsonb,
  photo_required boolean DEFAULT false,
  estimated_time interval,
  safety_notes text,
  reference_documents jsonb DEFAULT '[]'::jsonb,
  UNIQUE(procedure_template_id, step_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_procedure_steps_template ON procedure_steps(procedure_template_id, step_number);
CREATE INDEX IF NOT EXISTS idx_procedure_templates_type ON procedure_templates(equipment_type_id);

-- Enable RLS
ALTER TABLE procedure_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies - All authenticated users can view
CREATE POLICY "All authenticated users can view procedure templates"
  ON procedure_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can view procedure steps"
  ON procedure_steps FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies - Only admins can modify
CREATE POLICY "Admins can manage procedure templates"
  ON procedure_templates FOR ALL
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can manage procedure steps"
  ON procedure_steps FOR ALL
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Add updated_at trigger
CREATE TRIGGER procedure_templates_updated_at
  BEFORE UPDATE ON procedure_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
