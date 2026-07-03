from typing import List
from datetime import datetime, timedelta
from backend.app.modules.advisories.schemas import AdvisoryResponse

_mock_advisories = [
    AdvisoryResponse(
        id=1,
        title="Optimize Hydraulic System Pressure",
        category="energy",
        priority="high",
        description="Hydraulic pump 4 is maintaining maximum pressure during idle cycles. Lowering idle pressure by 1.5 bar will yield energy savings without affecting cycle start times.",
        impact="Save $1,200/month in utility bills",
        status="active",
        created_at=datetime.utcnow() - timedelta(hours=3)
    ),
    AdvisoryResponse(
        id=2,
        title="Schedule Spindle Re-greasing",
        category="maintenance",
        priority="medium",
        description="CNC Spindle temperature profile indicates minor friction. We recommend scheduling greasing within the next 48 production hours to avoid bearing wear.",
        impact="Prevent unplanned downtime ($15,000 estimated savings)",
        status="active",
        created_at=datetime.utcnow() - timedelta(days=1)
    )
]

def get_advisories() -> List[AdvisoryResponse]:
    return _mock_advisories
