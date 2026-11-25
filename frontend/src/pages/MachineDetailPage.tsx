import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Cpu,
  ArrowLeft,
  RotateCw,
  Zap,
  Wrench,
  Clock,
  Thermometer,
  Gauge,
  Layers,
  TrendingUp,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  fetchMachine,
  fetchMachineReadings,
  fetchMachineTrend,
  fetchMachineCompare,
  simulateStep,
} from '../api';
import {
  Machine,
  MachineCompareResponse,
  MachineTrendResponse,
  SensorReading,
} from '../types';
import { RiskBadge } from '../components/ui/RiskBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { GaugeMeter } from '../components/ui/GaugeMeter';
import { RulBar } from '../components/ui/RulBar';

export const MachineDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [trendData, setTrendData] = useState<MachineTrendResponse | null>(null);
  const [compareData, setCompareData] = useState<MachineCompareResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [activeChartTab, setActiveChartTab] = useState<'risk' | 'thermals' | 'mechanical'>('risk');

  const loadAllMachineData = async () => {
    if (!id) return;
    try {
      const [mch, readList, trend, comp] = await Promise.all([
        fetchMachine(id),
        fetchMachineReadings(id, 25),
        fetchMachineTrend(id, 30),
        fetchMachineCompare(id),
      ]);
      setMachine(mch);
      setReadings(readList);
      setTrendData(trend);
      setCompareData(comp);
    } catch (err) {
      console.error('Failed to load machine data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllMachineData();
    const interval = setInterval(loadAllMachineData, 8000);
    return () => clearInterval(interval);
  }, [id]);

  const handleSimulateCycle = async (fault?: string) => {
    if (!id) return;
    try {
      setSimulating(true);
      await simulateStep(id, fault);
      await loadAllMachineData();
    } catch (err) {
      console.error('Simulation step error:', err);
    } finally {
      setSimulating(false);
    }
  };

  if (loading && !machine) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-2">
          <RotateCw className="w-5 h-5 animate-spin text-blue-500" />
          <span>Loading telemetry for asset {id}...</span>
        </div>
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-sm text-slate-500">Asset not found.</p>
        <button onClick={() => navigate('/machines')} className="industrial-btn-primary text-xs">
          Back to Asset Fleet
        </button>
      </div>
    );
  }

  const latestReading = readings[0];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/machines')}
            className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                {machine.id}
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {machine.name}
              </h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                Type {machine.type}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Location: {machine.location} • Commissioned: {new Date(machine.installation_date).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            onClick={() => handleSimulateCycle()}
            disabled={simulating}
            className="industrial-btn-secondary text-xs"
            title="Simulate normal operation cycle"
          >
            <Zap className={`w-3.5 h-3.5 text-blue-500 ${simulating ? 'animate-bounce' : ''}`} />
            <span>Simulate Cycle</span>
          </button>
          <button
            onClick={() => handleSimulateCycle('TWF')}
            disabled={simulating}
            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800 rounded-lg text-xs font-medium"
            title="Inject tool wear failure condition"
          >
            Test Wear Fault
          </button>
          <button
            onClick={() => navigate('/maintenance')}
            className="industrial-btn-primary text-xs"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Work Orders</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Risk & Failure Probability */}
        <div className="industrial-card p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Machine Health & Failure Risk</span>
            <RiskBadge level={machine.latest_risk_level} />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-4xl font-extrabold font-mono ${
                machine.latest_probability >= 60
                  ? 'text-red-600 dark:text-red-400'
                  : machine.latest_probability >= 30
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {machine.latest_probability.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Failure Likelihood</span>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Operational State:</span>
            <StatusBadge status={machine.status} />
          </div>
        </div>

        {/* Remaining Useful Life */}
        <div className="md:col-span-2">
          <RulBar rulMinutes={latestReading?.remaining_useful_life ?? 180} />
        </div>
      </div>

      {/* Telemetry Sensor Gauges */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Gauge className="w-4 h-4 text-blue-500" />
          <span>Real-Time Sensor Telemetry Channels</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <GaugeMeter
            label="Air Temperature"
            value={latestReading?.air_temperature ?? 298.1}
            min={290}
            max={315}
            unit="K"
            warningThreshold={305}
            criticalThreshold={310}
          />
          <GaugeMeter
            label="Process Temperature"
            value={latestReading?.process_temperature ?? 308.6}
            min={300}
            max={325}
            unit="K"
            warningThreshold={316}
            criticalThreshold={320}
          />
          <GaugeMeter
            label="Spindle Speed"
            value={latestReading?.rotational_speed ?? 1500}
            min={1100}
            max={2900}
            unit="rpm"
            warningThreshold={2500}
            criticalThreshold={2800}
          />
          <GaugeMeter
            label="Spindle Torque"
            value={latestReading?.torque ?? 40.0}
            min={10}
            max={85}
            unit="Nm"
            warningThreshold={55}
            criticalThreshold={65}
          />
          <GaugeMeter
            label="Tool Wear"
            value={latestReading?.tool_wear ?? 25}
            min={0}
            max={240}
            unit="min"
            warningThreshold={180}
            criticalThreshold={215}
          />
        </div>
      </div>

      {/* Middle Row: Trend Chart & Delta Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time-Series Charts */}
        <div className="industrial-card p-5 lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Historical Telemetry Trends
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chronological sensor drift across recent operational cycles
              </p>
            </div>

            {/* Chart Channel Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-medium">
              <button
                onClick={() => setActiveChartTab('risk')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeChartTab === 'risk'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Risk & RUL
              </button>
              <button
                onClick={() => setActiveChartTab('thermals')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeChartTab === 'thermals'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Thermals (K)
              </button>
              <button
                onClick={() => setActiveChartTab('mechanical')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeChartTab === 'mechanical'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Torque & Wear
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            {trendData && trendData.trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData.trends}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
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

                  {activeChartTab === 'risk' && (
                    <>
                      <Line
                        type="monotone"
                        dataKey="failure_probability"
                        name="Failure Risk (%)"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="remaining_useful_life"
                        name="RUL (min)"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                      />
                    </>
                  )}

                  {activeChartTab === 'thermals' && (
                    <>
                      <Line
                        type="monotone"
                        dataKey="air_temperature"
                        name="Air Temp [K]"
                        stroke="#38bdf8"
                        strokeWidth={1.8}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="process_temperature"
                        name="Process Temp [K]"
                        stroke="#f97316"
                        strokeWidth={1.8}
                        dot={false}
                      />
                    </>
                  )}

                  {activeChartTab === 'mechanical' && (
                    <>
                      <Line
                        type="monotone"
                        dataKey="torque"
                        name="Torque [Nm]"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="tool_wear"
                        name="Tool Wear [min]"
                        stroke="#eab308"
                        strokeWidth={2}
                        dot={false}
                      />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Insufficient trend records. Trigger a few cycles.
              </div>
            )}
          </div>
        </div>

        {/* Delta Comparison Card */}
        <div className="industrial-card p-5 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-teal-500" />
              <span>Step-over-Step Delta Analysis</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Sensor acceleration between latest and previous cycle
            </p>
          </div>

          {compareData?.has_data && compareData.deltas ? (
            <div className="space-y-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Failure Risk Delta</span>
                <span
                  className={`font-mono font-bold ${
                    compareData.deltas.probability_delta > 0
                      ? 'text-red-500'
                      : 'text-emerald-500'
                  }`}
                >
                  {compareData.deltas.probability_delta > 0 ? '+' : ''}
                  {compareData.deltas.probability_delta}%
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Tool Wear Delta</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  +{compareData.deltas.tool_wear_delta} min
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Torque Delta</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {compareData.deltas.torque_delta > 0 ? '+' : ''}
                  {compareData.deltas.torque_delta} Nm
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Process Temp Delta</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {compareData.deltas.process_temp_delta > 0 ? '+' : ''}
                  {compareData.deltas.process_temp_delta} K
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">RUL Remaining Shift</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {compareData.deltas.rul_delta > 0 ? '+' : ''}
                  {compareData.deltas.rul_delta} min
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 py-6 text-center">
              Requires at least 2 readings to compute rate of change.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
