/*
  # Add Customer Locations Support

  1. New Tables
    - `customer_locations`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references customers)
      - `location_name` (text)
      - `address` (text)
      - `city` (text)
      - `state` (text)
      - `zip_code` (text)
      - `country` (text, default 'USA')
      - `contact_name` (text)
      - `contact_phone` (text)
      - `contact_email` (text)
      - `is_primary` (boolean, default false)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes
    - Add location_id to equipment_units to link to specific customer locations

  3. Security
    - Enable RLS on customer_locations
    - All authenticated users can view locations
    - Admins and managers can manage locations
*/

CREATE TABLE IF NOT EXISTS customer_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  location_name text NOT NULL,
  address text,
  city text,
  state text,
  zip_code text,
  country text DEFAULT 'USA',
  contact_name text,
  contact_phone text,
  contact_email text,
  is_primary boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customer_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view customer locations"
  ON customer_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage customer locations"
  ON customer_locations FOR ALL
  TO authenticated
  USING (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment_units' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE equipment_units ADD COLUMN location_id uuid REFERENCES customer_locations(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customer_locations_customer_id ON customer_locations(customer_id);
CREATE INDEX IF NOT EXISTS idx_equipment_units_location_id ON equipment_units(location_id);
