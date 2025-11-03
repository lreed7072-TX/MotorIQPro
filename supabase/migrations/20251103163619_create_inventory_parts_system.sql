/*
  # Inventory & Parts Management System

  ## Overview
  This migration creates a comprehensive inventory and parts management system that allows tracking
  of parts stock, reorder levels, supplier information, and links parts usage directly to work orders.

  ## New Tables

  ### 1. `warehouses`
  - Tracks physical storage locations for inventory
  - Fields: id, name, address, contact_info, is_active
  
  ### 2. `suppliers`
  - Manages supplier/vendor information
  - Fields: id, name, contact_person, email, phone, address, payment_terms, notes
  
  ### 3. `inventory_items`
  - Master inventory catalog with stock levels
  - Fields: id, part_number, description, category, unit_of_measure, unit_cost, 
    reorder_level, reorder_quantity, preferred_supplier_id, barcode, qr_code
  
  ### 4. `warehouse_stock`
  - Tracks stock levels at each warehouse location
  - Fields: id, inventory_item_id, warehouse_id, quantity_on_hand, 
    quantity_reserved, last_counted_at
  
  ### 5. `stock_transactions`
  - Audit trail for all inventory movements
  - Fields: id, inventory_item_id, warehouse_id, transaction_type, quantity, 
    reference_type, reference_id, performed_by, notes
  
  ### 6. `purchase_orders`
  - Tracks orders placed with suppliers
  - Fields: id, po_number, supplier_id, status, order_date, expected_delivery_date, 
    total_amount, created_by, approved_by
  
  ### 7. `purchase_order_items`
  - Line items for purchase orders
  - Fields: id, purchase_order_id, inventory_item_id, quantity_ordered, 
    quantity_received, unit_price, notes
  
  ### 8. `work_order_parts`
  - Links parts used to specific work orders
  - Fields: id, work_order_id, work_session_id, inventory_item_id, quantity_used, 
    warehouse_id, serial_numbers, installed_by, installed_at, notes

  ## Security
  - All tables have RLS enabled
  - Technicians can view inventory and record parts usage
  - Managers can manage inventory, create POs, and approve orders
  - Admins have full access

  ## Important Notes
  - Low stock alerts are determined by comparing quantity_on_hand with reorder_level
  - Stock reservations prevent overselling
  - All transactions are audited in stock_transactions table
  - Barcode/QR code fields support scanning functionality
*/

-- Create enums for inventory system
DO $$ BEGIN
  CREATE TYPE inventory_category AS ENUM (
    'bearings',
    'seals',
    'gaskets',
    'windings',
    'impellers',
    'shafts',
    'couplings',
    'fasteners',
    'lubricants',
    'electrical',
    'tools',
    'consumables',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE stock_transaction_type AS ENUM (
    'purchase',
    'usage',
    'adjustment',
    'transfer',
    'return',
    'damaged',
    'count_correction'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE purchase_order_status AS ENUM (
    'draft',
    'submitted',
    'approved',
    'ordered',
    'partially_received',
    'received',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address jsonb,
  contact_info jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address jsonb,
  payment_terms text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Inventory items master catalog
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number text UNIQUE NOT NULL,
  description text NOT NULL,
  category inventory_category DEFAULT 'other',
  specifications jsonb,
  unit_of_measure text DEFAULT 'EA',
  unit_cost numeric(10,2) DEFAULT 0,
  reorder_level integer DEFAULT 0,
  reorder_quantity integer DEFAULT 0,
  preferred_supplier_id uuid REFERENCES suppliers(id),
  barcode text,
  qr_code text,
  photo_url text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Stock levels by warehouse
CREATE TABLE IF NOT EXISTS warehouse_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity_on_hand integer DEFAULT 0,
  quantity_reserved integer DEFAULT 0,
  quantity_available integer GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  last_counted_at timestamptz,
  last_counted_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(inventory_item_id, warehouse_id)
);

-- Stock transaction audit trail
CREATE TABLE IF NOT EXISTS stock_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES warehouses(id),
  transaction_type stock_transaction_type NOT NULL,
  quantity integer NOT NULL,
  reference_type text,
  reference_id uuid,
  performed_by uuid REFERENCES users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Purchase orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text UNIQUE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id),
  status purchase_order_status DEFAULT 'draft',
  order_date date DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  actual_delivery_date date,
  total_amount numeric(10,2) DEFAULT 0,
  notes text,
  created_by uuid REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Purchase order line items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES inventory_items(id),
  quantity_ordered integer NOT NULL,
  quantity_received integer DEFAULT 0,
  unit_price numeric(10,2) NOT NULL,
  line_total numeric(10,2) GENERATED ALWAYS AS (quantity_ordered * unit_price) STORED,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Parts used in work orders
CREATE TABLE IF NOT EXISTS work_order_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES work_orders(id) ON DELETE CASCADE,
  work_session_id uuid REFERENCES work_sessions(id),
  inventory_item_id uuid REFERENCES inventory_items(id),
  quantity_used integer NOT NULL,
  warehouse_id uuid REFERENCES warehouses(id),
  unit_cost numeric(10,2),
  serial_numbers text[],
  installed_by uuid REFERENCES users(id),
  installed_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_part_number ON inventory_items(part_number);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_item ON warehouse_stock(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_warehouse ON warehouse_stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_item ON stock_transactions(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_warehouse ON stock_transactions(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_work_order_parts_work_order ON work_order_parts(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_parts_item ON work_order_parts(inventory_item_id);

-- Enable RLS on all tables
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_parts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for warehouses
CREATE POLICY "All authenticated users can view warehouses"
  ON warehouses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage warehouses"
  ON warehouses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- RLS Policies for suppliers
CREATE POLICY "All authenticated users can view suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage suppliers"
  ON suppliers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- RLS Policies for inventory_items
CREATE POLICY "All authenticated users can view inventory items"
  ON inventory_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage inventory items"
  ON inventory_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- RLS Policies for warehouse_stock
CREATE POLICY "All authenticated users can view warehouse stock"
  ON warehouse_stock FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage warehouse stock"
  ON warehouse_stock FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- RLS Policies for stock_transactions
CREATE POLICY "All authenticated users can view stock transactions"
  ON stock_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can create stock transactions"
  ON stock_transactions FOR INSERT
  TO authenticated
  WITH CHECK (performed_by = auth.uid());

-- RLS Policies for purchase_orders
CREATE POLICY "All authenticated users can view purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage purchase orders"
  ON purchase_orders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- RLS Policies for purchase_order_items
CREATE POLICY "All authenticated users can view PO items"
  ON purchase_order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage PO items"
  ON purchase_order_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- RLS Policies for work_order_parts
CREATE POLICY "Users can view parts for their work orders"
  ON work_order_parts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_parts.work_order_id
      AND (
        wo.assigned_to = auth.uid()
        OR wo.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'manager')
        )
      )
    )
  );

CREATE POLICY "Technicians can add parts to their work orders"
  ON work_order_parts FOR INSERT
  TO authenticated
  WITH CHECK (
    installed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_parts.work_order_id
      AND wo.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can manage all work order parts"
  ON work_order_parts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );