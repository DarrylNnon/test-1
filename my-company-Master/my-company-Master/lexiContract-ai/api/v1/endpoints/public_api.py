from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import uuid

from .... import core, models, schemas, analyzer, utils
from .. import dependencies

router = APIRouter()

@router.get("/contracts", response_model=List[schemas.PublicContract], summary="List Contracts")
def list_public_contracts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(dependencies.get_db),
    api_key: models.ApiKey = Depends(dependencies.get_valid_api_key),
):
    """
    Retrieve a list of contracts for your organization.
    """
    contracts = core.crud.get_contracts_by_organization(db, organization_id=api_key.organization_id, skip=skip, limit=limit)
    
    public_contracts = []
    for contract in contracts:
        latest_version = contract.versions[-1] if contract.versions else None
        public_contracts.append(
            schemas.PublicContract(
                id=contract.id,
                filename=contract.filename,
                created_at=contract.created_at,
                negotiation_status=contract.negotiation_status,
                signature_status=contract.signature_status,
                analysis_status=latest_version.analysis_status if latest_version else models.AnalysisStatus.pending
            )
        )
    return public_contracts

@router.get("/contracts/{contract_id}", response_model=schemas.PublicContractDetail, summary="Get Contract Details")
def get_public_contract(
    contract_id: uuid.UUID,
    db: Session = Depends(dependencies.get_db),
    api_key: models.ApiKey = Depends(dependencies.get_valid_api_key),
):
    """
    Retrieve detailed information for a single contract, including analysis suggestions for the latest version.
    """
    contract = core.crud.get_contract_by_id(db, contract_id=contract_id, organization_id=api_key.organization_id)
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")

    latest_version = contract.versions[-1] if contract.versions else None
    suggestions = latest_version.suggestions if latest_version else []

    return schemas.PublicContractDetail(
        id=contract.id,
        filename=contract.filename,
        created_at=contract.created_at,
        negotiation_status=contract.negotiation_status,
        signature_status=contract.signature_status,
        analysis_status=latest_version.analysis_status if latest_version else models.AnalysisStatus.pending,
        suggestions=suggestions
    )

@router.post("/contracts", response_model=schemas.PublicContract, status_code=status.HTTP_202_ACCEPTED, summary="Upload Contract for Analysis")
async def upload_public_contract(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(dependencies.get_db),
    api_key: models.ApiKey = Depends(dependencies.get_valid_api_key),
):
    """
    Upload a new contract document for analysis. The analysis is performed
    asynchronously. The initial response will show a 'pending' status.
    """
    file_contents = await file.read()
    try:
        full_text = utils.extract_text_from_file(file_contents, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    db_contract = core.crud.create_contract_with_initial_version(
        db=db,
        filename=file.filename,
        full_text=full_text,
        user_id=api_key.user_id, # Attribute the upload to the user who created the key
        organization_id=api_key.organization_id
    )

    initial_version = db_contract.versions[0]
    background_tasks.add_task(
        analyzer.analyze_contract,
        version_id=initial_version.id,
        file_contents=file_contents,
        filename=file.filename
    )

    return schemas.PublicContract.from_orm(db_contract)