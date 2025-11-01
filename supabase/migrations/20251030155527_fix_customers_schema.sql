/*
  # Fix Customers Table Schema

  1. Changes
    - Add missing columns to customers table for compatibility
    - Add name column (alias for company_name via view or update queries)
    - Add contact_name, contact_phone, contact_email columns
    
  2. Notes
    - Maintains backward compatibility with existing company_name column
    - New columns are optional to not break existing data
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'name'
  ) THEN
    ALTER TABLE customers ADD COLUMN name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'contact_name'
  ) THEN
    ALTER TABLE customers ADD COLUMN contact_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE customers ADD COLUMN contact_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE customers ADD COLUMN contact_email text;
  END IF;
END $$;

UPDATE customers 
SET name = company_name 
WHERE name IS NULL AND company_name IS NOT NULL;

UPDATE customers 
SET contact_name = contact_person 
WHERE contact_name IS NULL AND contact_person IS NOT NULL;

UPDATE customers 
SET contact_email = email 
WHERE contact_email IS NULL AND email IS NOT NULL;

UPDATE customers 
SET contact_phone = phone 
WHERE contact_phone IS NULL AND phone IS NOT NULL;
