/*
  # Create Equipment Tables

  1. New Tables
    - `equipment_types` - Types of equipment (motors, pumps, etc.)
      - `id` (uuid, PK)
      - `name` (text)
      - `category` (enum: motor, pump, gearbox, other)
      - `specifications_schema` (jsonb)
      - `created_at` (timestamptz)
    
    - `equipment_models` - Specific models from manufacturers
      - `id` (uuid, PK)
      - `manufacturer_id` (uuid, FK)
      - `equipment_type_id` (uuid, FK)
      - `model_number` (text)
      - `specifications` (jsonb)
      - `torque_specs` (jsonb)
      - `tolerances` (jsonb)
      - `documentation_links` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `equipment_units` - Individual equipment instances
      - `id` (uuid, PK)
      - `equipment_model_id` (uuid, FK)
      - `serial_number` (text, unique)
      - `asset_tag` (text)
      - `customer_id` (uuid, FK)
      - `installation_date` (date)
      - `location` (text)
      - `operational_hours` (numeric)
      - `status` (enum)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `parts_catalog` - Parts for equipment models
      - `id` (uuid, PK)
      - `equipment_model_id` (uuid, FK)
      - `part_number` (text)
      - `description` (text)
      - `part_type` (enum)
      - `specifications` (jsonb)
      - `typical_wear_life` (interval)
      - `supplier_info` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - All authenticated users can view equipment data
    - Only admins can modify equipment data
*/

-- Create enums
CREATE TYPE equipment_category AS ENUM ('motor', 'pump', 'gearbox', 'other');
CREATE TYPE equipment_status AS ENUM ('active', 'in_repair', 'retired');
CREATE TYPE part_type AS ENUM ('bearing', 'seal', 'gasket', 'winding', 'impeller', 'other');

-- Create equipment_types table
CREATE TABLE IF NOT EXISTS equipment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category equipment_category NOT NULL,
  specifications_schema jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create equipment_models table
CREATE TABLE IF NOT EXISTS equipment_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id uuid REFERENCES manufacturers(id) ON DELETE CASCADE,
  equipment_type_id uuid REFERENCES equipment_types(id) ON DELETE CASCADE,
  model_number text NOT NULL,
  specifications jsonb DEFAULT '{}'::jsonb,
  torque_specs jsonb DEFAULT '{}'::jsonb,
  tolerances jsonb DEFAULT '{}'::jsonb,
  documentation_links jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create equipment_units table
CREATE TABLE IF NOT EXISTS equipment_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_model_id uuid REFERENCES equipment_models(id) ON DELETE CASCADE,
  serial_number text UNIQUE NOT NULL,
  asset_tag text,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  installation_date date,
  location text,
  operational_hours numeric DEFAULT 0,
  status equipment_status DEFAULT 'active',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create parts_catalog table
CREATE TABLE IF NOT EXISTS parts_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_model_id uuid REFERENCES equipment_models(id) ON DELETE CASCADE,
  part_number text NOT NULL,
  description text,
  part_type part_type NOT NULL,
  specifications jsonb DEFAULT '{}'::jsonb,
  typical_wear_life interval,
  supplier_info jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_equipment_units_serial ON equipment_units(serial_number);
CREATE INDEX IF NOT EXISTS idx_equipment_models_manufacturer ON equipment_models(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_equipment_units_customer ON equipment_units(customer_id);

-- Enable RLS
ALTER TABLE equipment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_catalog ENABLE ROW LEVEL SECURITY;

-- RLS Policies - All authenticated users can view
CREATE POLICY "All authenticated users can view equipment types"
  ON equipment_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can view equipment models"
  ON equipment_models FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can view equipment units"
  ON equipment_units FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can view parts catalog"
  ON parts_catalog FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies - Only admins can modify
CREATE POLICY "Admins can manage equipment types"
  ON equipment_types FOR ALL
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can manage equipment models"
  ON equipment_models FOR ALL
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins and supervisors can manage equipment units"
  ON equipment_units FOR ALL
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor'))
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor'));

CREATE POLICY "Admins can manage parts catalog"
  ON parts_catalog FOR ALL
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Add updated_at triggers
CREATE TRIGGER equipment_models_updated_at
  BEFORE UPDATE ON equipment_models
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER equipment_units_updated_at
  BEFORE UPDATE ON equipment_units
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
