/*
  # Fix Equipment Types Category Constraint

  1. Changes
    - Make category column nullable or add default value
    - Allow creation of equipment types without specifying category
    
  2. Notes
    - Sets default category to 'other' for flexibility
*/

ALTER TABLE equipment_types 
ALTER COLUMN category SET DEFAULT 'other'::equipment_category;

ALTER TABLE equipment_types 
ALTER COLUMN category DROP NOT NULL;
