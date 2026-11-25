import React from 'react';

interface GaugeMeterProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  warningThreshold?: number;
  criticalThreshold?: number;
  reverseRisk?: boolean; // if true, lower values are riskier (e.g. RUL)
}

export const GaugeMeter: React.FC<GaugeMeterProps> = ({
  label,
  value,
  min,
  max,
  unit,
  warningThreshold,
  criticalThreshold,
  reverseRisk = false,
}) => {
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  let color = 'bg-blue-600 dark:bg-blue-500';
  let statusText = 'Nominal';
  let statusColor = 'text-slate-500 dark:text-slate-400';

  if (!reverseRisk) {
    if (criticalThreshold !== undefined && value >= criticalThreshold) {
      color = 'bg-red-500';
      statusText = 'Critical';
      statusColor = 'text-red-500 font-semibold';
    } else if (warningThreshold !== undefined && value >= warningThreshold) {
      color = 'bg-amber-500';
      statusText = 'Warning';
      statusColor = 'text-amber-500 font-semibold';
    }
  } else {
    if (criticalThreshold !== undefined && value <= criticalThreshold) {
      color = 'bg-red-500';
      statusText = 'Critical';
      statusColor = 'text-red-500 font-semibold';
    } else if (warningThreshold !== undefined && value <= warningThreshold) {
      color = 'bg-amber-500';
      statusText = 'Warning';
      statusColor = 'text-amber-500 font-semibold';
    }
  }

  return (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-medium text-slate-600 dark:text-slate-400">{label}</span>
        <span className={`text-[11px] ${statusColor}`}>{statusText}</span>
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
          {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}
        </span>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{unit}</span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-400 mt-1">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
};
