/*
  # Create Phase Reports Table

  1. New Tables
    - `phase_reports`
      - `id` (uuid, primary key)
      - `work_order_id` (uuid, foreign key to work_orders)
      - `work_session_id` (uuid, foreign key to work_sessions)
      - `phase` (text) - The phase this report covers
      - `equipment_details` (jsonb) - Equipment identification data
      - `step_completions` (jsonb) - Array of completed steps with measurements and observations
      - `photos` (jsonb) - Array of photo references
      - `summary` (text) - Overall summary of the phase
      - `technician_notes` (text) - Additional notes from technician
      - `status` (text) - draft, submitted, approved
      - `created_by` (uuid, foreign key to users)
      - `approved_by` (uuid, foreign key to users)
      - `created_at` (timestamptz)
      - `approved_at` (timestamptz)

  2. Security
    - Enable RLS on `phase_reports` table
    - Technicians can view and create their own reports
    - Admins and managers can view and approve all reports
*/

CREATE TABLE IF NOT EXISTS phase_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES work_orders(id) ON DELETE CASCADE,
  work_session_id uuid REFERENCES work_sessions(id) ON DELETE CASCADE,
  phase text NOT NULL,
  equipment_details jsonb DEFAULT '{}'::jsonb,
  step_completions jsonb DEFAULT '[]'::jsonb,
  photos jsonb DEFAULT '[]'::jsonb,
  summary text,
  technician_notes text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
  created_by uuid REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  approved_at timestamptz
);

ALTER TABLE phase_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Technicians can view own phase reports"
  ON phase_reports FOR SELECT
  TO authenticated
  USING (
    auth.uid() = created_by OR
    auth.uid() IN (
      SELECT id FROM users 
      WHERE role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Technicians can create phase reports"
  ON phase_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Technicians can update own draft reports"
  ON phase_reports FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by AND status = 'draft'
  )
  WITH CHECK (
    auth.uid() = created_by
  );

CREATE POLICY "Admins and managers can approve reports"
  ON phase_reports FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE role IN ('admin', 'manager')
    )
  );
