import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.api.health import get_health

class TestHealthEndpoint(unittest.TestCase):

    def test_health_returns_up(self):
        health = get_health()
        self.assertEqual(health.status, "UP")
        self.assertEqual(health.service, "chainshield-analysis")
        self.assertIn("engine", health.details)
        self.assertEqual(health.details["engine"], "DeterministicRuleEngine")

if __name__ == "__main__":
    unittest.main()
