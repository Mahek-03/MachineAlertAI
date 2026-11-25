import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  LineChart as LineChartIcon,
  BarChart3,
  TrendingUp,
  Cpu,
  Layers,
  Activity,
  RotateCw,
} from 'lucide-react';
import { fetchMachines, fetchMachineTrend } from '../api';
import { Machine, TrendPoint } from '../types';

export const AnalyticsPage: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchMachines()
      .then((mList) => {
        setMachines(mList);
        if (mList.length > 0) {
          setSelectedMachineId(mList[0].id);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedMachineId) return;
    fetchMachineTrend(selectedMachineId, 30)
      .then((res) => setTrendData(res.trends))
      .catch((err) => console.error(err));
  }, [selectedMachineId]);

  // Failure Mode Breakdown (AI4I dataset physics distribution)
  const failureModeData = [
    { mode: 'Heat Dissipation (HDF)', count: 115, share: '33.9%', description: 'Cooling delta ΔT < 8.6 K & speed < 1380 rpm' },
    { mode: 'Power Failure (PWF)', count: 95, share: '28.0%', description: 'Spindle power P < 3.5 kW or P > 9.0 kW' },
    { mode: 'Overstrain (OSF)', count: 98, share: '28.9%', description: 'Product of torque and tool wear exceeds limit' },
    { mode: 'Tool Wear (TWF)', count: 45, share: '13.3%', description: 'Tool wear failure boundary (200 - 240 min)' },
    { mode: 'Random Failure (RNF)', count: 5, share: '1.5%', description: 'Stochastic non-deterministic event (0.1%)' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Fleet Telemetry Analytics & Failure Mode Distribution
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Comparative multi-asset telemetry, wear progression correlation, and failure pattern statistics
        </p>
      </div>

      {/* Top Selector Card */}
      <div className="industrial-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Selected Primary Asset:
          </span>
          <select
            value={selectedMachineId}
            onChange={(e) => setSelectedMachineId(e.target.value)}
            className="industrial-input text-xs font-mono py-1 max-w-xs"
          >
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id} – {m.name} ({m.latest_risk_level})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Active Trend Points: {trendData.length}</span>
        </div>
      </div>

      {/* Multi-Channel Trend Overlays */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Failure Probability vs Tool Wear */}
        <div className="industrial-card p-5 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-red-500" />
              <span>Failure Risk Probability vs. Tool Wear Drift</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evaluates how cumulative tool wear accelerates model failure probability
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="failure_probability"
                  name="Failure Risk (%)"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="tool_wear"
                  name="Tool Wear (min)"
                  stroke="#eab308"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Thermal Differential Analysis */}
        <div className="industrial-card p-5 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <span>Thermal Differential (Process Temp vs. Air Temp)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cooling delta below 8.6 K triggers Heat Dissipation Failure (HDF) risks
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line
                  type="monotone"
                  dataKey="process_temperature"
                  name="Process Temp [K]"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="air_temperature"
                  name="Air Temp [K]"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Failure Modes Frequency Breakdown */}
      <div className="industrial-card p-6 space-y-5">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-500" />
            <span>Dataset Failure Mode Taxonomy & Physics Definitions (AI4I 2020)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Statistical breakdown of the 339 documented failure incidents across the 10,000 industrial operating cycles
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Bar Chart */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={failureModeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="mode" type="category" width={150} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="count" name="Failure Incidents" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Definitions Table */}
          <div className="space-y-2 text-xs">
            {failureModeData.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">{item.mode}</span>
                  <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">
                    {item.count} occurrences ({item.share})
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  Formula: {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
