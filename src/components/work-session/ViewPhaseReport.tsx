import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, FileText, CheckCircle, Camera } from 'lucide-react';

interface ViewPhaseReportProps {
  sessionId: string;
  onClose: () => void;
}

export default function ViewPhaseReport({ sessionId, onClose }: ViewPhaseReportProps) {
  const [report, setReport] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [completions, setCompletions] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [sessionId]);

  const loadReport = async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('work_sessions')
        .select(
          `
          *,
          procedure_template:procedure_templates(name, phase),
          phase_report:phase_reports(summary, technician_notes)
        `
        )
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setReport(sessionData);

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

      const { data: photosData, error: photosError } = await supabase
        .from('session_photos')
        .select('*')
        .eq('work_session_id', sessionId)
        .order('captured_at');

      if (photosError) throw photosError;
      setPhotos(photosData || []);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const getCompletionForStep = (stepId: string) => {
    return completions.find((c) => c.step_id === stepId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {report.procedure_template?.name}
              </h2>
              <p className="text-sm text-slate-600">
                Phase: {report.procedure_template?.phase}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Status:</span>
                <span className="ml-2 text-slate-900 capitalize">{report.status}</span>
              </div>
              <div>
                <span className="text-slate-500">Progress:</span>
                <span className="ml-2 text-slate-900">{report.progress_percentage}%</span>
              </div>
              <div>
                <span className="text-slate-500">Started:</span>
                <span className="ml-2 text-slate-900">
                  {new Date(report.started_at).toLocaleString()}
                </span>
              </div>
              {report.completed_at && (
                <div>
                  <span className="text-slate-500">Completed:</span>
                  <span className="ml-2 text-slate-900">
                    {new Date(report.completed_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {report.phase_report && (
            <div className="space-y-4">
              {report.phase_report.summary && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Summary</h3>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-900 whitespace-pre-wrap">
                      {report.phase_report.summary}
                    </p>
                  </div>
                </div>
              )}

              {report.phase_report.technician_notes && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Technician Notes</h3>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-900 whitespace-pre-wrap">
                      {report.phase_report.technician_notes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3">Procedure Steps</h3>
            <div className="space-y-2">
              {steps.map((step) => {
                const completion = getCompletionForStep(step.id);
                return (
                  <div
                    key={step.id}
                    className={`p-4 rounded-lg border ${
                      completion
                        ? 'bg-green-50 border-green-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {completion && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {step.step_number}. {step.description}
                        </p>
                        {completion?.notes && (
                          <p className="text-sm text-slate-600 mt-2">Notes: {completion.notes}</p>
                        )}
                        {completion?.completed_at && (
                          <p className="text-xs text-slate-500 mt-1">
                            Completed: {new Date(completion.completed_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {photos.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-3">Photos ({photos.length})</h3>
              <div className="grid grid-cols-3 gap-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                    <img
                      src={photo.photo_url}
                      alt={photo.caption || 'Session photo'}
                      className="w-full h-full object-cover"
                    />
                    {photo.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-2">
                        {photo.caption}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.equipment_details && (
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-2">Equipment Details</h3>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <pre className="text-sm text-slate-900 whitespace-pre-wrap font-mono">
                  {JSON.stringify(report.equipment_details, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
