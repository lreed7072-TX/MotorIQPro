import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  X,
  Calendar,
  User,
  Package,
  AlertCircle,
  PlayCircle,
  CheckSquare,
  UserPlus,
  ClipboardList,
  FileText,
} from 'lucide-react';
import AssignWorkOrder from './AssignWorkOrder';
import StartWorkSession from '../work-session/StartWorkSession';
import WorkSessionView from '../work-session/WorkSessionView';
import RequestApproval from './RequestApproval';
import ApprovalReview from './ApprovalReview';
import ViewPhaseReport from '../work-session/ViewPhaseReport';
import ReportGenerator from '../reports/ReportGenerator';
import type { WorkOrder, WorkOrderAssignment, WorkOrderApproval } from '../../types/database';

interface WorkOrderDetailProps {
  workOrderId: string;
  onClose: () => void;
  onUpdate: () => void;
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
  cancelled: 'Cancelled',
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

const PREVIOUS_PHASE_MAP: Record<string, string> = {
  teardown: 'initial_testing',
  repair_scope: 'teardown',
  rebuild: 'repair_scope',
  final_testing: 'rebuild',
};

const getPreviousPhase = (phase: string): string | null => {
  return PREVIOUS_PHASE_MAP[phase] || null;
};

export default function WorkOrderDetail({
  workOrderId,
  onClose,
  onUpdate,
}: WorkOrderDetailProps) {
  const { profile } = useAuth();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [assignments, setAssignments] = useState<WorkOrderAssignment[]>([]);
  const [approvals, setApprovals] = useState<WorkOrderApproval[]>([]);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [showStartSession, setShowStartSession] = useState(false);
  const [showWorkSession, setShowWorkSession] = useState(false);
  const [showRequestApproval, setShowRequestApproval] = useState(false);
  const [showApprovalReview, setShowApprovalReview] = useState(false);
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);
  const [showViewReport, setShowViewReport] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showReportGenerator, setShowReportGenerator] = useState(false);

  const isAdmin = profile?.role === 'admin';
  const isManager = profile?.role === 'manager';
  const canManage = isAdmin || isManager;

  const currentAssignment = assignments.find(
    (a) => a.assigned_to === profile?.id && a.phase === workOrder?.current_phase && a.status !== 'completed' && a.status !== 'cancelled'
  );

  const previousPhaseAssignment = workOrder?.current_phase ? assignments.find(
    (a) => a.assigned_to === profile?.id && a.phase === getPreviousPhase(workOrder.current_phase) && a.status === 'completed'
  ) : null;

  const currentPhaseAssignment = assignments.find(
    (a) => a.assigned_to === profile?.id && a.phase === workOrder?.current_phase
  );

  const canStartNextPhase = !currentPhaseAssignment && previousPhaseAssignment;
  const canContinuePhase = currentPhaseAssignment && currentPhaseAssignment.status !== 'completed';

  useEffect(() => {
    loadWorkOrder();
  }, [workOrderId]);

  const loadWorkOrder = async () => {
    try {
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
          customer:customers (company_name, contact_person, phone, email)
        `
        )
        .eq('id', workOrderId)
        .maybeSingle();

      if (woError) throw woError;
      setWorkOrder(woData);

      const { data: assignData, error: assignError } = await supabase
        .from('work_order_assignments')
        .select(
          `
          *,
          technician:users!work_order_assignments_assigned_to_fkey(id, full_name, employee_id)
        `
        )
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: false });

      if (assignError) throw assignError;
      setAssignments(assignData || []);

      const { data: approvalData, error: approvalError } = await supabase
        .from('work_order_approvals')
        .select('*')
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: false });

      if (approvalError) throw approvalError;
      setApprovals(approvalData || []);

      const { data: sessionData } = await supabase
        .from('work_sessions')
        .select('*')
        .eq('work_order_id', workOrderId)
        .eq('status', 'in_progress')
        .maybeSingle();

      setCurrentSession(sessionData);
    } catch (error) {
      console.error('Error loading work order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAssignment = async (assignment: WorkOrderAssignment) => {
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('work_sessions')
        .select('id, status')
        .eq('work_order_id', workOrderId)
        .eq('technician_id', assignment.assigned_to)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionError) throw sessionError;

      if (sessionData) {
        setCurrentSession(sessionData);
        setShowWorkSession(true);
      }
    } catch (error) {
      console.error('Error loading assignment session:', error);
    }
  };

  const handleStartNextPhase = async () => {
    if (!workOrder || !profile) return;

    try {
      const nextPhase = workOrder.current_phase;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('work_orders')
        .update({ current_phase: nextPhase })
        .eq('id', workOrderId);

      if (updateError) throw updateError;

      const { data: existingAssignment } = await supabase
        .from('work_order_assignments')
        .select('*')
        .eq('work_order_id', workOrderId)
        .eq('phase', nextPhase)
        .eq('assigned_to', user.id)
        .maybeSingle();

      let assignmentId = existingAssignment?.id;

      if (!existingAssignment) {
        const { data: newAssignment, error: assignmentError } = await supabase
          .from('work_order_assignments')
          .insert([
            {
              work_order_id: workOrderId,
              assigned_to: user.id,
              assigned_by: user.id,
              phase: nextPhase,
              status: 'assigned',
            },
          ])
          .select()
          .single();

        if (assignmentError) throw assignmentError;
        assignmentId = newAssignment.id;
      }

      setShowStartSession(true);
      loadWorkOrder();
    } catch (error) {
      console.error('Error starting next phase:', error);
    }
  };


  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!workOrder) {
    return null;
  }

  const getPhaseBadge = (phase: string) => {
    const badges: Record<string, string> = {
      pending_assignment: 'bg-slate-100 text-slate-800',
      initial_testing: 'bg-blue-100 text-blue-800',
      teardown: 'bg-amber-100 text-amber-800',
      inspection: 'bg-purple-100 text-purple-800',
      awaiting_approval: 'bg-yellow-100 text-yellow-800',
      rebuild: 'bg-green-100 text-green-800',
      final_testing: 'bg-blue-100 text-blue-800',
      qc_review: 'bg-indigo-100 text-indigo-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return badges[phase] || badges.pending_assignment;
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, string> = {
      low: 'bg-slate-100 text-slate-700',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-amber-100 text-amber-700',
      emergency: 'bg-red-100 text-red-700',
    };
    return badges[priority] || badges.medium;
  };

  const pendingApproval = approvals.find((a) => a.status === 'pending');

  return (
    <>
      {!showWorkSession && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{workOrder.work_order_number}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-1 text-xs font-medium rounded ${getPhaseBadge(workOrder.current_phase)}`}>
                  {PHASE_LABELS[workOrder.current_phase]}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityBadge(workOrder.priority)}`}>
                  {workOrder.priority}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-3">Customer Information</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-slate-500">Company:</span>
                    <span className="ml-2 text-slate-900">{workOrder.customer?.company_name}</span>
                  </div>
                  {workOrder.customer?.contact_person && (
                    <div>
                      <span className="text-slate-500">Contact:</span>
                      <span className="ml-2 text-slate-900">{workOrder.customer.contact_person}</span>
                    </div>
                  )}
                  {workOrder.customer?.phone && (
                    <div>
                      <span className="text-slate-500">Phone:</span>
                      <span className="ml-2 text-slate-900">{workOrder.customer.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-3">Equipment Details</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-slate-500">Manufacturer:</span>
                    <span className="ml-2 text-slate-900">
                      {workOrder.equipment_unit?.equipment_model?.manufacturer?.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Model:</span>
                    <span className="ml-2 text-slate-900">
                      {workOrder.equipment_unit?.equipment_model?.model_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Serial Number:</span>
                    <span className="ml-2 text-slate-900">{workOrder.equipment_unit?.serial_number}</span>
                  </div>
                </div>
              </div>
            </div>

            {workOrder.reported_issue && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2">Reported Issue</h3>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-900">{workOrder.reported_issue}</p>
                </div>
              </div>
            )}

            {assignments.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-3">Assignments</h3>
                <div className="space-y-2">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="p-4 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition"
                      onClick={() => handleViewAssignment(assignment)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">
                            {assignment.technician?.full_name}
                          </p>
                          <p className="text-xs text-slate-600">{PHASE_LABELS[assignment.phase]}</p>
                          {assignment.started_at && (
                            <p className="text-xs text-slate-500 mt-1">
                              Started: {new Date(assignment.started_at).toLocaleString()}
                            </p>
                          )}
                          {assignment.completed_at && (
                            <p className="text-xs text-slate-500">
                              Completed: {new Date(assignment.completed_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          assignment.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : assignment.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {assignment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {approvals.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-3">Approvals</h3>
                <div className="space-y-2">
                  {approvals.map((approval) => (
                    <div
                      key={approval.id}
                      className="p-4 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition"
                      onClick={() => {
                        setSelectedApprovalId(approval.id);
                        setShowApprovalReview(true);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">
                            {PHASE_LABELS[approval.phase_completed]} → {PHASE_LABELS[approval.next_phase]}
                          </p>
                          <p className="text-xs text-slate-600">
                            Requested: {new Date(approval.requested_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          approval.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : approval.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {approval.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              {canManage && workOrder.current_phase === 'pending_assignment' && (
                <button
                  onClick={() => setShowAssign(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <UserPlus className="w-4 h-4" />
                  Assign Technician
                </button>
              )}

              {canStartNextPhase && workOrder.current_phase !== 'awaiting_approval' && workOrder.current_phase !== 'completed' && (
                <button
                  onClick={handleStartNextPhase}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <PlayCircle className="w-4 h-4" />
                  Start Next Phase
                </button>
              )}

              {canContinuePhase && !currentSession && workOrder.current_phase !== 'awaiting_approval' && (
                <button
                  onClick={() => setShowStartSession(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <PlayCircle className="w-4 h-4" />
                  Start Work
                </button>
              )}

              {currentSession && (
                <button
                  onClick={() => setShowWorkSession(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <ClipboardList className="w-4 h-4" />
                  Continue Phase
                </button>
              )}

              {currentAssignment &&
                currentSession &&
                ['inspection', 'final_testing'].includes(workOrder.current_phase) && (
                  <button
                    onClick={() => setShowRequestApproval(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                  >
                    <CheckSquare className="w-4 h-4" />
                    Request Approval
                  </button>
                )}

              {canManage && pendingApproval && (
                <button
                  onClick={() => {
                    setSelectedApprovalId(pendingApproval.id);
                    setShowApprovalReview(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
                >
                  <AlertCircle className="w-4 h-4" />
                  Review Approval
                </button>
              )}

              {canManage && workOrder.current_phase === 'awaiting_approval' && !pendingApproval && (
                <button
                  onClick={() => setShowAssign(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <UserPlus className="w-4 h-4" />
                  Assign for Rebuild
                </button>
              )}

              <button
                onClick={() => setShowReportGenerator(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition ml-auto"
              >
                <FileText className="w-4 h-4" />
                Generate Report
              </button>
            </div>
          </div>
        </div>
        </div>
      )}

      {showAssign && (
        <AssignWorkOrder
          workOrderId={workOrderId}
          currentPhase={workOrder.current_phase === 'pending_assignment' ? 'initial_testing' : 'rebuild'}
          onClose={() => setShowAssign(false)}
          onSuccess={() => {
            setShowAssign(false);
            loadWorkOrder();
            onUpdate();
          }}
        />
      )}

      {showStartSession && currentAssignment && (
        <StartWorkSession
          workOrderId={workOrderId}
          assignmentId={currentAssignment.id}
          phase={currentAssignment.phase}
          onClose={() => setShowStartSession(false)}
          onSuccess={(sessionId) => {
            setShowStartSession(false);
            setCurrentSession({ id: sessionId });
            setShowWorkSession(true);
          }}
        />
      )}

      {showWorkSession && currentSession && (
        <WorkSessionView
          sessionId={currentSession.id}
          onExit={() => {
            setShowWorkSession(false);
            loadWorkOrder();
            onUpdate();
          }}
        />
      )}

      {showRequestApproval && currentSession && (
        <RequestApproval
          workOrderId={workOrderId}
          workSessionId={currentSession.id}
          currentPhase={workOrder.current_phase}
          nextPhase={NEXT_PHASE_MAP[workOrder.current_phase] as any}
          onClose={() => setShowRequestApproval(false)}
          onSuccess={() => {
            setShowRequestApproval(false);
            loadWorkOrder();
            onUpdate();
          }}
        />
      )}

      {showApprovalReview && selectedApprovalId && (
        <ApprovalReview
          approvalId={selectedApprovalId}
          onClose={() => {
            setShowApprovalReview(false);
            setSelectedApprovalId(null);
          }}
          onSuccess={() => {
            setShowApprovalReview(false);
            setSelectedApprovalId(null);
            loadWorkOrder();
            onUpdate();
          }}
        />
      )}

      {showViewReport && selectedSessionId && (
        <ViewPhaseReport
          sessionId={selectedSessionId}
          onClose={() => {
            setShowViewReport(false);
            setSelectedSessionId(null);
          }}
        />
      )}

      {showReportGenerator && (
        <ReportGenerator
          workOrderId={workOrderId}
          onClose={() => setShowReportGenerator(false)}
        />
      )}
    </>
  );
}
