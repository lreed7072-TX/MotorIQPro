import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, CheckSquare, Square, FileText, Download, CheckCircle, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface ReportGeneratorProps {
  workOrderId: string;
  onClose: () => void;
}

interface PhaseSession {
  id: string;
  phase: string;
  procedure_name: string;
  started_at: string;
  completed_at: string;
  progress_percentage: number;
  phase_report?: {
    summary?: string;
    technician_notes?: string;
    step_completions?: Array<{
      step_number: number;
      step_title: string;
      measurements: Record<string, string>;
      observations: string;
      result: string;
      completed_at: string;
    }>;
    photos?: Array<{
      url: string;
      caption: string;
      captured_at: string;
    }>;
  };
  procedure_template_id: string;
  equipment_details?: any;
}

const PHASE_LABELS: Record<string, string> = {
  initial_testing: 'Initial Testing',
  teardown: 'Teardown and Inspect',
  repair_scope: 'Determine Repair Scope and Parts Required',
  rebuild: 'Rebuild',
  final_testing: 'Final Testing and Quality Verification',
};

export default function ReportGenerator({ workOrderId, onClose }: ReportGeneratorProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workOrder, setWorkOrder] = useState<any>(null);
  const [phaseSessions, setPhaseSessions] = useState<PhaseSession[]>([]);
  const [selectedPhases, setSelectedPhases] = useState<Set<string>>(new Set());
  const [generatedReportHTML, setGeneratedReportHTML] = useState<string>('');
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadData();
  }, [workOrderId]);

  const loadData = async () => {
    try {
      console.log('ReportGenerator: Loading data for work order:', workOrderId);

      const { data: woData, error: woError } = await supabase
        .from('work_orders')
        .select(
          `
          *,
          equipment_unit:equipment_units (
            serial_number,
            equipment_model:equipment_models (
              model_number,
              manufacturer:manufacturers (name)
            )
          ),
          customer:customers (company_name, contact_person, phone, email)
        `
        )
        .eq('id', workOrderId)
        .maybeSingle();

      if (woError) {
        console.error('Error loading work order:', woError);
        throw woError;
      }

      console.log('Work order loaded:', woData);
      setWorkOrder(woData);

      console.log('Querying work_sessions for work_order_id:', workOrderId);

      const { data: sessions, error: sessionsError } = await supabase
        .from('work_sessions')
        .select('*')
        .eq('work_order_id', workOrderId)
        .eq('status', 'completed')
        .order('started_at');

      if (sessionsError) {
        console.error('Error loading sessions:', sessionsError);
        throw sessionsError;
      }

      console.log('Found completed sessions:', sessions?.length, 'Sessions:', sessions);

      const formattedSessions: PhaseSession[] = [];
      const phaseMap = new Map<string, PhaseSession>();

      for (const session of sessions || []) {
        console.log('Processing session:', session.id, 'procedure_template_id:', session.procedure_template_id);

        const { data: procedureData, error: procError } = await supabase
          .from('procedure_templates')
          .select('name, phase')
          .eq('id', session.procedure_template_id)
          .maybeSingle();

        if (procError) {
          console.error('Error fetching procedure:', procError);
        }

        console.log('Procedure data:', procedureData);

        const { data: reportDataArray } = await supabase
          .from('phase_reports')
          .select('summary, technician_notes, step_completions, photos')
          .eq('work_session_id', session.id)
          .order('created_at', { ascending: false });

        const reportData = reportDataArray && reportDataArray.length > 0 ? reportDataArray[0] : null;

        const phaseSession: PhaseSession = {
          id: session.id,
          phase: procedureData?.phase || '',
          procedure_name: procedureData?.name || '',
          started_at: session.started_at,
          completed_at: session.completed_at,
          progress_percentage: session.progress_percentage,
          phase_report: reportData || undefined,
          procedure_template_id: session.procedure_template_id,
          equipment_details: session.equipment_details,
        };

        const phase = procedureData?.phase || '';
        const existing = phaseMap.get(phase);

        if (!existing || new Date(session.completed_at) > new Date(existing.completed_at)) {
          phaseMap.set(phase, phaseSession);
        }
      }

      const uniqueSessions = Array.from(phaseMap.values()).sort((a, b) =>
        new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
      );

      console.log('Final phase sessions:', uniqueSessions.length);
      setPhaseSessions(uniqueSessions);
    } catch (err: any) {
      console.error('Error in loadData:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePhaseSelection = (sessionId: string) => {
    const newSelected = new Set(selectedPhases);
    if (newSelected.has(sessionId)) {
      newSelected.delete(sessionId);
    } else {
      newSelected.add(sessionId);
    }
    setSelectedPhases(newSelected);
  };

  const handleBuildReport = async () => {
    if (selectedPhases.size === 0) {
      setError('Please select at least one phase to include in the report');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const selectedSessions = phaseSessions.filter((s) => selectedPhases.has(s.id));

      let htmlReport = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #f8fafc;
    }
    .header {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 30px;
      border-left: 4px solid #3b82f6;
    }
    .header h1 {
      margin: 0 0 20px 0;
      color: #0f172a;
      font-size: 28px;
    }
    .header-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      font-size: 14px;
    }
    .header-grid .label {
      color: #64748b;
      font-weight: 500;
    }
    .header-grid .value {
      color: #0f172a;
    }
    .phase-section {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .phase-header {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin: -30px -30px 20px -30px;
    }
    .phase-header h2 {
      margin: 0 0 8px 0;
      font-size: 22px;
    }
    .phase-header .subtitle {
      opacity: 0.9;
      font-size: 14px;
    }
    .phase-meta {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      padding: 20px;
      background: #f8fafc;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
    }
    .phase-meta .label {
      color: #64748b;
      font-weight: 500;
      margin-bottom: 4px;
    }
    .phase-meta .value {
      color: #0f172a;
    }
    .summary-box, .notes-box {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      margin-bottom: 20px;
    }
    .summary-box h3, .notes-box h3 {
      margin: 0 0 12px 0;
      color: #0f172a;
      font-size: 16px;
    }
    .summary-box p, .notes-box p {
      margin: 0;
      color: #475569;
      white-space: pre-wrap;
    }
    .steps-section h3 {
      color: #0f172a;
      font-size: 16px;
      margin: 0 0 15px 0;
    }
    .step {
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 10px;
      display: flex;
      gap: 12px;
      align-items: start;
    }
    .step.completed {
      background: #f0fdf4;
      border: 1px solid #86efac;
    }
    .step.incomplete {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .step-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .step-icon.completed {
      color: #16a34a;
    }
    .step-icon.incomplete {
      color: #94a3b8;
    }
    .step-content {
      flex: 1;
    }
    .step-title {
      font-weight: 500;
      color: #0f172a;
      margin-bottom: 6px;
    }
    .step-notes {
      color: #64748b;
      font-size: 14px;
      margin-top: 6px;
    }
    .step-time {
      color: #94a3b8;
      font-size: 12px;
      margin-top: 4px;
    }
    .photos-section {
      margin-top: 20px;
    }
    .photos-section h3 {
      color: #0f172a;
      font-size: 16px;
      margin: 0 0 15px 0;
    }
    .photos-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
    }
    .photo-item {
      position: relative;
      aspect-ratio: 1;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .photo-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .photo-caption {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 8px;
      font-size: 12px;
    }
    .equipment-details {
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      margin-top: 20px;
    }
    .equipment-details h3 {
      color: #0f172a;
      font-size: 16px;
      margin: 0 0 12px 0;
    }
    .equipment-details pre {
      margin: 0;
      color: #475569;
      font-size: 13px;
      white-space: pre-wrap;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .phase-section {
        box-shadow: none;
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Work Order Report</h1>
    <div class="header-grid">
      <div><span class="label">Work Order:</span> <span class="value">${workOrder.work_order_number}</span></div>
      <div><span class="label">Status:</span> <span class="value">${workOrder.status}</span></div>
      <div><span class="label">Equipment:</span> <span class="value">${workOrder.equipment_unit?.equipment_model?.manufacturer?.name} ${workOrder.equipment_unit?.equipment_model?.model_number}</span></div>
      <div><span class="label">Serial Number:</span> <span class="value">${workOrder.equipment_unit?.serial_number}</span></div>
      <div><span class="label">Customer:</span> <span class="value">${workOrder.customer?.company_name}</span></div>
      ${workOrder.customer?.contact_person ? `<div><span class="label">Contact:</span> <span class="value">${workOrder.customer.contact_person}</span></div>` : ''}
      ${workOrder.customer?.phone ? `<div><span class="label">Phone:</span> <span class="value">${workOrder.customer.phone}</span></div>` : ''}
      <div><span class="label">Generated:</span> <span class="value">${new Date().toLocaleString()}</span></div>
    </div>
  </div>
`;

      for (const session of selectedSessions) {
        htmlReport += `
  <div class="phase-section">
    <div class="phase-header">
      <h2>${PHASE_LABELS[session.phase] || session.phase.toUpperCase()}</h2>
      <div class="subtitle">${session.procedure_name}</div>
    </div>

    <div class="phase-meta">
      <div>
        <div class="label">Status</div>
        <div class="value">Completed</div>
      </div>
      <div>
        <div class="label">Progress</div>
        <div class="value">${session.progress_percentage}%</div>
      </div>
      <div>
        <div class="label">Started</div>
        <div class="value">${new Date(session.started_at).toLocaleString()}</div>
      </div>
      <div>
        <div class="label">Completed</div>
        <div class="value">${new Date(session.completed_at).toLocaleString()}</div>
      </div>
    </div>
`;

        if (session.phase_report?.summary) {
          htmlReport += `
    <div class="summary-box">
      <h3>Summary</h3>
      <p>${session.phase_report.summary}</p>
    </div>
`;
        }

        if (session.phase_report?.technician_notes) {
          htmlReport += `
    <div class="notes-box">
      <h3>Technician Notes</h3>
      <p>${session.phase_report.technician_notes}</p>
    </div>
`;
        }

        const stepCompletions = session.phase_report?.step_completions || [];

        if (stepCompletions.length > 0) {
          htmlReport += `
    <div class="steps-section">
      <h3>Procedure Steps</h3>
`;

          for (const completion of stepCompletions) {
            const hasMeasurements = completion.measurements && Object.keys(completion.measurements).length > 0;

            htmlReport += `
      <div class="step completed">
        <div class="step-icon completed">
          ✓
        </div>
        <div class="step-content">
          <div class="step-title">${completion.step_number}. ${completion.step_title}</div>
`;

            if (hasMeasurements) {
              htmlReport += `
          <div class="step-notes"><strong>Measurements:</strong><br/>`;
              for (const [key, value] of Object.entries(completion.measurements)) {
                if (value) {
                  htmlReport += `${key}: ${value}<br/>`;
                }
              }
              htmlReport += `</div>`;
            }

            if (completion.observations) {
              htmlReport += `
          <div class="step-notes"><strong>Observations:</strong> ${completion.observations}</div>
`;
            }

            if (completion.completed_at) {
              htmlReport += `
          <div class="step-time">Completed: ${new Date(completion.completed_at).toLocaleString()}</div>
`;
            }

            htmlReport += `
        </div>
      </div>
`;
          }

          htmlReport += `
    </div>
`;
        }

        const photos = session.phase_report?.photos || [];

        if (photos.length > 0) {
          htmlReport += `
    <div class="photos-section">
      <h3>Photos (${photos.length})</h3>
      <div class="photos-grid">
`;

          for (const photo of photos) {
            htmlReport += `
        <div class="photo-item">
          <img src="${photo.url}" alt="${photo.caption || 'Session photo'}" />
          ${photo.caption ? `<div class="photo-caption">${photo.caption}</div>` : ''}
        </div>
`;
          }

          htmlReport += `
      </div>
    </div>
`;
        }

        if (session.equipment_details) {
          htmlReport += `
    <div class="equipment-details">
      <h3>Equipment Details</h3>
      <pre>${JSON.stringify(session.equipment_details, null, 2)}</pre>
    </div>
`;
        }

        htmlReport += `
  </div>
`;
      }

      htmlReport += `
</body>
</html>
`;

      setGeneratedReportHTML(htmlReport);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveReport = async () => {
    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const reportNumber = `RPT-${workOrder.work_order_number}-${Date.now()}`;

      const reportData = {
        work_order_id: workOrderId,
        report_type: 'field_service',
        report_number: reportNumber,
        generated_by: profile?.id,
        status: 'draft',
        content: {
          html: generatedReportHTML,
          selected_phases: Array.from(selectedPhases),
          generated_at: new Date().toISOString(),
        },
      };

      const { data, error: insertError } = await supabase
        .from('reports')
        .insert([reportData])
        .select()
        .single();

      if (insertError) throw insertError;

      setSavedReportId(data.id);
      setSuccessMessage('Report saved successfully to work order!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = () => {
    const blob = new Blob([generatedReportHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workOrder.work_order_number}_report_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6">
          <div className="flex items-center justify-center">
            <div className="text-slate-600">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Generate Report</h2>
            <p className="text-sm text-slate-600 mt-1">
              {workOrder?.work_order_number}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!generatedReportHTML ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-slate-900 mb-3">
                  Select Phases to Include
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Choose which phase reports to include in the compiled report. At least one phase must be selected.
                </p>
                <div className="space-y-2">
                  {phaseSessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => togglePhaseSelection(session.id)}
                      className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition"
                    >
                      {selectedPhases.has(session.id) ? (
                        <CheckSquare className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {PHASE_LABELS[session.phase] || session.phase}
                        </p>
                        <p className="text-xs text-slate-600">{session.procedure_name}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Completed: {new Date(session.completed_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {phaseSessions.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      No completed phases found for this work order.
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {successMessage && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">{successMessage}</p>
                </div>
              )}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-900">Generated Report Preview</h3>
                <button
                  onClick={() => {
                    setGeneratedReportHTML('');
                    setError('');
                    setSuccessMessage('');
                    setSavedReportId(null);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Back to Selection
                </button>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden max-h-[60vh] overflow-y-auto">
                <iframe
                  srcDoc={generatedReportHTML}
                  className="w-full h-[60vh] border-0"
                  title="Report Preview"
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 p-6">
          <div className="flex gap-3">
            {!generatedReportHTML ? (
              <>
                <button
                  onClick={handleBuildReport}
                  disabled={generating || selectedPhases.size === 0}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="w-4 h-4" />
                  {generating ? 'Building...' : 'Build Report'}
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSaveReport}
                  disabled={saving || savedReportId !== null}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : savedReportId ? 'Saved to Work Order' : 'Save to Work Order'}
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <Download className="w-4 h-4" />
                  Export as HTML
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
