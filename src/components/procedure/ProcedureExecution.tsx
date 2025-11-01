import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  ProcedureStep,
  StepCompletion,
  WorkSession,
} from '../../types/database';
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Clock,
  Bot,
} from 'lucide-react';
import DashboardLayout from '../layout/DashboardLayout';

interface ProcedureExecutionProps {
  sessionId: string;
}

export default function ProcedureExecution({ sessionId }: ProcedureExecutionProps) {
  const { profile } = useAuth();
  const [session, setSession] = useState<WorkSession | null>(null);
  const [steps, setSteps] = useState<ProcedureStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completion, setCompletion] = useState<StepCompletion | null>(null);
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAI, setShowAI] = useState(false);

  useEffect(() => {
    fetchSessionData();
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      setLoading(true);

      const { data: sessionData, error: sessionError } = await supabase
        .from('work_sessions')
        .select(`
          *,
          procedure_template:procedure_templates (
            *,
            steps:procedure_steps (*)
          )
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      setSession(sessionData);
      const procedureSteps = sessionData.procedure_template?.steps || [];
      setSteps(procedureSteps.sort((a, b) => a.step_number - b.step_number));

      if (sessionData.current_step_id) {
        const currentIndex = procedureSteps.findIndex(
          (s: ProcedureStep) => s.id === sessionData.current_step_id
        );
        if (currentIndex >= 0) setCurrentStepIndex(currentIndex);
      }

      await fetchStepCompletion(procedureSteps[currentStepIndex]?.id);
    } catch (error) {
      console.error('Error fetching session data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStepCompletion = async (stepId: string) => {
    if (!stepId) return;

    const { data, error } = await supabase
      .from('step_completions')
      .select('*')
      .eq('work_session_id', sessionId)
      .eq('step_id', stepId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching step completion:', error);
      return;
    }

    if (data) {
      setCompletion(data);
      setMeasurements(data.measurements || {});
      setObservations(data.observations || '');
    } else {
      setCompletion(null);
      setMeasurements({});
      setObservations('');
    }
  };

  const currentStep = steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleCompleteStep = async (result: 'pass' | 'fail' | 'na') => {
    if (!currentStep || !profile) return;

    try {
      const completionData = {
        work_session_id: sessionId,
        step_id: currentStep.id,
        status: 'completed',
        result,
        measurements,
        observations,
        completed_by: profile.id,
        completed_at: new Date().toISOString(),
      };

      if (completion) {
        await supabase
          .from('step_completions')
          .update(completionData)
          .eq('id', completion.id);
      } else {
        await supabase.from('step_completions').insert(completionData);
      }

      const nextIndex = currentStepIndex + 1;
      const newProgress = (nextIndex / steps.length) * 100;

      await supabase
        .from('work_sessions')
        .update({
          current_step_id: steps[nextIndex]?.id || null,
          progress_percentage: newProgress,
          status: nextIndex >= steps.length ? 'completed' : 'in_progress',
        })
        .eq('id', sessionId);

      if (nextIndex < steps.length) {
        setCurrentStepIndex(nextIndex);
        await fetchStepCompletion(steps[nextIndex].id);
      } else {
        alert('Procedure completed!');
      }
    } catch (error) {
      console.error('Error completing step:', error);
      alert('Error completing step. Please try again.');
    }
  };

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      const newIndex = currentStepIndex - 1;
      setCurrentStepIndex(newIndex);
      fetchStepCompletion(steps[newIndex].id);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading procedure...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!currentStep) {
    return (
      <DashboardLayout>
        <div className="p-12 text-center">
          <p className="text-slate-600">No steps found for this procedure.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <button className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition">
                <ChevronLeft className="w-5 h-5" />
                <span>Back to Work Orders</span>
              </button>
              <button
                onClick={() => setShowAI(!showAI)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Bot className="w-5 h-5" />
                <span>AI Assistant</span>
              </button>
            </div>

            <div className="mb-2">
              <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                <span>
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="bg-white rounded-lg border border-slate-200 p-8 mb-6">
            <div className="flex items-start gap-3 mb-6">
              <div className="bg-blue-100 p-2 rounded-lg">
                <span className="text-blue-600 font-semibold text-lg">
                  {currentStep.step_number}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                  {currentStep.title}
                </h2>
                {currentStep.description && (
                  <p className="text-slate-600">{currentStep.description}</p>
                )}
              </div>
            </div>

            {currentStep.safety_notes && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900 mb-1">Safety Note</p>
                  <p className="text-sm text-amber-800">{currentStep.safety_notes}</p>
                </div>
              </div>
            )}

            <div className="mb-6">
              <h3 className="font-semibold text-slate-900 mb-3">Instructions</h3>
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {currentStep.instructions}
              </p>
            </div>

            {currentStep.measurements_required &&
              currentStep.measurements_required.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-slate-900 mb-3">Measurements</h3>
                  <div className="space-y-3">
                    {currentStep.measurements_required.map((measurement: any, index: number) => (
                      <div key={index} className="flex items-center gap-4">
                        <label className="flex-1 text-sm font-medium text-slate-700">
                          {measurement.name || `Measurement ${index + 1}`}
                        </label>
                        <input
                          type="text"
                          value={measurements[measurement.name] || ''}
                          onChange={(e) =>
                            setMeasurements({
                              ...measurements,
                              [measurement.name]: e.target.value,
                            })
                          }
                          placeholder={measurement.unit || 'Value'}
                          className="w-40 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                        {measurement.acceptable_range && (
                          <span className="text-xs text-slate-500">
                            {measurement.acceptable_range}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            <div className="mb-6">
              <h3 className="font-semibold text-slate-900 mb-3">Observations</h3>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Record any observations, issues, or notes..."
                rows={4}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              />
            </div>

            <div className="flex gap-3 mb-6">
              <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition">
                <Camera className="w-5 h-5" />
                <span>Add Photo</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition">
                <MessageSquare className="w-5 h-5" />
                <span>Add Note</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-200">
              <button
                onClick={handlePreviousStep}
                disabled={currentStepIndex === 0}
                className="flex items-center gap-2 px-6 py-3 text-slate-700 hover:bg-slate-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Previous</span>
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => handleCompleteStep('fail')}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                >
                  Mark as Failed
                </button>
                <button
                  onClick={() => handleCompleteStep('pass')}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>Complete Step</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-100 rounded-lg p-6">
            <div className="flex items-center gap-2 text-slate-600 mb-2">
              <Clock className="w-5 h-5" />
              <span className="text-sm font-medium">Estimated Time</span>
            </div>
            <p className="text-slate-900">
              {currentStep.estimated_time || 'Not specified'}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
