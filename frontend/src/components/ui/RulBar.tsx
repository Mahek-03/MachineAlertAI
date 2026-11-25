import React from 'react';
import { Clock, AlertCircle } from 'lucide-react';

interface RulBarProps {
  rulMinutes: number;
  maxRul?: number; // default 240 min
}

export const RulBar: React.FC<RulBarProps> = ({ rulMinutes, maxRul = 240 }) => {
  const percentage = Math.max(0, Math.min(100, (rulMinutes / maxRul) * 100));

  let barColor = 'bg-emerald-500';
  let badgeColor = 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800';
  let statusText = 'Healthy Service Life';

  if (rulMinutes <= 40) {
    barColor = 'bg-red-500 animate-pulse';
    badgeColor = 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800';
    statusText = 'Critical: Immediate Replacement';
  } else if (rulMinutes <= 90) {
    barColor = 'bg-amber-500';
    badgeColor = 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';
    statusText = 'Inspection Recommended';
  }

  const hoursRemaining = (rulMinutes / 60).toFixed(1);

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Remaining Useful Life (RUL)
          </span>
        </div>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${badgeColor}`}>
          {statusText}
        </span>
      </div>

      <div className="flex items-baseline gap-2 my-2">
        <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
          {rulMinutes.toFixed(1)}
        </span>
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">minutes</span>
        <span className="text-xs text-slate-400 dark:text-slate-400">
          (~{hoursRemaining} operational hours)
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400">
        <span>0 min (Failure Boundary)</span>
        <span>{maxRul} min (Fresh Tool Capacity)</span>
      </div>
    </div>
  );
};
