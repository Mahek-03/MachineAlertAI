import React from 'react';
import { RiskLevel } from '../../types';

interface RiskBadgeProps {
  level: RiskLevel | string;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, size = 'md' }) => {
  const normLevel = level.toLowerCase();

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300';
  let dotColor = 'bg-slate-400';
  let text = level;

  if (normLevel.includes('normal')) {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800';
    dotColor = 'bg-emerald-500';
    text = 'Normal';
  } else if (normLevel.includes('medium')) {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800';
    dotColor = 'bg-amber-500';
    text = 'Medium Risk';
  } else if (normLevel.includes('high') || normLevel.includes('critical')) {
    colorClasses = 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800';
    dotColor = 'bg-red-500 animate-pulse';
    text = 'High Risk';
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  }[size];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium border shadow-xs ${colorClasses} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
      <span>{text}</span>
    </span>
  );
};
