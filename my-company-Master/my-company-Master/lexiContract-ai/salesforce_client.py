import httpx
from uuid import UUID
from sqlalchemy.orm import Session

from . import models, security, crud
from .config import settings

class SalesforceClient:
    def __init__(self, db: Session, *, organization_id: UUID):
        self.db = db
        self.organization_id = organization_id
        self.org_integration = self._get_org_integration()
        self.credentials = security.decrypt_data(self.org_integration.credentials)
        self.metadata = self.org_integration.metadata
        self.client = httpx.AsyncClient(
            base_url=self.metadata.get("instance_url"),
            headers={"Authorization": f"Bearer {self.credentials.get('access_token')}"}
        )

    def _get_org_integration(self) -> models.OrganizationIntegration:
        integration = crud.get_integration_by_name(self.db, name="Salesforce")
        if not integration:
            raise ValueError("Salesforce integration not configured in the system.")
        
        org_integration = self.db.query(models.OrganizationIntegration).filter(
            models.OrganizationIntegration.organization_id == self.organization_id,
            models.OrganizationIntegration.integration_id == integration.id,
            models.OrganizationIntegration.is_enabled == True
        ).first()

        if not org_integration:
            raise ValueError("Salesforce integration is not enabled for this organization.")
        return org_integration

    async def _refresh_access_token(self):
        """Refreshes the OAuth access token using the refresh token."""
        token_url = "https://login.salesforce.com/services/oauth2/token"
        payload = {
            "grant_type": "refresh_token",
            "client_id": settings.SALESFORCE_CLIENT_ID,
            "client_secret": settings.SALESFORCE_CLIENT_SECRET,
            "refresh_token": self.credentials.get("refresh_token"),
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, data=payload)
        
        response.raise_for_status()
        new_token_data = response.json()
        
        async def update_opportunity(self, opportunity_id: str, payload: dict):
        """Updates fields on a specific Opportunity."""
        url = f"/services/data/v58.0/sobjects/Opportunity/{opportunity_id}"
        response = await self.client.patch(url, json=payload)

        if response.status_code == 401: # Token expired
            await self._refresh_access_token()
            response = await self.client.patch(url, json=payload) # Retry

        response.raise_for_status()
        print(f"Successfully updated Opportunity {opportunity_id} in Salesforce.")

        # Update credentials in memory and in the database
        self.credentials["access_token"] = new_token_data["access_token"]
        crud.upsert_organization_integration(
            self.db,
            organization_id=self.organization_id,
            integration_id=self.org_integration.integration_id,
            credentials=self.credentials,
            metadata=self.metadata
        )
        # Update the client instance with the new token
        self.client.headers["Authorization"] = f"Bearer {self.credentials['access_token']}"
        print("Salesforce token refreshed successfully.")

    async def get_opportunity(self, opportunity_id: str) -> dict:
        """Fetches details for a specific Opportunity."""
        url = f"/services/data/v58.0/sobjects/Opportunity/{opportunity_id}"
        response = await self.client.get(url)
        
        if response.status_code == 401: # Token expired
            await self._refresh_access_token()
            response = await self.client.get(url) # Retry the request

        response.raise_for_status()
        return response.json()

    # In a real implementation, we would add methods here to:
    # - Get attached files (ContentDocumentLink, ContentVersion)
    # - Download file content (ContentVersionData)
    # - Update the Opportunity with a new status