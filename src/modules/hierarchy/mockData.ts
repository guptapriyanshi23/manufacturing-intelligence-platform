import type { HierarchyNode } from '../../types/hierarchy';

export const mockHierarchyData: HierarchyNode[] = [
  {
    id: 1,
    node_type: 'enterprise',
    name: 'global_mfg_inc',
    display_name: 'Global Manufacturing Inc.',
    sort_order: 1,
    children: [
      {
        id: 2,
        parent_id: 1,
        node_type: 'plant',
        name: 'detroit_automotive_plant',
        display_name: 'Detroit Assembly Plant',
        sort_order: 1,
        plant_metadata: {
          use_case: 'Automotive Final Assembly',
          location: 'Detroit, Michigan, USA',
          description: 'Primary high-volume vehicle chassis production facility.'
        },
        children: [
          {
            id: 3,
            parent_id: 2,
            node_type: 'asset',
            name: 'cnc_spindle_machining_center',
            display_name: 'CNC Milling Center A',
            sort_order: 1,
            asset_metadata: {
              asset_id: 'CNC-DET-004',
              manufacturer: 'Haas Automation',
              model: 'VF-4SS'
            },
            children: [
              {
                id: 4,
                parent_id: 3,
                node_type: 'sensor',
                name: 'cnc_spindle_temp',
                display_name: 'Spindle Temperature Sensor',
                sort_order: 1,
                sensor_metadata: {
                  sensor_id: 'SEN-TEMP-842',
                  unit: '°C',
                  sampling_rate: 10
                }
              },
              {
                id: 5,
                parent_id: 3,
                node_type: 'sensor',
                name: 'cnc_vibration_axis_y',
                display_name: 'Spindle Vibration Y-Axis',
                sort_order: 2,
                sensor_metadata: {
                  sensor_id: 'SEN-VIB-911',
                  unit: 'mm/s²',
                  sampling_rate: 1000
                }
              }
            ]
          },
          {
            id: 6,
            parent_id: 2,
            node_type: 'asset',
            name: 'robotic_welding_cell_7',
            display_name: 'Robotic Welder Cell 7',
            sort_order: 2,
            asset_metadata: {
              asset_id: 'ROB-WELD-07',
              manufacturer: 'KUKA Robotics',
              model: 'KR QUANTEC'
            },
            children: [
              {
                id: 7,
                parent_id: 6,
                node_type: 'sensor',
                name: 'weld_voltage',
                display_name: 'Welding Power Arc Voltage',
                sort_order: 1,
                sensor_metadata: {
                  sensor_id: 'SEN-VOLT-402',
                  unit: 'V',
                  sampling_rate: 50
                }
              }
            ]
          }
        ]
      },
      {
        id: 8,
        parent_id: 1,
        node_type: 'plant',
        name: 'munich_battery_giga',
        display_name: 'Munich Battery Gigafactory',
        sort_order: 2,
        plant_metadata: {
          use_case: 'EV Battery Cell Manufacturing',
          location: 'Munich, Germany',
          description: 'Pilot scale production of advanced lithium-ion and solid-state cells.'
        },
        children: [
          {
            id: 9,
            parent_id: 8,
            node_type: 'asset',
            name: 'lithium_dryer_kiln',
            display_name: 'Lithium Processing Dryer',
            sort_order: 1,
            asset_metadata: {
              asset_id: 'DRY-MUN-10',
              manufacturer: 'Buhler Group',
              model: 'Dryer-X10'
            },
            children: [
              {
                id: 10,
                parent_id: 9,
                node_type: 'sensor',
                name: 'kiln_humidity',
                display_name: 'Kiln Relative Humidity',
                sort_order: 1,
                sensor_metadata: {
                  sensor_id: 'SEN-HUM-503',
                  unit: '%RH',
                  sampling_rate: 1
                }
              }
            ]
          }
        ]
      }
    ]
  }
];
