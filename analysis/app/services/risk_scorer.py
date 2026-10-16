from datetime import datetime, timezone
from app.models.schemas import RiskEvaluationRequest, RiskEvaluationResponse

SEVERITY_MULTIPLIERS = {
    "INFO": 0.2,
    "LOW": 0.5,
    "MEDIUM": 1.0,
    "HIGH": 1.5,
    "CRITICAL": 2.0,
}

class RiskScorerService:
    """
    Deterministic rule-based risk evaluation service implementing the scoring formula:
    RiskScore = min(100, sum(weight_i * severity_multiplier_i))
    """

    @staticmethod
    def calculate_score(request: RiskEvaluationRequest) -> RiskEvaluationResponse:
        raw_score = 0.0

        for ind in request.active_indicators:
            multiplier = SEVERITY_MULTIPLIERS.get(ind.severity.upper(), 1.0)
            raw_score += ind.weight * multiplier

        final_score = min(100, int(round(raw_score)))

        if final_score >= 85:
            category = "CRITICAL"
            summary = "Critical threat detected. Unilateral honeypot locks, known drainer or malicious permissions detected."
        elif final_score >= 60:
            category = "HIGH"
            summary = "Elevated risk profile. High permissions, abnormal activity, or unverified counterparty observed."
        elif final_score >= 30:
            category = "MEDIUM"
            summary = "Moderate risk indicators detected. Review permissions and verify counterparty prior to execution."
        else:
            category = "LOW"
            summary = "Low baseline risk. Standard benign behavior observed on local EVM sandbox."

        return RiskEvaluationResponse(
            target_address=request.target_address,
            entity_type=request.entity_type,
            risk_score=final_score,
            risk_category=category,
            summary=summary,
            evaluated_indicators_count=len(request.active_indicators),
            evaluated_at=datetime.now(timezone.utc),
        )
