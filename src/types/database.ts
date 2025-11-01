export type UserRole = 'admin' | 'manager' | 'technician';
export type EquipmentCategory = 'motor' | 'pump' | 'gearbox' | 'other';
export type EquipmentStatus = 'active' | 'in_repair' | 'retired';
export type PartType = 'bearing' | 'seal' | 'gasket' | 'winding' | 'impeller' | 'other';
export type ProcedureType = 'teardown' | 'inspection' | 'rebuild' | 'test';
export type StepType = 'action' | 'inspection' | 'measurement' | 'decision';
export type WorkType = 'repair' | 'inspection' | 'rebuild' | 'pm';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'emergency';
export type WorkOrderStatus = 'pending' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type WorkOrderPhase =
  | 'pending_assignment'
  | 'initial_testing'
  | 'teardown'
  | 'repair_scope'
  | 'inspection'
  | 'awaiting_approval'
  | 'rebuild'
  | 'final_testing'
  | 'qc_review'
  | 'completed'
  | 'cancelled';
export type AssignmentStatus = 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type WorkSessionStatus = 'in_progress' | 'completed' | 'paused';
export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
export type StepResult = 'pass' | 'fail' | 'na';
export type PhotoType = 'before' | 'during' | 'after' | 'issue' | 'reference';
export type FindingType = 'wear' | 'damage' | 'out_of_spec' | 'contamination' | 'other';
export type SeverityLevel = 'minor' | 'moderate' | 'major' | 'critical';
export type ReportType = 'inspection' | 'repair' | 'rebuild' | 'test';
export type ReportStatus = 'draft' | 'pending_approval' | 'approved' | 'sent';

export interface User {
  id: string;
  full_name: string;
  role: UserRole;
  certification_level: string | null;
  employee_id: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: Record<string, any>;
  created_at: string;
}

export interface Manufacturer {
  id: string;
  name: string;
  contact_info: Record<string, any>;
  support_url: string | null;
  created_at: string;
}

export interface EquipmentType {
  id: string;
  name: string;
  category: EquipmentCategory;
  specifications_schema: Record<string, any>;
  created_at: string;
}

export interface EquipmentModel {
  id: string;
  manufacturer_id: string;
  equipment_type_id: string;
  model_number: string;
  specifications: Record<string, any>;
  torque_specs: Record<string, any>;
  tolerances: Record<string, any>;
  documentation_links: Record<string, any>;
  created_at: string;
  updated_at: string;
  manufacturer?: Manufacturer;
  equipment_type?: EquipmentType;
}

export interface EquipmentUnit {
  id: string;
  equipment_model_id: string;
  serial_number: string;
  asset_tag: string | null;
  customer_id: string | null;
  installation_date: string | null;
  location: string | null;
  operational_hours: number;
  status: EquipmentStatus;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  equipment_model?: EquipmentModel;
  customer?: Customer;
}

export interface ProcedureTemplate {
  id: string;
  equipment_type_id: string | null;
  name: string;
  version: string;
  procedure_type: ProcedureType;
  estimated_duration: string | null;
  required_tools: any[];
  safety_requirements: any[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  equipment_type?: EquipmentType;
  steps?: ProcedureStep[];
}

export interface ProcedureStep {
  id: string;
  procedure_template_id: string;
  step_number: number;
  title: string;
  description: string | null;
  instructions: string;
  step_type: StepType;
  acceptance_criteria: Record<string, any>;
  measurements_required: any[];
  photo_required: boolean;
  estimated_time: string | null;
  safety_notes: string | null;
  reference_documents: any[];
}

export interface WorkOrder {
  id: string;
  work_order_number: string;
  equipment_unit_id: string;
  customer_id: string | null;
  assigned_to: string | null;
  work_type: WorkType;
  priority: PriorityLevel;
  status: WorkOrderStatus;
  current_phase: WorkOrderPhase;
  scheduled_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  reported_issue: string | null;
  customer_po: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  equipment_unit?: EquipmentUnit;
  customer?: Customer;
  assigned_technician?: User;
  work_sessions?: WorkSession[];
  assignments?: WorkOrderAssignment[];
  approvals?: WorkOrderApproval[];
}

export interface WorkOrderAssignment {
  id: string;
  work_order_id: string;
  assigned_to: string;
  assigned_by: string;
  phase: WorkOrderPhase;
  status: AssignmentStatus;
  assigned_at: string;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  technician?: User;
  assigner?: User;
}

export interface WorkOrderApproval {
  id: string;
  work_order_id: string;
  phase_completed: WorkOrderPhase;
  next_phase: WorkOrderPhase;
  requested_by: string;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  status: ApprovalStatus;
  findings_summary: string | null;
  required_parts: any[];
  estimated_cost: number | null;
  estimated_hours: number | null;
  approval_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  requester?: User;
  approver?: User;
}

export interface WorkSession {
  id: string;
  work_order_id: string;
  procedure_template_id: string | null;
  technician_id: string | null;
  status: WorkSessionStatus;
  current_step_id: string | null;
  progress_percentage: number;
  started_at: string;
  completed_at: string | null;
  last_synced_at: string;
  procedure_template?: ProcedureTemplate;
  step_completions?: StepCompletion[];
}

export interface StepCompletion {
  id: string;
  work_session_id: string;
  step_id: string;
  status: StepStatus;
  result: StepResult | null;
  measurements: Record<string, any>;
  observations: string | null;
  issues_found: string | null;
  completed_by: string | null;
  completed_at: string | null;
  time_spent: string | null;
  step?: ProcedureStep;
}

export interface Photo {
  id: string;
  work_session_id: string;
  step_completion_id: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  photo_type: PhotoType;
  caption: string | null;
  annotations: Record<string, any>;
  ai_analysis: Record<string, any>;
  metadata: Record<string, any>;
  taken_by: string | null;
  taken_at: string;
}

export interface InspectionFinding {
  id: string;
  work_session_id: string;
  step_completion_id: string | null;
  finding_type: FindingType;
  severity: SeverityLevel;
  component: string;
  description: string;
  recommended_action: string | null;
  photo_ids: string[];
  created_at: string;
}

export interface Report {
  id: string;
  work_order_id: string;
  report_type: ReportType;
  report_number: string;
  generated_by: string | null;
  generated_at: string;
  status: ReportStatus;
  content: Record<string, any>;
  pdf_path: string | null;
  approved_by: string | null;
  approved_at: string | null;
  signature_data: Record<string, any>;
  sent_to: string | null;
  sent_at: string | null;
}

export interface PartsCatalog {
  id: string;
  equipment_model_id: string;
  part_number: string;
  description: string | null;
  part_type: PartType;
  specifications: Record<string, any>;
  typical_wear_life: string | null;
  supplier_info: Record<string, any>;
  created_at: string;
}

export interface PartsUsed {
  id: string;
  work_session_id: string;
  part_id: string | null;
  quantity: number;
  serial_numbers: string[];
  installation_notes: string | null;
  installed_by: string | null;
  installed_at: string;
  part?: PartsCatalog;
}

export interface AIInteraction {
  id: string;
  work_session_id: string;
  user_id: string | null;
  query: string;
  context: Record<string, any>;
  response: string;
  helpful: boolean | null;
  feedback: string | null;
  created_at: string;
}
