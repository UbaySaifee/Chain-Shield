import unittest
import sys
import os

# Add parent directory to sys.path so app can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.schemas import RiskEvaluationRequest, RiskIndicatorPayload
from app.services.risk_scorer import RiskScorerService

class TestRiskScorerService(unittest.TestCase):

    def test_benign_wallet_low_score(self):
        request = RiskEvaluationRequest(
            target_address="0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            entity_type="WALLET",
            active_indicators=[]
        )
        response = RiskScorerService.calculate_score(request)
        self.assertEqual(response.risk_score, 0)
        self.assertEqual(response.risk_category, "LOW")

    def test_honeypot_critical_score(self):
        # IND-C03: Honeypot sell restriction, weight 50, CRITICAL severity (2.0 multiplier)
        # Raw score = 50 * 2.0 = 100
        request = RiskEvaluationRequest(
            target_address="0x5FbDB2315678afecb367f032d93F642f64180aa3",
            entity_type="CONTRACT",
            active_indicators=[
                RiskIndicatorPayload(
                    code="IND-C03",
                    title="Honeypot Sell Restriction",
                    severity="CRITICAL",
                    weight=50
                )
            ]
        )
        response = RiskScorerService.calculate_score(request)
        self.assertEqual(response.risk_score, 100)
        self.assertEqual(response.risk_category, "CRITICAL")
        self.assertIn("Critical threat detected", response.summary)

    def test_score_clipping_at_100(self):
        # Multiple severe indicators exceeding 100
        request = RiskEvaluationRequest(
            target_address="0x5FbDB2315678afecb367f032d93F642f64180aa3",
            entity_type="CONTRACT",
            active_indicators=[
                RiskIndicatorPayload(code="IND-C03", title="Honeypot", severity="CRITICAL", weight=50),
                RiskIndicatorPayload(code="IND-T01", title="Unlimited Approval", severity="HIGH", weight=35),
            ]
        )
        response = RiskScorerService.calculate_score(request)
        self.assertEqual(response.risk_score, 100)

    def test_medium_risk_categorization(self):
        # IND-C01: Unverified Source Bytecode, weight 15, MEDIUM severity (1.0 multiplier) -> 15 (wait, weight 35 -> MEDIUM)
        request = RiskEvaluationRequest(
            target_address="0x5FbDB2315678afecb367f032d93F642f64180aa3",
            entity_type="CONTRACT",
            active_indicators=[
                RiskIndicatorPayload(code="IND-C01", title="Unverified Bytecode", severity="MEDIUM", weight=35)
            ]
        )
        response = RiskScorerService.calculate_score(request)
        self.assertEqual(response.risk_score, 35)
        self.assertEqual(response.risk_category, "MEDIUM")

if __name__ == "__main__":
    unittest.main()
