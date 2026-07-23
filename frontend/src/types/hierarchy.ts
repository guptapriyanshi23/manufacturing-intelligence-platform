export type NodeType = 'enterprise' | 'site' | 'area' | 'block' | 'line' | 'station' | 'system' | 'asset' | 'equipment' | 'component' | 'sensor' | 'parameter';

export interface PlantMetadata {
  use_case?: string;
  location?: string;
  description?: string;
}

export interface AssetMetadata {
  asset_id: string;
  manufacturer?: string;
  model?: string;
}

export interface SensorMetadata {
  sensor_id: string;
  unit?: string;
  sampling_rate?: number;
  thresholds?: number;
  safe_limit?: number;
}

export interface HierarchyNode {
  id: number;
  parent_id?: number;
  node_type: NodeType;
  name: string;
  display_name: string;
  description?: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  plant_metadata?: PlantMetadata;
  asset_metadata?: AssetMetadata;
  sensor_metadata?: SensorMetadata;
  children?: HierarchyNode[];
}

export interface HierarchyNodeCreateInput {
  parent_id?: number | null;
  node_type: NodeType;
  name: string;
  display_name: string;
  description?: string;
  sort_order: number;
  plant_metadata?: PlantMetadata;
  asset_metadata?: AssetMetadata;
  sensor_metadata?: SensorMetadata;
}
