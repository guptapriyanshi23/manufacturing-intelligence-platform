from typing import List
from datetime import datetime, timedelta
from backend.app.modules.rootcause.schemas import RootCauseAnalysisResponse, FailureFactor

def get_rca_by_event(event_id: str) -> RootCauseAnalysisResponse:
    return RootCauseAnalysisResponse(
        event_id=event_id,
        asset_name="CNC Spindle Node 3",
        anomaly_type="Thermal Runaway",
        detected_at=datetime.utcnow() - timedelta(minutes=30),
        possible_causes=[
            FailureFactor(
                name="Lubrication Degradation",
                probability=0.68,
                category="mechanical",
                description="Viscosity level below minimum operational standard causing increased friction."
            ),
            FailureFactor(
                name="Coolant Pump Blockage",
                probability=0.22,
                category="hydraulic",
                description="Debris buildup detected in primary coolant feeder line."
            ),
            FailureFactor(
                name="Excessive Load / Over-speeding",
                probability=0.10,
                category="process",
                description="Feed rate settings exceeded recommended limits for standard tooling."
            )
        ],
        recommendation="Initiate emergency spindle shutdown. Flush bearing lubrication and inspect feed lines for particulate buildup."
    )
