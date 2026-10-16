from fastapi import APIRouter
from app.models.schemas import RiskEvaluationRequest, RiskEvaluationResponse
from app.services.risk_scorer import RiskScorerService

router = APIRouter(prefix="/analyze", tags=["Risk Analysis"])

@router.post("/evaluate", response_model=RiskEvaluationResponse)
def evaluate_risk(payload: RiskEvaluationRequest) -> RiskEvaluationResponse:
    """
    Evaluates risk score deterministically based on provided indicator weights and severities.
    Does NOT use opaque ML as a sole arbiter; follows explainable formula.
    """
    return RiskScorerService.calculate_score(payload)
