import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Bell,
  Sun,
  Moon,
  Play,
  Square,
  AlertTriangle,
  RotateCw,
  Zap,
  Activity,
} from 'lucide-react';
import {
  fetchAlerts,
  fetchSimulatorStatus,
  startSimulationStream,
  stopSimulationStream,
  simulateStep,
} from '../../api';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Fleet Operational Dashboard', subtitle: 'Real-time telemetry, risk status, and priority actions' },
  '/machines': { title: 'Industrial Asset Fleet', subtitle: 'Monitored CNC machines, lathes, and stamping presses' },
  '/predict': { title: 'Inference & What-If Simulation', subtitle: 'Physics-informed machine failure prediction and batch CSV scoring' },
  '/alerts': { title: 'Incident Response & Alerts', subtitle: 'Automated early failure warnings and technician resolution feed' },
  '/maintenance': { title: 'Maintenance Kanban Board', subtitle: 'Work order dispatch, inspection schedules, and progress tracking' },
  '/analytics': { title: 'Fleet Analytics & Comparisons', subtitle: 'Multi-machine trends, parameter correlation, and failure modes' },
  '/model-insights': { title: 'ML Performance & Explainability', subtitle: 'Precision-Recall curves, SHAP attributions, and academic practical notes' },
  '/settings': { title: 'System Configuration', subtitle: 'Threshold calibration, simulator velocity, and API management' },
};

export const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('dark') ||
      (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches) || false;
  });
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [openAlertsCount, setOpenAlertsCount] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    // Check initial simulator status and alerts
    fetchSimulatorStatus()
      .then((res) => setIsStreaming(res.is_streaming))
      .catch(() => {});

    fetchAlerts({ status: 'Open' })
      .then((alerts) => setOpenAlertsCount(alerts.length))
      .catch(() => {});

    const interval = setInterval(() => {
      fetchAlerts({ status: 'Open' })
        .then((alerts) => setOpenAlertsCount(alerts.length))
        .catch(() => {});
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const toggleStreaming = async () => {
    try {
      if (isStreaming) {
        await stopSimulationStream();
        setIsStreaming(false);
      } else {
        await startSimulationStream(3.5);
        setIsStreaming(true);
      }
    } catch (err) {
      console.error('Failed to toggle stream:', err);
    }
  };

  const handleQuickFaultInjection = async () => {
    try {
      setIsSimulating(true);
      // Trigger a random fault on MCH-0002 or MCH-0004
      await simulateStep('MCH-0002', 'RANDOM');
      const alerts = await fetchAlerts({ status: 'Open' });
      setOpenAlertsCount(alerts.length);
      setIsSimulating(false);
      navigate('/alerts');
    } catch (err) {
      setIsSimulating(false);
      console.error('Quick fault injection failed:', err);
    }
  };

  const currentPath = location.pathname;
  const pageMeta = PAGE_TITLES[currentPath] || {
    title: 'MachineAlert AI',
    subtitle: 'Industrial Predictive Maintenance',
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-10 transition-colors">
      {/* Title & Subtitle */}
      <div className="flex items-center gap-3">
        {/* Mobile brand link: visible on small screens when sidebar is hidden/collapsed */}
        <Link
          to="/"
          aria-label="Go to home page"
          className="md:hidden flex items-center gap-2 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-teal-500 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <Activity className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-800 dark:text-white tracking-tight text-sm group-hover:text-blue-500 transition-colors">
            MachineAlert
          </span>
        </Link>

        {pageMeta.title === 'MachineAlert AI' ? (
          <Link
            to="/"
            aria-label="Go to home page"
            className="group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            <h1 className="text-base font-semibold text-slate-800 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {pageMeta.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {pageMeta.subtitle}
            </p>
          </Link>
        ) : (
          <div>
            <h1 className="text-base font-semibold text-slate-800 dark:text-white tracking-tight">
              {pageMeta.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {pageMeta.subtitle}
            </p>
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-3">
        {/* Quick Demo Fault Injection */}
        <button
          onClick={handleQuickFaultInjection}
          disabled={isSimulating}
          title="Inject realistic sensor fault into MCH-0002 for demo presentation"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors shadow-sm"
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>{isSimulating ? 'Injecting...' : 'Inject Demo Fault'}</span>
        </button>

        {/* Live Simulation Stream Toggle */}
        <button
          onClick={toggleStreaming}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shadow-sm ${
            isStreaming
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
          title={isStreaming ? 'Pause background sensor stream' : 'Start live background sensor telemetry generation'}
        >
          {isStreaming ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Streaming Live</span>
              <Square className="w-3 h-3 ml-0.5 fill-current opacity-70" />
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-current text-blue-500" />
              <span>Simulate Telemetry</span>
            </>
          )}
        </button>

        <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1"></div>

        {/* Alerts Badge */}
        <button
          onClick={() => navigate('/alerts')}
          className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Open Alerts Feed"
        >
          <Bell className="w-4 h-4" />
          {openAlertsCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {openAlertsCount}
            </span>
          )}
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>
    </header>
  );
};
