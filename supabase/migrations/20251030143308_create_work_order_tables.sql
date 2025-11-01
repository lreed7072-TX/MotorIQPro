/*
  # Create Work Order Tables

  1. New Tables
    - `work_orders` - Main work order tracking
      - `id` (uuid, PK)
      - `work_order_number` (text, unique)
      - `equipment_unit_id` (uuid, FK)
      - `customer_id` (uuid, FK)
      - `assigned_to` (uuid, FK)
      - `work_type` (enum)
      - `priority` (enum)
      - `status` (enum)
      - `scheduled_date` (date)
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `reported_issue` (text)
      - `customer_po` (text)
      - `estimated_hours` (numeric)
      - `actual_hours` (numeric)
      - `created_by` (uuid, FK)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `work_sessions` - Active work session for a work order
      - `id` (uuid, PK)
      - `work_order_id` (uuid, FK)
      - `procedure_template_id` (uuid, FK)
      - `technician_id` (uuid, FK)
      - `status` (enum)
      - `current_step_id` (uuid, FK)
      - `progress_percentage` (numeric)
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `last_synced_at` (timestamptz)
    
    - `step_completions` - Record of completed steps
      - `id` (uuid, PK)
      - `work_session_id` (uuid, FK)
      - `step_id` (uuid, FK)
      - `status` (enum)
      - `result` (enum)
      - `measurements` (jsonb)
      - `observations` (text)
      - `issues_found` (text)
      - `completed_by` (uuid, FK)
      - `completed_at` (timestamptz)
      - `time_spent` (interval)

  2. Security
    - Enable RLS on all tables
    - Technicians can view assigned work orders
    - Admins and supervisors can view all
*/

-- Create enums
CREATE TYPE work_type AS ENUM ('repair', 'inspection', 'rebuild', 'pm');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'emergency');
CREATE TYPE work_order_status AS ENUM ('pending', 'in_progress', 'on_hold', 'completed', 'cancelled');
CREATE TYPE work_session_status AS ENUM ('in_progress', 'completed', 'paused');
CREATE TYPE step_status AS ENUM ('pending', 'in_progress', 'completed', 'skipped', 'failed');
CREATE TYPE step_result AS ENUM ('pass', 'fail', 'na');

-- Create work_orders table
CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_number text UNIQUE NOT NULL,
  equipment_unit_id uuid REFERENCES equipment_units(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  work_type work_type NOT NULL,
  priority priority_level DEFAULT 'medium',
  status work_order_status DEFAULT 'pending',
  scheduled_date date,
  started_at timestamptz,
  completed_at timestamptz,
  reported_issue text,
  customer_po text,
  estimated_hours numeric,
  actual_hours numeric,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create work_sessions table
CREATE TABLE IF NOT EXISTS work_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES work_orders(id) ON DELETE CASCADE,
  procedure_template_id uuid REFERENCES procedure_templates(id) ON DELETE SET NULL,
  technician_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status work_session_status DEFAULT 'in_progress',
  current_step_id uuid REFERENCES procedure_steps(id) ON DELETE SET NULL,
  progress_percentage numeric DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  last_synced_at timestamptz DEFAULT now()
);

-- Create step_completions table
CREATE TABLE IF NOT EXISTS step_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_session_id uuid REFERENCES work_sessions(id) ON DELETE CASCADE,
  step_id uuid REFERENCES procedure_steps(id) ON DELETE CASCADE,
  status step_status DEFAULT 'pending',
  result step_result,
  measurements jsonb DEFAULT '{}'::jsonb,
  observations text,
  issues_found text,
  completed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  time_spent interval
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned ON work_orders(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_work_sessions_technician ON work_sessions(technician_id, status);
CREATE INDEX IF NOT EXISTS idx_step_completions_session ON step_completions(work_session_id);

-- Enable RLS
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for work_orders
CREATE POLICY "Technicians can view assigned work orders"
  ON work_orders FOR SELECT
  TO authenticated
  USING (
    assigned_to = auth.uid() OR
    created_by = auth.uid() OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

CREATE POLICY "Admins and supervisors can manage work orders"
  ON work_orders FOR ALL
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor'))
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor'));

CREATE POLICY "Technicians can update assigned work orders"
  ON work_orders FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- RLS Policies for work_sessions
CREATE POLICY "Technicians can view own work sessions"
  ON work_sessions FOR SELECT
  TO authenticated
  USING (
    technician_id = auth.uid() OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

CREATE POLICY "Technicians can manage own work sessions"
  ON work_sessions FOR ALL
  TO authenticated
  USING (technician_id = auth.uid())
  WITH CHECK (technician_id = auth.uid());

-- RLS Policies for step_completions
CREATE POLICY "Users can view step completions from their sessions"
  ON step_completions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_sessions
      WHERE work_sessions.id = step_completions.work_session_id
      AND (
        work_sessions.technician_id = auth.uid() OR
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor')
      )
    )
  );

CREATE POLICY "Technicians can manage own step completions"
  ON step_completions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_sessions
      WHERE work_sessions.id = step_completions.work_session_id
      AND work_sessions.technician_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM work_sessions
      WHERE work_sessions.id = step_completions.work_session_id
      AND work_sessions.technician_id = auth.uid()
    )
  );

-- Add updated_at trigger
CREATE TRIGGER work_orders_updated_at
  BEFORE UPDATE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
