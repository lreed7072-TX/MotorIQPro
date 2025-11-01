import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, ArrowRight, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface PhaseCompletionProps {
  workOrderId: string;
  currentPhase: string;
  onClose: () => void;
}

const PHASE_LABELS: Record<string, string> = {
  pending_assignment: 'Pending Assignment',
  initial_testing: 'Initial Testing',
  teardown: 'Teardown and Inspect',
  repair_scope: 'Determine Repair Scope and Parts Required',
  inspection: 'Inspection',
  awaiting_approval: 'Awaiting Approval',
  rebuild: 'Rebuild',
  final_testing: 'Final Testing and Quality Verification',
  qc_review: 'QC Review',
  completed: 'Completed',
};

const NEXT_PHASE_MAP: Record<string, string> = {
  initial_testing: 'teardown',
  teardown: 'repair_scope',
  repair_scope: 'rebuild',
  inspection: 'awaiting_approval',
  rebuild: 'final_testing',
  final_testing: 'completed',
  qc_review: 'completed',
};

export default function PhaseCompletion({
  workOrderId,
  currentPhase,
  onClose,
}: PhaseCompletionProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [workOrder, setWorkOrder] = useState<any>(null);

  const isAdmin = profile?.role === 'admin';
  const isManager = profile?.role === 'manager';
  const canManage = isAdmin || isManager;

  const nextPhase = NEXT_PHASE_MAP[currentPhase];

  useEffect(() => {
    loadWorkOrder();
  }, [workOrderId]);

  const loadWorkOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('id', workOrderId)
        .single();

      if (error) throw error;
      setWorkOrder(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCompletePhase = async () => {
    if (!profile) return;

    setLoading(true);
    setError('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: completeError } = await supabase
        .from('work_order_assignments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('work_order_id', workOrderId)
        .eq('phase', currentPhase)
        .eq('assigned_to', user.id);

      if (completeError) throw completeError;

      if (nextPhase) {
        const { error: updateError } = await supabase
          .from('work_orders')
          .update({ current_phase: nextPhase })
          .eq('id', workOrderId);

        if (updateError) throw updateError;
      } else {
        const { error: updateError } = await supabase
          .from('work_orders')
          .update({ current_phase: 'completed' })
          .eq('id', workOrderId);

        if (updateError) throw updateError;
      }

      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExitWorkOrder = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Phase Complete</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900 mb-1">
                  {PHASE_LABELS[currentPhase]} Complete
                </h3>
                <p className="text-sm text-green-800">
                  The phase report has been submitted successfully.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {nextPhase && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">Next Phase:</span> {PHASE_LABELS[nextPhase]}
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  Return to the work order to start the next phase.
                </p>
              </div>
            )}

            {!nextPhase && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-900">
                  <span className="font-semibold">Work Order Complete!</span>
                </p>
                <p className="text-sm text-green-800 mt-1">
                  All phases have been completed. This work order is now complete.
                </p>
              </div>
            )}

            <button
              onClick={handleCompletePhase}
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Approve and Complete Phase
            </button>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
