from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from core import crud, schemas, models
from api.v1.dependencies import get_db, get_current_active_user

router = APIRouter()

@router.get("/apps", response_model=List[schemas.DeveloperApp])
def list_published_apps(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    List all published applications available in the marketplace for end-users to browse.
    """
    return crud.get_published_apps(db=db)