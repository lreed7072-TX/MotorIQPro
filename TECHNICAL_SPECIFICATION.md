# Electric Motor & Pump Repair Application - Technical Specification

## Executive Summary

This document outlines the technical architecture for a comprehensive field service application designed to standardize and enhance electric motor and pump repair, inspection, and rebuild operations through AI-powered guidance and systematic workflows.

---

## 1. System Architecture

### 1.1 Application Stack

**Frontend:**
- React 18+ with TypeScript for type safety
- Vite for build tooling and development
- Tailwind CSS for responsive design
- Progressive Web App (PWA) capabilities for offline functionality
- React Router for navigation
- React Query for data caching and synchronization

**Backend:**
- Supabase for backend-as-a-service
- PostgreSQL database with Row Level Security (RLS)
- Supabase Edge Functions for serverless compute
- Real-time subscriptions for collaborative features

**AI/ML Integration:**
- OpenAI GPT-4 or similar LLM for troubleshooting assistance
- Custom fine-tuned models for equipment-specific diagnostics
- Computer vision models for photo analysis (damage detection)
- Integration via Supabase Edge Functions to secure API keys

**Storage:**
- Supabase Storage for photos, diagrams, and documents
- IndexedDB for offline data persistence
- Service Workers for offline-first architecture

### 1.2 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer (PWA)                       │
├─────────────────────────────────────────────────────────────┤
│  React UI Components  │  Offline Storage  │  Service Worker │
│  - Workflow Engine    │  - IndexedDB      │  - Cache API    │
│  - Photo Capture      │  - Local State    │  - Background   │
│  - Report Generator   │                   │    Sync         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ HTTPS/WebSocket
                 │
┌────────────────▼────────────────────────────────────────────┐
│                   Supabase Backend                          │
├─────────────────────────────────────────────────────────────┤
│  Authentication  │  PostgreSQL DB  │  Storage  │  Realtime  │
│  - Email/Pass    │  - RLS Policies │  - Photos │  - Subs    │
│  - Role-based    │  - Migrations   │  - Docs   │            │
├─────────────────────────────────────────────────────────────┤
│                    Edge Functions                           │
│  - AI Troubleshooting  │  - Report Generation               │
│  - Image Analysis      │  - External API Integration        │
└─────────────────────────────────────────────────────────────┘
                 │
                 │
┌────────────────▼────────────────────────────────────────────┐
│                  External Services                          │
├─────────────────────────────────────────────────────────────┤
│  OpenAI API  │  Equipment Mfr APIs  │  Work Order Systems  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema Design

### 2.1 Core Tables

#### **users** (extends Supabase auth.users)
```sql
- id (uuid, PK, FK to auth.users)
- full_name (text)
- role (enum: admin, supervisor, technician, viewer)
- certification_level (text)
- employee_id (text, unique)
- phone (text)
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### **manufacturers**
```sql
- id (uuid, PK)
- name (text, unique)
- contact_info (jsonb)
- support_url (text)
- created_at (timestamptz)
```

#### **equipment_types**
```sql
- id (uuid, PK)
- name (text) // e.g., "AC Motor", "Centrifugal Pump"
- category (enum: motor, pump, gearbox, other)
- specifications_schema (jsonb) // flexible schema for type-specific fields
- created_at (timestamptz)
```

#### **equipment_models**
```sql
- id (uuid, PK)
- manufacturer_id (uuid, FK)
- equipment_type_id (uuid, FK)
- model_number (text)
- specifications (jsonb) // voltage, hp, rpm, frame size, etc.
- torque_specs (jsonb) // bolt specifications and values
- tolerances (jsonb) // clearances, alignments, etc.
- documentation_links (jsonb) // URLs to manuals, diagrams
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### **equipment_units**
```sql
- id (uuid, PK)
- equipment_model_id (uuid, FK)
- serial_number (text, unique)
- asset_tag (text)
- customer_id (uuid, FK)
- installation_date (date)
- location (text)
- operational_hours (numeric)
- status (enum: active, in_repair, retired)
- metadata (jsonb) // custom fields
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### **customers**
```sql
- id (uuid, PK)
- company_name (text)
- contact_person (text)
- email (text)
- phone (text)
- address (jsonb)
- created_at (timestamptz)
```

#### **procedure_templates**
```sql
- id (uuid, PK)
- equipment_type_id (uuid, FK)
- name (text)
- version (text)
- procedure_type (enum: teardown, inspection, rebuild, test)
- steps (jsonb) // ordered array of step objects
- estimated_duration (interval)
- required_tools (jsonb)
- safety_requirements (jsonb)
- is_active (boolean)
- created_by (uuid, FK to users)
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### **procedure_steps**
```sql
- id (uuid, PK)
- procedure_template_id (uuid, FK)
- step_number (integer)
- title (text)
- description (text)
- instructions (text)
- step_type (enum: action, inspection, measurement, decision)
- acceptance_criteria (jsonb) // pass/fail conditions
- measurements_required (jsonb) // measurement definitions
- photo_required (boolean)
- estimated_time (interval)
- safety_notes (text)
- reference_documents (jsonb)
- next_step_logic (jsonb) // conditional branching
```

#### **work_orders**
```sql
- id (uuid, PK)
- work_order_number (text, unique)
- equipment_unit_id (uuid, FK)
- customer_id (uuid, FK)
- assigned_to (uuid, FK to users)
- work_type (enum: repair, inspection, rebuild, pm)
- priority (enum: low, medium, high, emergency)
- status (enum: pending, in_progress, on_hold, completed, cancelled)
- scheduled_date (date)
- started_at (timestamptz)
- completed_at (timestamptz)
- reported_issue (text)
- customer_po (text)
- estimated_hours (numeric)
- actual_hours (numeric)
- created_by (uuid, FK to users)
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### **work_sessions**
```sql
- id (uuid, PK)
- work_order_id (uuid, FK)
- procedure_template_id (uuid, FK)
- technician_id (uuid, FK to users)
- status (enum: in_progress, completed, paused)
- current_step_id (uuid, FK to procedure_steps)
- progress_percentage (numeric)
- started_at (timestamptz)
- completed_at (timestamptz)
- is_offline (boolean)
- sync_status (enum: synced, pending, conflict)
- last_synced_at (timestamptz)
```

#### **step_completions**
```sql
- id (uuid, PK)
- work_session_id (uuid, FK)
- step_id (uuid, FK to procedure_steps)
- status (enum: pending, in_progress, completed, skipped, failed)
- result (enum: pass, fail, na)
- measurements (jsonb) // actual measurements taken
- observations (text)
- issues_found (text)
- completed_by (uuid, FK to users)
- completed_at (timestamptz)
- time_spent (interval)
```

#### **photos**
```sql
- id (uuid, PK)
- work_session_id (uuid, FK)
- step_completion_id (uuid, FK, nullable)
- storage_path (text) // Supabase Storage path
- thumbnail_path (text)
- photo_type (enum: before, during, after, issue, reference)
- caption (text)
- annotations (jsonb) // drawing overlays, markers
- ai_analysis (jsonb) // AI-detected issues
- metadata (jsonb) // EXIF data, GPS
- taken_by (uuid, FK to users)
- taken_at (timestamptz)
```

#### **inspection_findings**
```sql
- id (uuid, PK)
- work_session_id (uuid, FK)
- step_completion_id (uuid, FK)
- finding_type (enum: wear, damage, out_of_spec, contamination, other)
- severity (enum: minor, moderate, major, critical)
- component (text)
- description (text)
- recommended_action (text)
- photo_ids (uuid[])
- created_at (timestamptz)
```

#### **reports**
```sql
- id (uuid, PK)
- work_order_id (uuid, FK)
- report_type (enum: inspection, repair, rebuild, test)
- report_number (text, unique)
- generated_by (uuid, FK to users)
- generated_at (timestamptz)
- status (enum: draft, pending_approval, approved, sent)
- content (jsonb) // structured report data
- pdf_path (text) // generated PDF in storage
- approved_by (uuid, FK to users)
- approved_at (timestamptz)
- signature_data (jsonb) // digital signatures
- sent_to (text) // customer email
- sent_at (timestamptz)
```

#### **ai_interactions**
```sql
- id (uuid, PK)
- work_session_id (uuid, FK)
- user_id (uuid, FK to users)
- query (text)
- context (jsonb) // equipment info, current step, findings
- response (text)
- helpful (boolean, nullable)
- feedback (text)
- created_at (timestamptz)
```

#### **maintenance_schedules**
```sql
- id (uuid, PK)
- equipment_unit_id (uuid, FK)
- schedule_type (enum: time_based, usage_based, condition_based)
- interval_value (numeric)
- interval_unit (enum: hours, days, months, years)
- procedure_template_id (uuid, FK)
- last_performed (timestamptz)
- next_due (timestamptz)
- is_active (boolean)
```

#### **parts_catalog**
```sql
- id (uuid, PK)
- equipment_model_id (uuid, FK)
- part_number (text)
- description (text)
- part_type (enum: bearing, seal, gasket, winding, impeller, other)
- specifications (jsonb)
- typical_wear_life (interval)
- supplier_info (jsonb)
- created_at (timestamptz)
```

#### **parts_used**
```sql
- id (uuid, PK)
- work_session_id (uuid, FK)
- part_id (uuid, FK to parts_catalog)
- quantity (numeric)
- serial_numbers (text[])
- installation_notes (text)
- installed_by (uuid, FK to users)
- installed_at (timestamptz)
```

### 2.2 Database Indexes

```sql
-- Performance indexes
CREATE INDEX idx_equipment_units_serial ON equipment_units(serial_number);
CREATE INDEX idx_work_orders_status ON work_orders(status, scheduled_date);
CREATE INDEX idx_work_orders_assigned ON work_orders(assigned_to, status);
CREATE INDEX idx_work_sessions_technician ON work_sessions(technician_id, status);
CREATE INDEX idx_photos_work_session ON photos(work_session_id);
CREATE INDEX idx_step_completions_session ON step_completions(work_session_id);

-- Full-text search indexes
CREATE INDEX idx_equipment_models_search ON equipment_models
  USING gin(to_tsvector('english', model_number || ' ' || coalesce(specifications::text, '')));
CREATE INDEX idx_procedure_templates_search ON procedure_templates
  USING gin(to_tsvector('english', name || ' ' || coalesce(steps::text, '')));
```

---

## 3. AI Implementation Strategy

### 3.1 AI Capabilities

**1. Equipment-Specific Troubleshooting**
- Context-aware assistance based on equipment model and current repair stage
- Diagnostic question trees based on observed symptoms
- Recommendations for additional tests or measurements

**2. Image Analysis**
- Automated damage detection (corrosion, wear, cracks)
- Measurement verification from photos
- Bearing condition analysis
- Winding insulation assessment

**3. Predictive Maintenance**
- Failure pattern analysis from historical data
- Remaining useful life estimation
- Anomaly detection in measurements

**4. Report Generation**
- Automated summary of findings
- Professional formatting with technical language
- Recommendation prioritization

### 3.2 AI Architecture

**Edge Function: ai-troubleshoot**
```typescript
Input: {
  equipment_model: ModelInfo,
  current_step: StepInfo,
  findings: Finding[],
  measurements: Measurement[],
  query: string
}

Output: {
  response: string,
  suggested_actions: Action[],
  confidence: number,
  references: Document[]
}
```

**Edge Function: ai-image-analysis**
```typescript
Input: {
  image_url: string,
  analysis_type: 'damage' | 'measurement' | 'condition',
  component: string
}

Output: {
  detected_issues: Issue[],
  severity_assessment: string,
  recommendations: string[],
  annotated_image_url: string
}
```

**Edge Function: ai-report-generator**
```typescript
Input: {
  work_session_id: uuid,
  report_type: string
}

Output: {
  report_content: ReportData,
  executive_summary: string,
  recommendations: Recommendation[]
}
```

### 3.3 AI Training Data

- Historical repair records (anonymized)
- Equipment manufacturer documentation
- Industry standards (EASA, IEEE, API)
- Failure mode databases
- Technical bulletins and service advisories

---

## 4. User Interface Design

### 4.1 Application Structure

```
/login
/dashboard
  ├── /active-work-orders
  ├── /my-assignments
  └── /performance-metrics

/work-orders
  ├── /list
  ├── /create
  └── /:id
      ├── /details
      ├── /start-procedure
      └── /history

/work-session/:id
  ├── /procedure-steps
  ├── /current-step
  ├── /findings
  ├── /photos
  └── /ai-assistant

/equipment
  ├── /search
  ├── /:id/details
  ├── /:id/history
  └── /:id/documentation

/reports
  ├── /list
  ├── /:id/view
  └── /:id/edit

/procedures
  ├── /library
  └── /:id/view

/settings
  ├── /profile
  ├── /offline-data
  └── /sync-status
```

### 4.2 Key Screen Mockups

#### Dashboard View
```
┌─────────────────────────────────────────────────────────┐
│ ☰  Motor Repair Pro              [Sync] [Profile]      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  My Active Work Orders (3)            [View All →]      │
│  ┌──────────────────────────────────────────────────┐  │
│  │ WO-2024-1234  | AC Motor Rebuild    | In Progress│  │
│  │ Customer: Acme Corp                 | Step 12/24 │  │
│  │ [Continue →]                                      │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ WO-2024-1235  | Pump Inspection     | Not Started│  │
│  │ Customer: Beta Industries           | Due: Today │  │
│  │ [Start →]                                         │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Quick Actions                                           │
│  [📸 New Work Order] [🔍 Search Equipment] [📊 Reports] │
│                                                          │
│  Recent Activity                                         │
│  • Completed WO-2024-1230 - 2 hours ago                 │
│  • Added 8 photos to WO-2024-1234 - 4 hours ago         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### Active Procedure View
```
┌─────────────────────────────────────────────────────────┐
│ ← WO-2024-1234  Motor Rebuild      [AI] [?] [Menu]     │
├─────────────────────────────────────────────────────────┤
│ Progress: ████████████░░░░░░░░░░ 12/24 (50%)           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Step 12: Measure Bearing Clearances                    │
│  ───────────────────────────────────────────            │
│                                                          │
│  📋 Instructions:                                        │
│  Use dial indicator to measure radial clearance at      │
│  drive end bearing. Record measurements at 4 positions  │
│  (TDC, 3 o'clock, BDC, 9 o'clock).                     │
│                                                          │
│  ⚠️  Acceptable Range: 0.002" - 0.006"                  │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ Measurements                                    │    │
│  │ TDC:      [0.004] in     ✓ PASS                │    │
│  │ 3 o'clock:[0.003] in     ✓ PASS                │    │
│  │ BDC:      [0.005] in     ✓ PASS                │    │
│  │ 9 o'clock:[_____] in                            │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  [📷 Add Photo]  [📝 Add Note]  [🤖 Ask AI]            │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ Photos (2)                                      │    │
│  │ [img] [img]                              [+]    │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│              [← Previous]  [Complete Step →]            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### AI Assistant Panel
```
┌─────────────────────────────────────────────────────────┐
│ AI Assistant                                    [×]     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  💬 Chat History                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │ You: The bearing clearance seems high          │    │
│  │                                                 │    │
│  │ AI: Based on the 0.006" measurement, you're    │    │
│  │ at the upper limit of acceptable clearance.    │    │
│  │ This could indicate:                            │    │
│  │ • Normal wear for equipment with 15,000 hrs    │    │
│  │ • Bearing may need replacement soon             │    │
│  │                                                 │    │
│  │ Recommendations:                                │    │
│  │ 1. Check for visible wear on bearing surfaces  │    │
│  │ 2. Inspect for contamination                    │    │
│  │ 3. Consider replacement if rebuilding          │    │
│  │                                                 │    │
│  │ [📋 Add to Report] [✓ Helpful] [✗ Not Helpful]│    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  Quick Questions:                                        │
│  • What's the typical bearing life?                     │
│  • How to check for bearing damage?                     │
│  • Should I replace this bearing?                       │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ Type your question...                 [Send →] │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 4.3 Design System

**Color Palette:**
- Primary: Blue (#2563EB) - Actions, links
- Success: Green (#10B981) - Pass, completed
- Warning: Amber (#F59E0B) - Caution, attention needed
- Error: Red (#EF4444) - Fail, critical
- Neutral: Slate (#64748B) - Text, borders

**Typography:**
- Headings: Inter (600 weight)
- Body: Inter (400 weight)
- Monospace: JetBrains Mono (measurements, specs)

**Component Library:**
- Buttons: Primary, Secondary, Ghost, Danger
- Forms: Text input, Numeric input, Select, Checkbox, Radio
- Cards: Work order card, Equipment card, Finding card
- Modals: Confirmation, Form, Photo viewer
- Navigation: Bottom nav (mobile), Sidebar (desktop)
- Status indicators: Progress bars, Badges, Pills

---

## 5. Security & Authentication

### 5.1 Authentication Flow

**Login Methods:**
- Email/password (primary)
- SSO integration (optional for enterprise)

**Session Management:**
- JWT tokens with refresh token rotation
- 8-hour session timeout
- Device tracking for security

### 5.2 Role-Based Access Control (RBAC)

**Roles:**
1. **Admin**
   - Full system access
   - User management
   - Procedure template creation
   - System configuration

2. **Supervisor**
   - View all work orders
   - Assign work orders
   - Review and approve reports
   - Access analytics

3. **Technician**
   - View assigned work orders
   - Execute procedures
   - Create reports
   - Access equipment documentation

4. **Viewer**
   - Read-only access to reports
   - View equipment history
   - No editing capabilities

### 5.3 Row Level Security (RLS) Policies

**Key Policies:**

```sql
-- Technicians can only view their assigned work orders
CREATE POLICY "Technicians view own work orders"
ON work_orders FOR SELECT
TO authenticated
USING (
  assigned_to = auth.uid() OR
  created_by = auth.uid() OR
  auth.jwt()->>'role' IN ('admin', 'supervisor')
);

-- Only assigned technician can update work session
CREATE POLICY "Technicians update own sessions"
ON work_sessions FOR UPDATE
TO authenticated
USING (technician_id = auth.uid())
WITH CHECK (technician_id = auth.uid());

-- All authenticated users can view equipment data
CREATE POLICY "All users view equipment"
ON equipment_units FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify procedure templates
CREATE POLICY "Admins manage procedures"
ON procedure_templates FOR ALL
TO authenticated
USING (auth.jwt()->>'role' = 'admin')
WITH CHECK (auth.jwt()->>'role' = 'admin');
```

---

## 6. Offline Functionality

### 6.1 Offline-First Architecture

**Data Synchronization Strategy:**

1. **On App Load:**
   - Download assigned work orders
   - Cache procedure templates
   - Sync equipment specifications
   - Download reference documentation

2. **During Work:**
   - Store all changes in IndexedDB
   - Queue photos for upload
   - Continue work without connectivity

3. **On Reconnection:**
   - Upload photos to Supabase Storage
   - Sync step completions
   - Update work session progress
   - Resolve conflicts (last-write-wins with manual review option)

### 6.2 Offline Data Storage

**IndexedDB Schema:**
```
Stores:
- work_orders (assigned orders with full details)
- work_sessions (active sessions)
- procedure_templates (full procedure data)
- equipment_models (referenced models)
- photos (blob data pending upload)
- sync_queue (pending changes)
```

**Service Worker Caching:**
- App shell (HTML, CSS, JS)
- Static assets (icons, logos)
- Equipment documentation PDFs
- Technical diagrams

### 6.3 Conflict Resolution

**Conflict Types:**
1. **Step Completion Conflicts:** Last update wins, log both versions
2. **Photo Conflicts:** Keep all photos, merge
3. **Measurement Conflicts:** Flag for supervisor review
4. **Work Order Status:** Require manual resolution

---

## 7. Development Timeline & Milestones

### Phase 1: Foundation (Weeks 1-4)

**Week 1-2: Project Setup & Core Infrastructure**
- Initialize project with Vite + React + TypeScript
- Configure Supabase project
- Implement database schema and migrations
- Set up authentication system
- Create basic UI component library
- Deliverable: Working dev environment with auth

**Week 3-4: Equipment & Procedure Management**
- Build equipment database CRUD
- Create procedure template builder
- Implement equipment search functionality
- Develop procedure step navigation
- Deliverable: Equipment and procedure management

### Phase 2: Core Workflow (Weeks 5-8)

**Week 5-6: Work Order System**
- Work order creation and assignment
- Work session initiation
- Step-by-step procedure execution
- Progress tracking
- Deliverable: Complete work order workflow

**Week 6-7: Data Capture & Measurements**
- Photo capture and annotation
- Measurement input with validation
- Findings documentation
- Real-time progress updates
- Deliverable: Full data capture capabilities

**Week 8: Offline Functionality**
- Implement IndexedDB storage
- Service Worker configuration
- Sync queue management
- Conflict resolution
- Deliverable: Offline-first application

### Phase 3: AI Integration (Weeks 9-11)

**Week 9: AI Infrastructure**
- Deploy troubleshooting edge function
- Integrate OpenAI API
- Context preparation system
- Response formatting
- Deliverable: Basic AI assistant

**Week 10: Advanced AI Features**
- Image analysis integration
- Predictive recommendations
- Historical data analysis
- AI-powered report generation
- Deliverable: Full AI capabilities

**Week 11: AI Refinement**
- Fine-tune prompts and responses
- Implement feedback loop
- Optimize context delivery
- Performance testing
- Deliverable: Production-ready AI system

### Phase 4: Reporting & Polish (Weeks 12-14)

**Week 12: Report Generation**
- Report template engine
- PDF generation
- Digital signature capture
- Report approval workflow
- Deliverable: Complete reporting system

**Week 13: UI/UX Refinement**
- Responsive design improvements
- Performance optimization
- Accessibility compliance
- User testing and feedback
- Deliverable: Polished user interface

**Week 14: Testing & Deployment**
- Comprehensive testing
- Security audit
- Performance optimization
- Production deployment
- Documentation
- Deliverable: Production launch

### Phase 5: Post-Launch (Weeks 15-16)

**Week 15-16: Training & Iteration**
- User training materials
- Bug fixes and refinements
- Performance monitoring
- Feature iteration based on feedback
- Deliverable: Stable production system

---

## 8. API Specifications

### 8.1 Supabase Edge Functions

**Function: ai-troubleshoot**
```
POST /functions/v1/ai-troubleshoot

Request:
{
  "work_session_id": "uuid",
  "query": "string",
  "context": {
    "equipment_model": "string",
    "current_step": "string",
    "findings": [...],
    "measurements": [...]
  }
}

Response:
{
  "response": "string",
  "suggested_actions": [
    {
      "action": "string",
      "priority": "high|medium|low",
      "reason": "string"
    }
  ],
  "confidence": 0.85,
  "references": [...]
}
```

**Function: generate-report**
```
POST /functions/v1/generate-report

Request:
{
  "work_session_id": "uuid",
  "report_type": "inspection|repair|rebuild"
}

Response:
{
  "report_id": "uuid",
  "pdf_url": "string",
  "summary": "string",
  "findings_count": 5,
  "recommendations": [...]
}
```

**Function: analyze-image**
```
POST /functions/v1/analyze-image

Request:
{
  "image_url": "string",
  "component_type": "bearing|winding|seal",
  "analysis_type": "damage|wear|measurement"
}

Response:
{
  "detected_issues": [
    {
      "type": "string",
      "severity": "minor|moderate|major|critical",
      "location": "string",
      "confidence": 0.92
    }
  ],
  "recommendations": [...],
  "annotated_image_url": "string"
}
```

### 8.2 Key Database Queries

**Get Work Order with Full Context**
```sql
SELECT
  wo.*,
  eu.serial_number,
  em.model_number,
  em.specifications,
  c.company_name,
  ws.progress_percentage,
  u.full_name as technician_name
FROM work_orders wo
JOIN equipment_units eu ON wo.equipment_unit_id = eu.id
JOIN equipment_models em ON eu.equipment_model_id = em.id
JOIN customers c ON wo.customer_id = c.id
LEFT JOIN work_sessions ws ON wo.id = ws.work_order_id
LEFT JOIN users u ON wo.assigned_to = u.id
WHERE wo.id = $1;
```

**Get Procedure with Steps**
```sql
SELECT
  pt.*,
  jsonb_agg(
    jsonb_build_object(
      'id', ps.id,
      'step_number', ps.step_number,
      'title', ps.title,
      'instructions', ps.instructions,
      'acceptance_criteria', ps.acceptance_criteria
    ) ORDER BY ps.step_number
  ) as steps
FROM procedure_templates pt
JOIN procedure_steps ps ON pt.id = ps.procedure_template_id
WHERE pt.id = $1
GROUP BY pt.id;
```

---

## 9. Performance Requirements

### 9.1 Performance Targets

- **Page Load:** < 2 seconds on 3G connection
- **Step Transition:** < 500ms
- **Photo Upload:** Background, max 30s per photo
- **Offline Sync:** Complete sync < 5 minutes for typical session
- **AI Response:** < 5 seconds for troubleshooting queries
- **Report Generation:** < 10 seconds for standard report

### 9.2 Optimization Strategies

- Code splitting by route
- Lazy loading of heavy components
- Image compression and WebP format
- Virtual scrolling for long lists
- Debounced search inputs
- Optimistic UI updates
- Request batching and caching

---

## 10. Testing Strategy

### 10.1 Testing Levels

**Unit Tests:**
- Utility functions
- Data validation
- Calculation functions
- 80% code coverage target

**Integration Tests:**
- Database operations
- API endpoints
- Authentication flows
- Sync operations

**E2E Tests:**
- Complete work order flow
- Offline/online transitions
- Report generation
- Multi-user scenarios

### 10.2 Test Scenarios

1. **Happy Path:** Complete motor rebuild from start to finish
2. **Offline Work:** Perform inspection while offline, sync on reconnect
3. **Concurrent Access:** Multiple technicians accessing same equipment
4. **Failure Recovery:** Handle network failures, photo upload failures
5. **Data Validation:** Prevent invalid measurements and incomplete steps
6. **Role Permissions:** Verify RBAC enforcement
7. **AI Integration:** Test AI responses for accuracy and relevance

---

## 11. Deployment & DevOps

### 11.1 Environment Setup

**Development:**
- Local Supabase instance
- Mock AI responses for faster testing
- Hot reload enabled

**Staging:**
- Supabase staging project
- Real AI integration
- Test data populated
- Client review environment

**Production:**
- Supabase production project
- CDN for static assets
- Automated backups
- Monitoring and logging

### 11.2 CI/CD Pipeline

```
Code Push → GitHub
  ↓
Run Tests (Unit + Integration)
  ↓
Build Application
  ↓
Deploy to Staging
  ↓
Automated E2E Tests
  ↓
Manual Approval
  ↓
Deploy to Production
  ↓
Smoke Tests
  ↓
Monitoring Alert
```

### 11.3 Monitoring & Analytics

**Application Monitoring:**
- Error tracking (Sentry or similar)
- Performance monitoring
- User session recording
- API response times

**Business Metrics:**
- Work orders completed
- Average completion time
- AI assistant usage
- User satisfaction scores
- Equipment failure patterns

---

## 12. Compliance & Standards

### 12.1 Industry Standards

**Equipment Standards:**
- EASA (Electrical Apparatus Service Association)
- IEEE (Institute of Electrical and Electronics Engineers)
- API (American Petroleum Institute)
- NFPA 70E (Electrical Safety)

**Data Security:**
- SOC 2 compliance (via Supabase)
- GDPR readiness
- Data encryption at rest and in transit

### 12.2 Quality Assurance

**Documentation Requirements:**
- All procedures must reference industry standards
- Torque specifications must include sources
- Safety requirements must be clearly stated
- Photo documentation required for critical steps

---

## 13. Future Enhancements (Post-MVP)

### 13.1 Phase 2 Features

1. **Advanced Analytics Dashboard**
   - Failure trend analysis
   - Technician performance metrics
   - Cost per repair analysis
   - Equipment reliability scoring

2. **Mobile AR Features**
   - Overlay technical drawings on live camera feed
   - Visual measurement guides
   - Step-by-step AR instructions

3. **IoT Integration**
   - Real-time equipment monitoring
   - Vibration analysis integration
   - Temperature monitoring
   - Predictive failure alerts

4. **Customer Portal**
   - Real-time work order status
   - Report access
   - Equipment history view
   - Maintenance schedule visibility

5. **Inventory Management**
   - Parts tracking
   - Automatic parts ordering
   - Vendor management
   - Cost tracking

### 13.2 Scalability Considerations

- Multi-language support
- Multi-tenant architecture for service companies
- White-label capabilities
- Third-party integrations (ERP, CMMS)
- Advanced AI models with continuous learning

---

## 14. Risk Mitigation

### 14.1 Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI API downtime | High | Implement fallback to cached responses, manual mode |
| Offline sync conflicts | Medium | Robust conflict resolution, manual review workflow |
| Photo storage limits | Medium | Image compression, cleanup policies |
| Poor network connectivity | High | Offline-first design, background sync |
| Database performance | Medium | Proper indexing, query optimization, caching |

### 14.2 Business Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| User adoption resistance | High | Comprehensive training, gradual rollout |
| Data migration complexity | High | Phased migration, validation tools |
| Regulatory changes | Medium | Modular design, configurable compliance rules |
| Vendor lock-in (Supabase) | Low | Standard PostgreSQL, portable architecture |

---

## 15. Success Metrics

### 15.1 KPIs

**Efficiency Metrics:**
- 30% reduction in average repair time
- 50% reduction in paperwork time
- 90% first-time report approval rate

**Quality Metrics:**
- 95% procedure step completion rate
- 80% AI assistant satisfaction rating
- <1% repeat failures within 90 days

**User Adoption:**
- 90% active user rate within 60 days
- <5 minutes average training time per feature
- 4+ star average user rating

---

## Appendix A: Technology Stack Summary

**Frontend:**
- React 18.3+
- TypeScript 5.5+
- Vite 5.4+
- Tailwind CSS 3.4+
- Lucide React (icons)

**Backend:**
- Supabase (PostgreSQL 15+)
- Supabase Storage
- Supabase Edge Functions (Deno)
- Row Level Security

**AI/ML:**
- OpenAI API (GPT-4)
- Custom vision models
- Supabase AI integration

**Infrastructure:**
- Progressive Web App (PWA)
- IndexedDB
- Service Workers
- WebSocket (Realtime)

---

## Appendix B: Database Migration Files Structure

```
supabase/
  migrations/
    20240001_create_base_tables.sql
    20240002_create_equipment_tables.sql
    20240003_create_procedure_tables.sql
    20240004_create_work_order_tables.sql
    20240005_create_work_session_tables.sql
    20240006_create_photo_tables.sql
    20240007_create_report_tables.sql
    20240008_create_ai_tables.sql
    20240009_create_indexes.sql
    20240010_create_rls_policies.sql
```

---

## Appendix C: Glossary

- **Equipment Unit:** A specific physical instance of equipment with a serial number
- **Equipment Model:** The manufacturer's model specification
- **Procedure Template:** A reusable workflow for a specific type of work
- **Work Session:** An active instance of a technician performing a procedure
- **Step Completion:** The record of completing a single step in a procedure
- **Finding:** An observation or issue discovered during inspection/repair
- **RLS:** Row Level Security - PostgreSQL feature for data access control
- **PWA:** Progressive Web App - web app with offline capabilities
- **IndexedDB:** Browser-based database for offline storage

---

**Document Version:** 1.0
**Last Updated:** 2025-10-30
**Author:** Technical Specification Team
**Status:** Ready for Development

