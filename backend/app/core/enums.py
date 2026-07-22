from enum import Enum, IntEnum

class SeverityLevel(IntEnum):
    CRITICAL = 1
    HIGH = 2
    WARNING = 3
    LOW = 4
    INFO = 5

class AlertStatus(IntEnum):
    ACTIVE = 1
    ACKNOWLEDGED = 2
    CLOSED = 3

class AdvisoryStatus(IntEnum):
    OPEN = 1
    ACKNOWLEDGED = 2
    IN_PROGRESS = 3
    RESOLVED = 4

class RcaStatus(str, Enum):
    INITIATED = 'initiated'
    COMPLETED = 'completed'
