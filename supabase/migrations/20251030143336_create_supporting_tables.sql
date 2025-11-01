/*
  # Create Supporting Tables

  1. New Tables
    - `photos` - Photo documentation
    - `inspection_findings` - Issues found during inspection
    - `reports` - Generated reports
    - `parts_used` - Parts used in repairs
    - `ai_interactions` - AI assistant conversation history

  2. Security
    - Enable RLS on all tables
    - Appropriate access policies based on user roles
*/

-- Create enums
CREATE TYPE photo_type AS ENUM ('before', 'during', 'after', 'issue', 'reference');
CREATE TYPE finding_type AS ENUM ('wear', 'damage', 'out_of_spec', 'contamination', 'other');
CREATE TYPE severity_level AS ENUM ('minor', 'moderate', 'major', 'critical');
CREATE TYPE report_type AS ENUM ('inspection', 'repair', 'rebuild', 'test');
CREATE TYPE report_status AS ENUM ('draft', 'pending_approval', 'approved', 'sent');

-- Create photos table
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_session_id uuid REFERENCES work_sessions(id) ON DELETE CASCADE,
  step_completion_id uuid REFERENCES step_completions(id) ON DELETE SET NULL,
  storage_path text NOT NULL,
  thumbnail_path text,
  photo_type photo_type DEFAULT 'during',
  caption text,
  annotations jsonb DEFAULT '{}'::jsonb,
  ai_analysis jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  taken_by uuid REFERENCES users(id) ON DELETE SET NULL,
  taken_at timestamptz DEFAULT now()
);

-- Create inspection_findings table
CREATE TABLE IF NOT EXISTS inspection_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_session_id uuid REFERENCES work_sessions(id) ON DELETE CASCADE,
  step_completion_id uuid REFERENCES step_completions(id) ON DELETE SET NULL,
  finding_type finding_type NOT NULL,
  severity severity_level NOT NULL,
  component text NOT NULL,
  description text NOT NULL,
  recommended_action text,
  photo_ids uuid[],
  created_at timestamptz DEFAULT now()
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES work_orders(id) ON DELETE CASCADE,
  report_type report_type NOT NULL,
  report_number text UNIQUE NOT NULL,
  generated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  generated_at timestamptz DEFAULT now(),
  status report_status DEFAULT 'draft',
  content jsonb DEFAULT '{}'::jsonb,
  pdf_path text,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  signature_data jsonb DEFAULT '{}'::jsonb,
  sent_to text,
  sent_at timestamptz
);

-- Create parts_used table
CREATE TABLE IF NOT EXISTS parts_used (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_session_id uuid REFERENCES work_sessions(id) ON DELETE CASCADE,
  part_id uuid REFERENCES parts_catalog(id) ON DELETE SET NULL,
  quantity numeric NOT NULL DEFAULT 1,
  serial_numbers text[],
  installation_notes text,
  installed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  installed_at timestamptz DEFAULT now()
);

-- Create ai_interactions table
CREATE TABLE IF NOT EXISTS ai_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_session_id uuid REFERENCES work_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  query text NOT NULL,
  context jsonb DEFAULT '{}'::jsonb,
  response text NOT NULL,
  helpful boolean,
  feedback text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_photos_work_session ON photos(work_session_id);
CREATE INDEX IF NOT EXISTS idx_findings_work_session ON inspection_findings(work_session_id);
CREATE INDEX IF NOT EXISTS idx_reports_work_order ON reports(work_order_id);
CREATE INDEX IF NOT EXISTS idx_parts_used_work_session ON parts_used(work_session_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_work_session ON ai_interactions(work_session_id);

-- Enable RLS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_used ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for photos
CREATE POLICY "Users can view photos from their sessions"
  ON photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_sessions
      WHERE work_sessions.id = photos.work_session_id
      AND (
        work_sessions.technician_id = auth.uid() OR
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor')
      )
    )
  );

CREATE POLICY "Technicians can manage photos from their sessions"
  ON photos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_sessions
      WHERE work_sessions.id = photos.work_session_id
      AND work_sessions.technician_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM work_sessions
      WHERE work_sessions.id = photos.work_session_id
      AND work_sessions.technician_id = auth.uid()
    )
  );

-- RLS Policies for inspection_findings
CREATE POLICY "Users can view findings from accessible sessions"
  ON inspection_findings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_sessions
      WHERE work_sessions.id = inspection_findings.work_session_id
      AND (
        work_sessions.technician_id = auth.uid() OR
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor')
      )
    )
  );

CREATE POLICY "Technicians can manage findings from their sessions"
  ON inspection_findings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_sessions
      WHERE work_sessions.id = inspection_findings.work_session_id
      AND work_sessions.technician_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM work_sessions
      WHERE work_sessions.id = inspection_findings.work_session_id
      AND work_sessions.technician_id = auth.uid()
    )
  );

-- RLS Policies for reports
CREATE POLICY "Users can view reports for accessible work orders"
  ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders
      WHERE work_orders.id = reports.work_order_id
      AND (
        work_orders.assigned_to = auth.uid() OR
        work_orders.created_by = auth.uid() OR
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor', 'viewer')
      )
    )
  );

CREATE POLICY "Technicians and supervisors can manage reports"
  ON reports FOR ALL
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor', 'technician'))
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor', 'technician'));

-- RLS Policies for parts_used
CREATE POLICY "Users can view parts from accessible sessions"
  ON parts_used FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_sessions
      WHERE work_sessions.id = parts_used.work_session_id
      AND (
        work_sessions.technician_id = auth.uid() OR
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor')
      )
    )
  );

CREATE POLICY "Technicians can manage parts from their sessions"
  ON parts_used FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_sessions
      WHERE work_sessions.id = parts_used.work_session_id
      AND work_sessions.technician_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM work_sessions
      WHERE work_sessions.id = parts_used.work_session_id
      AND work_sessions.technician_id = auth.uid()
    )
  );

-- RLS Policies for ai_interactions
CREATE POLICY "Users can view their own AI interactions"
  ON ai_interactions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

CREATE POLICY "Users can create their own AI interactions"
  ON ai_interactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own AI interactions"
  ON ai_interactions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
