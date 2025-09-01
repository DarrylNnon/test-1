from sqlalchemy.orm import Session

from . import models, crud


def _check_attributes(obj_attributes: dict, policy_attributes: dict) -> bool:
    """Checks if the object's attributes match the policy's requirements."""
    for key, value in policy_attributes.items():
        if obj_attributes.get(key) != value:
            return False
    return True


def can(user: models.User, action: str, resource: models.Contract, db: Session) -> bool:
    """
    Determines if a user has permission to perform an action on a resource.
    """
    # Admins are superusers within their organization
    if user.role == "admin":
        return True

    policies = crud.get_policies_by_organization(db, organization_id=user.organization_id)

    user_attrs = {
        "role": user.role,
        "department": user.department,
        "id": str(user.id)  # For policies specific to a user
    }
    resource_attrs = {
        "department": resource.department,
        "sensitivity_level": resource.sensitivity_level.value if resource.sensitivity_level else None,
    }

    for policy in policies:
        if policy.effect != 'allow':
            continue

        if action not in policy.actions:
            continue

        if not _check_attributes(user_attrs, policy.subject_attributes) or not _check_attributes(resource_attrs, policy.resource_attributes):
            continue

        return True

    return False