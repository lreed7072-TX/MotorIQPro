/*
  # Populate Phase-Based Procedures
  
  1. Procedures Created
    - Initial Testing & Verification (initial_testing phase)
    - Equipment Cleaning & Drying (initial_testing phase)
    - Equipment Teardown & Component Inspection (teardown phase)
    - Determine Repair Scope & Parts Required (inspection phase)
    - Equipment Rebuild & Reassembly (rebuild phase)
    - Final Testing & Quality Verification (final_testing phase)
  
  2. Standards Referenced
    - EASA AR100 for electrical testing
    - API 682 for mechanical seals
    - ISO 21940 for balancing
    - ISO 10816 for vibration
    - ANSI/HI for pump clearances
  
  3. Notes
    - Each procedure includes detailed steps with measurements, safety notes, and photo requirements
    - Steps follow industry best practices for rotating equipment rebuild
*/

-- Insert Initial Testing & Verification Procedure
DO $$
DECLARE
  v_proc_id uuid;
BEGIN
  INSERT INTO procedure_templates (
    name, version, procedure_type, phase, estimated_duration, is_active
  ) VALUES (
    'Initial Testing & Verification', '1.0', 'test', 'initial_testing'::work_order_phase, interval '4 hours', true
  ) RETURNING id INTO v_proc_id;

  INSERT INTO procedure_steps (procedure_template_id, step_number, title, instructions, step_type, photo_required) VALUES
  (v_proc_id, 1, 'Equipment Identification', 'Record customer, model, serial number, HP/kW, voltage, speed, bearing type, lubrication type, and seal arrangement. Document all nameplate data.', 'action', true),
  (v_proc_id, 2, 'Condition Assessment', 'Photograph equipment from every angle before cleaning. Note any damage, corrosion, or missing hardware. Document current condition thoroughly.', 'inspection', true),
  (v_proc_id, 3, 'Tag Orientation', 'Match-mark endbells, pump halves, couplings, and shafts for reference during reassembly. Use permanent markers or punch marks.', 'action', true);

  INSERT INTO procedure_steps (procedure_template_id, step_number, title, instructions, step_type, measurements_required, photo_required) VALUES
  (v_proc_id, 4, 'Insulation Resistance (Megger) Test', 'Test at 500-5000V per nameplate. Record readings and correct to 40°C. Minimum acceptable: >1MΩ for motors <1000V, >100MΩ for motors >1000V.', 'measurement', '[{"name":"IR Reading","unit":"MΩ","min":1,"target":100},{"name":"Temperature","unit":"°C","target":40}]'::jsonb, true),
  (v_proc_id, 5, 'Polarization Index Test', 'Measure insulation resistance at 1 minute and 10 minutes. Calculate PI = IR(10min)/IR(1min). Target: ≥2.0. Values <2.0 indicate moisture or contamination.', 'measurement', '[{"name":"IR at 1 min","unit":"MΩ"},{"name":"IR at 10 min","unit":"MΩ"},{"name":"PI Ratio","min":2.0,"target":3.0}]'::jsonb, false),
  (v_proc_id, 6, 'Winding Resistance Balance', 'Measure resistance of each phase winding. Calculate variation between highest and lowest. Acceptance: ≤2% variation indicates balanced windings.', 'measurement', '[{"name":"Phase A Resistance","unit":"Ω"},{"name":"Phase B Resistance","unit":"Ω"},{"name":"Phase C Resistance","unit":"Ω"},{"name":"Variation","unit":"%","max":2.0}]'::jsonb, false),
  (v_proc_id, 7, 'Mechanical Pre-Test: Shaft Play', 'Measure shaft endplay (axial) and radial play using dial indicators. Check for free rotation without binding. Record any restrictions or noise.', 'measurement', '[{"name":"Axial Endplay","unit":"in","min":0.001,"max":0.020},{"name":"Radial Play","unit":"in","max":0.005}]'::jsonb, false),
  (v_proc_id, 8, 'Shaft Runout Measurement', 'Measure shaft runout TIR at multiple locations along shaft length. Target: ≤0.001-0.002 in per foot of span. Mark high spots for reference.', 'measurement', '[{"name":"Runout TIR","unit":"in","max":0.002},{"name":"Location","unit":"in from end"}]'::jsonb, false);

  INSERT INTO procedure_steps (procedure_template_id, step_number, title, instructions, step_type) VALUES
  (v_proc_id, 9, 'Lubrication Sample Collection', 'Collect oil or grease samples from bearings. Send to lab for analysis: viscosity, contamination, wear metals. Label with equipment ID and date.', 'action');
END $$;

-- Insert Cleaning Procedure
DO $$
DECLARE
  v_proc_id uuid;
BEGIN
  INSERT INTO procedure_templates (name, version, procedure_type, phase, estimated_duration, is_active) VALUES
  ('Equipment Cleaning & Drying', '1.0', 'cleaning', 'initial_testing'::work_order_phase, interval '6 hours', true) RETURNING id INTO v_proc_id;

  INSERT INTO procedure_steps (procedure_template_id, step_number, title, instructions, step_type, safety_notes) VALUES
  (v_proc_id, 1, 'Dry Cleaning', 'Blow off loose debris with compressed air. Scrape gasket surfaces clean. Do not use harsh tools that could damage machined surfaces.', 'action', null),
  (v_proc_id, 2, 'Solvent Wash (External)', 'Wash external surfaces with alkaline detergent or non-chlorinated solvent. DO NOT immerse windings. Use proper PPE and ventilation.', 'action', 'Wear chemical-resistant gloves and eye protection. Work in well-ventilated area.');

  INSERT INTO procedure_steps (procedure_template_id, step_number, title, instructions, step_type, measurements_required) VALUES
  (v_proc_id, 3, 'Bake Dry', 'Bake at 250°F (120°C) for minimum 4 hours or until moisture content <5%. Monitor temperature and time carefully.', 'action', '[{"name":"Oven Temperature","unit":"°F","target":250},{"name":"Duration","unit":"hours","min":4}]'::jsonb),
  (v_proc_id, 4, 'Post-Dry IR & PI Retest', 'Retest insulation resistance and polarization index after drying. If still low, plan for rewind or VPI re-varnish treatment.', 'measurement', '[{"name":"IR Reading","unit":"MΩ","min":10},{"name":"PI Ratio","min":2.0}]'::jsonb);
END $$;

-- Insert Teardown Procedure
DO $$
DECLARE
  v_proc_id uuid;
BEGIN
  INSERT INTO procedure_templates (name, version, procedure_type, phase, estimated_duration, is_active) VALUES
  ('Equipment Teardown & Component Inspection', '1.0', 'teardown', 'teardown'::work_order_phase, interval '8 hours', true) RETURNING id INTO v_proc_id;

  INSERT INTO procedure_steps (procedure_template_id, step_number, title, instructions, step_type, photo_required) VALUES
  (v_proc_id, 1, 'Methodical Disassembly', 'Disassemble equipment following proper sequence. Preserve all orientation marks. Bag and tag small parts with labels. Document assembly order with photos.', 'action', true),
  (v_proc_id, 2, 'Bearing Removal', 'Record bearing fit type and orientation before removal. Use induction heater if bearing reuse is planned. Never hammer bearings directly.', 'action', true);

  INSERT INTO procedure_steps (procedure_template_id, step_number, title, instructions, step_type, measurements_required, photo_required) VALUES
  (v_proc_id, 3, 'Shaft Journal Measurements', 'Measure shaft journals for diameter, out-of-round, and surface finish. Check for wear, scoring, or damage. Record measurements at multiple points.', 'measurement', '[{"name":"Journal Diameter","unit":"in"},{"name":"Out-of-Round","unit":"in","max":0.0005},{"name":"Surface Finish","unit":"μin Ra","max":32}]'::jsonb, false),
  (v_proc_id, 4, 'Housing Bore Measurements', 'Measure housing bores for diameter, concentricity, and squareness to mounting feet. Document any wear or damage.', 'measurement', '[{"name":"Bore Diameter","unit":"in"},{"name":"Concentricity","unit":"in","max":0.002},{"name":"Squareness","unit":"in/ft","max":0.002}]'::jsonb, false),
  (v_proc_id, 5, 'Air Gap Uniformity (Motors)', 'For motors: measure air gap at 8 points around stator. Calculate variation. Target: ≤10% variation from average.', 'measurement', '[{"name":"Air Gap Reading","unit":"in"},{"name":"Variation","unit":"%","max":10}]'::jsonb, false),
  (v_proc_id, 6, 'Impeller & Wear Ring Inspection (Pumps)', 'For pumps: measure impeller clearances and wear ring fits per ANSI/HI standards. Check for erosion, cavitation damage, or corrosion.', 'inspection', '[{"name":"Impeller Clearance","unit":"in"},{"name":"Wear Ring Fit","unit":"in"}]'::jsonb, true);

  INSERT INTO procedure_steps (procedure_template_id, step_number, title, instructions, step_type, photo_required) VALUES
  (v_proc_id, 7, 'Bearing Condition Analysis', 'Inspect bearings for failure modes: brinelling, smearing, fluting, fatigue spalling. Document condition and probable cause of failure.', 'inspection', true),
  (v_proc_id, 8, 'Winding Inspection', 'Inspect windings for discoloration, contamination, cracked varnish, or thermal damage. Note any abnormalities or concerns.', 'inspection', true),
  (v_proc_id, 9, 'Core Inspection', 'Examine stator and rotor cores for hot spots, lamination damage, or core looseness. Test for inter-laminar shorts if suspected.', 'inspection', true),
  (v_proc_id, 10, 'Shaft & Rotor Inspection', 'Inspect shafts and rotors for cracks using dye-penetrant method. Check keyways, threads, and seal surfaces. Document any defects.', 'inspection', true),
  (v_proc_id, 11, 'Casing Inspection (Pumps)', 'Inspect pump casings for erosion, pitting, cavitation damage, and seal face condition. Check volute passages and throat area.', 'inspection', true),
  (v_proc_id, 12, 'Mechanical Seal Inspection', 'Inspect mechanical seal faces, O-rings, and springs. Check for wear patterns, heat checking, or chemical attack. Replace if any damage found.', 'inspection', true),
  (v_proc_id, 13, 'Fastener Inspection', 'Inspect all bolts and fasteners for stretch, corrosion, or thread damage. Replace per ASTM A193/A194 as needed.', 'inspection', true);
END $$;

-- Insert Inspection & Repair Scope Procedure
DO $$
DECLARE
  v_proc_id uuid;
BEGIN
  INSERT INTO procedure_templates (name, version, procedure_type, phase, estimated_duration, is_active) VALUES
  ('Determine Repair Scope & Parts Required', '1.0', 'inspection', 'inspection'::work_order_phase, interval '3 hours', true) RETURNING id INTO v_proc_id;

  INSERT INTO procedure_steps (procedure_template_id, step_number, title, instructions, step_type) VALUES
  (v_proc_id, 1, 'Bearing Assessment', 'Determine bearing replacement needs. Specify equal or better ABMA rating. Specify fit and clearance: C3 or C4 per OEM specs.', 'decision'),
  (v_proc_id, 2, 'Seal Replacement Specification', 'Specify mechanical seal replacement per API 682 arrangement. Verify flush plan compatibility. Order with proper materials for service.', 'decision'),
  (v_proc_id, 3, 'Wear Components Assessment', 'Identify wear rings, bushings, sleeves requiring rebuild to ANSI/HI clearances. Specify machining or replacement as needed.', 'decision'),
  (v_proc_id, 4, 'Winding Evaluation', 'If electrical tests failed, plan rewind to OEM turns, Class F or H insulation, VPI impregnated. Obtain winding data sheet.', 'decision'),
  (v_proc_id, 5, 'Shaft Repair Planning', 'For undersized journals: plan spray metal build or sleeve installation. Specify final grind dimensions per bearing interference chart.', 'decision'),
  (v_proc_id, 6, 'Hardware & Gasket Specification', 'Specify replacement of all non-reusable items with new grade and finish per ASTM A193/A194. List all gaskets, O-rings, and fasteners.', 'action'),
  (v_proc_id, 7, 'Balance Correction Planning', 'For any rotating part requiring work: plan rebalance to ISO 21940 G2.5 (or G1.0 for critical service).', 'action'),
  (v_proc_id, 8, 'Prepare Parts Requisition', 'Compile complete parts list with quantities, specs, and sources. Prepare repair estimate with labor hours and parts cost.', 'action');
END $$;

-- Insert Rebuild Procedure
DO $$
DECLARE
  v_proc_id uuid;
BEGIN
  INSERT INTO procedure_templates (name, version, procedure_type, phase, estimated_duration, is_active) VALUES
  ('Equipment Rebuild & Reassembly', '1.0', 'rebuild', 'rebuild'::work_order_phase, interval '12 hours', true) RETURNING id INTO v_proc_id;

  INSERT INTO procedure_steps (procedure_template_id, step_number, title, instructions, step_type, photo_required) VALUES
  (v_proc_id, 1, 'Final Component Cleaning', 'Solvent wash, rinse, bake dry all components. Blow dry with clean compressed air. Ensure all surfaces are contaminant-free.', 'action', false);

  INSERT INTO procedure_steps (procedure_template_id, step_number, title, instructions, step_type, measurements_required, safety_notes, photo_required) VALUES
  (v_proc_id, 2, 'Machine Work Verification', 'Turn journals, sleeve bores, and face seal lands to specification. Verify flatness ≤0.001 in per 6 in. Check all critical dimensions.', 'measurement', '[{"name":"Flatness","unit":"in","max":0.001},{"name":"Span","unit":"in","value":6}]'::jsonb, null, false),
  (v_proc_id, 3, 'Bearing Installation', 'Heat bearings to 110-120°C using induction heater or oil bath. Install on correct race only. Confirm fit interference per bearing chart.', 'action', '[{"name":"Bearing Temperature","unit":"°C","min":110,"max":120},{"name":"Axial Endplay","unit":"in"}]'::jsonb, 'Wear heat-resistant gloves. Never exceed 120°C bearing temperature.', false),
  (v_proc_id, 4, 'Mechanical Seal Installation', 'Follow vendor IOM precisely. Lubricate all O-rings with clean, compatible fluid. Maintain seal face cleanliness and parallelism throughout.', 'action', null, 'Never touch seal faces with bare hands. Use lint-free gloves.', false),
  (v_proc_id, 5, 'Motor Rotor Centering', 'For motors: center rotor in stator. Measure air gap at 8 points. Variation must be ≤10% of average. Shim as needed.', 'action', '[{"name":"Air Gap","unit":"in"},{"name":"Variation","unit":"%","max":10}]'::jsonb, null, true);

  INSERT INTO procedure_steps (procedure_template_id, step_number, title, instructions, step_type) VALUES
  (v_proc_id, 6, 'Hardware Torque Application', 'Torque all fasteners to specification using calibrated torque wrench. Follow proper tightening sequence (criss-cross pattern).', 'action');

  INSERT INTO procedure_steps (procedure_template_id, step_number, title, instructions, step_type, measurements_required) VALUES
  (v_proc_id, 7, 'Motor Final Megger & PI', 'For motors: perform final insulation resistance and PI test after close-up. Values should meet or exceed initial target readings.', 'measurement', '[{"name":"IR Reading","unit":"MΩ","min":10},{"name":"PI Ratio","min":2.0}]'::jsonb),
  (v_proc_id, 8, 'Pump Clearances Verification', 'For pumps: install wear rings, impeller, sleeves, keys to spec clearances. Verify axial float and impeller lift per OEM specs.', 'measurement', '[{"name":"Axial Float","unit":"in"},{"name":"Impeller Clearance","unit":"in"}]'::jsonb);

  INSERT INTO procedure_steps (procedure_template_id, step_number, title, instructions, step_type, photo_required) VALUES
  (v_proc_id, 9, 'Casing Close-Up', 'Install new gaskets. Close casing using criss-cross torque pattern. Verify alignment before final torque.', 'action', false);

  INSERT INTO procedure_steps (procedure_template_id, step_number, title, instructions, step_type, measurements_required, photo_required) VALUES
  (v_proc_id, 10, 'Dynamic Balancing', 'Balance rotor/impeller assembly to ISO 21940 G2.5 (or API 610 grade 1W/N). Record correction grams and angular location.', 'action', '[{"name":"Initial Unbalance","unit":"g-in"},{"name":"Final Unbalance","unit":"g-in","max":0.1},{"name":"Correction Mass","unit":"g"},{"name":"Angle","unit":"degrees"}]'::jsonb, true);
END $$;

-- Insert Final Testing Procedure
DO $$
DECLARE
  v_proc_id uuid;
BEGIN
  INSERT INTO procedure_templates (name, version, procedure_type, phase, estimated_duration, is_active) VALUES
  ('Final Testing & Quality Verification', '1.0', 'test', 'final_testing'::work_order_phase, interval '4 hours', true) RETURNING id INTO v_proc_id;

  INSERT INTO procedure_steps (procedure_template_id, step_number, title, instructions, step_type, measurements_required) VALUES
  (v_proc_id, 1, 'Motor No-Load Run Test', 'For motors: Run no-load test. Monitor voltage ±1%, current balance ≤10%. Verify vibration per ISO 10816 Zone A/B. Monitor temperature rise until stable within design limit.', 'measurement', '[{"name":"Voltage","unit":"V"},{"name":"Current L1","unit":"A"},{"name":"Current L2","unit":"A"},{"name":"Current L3","unit":"A"},{"name":"Current Imbalance","unit":"%","max":10},{"name":"Vibration","unit":"in/s","max":0.15},{"name":"Temperature Rise","unit":"°C"}]'::jsonb),
  (v_proc_id, 2, 'Motor Final Electrical Verification', 'Perform final insulation resistance and PI check. Save surge comparison baseline for future reference and trending.', 'measurement', '[{"name":"Final IR","unit":"MΩ","min":100},{"name":"Final PI","min":2.0}]'::jsonb);

  INSERT INTO procedure_steps (procedure_template_id, step_number, title, instructions, step_type, measurements_required, safety_notes) VALUES
  (v_proc_id, 3, 'Pump Hydrostatic Test', 'For pumps: Perform hydrostatic test at 1.5× MAWP for 5 minutes. Verify no visible leakage from casing, seals, or connections.', 'measurement', '[{"name":"Test Pressure","unit":"psi"},{"name":"MAWP","unit":"psi"},{"name":"Test Duration","unit":"min","value":5}]'::jsonb, 'Stand clear during pressurization. Use proper blinds and pressure relief.');

  INSERT INTO procedure_steps (procedure_template_id, step_number, title, instructions, step_type, measurements_required) VALUES
  (v_proc_id, 4, 'Pump Performance Test', 'Run performance test on test stand. Measure flow, head, power, and efficiency. Compare to OEM curve: acceptance ±5%.', 'measurement', '[{"name":"Flow Rate","unit":"GPM"},{"name":"Discharge Head","unit":"ft"},{"name":"Power","unit":"HP"},{"name":"Efficiency","unit":"%"},{"name":"Curve Deviation","unit":"%","max":5}]'::jsonb),
  (v_proc_id, 5, 'Vibration & Noise Test', 'Measure vibration at bearing housings in horizontal, vertical, and axial directions. Verify within ISO 10816 Zone A/B. Note any unusual noise.', 'measurement', '[{"name":"Vibration Horizontal","unit":"in/s","max":0.15},{"name":"Vibration Vertical","unit":"in/s","max":0.15},{"name":"Vibration Axial","unit":"in/s","max":0.15}]'::jsonb),
  (v_proc_id, 6, 'Seal Leak Test', 'For pumps with mechanical seals: Verify no visible leakage for 5 minutes at operating pressure. Document seal performance.', 'measurement', '[{"name":"Operating Pressure","unit":"psi"},{"name":"Test Duration","unit":"min","value":5},{"name":"Leakage","unit":"drops/min","max":0}]'::jsonb);

  INSERT INTO procedure_steps (procedure_template_id, step_number, title, instructions, step_type, photo_required) VALUES
  (v_proc_id, 7, 'Documentation & Certification', 'Record all test data, vibration spectra, and photos. Complete test report and quality certifications. Tag equipment with shop number and recommended service interval.', 'action', true);
END $$;