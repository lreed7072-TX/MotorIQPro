import { useState } from 'react';
import { X, CheckSquare, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { WorkOrderPhase } from '../../types/database';

interface RequestApprovalProps {
  workOrderId: string;
  workSessionId: string;
  currentPhase: WorkOrderPhase;
  nextPhase: WorkOrderPhase;
  onClose: () => void;
  onSuccess: () => void;
}

interface RequiredPart {
  part_number: string;
  description: string;
  quantity: number;
  estimated_cost: number;
}

export default function RequestApproval({
  workOrderId,
  workSessionId,
  currentPhase,
  nextPhase,
  onClose,
  onSuccess,
}: RequestApprovalProps) {
  const [findingsSummary, setFindingsSummary] = useState('');
  const [requiredParts, setRequiredParts] = useState<RequiredPart[]>([]);
  const [estimatedHours, setEstimatedHours] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addPart = () => {
    setRequiredParts([
      ...requiredParts,
      { part_number: '', description: '', quantity: 1, estimated_cost: 0 },
    ]);
  };

  const removePart = (index: number) => {
    setRequiredParts(requiredParts.filter((_, i) => i !== index));
  };

  const updatePart = (index: number, field: keyof RequiredPart, value: any) => {
    const updated = [...requiredParts];
    updated[index] = { ...updated[index], [field]: value };
    setRequiredParts(updated);
  };

  const totalCost = requiredParts.reduce((sum, part) => sum + part.quantity * part.estimated_cost, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: approvalError } = await supabase.from('work_order_approvals').insert([
        {
          work_order_id: workOrderId,
          phase_completed: currentPhase,
          next_phase: nextPhase,
          requested_by: user.id,
          status: 'pending',
          findings_summary: findingsSummary,
          required_parts: requiredParts,
          estimated_cost: totalCost,
          estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
        },
      ]);

      if (approvalError) throw approvalError;

      const { error: sessionError } = await supabase
        .from('work_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', workSessionId);

      if (sessionError) throw sessionError;

      const { error: woError } = await supabase
        .from('work_orders')
        .update({ current_phase: 'awaiting_approval' })
        .eq('id', workOrderId);

      if (woError) throw woError;

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-slate-900">Request Approval</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              Submit your findings and parts requirements for manager approval before proceeding to
              the rebuild phase.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Findings Summary *
            </label>
            <textarea
              required
              value={findingsSummary}
              onChange={(e) => setFindingsSummary(e.target.value)}
              rows={6}
              placeholder="Summarize your inspection findings, identified issues, and recommended actions..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-slate-700">Required Parts</label>
              <button
                type="button"
                onClick={addPart}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Part
              </button>
            </div>

            {requiredParts.length === 0 ? (
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                <p className="text-sm text-slate-500">No parts added yet</p>
                <button
                  type="button"
                  onClick={addPart}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  Add your first part
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {requiredParts.map((part, idx) => (
                  <div key={idx} className="border border-slate-300 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-sm font-medium text-slate-700">Part {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removePart(idx)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Part Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={part.part_number}
                          onChange={(e) => updatePart(idx, 'part_number', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={part.quantity}
                          onChange={(e) => updatePart(idx, 'quantity', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Description *
                        </label>
                        <input
                          type="text"
                          required
                          value={part.description}
                          onChange={(e) => updatePart(idx, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Est. Cost per Unit ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={part.estimated_cost}
                          onChange={(e) =>
                            updatePart(idx, 'estimated_cost', parseFloat(e.target.value))
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {requiredParts.length > 0 && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">Total Parts Cost:</span>
                  <span className="font-bold text-slate-900">${totalCost.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Estimated Rebuild Hours
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="e.g., 8.5"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200">
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
              {loading ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
