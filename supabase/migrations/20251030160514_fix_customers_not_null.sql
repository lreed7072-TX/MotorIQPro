/*
  # Fix Customers Table NOT NULL Constraints

  1. Changes
    - Make company_name nullable to support new name column
    - Add trigger to sync name and company_name columns
    
  2. Notes
    - Ensures backward compatibility
    - Automatically syncs data between old and new column names
*/

ALTER TABLE customers ALTER COLUMN company_name DROP NOT NULL;

CREATE OR REPLACE FUNCTION sync_customer_names()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NOT NULL AND NEW.company_name IS NULL THEN
    NEW.company_name := NEW.name;
  END IF;
  
  IF NEW.company_name IS NOT NULL AND NEW.name IS NULL THEN
    NEW.name := NEW.company_name;
  END IF;
  
  IF NEW.contact_name IS NOT NULL AND NEW.contact_person IS NULL THEN
    NEW.contact_person := NEW.contact_name;
  END IF;
  
  IF NEW.contact_person IS NOT NULL AND NEW.contact_name IS NULL THEN
    NEW.contact_name := NEW.contact_person;
  END IF;
  
  IF NEW.contact_email IS NOT NULL AND NEW.email IS NULL THEN
    NEW.email := NEW.contact_email;
  END IF;
  
  IF NEW.email IS NOT NULL AND NEW.contact_email IS NULL THEN
    NEW.contact_email := NEW.email;
  END IF;
  
  IF NEW.contact_phone IS NOT NULL AND NEW.phone IS NULL THEN
    NEW.phone := NEW.contact_phone;
  END IF;
  
  IF NEW.phone IS NOT NULL AND NEW.contact_phone IS NULL THEN
    NEW.contact_phone := NEW.phone;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_customer_names_trigger ON customers;

CREATE TRIGGER sync_customer_names_trigger
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION sync_customer_names();
