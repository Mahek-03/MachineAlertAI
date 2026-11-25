import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ShieldCheck,
  Cpu,
  Clock,
  ArrowRight,
  Sliders,
  CheckCircle2,
  Wrench,
  BarChart3,
  Terminal,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-12 py-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-8 md:p-12 border border-slate-800 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Industrial AI Engine Active • Practical No. 07
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Predictive Equipment Health &{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400">
              Early Failure Warning
            </span>
          </h1>

          <p className="text-base md:text-lg text-slate-300 leading-relaxed">
            MachineAlert AI ingests real-time vibration, thermal, and torque telemetry from CNC lathes, milling centers, and heavy presses. Powered by physics-informed Gradient Boosting and SHAP explainability, it predicts equipment failures before costly breakdowns occur.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <span>Launch Live Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigate('/predict')}
              className="px-6 py-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-medium rounded-xl border border-slate-700 flex items-center gap-2 transition-all"
            >
              <Sliders className="w-4 h-4 text-teal-400" />
              <span>Interactive What-If Simulator</span>
            </button>

            <button
              onClick={() => navigate('/model-insights')}
              className="px-4 py-3 text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              View ML Architecture →
            </button>
          </div>
        </div>

        {/* Decorative Grid Backdrop */}
        <div className="absolute right-0 top-0 w-1/2 h-full opacity-10 pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]"></div>
      </section>

      {/* Core Architectural Highlights */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="industrial-card p-6 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white text-base">
            97.9% Accuracy & 90.2% Recall
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Optimized specifically for safety-critical precision-recall curves (PR-AUC 0.9094) on the UCI AI4I 2020 dataset, ensuring catastrophic tool failures are caught prior to occurrence.
          </p>
        </div>

        <div className="industrial-card p-6 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white text-base">
            Remaining Useful Life (RUL)
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Continuously calculates remaining tool endurance minutes based on cumulative wear drift and mechanical torque strain, assisting maintenance crews with scheduled tool rotations.
          </p>
        </div>

        <div className="industrial-card p-6 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Wrench className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white text-base">
            Root-Cause Failure Diagnostics
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Distinguishes between Heat Dissipation Failure (HDF), Tool Wear Failure (TWF), Power Surges (PWF), and Overstrain (OSF), outputting tailored remediation checklists.
          </p>
        </div>
      </section>

      {/* Physics-Informed Pipeline Overview */}
      <section className="industrial-card p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              End-to-End Predictive Maintenance Pipeline
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sensor Ingestion → Feature Engineering → Gradient Boosting → SHAP Explanations → Kanban Scheduling
            </p>
          </div>
          <button
            onClick={() => navigate('/machines')}
            className="industrial-btn-secondary text-xs"
          >
            Explore 10 Active Machines
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">01. INGESTION</div>
            <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">Raw Sensor Feeds</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Air & Process Temp [K], Rotational Speed [rpm], Torque [Nm], Tool Wear [min], Machine Type (L/M/H).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-xs font-mono font-semibold text-teal-600 dark:text-teal-400">02. PHYSICS FEATURES</div>
            <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">Derived Domain Metrics</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Temperature delta (ΔT), Mechanical Power (P = τ·ω), Overstrain index (τ·wear), and wear rate.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-xs font-mono font-semibold text-purple-600 dark:text-purple-400">03. INFERENCE & SHAP</div>
            <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">Ensemble & Explainability</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gradient Boosting trained on SMOTE data; SHAP TreeExplainer delivers top 3 driving risk factors in real time (&lt;300ms).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">04. CLOSED-LOOP ACTION</div>
            <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">Automated Dispatch</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generates tiered alerts (Normal &lt;30%, Medium 30-60%, High ≥60%) and auto-schedules technician work orders.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
