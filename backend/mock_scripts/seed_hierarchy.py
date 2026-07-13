import sys
import os

# Add parent directory of 'backend' to sys.path to allow imports like 'backend.app...'
backend_parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_parent_dir not in sys.path:
    sys.path.insert(0, backend_parent_dir)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.core.config import settings
from backend.app.models.hierarchy import HierarchyNode, PlantMetadata, AssetMetadata, SensorMetadata

db_url = settings.DATABASE_URL
if db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

engine = create_engine(db_url)
SessionLocal = sessionmaker(bind=engine)

def seed_hierarchy():
    db = SessionLocal()
    try:
        # 1. Fetch or create Enterprise
        enterprise = db.query(HierarchyNode).filter(HierarchyNode.node_type == 'enterprise').first()
        if not enterprise:
            enterprise = HierarchyNode(
                node_type='enterprise',
                name='global_mfg_inc',
                display_name='Global Manufacturing Inc.',
                sort_order=1
            )
            db.add(enterprise)
            db.flush()

        # 2. Fetch or create Site 1: Detroit Assembly Plant
        detroit = db.query(HierarchyNode).filter(
            HierarchyNode.node_type == 'site',
            HierarchyNode.name == 'detroit_automotive_plant'
        ).first()
        if not detroit:
            detroit = HierarchyNode(
                parent_id=enterprise.id,
                node_type='site',
                name='detroit_automotive_plant',
                display_name='Detroit Assembly Plant',
                sort_order=1
            )
            db.add(detroit)
            db.flush()
            db.add(PlantMetadata(
                node_id=detroit.id,
                use_case='Automotive Final Assembly',
                location='Detroit, Michigan, USA',
                description='Primary high-volume vehicle chassis production facility.'
            ))
            db.flush()

        # 3. Fetch or create Site 2: Munich Battery Gigafactory
        munich = db.query(HierarchyNode).filter(
            HierarchyNode.node_type == 'site',
            HierarchyNode.name == 'munich_battery_giga'
        ).first()
        if not munich:
            munich = HierarchyNode(
                parent_id=enterprise.id,
                node_type='site',
                name='munich_battery_giga',
                display_name='Munich Battery Gigafactory',
                sort_order=2
            )
            db.add(munich)
            db.flush()
            db.add(PlantMetadata(
                node_id=munich.id,
                use_case='Lithium-Ion Battery Production',
                location='Munich, Bavaria, Germany',
                description='Advanced cell manufacturing and battery pack assembly.'
            ))
            db.flush()
        
        db.commit()

        # 4. Count existing sensors
        sensor_counter = db.query(HierarchyNode).filter(HierarchyNode.node_type == 'sensor').count()
        total_needed = 250 - sensor_counter
        if total_needed <= 0:
            print(f"Database already has {sensor_counter} sensors. Scaling not required.")
            return

        print(f"Current sensors: {sensor_counter}. Onboarding {total_needed} more sensors to reach 250...")

        sites = [detroit, munich]
        added_sensors = 0
        
        # Unique trackers
        site_idx = 0
        area_idx = 1
        line_idx = 1
        station_idx = 1
        asset_idx = 1
        comp_idx = 1
        sens_idx = sensor_counter + 1

        while added_sensors < total_needed:
            # Alternate between Detroit and Munich sites
            curr_site = sites[site_idx % 2]
            site_idx += 1
            site_prefix = "DET" if curr_site.name == "detroit_automotive_plant" else "MUC"
            site_name_p = "Detroit" if curr_site.name == "detroit_automotive_plant" else "Munich"
            
            # Create Area
            area_name = f"{curr_site.name}_area_{area_idx}"
            area_disp = f"{site_name_p} Area {area_idx}"
            area_node = HierarchyNode(
                parent_id=curr_site.id,
                node_type='area',
                name=area_name,
                display_name=area_disp,
                sort_order=area_idx
            )
            db.add(area_node)
            db.flush()
            area_idx += 1
            
            # Create Lines under Area
            for l in range(1, 3):
                line_name = f"{area_name}_line_{l}"
                line_disp = f"Production Line {line_idx}"
                line_node = HierarchyNode(
                    parent_id=area_node.id,
                    node_type='line',
                    name=line_name,
                    display_name=line_disp,
                    sort_order=l
                )
                db.add(line_node)
                db.flush()
                line_idx += 1
                
                # Create Stations under Line
                for s in range(1, 3):
                    station_name = f"{line_name}_station_{s}"
                    station_disp = f"Workstation {station_idx}"
                    station_node = HierarchyNode(
                        parent_id=line_node.id,
                        node_type='station',
                        name=station_name,
                        display_name=station_disp,
                        sort_order=s
                    )
                    db.add(station_node)
                    db.flush()
                    station_idx += 1
                    
                    # Create Assets under Station
                    for ast in range(1, 3):
                        asset_uid = f"{site_prefix}-AST-{asset_idx:03d}"
                        asset_name = f"{station_name}_asset_{ast}"
                        asset_disp = f"Industrial Asset {asset_idx}"
                        asset_node = HierarchyNode(
                            parent_id=station_node.id,
                            node_type='asset',
                            name=asset_name,
                            display_name=asset_disp,
                            sort_order=ast
                        )
                        db.add(asset_node)
                        db.flush()
                        db.add(AssetMetadata(
                            node_id=asset_node.id,
                            asset_id=asset_uid,
                            manufacturer="Generic Corp",
                            model="GenX-500"
                        ))
                        asset_idx += 1
                        
                        # Create Components under Asset
                        for c in range(1, 3):
                            comp_name = f"{asset_name}_comp_{c}"
                            comp_disp = f"Component Unit {comp_idx}"
                            comp_node = HierarchyNode(
                                parent_id=asset_node.id,
                                node_type='component',
                                name=comp_name,
                                display_name=comp_disp,
                                sort_order=c
                            )
                            db.add(comp_node)
                            db.flush()
                            comp_idx += 1
                            
                            # Create Sensors under Component
                            for sn in range(1, 3):
                                if added_sensors >= total_needed:
                                    break
                                    
                                sensor_uid = f"SEN-GEN-{sens_idx:03d}"
                                sensor_type = "Temperature" if sn == 1 else "Vibration"
                                sensor_unit = "°C" if sn == 1 else "mm/s²"
                                sensor_rate = 10.0 if sn == 1 else 1000.0
                                
                                sensor_name = f"{comp_name}_sensor_{sn}"
                                sensor_disp = f"{sensor_type} Sensor {sens_idx}"
                                sensor_node = HierarchyNode(
                                    parent_id=comp_node.id,
                                    node_type='sensor',
                                    name=sensor_name,
                                    display_name=sensor_disp,
                                    sort_order=sn
                                )
                                db.add(sensor_node)
                                db.flush()
                                db.add(SensorMetadata(
                                    node_id=sensor_node.id,
                                    sensor_id=sensor_uid,
                                    unit=sensor_unit,
                                    sampling_rate=sensor_rate
                                ))
                                
                                sens_idx += 1
                                added_sensors += 1
                                
            db.commit()
            
        print(f"Successfully seeded {added_sensors} sensors, making the total {sensor_counter + added_sensors} sensors.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding hierarchy: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_hierarchy()
