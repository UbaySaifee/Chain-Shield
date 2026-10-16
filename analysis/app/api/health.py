from fastapi import APIRouter
from datetime import datetime, timezone
from app.models.schemas import HealthCheckResponse
from app.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthCheckResponse)
@router.get("/api/health", response_model=HealthCheckResponse)
def get_health() -> HealthCheckResponse:
    return HealthCheckResponse(
        status="UP",
        service="chainshield-analysis",
        version=settings.VERSION,
        timestamp=datetime.now(timezone.utc),
        details={
            "engine": "DeterministicRuleEngine",
            "ml_status": "SECONDARY_STUB",
            "environment": "local_dev"
        }
    )
