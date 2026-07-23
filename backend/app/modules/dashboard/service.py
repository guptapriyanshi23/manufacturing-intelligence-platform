from typing import List
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from sqlalchemy.orm import Session
from backend.app.modules.dashboard.schemas import DashboardSummaryResponse, MetricItem, PerformanceData

def get_sensor_telemetry(db: Session, sensor_ids: List[str], hours: int = 24, granularity: str = None, start_time: datetime = None, end_time: datetime = None):
    if not start_time:
        start_time = datetime.now(timezone.utc) - timedelta(hours=hours)
    if not end_time:
        end_time = datetime.now(timezone.utc)
        
    if not sensor_ids:
        return []
    

    # 2. Determine granularity bucket
    if not granularity:
        # Calculate hours from start_time and end_time
        time_diff = end_time - start_time
        calc_hours = time_diff.total_seconds() / 3600
        if calc_hours <= 2:
            granularity = 'raw'
        elif calc_hours <= 24:
            granularity = '10m'
        elif calc_hours <= 168:
            granularity = '1h'
        else:
            granularity = '6h'

    # If raw, query all points
    if granularity == 'raw':
        query = text("""
            SELECT t.timestamp, t.sensor_id, t.sensor_name, t.value, th.safe_limit, th.threshold
            FROM sensor_telemetry t
            LEFT JOIN sensor_thresholds th ON t.sensor_id = th.node_id
            WHERE t.sensor_id IN :sensor_ids AND t.timestamp >= :start_time AND t.timestamp <= :end_time
            ORDER BY t.timestamp ASC
        """)
        result = db.execute(query, {"sensor_ids": tuple(sensor_ids), "start_time": start_time, "end_time": end_time}).fetchall()
    else:
        # Map granularity string to seconds
        seconds_map = {
            '1m': 60,
            '5m': 300,
            '10m': 600,
            '1h': 3600,
            '6h': 21600,
            '1d': 86400
        }
        seconds = seconds_map.get(granularity, 600)
        
        query = text("""
            SELECT 
                to_timestamp(floor(extract(epoch from t.timestamp) / :seconds) * :seconds) AS bucket,
                t.sensor_id,
                t.sensor_name,
                AVG(t.value) as value,
                th.safe_limit,
                th.threshold
            FROM sensor_telemetry t
            LEFT JOIN sensor_thresholds th ON t.sensor_id = th.node_id
            WHERE t.sensor_id IN :sensor_ids AND t.timestamp >= :start_time AND t.timestamp <= :end_time
            GROUP BY bucket, t.sensor_id, t.sensor_name, th.safe_limit, th.threshold
            ORDER BY bucket ASC
        """)
        result = db.execute(query, {"sensor_ids": tuple(sensor_ids), "start_time": start_time, "end_time": end_time, "seconds": seconds}).fetchall()
        
    sensors_dict = {}
    for row in result:
        sid = row[1]
        if sid not in sensors_dict:
            sensors_dict[sid] = {
                "sensor_id": sid,
                "sensor_name": row[2],
                "safe_limit": float(row[4]) if row[4] is not None else None,
                "threshold": float(row[5]) if row[5] is not None else None,
                "data": []
            }
        sensors_dict[sid]["data"].append({
            "timestamp": row[0].isoformat() if row[0] else None,
            "value": round(row[3], 2) if row[3] is not None else None
        })
    return list(sensors_dict.values())

def get_shift_timings(db: Session, detected_at: datetime):
    from backend.app.models.shifts import Shift
    from datetime import timezone, timedelta, time
    
    IST = timezone(timedelta(hours=5, minutes=30))
    
    # Fetch all shifts from DB
    shifts = db.query(Shift).all()
    
    if detected_at.tzinfo is not None:
        detected_at_local = detected_at.astimezone(IST)
    else:
        detected_at_local = detected_at.replace(tzinfo=IST)
    detected_time = detected_at_local.time()
    
    matched_shift = None
    shift_start = None
    shift_end = None
    
    for s in shifts:
        if s.start_time <= s.end_time:
            if s.start_time <= detected_time <= s.end_time:
                matched_shift = s
                shift_start = datetime.combine(detected_at_local.date(), s.start_time).replace(tzinfo=IST)
                shift_end = datetime.combine(detected_at_local.date(), s.end_time).replace(tzinfo=IST)
                break
        else:
            if detected_time >= s.start_time or detected_time <= s.end_time:
                matched_shift = s
                if detected_time >= s.start_time:
                    shift_start = datetime.combine(detected_at_local.date(), s.start_time).replace(tzinfo=IST)
                    shift_end = datetime.combine(detected_at_local.date() + timedelta(days=1), s.end_time).replace(tzinfo=IST)
                else:
                    shift_start = datetime.combine(detected_at_local.date() - timedelta(days=1), s.start_time).replace(tzinfo=IST)
                    shift_end = datetime.combine(detected_at_local.date(), s.end_time).replace(tzinfo=IST)
                break
                
    if not matched_shift:
        # Fallback to daily view if no shift found
        return None
        
    return {
        "shift_name": matched_shift.shift_name,
        "start_time": shift_start.isoformat(),
        "end_time": shift_end.isoformat(),
        "start_time_local": shift_start.strftime("%Y-%m-%dT%H:%M"),
        "end_time_local": shift_end.strftime("%Y-%m-%dT%H:%M")
    }

