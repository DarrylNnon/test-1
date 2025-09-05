from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID

from core import crud, schemas, models
from api.v1 import dependencies

router = APIRouter(
    prefix="/teams",
    tags=["Teams"],
    dependencies=[Depends(dependencies.get_current_active_user)]
)

@router.post("/", response_model=schemas.Team, status_code=status.HTTP_201_CREATED)
def create_team(
    team: schemas.TeamCreate,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can create teams")
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
    db_team = crud.get_team(db, team_id=team_id, organization_id=current_user.organization_id, options=[
        joinedload(models.Team.members).joinedload(models.TeamMembership.user),
        joinedload(models.Team.contracts)
    ])
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
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can update teams")
    db_team = crud.get_team(db, team_id=team_id, organization_id=current_user.organization_id)
    return crud.update_team(db=db, db_team=db_team, team_in=team_in)

@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(
    team_id: UUID,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can delete teams")
    db_team = crud.get_team(db, team_id=team_id, organization_id=current_user.organization_id)
    crud.delete_team(db=db, db_team=db_team)
    return

@router.post("/{team_id}/members", response_model=schemas.Team)
def add_member_to_team(
    team_id: UUID,
    member: schemas.TeamMemberCreate,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can add members to teams")
    db_team = crud.get_team(db, team_id=team_id, organization_id=current_user.organization_id)
    user_to_add = crud.get_user_by_id(db, user_id=member.user_id)
    if not user_to_add or user_to_add.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404, detail="User not found in this organization")
    if crud.get_team_member(db, team_id=db_team.id, user_id=member.user_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User is already a member of this team")
    crud.add_team_member(db=db, team_id=db_team.id, user_id=member.user_id, role=member.role)
    return crud.get_team(db, team_id=team_id, organization_id=current_user.organization_id)

@router.delete("/{team_id}/members/{user_id}", response_model=schemas.Team)
def remove_member_from_team(
    team_id: UUID,
    user_id: UUID,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can remove members from teams")
    db_team = crud.get_team(db, team_id=team_id, organization_id=current_user.organization_id)
    db_member = crud.get_team_member(db, team_id=db_team.id, user_id=user_id) # Checks if team exists
    if db_member is None:
        raise HTTPException(status_code=404, detail="Team member not found")
    crud.remove_team_member(db=db, db_membership=db_member)
    return crud.get_team(db, team_id=team_id, organization_id=current_user.organization_id)