import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, Edit3, Camera, AlertCircle, ArrowRight, X } from 'lucide-react';
import PhaseCompletion from './PhaseCompletion';

interface PhaseReportReviewProps {
  sessionId: string;
  onExit: () => void;
}

export default function PhaseReportReview({ sessionId, onExit }: PhaseReportReviewProps) {
  const [session, setSession] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [completions, setCompletions] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [workOrder, setWorkOrder] = useState<any>(null);
  const [summary, setSummary] = useState('');
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [showPhaseCompletion, setShowPhaseCompletion] = useState(false);

  useEffect(() => {
    loadReportData();
  }, [sessionId]);

  const loadReportData = async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('work_sessions')
        .select(
          `
          *,
          procedure_template:procedure_templates(*)
        `
        )
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

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
          customer:customers (company_name, contact_person)
        `
        )
        .eq('id', sessionData.work_order_id)
        .maybeSingle();

      if (!woError && woData) {
        setWorkOrder(woData);
      }

      const { data: stepsData, error: stepsError } = await supabase
        .from('procedure_steps')
        .select('*')
        .eq('procedure_template_id', sessionData.procedure_template_id)
        .order('step_number');

      if (stepsError) throw stepsError;
      setSteps(stepsData || []);

      const { data: completionsData, error: completionsError } = await supabase
        .from('step_completions')
        .select('*')
        .eq('work_session_id', sessionId)
        .order('completed_at');

      if (completionsError) throw completionsError;
      setCompletions(completionsData || []);

      const { data: photosData, error: photosError } = await supabase
        .from('work_session_photos')
        .select('*')
        .eq('work_session_id', sessionId)
        .order('captured_at');

      if (!photosError && photosData) {
        setPhotos(photosData);
      }

      const completedSteps = completionsData?.filter((c) => c.status === 'completed') || [];
      const summaryText = `Completed ${completedSteps.length} of ${stepsData?.length || 0} steps in ${sessionData.procedure_template.name}.`;
      setSummary(summaryText);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!session) return;

    setLoading(true);
    setError('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const stepCompletionsData = completions.map((comp) => {
        const step = steps.find((s) => s.id === comp.step_id);
        return {
          step_number: step?.step_number,
          step_title: step?.title,
          measurements: comp.measurements,
          observations: comp.observations,
          result: comp.result,
          completed_at: comp.completed_at,
        };
      });

      const photoData = photos.map((photo) => ({
        url: photo.photo_url,
        caption: photo.caption,
        captured_at: photo.captured_at,
      }));

      const { data: report, error: reportError } = await supabase
        .from('phase_reports')
        .insert([
          {
            work_order_id: session.work_order_id,
            work_session_id: sessionId,
            phase: session.procedure_template.phase,
            equipment_details: session.equipment_details || {},
            step_completions: stepCompletionsData,
            photos: photoData,
            summary,
            technician_notes: technicianNotes,
            status: 'submitted',
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (reportError) throw reportError;

      const { error: sessionError } = await supabase
        .from('work_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (sessionError) throw sessionError;

      setShowPhaseCompletion(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-800 text-center">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">Phase Report Review</h1>
            <button onClick={onExit} className="p-2 hover:bg-slate-100 rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            {session?.procedure_template?.name} - {workOrder?.work_order_number}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {workOrder && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Work Order Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">WO Number:</span>
                <p className="font-medium text-slate-900">{workOrder.work_order_number}</p>
              </div>
              <div>
                <span className="text-slate-500">Customer:</span>
                <p className="font-medium text-slate-900">{workOrder.customer?.company_name}</p>
              </div>
              <div>
                <span className="text-slate-500">Equipment:</span>
                <p className="font-medium text-slate-900">
                  {workOrder.equipment_unit?.equipment_model?.manufacturer?.name}{' '}
                  {workOrder.equipment_unit?.equipment_model?.model_number}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Serial Number:</span>
                <p className="font-medium text-slate-900">{workOrder.equipment_unit?.serial_number}</p>
              </div>
            </div>
          </div>
        )}

        {session?.equipment_details && Object.keys(session.equipment_details).length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Equipment Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {Object.entries(session.equipment_details).map(([key, value]: [string, any]) => {
                if (value && value !== 'N/A') {
                  return (
                    <div key={key}>
                      <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                      <p className="font-medium text-slate-900">{value}</p>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Steps Completed</h2>
          <div className="space-y-4">
            {completions.map((completion) => {
              const step = steps.find((s) => s.id === completion.step_id);
              if (!step) return null;

              return (
                <div key={completion.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900">
                        {step.step_number}. {step.title}
                      </h3>
                      {completion.observations && completion.observations !== 'Not Applicable' && (
                        <p className="text-sm text-slate-600 mt-1">
                          <span className="font-medium">Observations:</span> {completion.observations}
                        </p>
                      )}
                      {completion.measurements && Object.keys(completion.measurements).length > 0 && (
                        <div className="mt-2">
                          <span className="text-sm font-medium text-slate-700">Measurements:</span>
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            {Object.entries(completion.measurements).map(([key, value]: [string, any]) => (
                              <div key={key} className="text-sm text-slate-600">
                                {key}: <span className="font-medium text-slate-900">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {photos.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Photos ({photos.length})
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  <img
                    src={photo.photo_url}
                    alt={photo.caption || 'Work photo'}
                    className="w-full h-48 object-cover"
                  />
                  {photo.caption && (
                    <div className="p-2 bg-slate-50">
                      <p className="text-sm text-slate-600">{photo.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Summary</h2>
          {editMode ? (
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none mb-4"
            />
          ) : (
            <p className="text-slate-700 mb-4">{summary}</p>
          )}

          <h3 className="font-medium text-slate-900 mb-2">Additional Notes</h3>
          {editMode ? (
            <textarea
              value={technicianNotes}
              onChange={(e) => setTechnicianNotes(e.target.value)}
              placeholder="Add any additional notes or observations..."
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            />
          ) : (
            <p className="text-slate-700">
              {technicianNotes || 'No additional notes'}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pb-6">
          {editMode ? (
            <>
              <button
                onClick={() => setEditMode(false)}
                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Save Changes
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-5 h-5" />
                {loading ? 'Submitting...' : 'Approve & Complete Phase'}
              </button>
            </>
          )}
        </div>
      </div>

      {showPhaseCompletion && workOrder && (
        <PhaseCompletion
          workOrderId={workOrder.id}
          currentPhase={session?.procedure_template?.phase || workOrder.current_phase}
          onClose={onExit}
        />
      )}
    </div>
  );
}
