import React from 'react';
import { MachineStatus } from '../../types';

interface StatusBadgeProps {
  status: MachineStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const norm = status.toLowerCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300';
  let dot = 'bg-slate-400';

  if (norm.includes('operational')) {
    styles = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
    dot = 'bg-blue-500';
  } else if (norm.includes('maintenance')) {
    styles = 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
    dot = 'bg-rose-500 animate-pulse';
  } else if (norm.includes('degraded')) {
    styles = 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    dot = 'bg-amber-500';
  } else if (norm.includes('offline')) {
    styles = 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700';
    dot = 'bg-slate-400';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${styles}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`}></span>
      <span>{status}</span>
    </span>
  );
};
