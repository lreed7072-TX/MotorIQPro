import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, CheckCircle } from 'lucide-react';

interface ApproveWorkOrderProps {
  workOrderId: string;
  workOrderNumber: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ApproveWorkOrder({
  workOrderId,
  workOrderNumber,
  onClose,
  onSuccess,
}: ApproveWorkOrderProps) {
  const [approvedBy, setApprovedBy] = useState('');
  const [customerPoNumber, setCustomerPoNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleApprove = async () => {
    if (!approvedBy.trim()) {
      setError('Please enter who approved this work order');
      return;
    }

    if (!customerPoNumber.trim()) {
      setError('Please enter the customer PO number');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('work_orders')
        .update({
          approval_status: 'approved',
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
          customer_po_number: customerPoNumber,
        })
        .eq('id', workOrderId);

      if (updateError) throw updateError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error approving work order:', err);
      setError(err.message || 'Failed to approve work order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Approve Work Order</h2>
              <p className="text-sm text-slate-600">{workOrderNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Approved By <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
              placeholder="Enter name of person who approved"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              autoFocus
            />
            <p className="text-xs text-slate-500 mt-1">
              Name of the customer representative or manager who approved this work
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Customer PO Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={customerPoNumber}
              onChange={(e) => setCustomerPoNumber(e.target.value)}
              placeholder="Enter customer purchase order number"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              The purchase order number from the customer for this work
            </p>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 bg-slate-50 rounded-b-lg border-t border-slate-200">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={submitting || !approvedBy.trim() || !customerPoNumber.trim()}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Approving...' : 'Approve Work Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
