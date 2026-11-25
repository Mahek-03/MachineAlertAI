import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Cpu,
  Sliders,
  AlertTriangle,
  Wrench,
  LineChart,
  BrainCircuit,
  Settings as SettingsIcon,
  Activity,
  Layers,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/machines', label: 'Asset Fleet', icon: Cpu },
  { to: '/predict', label: 'Predict & What-If', icon: Sliders },
  { to: '/alerts', label: 'Active Alerts', icon: AlertTriangle, badgeKey: 'alerts' },
  { to: '/maintenance', label: 'Maintenance Kanban', icon: Wrench },
  { to: '/analytics', label: 'Fleet Analytics', icon: LineChart },
  { to: '/model-insights', label: 'Model Insights', icon: BrainCircuit },
  { to: '/settings', label: 'System Settings', icon: SettingsIcon },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col border-r border-slate-800/80 select-none z-20">
      {/* Brand Header */}
      <Link
        to="/"
        aria-label="Go to home page"
        className="h-16 px-5 flex items-center gap-3 border-b border-slate-800/80 bg-slate-950/50 hover:bg-slate-900/80 transition-colors cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
          <Activity className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white tracking-tight text-base group-hover:text-blue-300 transition-colors">MachineAlert</span>
            <span className="px-1.5 py-0.2 bg-teal-500/20 text-teal-400 font-mono text-[10px] font-semibold rounded border border-teal-500/30">
              AI
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Predictive Maintenance</span>
        </div>
      </Link>

      {/* Navigation */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Operations
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
                }`
              }
            >
              <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Footer System Status */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/70">
        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span>ML Core Engine</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Online
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Model: GradientBoost</span>
            <span className="font-mono text-slate-400">v1.0</span>
          </div>
          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 text-center">
            College Project – Practical No. 07
          </div>
        </div>
      </div>
    </aside>
  );
};
