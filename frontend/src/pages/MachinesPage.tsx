import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu,
  Search,
  Filter,
  Plus,
  RotateCw,
  ExternalLink,
  Sliders,
  CheckCircle,
  AlertTriangle,
  X,
} from 'lucide-react';
import { fetchMachines, createMachine } from '../api';
import { Machine, MachineType, RiskLevel } from '../types';
import { RiskBadge } from '../components/ui/RiskBadge';
import { StatusBadge } from '../components/ui/StatusBadge';

export const MachinesPage: React.FC = () => {
  const navigate = useNavigate();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // New machine form state
  const [newId, setNewId] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newType, setNewType] = useState<MachineType>('M');
  const [newLocation, setNewLocation] = useState<string>('');
  const [createError, setCreateError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadMachines = async () => {
    try {
      setLoading(true);
      const data = await fetchMachines({
        search: search || undefined,
        type: typeFilter || undefined,
        risk_level: riskFilter || undefined,
      });
      setMachines(data);
    } catch (err) {
      console.error('Failed to load machines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMachines();
  }, [typeFilter, riskFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadMachines();
  };

  const handleCreateMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (!newName || !newLocation) {
      setCreateError('Machine name and location are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await createMachine({
        id: newId.trim() || undefined,
        name: newName.trim(),
        type: newType,
        location: newLocation.trim(),
      });
      setShowCreateModal(false);
      setNewId('');
      setNewName('');
      setNewLocation('');
      loadMachines();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to register machine asset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Asset Inventory & Machine Registry
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Registered industrial assets, variant specifications, and maintenance readiness
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="industrial-btn-primary text-xs self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Asset</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="industrial-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search asset ID (e.g. MCH-0001), name, or bay location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="industrial-input pl-9 text-xs"
            />
          </form>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-slate-500 font-medium">Type:</span>
            {['', 'L', 'M', 'H'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 text-xs rounded font-mono transition-colors ${
                  typeFilter === t
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {t ? `Type ${t}` : 'All'}
              </button>
            ))}
          </div>

          {/* Risk Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-slate-500 font-medium">Risk:</span>
            {['', 'Normal', 'Medium Risk', 'High Risk'].map((r) => (
              <button
                key={r}
                onClick={() => setRiskFilter(r)}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  riskFilter === r
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {r || 'All'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Machines Table */}
      <div className="industrial-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-mono tracking-wider">
              <tr>
                <th className="py-3 px-4">Asset ID</th>
                <th className="py-3 px-4">Machine Name</th>
                <th className="py-3 px-4">Variant Type</th>
                <th className="py-3 px-4">Installation Area</th>
                <th className="py-3 px-4">Operating Status</th>
                <th className="py-3 px-4">Latest Failure Prob</th>
                <th className="py-3 px-4">Risk Tier</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RotateCw className="w-4 h-4 animate-spin text-blue-500" />
                      <span>Loading asset registry...</span>
                    </div>
                  </td>
                </tr>
              ) : machines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No matching machines found.
                  </td>
                </tr>
              ) : (
                machines.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {m.id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {m.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        Type {m.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {m.location}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      <span
                        className={
                          m.latest_probability >= 60
                            ? 'text-red-600 dark:text-red-400'
                            : m.latest_probability >= 30
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }
                      >
                        {m.latest_probability.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <RiskBadge level={m.latest_risk_level} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate(`/machines/${m.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded font-medium transition-colors"
                      >
                        <span>Telemetry</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Register New Asset */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Register New Industrial Asset
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateMachine} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Asset ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Leave empty for auto-generated (e.g. MCH-0011)"
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  className="industrial-input text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Machine Asset Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CNC Horizontal Machining Center Delta"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="industrial-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product Variant Quality (Type) *
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as MachineType)}
                  className="industrial-input text-xs"
                >
                  <option value="L">Type L (Low Variant: 50% of products, standard tolerances)</option>
                  <option value="M">Type M (Medium Variant: 30% of products, reinforced)</option>
                  <option value="H">Type H (High Variant: 20% of products, aerospace grade)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Factory Location / Bay *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bay A - Heavy Turning Line"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="industrial-input text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="industrial-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="industrial-btn-primary text-xs"
                >
                  {isSubmitting ? 'Registering...' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
