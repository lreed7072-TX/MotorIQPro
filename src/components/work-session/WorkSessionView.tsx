import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Circle, AlertCircle, Camera, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type {
  WorkSession,
  ProcedureStep,
  StepCompletion,
  WorkOrderPhase,
} from '../../types/database';
import AIAssistant from '../shared/AIAssistant';
import PhotoCapture from '../shared/PhotoCapture';
import EquipmentIdentificationForm from './EquipmentIdentificationForm';
import PhaseReportReview from './PhaseReportReview';

interface WorkSessionViewProps {
  sessionId: string;
  onExit: () => void;
}

export default function WorkSessionView({ sessionId, onExit }: WorkSessionViewProps) {
  const [session, setSession] = useState<WorkSession | null>(null);
  const [steps, setSteps] = useState<ProcedureStep[]>([]);
  const [completions, setCompletions] = useState<StepCompletion[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showAI, setShowAI] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workOrderData, setWorkOrderData] = useState<any>(null);
  const [showReportReview, setShowReportReview] = useState(false);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
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
          customer:customers (company_name)
        `
        )
        .eq('id', sessionData.work_order_id)
        .maybeSingle();

      if (!woError && woData) {
        setWorkOrderData(woData);
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
        .eq('work_session_id', sessionId);

      if (completionsError) throw completionsError;
      setCompletions(completionsData || []);

      const completedCount = completionsData?.filter((c) => c.status === 'completed').length || 0;
      setCurrentStepIndex(completedCount);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEquipmentComplete = async (equipmentDetails: any) => {
    if (!session || currentStepIndex >= steps.length) return;

    setLoading(true);
    setError('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const currentStep = steps[currentStepIndex];

      const { error: updateSessionError } = await supabase
        .from('work_sessions')
        .update({ equipment_details: equipmentDetails })
        .eq('id', sessionId);

      if (updateSessionError) throw updateSessionError;

      const { error: insertError } = await supabase.from('step_completions').insert([
        {
          work_session_id: sessionId,
          step_id: currentStep.id,
          status: 'completed',
          result: 'pass',
          measurements: equipmentDetails,
          observations: 'Equipment identification completed',
          completed_by: user.id,
          completed_at: new Date().toISOString(),
        },
      ]);

      if (insertError) throw insertError;

      const newProgress = Math.round(((currentStepIndex + 1) / steps.length) * 100);
      const { error: updateError } = await supabase
        .from('work_sessions')
        .update({
          progress_percentage: newProgress,
          current_step_id: currentStepIndex + 1 < steps.length ? steps[currentStepIndex + 1].id : null,
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      setCurrentStepIndex(currentStepIndex + 1);
      loadSession();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteStep = async () => {
    if (!session || currentStepIndex >= steps.length) return;

    setLoading(true);
    setError('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const currentStep = steps[currentStepIndex];

      const { error: insertError } = await supabase.from('step_completions').insert([
        {
          work_session_id: sessionId,
          step_id: currentStep.id,
          status: 'completed',
          result: 'pass',
          measurements,
          observations,
          completed_by: user.id,
          completed_at: new Date().toISOString(),
        },
      ]);

      if (insertError) throw insertError;

      const newProgress = Math.round(((currentStepIndex + 1) / steps.length) * 100);
      const { error: updateError } = await supabase
        .from('work_sessions')
        .update({
          progress_percentage: newProgress,
          current_step_id: currentStepIndex + 1 < steps.length ? steps[currentStepIndex + 1].id : null,
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      setMeasurements({});
      setObservations('');
      setCurrentStepIndex(currentStepIndex + 1);
      loadSession();
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
          <p className="text-slate-600">Loading work session...</p>
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

  const currentStep = steps[currentStepIndex];
  const progress = steps.length > 0 ? Math.round((currentStepIndex / steps.length) * 100) : 0;
  const isComplete = currentStepIndex >= steps.length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={onExit}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Exit Session</span>
            </button>
            <button
              onClick={() => setShowAI(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <MessageSquare className="w-4 h-4" />
              AI Assistant
            </button>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium text-slate-600">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
            <div className="flex-1 bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm font-medium text-slate-600">{progress}%</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {isComplete ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Procedure Complete!</h2>
            <p className="text-slate-600 mb-6">
              All steps have been completed. You can now review and submit the phase report.
            </p>
            <button
              onClick={() => setShowReportReview(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Review & Submit Report
            </button>
          </div>
        ) : currentStep ? (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{currentStep.title}</h2>
              {currentStep.description && (
                <p className="text-slate-600">{currentStep.description}</p>
              )}
            </div>

            <div className="p-6 space-y-6">
              {currentStep.title === 'Equipment Identification' && workOrderData ? (
                <EquipmentIdentificationForm
                  initialData={{
                    customer: workOrderData.customer?.company_name || 'Unknown',
                    model: workOrderData.equipment_unit?.equipment_model?.model_number || 'Unknown',
                    serial_number: workOrderData.equipment_unit?.serial_number || 'Unknown',
                  }}
                  onComplete={handleEquipmentComplete}
                  loading={loading}
                />
              ) : (
                <>
                  {currentStep.safety_notes && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-amber-900 mb-1">Safety Note</h3>
                          <p className="text-sm text-amber-800">{currentStep.safety_notes}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">Instructions</h3>
                    <p className="text-slate-700 whitespace-pre-wrap">{currentStep.instructions}</p>
                  </div>

              {currentStep.measurements_required && currentStep.measurements_required.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Measurements</h3>
                  <div className="space-y-3">
                    {currentStep.measurements_required.map((measurement: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3">
                        <label className="flex-1 text-sm font-medium text-slate-700">
                          {measurement.name}
                        </label>
                        <input
                          type="text"
                          placeholder={measurement.unit || 'Value'}
                          value={measurements[measurement.name] || ''}
                          onChange={(e) =>
                            setMeasurements({ ...measurements, [measurement.name]: e.target.value })
                          }
                          className="w-40 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Observations</h3>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Record any observations, issues, or notes..."
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              {currentStep.photo_required && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900 mb-3">
                    <span className="font-semibold">Photo Required:</span> Please capture a photo
                    before completing this step.
                  </p>
                  <button
                    onClick={() => setShowCamera(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <Camera className="w-4 h-4" />
                    Capture Photo
                  </button>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowAI(true)}
                      className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                    >
                      Need Help?
                    </button>
                    <button
                      onClick={async () => {
                        setObservations('Not Applicable');
                        await handleCompleteStep();
                      }}
                      disabled={loading}
                      className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Not Applicable
                    </button>
                    <button
                      onClick={handleCompleteStep}
                      disabled={loading}
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Completing...' : 'Complete Step'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}

        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h3 className="font-semibold text-slate-900 mb-4">All Steps</h3>
          <div className="space-y-2">
            {steps.map((step, idx) => {
              const completion = completions.find((c) => c.step_id === step.id);
              const isCompleted = completion?.status === 'completed';
              const isCurrent = idx === currentStepIndex;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    isCurrent
                      ? 'border-blue-200 bg-blue-50'
                      : isCompleted
                      ? 'border-green-200 bg-green-50'
                      : 'border-slate-200'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
                        isCurrent ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-slate-700'
                      }`}
                    >
                      {step.step_number}. {step.title}
                    </p>
                  </div>
                  {isCurrent && (
                    <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      Current
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showAI && session && currentStep && (
        <AIAssistant
          workSessionId={sessionId}
          currentStep={currentStep}
          context={{
            step_number: currentStepIndex + 1,
            total_steps: steps.length,
            measurements,
            observations,
          }}
          onClose={() => setShowAI(false)}
        />
      )}

      {showCamera && (
        <PhotoCapture
          workSessionId={sessionId}
          stepCompletionId={null}
          onClose={() => setShowCamera(false)}
          onPhotoSaved={() => {
            setShowCamera(false);
          }}
        />
      )}

      {showReportReview && (
        <PhaseReportReview sessionId={sessionId} onExit={onExit} />
      )}
    </div>
  );
}
