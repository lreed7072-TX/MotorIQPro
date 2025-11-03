/*
  # Quoting & Contracts System

  ## Overview
  This migration creates a comprehensive quoting and contracts system that allows creating quotes
  with parts/labor breakdown, e-signatures, contract tracking, and quote-to-work-order conversion.

  ## New Tables

  ### 1. `leads`
  - Tracks potential customers and opportunities
  - Fields: id, company_name, contact_person, email, phone, source, status, 
    estimated_value, assigned_to, notes

  ### 2. `quotes`
  - Master quotes table
  - Fields: id, quote_number, lead_id, customer_id, status, valid_until, 
    subtotal, tax_rate, tax_amount, total_amount, terms, notes

  ### 3. `quote_line_items`
  - Individual line items for quotes (parts, labor, services)
  - Fields: id, quote_id, item_type, description, quantity, unit_price, 
    discount_percent, line_total

  ### 4. `contracts`
  - Service contracts and agreements
  - Fields: id, contract_number, customer_id, contract_type, start_date, 
    end_date, renewal_date, value, status, terms

  ### 5. `contract_services`
  - Services included in contracts
  - Fields: id, contract_id, service_description, frequency, last_performed, 
    next_due

  ### 6. `signatures`
  - Digital signature records
  - Fields: id, document_type, document_id, signer_name, signer_email, 
    signature_data, ip_address, signed_at

  ## Security
  - All tables have RLS enabled
  - Salespeople can create and manage their own leads and quotes
  - Managers can approve quotes and manage contracts
  - Admins have full access

  ## Important Notes
  - Quotes can be converted to work orders
  - Contracts track maintenance schedules
  - E-signatures are stored with audit trail
  - Tax calculations are automated
*/

-- Create enums
DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM (
    'new',
    'contacted',
    'qualified',
    'quoted',
    'negotiation',
    'won',
    'lost',
    'inactive'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE lead_source AS ENUM (
    'website',
    'referral',
    'cold_call',
    'email',
    'trade_show',
    'existing_customer',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE quote_status AS ENUM (
    'draft',
    'sent',
    'viewed',
    'accepted',
    'rejected',
    'expired',
    'converted'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE quote_item_type AS ENUM (
    'part',
    'labor',
    'service',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE contract_type AS ENUM (
    'maintenance',
    'service_agreement',
    'warranty',
    'retainer',
    'one_time'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE contract_status AS ENUM (
    'draft',
    'active',
    'expiring_soon',
    'expired',
    'cancelled',
    'completed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE signature_document_type AS ENUM (
    'quote',
    'contract',
    'work_order',
    'report',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_person text NOT NULL,
  email text,
  phone text,
  address jsonb,
  source lead_source DEFAULT 'other',
  status lead_status DEFAULT 'new',
  estimated_value numeric(10,2),
  assigned_to uuid REFERENCES users(id),
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text UNIQUE NOT NULL,
  lead_id uuid REFERENCES leads(id),
  customer_id uuid REFERENCES customers(id),
  equipment_type text,
  description text,
  status quote_status DEFAULT 'draft',
  valid_until date,
  subtotal numeric(10,2) DEFAULT 0,
  tax_rate numeric(5,2) DEFAULT 0,
  tax_amount numeric(10,2) GENERATED ALWAYS AS (subtotal * tax_rate / 100) STORED,
  discount_amount numeric(10,2) DEFAULT 0,
  total_amount numeric(10,2) GENERATED ALWAYS AS (subtotal + (subtotal * tax_rate / 100) - discount_amount) STORED,
  terms text,
  notes text,
  created_by uuid REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  converted_to_work_order_id uuid REFERENCES work_orders(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Quote line items
CREATE TABLE IF NOT EXISTS quote_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE,
  item_type quote_item_type NOT NULL,
  inventory_item_id uuid REFERENCES inventory_items(id),
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  discount_percent numeric(5,2) DEFAULT 0,
  line_subtotal numeric(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  line_discount numeric(10,2) GENERATED ALWAYS AS (quantity * unit_price * discount_percent / 100) STORED,
  line_total numeric(10,2) GENERATED ALWAYS AS (quantity * unit_price * (1 - discount_percent / 100)) STORED,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id),
  contract_type contract_type NOT NULL,
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  renewal_date date,
  auto_renew boolean DEFAULT false,
  value numeric(10,2) NOT NULL,
  billing_frequency text,
  status contract_status DEFAULT 'draft',
  terms text,
  notes text,
  created_by uuid REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Contract services (for maintenance contracts)
CREATE TABLE IF NOT EXISTS contract_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES contracts(id) ON DELETE CASCADE,
  equipment_unit_id uuid REFERENCES equipment_units(id),
  service_description text NOT NULL,
  frequency text,
  frequency_days integer,
  last_performed_date date,
  last_work_order_id uuid REFERENCES work_orders(id),
  next_due_date date,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Digital signatures
CREATE TABLE IF NOT EXISTS signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type signature_document_type NOT NULL,
  document_id uuid NOT NULL,
  signer_name text NOT NULL,
  signer_email text,
  signer_title text,
  signature_data text NOT NULL,
  ip_address text,
  user_agent text,
  signed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_lead ON quotes(lead_id);
CREATE INDEX IF NOT EXISTS idx_quote_line_items_quote ON quote_line_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer ON contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_dates ON contracts(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_contract_services_contract ON contract_services(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_services_next_due ON contract_services(next_due_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_signatures_document ON signatures(document_type, document_id);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leads
CREATE POLICY "Salespeople can view all leads"
  ON leads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their assigned leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- RLS Policies for quotes
CREATE POLICY "Users can view quotes they created or for their customers"
  ON quotes FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can create quotes"
  ON quotes FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their quotes"
  ON quotes FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- RLS Policies for quote_line_items
CREATE POLICY "Users can view quote line items for accessible quotes"
  ON quote_line_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_line_items.quote_id
      AND (
        quotes.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'manager')
        )
      )
    )
  );

CREATE POLICY "Users can manage line items for their quotes"
  ON quote_line_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_line_items.quote_id
      AND (
        quotes.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'manager')
        )
      )
    )
  );

-- RLS Policies for contracts
CREATE POLICY "All authenticated users can view contracts"
  ON contracts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can manage contracts"
  ON contracts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- RLS Policies for contract_services
CREATE POLICY "All authenticated users can view contract services"
  ON contract_services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can manage contract services"
  ON contract_services FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- RLS Policies for signatures
CREATE POLICY "All authenticated users can view signatures"
  ON signatures FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can create signatures"
  ON signatures FOR INSERT
  TO authenticated
  WITH CHECK (true);