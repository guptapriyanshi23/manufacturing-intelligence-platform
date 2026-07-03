from typing import List
from datetime import datetime, timedelta
from backend.app.modules.reports.schemas import ReportResponse

_mock_reports = [
    ReportResponse(
        id=1,
        name="June 2026 Shift Performance Analysis",
        report_type="oee_analysis",
        status="ready",
        created_at=datetime.utcnow() - timedelta(days=2),
        download_url="/downloads/reports/june-2026-oee.pdf"
    ),
    ReportResponse(
        id=2,
        name="CNC Assets Vibration Log - Q2",
        report_type="maintenance_log",
        status="ready",
        created_at=datetime.utcnow() - timedelta(days=5),
        download_url="/downloads/reports/cnc-vibration-q2.csv"
    )
]

def get_reports() -> List[ReportResponse]:
    return _mock_reports
