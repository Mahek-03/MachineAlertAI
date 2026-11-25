import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Plus,
  Clock,
  User,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  X,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import {
  fetchMaintenance,
  fetchMachines,
  scheduleMaintenance,
  updateMaintenance,
  deleteMaintenance,
} from '../api';
import {
  Machine,
  MaintenancePriority,
  MaintenanceRecord,
  MaintenanceStatus,
} from '../types';

export const MaintenancePage: React.FC = () => {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);

  // Form State
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<MaintenancePriority>('Medium');
  const [dueDate, setDueDate] = useState<string>('');
  const [technician, setTechnician] = useState<string>('');
  const [costEstimate, setCostEstimate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Task Completion Modal
  const [completingTask, setCompletingTask] = useState<MaintenanceRecord | null>(null);
  const [completionNotes, setCompletionNotes] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [maintList, mchList] = await Promise.all([
        fetchMaintenance(),
        fetchMachines(),
      ]);
      setRecords(maintList);
      setMachines(mchList);
      if (mchList.length > 0 && !selectedMachineId) {
        setSelectedMachineId(mchList[0].id);
      }
    } catch (err) {
      console.error('Error fetching maintenance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAutoSuggestDueDate = (p: MaintenancePriority) => {
    const now = new Date();
    if (p === 'Critical' || p === 'High') {
      now.setHours(now.getHours() + 24); // within 24h
    } else if (p === 'Medium') {
      now.setDate(now.getDate() + 7); // within 7 days
    } else {
      now.setDate(now.getDate() + 30); // 30 days routine
    }
    setDueDate(now.toISOString().slice(0, 16));
  };

  const handleOpenScheduleModal = () => {
    handleAutoSuggestDueDate(priority);
    setShowScheduleModal(true);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachineId || !title || !dueDate) return;

    try {
      setIsSubmitting(true);
      await scheduleMaintenance({
        machine_id: selectedMachineId,
        title,
        description,
        priority,
        due_date: new Date(dueDate).toISOString(),
        assigned_technician: technician || undefined,
        cost_estimate: costEstimate ? parseFloat(costEstimate) : undefined,
      });
      setShowScheduleModal(false);
      setTitle('');
      setDescription('');
      setCostEstimate('');
      loadData();
    } catch (err) {
      console.error('Failed to schedule maintenance:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveToInProgress = async (id: number) => {
    try {
      await updateMaintenance(id, { status: 'In Progress' });
      loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleConfirmCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTask) return;

    try {
      setIsSubmitting(true);
      await updateMaintenance(completingTask.id, {
        status: 'Completed',
        technician_notes: completionNotes.trim() || undefined,
        completed_at: new Date().toISOString(),
      });
      setCompletingTask(null);
      setCompletionNotes('');
      loadData();
    } catch (err) {
      console.error('Completion error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (!window.confirm('Delete this work order?')) return;
    try {
      await deleteMaintenance(id);
      loadData();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Group into Kanban columns
  const pendingTasks = records.filter((r) => r.status === 'Pending');
  const inProgressTasks = records.filter((r) => r.status === 'In Progress');
  const completedTasks = records.filter((r) => r.status === 'Completed');

  const renderPriorityBadge = (p: MaintenancePriority) => {
    const map = {
      Critical: 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300',
      High: 'bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300',
      Medium: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300',
      Routine: 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${map[p] || map.Routine}`}>
        {p}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Predictive Maintenance Kanban Dispatch
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Automated work orders, technician assignments, and scheduled repairs
          </p>
        </div>

        <button
          onClick={handleOpenScheduleModal}
          className="industrial-btn-primary text-xs self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Work Order</span>
        </button>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* 1. Pending Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>Pending Inspection ({pendingTasks.length})</span>
            </span>
          </div>

          <div className="space-y-3">
            {pendingTasks.map((task) => (
              <div
                key={task.id}
                className="industrial-card p-4 space-y-3 border-l-4 border-l-slate-400 hover:border-l-blue-500 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                    {task.machine_id}
                  </span>
                  {renderPriorityBadge(task.priority)}
                </div>

                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  {task.title}
                </h4>

                {task.description && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {task.description}
                  </p>
                )}

                <div className="space-y-1 text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                    </span>
                    {task.cost_estimate && (
                      <span className="font-mono font-medium text-slate-600 dark:text-slate-300">
                        ${task.cost_estimate}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>Tech: {task.assigned_technician || 'Unassigned'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-slate-400 hover:text-red-500 p-1"
                    title="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleMoveToInProgress(task.id)}
                    className="px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded flex items-center gap-1"
                  >
                    <span>Start Work</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. In Progress Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 dark:bg-slate-900 border border-amber-200 dark:border-slate-800">
            <span className="text-xs font-bold uppercase text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>In Progress ({inProgressTasks.length})</span>
            </span>
          </div>

          <div className="space-y-3">
            {inProgressTasks.map((task) => (
              <div
                key={task.id}
                className="industrial-card p-4 space-y-3 border-l-4 border-l-amber-500 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                    {task.machine_id}
                  </span>
                  {renderPriorityBadge(task.priority)}
                </div>

                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  {task.title}
                </h4>

                {task.description && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {task.description}
                  </p>
                )}

                <div className="space-y-1 text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                      <Clock className="w-3 h-3" />
                      <span>Target: {new Date(task.due_date).toLocaleDateString()}</span>
                    </span>
                    {task.cost_estimate && (
                      <span className="font-mono font-medium text-slate-600 dark:text-slate-300">
                        ${task.cost_estimate}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>Tech: {task.assigned_technician || 'Alex Chen'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    onClick={() => {
                      setCompletingTask(task);
                      setCompletionNotes('');
                    }}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Complete Order</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Completed Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 dark:bg-slate-900 border border-emerald-200 dark:border-slate-800">
            <span className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Completed ({completedTasks.length})</span>
            </span>
          </div>

          <div className="space-y-3">
            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="industrial-card p-4 space-y-3 border-l-4 border-l-emerald-500 bg-slate-50/50 dark:bg-slate-900/60"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-500">
                    {task.machine_id}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    ✓ Closed
                  </span>
                </div>

                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-through decoration-slate-400">
                  {task.title}
                </h4>

                {task.technician_notes && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 p-2 rounded text-xs font-mono">
                    {task.technician_notes}
                  </p>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <span>Tech: {task.assigned_technician}</span>
                  {task.cost_estimate && <span className="font-mono">${task.cost_estimate}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal: Schedule Maintenance Task */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-500" />
                <span>Schedule Maintenance Work Order</span>
              </h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Machine Asset *
                </label>
                <select
                  value={selectedMachineId}
                  onChange={(e) => setSelectedMachineId(e.target.value)}
                  className="industrial-input text-xs font-mono"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} – {m.name} ({m.latest_risk_level})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Work Order Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spindle Tool Insert Replacement & Runout Verification"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="industrial-input text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Priority & Urgency
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Critical', 'High', 'Medium', 'Routine'] as MaintenancePriority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setPriority(p);
                        handleAutoSuggestDueDate(p);
                      }}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                        priority === p
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Due Date (Auto-suggested based on priority) *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="industrial-input text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Technician
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Alex Chen"
                    value={technician}
                    onChange={(e) => setTechnician(e.target.value)}
                    className="industrial-input text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Estimated Cost ($)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 450"
                    value={costEstimate}
                    onChange={(e) => setCostEstimate(e.target.value)}
                    className="industrial-input text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Work Order Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Task instructions and required replacement tooling..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="industrial-input text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="industrial-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="industrial-btn-primary text-xs"
                >
                  {isSubmitting ? 'Creating...' : 'Create Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Complete Work Order */}
      {completingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>Close Task #{completingTask.id}</span>
              </h3>
              <button
                onClick={() => setCompletingTask(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Provide summary technician notes regarding work performed on {completingTask.machine_id}.
            </p>

            <form onSubmit={handleConfirmCompletion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Completion Notes
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Replaced worn cutting tool insert, adjusted feed rates, tested 30 min run without vibration."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="industrial-input text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCompletingTask(null)}
                  className="industrial-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="industrial-btn-primary text-xs bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSubmitting ? 'Closing...' : 'Confirm Completed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
