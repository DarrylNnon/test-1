import asyncio
import secrets
from uuid import UUID

from core import crud, models, security
from core.database import SessionLocal


def _generate_random_string(length: int = 16) -> str:
    """Generates a secure, URL-safe random string."""
    return secrets.token_urlsafe(length)


async def provision_new_environment(sandbox_id: UUID, org_id: UUID):
    """
    Simulates the long-running task of provisioning a new sandbox environment.
    This would be run in a background worker (e.g., Celery).
    """
    print(f"Starting sandbox provisioning for sandbox_id: {sandbox_id}")
    db = SessionLocal()
    try:
        # Simulate IaC provisioning (e.g., running Terraform/Pulumi)
        await asyncio.sleep(30)  # Simulate a 30-second provisioning time

        # Generate mock credentials for the new environment
        # In a real scenario, these would come from the provisioning output
        mock_db_user = f"user_{str(org_id)[:4]}"
        mock_db_pass = _generate_random_string(16)
        mock_db_host = f"db.sandbox.lexicontract.ai"
        mock_db_name = f"sandbox_{str(sandbox_id)[:8]}"

        connection_string = f"postgresql://{mock_db_user}:{mock_db_pass}@{mock_db_host}:5432/{mock_db_name}"

        # Encrypt the connection string before storing
        encrypted_connection_string_bytes = security.encrypt_data(connection_string)

        # Update the database record to 'active' with the new credentials
        crud.update_sandbox_environment(
            db,
            sandbox_id=sandbox_id,
            status=models.SandboxEnvironmentStatus.active,
            connection_string_bytes=encrypted_connection_string_bytes,
        )
        print(f"Successfully provisioned sandbox_id: {sandbox_id}")

    except Exception as e:
        print(f"Failed to provision sandbox_id: {sandbox_id}. Error: {e}")
        crud.update_sandbox_environment(db, sandbox_id=sandbox_id, status=models.SandboxEnvironmentStatus.deleted)
    finally:
        db.close()