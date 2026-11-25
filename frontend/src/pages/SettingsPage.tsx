import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Sliders,
  Database,
  Activity,
  Save,
  CheckCircle,
  Play,
  Square,
  RotateCcw,
} from 'lucide-react';
import {
  fetchSimulatorStatus,
  startSimulationStream,
  stopSimulationStream,
} from '../api';

export const SettingsPage: React.FC = () => {
  // Threshold settings stored in localStorage
  const [normalThreshold, setNormalThreshold] = useState<number>(() => {
    return parseFloat(localStorage.getItem('machinealert_threshold_normal') || '30.0');
  });
  const [mediumThreshold, setMediumThreshold] = useState<number>(() => {
    return parseFloat(localStorage.getItem('machinealert_threshold_medium') || '60.0');
  });
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Streaming settings
  const [streamInterval, setStreamInterval] = useState<number>(3.5);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  useEffect(() => {
    fetchSimulatorStatus()
      .then((res) => {
        setIsStreaming(res.is_streaming);
        setStreamInterval(res.interval_seconds || 3.5);
      })
      .catch(() => {});
  }, []);

  const handleSaveThresholds = () => {
    localStorage.setItem('machinealert_threshold_normal', normalThreshold.toString());
    localStorage.setItem('machinealert_threshold_medium', mediumThreshold.toString());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    setNormalThreshold(30.0);
    setMediumThreshold(60.0);
    localStorage.setItem('machinealert_threshold_normal', '30.0');
    localStorage.setItem('machinealert_threshold_medium', '60.0');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const toggleStream = async () => {
    try {
      if (isStreaming) {
        await stopSimulationStream();
        setIsStreaming(false);
      } else {
        await startSimulationStream(streamInterval);
        setIsStreaming(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          System Calibration & Environment Settings
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Configure risk classification boundaries, simulator velocity, and connected infrastructure
        </p>
      </div>

      {/* Threshold Configuration Card */}
      <div className="industrial-card p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-500" />
              <span>Multi-Tier Failure Risk Thresholds</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Align operational risk classification between API inference and UI dashboards
            </p>
          </div>

          {savedSuccess && (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 animate-fade-in">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Thresholds updated</span>
            </span>
          )}
        </div>

        {/* Visual Threshold Bar */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Active Risk Spectrum Preview:
          </div>
          <div className="h-6 w-full rounded-lg overflow-hidden flex font-mono text-[10px] font-bold text-white text-center leading-6">
            <div
              className="bg-emerald-500 transition-all duration-300"
              style={{ width: `${normalThreshold}%` }}
            >
              Normal (0% - {normalThreshold}%)
            </div>
            <div
              className="bg-amber-500 transition-all duration-300"
              style={{ width: `${mediumThreshold - normalThreshold}%` }}
            >
              Medium Risk ({normalThreshold}% - {mediumThreshold}%)
            </div>
            <div
              className="bg-red-500 transition-all duration-300 flex-1"
            >
              High Risk (≥ {mediumThreshold}%)
            </div>
          </div>
        </div>

        {/* Normal Threshold Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
            <span>Normal Max Threshold (Default: 30%)</span>
            <span className="font-mono font-bold text-emerald-600">{normalThreshold}%</span>
          </div>
          <input
            type="range"
            min={15}
            max={45}
            step={1}
            value={normalThreshold}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (val < mediumThreshold - 5) setNormalThreshold(val);
            }}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </div>

        {/* Medium Threshold Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
            <span>Medium Risk Max Threshold (Default: 60%)</span>
            <span className="font-mono font-bold text-amber-600">{mediumThreshold}%</span>
          </div>
          <input
            type="range"
            min={40}
            max={80}
            step={1}
            value={mediumThreshold}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (val > normalThreshold + 5) setMediumThreshold(val);
            }}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleResetDefaults}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Standard 30% / 60%</span>
          </button>

          <button
            onClick={handleSaveThresholds}
            className="industrial-btn-primary text-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Threshold Configuration</span>
          </button>
        </div>
      </div>

      {/* Telemetry Stream Settings */}
      <div className="industrial-card p-6 space-y-4">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-500" />
            <span>Live Demonstration Simulator Velocity</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Controls cycle latency for autonomous background sensor telemetry generation
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
            <span>Cycle Stream Frequency</span>
            <span className="font-mono font-bold">{streamInterval} seconds / tick</span>
          </div>
          <input
            type="range"
            min={1.5}
            max={10.0}
            step={0.5}
            value={streamInterval}
            onChange={(e) => setStreamInterval(parseFloat(e.target.value))}
            className="w-full accent-purple-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>1.5s (High Velocity Demo)</span>
            <span>10.0s (Relaxed Cadence)</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-500">
            Current Status: {isStreaming ? 'Streaming Live' : 'Paused'}
          </span>
          <button
            onClick={toggleStream}
            className={`industrial-btn-primary text-xs ${
              isStreaming ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isStreaming ? (
              <>
                <Square className="w-3.5 h-3.5" />
                <span>Stop Stream</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Start Stream ({streamInterval}s)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Backend & Deployment Status */}
      <div className="industrial-card p-6 space-y-4">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-500" />
            <span>Connected Service Endpoints & Database</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Runtime configurations and target deployment targets
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 uppercase text-[10px]">REST API Endpoint:</span>
            <div className="text-slate-800 dark:text-slate-200 font-bold">http://127.0.0.1:8000/api/v1</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 uppercase text-[10px]">Swagger Interactive Docs:</span>
            <div className="text-blue-600 dark:text-blue-400 font-bold">http://127.0.0.1:8000/docs</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 uppercase text-[10px]">Database Connection:</span>
            <div className="text-slate-800 dark:text-slate-200 font-bold">SQLite (PostgreSQL Compatible)</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 uppercase text-[10px]">Academic Practical No.:</span>
            <div className="text-slate-800 dark:text-slate-200 font-bold">Practical No. 07 (Predictive Maintenance)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
