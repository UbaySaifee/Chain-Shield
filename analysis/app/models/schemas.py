from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class HealthCheckResponse(BaseModel):
    status: str = "UP"
    service: str = "chainshield-analysis"
    version: str
    timestamp: datetime
    details: Dict[str, Any]

class RiskIndicatorPayload(BaseModel):
    code: str
    title: str
    severity: str
    weight: int
    evidence: Optional[str] = None

class RiskEvaluationRequest(BaseModel):
    target_address: str = Field(..., pattern=r"^0x[a-fA-F0-9]{40}$")
    entity_type: str = "WALLET" # WALLET or CONTRACT
    active_indicators: List[RiskIndicatorPayload] = []

class RiskEvaluationResponse(BaseModel):
    target_address: str
    entity_type: str
    risk_score: int
    risk_category: str # LOW, MEDIUM, HIGH, CRITICAL
    summary: str
    evaluated_indicators_count: int
    evaluated_at: datetime
