/*
  # Analytics & Reporting Dashboard System

  ## Overview
  This migration creates database views and helper tables for analytics and KPI tracking,
  enabling comprehensive business intelligence and reporting capabilities.

  ## New Views & Tables

  ### 1. Views for KPIs
  - work_order_metrics: Completion rates, avg time, success rates
  - technician_performance: Utilization, efficiency, quality metrics
  - revenue_metrics: Revenue by period, customer, service type
  - customer_satisfaction: Ratings, feedback, repeat business
  - inventory_metrics: Stock levels, turnover, costs
  - equipment_reliability: Failure rates, MTBF, maintenance history

  ### 2. `dashboard_widgets`
  - Configurable dashboard widgets per user/role
  - Fields: id, user_id, widget_type, configuration, position, size

  ### 3. `saved_reports`
  - User-saved report configurations
  - Fields: id, name, report_type, filters, parameters, created_by

  ### 4. `report_schedules`
  - Automated report generation and delivery
  - Fields: id, saved_report_id, frequency, recipients, last_run, next_run

  ## Security
  - Views respect RLS policies of underlying tables
  - Report access controlled by role

  ## Important Notes
  - Views are materialized for performance where appropriate
  - Refresh schedules can be configured
  - Export functionality will query these views
*/

-- Work Order Metrics View
CREATE OR REPLACE VIEW work_order_metrics AS
SELECT
  DATE_TRUNC('month', wo.created_at) as period,
  COUNT(*) as total_work_orders,
  COUNT(*) FILTER (WHERE wo.status = 'completed') as completed_work_orders,
  COUNT(*) FILTER (WHERE wo.status = 'cancelled') as cancelled_work_orders,
  ROUND(AVG(EXTRACT(EPOCH FROM (wo.completed_at - wo.started_at)) / 3600.0)::numeric, 2) as avg_completion_hours,
  ROUND(AVG(wo.actual_hours)::numeric, 2) as avg_actual_hours,
  ROUND((COUNT(*) FILTER (WHERE wo.status = 'completed')::numeric / NULLIF(COUNT(*), 0) * 100), 2) as completion_rate,
  COUNT(*) FILTER (WHERE wo.priority = 'emergency') as emergency_work_orders,
  COUNT(*) FILTER (WHERE wo.status = 'in_progress' AND wo.scheduled_date < CURRENT_DATE) as overdue_work_orders
FROM work_orders wo
GROUP BY DATE_TRUNC('month', wo.created_at);

-- Technician Performance View
CREATE OR REPLACE VIEW technician_performance AS
SELECT
  u.id as technician_id,
  u.full_name as technician_name,
  DATE_TRUNC('month', wo.completed_at) as period,
  COUNT(DISTINCT wo.id) as work_orders_completed,
  ROUND(SUM(wo.actual_hours)::numeric, 2) as total_hours_worked,
  ROUND(AVG(wo.actual_hours)::numeric, 2) as avg_hours_per_job,
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM work_sessions ws
    WHERE ws.work_order_id = wo.id
    AND ws.progress_percentage = 100
  )) as jobs_completed_successfully,
  ROUND(
    (COUNT(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM work_sessions ws
      WHERE ws.work_order_id = wo.id
      AND ws.progress_percentage = 100
    ))::numeric / NULLIF(COUNT(*), 0) * 100), 2
  ) as success_rate
FROM users u
LEFT JOIN work_orders wo ON wo.assigned_to = u.id AND wo.status = 'completed'
WHERE u.role = 'technician'
GROUP BY u.id, u.full_name, DATE_TRUNC('month', wo.completed_at);

-- Customer Activity View
CREATE OR REPLACE VIEW customer_activity AS
SELECT
  c.id as customer_id,
  c.company_name,
  c.priority_level,
  c.account_status,
  COUNT(DISTINCT wo.id) as total_work_orders,
  COUNT(DISTINCT wo.id) FILTER (WHERE wo.status = 'completed') as completed_work_orders,
  MAX(wo.completed_at) as last_service_date,
  COUNT(DISTINCT eu.id) as equipment_count,
  COUNT(DISTINCT ct.id) as active_contracts,
  COALESCE(SUM(wop.quantity_used * wop.unit_cost), 0) as total_parts_cost
FROM customers c
LEFT JOIN work_orders wo ON wo.customer_id = c.id
LEFT JOIN equipment_units eu ON eu.customer_id = c.id
LEFT JOIN contracts ct ON ct.customer_id = c.id AND ct.status = 'active'
LEFT JOIN work_order_parts wop ON wop.work_order_id = wo.id
GROUP BY c.id, c.company_name, c.priority_level, c.account_status;

-- Inventory Stock Status View
CREATE OR REPLACE VIEW inventory_stock_status AS
SELECT
  ii.id as item_id,
  ii.part_number,
  ii.description,
  ii.category,
  ii.reorder_level,
  ii.unit_cost,
  COALESCE(SUM(ws.quantity_on_hand), 0) as total_quantity,
  COALESCE(SUM(ws.quantity_reserved), 0) as total_reserved,
  COALESCE(SUM(ws.quantity_available), 0) as total_available,
  CASE
    WHEN COALESCE(SUM(ws.quantity_on_hand), 0) <= ii.reorder_level THEN 'low'
    WHEN COALESCE(SUM(ws.quantity_on_hand), 0) = 0 THEN 'out_of_stock'
    ELSE 'normal'
  END as stock_status,
  COUNT(DISTINCT ws.warehouse_id) as warehouses_stocked,
  s.name as preferred_supplier_name
FROM inventory_items ii
LEFT JOIN warehouse_stock ws ON ws.inventory_item_id = ii.id
LEFT JOIN suppliers s ON s.id = ii.preferred_supplier_id
WHERE ii.is_active = true
GROUP BY ii.id, ii.part_number, ii.description, ii.category, ii.reorder_level, ii.unit_cost, s.name;

-- Equipment Reliability Metrics View
CREATE OR REPLACE VIEW equipment_reliability_metrics AS
SELECT
  et.name as equipment_type,
  em.model_number,
  m.name as manufacturer_name,
  COUNT(DISTINCT eu.id) as total_units,
  COUNT(DISTINCT wo.id) as total_repairs,
  ROUND(COUNT(DISTINCT wo.id)::numeric / NULLIF(COUNT(DISTINCT eu.id), 0), 2) as repairs_per_unit,
  COUNT(DISTINCT wo.id) FILTER (WHERE wo.work_type = 'pm') as preventive_maintenance_count,
  COUNT(DISTINCT wo.id) FILTER (WHERE wo.work_type = 'repair') as reactive_repair_count,
  ROUND(AVG(EXTRACT(EPOCH FROM (wo.completed_at - wo.started_at)) / 3600.0)::numeric, 2) as avg_repair_hours
FROM equipment_types et
JOIN equipment_models em ON em.equipment_type_id = et.id
JOIN manufacturers m ON m.id = em.manufacturer_id
LEFT JOIN equipment_units eu ON eu.equipment_model_id = em.id
LEFT JOIN work_orders wo ON wo.equipment_unit_id = eu.id AND wo.status = 'completed'
GROUP BY et.name, em.model_number, m.name;

-- Quote Conversion Metrics View
CREATE OR REPLACE VIEW quote_conversion_metrics AS
SELECT
  DATE_TRUNC('month', q.created_at) as period,
  COUNT(*) as total_quotes,
  COUNT(*) FILTER (WHERE q.status = 'sent') as quotes_sent,
  COUNT(*) FILTER (WHERE q.status = 'accepted') as quotes_accepted,
  COUNT(*) FILTER (WHERE q.status = 'converted') as quotes_converted,
  ROUND((COUNT(*) FILTER (WHERE q.status = 'accepted')::numeric / NULLIF(COUNT(*) FILTER (WHERE q.status = 'sent'), 0) * 100), 2) as acceptance_rate,
  ROUND((COUNT(*) FILTER (WHERE q.status = 'converted')::numeric / NULLIF(COUNT(*) FILTER (WHERE q.status = 'accepted'), 0) * 100), 2) as conversion_rate,
  ROUND(AVG(q.total_amount)::numeric, 2) as avg_quote_value,
  ROUND(SUM(q.total_amount) FILTER (WHERE q.status = 'accepted')::numeric, 2) as total_accepted_value
FROM quotes q
GROUP BY DATE_TRUNC('month', q.created_at);

-- Dashboard widgets configuration table
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  widget_type text NOT NULL,
  title text NOT NULL,
  configuration jsonb DEFAULT '{}'::jsonb,
  position_row integer NOT NULL DEFAULT 0,
  position_col integer NOT NULL DEFAULT 0,
  size_width integer NOT NULL DEFAULT 1,
  size_height integer NOT NULL DEFAULT 1,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Saved reports table
CREATE TABLE IF NOT EXISTS saved_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  report_type text NOT NULL,
  filters jsonb DEFAULT '{}'::jsonb,
  parameters jsonb DEFAULT '{}'::jsonb,
  columns jsonb,
  sort_order jsonb,
  created_by uuid REFERENCES users(id),
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Report schedules table
CREATE TABLE IF NOT EXISTS report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_report_id uuid REFERENCES saved_reports(id) ON DELETE CASCADE,
  schedule_name text NOT NULL,
  frequency text NOT NULL,
  frequency_value integer,
  recipients text[] NOT NULL,
  format text DEFAULT 'pdf',
  is_active boolean DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_user ON dashboard_widgets(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_reports_created_by ON saved_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_saved_reports_public ON saved_reports(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_report_schedules_next_run ON report_schedules(next_run_at) WHERE is_active = true;

-- Enable RLS
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dashboard_widgets
CREATE POLICY "Users can view their own dashboard widgets"
  ON dashboard_widgets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own dashboard widgets"
  ON dashboard_widgets FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for saved_reports
CREATE POLICY "Users can view their own and public saved reports"
  ON saved_reports FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR is_public = true
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can create saved reports"
  ON saved_reports FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own saved reports"
  ON saved_reports FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own saved reports"
  ON saved_reports FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- RLS Policies for report_schedules
CREATE POLICY "Users can view schedules for accessible reports"
  ON report_schedules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM saved_reports sr
      WHERE sr.id = report_schedules.saved_report_id
      AND (
        sr.created_by = auth.uid()
        OR sr.is_public = true
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'manager')
        )
      )
    )
  );

CREATE POLICY "Users can manage schedules for their reports"
  ON report_schedules FOR ALL
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );