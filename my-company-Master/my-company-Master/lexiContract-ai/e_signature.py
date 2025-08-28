import uuid
import time
from typing import List, Dict

# This is a mock e-signature service client.
# In a real application, this would be a client for DocuSign, Dropbox Sign, etc.

class MockSignatureService:
    """A mock client to simulate interactions with an e-signature provider."""

    def __init__(self):
        self.requests: Dict[str, Dict] = {}

    def send_for_signature(self, document_content: str, signers: List[Dict[str, str]]) -> str:
        """
        Simulates sending a document for signature.
        Returns a unique signature_request_id.
        """
        signature_request_id = f"sig_req_{uuid.uuid4()}"
        self.requests[signature_request_id] = {
            "status": "sent",
            "signers": signers,
            "created_at": time.time(),
            "document_content": document_content,
        }
        print(f"MockSignatureService: Created signature request {signature_request_id}")
        return signature_request_id

# Create a single, shared instance of the service
signature_service = MockSignatureService()