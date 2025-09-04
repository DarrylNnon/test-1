from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from core import crud, schemas, models
from api.v1 import dependencies

router = APIRouter(
    prefix="/teams",
    tags=["Teams"],
    dependencies=[Depends(dependencies.get_current_active_admin_user)] # All endpoints require admin
)

@router.post("/", response_model=schemas.Team, status_code=status.HTTP_201_CREATED)
def create_team(
    team: schemas.TeamCreate,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    return crud.create_team(db=db, team=team, organization_id=current_user.organization_id)

@router.get("/", response_model=List[schemas.Team])
def read_teams(
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    return crud.get_teams_by_organization(db, organization_id=current_user.organization_id)

@router.get("/{team_id}", response_model=schemas.Team)
def read_team(
    team_id: UUID,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    db_team = crud.get_team(db, team_id=team_id, organization_id=current_user.organization_id)
    if db_team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    return db_team

@router.put("/{team_id}", response_model=schemas.Team)
def update_team(
    team_id: UUID,
    team_in: schemas.TeamCreate, # Reusing TeamCreate as it has the 'name' field
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    db_team = read_team(team_id, db, current_user) # Reuse for ownership check
    return crud.update_team(db=db, db_team=db_team, team_in=team_in)

@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(
    team_id: UUID,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    db_team = read_team(team_id, db, current_user) # Reuse for ownership check
    crud.delete_team(db=db, db_team=db_team)
    return

@router.post("/{team_id}/members", response_model=schemas.Team)
def add_member_to_team(
    team_id: UUID,
    member: schemas.TeamMemberCreate,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    db_team = read_team(team_id, db, current_user) # Reuse for ownership check
    # TODO: Add check to ensure user being added is in the same organization
    crud.add_team_member(db=db, team_id=db_team.id, user_id=member.user_id, role=member.role)
    return read_team(team_id, db, current_user)

@router.delete("/{team_id}/members/{user_id}", response_model=schemas.Team)
def remove_member_from_team(
    team_id: UUID,
    user_id: UUID,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    db_team = read_team(team_id, db, current_user) # Reuse for ownership check
    db_member = crud.get_team_member(db, team_id=db_team.id, user_id=user_id)
    if db_member is None:
        raise HTTPException(status_code=404, detail="Team member not found")
    crud.remove_team_member(db=db, db_membership=db_member)
    return read_team(team_id, db, current_user)