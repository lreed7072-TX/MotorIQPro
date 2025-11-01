import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, DollarSign, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { WorkOrderApproval, User } from '../../types/database';

interface ApprovalReviewProps {
  approvalId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ApprovalReview({ approvalId, onClose, onSuccess }: ApprovalReviewProps) {
  const [approval, setApproval] = useState<WorkOrderApproval | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadApproval();
  }, [approvalId]);

  const loadApproval = async () => {
    try {
      const { data, error } = await supabase
        .from('work_order_approvals')
        .select(
          `
          *,
          requester:users!work_order_approvals_requested_by_fkey(id, full_name, employee_id)
        `
        )
        .eq('id', approvalId)
        .single();

      if (error) throw error;
      setApproval(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approval) return;

    setSubmitting(true);
    setError('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: approvalError } = await supabase
        .from('work_order_approvals')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          approval_notes: approvalNotes,
        })
        .eq('id', approvalId);

      if (approvalError) throw approvalError;

      const { error: woError } = await supabase
        .from('work_orders')
        .update({
          current_phase: approval.next_phase,
          status: 'in_progress',
        })
        .eq('id', approval.work_order_id);

      if (woError) throw woError;

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!approval) return;
    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: approvalError } = await supabase
        .from('work_order_approvals')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', approvalId);

      if (approvalError) throw approvalError;

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6">
          <p className="text-red-800">Approval not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Review Approval Request</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600 mb-1">Requested By</p>
              <p className="font-medium text-slate-900">{approval.requester?.full_name}</p>
              {approval.requester?.employee_id && (
                <p className="text-sm text-slate-600">ID: {approval.requester.employee_id}</p>
              )}
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600 mb-1">Requested At</p>
              <p className="font-medium text-slate-900">
                {new Date(approval.requested_at).toLocaleString()}
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Findings Summary</h3>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-slate-700 whitespace-pre-wrap">{approval.findings_summary}</p>
            </div>
          </div>

          {approval.required_parts && approval.required_parts.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Required Parts</h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                        Part Number
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                        Description
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-slate-700">
                        Qty
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-700">
                        Unit Cost
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-700">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {approval.required_parts.map((part: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          {part.part_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{part.description}</td>
                        <td className="px-4 py-3 text-sm text-center text-slate-700">
                          {part.quantity}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-slate-700">
                          ${part.estimated_cost.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                          ${(part.quantity * part.estimated_cost).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {approval.estimated_cost !== null && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <p className="text-xs font-semibold text-blue-900">Total Parts Cost</p>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  ${approval.estimated_cost.toFixed(2)}
                </p>
              </div>
            )}
            {approval.estimated_hours !== null && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-green-600" />
                  <p className="text-xs font-semibold text-green-900">Estimated Labor</p>
                </div>
                <p className="text-2xl font-bold text-green-900">{approval.estimated_hours} hrs</p>
              </div>
            )}
          </div>

          {approval.status === 'pending' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Approval Notes (Optional)
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any notes or instructions for the rebuild phase..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Rejection Reason (Required if rejecting)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  placeholder="Explain why this request is being rejected..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-5 h-5" />
                  {submitting ? 'Rejecting...' : 'Reject'}
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-5 h-5" />
                  {submitting ? 'Approving...' : 'Approve'}
                </button>
              </div>
            </>
          )}

          {approval.status !== 'pending' && (
            <div
              className={`p-4 rounded-lg border ${
                approval.status === 'approved'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <p
                className={`text-sm font-semibold ${
                  approval.status === 'approved' ? 'text-green-900' : 'text-red-900'
                }`}
              >
                {approval.status === 'approved' ? 'APPROVED' : 'REJECTED'}
              </p>
              {approval.approved_at && (
                <p className="text-xs text-slate-600 mt-1">
                  {new Date(approval.approved_at).toLocaleString()}
                </p>
              )}
              {approval.approval_notes && (
                <p className="text-sm text-slate-700 mt-2">{approval.approval_notes}</p>
              )}
              {approval.rejection_reason && (
                <p className="text-sm text-red-800 mt-2">{approval.rejection_reason}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
