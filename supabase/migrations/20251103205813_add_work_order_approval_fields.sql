/*
  # Add Work Order Approval Fields

  1. Changes to `work_orders` table
    - Add `approval_status` (text) - Status of approval (null, 'pending', 'approved', 'rejected')
    - Add `approved_by` (text) - Name of person who approved
    - Add `approved_at` (timestamptz) - When it was approved
    - Add `customer_po_number` (text) - Customer purchase order number
    - Add `rejection_reason` (text) - Reason if rejected

  2. Notes
    - This is separate from the existing phase approvals system
    - This is for overall work order approval by customer/management
    - Null approval_status means no approval needed or not yet requested
*/

-- Add approval fields to work_orders table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN approval_status text CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN approved_by text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN approved_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'customer_po_number'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN customer_po_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN rejection_reason text;
  END IF;
END $$;

-- Create index for approval status queries
CREATE INDEX IF NOT EXISTS idx_work_orders_approval_status ON work_orders(approval_status);
