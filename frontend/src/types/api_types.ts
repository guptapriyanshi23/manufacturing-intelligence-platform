import { SeverityLevel, AlertStatus, AdvisoryStatus, RcaStatus } from './enums';

export interface Alert {
  id: number;
  node_id: number;
  name: string | null;
  description: string | null;
  condition: string | null;
  threshold: number | null;
  severity: SeverityLevel;
  message: string;
  status: AlertStatus;
  timestamp: string;
  sensor_id?: string | null;
  asset_name?: string | null;
  sensor_name?: string | null;
}

export interface AlertCountRequest {
  node_ids: number[];
}

export interface AlertCountResponse {
  total_alerts: number;
}

export interface AlertRule {
  id: number;
  name: string;
  description: string | null;
  severity: SeverityLevel;
  node_id: number;
  condition_type: string | null;
  sensor_id: string | null;
  alert_type: string | null;
  threshold: number | null;
  delay: number | null;
  pending_period: string | null;
  keep_firing: string | null;
  notify_email: string | null;
  status: AlertStatus;
}

export interface Advisory {
  id: number;
  node_id: number | null;
  sensor_id: string | null;
  sensor_name: string | null;
  asset: string | null;
  severity: SeverityLevel;
  description: string;
  detected_at: string;
  status: AdvisoryStatus;
  image_path: string | null;
  root_cause_description: string | null;
  action_taken: string | null;
  created_at: string;
  updated_at: string;
}

export interface RCA {
  id: number;
  advisory_id: number;
  root_cause_description: string | null;
  action_taken: string | null;
  user_id: number | null;
  status: RcaStatus;
  created_at: string;
}

export interface User {
  id: number;
  email: string;
  is_active: boolean;
  permissions: string[];
}

export interface DashboardSummaryResponse {
  oee: MetricItem;
  availability: MetricItem;
  performance: MetricItem;
  quality: MetricItem;
  weekly_chart: PerformanceData[];
}

export interface MetricItem {
  label: string;
  value: number;
  unit: string;
  trend: number;
}

export interface PerformanceData {
  timestamp: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
}

export interface TelemetryDataPoint {
  timestamp: string | null;
  sensor_id: string;
  sensor_name: string;
  value: number | null;
}

export interface RootCauseAnalysisResponse {
  event_id: string;
  asset_name: string;
  anomaly_type: string;
  detected_at: string;
  possible_causes: FailureFactor[];
  recommendation: string;
}

export interface FailureFactor {
  name: string;
  probability: number;
  category: string;
  description: string;
}
