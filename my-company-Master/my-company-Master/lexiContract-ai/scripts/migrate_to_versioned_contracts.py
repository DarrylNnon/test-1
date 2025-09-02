import sys
import os
import uuid
from sqlalchemy import text

# Add the project root to the Python path to allow imports from core
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'lexiContract-ai')))

from core.database import SessionLocal

def migrate_data():
    """
    One-time script to migrate existing contracts to the new versioned structure.

    PRE-REQUISITES: This script should be run AFTER the database schema has been
    updated with the new tables and columns (e.g., `contract_versions` table,
    `contract_version_id` columns on suggestions/comments), but BEFORE the old
    columns (`full_text`, `analysis_status`, `uploader_id` on `contracts`) are dropped.

    The script is designed to be idempotent and can be safely re-run.
    """
    print("Starting contract data migration to versioned structure...")
    db = SessionLocal()
    
    # We use a raw connection to execute SQL that references the old schema structure
    # without being affected by the updated SQLAlchemy ORM models.
    connection = db.connection()

    try:
        # 1. Fetch all existing contracts that might need migration.
        # We select the columns that are being moved from `contracts` to `contract_versions`.
        # This query will fail if the old columns have already been dropped.
        contracts_to_migrate_result = connection.execute(text(
            "SELECT id, uploader_id, full_text, analysis_status, created_at FROM contracts"
        ))
        contracts_to_migrate = contracts_to_migrate_result.fetchall()
        
        print(f"Found {len(contracts_to_migrate)} total contracts to check for migration.")

        migrated_count = 0
        for contract_row in contracts_to_migrate:
            contract_id, uploader_id, full_text, analysis_status, created_at = contract_row

            # Idempotency Check: See if a V1 already exists for this contract.
            version_exists_result = connection.execute(
                text("SELECT 1 FROM contract_versions WHERE contract_id = :cid AND version_number = 1"),
                {"cid": contract_id}
            ).first()

            if version_exists_result:
                continue

            print(f"  - Migrating contract {contract_id}...")

            # 2. Create a new ContractVersion (V1) for the contract.
            new_version_id = uuid.uuid4()
            connection.execute(
                text("""
                    INSERT INTO contract_versions (id, contract_id, version_number, full_text, analysis_status, created_at, uploader_id)
                    VALUES (:id, :contract_id, 1, :full_text, :analysis_status, :created_at, :uploader_id)
                """),
                {
                    "id": new_version_id, "contract_id": contract_id, "full_text": full_text,
                    "analysis_status": analysis_status, "created_at": created_at, "uploader_id": uploader_id,
                }
            )

            # 3. Update related AnalysisSuggestions to point to the new version.
            connection.execute(
                text("UPDATE analysis_suggestions SET contract_version_id = :version_id WHERE contract_id = :contract_id"),
                {"version_id": new_version_id, "contract_id": contract_id}
            )

            # 4. Update related UserComments to point to the new version.
            connection.execute(
                text("UPDATE user_comments SET contract_version_id = :version_id WHERE contract_id = :contract_id"),
                {"version_id": new_version_id, "contract_id": contract_id}
            )
            
            migrated_count += 1

        db.commit()
        print(f"Migration complete. Migrated {migrated_count} new contracts.")

    except Exception as e:
        print(f"\nERROR: An error occurred during migration: {e}")
        print("Rolling back changes.")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_data()