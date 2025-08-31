import httpx
from uuid import UUID
from sqlalchemy.orm import Session

from . import models, security, crud
from .config import settings

class HubSpotClient:
    def __init__(self, db: Session, *, organization_id: UUID):
        self.db = db
        self.organization_id = organization_id
        self.org_integration = self._get_org_integration()
        self.credentials = security.decrypt_data(self.org_integration.credentials)
        self.client = httpx.AsyncClient(
            base_url="https://api.hubapi.com",
            headers={"Authorization": f"Bearer {self.credentials.get('access_token')}"}
        )

    def _get_org_integration(self) -> models.OrganizationIntegration:
        integration = crud.get_integration_by_name(self.db, name="HubSpot")
        if not integration:
            raise ValueError("HubSpot integration not configured in the system.")
        
        org_integration = self.db.query(models.OrganizationIntegration).filter(
            models.OrganizationIntegration.organization_id == self.organization_id,
            models.OrganizationIntegration.integration_id == integration.id,
            models.OrganizationIntegration.is_enabled == True
        ).first()

        if not org_integration:
            raise ValueError("HubSpot integration is not enabled for this organization.")
        return org_integration

    async def _refresh_access_token(self):
        """Refreshes the HubSpot OAuth access token."""
        token_url = "https://api.hubapi.com/oauth/v1/token"
        payload = {
            "grant_type": "refresh_token",
            "client_id": settings.HUBSPOT_CLIENT_ID,
            "client_secret": settings.HUBSPOT_CLIENT_SECRET,
            "refresh_token": self.credentials.get("refresh_token"),
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, data=payload)
        
        response.raise_for_status()
        new_token_data = response.json()
        
        async def update_deal(self, deal_id: str, payload: dict):
        """Updates properties on a specific Deal."""
        url = f"/crm/v3/objects/deals/{deal_id}"
        response = await self.client.patch(url, json=payload)

        if response.status_code == 401: # Token expired
            await self._refresh_access_token()
            response = await self.client.patch(url, json=payload) # Retry

        response.raise_for_status()
        print(f"Successfully updated Deal {deal_id} in HubSpot.")

        async def update_deal(self, deal_id: str, payload: dict):
        """Updates properties on a specific Deal."""
        url = f"/crm/v3/objects/deals/{deal_id}"
        response = await self.client.patch(url, json=payload)

        if response.status_code == 401: # Token expired
            await self._refresh_access_token()
            response = await self.client.patch(url, json=payload) # Retry

        response.raise_for_status()
        print(f"Successfully updated Deal {deal_id} in HubSpot.")

        self.credentials["access_token"] = new_token_data["access_token"]
        crud.upsert_organization_integration(
            self.db,
            organization_id=self.organization_id,
            integration_id=self.org_integration.integration_id,
            credentials=self.credentials,
            metadata=self.org_integration.metadata or {}
        )
        self.client.headers["Authorization"] = f"Bearer {self.credentials['access_token']}"
        print("HubSpot token refreshed successfully.")

    async def get_deal(self, deal_id: str) -> dict:
        """Fetches details for a specific Deal, including the dealname property."""
        url = f"/crm/v3/objects/deals/{deal_id}?properties=dealname"
        response = await self.client.get(url)
        
        if response.status_code == 401: # Token expired
            await self._refresh_access_token()
            response = await self.client.get(url) # Retry

        response.raise_for_status()
        return response.json()