/*
  # Add Repair Scope Phase to Enum

  1. Changes
    - Add new 'repair_scope' phase to work_order_phase enum
    - This phase comes after teardown and before inspection

  2. New Phase Flow
    - Initial Testing → Teardown → Repair Scope → Inspection → Awaiting Approval
*/

ALTER TYPE work_order_phase ADD VALUE IF NOT EXISTS 'repair_scope' AFTER 'teardown';
