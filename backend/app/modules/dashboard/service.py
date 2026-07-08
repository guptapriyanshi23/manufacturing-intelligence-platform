from typing import List
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from sqlalchemy.orm import Session
from backend.app.modules.dashboard.schemas import DashboardSummaryResponse, MetricItem, PerformanceData

def get_sensor_telemetry(db: Session, sensor_ids: List[str], hours: int = 24, granularity: str = None):
    start_time = datetime.now(timezone.utc) - timedelta(hours=hours)
    if not sensor_ids:
        return []
    
    # 1. Query sensor thresholds
    thresh_query = text("""
        SELECT sensor_id, alarm_limit, trip_limit 
        FROM sensor_thresholds 
        WHERE sensor_id IN :sensor_ids
    """)
    thresh_result = db.execute(thresh_query, {"sensor_ids": tuple(sensor_ids)}).fetchall()
    thresholds_map = {row[0]: (row[1], row[2]) for row in thresh_result}

    # 2. Determine granularity bucket
    if not granularity:
        if hours <= 2:
            granularity = 'raw'
        elif hours <= 24:
            granularity = '10m'
        elif hours <= 168:
            granularity = '1h'
        else:
            granularity = '6h'

    # If raw, query all points
    if granularity == 'raw':
        query = text("""
            SELECT timestamp, sensor_id, sensor_name, value 
            FROM sensor_telemetry 
            WHERE sensor_id IN :sensor_ids AND timestamp >= :start_time
            ORDER BY timestamp ASC
        """)
        result = db.execute(query, {"sensor_ids": tuple(sensor_ids), "start_time": start_time}).fetchall()
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
                to_timestamp(floor(extract(epoch from timestamp) / :seconds) * :seconds) AS bucket,
                sensor_id,
                sensor_name,
                AVG(value) as value
            FROM sensor_telemetry 
            WHERE sensor_id IN :sensor_ids AND timestamp >= :start_time
            GROUP BY bucket, sensor_id, sensor_name
            ORDER BY bucket ASC
        """)
        result = db.execute(query, {"sensor_ids": tuple(sensor_ids), "start_time": start_time, "seconds": seconds}).fetchall()
        
    output = []
    for row in result:
        sid = row[1]
        alarm_lim, trip_lim = thresholds_map.get(sid, (None, None))
        output.append({
            "timestamp": row[0].isoformat() if row[0] else None,
            "sensor_id": sid,
            "sensor_name": row[2],
            "value": round(row[3], 2) if row[3] is not None else None,
            "alarm_limit": alarm_lim,
            "trip_limit": trip_lim
        })
    return output

def get_dashboard_summary() -> DashboardSummaryResponse:
    return DashboardSummaryResponse(
        oee=MetricItem(label="OEE", value=78.4, unit="%", trend=1.2),
        availability=MetricItem(label="Availability", value=84.2, unit="%", trend=-0.5),
        performance=MetricItem(label="Performance", value=91.0, unit="%", trend=2.4),
        quality=MetricItem(label="Quality", value=98.1, unit="%", trend=0.1),
        weekly_chart=[
            PerformanceData(timestamp="Mon", oee=75.0, availability=82.0, performance=90.0, quality=97.5),
            PerformanceData(timestamp="Tue", oee=76.8, availability=83.5, performance=89.5, quality=98.0),
            PerformanceData(timestamp="Wed", oee=78.2, availability=84.0, performance=91.0, quality=97.8),
            PerformanceData(timestamp="Thu", oee=77.5, availability=82.8, performance=92.2, quality=98.2),
            PerformanceData(timestamp="Fri", oee=79.1, availability=85.1, performance=91.5, quality=98.4),
            PerformanceData(timestamp="Sat", oee=80.5, availability=86.0, performance=92.0, quality=98.5),
            PerformanceData(timestamp="Sun", oee=78.4, availability=84.2, performance=91.0, quality=98.1)
        ]
    )
