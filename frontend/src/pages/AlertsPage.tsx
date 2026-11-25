import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Wrench,
  Search,
  UserCheck,
  CheckCircle2,
  X,
  RotateCw,
  ExternalLink,
} from 'lucide-react';
import { fetchAlerts, acknowledgeAlert, resolveAlert } from '../api';
import { Alert, AlertStatus, RiskLevel } from '../types';
import { RiskBadge } from '../components/ui/RiskBadge';

export const AlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [machineFilter, setMachineFilter] = useState<string>('');

  // Resolution modal state
  const [resolvingAlert, setResolvingAlert] = useState<Alert | null>(null);
  const [resolveNotes, setResolveNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const data = await fetchAlerts({
        status: statusFilter || undefined,
        level: levelFilter || undefined,
        machine_id: machineFilter || undefined,
        limit: 100,
      });
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [statusFilter, levelFilter]);

  const handleAcknowledge = async (id: number) => {
    try {
      await acknowledgeAlert(id, 'Inspection dispatched. Technician en route to asset.');
      loadAlerts();
    } catch (err) {
      console.error('Acknowledgment error:', err);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingAlert || !resolveNotes.trim()) return;

    try {
      setIsSubmitting(true);
      await resolveAlert(resolvingAlert.id, resolveNotes.trim());
      setResolvingAlert(null);
      setResolveNotes('');
      loadAlerts();
    } catch (err) {
      console.error('Resolution error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Incident Alerts & Remediation Dispatch
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time multi-sensor threshold warnings, failure diagnosis, and repair verification logs
          </p>
        </div>

        <button
          onClick={loadAlerts}
          className="industrial-btn-secondary text-xs self-start sm:self-center"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="industrial-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            {['', 'Open', 'Acknowledged', 'Resolved'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {st || 'All Incidents'}
              </button>
            ))}
          </div>

          {/* Severity Tabs */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium">Severity:</span>
            {['', 'High Risk', 'Medium Risk'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  levelFilter === lvl
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {lvl || 'All Severities'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 flex justify-center items-center text-slate-400 text-xs">
            <RotateCw className="w-5 h-5 animate-spin text-blue-500 mr-2" />
            <span>Fetching incident logs...</span>
          </div>
        ) : alerts.length === 0 ? (
          <div className="industrial-card p-12 text-center text-slate-400 space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-500/50 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No matching alerts found
            </h4>
            <p className="text-xs text-slate-500">
              There are no incident tickets matching your current filter criteria.
            </p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`industrial-card p-5 space-y-4 border-l-4 transition-all ${
                alert.level === 'High Risk'
                  ? 'border-l-red-500'
                  : alert.level === 'Medium Risk'
                  ? 'border-l-amber-500'
                  : 'border-l-blue-500'
              }`}
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                    {alert.machine_id}
                  </span>
                  <RiskBadge level={alert.level} size="sm" />
                  {alert.failure_mode && (
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                      {alert.failure_mode}
                    </span>
                  )}
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                      alert.status === 'Open'
                        ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                        : alert.status === 'Acknowledged'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    }`}
                  >
                    ● {alert.status}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                  <span>Probability: {alert.probability.toFixed(1)}%</span>
                  <span>•</span>
                  <span>{new Date(alert.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Message */}
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-snug">
                {alert.message}
              </p>

              {/* Root Cause Factors & Recommended Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Factors */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Driving Risk Telemetry (SHAP):
                  </span>
                  {alert.top_factors && alert.top_factors.length > 0 ? (
                    <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                      {alert.top_factors.map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-blue-500 font-bold">•</span>
                          <span>{f.human_text || f.feature}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-400">Nominal baseline metrics.</p>
                  )}
                </div>

                {/* Actions */}
                <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 space-y-1.5">
                  <span className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Recommended Technical Action:</span>
                  </span>
                  {alert.recommended_actions && alert.recommended_actions.length > 0 ? (
                    <ul className="space-y-1 text-blue-950 dark:text-blue-200">
                      {alert.recommended_actions.map((act, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="font-bold">→</span>
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-400">Follow standard inspection protocol.</p>
                  )}
                </div>
              </div>

              {/* Technician Notes */}
              {alert.technician_notes && (
                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-line">
                  {alert.technician_notes}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  onClick={() => navigate(`/machines/${alert.machine_id}`)}
                  className="text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
                >
                  <span>View Machine Telemetry</span>
                  <ExternalLink className="w-3 h-3" />
                </button>

                <div className="flex items-center gap-2">
                  {alert.status === 'Open' && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      Acknowledge Incident
                    </button>
                  )}

                  {alert.status !== 'Resolved' && (
                    <button
                      onClick={() => {
                        setResolvingAlert(alert);
                        setResolveNotes('');
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      Mark Resolved
                    </button>
                  )}

                  <button
                    onClick={() => navigate('/maintenance')}
                    className="industrial-btn-secondary text-xs py-1"
                  >
                    Kanban Task
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resolution Modal */}
      {resolvingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>Resolve Alert #{resolvingAlert.id} ({resolvingAlert.machine_id})</span>
              </h3>
              <button
                onClick={() => setResolvingAlert(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Document technician corrective actions, parts replaced, and sensor re-calibration before closing this alert ticket.
            </p>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Corrective Actions & Technician Notes *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="e.g. Inspected spindle coolant lines. Replaced clogged inline filter and flushed radiator fins. Test run verified temperature differential recovered to 10.2 K."
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  className="industrial-input text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setResolvingAlert(null)}
                  className="industrial-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="industrial-btn-primary text-xs bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSubmitting ? 'Closing Alert...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
