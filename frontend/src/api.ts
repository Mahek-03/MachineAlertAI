/**
 * API client module for MachineAlert AI.
 * Handles all REST endpoints with automatic JSON serialization and typed error handling.
 */
import {
  Alert,
  DashboardSummary,
  Machine,
  MachineCompareResponse,
  MachineTrendResponse,
  MaintenanceRecord,
  ModelInfo,
  PredictionResult,
  SensorReading,
} from './types';

// Read VITE_API_URL configured at build time (e.g. on Render: https://machinealert-api.onrender.com)
const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const API_BASE = rawApiUrl
  ? (rawApiUrl.endsWith('/api/v1') ? rawApiUrl : `${rawApiUrl}/api/v1`)
  : '/api/v1';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    try {
      const errorJson = await res.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {
      // Ignore text fallback
    }
    throw new Error(errorDetail);
  }
  if (res.status === 204) {
    return {} as T;
  }
  return res.json();
}

// Dashboard
export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await fetch(`${API_BASE}/dashboard/summary`);
  return handleResponse<DashboardSummary>(res);
}

// Model Info
export async function fetchModelInfo(): Promise<ModelInfo> {
  const res = await fetch(`${API_BASE}/model/info`);
  return handleResponse<ModelInfo>(res);
}

// Machines
export async function fetchMachines(params?: { type?: string; status?: string; risk_level?: string; search?: string }): Promise<Machine[]> {
  const query = new URLSearchParams();
  if (params?.type) query.append('type', params.type);
  if (params?.status) query.append('status', params.status);
  if (params?.risk_level) query.append('risk_level', params.risk_level);
  if (params?.search) query.append('search', params.search);

  const res = await fetch(`${API_BASE}/machines?${query.toString()}`);
  return handleResponse<Machine[]>(res);
}

export async function fetchMachine(id: string): Promise<Machine> {
  const res = await fetch(`${API_BASE}/machines/${id}`);
  return handleResponse<Machine>(res);
}

export async function createMachine(data: { id?: string; name: string; type: string; location: string }): Promise<Machine> {
  const res = await fetch(`${API_BASE}/machines`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<Machine>(res);
}

export async function updateMachine(id: string, data: Partial<Machine>): Promise<Machine> {
  const res = await fetch(`${API_BASE}/machines/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<Machine>(res);
}

export async function deleteMachine(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/machines/${id}`, { method: 'DELETE' });
  return handleResponse<void>(res);
}

export async function fetchMachineReadings(id: string, limit = 50): Promise<SensorReading[]> {
  const res = await fetch(`${API_BASE}/machines/${id}/readings?limit=${limit}`);
  return handleResponse<SensorReading[]>(res);
}

export async function fetchMachineTrend(id: string, limit = 30): Promise<MachineTrendResponse> {
  const res = await fetch(`${API_BASE}/machines/${id}/trend?limit=${limit}`);
  return handleResponse<MachineTrendResponse>(res);
}

export async function fetchMachineCompare(id: string): Promise<MachineCompareResponse> {
  const res = await fetch(`${API_BASE}/machines/${id}/compare`);
  return handleResponse<MachineCompareResponse>(res);
}

// Predictions
export async function predictTelemetry(payload: {
  machine_id?: string;
  air_temperature: number;
  process_temperature: number;
  rotational_speed: number;
  torque: number;
  tool_wear: number;
  type: string;
}): Promise<PredictionResult> {
  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<PredictionResult>(res);
}

export async function predictBatchCsv(file: File): Promise<{
  total_rows: number;
  summary: {
    normal_count: number;
    medium_risk_count: number;
    high_risk_count: number;
    failure_alert_count: number;
  };
  records: Array<{
    row_index: number;
    machine_id: string;
    failure_probability: number;
    risk_level: string;
    predicted_failure: number;
    failure_mode_hint: string | null;
    remaining_useful_life: number;
    top_factor: string;
  }>;
}> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/predict/batch`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse(res);
}

// Alerts
export async function fetchAlerts(params?: { machine_id?: string; level?: string; status?: string; limit?: number }): Promise<Alert[]> {
  const query = new URLSearchParams();
  if (params?.machine_id) query.append('machine_id', params.machine_id);
  if (params?.level) query.append('level', params.level);
  if (params?.status) query.append('status', params.status);
  if (params?.limit) query.append('limit', params.limit.toString());

  const res = await fetch(`${API_BASE}/alerts?${query.toString()}`);
  return handleResponse<Alert[]>(res);
}

export async function acknowledgeAlert(id: number, notes?: string): Promise<Alert> {
  const res = await fetch(`${API_BASE}/alerts/${id}/acknowledge`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  return handleResponse<Alert>(res);
}

export async function resolveAlert(id: number, technician_notes: string): Promise<Alert> {
  const res = await fetch(`${API_BASE}/alerts/${id}/resolve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ technician_notes }),
  });
  return handleResponse<Alert>(res);
}

// Maintenance
export async function fetchMaintenance(params?: { machine_id?: string; status?: string; priority?: string }): Promise<MaintenanceRecord[]> {
  const query = new URLSearchParams();
  if (params?.machine_id) query.append('machine_id', params.machine_id);
  if (params?.status) query.append('status', params.status);
  if (params?.priority) query.append('priority', params.priority);

  const res = await fetch(`${API_BASE}/maintenance?${query.toString()}`);
  return handleResponse<MaintenanceRecord[]>(res);
}

export async function scheduleMaintenance(data: {
  machine_id: string;
  title: string;
  description?: string;
  priority: string;
  due_date: string;
  assigned_technician?: string;
  cost_estimate?: number;
}): Promise<MaintenanceRecord> {
  const res = await fetch(`${API_BASE}/maintenance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<MaintenanceRecord>(res);
}

export async function updateMaintenance(id: number, data: {
  status?: string;
  technician_notes?: string;
  assigned_technician?: string;
  completed_at?: string;
}): Promise<MaintenanceRecord> {
  const res = await fetch(`${API_BASE}/maintenance/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<MaintenanceRecord>(res);
}

export async function deleteMaintenance(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/maintenance/${id}`, { method: 'DELETE' });
  return handleResponse<void>(res);
}

// Simulator
export async function simulateStep(machineId: string, fault?: string): Promise<SensorReading> {
  const res = await fetch(`${API_BASE}/simulate/${machineId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inject_fault: fault }),
  });
  return handleResponse<SensorReading>(res);
}

export async function startSimulationStream(interval = 3.5): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/simulate/stream/start?interval=${interval}`, { method: 'POST' });
  return handleResponse(res);
}

export async function stopSimulationStream(): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/simulate/stream/stop`, { method: 'POST' });
  return handleResponse(res);
}

export async function fetchSimulatorStatus(): Promise<{ is_streaming: boolean; interval_seconds: number }> {
  const res = await fetch(`${API_BASE}/simulate/stream/status`);
  return handleResponse(res);
}
