/*
  # Add Work Order Statuses: awaiting_parts and invoiced

  ## Overview
  This migration adds two new statuses to the work_order_status enum:
  - awaiting_parts: Work order is paused waiting for parts to arrive
  - invoiced: Work order has been completed and invoiced

  ## Changes
  - Extends work_order_status enum with new values
  - Maintains existing workflow compatibility

  ## Workflow
  The updated workflow becomes:
  pending → assigned → in_progress → [awaiting_parts →] completed → invoiced

  ## Important Notes
  - awaiting_parts is optional in the workflow
  - invoiced is a terminal status indicating financial completion
  - Existing work orders retain their current status
*/

-- Add new statuses to work_order_status enum
DO $$ 
BEGIN
  -- Add awaiting_parts status
  ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'awaiting_parts';
  
  -- Add invoiced status
  ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'invoiced';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;