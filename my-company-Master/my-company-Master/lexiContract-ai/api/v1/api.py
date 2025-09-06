from fastapi import APIRouter
from .endpoints import (
    auth, users, contracts, analytics, integrations, policies, drafting, management,
    signature, search, compliance, reports, teams, clause_library, templates,
    notifications, billing, testing, audit, playbooks, compliance_analytics
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(contracts.router, prefix="/contracts", tags=["contracts"])
api_router.include_router(clause_library.router, prefix="/clauses", tags=["Clause Library"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
api_router.include_router(testing.router, prefix="/testing", tags=["testing"], include_in_schema=False)
api_router.include_router(templates.router, prefix="/templates", tags=["templates"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(integrations.router, prefix="/integrations", tags=["integrations"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(playbooks.router, prefix="/playbooks", tags=["Compliance Playbooks"])
api_router.include_router(compliance_analytics.router, prefix="/compliance-analytics", tags=["Compliance Analytics"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(teams.router, prefix="/teams", tags=["teams"])
api_router.include_router(management.router, tags=["Post-Signature Management"])
api_router.include_router(drafting.router, prefix="/drafting", tags=["AI Drafting"])