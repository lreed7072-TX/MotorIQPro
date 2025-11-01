/*
  # Allow Technicians to Create Their Own Assignments

  1. Changes
    - Add policy to allow technicians to create work order assignments for themselves
    - This is needed when technicians move from one phase to the next

  2. Security
    - Technicians can only assign to themselves (assigned_to = auth.uid())
    - They must also be the assigner (assigned_by = auth.uid())
*/

CREATE POLICY "Technicians can create own assignments"
  ON work_order_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    assigned_to = auth.uid() AND 
    assigned_by = auth.uid()
  );
