/*
  # Create Repair Scope Procedure Template

  1. New Procedure
    - Procedure: Determine Repair Scope and Parts Required
    - Phase: repair_scope
    - Steps guide technician to document work and parts needed

  2. Security
    - Uses existing RLS policies from procedure_templates table
*/

DO $$
DECLARE
  repair_scope_template_id uuid;
  general_equipment_type_id uuid;
BEGIN
  SELECT id INTO general_equipment_type_id
  FROM equipment_types
  LIMIT 1;

  INSERT INTO procedure_templates (
    name, 
    phase, 
    equipment_type_id,
    estimated_duration,
    procedure_type,
    is_active,
    version
  )
  VALUES (
    'Determine Repair Scope and Parts Required',
    'repair_scope',
    general_equipment_type_id,
    interval '45 minutes',
    'inspection',
    true,
    1
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO repair_scope_template_id;

  IF repair_scope_template_id IS NULL THEN
    SELECT id INTO repair_scope_template_id
    FROM procedure_templates
    WHERE phase = 'repair_scope'
    LIMIT 1;
  END IF;

  IF repair_scope_template_id IS NOT NULL THEN
    INSERT INTO procedure_steps (
      procedure_template_id, 
      step_number, 
      title,
      description,
      instructions,
      photo_required,
      step_type
    )
    VALUES
      (repair_scope_template_id, 1, 'Review Findings', 'Review all findings from teardown and inspection', 'Carefully examine all notes, photos, and observations from the teardown phase', false, 'inspection'),
      (repair_scope_template_id, 2, 'Document Work Required', 'Document all work required in detail: list all repairs, replacements, adjustments, and modifications needed', 'Create a comprehensive list of all work that must be performed, including repairs, part replacements, adjustments, and any modifications', false, 'inspection'),
      (repair_scope_template_id, 3, 'List Parts Required', 'List all parts required with part numbers, descriptions, and quantities', 'Document each part needed with manufacturer part number, description, and quantity required', false, 'inspection'),
      (repair_scope_template_id, 4, 'Photograph Components', 'Take photos of damaged or worn components requiring replacement', 'Take clear photos showing damage or wear that justifies replacement', true, 'inspection'),
      (repair_scope_template_id, 5, 'Verify Completeness', 'Review and verify completeness of repair scope and parts list', 'Double-check that all necessary work and parts have been identified and documented', false, 'inspection')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
