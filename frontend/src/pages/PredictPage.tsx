import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle,
  FileText,
  Clock,
  Wrench,
  RotateCcw,
  Sparkles,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { predictTelemetry, predictBatchCsv } from '../api';
import { PredictionResult, MachineType } from '../types';
import { RiskBadge } from '../components/ui/RiskBadge';
import { RulBar } from '../components/ui/RulBar';

const PRESETS = [
  {
    name: 'Nominal Normal',
    desc: 'Safe operating conditions',
    type: 'M' as MachineType,
    air: 298.1,
    proc: 308.6,
    speed: 1551,
    torque: 42.8,
    wear: 15,
  },
  {
    name: 'Heat Dissipation (HDF)',
    desc: 'Inadequate cooling delta (ΔT < 8.6K & speed < 1380)',
    type: 'L' as MachineType,
    air: 303.2,
    proc: 308.5,
    speed: 1310,
    torque: 48.0,
    wear: 60,
  },
  {
    name: 'Tool Wear (TWF)',
    desc: 'Endurance boundary reached (Wear > 200 min)',
    type: 'M' as MachineType,
    air: 298.5,
    proc: 308.7,
    speed: 1480,
    torque: 45.0,
    wear: 228,
  },
  {
    name: 'Power Failure (PWF)',
    desc: 'Spindle electrical power exceeds 9,000 W',
    type: 'H' as MachineType,
    air: 298.0,
    proc: 308.5,
    speed: 1650,
    torque: 68.0,
    wear: 110,
  },
  {
    name: 'Overstrain (OSF)',
    desc: 'Excessive torque-wear product (τ · wear > 11,000)',
    type: 'L' as MachineType,
    air: 299.0,
    proc: 309.5,
    speed: 1400,
    torque: 64.0,
    wear: 205,
  },
];

export const PredictPage: React.FC = () => {
  // Input parameters
  const [airTemp, setAirTemp] = useState<number>(298.1);
  const [procTemp, setProcTemp] = useState<number>(308.6);
  const [speed, setSpeed] = useState<number>(1551);
  const [torque, setTorque] = useState<number>(42.8);
  const [toolWear, setToolWear] = useState<number>(15);
  const [machineType, setMachineType] = useState<MachineType>('M');

  // Prediction Output
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Batch CSV State
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchLoading, setBatchLoading] = useState<boolean>(false);
  const [batchResult, setBatchResult] = useState<any | null>(null);

  const runPrediction = async () => {
    try {
      setLoading(true);
      const res = await predictTelemetry({
        air_temperature: airTemp,
        process_temperature: procTemp,
        rotational_speed: speed,
        torque: torque,
        tool_wear: toolWear,
        type: machineType,
      });
      setResult(res);
    } catch (err) {
      console.error('Prediction failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runPrediction();
  }, [airTemp, procTemp, speed, torque, toolWear, machineType]);

  const applyPreset = (p: typeof PRESETS[0]) => {
    setMachineType(p.type);
    setAirTemp(p.air);
    setProcTemp(p.proc);
    setSpeed(p.speed);
    setTorque(p.torque);
    setToolWear(p.wear);
  };

  const handleBatchUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchFile) return;

    try {
      setBatchLoading(true);
      const res = await predictBatchCsv(batchFile);
      setBatchResult(res);
    } catch (err: any) {
      alert(`Batch processing error: ${err.message}`);
    } finally {
      setBatchLoading(false);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent =
      'Type,Air temperature [K],Process temperature [K],Rotational speed [rpm],Torque [Nm],Tool wear [min]\n' +
      'M,298.1,308.6,1551,42.8,0\n' +
      'L,298.2,308.7,1408,46.3,3\n' +
      'L,303.2,308.5,1310,48.0,60\n' +
      'M,298.5,308.7,1480,45.0,228\n' +
      'H,298.0,308.5,1650,68.0,110\n' +
      'L,299.0,309.5,1400,64.0,205\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_machine_telemetry.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          What-If Failure Inference & Batch Scoring
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Manipulate physical parameters to evaluate safety boundaries, simulate failure conditions, and score CSV files.
        </p>
      </div>

      {/* Preset Buttons */}
      <div className="industrial-card p-4 space-y-2">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Failure Simulation Presets:
        </span>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Sliders vs Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sliders Input Panel (7 cols) */}
        <div className="industrial-card p-6 lg:col-span-7 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Telemetry Inputs
              </h3>
            </div>
            <button
              onClick={() => applyPreset(PRESETS[0])}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Machine Type Selection */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Product Variant Quality (Type)</span>
              <span className="font-mono text-blue-600 dark:text-blue-400">Type {machineType}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['L', 'M', 'H'] as MachineType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setMachineType(t)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    machineType === t
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Type {t} {t === 'L' ? '(50%)' : t === 'M' ? '(30%)' : '(20%)'}
                </button>
              ))}
            </div>
          </div>

          {/* Air Temperature Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>Air Temperature [K]</span>
              <span className="font-mono font-bold">{airTemp.toFixed(1)} K</span>
            </div>
            <input
              type="range"
              min={290}
              max={312}
              step={0.1}
              value={airTemp}
              onChange={(e) => setAirTemp(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>290.0 K (17°C)</span>
              <span>312.0 K (39°C)</span>
            </div>
          </div>

          {/* Process Temperature Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>Process Temperature [K] (ΔT = {(procTemp - airTemp).toFixed(1)} K)</span>
              <span className="font-mono font-bold">{procTemp.toFixed(1)} K</span>
            </div>
            <input
              type="range"
              min={300}
              max={322}
              step={0.1}
              value={procTemp}
              onChange={(e) => setProcTemp(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>300.0 K</span>
              <span>322.0 K</span>
            </div>
          </div>

          {/* Rotational Speed Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>Spindle Rotational Speed [rpm]</span>
              <span className="font-mono font-bold">{speed} rpm</span>
            </div>
            <input
              type="range"
              min={1150}
              max={2880}
              step={10}
              value={speed}
              onChange={(e) => setSpeed(parseInt(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>1150 rpm</span>
              <span>2880 rpm</span>
            </div>
          </div>

          {/* Torque Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>Spindle Torque [Nm]</span>
              <span className="font-mono font-bold">{torque.toFixed(1)} Nm</span>
            </div>
            <input
              type="range"
              min={5}
              max={80}
              step={0.5}
              value={torque}
              onChange={(e) => setTorque(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>5.0 Nm</span>
              <span>80.0 Nm</span>
            </div>
          </div>

          {/* Tool Wear Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>Accumulated Tool Wear [min]</span>
              <span className="font-mono font-bold">{toolWear} min</span>
            </div>
            <input
              type="range"
              min={0}
              max={250}
              step={1}
              value={toolWear}
              onChange={(e) => setToolWear(parseInt(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0 min (New tool)</span>
              <span>240 min (Endurance limit)</span>
            </div>
          </div>
        </div>

        {/* Real-Time Results Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="industrial-card p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Prediction & Diagnostics
              </h3>
              {result && <RiskBadge level={result.risk_level} />}
            </div>

            {/* Probability Large Score */}
            <div className="space-y-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Predicted Failure Probability
              </span>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-5xl font-black font-mono tracking-tight ${
                    (result?.failure_probability ?? 0) >= 60
                      ? 'text-red-600 dark:text-red-400'
                      : (result?.failure_probability ?? 0) >= 30
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {result?.failure_probability.toFixed(1) ?? '0.0'}%
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  (Threshold: 29.0%)
                </span>
              </div>
            </div>

            {/* Failure Pattern Hint */}
            {result?.failure_mode_hint && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs space-y-1">
                <div className="font-semibold text-red-700 dark:text-red-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span>Pattern: {result.failure_mode_hint}</span>
                </div>
              </div>
            )}

            {/* Remaining Useful Life */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 font-medium">
                <span>Predicted RUL</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {result?.remaining_useful_life.toFixed(1)} minutes
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    (result?.remaining_useful_life ?? 0) < 50
                      ? 'bg-red-500'
                      : (result?.remaining_useful_life ?? 0) < 100
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${Math.min(100, ((result?.remaining_useful_life ?? 0) / 240) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* SHAP Top Driving Factors ("Why this prediction?") */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Why this alert? (SHAP Feature Attributions):
              </span>
              <div className="space-y-1.5">
                {result?.top_factors.map((factor, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs flex items-start gap-2"
                  >
                    {factor.direction === 'increases_risk' ? (
                      <TrendingUp className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {factor.feature}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {factor.human_text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Actions */}
            {result?.recommended_actions && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-blue-500" />
                  <span>Recommended Maintenance Actions:</span>
                </span>
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside">
                  {result.recommended_actions.map((act, i) => (
                    <li key={i}>{act}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Batch CSV Upload Section */}
      <div className="industrial-card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-500" />
              <span>Batch CSV Telemetry Scoring</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Upload multi-asset sensor logs for bulk predictive classification and risk screening
            </p>
          </div>

          <button
            onClick={downloadSampleCsv}
            className="industrial-btn-secondary text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample CSV</span>
          </button>
        </div>

        <form onSubmit={handleBatchUpload} className="flex flex-col sm:flex-row items-center gap-4">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setBatchFile(e.target.files?.[0] || null)}
            className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-slate-800 dark:file:text-blue-300 cursor-pointer"
          />
          <button
            type="submit"
            disabled={!batchFile || batchLoading}
            className="industrial-btn-primary text-xs shrink-0 w-full sm:w-auto"
          >
            {batchLoading ? 'Processing CSV...' : 'Process Batch File'}
          </button>
        </form>

        {/* Batch Results Display */}
        {batchResult && (
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            {/* Batch KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-500">Total Scored Rows</span>
                <div className="text-xl font-bold font-mono">{batchResult.total_rows}</div>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
                <span className="text-emerald-600 dark:text-emerald-400">Normal Records</span>
                <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {batchResult.summary.normal_count}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
                <span className="text-amber-600 dark:text-amber-400">Medium Risk</span>
                <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                  {batchResult.summary.medium_risk_count}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs">
                <span className="text-red-600 dark:text-red-400">High Risk Failures</span>
                <div className="text-xl font-bold font-mono text-red-600 dark:text-red-400">
                  {batchResult.summary.high_risk_count}
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono uppercase sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Row</th>
                    <th className="py-2 px-3">Asset ID</th>
                    <th className="py-2 px-3">Failure Prob</th>
                    <th className="py-2 px-3">Risk Level</th>
                    <th className="py-2 px-3">Failure Hint</th>
                    <th className="py-2 px-3">Predicted RUL</th>
                    <th className="py-2 px-3">Primary Factor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                  {batchResult.records.map((r: any) => (
                    <tr key={r.row_index} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-mono">{r.row_index}</td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {r.machine_id}
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold">
                        {r.failure_probability.toFixed(1)}%
                      </td>
                      <td className="py-2 px-3">
                        <RiskBadge level={r.risk_level} size="sm" />
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                        {r.failure_mode_hint || '—'}
                      </td>
                      <td className="py-2 px-3 font-mono">
                        {r.remaining_useful_life.toFixed(1)} min
                      </td>
                      <td className="py-2 px-3 text-[11px] text-slate-500 dark:text-slate-400">
                        {r.top_factor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
