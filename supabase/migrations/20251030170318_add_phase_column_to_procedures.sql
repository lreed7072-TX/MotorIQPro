/*
  # Add Phase Column to Procedure Templates
  
  1. Changes
    - Add `phase` column to procedure_templates to map procedures to work order phases
    - Update procedure_type enum to include cleaning type
  
  2. Notes
    - Enum value addition must be committed before use
*/

-- Add phase column to procedure_templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procedure_templates' AND column_name = 'phase'
  ) THEN
    ALTER TABLE procedure_templates 
    ADD COLUMN phase work_order_phase;
  END IF;
END $$;

-- Add cleaning to procedure_type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'cleaning' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'procedure_type')
  ) THEN
    ALTER TYPE procedure_type ADD VALUE 'cleaning';
  END IF;
END $$;

-- Create index for phase-based lookups
CREATE INDEX IF NOT EXISTS idx_procedure_templates_phase ON procedure_templates(phase);