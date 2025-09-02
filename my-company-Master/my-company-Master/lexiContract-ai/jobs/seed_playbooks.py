import sys
import os

# Add the project root to the Python path to allow imports from core
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'lexiContract-ai')))

from core import crud, schemas
from core.database import SessionLocal
from sqlalchemy.orm import Session

def seed_initial_playbooks(db: Session):
    """
    Seeds the database with the initial set of general compliance playbooks.
    This script is designed to be idempotent.
    """
    print("Seeding general compliance playbooks...")

    # --- Define the GDPR/CCPA PII Detection Playbook ---
    playbook_name = "GDPR/CCPA PII Detection"
    playbook_data = schemas.CompliancePlaybookCreate(
        name=playbook_name,
        description="Automatically scans contracts for clauses related to the handling of Personally Identifiable Information (PII) under GDPR and CCPA regulations.",
        is_active=True,
        industry=None, # This is a general playbook
        rules=[
            schemas.PlaybookRuleCreate(
                name="Data Processing Agreement (DPA) Reference",
                description="Flags any mention of a Data Processing Agreement or Addendum. This is a critical component for GDPR compliance when a third party processes personal data.",
                pattern=r"data processing (agreement|addendum)",
                risk_category="Data Privacy"
            ),
            schemas.PlaybookRuleCreate(
                name="Definition of Personal Data",
                description="Identifies clauses that define or reference 'Personal Data' or 'Personal Information', which are key terms under GDPR and CCPA.",
                pattern=r"personal (data|information)|pii",
                risk_category="Data Privacy"
            ),
            schemas.PlaybookRuleCreate(
                name="Data Subject Rights",
                description="Flags language related to the rights of data subjects (e.g., right to access, erasure). Ensure these clauses align with your company's obligations.",
                pattern=r"right to (access|erasure|rectification|portability)|data subject request",
                risk_category="Compliance"
            ),
            schemas.PlaybookRuleCreate(
                name="Cross-Border Data Transfer",
                description="Detects clauses concerning the transfer of data across international borders, which are strictly regulated by GDPR (e.g., SCCs, BCRs).",
                pattern=r"cross-border data transfer|standard contractual clauses|scc",
                risk_category="Compliance"
            ),
            schemas.PlaybookRuleCreate(
                name="Data Breach Notification",
                description="Identifies clauses that specify obligations related to notifying parties in the event of a data breach. The notification timeline is a critical compliance point.",
                pattern=r"data breach|security incident notification",
                risk_category="Security"
            ),
        ]
    )

    # Check if the playbook already exists
    existing_playbook = db.query(models.CompliancePlaybook).filter(models.CompliancePlaybook.name == playbook_name).first()
    if not existing_playbook:
        print(f"Creating playbook: '{playbook_name}'")
        crud.create_compliance_playbook(db, playbook=playbook_data)
        print("Successfully seeded playbook.")
    else:
        print(f"Playbook '{playbook_name}' already exists. Skipping.")

def seed_industry_playbooks(db: Session):
    """
    Seeds the database with industry-specific playbooks.
    """
    print("Seeding industry-specific playbooks...")

    # --- HIPAA Playbook ---
    hipaa_playbook_name = "HIPAA Business Associate Agreement (BAA) Review"
    hipaa_playbook_data = schemas.CompliancePlaybookCreate(
        name=hipaa_playbook_name,
        description="Scans for key terms and clauses required in a Business Associate Agreement under HIPAA.",
        is_active=True,
        industry="Healthcare",
        rules=[
            schemas.PlaybookRuleCreate(
                name="Business Associate Agreement (BAA) Identification",
                description="Identifies the document as a BAA or containing BAA provisions.",
                pattern=r"business associate (agreement|addendum)|baa",
                risk_category="HIPAA"
            ),
            schemas.PlaybookRuleCreate(
                name="Definition of PHI",
                description="Flags definitions of Protected Health Information (PHI).",
                pattern=r"protected health information|phi",
                risk_category="HIPAA"
            ),
            schemas.PlaybookRuleCreate(
                name="Permitted Uses and Disclosures of PHI",
                description="Identifies clauses outlining the permitted uses and disclosures of PHI.",
                pattern=r"permitted (uses|disclosures) of phi",
                risk_category="HIPAA"
            ),
            schemas.PlaybookRuleCreate(
                name="Safeguards for PHI",
                description="Flags clauses requiring appropriate safeguards to protect PHI.",
                pattern=r"safeguards for phi|protect the (confidentiality|integrity|availability) of phi",
                risk_category="HIPAA"
            ),
            schemas.PlaybookRuleCreate(
                name="Breach Notification for PHI",
                description="Identifies obligations related to reporting a breach of unsecured PHI.",
                pattern=r"breach of unsecured phi",
                risk_category="HIPAA"
            ),
        ]
    )
    existing_hipaa = db.query(models.CompliancePlaybook).filter(models.CompliancePlaybook.name == hipaa_playbook_name).first()
    if not existing_hipaa:
        print(f"Creating playbook: '{hipaa_playbook_name}'")
        crud.create_compliance_playbook(db, playbook=hipaa_playbook_data)
        print("Successfully seeded HIPAA playbook.")
    else:
        print(f"Playbook '{hipaa_playbook_name}' already exists. Skipping.")

    # --- FAR Playbook ---
    far_playbook_name = "Federal Acquisition Regulation (FAR) Review"
    far_playbook_data = schemas.CompliancePlaybookCreate(
        name=far_playbook_name,
        description="Scans for key clauses from the Federal Acquisition Regulation (FAR) common in U.S. government contracts.",
        is_active=True,
        industry="Government",
        rules=[
            schemas.PlaybookRuleCreate(
                name="FAR Clause Reference",
                description="Identifies specific FAR clause citations (e.g., FAR 52.227-14).",
                pattern=r"far \d{2}\.\d{3}-\d{1,2}",
                risk_category="FAR"
            ),
            schemas.PlaybookRuleCreate(
                name="Cost Accounting Standards (CAS)",
                description="Flags references to Cost Accounting Standards (CAS), which apply to many government contracts.",
                pattern=r"cost accounting standards|cas-covered",
                risk_category="FAR"
            ),
            schemas.PlaybookRuleCreate(
                name="Termination for Convenience",
                description="Identifies the government's right to terminate the contract for convenience.",
                pattern=r"termination for convenience",
                risk_category="FAR"
            ),
            schemas.PlaybookRuleCreate(
                name="Changes Clause",
                description="Flags the Changes Clause, which allows the government to make unilateral changes to the contract.",
                pattern=r"changes clause",
                risk_category="FAR"
            ),
            schemas.PlaybookRuleCreate(
                name="Disputes Clause",
                description="Identifies the process for handling disputes under the contract.",
                pattern=r"disputes clause",
                risk_category="FAR"
            ),
        ]
    )
    existing_far = db.query(models.CompliancePlaybook).filter(models.CompliancePlaybook.name == far_playbook_name).first()
    if not existing_far:
        print(f"Creating playbook: '{far_playbook_name}'")
        crud.create_compliance_playbook(db, playbook=far_playbook_data)
        print("Successfully seeded FAR playbook.")
    else:
        print(f"Playbook '{far_playbook_name}' already exists. Skipping.")

def seed_geopolitical_playbooks(db: Session):
    """
    Seeds the database with geopolitical risk playbooks.
    """
    print("Seeding Geopolitical Risk playbooks...")

    playbook_name = "Geopolitical Risk Analysis"
    playbook_data = schemas.CompliancePlaybookCreate(
        name=playbook_name,
        description="Identifies governing law and jurisdiction clauses to flag potential risks associated with international contracts.",
        is_active=True,
        industry=None, # This is a general playbook
        rules=[
            schemas.PlaybookRuleCreate(
                name="Governing Law & Jurisdiction Clause",
                description="Identifies governing law and jurisdiction clauses to check for potential risks.",
                # This regex looks for common phrases and captures up to the end of the sentence (or a reasonable character limit).
                pattern=r"(governed by|jurisdiction of|venue for any dispute)[^.]{5,150}",
                risk_category="Geopolitical Risk"
            ),
        ]
    )

    existing_playbook = db.query(models.CompliancePlaybook).filter(models.CompliancePlaybook.name == playbook_name).first()
    if not existing_playbook:
        print(f"Creating playbook: '{playbook_name}'")
        crud.create_compliance_playbook(db, playbook=playbook_data)
        print("Successfully seeded Geopolitical Risk playbook.")
    else:
        print(f"Playbook '{playbook_name}' already exists. Skipping.")

if __name__ == "__main__":
    # Need to import models here for the query to work within the script context
    from core import models
    db = SessionLocal()
    try:
        seed_initial_playbooks(db)
        seed_industry_playbooks(db)
        seed_geopolitical_playbooks(db)
    finally:
        db.close()