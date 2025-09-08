from sqlalchemy.orm import Session
from typing import List, Dict
import pandas as pd
import os

from . import models, crud

# Attempt to import the ML model. If it fails, we fall back to heuristics gracefully.
try:
    from ml.timeline_model import TimelineModel, MODEL_PATH
    ML_ENABLED = True
except ImportError:
    ML_ENABLED = False
    TimelineModel = None

class PredictionService:
    def _predict_timeline_heuristic(self, contract: models.Contract, db: Session) -> Dict:
        """
        Predicts the negotiation timeline using a simple heuristic model.
        """
        # Baseline prediction
        predicted_days = 15
        confidence = 0.65

        # Heuristic adjustments based on contract type (approximated from filename)
        filename_upper = contract.filename.upper()
        if "NDA" in filename_upper:
            predicted_days = 7
            confidence += 0.10
        elif "MSA" in filename_upper:
            predicted_days = 25
        elif "SOW" in filename_upper:
            predicted_days = 20

        # Adjust based on number of AI suggestions (proxy for complexity)
        if contract.versions:
            latest_version = contract.versions[-1]
            num_suggestions = len(latest_version.suggestions)
            if num_suggestions > 10:
                predicted_days += 7  # More suggestions likely means more back-and-forth
                confidence -= 0.05
            elif num_suggestions < 3:
                predicted_days -= 3
                confidence += 0.05

        return {
            "predicted_timeline_days": max(predicted_days, 3),
            "timeline_confidence_score": min(confidence, 0.95)
        }

    def _predict_timeline_ml(self, contract: models.Contract) -> Dict:
        """
        Predicts the negotiation timeline using the trained ML model.
        """
        # In a real system, this data would come from a form or CRM integration.
        contract_value = 100000  # Mock value
        counterparty_industry = "Technology"  # Mock value
        
        # The model expects a DataFrame with specific columns
        input_data = pd.DataFrame([{
            "contract_type": "MSA", # Mocking contract_type for prediction
            "contract_value": contract_value,
            "counterparty_industry": counterparty_industry
        }])

        predicted_days = self.timeline_model.predict(input_data) if self.timeline_model else 0

        return {
            "predicted_timeline_days": int(round(predicted_days)) if self.timeline_model else 20, # Fallback value
            "timeline_confidence_score": 0.90 # Higher confidence for ML model
        }

    def predict_negotiation_timeline(self, contract: models.Contract, db: Session) -> Dict:
        if self.timeline_model:
            return self._predict_timeline_ml(contract)
        return self._predict_timeline_heuristic(contract, db)

    def predict_clause_success_rates(self, contract: models.Contract, db: Session) -> List[Dict]:
        """
        Predicts the success rate for a predefined set of key clause categories.
        """
        # For MVP, we'll check a hardcoded list of important categories.
        key_categories = ["Liability", "Indemnification", "Governing Law", "Confidentiality"]
        predictions = []

        for category in key_categories:
            stats = crud.get_clause_acceptance_stats(db, clause_category=category, organization_id=contract.organization_id)
            accepted_count = stats.get("ACCEPTED", 0)
            rejected_count = stats.get("REJECTED", 0)
            total = accepted_count + rejected_count

            # Require a minimum number of data points for a meaningful prediction
            if total > 5:
                success_rate = accepted_count / total
                predictions.append({"clause_category": category, "predicted_success_rate": round(success_rate, 2)})
        
        return predictions

    def __init__(self):
        self.timeline_model = None
        if ML_ENABLED:
            model_wrapper = TimelineModel()
            if model_wrapper.load_model():
                self.timeline_model = model_wrapper

prediction_service = PredictionService()