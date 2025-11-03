/*
  # Fix Work Sessions RLS Policy for Report Generation

  1. Changes
    - Update work_sessions SELECT policy to allow viewing sessions for accessible work orders
    - This allows users to generate reports for work orders they can access
    
  2. Security
    - Maintains security by checking work order access permissions
    - Technicians can view sessions for their assigned work orders
    - Admins and managers can view all sessions
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Technicians can view own work sessions" ON work_sessions;

-- Create improved policy that checks work order access
CREATE POLICY "Users can view work sessions for accessible work orders"
  ON work_sessions FOR SELECT
  TO authenticated
  USING (
    technician_id = auth.uid() OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager') OR
    EXISTS (
      SELECT 1 FROM work_orders
      WHERE work_orders.id = work_sessions.work_order_id
      AND (
        work_orders.assigned_to = auth.uid() OR
        work_orders.created_by = auth.uid() OR
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager')
      )
    )
  );
