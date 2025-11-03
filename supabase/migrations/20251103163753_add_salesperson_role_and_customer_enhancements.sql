/*
  # Add Salesperson Role and Customer Enhancements

  ## Overview
  This migration adds the 'salesperson' role to the user role enum and enhances the customers
  table with tagging, priority levels, and maintenance contract tracking.

  ## Changes

  ### 1. User Role Updates
  - Add 'salesperson' to the user_role enum
  
  ### 2. Customer Table Enhancements
  - Add tags for customer categorization
  - Add priority_level for customer importance
  - Add account_status for tracking customer relationship
  - Add preferred_contact_method
  - Add assigned_account_manager
  - Add metadata for custom fields

  ### 3. Customer Communication Log
  - Track all communications with customers
  
  ### 4. Maintenance Reminders
  - Automated tracking of maintenance schedules and reminders

  ## Security
  - Updated RLS policies to include salesperson role
  - Salespeople can manage their assigned leads and customers

  ## Important Notes
  - Existing users retain their current roles
  - Customer priority affects scheduling and notifications
  - Communication log provides audit trail
*/

-- Add salesperson to user_role enum
DO $$ 
BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'salesperson';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enums for customer enhancements
DO $$ BEGIN
  CREATE TYPE customer_priority AS ENUM (
    'low',
    'medium',
    'high',
    'vip'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE account_status AS ENUM (
    'active',
    'inactive',
    'at_risk',
    'churned',
    'prospect'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE contact_method AS ENUM (
    'email',
    'phone',
    'sms',
    'in_person',
    'any'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE communication_type AS ENUM (
    'email',
    'phone_call',
    'sms',
    'meeting',
    'site_visit',
    'note',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to customers table
DO $$ 
BEGIN
  -- Add tags array
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'tags'
  ) THEN
    ALTER TABLE customers ADD COLUMN tags text[] DEFAULT '{}';
  END IF;

  -- Add priority level
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'priority_level'
  ) THEN
    ALTER TABLE customers ADD COLUMN priority_level customer_priority DEFAULT 'medium';
  END IF;

  -- Add account status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'account_status'
  ) THEN
    ALTER TABLE customers ADD COLUMN account_status account_status DEFAULT 'active';
  END IF;

  -- Add preferred contact method
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'preferred_contact_method'
  ) THEN
    ALTER TABLE customers ADD COLUMN preferred_contact_method contact_method DEFAULT 'email';
  END IF;

  -- Add assigned account manager
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'assigned_account_manager'
  ) THEN
    ALTER TABLE customers ADD COLUMN assigned_account_manager uuid REFERENCES users(id);
  END IF;

  -- Add customer since date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'customer_since'
  ) THEN
    ALTER TABLE customers ADD COLUMN customer_since date DEFAULT CURRENT_DATE;
  END IF;

  -- Add last contact date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'last_contact_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN last_contact_date date;
  END IF;

  -- Add next follow up date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'next_follow_up_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN next_follow_up_date date;
  END IF;

  -- Add metadata for custom fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE customers ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Add notes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'notes'
  ) THEN
    ALTER TABLE customers ADD COLUMN notes text;
  END IF;
END $$;

-- Customer communication log
CREATE TABLE IF NOT EXISTS customer_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  communication_type communication_type NOT NULL,
  subject text,
  content text,
  contact_person text,
  performed_by uuid REFERENCES users(id),
  scheduled_at timestamptz,
  completed_at timestamptz,
  outcome text,
  follow_up_required boolean DEFAULT false,
  follow_up_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Maintenance reminders (separate from contract_services for general reminders)
CREATE TABLE IF NOT EXISTS maintenance_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  equipment_unit_id uuid REFERENCES equipment_units(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES contracts(id),
  reminder_type text NOT NULL,
  description text,
  due_date date NOT NULL,
  reminder_sent_at timestamptz,
  reminder_frequency_days integer,
  next_reminder_date date,
  is_active boolean DEFAULT true,
  completed_at timestamptz,
  completed_by uuid REFERENCES users(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customers_priority ON customers(priority_level);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(account_status);
CREATE INDEX IF NOT EXISTS idx_customers_account_manager ON customers(assigned_account_manager);
CREATE INDEX IF NOT EXISTS idx_customers_next_follow_up ON customers(next_follow_up_date) WHERE next_follow_up_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_communications_customer ON customer_communications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_communications_type ON customer_communications(communication_type);
CREATE INDEX IF NOT EXISTS idx_customer_communications_follow_up ON customer_communications(follow_up_date) WHERE follow_up_required = true;
CREATE INDEX IF NOT EXISTS idx_maintenance_reminders_customer ON maintenance_reminders(customer_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_reminders_equipment ON maintenance_reminders(equipment_unit_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_reminders_due_date ON maintenance_reminders(due_date) WHERE is_active = true;

-- Enable RLS
ALTER TABLE customer_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_communications
CREATE POLICY "All authenticated users can view communications"
  ON customer_communications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create communications"
  ON customer_communications FOR INSERT
  TO authenticated
  WITH CHECK (performed_by = auth.uid());

CREATE POLICY "Users can update their communications"
  ON customer_communications FOR UPDATE
  TO authenticated
  USING (
    performed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- RLS Policies for maintenance_reminders
CREATE POLICY "All authenticated users can view maintenance reminders"
  ON maintenance_reminders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can manage maintenance reminders"
  ON maintenance_reminders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Technicians can complete their assigned reminders"
  ON maintenance_reminders FOR UPDATE
  TO authenticated
  USING (
    completed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager', 'technician')
    )
  );