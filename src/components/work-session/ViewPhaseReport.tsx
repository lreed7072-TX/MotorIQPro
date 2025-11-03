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
          procedure_template:procedure_templates(name, phase)
        `
        )
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Get the latest phase report for this session
      const { data: phaseReportData, error: reportError } = await supabase
        .from('phase_reports')
        .select('*')
        .eq('work_session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (reportError) {
        console.error('Error loading phase report:', reportError);
      }

      // Attach phase report to session data
      const sessionWithReport = {
        ...sessionData,
        phase_report: phaseReportData
      };

      setReport(sessionWithReport);

      // Get step completions from the phase report's JSONB data
      const stepCompletions = phaseReportData?.step_completions || [];
      setCompletions(stepCompletions);

      // Get photos from the phase report's JSONB data
      const reportPhotos = phaseReportData?.photos || [];
      setPhotos(reportPhotos);

      // We don't need to fetch procedure_steps separately anymore
      // since we have the data in step_completions
      setSteps([]);
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
              {completions.map((completion, index) => {
                const hasMeasurements = completion.measurements && Object.keys(completion.measurements).length > 0;
                return (
                  <div
                    key={index}
                    className="p-4 rounded-lg border bg-green-50 border-green-200"
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {completion.step_number}. {completion.step_title}
                        </p>
                        {hasMeasurements && (
                          <div className="mt-2 p-2 bg-white rounded border border-green-200">
                            <p className="text-xs font-medium text-slate-700 mb-1">Measurements:</p>
                            <div className="space-y-1">
                              {Object.entries(completion.measurements).map(([key, value]) => (
                                value && (
                                  <p key={key} className="text-xs text-slate-600">
                                    <span className="font-medium">{key}:</span> {value as string}
                                  </p>
                                )
                              ))}
                            </div>
                          </div>
                        )}
                        {completion.observations && (
                          <p className="text-sm text-slate-600 mt-2">
                            <span className="font-medium">Observations:</span> {completion.observations}
                          </p>
                        )}
                        {completion.completed_at && (
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
                {photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                    <img
                      src={photo.url || photo.photo_url}
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

          {report.phase_report?.equipment_details && Object.keys(report.phase_report.equipment_details).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-2">Equipment Details</h3>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(report.phase_report.equipment_details).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-slate-500 font-medium">{key.replace(/_/g, ' ')}:</span>
                      <span className="ml-2 text-slate-900">{value as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
