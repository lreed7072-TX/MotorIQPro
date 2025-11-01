/*
  # Add Work Order Phases, Approvals, and Multi-Assignment Support

  1. New Enums
    - `work_order_phase`: Tracks current phase of work order lifecycle
      - Values: pending_assignment, initial_testing, teardown, inspection, awaiting_approval, rebuild, final_testing, qc_review, completed, cancelled

  2. Modified Tables
    - `work_orders`: Add current_phase column to track workflow state
    
  3. New Tables
    - `work_order_assignments`: Track multiple assignments throughout work order lifecycle
      - Links work orders to technicians for specific phases
      - Tracks assignment history and completion
    
    - `work_order_approvals`: Track approval workflow between phases
      - Required approval after inspection before rebuild
      - Tracks approver, timestamp, notes, and required parts

  4. Security
    - Enable RLS on all new tables
    - Technicians can view their own assignments
    - Managers and admins can view/manage all assignments
    - Only managers and admins can approve work orders

  5. Notes
    - Work orders can have multiple assignments for different phases
    - Each phase requires approval before moving to next phase
    - Approval includes parts list and cost estimates
*/

-- Create work order phase enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'work_order_phase') THEN
    CREATE TYPE work_order_phase AS ENUM (
      'pending_assignment',
      'initial_testing',
      'teardown',
      'inspection',
      'awaiting_approval',
      'rebuild',
      'final_testing',
      'qc_review',
      'completed',
      'cancelled'
    );
  END IF;
END $$;

-- Add current_phase to work_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'current_phase'
  ) THEN
    ALTER TABLE work_orders 
    ADD COLUMN current_phase work_order_phase DEFAULT 'pending_assignment'::work_order_phase;
  END IF;
END $$;

-- Create work_order_assignments table
CREATE TABLE IF NOT EXISTS work_order_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  assigned_to uuid NOT NULL REFERENCES users(id),
  assigned_by uuid NOT NULL REFERENCES users(id),
  phase work_order_phase NOT NULL,
  status text DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'cancelled')),
  assigned_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create work_order_approvals table
CREATE TABLE IF NOT EXISTS work_order_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  phase_completed work_order_phase NOT NULL,
  next_phase work_order_phase NOT NULL,
  requested_by uuid NOT NULL REFERENCES users(id),
  requested_at timestamptz DEFAULT now(),
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  findings_summary text,
  required_parts jsonb DEFAULT '[]'::jsonb,
  estimated_cost numeric(10, 2),
  estimated_hours numeric(5, 2),
  approval_notes text,
  rejection_reason text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_orders_current_phase ON work_orders(current_phase);
CREATE INDEX IF NOT EXISTS idx_work_order_assignments_technician ON work_order_assignments(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_work_order_assignments_work_order ON work_order_assignments(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_approvals_status ON work_order_approvals(status, requested_at);
CREATE INDEX IF NOT EXISTS idx_work_order_approvals_work_order ON work_order_approvals(work_order_id);

-- Enable RLS
ALTER TABLE work_order_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for work_order_assignments

-- Technicians can view their own assignments
CREATE POLICY "Technicians can view own assignments"
  ON work_order_assignments FOR SELECT
  TO authenticated
  USING (
    assigned_to = auth.uid() OR
    assigned_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- Managers and admins can create assignments
CREATE POLICY "Managers can create assignments"
  ON work_order_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- Managers and admins can update assignments
CREATE POLICY "Managers can update assignments"
  ON work_order_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- Assigned technicians can update their own assignment status
CREATE POLICY "Technicians can update own assignment status"
  ON work_order_assignments FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- RLS Policies for work_order_approvals

-- All authenticated users can view approvals for work orders they're involved with
CREATE POLICY "Users can view related approvals"
  ON work_order_approvals FOR SELECT
  TO authenticated
  USING (
    requested_by = auth.uid() OR
    approved_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM work_order_assignments
      WHERE work_order_assignments.work_order_id = work_order_approvals.work_order_id
      AND work_order_assignments.assigned_to = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- Technicians can create approval requests
CREATE POLICY "Technicians can request approvals"
  ON work_order_approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM work_order_assignments
      WHERE work_order_assignments.work_order_id = work_order_approvals.work_order_id
      AND work_order_assignments.assigned_to = auth.uid()
      AND work_order_assignments.status = 'in_progress'
    )
  );

-- Only managers and admins can approve/reject
CREATE POLICY "Managers can approve requests"
  ON work_order_approvals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );
