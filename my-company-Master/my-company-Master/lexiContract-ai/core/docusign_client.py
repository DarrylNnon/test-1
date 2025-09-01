import time
from docusign_esign import ApiClient, ApiException, EnvelopesApi, EnvelopeDefinition, Document, Signer as DocuSignSigner, SignHere, Tabs, Recipients, RecipientViewRequest
from typing import Optional, List, Dict
import base64

from . import security, models
from .config import settings

class DocuSignClient:
    """
    A client for interacting with the DocuSign eSignature API using JWT Grant authentication.
    """
    _api_client: ApiClient
    _access_token: Optional[str] = None
    _token_expires_at: Optional[float] = None
    _account_id: Optional[str] = None

    def __init__(self, org_integration: models.OrganizationIntegration):
        if not org_integration or not org_integration.credentials:
            raise ValueError("DocuSign integration credentials are not configured.")

        try:
            creds = security.decrypt_data(org_integration.credentials)
            self.integration_key = creds['integration_key']
            self.user_id = creds['user_id']
            self.private_key = creds['rsa_private_key'].encode('utf-8')
            self.base_path = settings.DOCUSIGN_BASE_PATH
        except Exception as e:
            raise ValueError(f"Failed to decrypt or parse DocuSign credentials: {e}")

        self._api_client = ApiClient()
        self._api_client.host = self.base_path

    def _get_access_token(self) -> str:
        """Obtains a new access token using the JWT Grant flow."""
        try:
            token_response = self._api_client.request_jwt_user_token(
                client_id=self.integration_key,
                user_id=self.user_id,
                oauth_host_name=settings.DOCUSIGN_OAUTH_HOST,
                private_key_bytes=self.private_key,
                expires_in=3600,  # Token is valid for 1 hour
                scopes=["signature", "impersonation"]
            )
            self._access_token = token_response.access_token
            self._token_expires_at = time.time() + int(token_response.expires_in) - 60 # 60s buffer

            # After getting token, get user info to find the account_id and base_uri
            user_info = self._api_client.get_user_info(self._access_token)
            accounts = user_info.accounts
            target_account = next((acc for acc in accounts if acc.is_default), accounts[0])
            self._account_id = target_account.account_id
            self._api_client.host = target_account.base_uri

            return self._access_token
        except ApiException as e:
            raise Exception(f"Error requesting DocuSign JWT token: {e.body}") from e

    def get_api_client(self) -> ApiClient:
        """Returns a configured ApiClient instance with a valid access token."""
        if not self._access_token or not self._token_expires_at or time.time() >= self._token_expires_at:
            self._get_access_token()
        self._api_client.set_default_header("Authorization", f"Bearer {self._access_token}")
        return self._api_client

    def create_and_send_envelope(self, *, contract_filename: str, document_bytes: bytes, signers: List[dict], email_subject: str, email_body: str) -> dict:
        """
        Creates a DocuSign envelope with one document and a list of signers, and sends it.
        """
        api_client = self.get_api_client()
        envelopes_api = EnvelopesApi(api_client)

        envelope_definition = EnvelopeDefinition(
            email_subject=email_subject,
            email_blurb=email_body,
            status="sent"
        )

        doc = Document(
            document_base64=base64.b64encode(document_bytes).decode("ascii"),
            name=contract_filename,
            file_extension=contract_filename.split('.')[-1],
            document_id="1"
        )
        envelope_definition.documents = [doc]

        docusign_signers = []
        for signer_data in signers:
            signer = DocuSignSigner(
                email=signer_data['email'],
                name=signer_data['name'],
                recipient_id=str(signer_data['signing_order']),
                routing_order=str(signer_data['signing_order']),
                client_user_id=str(signer_data['signing_order']) # Required for embedded signing
            )
            # Use anchor text to place the signature tab. The text must exist in the document.
            sign_here = SignHere(anchor_string=f"/s{signer_data['signing_order']}/", anchor_units="pixels", anchor_y_offset="-10", anchor_x_offset="-20")
            signer.tabs = Tabs(sign_here_tabs=[sign_here])
            docusign_signers.append(signer)

        envelope_definition.recipients = Recipients(signers=docusign_signers)

        try:
            results = envelopes_api.create_envelope(account_id=self._account_id, envelope_definition=envelope_definition)
            return results.to_dict()
        except ApiException as e:
            raise Exception(f"DocuSign API error: {e.body}") from e

    def create_recipient_view(self, *, envelope_id: str, signer_name: str, signer_email: str, client_user_id: str, return_url: str) -> Dict:
        """
        Generates a URL for an embedded signing ceremony for a specific recipient.
        """
        api_client = self.get_api_client()
        envelopes_api = EnvelopesApi(api_client)

        recipient_view_request = RecipientViewRequest(
            authentication_method="none",  # The user is already authenticated in our app
            client_user_id=client_user_id, # This MUST match the client_user_id used when creating the envelope
            email=signer_email,
            user_name=signer_name,
            return_url=return_url # The URL to redirect to after signing
        )

        try:
            results = envelopes_api.create_recipient_view(
                account_id=self._account_id,
                envelope_id=envelope_id,
                recipient_view_request=recipient_view_request
            )
            return results.to_dict()
        except ApiException as e:
            raise Exception(f"DocuSign API error creating recipient view: {e.body}") from e