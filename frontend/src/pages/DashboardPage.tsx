import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  Cpu,
  AlertTriangle,
  Wrench,
  CheckCircle,
  Activity,
  ArrowRight,
  TrendingUp,
  RotateCw,
  Zap,
} from 'lucide-react';
import {
  fetchDashboardSummary,
  fetchMachines,
  fetchAlerts,
  acknowledgeAlert,
  simulateStep,
} from '../api';
import { Alert, DashboardSummary, Machine } from '../types';
import { RiskBadge } from '../components/ui/RiskBadge';
import { StatusBadge } from '../components/ui/StatusBadge';

const RISK_COLORS = {
  Normal: '#10b981',      // Emerald
  'Medium Risk': '#f59e0b', // Amber
  'High Risk': '#ef4444',    // Red
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [sumData, mchData, alertData] = await Promise.all([
        fetchDashboardSummary(),
        fetchMachines(),
        fetchAlerts({ status: 'Open', limit: 5 }),
      ]);
      setSummary(sumData);
      setMachines(mchData);
      setAlerts(alertData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Polling update every 10s
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = async (alertId: number) => {
    try {
      await acknowledgeAlert(alertId, 'Acknowledged via dashboard priority feed.');
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      loadData();
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const handleSimulateRandom = async () => {
    if (!machines.length) return;
    const target = machines[Math.floor(Math.random() * machines.length)];
    try {
      await simulateStep(target.id, 'RANDOM');
      loadData();
    } catch (err) {
      console.error('Simulate step failed:', err);
    }
  };

  if (loading && !summary) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <RotateCw className="w-5 h-5 animate-spin text-blue-500" />
          <span>Loading telemetry dashboard...</span>
        </div>
      </div>
    );
  }

  // Risk Distribution Chart Data
  const pieData = [
    { name: 'Normal', value: summary?.normal_machines || 0, color: RISK_COLORS.Normal },
    { name: 'Medium Risk', value: summary?.medium_risk_machines || 0, color: RISK_COLORS['Medium Risk'] },
    { name: 'High Risk', value: summary?.high_risk_machines || 0, color: RISK_COLORS['High Risk'] },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Factory Floor Telemetry & Health
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Live equipment monitoring across Bays A through E
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulateRandom}
            className="industrial-btn-secondary text-xs"
            title="Inject a single reading cycle into a random machine"
          >
            <Zap className="w-3.5 h-3.5 text-blue-500" />
            <span>Simulate Telemetry Cycle</span>
          </button>
          <button
            onClick={loadData}
            disabled={refreshing}
            className="industrial-btn-secondary text-xs"
            title="Refresh dashboard"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Machines */}
        <div className="industrial-card p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Total Assets</span>
            <Cpu className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {summary?.total_machines ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Connected & Monitored</div>
        </div>

        {/* Normal Machines */}
        <div className="industrial-card p-4 space-y-1">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs">
            <span>Normal Status</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {summary?.normal_machines ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">&lt; 30% Failure Risk</div>
        </div>

        {/* Medium Risk */}
        <div className="industrial-card p-4 space-y-1">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs">
            <span>Medium Risk</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {summary?.medium_risk_machines ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">30% – 60% Risk Band</div>
        </div>

        {/* High Risk */}
        <div className="industrial-card p-4 space-y-1">
          <div className="flex items-center justify-between text-red-600 dark:text-red-400 text-xs">
            <span>Critical / High</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-600 dark:text-red-400">
            {summary?.high_risk_machines ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">≥ 60% Failure Risk</div>
        </div>

        {/* Open Alerts */}
        <div className="industrial-card p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Open Alerts</span>
            <Activity className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
            {summary?.open_alerts_count ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Requires Inspection</div>
        </div>

        {/* Avg Risk Probability */}
        <div className="industrial-card p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Fleet Avg Risk</span>
            <TrendingUp className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {summary?.average_failure_probability.toFixed(1) ?? '0.0'}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Baseline Safe &lt; 15%</div>
        </div>
      </div>

      {/* Middle Row: Risk Distribution & Priority Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Donut Chart */}
        <div className="industrial-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Fleet Risk Distribution
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">10 Units</span>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-slate-400">No telemetry data recorded</span>
            )}
          </div>

          <div className="flex justify-around text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600 dark:text-slate-300">Normal ({summary?.normal_machines})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="text-slate-600 dark:text-slate-300">Medium ({summary?.medium_risk_machines})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span className="text-slate-600 dark:text-slate-300">High ({summary?.high_risk_machines})</span>
            </div>
          </div>
        </div>

        {/* Priority Alerts Feed */}
        <div className="industrial-card p-5 lg:col-span-2 space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Active Priority Alerts ({alerts.length})
              </h3>
            </div>
            <button
              onClick={() => navigate('/alerts')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
            >
              <span>View All Alerts</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-xs">
                <CheckCircle className="w-8 h-8 text-emerald-500/50 mb-2" />
                <span>No open failure alerts. Fleet operating within nominal bounds.</span>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {alert.machine_id}
                      </span>
                      <RiskBadge level={alert.level} size="sm" />
                      {alert.failure_mode && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {alert.failure_mode}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-tight">
                      {alert.message}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded"
                    >
                      Acknowledge
                    </button>
                    <button
                      onClick={() => navigate(`/machines/${alert.machine_id}`)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-200/70 dark:bg-slate-700 rounded hover:bg-slate-300 dark:hover:bg-slate-600"
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Table: Asset Fleet Overview */}
      <div className="industrial-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Industrial Asset Fleet Telemetry Status
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live status, latest failure probability, and operational health
            </p>
          </div>
          <button
            onClick={() => navigate('/machines')}
            className="industrial-btn-secondary text-xs"
          >
            <span>Manage All Assets</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-mono tracking-wider">
              <tr>
                <th className="py-2.5 px-3 rounded-l-lg">Asset ID</th>
                <th className="py-2.5 px-3">Machine Name</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Failure Risk</th>
                <th className="py-2.5 px-3">Risk Level</th>
                <th className="py-2.5 px-3 text-right rounded-r-lg">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {machines.map((m) => (
                <tr
                  key={m.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                    {m.id}
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">
                    {m.name}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      Type {m.type}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                    {m.location}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold">
                    <span
                      className={
                        m.latest_probability >= 60
                          ? 'text-red-600 dark:text-red-400'
                          : m.latest_probability >= 30
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }
                    >
                      {m.latest_probability.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <RiskBadge level={m.latest_risk_level} size="sm" />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => navigate(`/machines/${m.id}`)}
                      className="px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors"
                    >
                      Details →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
