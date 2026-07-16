from enum import Enum, IntEnum

class SeverityLevel(IntEnum):
    CRITICAL = 1
    HIGH = 2
    WARNING = 3
    LOW = 4
    INFO = 5

class AlertStatus(str, Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"

class AdvisoryStatus(str, Enum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"

class RcaStatus(str, Enum):
    INITIATED = "initiated"
    COMPLETED = "completed"
