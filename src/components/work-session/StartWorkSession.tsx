import { useState, useEffect } from 'react';
import { X, Play, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { ProcedureTemplate, WorkOrderPhase } from '../../types/database';

interface StartWorkSessionProps {
  workOrderId: string;
  assignmentId: string;
  phase: WorkOrderPhase;
  onClose: () => void;
  onSuccess: (sessionId: string) => void;
}

export default function StartWorkSession({
  workOrderId,
  assignmentId,
  phase,
  onClose,
  onSuccess,
}: StartWorkSessionProps) {
  const [procedures, setProcedures] = useState<ProcedureTemplate[]>([]);
  const [selectedProcedure, setSelectedProcedure] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProcedures();
  }, [phase]);

  const loadProcedures = async () => {
    try {
      const { data, error } = await supabase
        .from('procedure_templates')
        .select('*')
        .eq('phase', phase)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProcedures(data || []);

      if (data && data.length === 1) {
        setSelectedProcedure(data[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: sessionData, error: sessionError } = await supabase
        .from('work_sessions')
        .insert([
          {
            work_order_id: workOrderId,
            procedure_template_id: selectedProcedure,
            technician_id: user.id,
            status: 'in_progress',
            progress_percentage: 0,
            started_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (sessionError) throw sessionError;

      const { error: assignmentError } = await supabase
        .from('work_order_assignments')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', assignmentId);

      if (assignmentError) throw assignmentError;

      onSuccess(sessionData.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Play className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold text-slate-900">Start Work Session</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleStart} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              You are about to start a work session. The AI assistant will guide you through each
              step of the procedure.
            </p>
          </div>

          {procedures.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-900">
                No active procedures found for this phase. Please contact your supervisor.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Procedure *
              </label>
              <select
                required
                value={selectedProcedure}
                onChange={(e) => setSelectedProcedure(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                {procedures.length > 1 && <option value="">Choose a procedure</option>}
                {procedures.map((proc) => (
                  <option key={proc.id} value={proc.id}>
                    {proc.name} {proc.version && `(v${proc.version})`}
                  </option>
                ))}
              </select>
              {selectedProcedure && (
                <p className="mt-2 text-sm text-slate-600">
                  {procedures.find((p) => p.id === selectedProcedure)?.estimated_duration && (
                    <>
                      Estimated duration:{' '}
                      {procedures.find((p) => p.id === selectedProcedure)?.estimated_duration}
                    </>
                  )}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedProcedure}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Starting...' : 'Start Work'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
