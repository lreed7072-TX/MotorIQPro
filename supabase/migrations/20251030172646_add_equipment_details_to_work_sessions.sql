/*
  # Add Equipment Details to Work Sessions

  1. Changes
    - Add `equipment_details` JSONB column to `work_sessions` table to store:
      - Customer name
      - Model number
      - Serial number
      - HP/KW
      - Voltage
      - Speed
      - Bearing type
      - Lubrication type
      - Seal arrangement
    
  2. Notes
    - Using JSONB for flexibility to store various equipment specifications
    - This data is collected during equipment identification step
    - Will be used in phase reports
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_sessions' AND column_name = 'equipment_details'
  ) THEN
    ALTER TABLE work_sessions ADD COLUMN equipment_details JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;
