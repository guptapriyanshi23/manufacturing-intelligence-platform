from backend.app.modules.dashboard.schemas import DashboardSummaryResponse, MetricItem, PerformanceData

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
