from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID
from typing import Dict, Any, List

from . import models

# --- Security Whitelists ---
# To prevent arbitrary code execution and data exposure, we define exactly what can be queried.

ALLOWED_MODELS = {
    "contracts": models.Contract,
    "analysis_suggestions": models.AnalysisSuggestion,
}

ALLOWED_FIELDS = {
    "contracts": {
        "id": models.Contract.id,
        "negotiation_status": models.Contract.negotiation_status,
        "created_at": models.Contract.created_at,
        "updated_at": models.Contract.updated_at,
    },
    "analysis_suggestions": {
        "id": models.AnalysisSuggestion.id,
        "risk_category": models.AnalysisSuggestion.risk_category,
        "status": models.AnalysisSuggestion.status,
        # Note: created_at is not on this model, so time-series is not yet supported.
    },
}

ALLOWED_AGGREGATIONS = {
    "count": func.count,
    "avg": func.avg,
}

ALLOWED_OPERATORS = {
    "eq": lambda f, v: f == v,
    "neq": lambda f, v: f != v,
    "gt": lambda f, v: f > v,
    "gte": lambda f, v: f >= v,
    "lt": lambda f, v: f < v,
    "lte": lambda f, v: f <= v,
    "in": lambda f, v: f.in_(v),
    "is_null": lambda f, v: f.is_(None) if v else f.isnot(None),
}

def execute_report_query(config: Dict[str, Any], organization_id: UUID, db: Session) -> List[Dict[str, Any]]:
    """
    Dynamically builds and executes a SQLAlchemy query based on a report configuration.
    """
    # 1. Parse and validate the data source from the configuration
    data_source = config.get("dataSource")
    if data_source not in ALLOWED_MODELS:
        raise ValueError(f"Invalid data source: {data_source}")

    base_model = ALLOWED_MODELS[data_source]
    allowed_model_fields = ALLOWED_FIELDS[data_source]

    # 2. Build the list of columns to select (metrics and dimensions)
    columns_to_select = []
    group_by_column = None
    group_by_config = config.get("groupBy")
    if group_by_config:
        group_by_field_name = group_by_config.get("field")
        if group_by_field_name not in allowed_model_fields:
            raise ValueError(f"Invalid groupBy field: {group_by_field_name}")
        group_by_column = allowed_model_fields[group_by_field_name]
        columns_to_select.append(group_by_column.label(group_by_field_name))

    for metric in config.get("metrics", []):
        field_name = metric.get("field")
        agg_name = metric.get("aggregation")
        if field_name not in allowed_model_fields or agg_name not in ALLOWED_AGGREGATIONS:
            raise ValueError(f"Invalid metric or aggregation: {field_name}, {agg_name}")
        
        metric_column = allowed_model_fields[field_name]
        agg_func = ALLOWED_AGGREGATIONS[agg_name]
        columns_to_select.append(agg_func(metric_column).label(f"{field_name}_{agg_name}"))

    if not columns_to_select:
        raise ValueError("No metrics or groupBy fields specified.")

    # 3. Construct the query with selected columns and mandatory organization filter
    query = db.query(*columns_to_select)

    if data_source == "contracts":
        query = query.filter(base_model.organization_id == organization_id)
    elif data_source == "analysis_suggestions":
        # Join through the contract relationship to filter by organization
        query = query.join(models.Contract, models.AnalysisSuggestion.contract_id == models.Contract.id).filter(
            models.Contract.organization_id == organization_id
        )
    else:
        raise ValueError(f"Organization filtering not configured for data source: {data_source}")

    # 4. Apply user-defined filters
    for f in config.get("filters", []):
        field_name, op_name, value = f.get("field"), f.get("operator"), f.get("value")
        if field_name not in allowed_model_fields or op_name not in ALLOWED_OPERATORS:
            raise ValueError(f"Invalid filter field or operator: {field_name}, {op_name}")
        
        query = query.filter(ALLOWED_OPERATORS[op_name](allowed_model_fields[field_name], value))

    # 5. Apply grouping
    if group_by_config and group_by_column is not None:
        query = query.group_by(group_by_column)

    # 6. Execute and return results
    results = query.all()
    return [row._asdict() for row in results]