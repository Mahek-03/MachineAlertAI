export type MachineType = 'L' | 'M' | 'H';
export type RiskLevel = 'Normal' | 'Medium Risk' | 'High Risk';
export type MachineStatus = 'Operational' | 'Maintenance Required' | 'Offline' | 'Degraded';
export type AlertStatus = 'Open' | 'Acknowledged' | 'Resolved';
export type MaintenancePriority = 'Routine' | 'Medium' | 'High' | 'Critical';
export type MaintenanceStatus = 'Pending' | 'In Progress' | 'Completed';

export interface Machine {
  id: string;
  name: string;
  type: MachineType;
  location: string;
  installation_date: string;
  status: MachineStatus;
  latest_risk_level: RiskLevel;
  latest_probability: number;
  created_at: string;
  updated_at: string;
}

export interface SensorReading {
  id: number;
  machine_id: string;
  air_temperature: number;
  process_temperature: number;
  rotational_speed: number;
  torque: number;
  tool_wear: number;
  type: MachineType;
  failure_probability: number;
  predicted_failure: number;
  risk_level: RiskLevel;
  predicted_mode: string | null;
  remaining_useful_life: number;
  timestamp: string;
}

export interface TopFactor {
  feature: string;
  importance: number;
  direction: 'increases_risk' | 'decreases_risk';
  human_text: string;
}

export interface PredictionResult {
  machine_id?: string;
  reading_id?: number;
  failure_probability: number;
  risk_level: RiskLevel;
  predicted_failure: number;
  failure_mode_hint: string | null;
  remaining_useful_life: number;
  top_factors: TopFactor[];
  recommended_actions: string[];
  timestamp: string;
}

export interface Alert {
  id: number;
  machine_id: string;
  level: RiskLevel;
  message: string;
  failure_mode: string | null;
  probability: number;
  top_factors: TopFactor[];
  recommended_actions: string[];
  status: AlertStatus;
  created_at: string;
  resolved_at: string | null;
  technician_notes: string | null;
}

export interface MaintenanceRecord {
  id: number;
  machine_id: string;
  title: string;
  description: string | null;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  due_date: string;
  completed_at: string | null;
  assigned_technician: string | null;
  technician_notes: string | null;
  cost_estimate: number | null;
  created_at: string;
}

export interface DashboardSummary {
  total_machines: number;
  normal_machines: number;
  medium_risk_machines: number;
  high_risk_machines: number;
  open_alerts_count: number;
  pending_maintenance_count: number;
  average_failure_probability: number;
  machines_needing_inspection: number;
}

export interface ModelInfo {
  model_name: string;
  optimal_threshold: number;
  accuracy: number;
  recall: number;
  precision: number;
  f1_score: number;
  roc_auc: number;
  pr_auc: number;
  confusion_matrix: number[][];
  status: string;
  version: string;
}

export interface TrendPoint {
  timestamp: string;
  air_temperature: number;
  process_temperature: number;
  rotational_speed: number;
  torque: number;
  tool_wear: number;
  failure_probability: number;
  remaining_useful_life: number;
  risk_level: RiskLevel;
}

export interface MachineTrendResponse {
  machine_id: string;
  machine_name: string;
  data_points_count: number;
  trends: TrendPoint[];
}

export interface MachineCompareResponse {
  machine_id: string;
  machine_name: string;
  has_data: boolean;
  message?: string;
  current?: {
    air_temperature: number;
    process_temperature: number;
    rotational_speed: number;
    torque: number;
    tool_wear: number;
    failure_probability: number;
    remaining_useful_life: number;
    risk_level: RiskLevel;
    timestamp: string;
  };
  previous?: {
    air_temperature: number;
    process_temperature: number;
    rotational_speed: number;
    torque: number;
    tool_wear: number;
    failure_probability: number;
    remaining_useful_life: number;
    risk_level: RiskLevel;
    timestamp: string;
  };
  deltas?: {
    air_temp_delta: number;
    process_temp_delta: number;
    rotational_speed_delta: number;
    torque_delta: number;
    tool_wear_delta: number;
    probability_delta: number;
    rul_delta: number;
  };
}
