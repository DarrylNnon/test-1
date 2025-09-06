import uuid
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status

from . import models

# A mapping from report model names to SQLAlchemy models
# This acts as a safelist for what data can be reported on.
MODEL_MAP = {
    "Contract": models.Contract,
    "User": models.User,
    "TrackedObligation": models.TrackedObligation,
    "ContractMilestone": models.ContractMilestone,
}

# A mapping from string operators in the report definition to SQLAlchemy functions
# This prevents arbitrary function execution.
OPERATOR_MAP = {
    "equals": lambda col, val: col == val,
    "not_equals": lambda col, val: col != val,
    "contains": lambda col, val: col.contains(val, autoescape=True),
    "greater_than": lambda col, val: col > val,
    "less_than": lambda col, val: col < val,
    "is_in": lambda col, val: col.in_(val),
    "is_not_in": lambda col, val: ~col.in_(val),
}

def execute_report_query(db: Session, report: models.CustomReport, organization_id: uuid.UUID) -> List[Dict[str, Any]]:
    """
    Dynamically builds and executes a SQLAlchemy query based on a CustomReport definition.
    Ensures that all queries are scoped to the user's organization for security.
    """
    definition = report.definition
    model_name = definition.get("model")
    columns = definition.get("columns", [])
    filters = definition.get("filters", [])

    if not model_name or model_name not in MODEL_MAP:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid model '{model_name}' in report definition.")

    model = MODEL_MAP[model_name]

    if not hasattr(model, "organization_id"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Model '{model_name}' cannot be used in reports as it is not organization-scoped.")

    if not columns:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Report definition must include at least one column.")

    # Start building the query by selecting the safe-listed columns
    query = select(*[getattr(model, col) for col in columns if hasattr(model, col)])

    # CRITICAL: Always filter by the user's organization for data isolation.
    query = query.where(model.organization_id == organization_id)

    # Apply filters from the report definition
    for f in filters:
        col_name = f.get("column")
        op_name = f.get("operator")
        value = f.get("value")

        if not all([col_name, op_name, value is not None]) or not hasattr(model, col_name) or op_name not in OPERATOR_MAP:
            continue # Skip malformed or unsafe filters

        column_attr = getattr(model, col_name)
        operator_func = OPERATOR_MAP[op_name]
        
        query = query.where(operator_func(column_attr, value))

    # Execute the query and return the results as a list of dictionaries
    results = db.execute(query).mappings().all()
    return [dict(row) for row in results]