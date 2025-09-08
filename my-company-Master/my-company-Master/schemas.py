from pydantic import BaseModel
import uuid
from typing import List, Optional
from .models import SuggestionStatus

# A schema for updating the status of a suggestion
class AnalysisSuggestionUpdate(BaseModel):
    status: SuggestionStatus

class ClausePrediction(BaseModel):
    clause_category: str
    predicted_success_rate: float

class ContractPredictions(BaseModel):
    predicted_timeline_days: int
    timeline_confidence_score: float
    key_clause_predictions: List[ClausePrediction]

    class Config:
        from_attributes = True
