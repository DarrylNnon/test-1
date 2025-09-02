import httpx
import io
from uuid import UUID
from sqlalchemy.orm import Session

from . import models, security, crud
from .config import settings

class GoogleDriveClient:
    def __init__(self, db: Session, *, organization_id: UUID):
        self.db = db
        self.organization_id = organization_id
        self.org_integration = self._get_org_integration()
        self.credentials = security.decrypt_data(self.org_integration.credentials)
        self.client = httpx.AsyncClient(
            base_url="https://www.googleapis.com",
            headers={"Authorization": f"Bearer {self.credentials.get('access_token')}"}
        )

    def _get_org_integration(self) -> models.OrganizationIntegration:
        integration = crud.get_integration_by_name(self.db, name="Google Drive")
        if not integration:
            raise ValueError("Google Drive integration not configured in the system.")
        
        org_integration = self.db.query(models.OrganizationIntegration).filter(
            models.OrganizationIntegration.organization_id == self.organization_id,
            models.OrganizationIntegration.integration_id == integration.id,
            models.OrganizationIntegration.is_enabled == True
        ).first()

        if not org_integration:
            raise ValueError("Google Drive integration is not enabled for this organization.")
        return org_integration

    async def _refresh_access_token(self):
        """Refreshes the Google OAuth access token."""
        token_url = "https://oauth2.googleapis.com/token"
        payload = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "refresh_token": self.credentials.get("refresh_token"),
            "grant_type": "refresh_token",
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, data=payload)
        
        response.raise_for_status()
        new_token_data = response.json()
        
        self.credentials["access_token"] = new_token_data["access_token"]
        crud.upsert_organization_integration(
            self.db,
            organization_id=self.organization_id,
            integration_id=self.org_integration.integration_id,
            credentials=self.credentials,
            metadata=self.org_integration.metadata or {}
        )
        self.client.headers["Authorization"] = f"Bearer {self.credentials['access_token']}"
        print("Google Drive token refreshed successfully.")

    async def list_files(self, page_token: str | None = None, search_query: str | None = None) -> dict:
        """Lists files from the user's Google Drive."""
        url = "/drive/v3/files"
        # Query for common document types, owned by the user, not in trash
        q = "'me' in owners and trashed = false and (mimeType='application/pdf' or mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType='text/plain')"
        if search_query:
            q += f" and name contains '{search_query}'"

        params = {
            "q": q,
            "pageSize": 20,
            "fields": "nextPageToken, files(id, name, mimeType, modifiedTime)",
            "pageToken": page_token
        }
        response = await self.client.get(url, params=params)
        if response.status_code == 401:
            await self._refresh_access_token()
            response = await self.client.get(url, params=params) # Retry
        response.raise_for_status()
        return response.json()

    async def download_file(self, file_id: str) -> bytes:
        """Downloads a file's content from Google Drive."""
        url = f"/drive/v3/files/{file_id}?alt=media"
        response = await self.client.get(url)
        if response.status_code == 401:
            await self._refresh_access_token()
            response = await self.client.get(url) # Retry
        response.raise_for_status()
        return response.content