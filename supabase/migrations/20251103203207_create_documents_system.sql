/*
  # Create Documents Management System

  1. New Tables
    - `document_folders` - Organize documents into folders
      - `id` (uuid, primary key)
      - `name` (text) - Folder name
      - `parent_folder_id` (uuid, nullable) - For nested folders
      - `description` (text, nullable)
      - `created_by` (uuid) - User who created folder
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `documents` - General document library
      - `id` (uuid, primary key)
      - `folder_id` (uuid, nullable) - Which folder it belongs to
      - `name` (text) - Document name
      - `file_url` (text) - URL to stored file
      - `file_type` (text) - File extension/mime type
      - `file_size` (bigint) - Size in bytes
      - `description` (text, nullable)
      - `uploaded_by` (uuid) - User who uploaded
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `work_order_documents` - Documents attached to specific work orders
      - `id` (uuid, primary key)
      - `work_order_id` (uuid) - FK to work_orders
      - `name` (text) - Document name
      - `file_url` (text) - URL to stored file
      - `file_type` (text) - File extension/mime type
      - `file_size` (bigint) - Size in bytes
      - `description` (text, nullable)
      - `uploaded_by` (uuid) - User who uploaded
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Authenticated users can view all documents
    - Only admins and managers can create folders
    - Users can upload documents to work orders they have access to
    - Users can upload documents to the general library
*/

-- Create document_folders table
CREATE TABLE IF NOT EXISTS document_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_folder_id uuid REFERENCES document_folders(id) ON DELETE CASCADE,
  description text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create documents table (general library)
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES document_folders(id) ON DELETE SET NULL,
  name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size bigint DEFAULT 0,
  description text,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create work_order_documents table
CREATE TABLE IF NOT EXISTS work_order_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES work_orders(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size bigint DEFAULT 0,
  description text,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_document_folders_parent ON document_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_work_order_documents_wo ON work_order_documents(work_order_id);

-- Enable RLS
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_folders
CREATE POLICY "Authenticated users can view folders"
  ON document_folders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage folders"
  ON document_folders FOR ALL
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager'))
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager'));

-- RLS Policies for documents
CREATE POLICY "Authenticated users can view documents"
  ON documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can upload documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid() OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager'))
  WITH CHECK (uploaded_by = auth.uid() OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager'));

CREATE POLICY "Users can delete own documents or admins can delete any"
  ON documents FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid() OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager'));

-- RLS Policies for work_order_documents
CREATE POLICY "Users can view documents for accessible work orders"
  ON work_order_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders
      WHERE work_orders.id = work_order_documents.work_order_id
      AND (
        work_orders.assigned_to = auth.uid() OR
        work_orders.created_by = auth.uid() OR
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager')
      )
    )
  );

CREATE POLICY "Users can upload documents to accessible work orders"
  ON work_order_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM work_orders
      WHERE work_orders.id = work_order_documents.work_order_id
      AND (
        work_orders.assigned_to = auth.uid() OR
        work_orders.created_by = auth.uid() OR
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager')
      )
    )
  );

CREATE POLICY "Users can update documents on accessible work orders"
  ON work_order_documents FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid() OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager')
  )
  WITH CHECK (
    uploaded_by = auth.uid() OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager')
  );

CREATE POLICY "Users can delete documents from accessible work orders"
  ON work_order_documents FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid() OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager')
  );

-- Add updated_at triggers
CREATE TRIGGER document_folders_updated_at
  BEFORE UPDATE ON document_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER work_order_documents_updated_at
  BEFORE UPDATE ON work_order_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
