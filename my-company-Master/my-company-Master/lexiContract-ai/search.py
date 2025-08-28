import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Set
import uuid

from core import crud, models, schemas
from api.v1 import dependencies
from core.database import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.Contract])
def search_contracts(
    query: str = Query(..., min_length=3),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_active_subscriber),
):
    """
    Performs a full-text search across the user's organization's contracts.
    Returns contracts with a highlighted snippet of the matching text.
    """
    # This is a mock implementation. In a real application, this would integrate
    # with a dedicated search service (e.g., Elasticsearch, PostgreSQL FTS).

    # Fetch all contracts for the organization that have full text
    all_contracts_with_text = [
        c for c in crud.get_contracts_by_organization(db, organization_id=current_user.organization_id)
        if c.full_text
    ]

    found_contracts = []
    for contract in all_contracts_with_text:
        highlighted_snippet = crud.highlight_text_in_snippet(contract.full_text, query)
        if highlighted_snippet: # If a match was found and a snippet generated
            found_contracts.append(schemas.Contract.model_validate(contract, update={'highlighted_snippet': highlighted_snippet}))
    return found_contracts