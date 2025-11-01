import { useState, useEffect } from 'react';
import { X, AlertCircle, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { User, WorkOrderPhase } from '../../types/database';

interface AssignWorkOrderProps {
  workOrderId: string;
  currentPhase: WorkOrderPhase;
  onClose: () => void;
  onSuccess: () => void;
}

const PHASE_LABELS: Record<WorkOrderPhase, string> = {
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
  cancelled: 'Cancelled',
};

export default function AssignWorkOrder({
  workOrderId,
  currentPhase,
  onClose,
  onSuccess,
}: AssignWorkOrderProps) {
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTechnicians();
  }, []);

  const loadTechnicians = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, employee_id, certification_level, role')
        .order('full_name');

      if (error) throw error;
      setTechnicians(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: assignError } = await supabase
        .from('work_order_assignments')
        .insert([
          {
            work_order_id: workOrderId,
            assigned_to: selectedTechnician,
            assigned_by: user.id,
            phase: currentPhase,
            status: 'assigned',
            notes,
          },
        ]);

      if (assignError) throw assignError;

      const { error: updateError } = await supabase
        .from('work_orders')
        .update({
          assigned_to: selectedTechnician,
          status: 'in_progress',
        })
        .eq('id', workOrderId);

      if (updateError) throw updateError;

      onSuccess();
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
            <UserPlus className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-slate-900">Assign Work Order</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleAssign} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <span className="font-medium">Phase:</span> {PHASE_LABELS[currentPhase]}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Assign To *
            </label>
            <select
              required
              value={selectedTechnician}
              onChange={(e) => setSelectedTechnician(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Choose a user</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.full_name}
                  {tech.employee_id && ` (${tech.employee_id})`}
                  {tech.role && ` - ${tech.role.charAt(0).toUpperCase() + tech.role.slice(1)}`}
                  {tech.certification_level && ` - ${tech.certification_level}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Assignment Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any special instructions or notes..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            />
          </div>

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
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Assigning...' : 'Assign User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
