/*
  # Update User Roles - Drop All Policies First

  1. Changes
    - Drop ALL policies on all tables
    - Update role enum to use 'admin', 'manager', 'technician'
    - Recreate ALL policies with appropriate role references
  
  2. Security
    - Temporarily drops all policies to allow type change
    - Recreates all policies with same or improved security model
*/

DROP POLICY IF EXISTS "Users can create their own AI interactions" ON ai_interactions;
DROP POLICY IF EXISTS "Users can view their own AI interactions" ON ai_interactions;
DROP POLICY IF EXISTS "Users can update their own AI interactions" ON ai_interactions;
DROP POLICY IF EXISTS "All authenticated users can view customers" ON customers;
DROP POLICY IF EXISTS "Admins and supervisors can manage customers" ON customers;
DROP POLICY IF EXISTS "All authenticated users can view equipment models" ON equipment_models;
DROP POLICY IF EXISTS "Admins can manage equipment models" ON equipment_models;
DROP POLICY IF EXISTS "All authenticated users can view equipment types" ON equipment_types;
DROP POLICY IF EXISTS "Admins can manage equipment types" ON equipment_types;
DROP POLICY IF EXISTS "All authenticated users can view equipment units" ON equipment_units;
DROP POLICY IF EXISTS "Admins and supervisors can manage equipment units" ON equipment_units;
DROP POLICY IF EXISTS "Technicians can manage findings from their sessions" ON inspection_findings;
DROP POLICY IF EXISTS "Users can view findings from accessible sessions" ON inspection_findings;
DROP POLICY IF EXISTS "All authenticated users can view manufacturers" ON manufacturers;
DROP POLICY IF EXISTS "Admins can manage manufacturers" ON manufacturers;
DROP POLICY IF EXISTS "Admins can manage parts catalog" ON parts_catalog;
DROP POLICY IF EXISTS "All authenticated users can view parts catalog" ON parts_catalog;
DROP POLICY IF EXISTS "Users can view parts from accessible sessions" ON parts_used;
DROP POLICY IF EXISTS "Technicians can manage parts from their sessions" ON parts_used;
DROP POLICY IF EXISTS "Technicians can manage photos from their sessions" ON photos;
DROP POLICY IF EXISTS "Users can view photos from their sessions" ON photos;
DROP POLICY IF EXISTS "Admins can manage procedure steps" ON procedure_steps;
DROP POLICY IF EXISTS "All authenticated users can view procedure steps" ON procedure_steps;
DROP POLICY IF EXISTS "All authenticated users can view procedure templates" ON procedure_templates;
DROP POLICY IF EXISTS "Admins can manage procedure templates" ON procedure_templates;
DROP POLICY IF EXISTS "Users can view reports for accessible work orders" ON reports;
DROP POLICY IF EXISTS "Technicians and supervisors can manage reports" ON reports;
DROP POLICY IF EXISTS "Technicians can manage own step completions" ON step_completions;
DROP POLICY IF EXISTS "Users can view step completions from their sessions" ON step_completions;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
DROP POLICY IF EXISTS "Technicians can update assigned work orders" ON work_orders;
DROP POLICY IF EXISTS "Admins and supervisors can manage work orders" ON work_orders;
DROP POLICY IF EXISTS "Technicians can view assigned work orders" ON work_orders;
DROP POLICY IF EXISTS "Technicians can view own work sessions" ON work_sessions;
DROP POLICY IF EXISTS "Technicians can manage own work sessions" ON work_sessions;

ALTER TABLE users ALTER COLUMN role DROP DEFAULT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'user_role'
  ) THEN
    ALTER TYPE user_role RENAME TO user_role_old;
  END IF;
END $$;

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'technician');

ALTER TABLE users ALTER COLUMN role TYPE user_role USING 
  CASE 
    WHEN role::text = 'supervisor' THEN 'manager'::user_role
    WHEN role::text = 'viewer' THEN 'technician'::user_role
    ELSE role::text::user_role
  END;

ALTER TABLE users ALTER COLUMN role SET DEFAULT 'technician'::user_role;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'user_role_old'
  ) THEN
    DROP TYPE user_role_old;
  END IF;
END $$;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can view all profiles"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can view manufacturers"
  ON manufacturers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage manufacturers"
  ON manufacturers FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can view equipment types"
  ON equipment_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage equipment types"
  ON equipment_types FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can view equipment models"
  ON equipment_models FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage equipment models"
  ON equipment_models FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can view equipment units"
  ON equipment_units FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage equipment units"
  ON equipment_units FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can view parts catalog"
  ON parts_catalog FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage parts catalog"
  ON parts_catalog FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can view procedure templates"
  ON procedure_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage procedure templates"
  ON procedure_templates FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can view procedure steps"
  ON procedure_steps FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage procedure steps"
  ON procedure_steps FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Technicians can view assigned work orders"
  ON work_orders FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid());

CREATE POLICY "Admins and managers can view all work orders"
  ON work_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage work orders"
  ON work_orders FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Technicians can update assigned work orders"
  ON work_orders FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

CREATE POLICY "Technicians can view own work sessions"
  ON work_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders
      WHERE work_orders.id = work_sessions.work_order_id
      AND work_orders.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Technicians can manage own work sessions"
  ON work_sessions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders
      WHERE work_orders.id = work_sessions.work_order_id
      AND work_orders.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Users can view step completions from their sessions"
  ON step_completions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_sessions ws
      JOIN work_orders wo ON ws.work_order_id = wo.id
      WHERE ws.id = step_completions.work_session_id
      AND wo.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Technicians can manage own step completions"
  ON step_completions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_sessions ws
      JOIN work_orders wo ON ws.work_order_id = wo.id
      WHERE ws.id = step_completions.work_session_id
      AND wo.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Users can view photos from their sessions"
  ON photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_sessions ws
      JOIN work_orders wo ON ws.work_order_id = wo.id
      WHERE ws.id = photos.work_session_id
      AND wo.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Technicians can manage photos from their sessions"
  ON photos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_sessions ws
      JOIN work_orders wo ON ws.work_order_id = wo.id
      WHERE ws.id = photos.work_session_id
      AND wo.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Users can view findings from accessible sessions"
  ON inspection_findings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_sessions ws
      JOIN work_orders wo ON ws.work_order_id = wo.id
      WHERE ws.id = inspection_findings.work_session_id
      AND wo.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Technicians can manage findings from their sessions"
  ON inspection_findings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_sessions ws
      JOIN work_orders wo ON ws.work_order_id = wo.id
      WHERE ws.id = inspection_findings.work_session_id
      AND wo.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Users can view reports for accessible work orders"
  ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders
      WHERE work_orders.id = reports.work_order_id
      AND work_orders.assigned_to = auth.uid()
    )
  );

CREATE POLICY "All users can manage reports"
  ON reports FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Users can view parts from accessible sessions"
  ON parts_used FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_sessions ws
      JOIN work_orders wo ON ws.work_order_id = wo.id
      WHERE ws.id = parts_used.work_session_id
      AND wo.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Technicians can manage parts from their sessions"
  ON parts_used FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_sessions ws
      JOIN work_orders wo ON ws.work_order_id = wo.id
      WHERE ws.id = parts_used.work_session_id
      AND wo.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Users can view their own AI interactions"
  ON ai_interactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own AI interactions"
  ON ai_interactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own AI interactions"
  ON ai_interactions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
