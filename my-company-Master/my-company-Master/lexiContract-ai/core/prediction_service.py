from sqlalchemy.orm import Session
from typing import List, Dict
import pandas as pd
import os

from . import models, crud

# Attempt to import the ML model. If it fails, we fall back to heuristics.
try:
    from ml.timeline_model import TimelineModel, MODEL_PATH
    ML_ENABLED = True
except ImportError:
    ML_ENABLED = False
    TimelineModel = None
    MODEL_PATH = ""

class PredictionService:
    def _predict_timeline_heuristic(self, contract: models.Contract) -> Dict:
        """
        Predicts the negotiation timeline using a simple heuristic model.
        """
        # Baseline prediction
        predicted_days = 15
        confidence = 0.70

        # Heuristic adjustments based on contract filename as a proxy for type
        if "NDA" in contract.filename.upper():
            predicted_days -= 5  # NDAs are typically faster
            confidence += 0.10
        
        if "MSA" in contract.filename.upper():
            predicted_days += 10 # Master Service Agreements are more complex
        
        # In a future ML model, we'd use contract_value, counterparty data, etc.

        return {
            "predicted_timeline_days": max(predicted_days, 3), # Ensure a minimum of 3 days
            "timeline_confidence_score": min(confidence, 0.95)
        }

    def _predict_timeline_ml(self, contract: models.Contract) -> Dict:
        """
        Predicts the negotiation timeline using the trained ML model.
        """
        # This is a placeholder for getting richer contract data.
        # In a real system, this might come from a form the user fills out or CRM integration.
        contract_value = 100000 # Mock value
        counterparty_industry = "Technology" # Mock value

        # The model expects a DataFrame with specific columns
        input_data = pd.DataFrame([{
            "contract_type": "MSA", # Mocking contract_type for prediction
            "contract_value": contract_value,
            "counterparty_industry": counterparty_industry
        }])

        predicted_days = self.timeline_model.predict(input_data)

        return {
            "predicted_timeline_days": int(round(predicted_days)),
            "timeline_confidence_score": 0.90 # Higher confidence for ML model
        }

    def predict_negotiation_timeline(self, contract: models.Contract) -> Dict:
        if self.timeline_model:
            return self._predict_timeline_ml(contract)
        return self._predict_timeline_heuristic(contract)

    def predict_clause_success_rates(self, contract: models.Contract, db: Session) -> List[Dict]:
        """
        Predicts the success rate for a predefined set of key clause categories.
        """
        # For MVP, we'll check a hardcoded list of important categories.
        key_categories = ["Liability", "Indemnification", "Governing Law", "Confidentiality"]
        predictions = []

        for category in key_categories:
            stats = crud.get_clause_acceptance_stats(db, clause_category=category)
            accepted_count = stats.get("accepted", 0)
            rejected_count = stats.get("rejected", 0)
            total = accepted_count + rejected_count

            if total > 0:
                success_rate = accepted_count / total
                predictions.append({"clause_category": category, "predicted_success_rate": round(success_rate, 2)})
        
        return predictions

    def __init__(self):
        self.timeline_model = None
        if ML_ENABLED and os.path.exists(MODEL_PATH):
            model_wrapper = TimelineModel()
            if model_wrapper.load_model():
                self.timeline_model = model_wrapper

prediction_service = PredictionService()