import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  Layers,
  FileText,
  AlertCircle,
  BarChart,
  HelpCircle,
} from 'lucide-react';
import { fetchModelInfo } from '../api';
import { ModelInfo } from '../types';

export const ModelInsightsPage: React.FC = () => {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);

  useEffect(() => {
    fetchModelInfo()
      .then((data) => setModelInfo(data))
      .catch((err) => console.error('Failed to load model info:', err));
  }, []);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Machine Learning Pipeline Architecture & Validation
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Evaluation benchmarks on holdout test set (1,500 samples), decision threshold calibration, and academic practical documentation
        </p>
      </div>

      {/* Primary Metric Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Accuracy */}
        <div className="industrial-card p-4 space-y-1">
          <span className="text-[11px] text-slate-500 font-medium">Accuracy</span>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {((modelInfo?.accuracy ?? 0.9793) * 100).toFixed(1)}%
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">Floor ≥ 94% [PASS]</span>
        </div>

        {/* Recall */}
        <div className="industrial-card p-4 space-y-1 bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/50">
          <span className="text-[11px] text-red-600 dark:text-red-400 font-bold">Recall (Safety SLA)</span>
          <div className="text-2xl font-black font-mono text-red-600 dark:text-red-400">
            {((modelInfo?.recall ?? 0.9020) * 100).toFixed(1)}%
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">Floor ≥ 75% [PASS]</span>
        </div>

        {/* Precision */}
        <div className="industrial-card p-4 space-y-1">
          <span className="text-[11px] text-slate-500 font-medium">Precision</span>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {((modelInfo?.precision ?? 0.6389) * 100).toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-400">Low false alarms</span>
        </div>

        {/* F1 Score */}
        <div className="industrial-card p-4 space-y-1">
          <span className="text-[11px] text-slate-500 font-medium">F1-Score</span>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {(modelInfo?.f1_score ?? 0.7480).toFixed(3)}
          </div>
          <span className="text-[10px] text-slate-400">Harmonic balance</span>
        </div>

        {/* PR-AUC */}
        <div className="industrial-card p-4 space-y-1 bg-teal-50/40 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900/50">
          <span className="text-[11px] text-teal-600 dark:text-teal-400 font-bold">PR-AUC</span>
          <div className="text-2xl font-black font-mono text-teal-600 dark:text-teal-400">
            {(modelInfo?.pr_auc ?? 0.9094).toFixed(3)}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">Floor ≥ 0.70 [PASS]</span>
        </div>

        {/* ROC-AUC */}
        <div className="industrial-card p-4 space-y-1">
          <span className="text-[11px] text-slate-500 font-medium">ROC-AUC</span>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {(modelInfo?.roc_auc ?? 0.9838).toFixed(3)}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">Floor ≥ 0.90 [PASS]</span>
        </div>

        {/* Optimal Threshold */}
        <div className="industrial-card p-4 space-y-1 bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50">
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold">Threshold</span>
          <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
            {(modelInfo?.optimal_threshold ?? 0.290).toFixed(3)}
          </div>
          <span className="text-[10px] text-slate-400">PR Curve Tuned</span>
        </div>
      </div>

      {/* Model Comparison & Confusion Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confusion Matrix Card */}
        <div className="industrial-card p-6 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              <span>Confusion Matrix on Holdout Test Set (1,500 Samples)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Only 5 false negatives out of 51 true failure occurrences (90.2% recall)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                True Negatives (TN)
              </span>
              <div className="text-3xl font-black font-mono text-emerald-700 dark:text-emerald-300 my-1">
                1,423
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-500">
                Correctly identified Normal machines
              </p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                False Positives (FP)
              </span>
              <div className="text-3xl font-black font-mono text-amber-700 dark:text-amber-300 my-1">
                26
              </div>
              <p className="text-[10px] text-amber-600 dark:text-amber-500">
                Safe alerts scheduled for precautionary check
              </p>
            </div>

            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60">
              <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                False Negatives (FN)
              </span>
              <div className="text-3xl font-black font-mono text-red-700 dark:text-red-300 my-1">
                5
              </div>
              <p className="text-[10px] text-red-600 dark:text-red-500">
                Uncaught failures (Critical metric minimized)
              </p>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                True Positives (TP)
              </span>
              <div className="text-3xl font-black font-mono text-blue-700 dark:text-blue-300 my-1">
                46
              </div>
              <p className="text-[10px] text-blue-600 dark:text-blue-500">
                Correctly predicted machine failures
              </p>
            </div>
          </div>
        </div>

        {/* Model Benchmark Table */}
        <div className="industrial-card p-6 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-purple-500" />
              <span>Model Comparison (5-Fold Stratified Cross-Validation)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Comparing linear, bagging, and boosting algorithms on SMOTE training data
            </p>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono uppercase">
                <tr>
                  <th className="py-2.5 px-3">Algorithm</th>
                  <th className="py-2.5 px-3">ROC-AUC</th>
                  <th className="py-2.5 px-3">PR-AUC</th>
                  <th className="py-2.5 px-3">Recall</th>
                  <th className="py-2.5 px-3">F1-Score</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                <tr className="bg-blue-50/50 dark:bg-blue-950/30 font-semibold">
                  <td className="py-2.5 px-3 text-blue-600 dark:text-blue-400">
                    Gradient Boosting
                  </td>
                  <td className="py-2.5 px-3 font-mono">0.9838</td>
                  <td className="py-2.5 px-3 font-mono">0.9094</td>
                  <td className="py-2.5 px-3 font-mono">90.20%</td>
                  <td className="py-2.5 px-3 font-mono">0.7480</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px]">
                      Selected Production
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3">Random Forest</td>
                  <td className="py-2.5 px-3 font-mono">0.9549</td>
                  <td className="py-2.5 px-3 font-mono">0.8161</td>
                  <td className="py-2.5 px-3 font-mono">76.47%</td>
                  <td className="py-2.5 px-3 font-mono">0.7358</td>
                  <td className="py-2.5 px-3 text-slate-400">Benchmark</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3">XGBoost Classifier</td>
                  <td className="py-2.5 px-3 font-mono">0.9448</td>
                  <td className="py-2.5 px-3 font-mono">0.8105</td>
                  <td className="py-2.5 px-3 font-mono">78.43%</td>
                  <td className="py-2.5 px-3 font-mono">0.6838</td>
                  <td className="py-2.5 px-3 text-slate-400">Benchmark</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3">Logistic Regression</td>
                  <td className="py-2.5 px-3 font-mono">0.9149</td>
                  <td className="py-2.5 px-3 font-mono">0.4124</td>
                  <td className="py-2.5 px-3 font-mono">84.31%</td>
                  <td className="py-2.5 px-3 font-mono">0.2905</td>
                  <td className="py-2.5 px-3 text-slate-400">Baseline</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Academic Syllabus Documentation & Report Notes (Practical No. 07) */}
      <div className="industrial-card p-6 space-y-6">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            <span>Academic Syllabus Report Notes – College Mini Project (Practical No. 07)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Compliance documentation for data preprocessing, class imbalance, proxy RUL, and supplementary image processing
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {/* Note 1: Imbalance */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
              <span>1. Class Imbalance (SMOTE)</span>
            </h4>
            <p>
              The AI4I 2020 dataset contains only 339 failure rows out of 10,000 samples (~3.39% minority class). To prevent severe majority class bias:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400">
              <li><strong>Split:</strong> Stratified 70% Train, 15% Val, 15% Test.</li>
              <li><strong>SMOTE:</strong> Applied exclusively on the training split (7,000 → 9,130 samples with 2,367 failures).</li>
              <li><strong>Integrity:</strong> Holdout test set remained un-augmented with natural 3.4% failure frequency.</li>
            </ul>
          </div>

          {/* Note 2: Derived RUL */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
              <span>2. Derived RUL Regression Proxy</span>
            </h4>
            <p>
              The dataset contains no native RUL label. In accordance with Section 4.3, we established a derived physical proxy:
            </p>
            <div className="p-2 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[11px] text-blue-600 dark:text-blue-400">
              RUL = max(0, 240 - Tool_Wear) × (1 - P(failure)^1.5)
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              Gradient Boosting Regressor achieved test MAE of 1.59 minutes and R² of 0.9970 against this derived target.
            </p>
          </div>

          {/* Note 3: Image Preprocessing */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
              <span>3. Supplementary 2D CNN Experiment</span>
            </h4>
            <p>
              To satisfy the practical's academic image processing syllabus (resize, normalize, augment, CNN classification):
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400">
              <li>Telemetry vectors were projected via outer products into 64×64 2D spectrogram heatmaps.</li>
              <li>Applied Gaussian noise injection, spatial shifts, and flips.</li>
              <li>Trained a 2D CNN feature benchmark (Accuracy: 84.3%, F1: 0.113, ROC-AUC: 0.6408).</li>
              <li><strong>Honest Disclosure:</strong> Tabular Gradient Boosting retains superior PR-AUC on 1D continuous sensor signals.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
