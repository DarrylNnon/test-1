import time
import io
import re
from pypdf import PdfReader
import json
from pathlib import Path
from sqlalchemy.orm import joinedload

from . import crud, models, schemas
from .core.search import search_service
from .database import SessionLocal

# Load Geopolitical Risk Data on startup
GEOPOLITICAL_RISK_DATA = {}
try:
    risk_data_path = Path(__file__).parent / "core/data/geopolitical_risk.json"
    with open(risk_data_path, 'r') as f:
        GEOPOLITICAL_RISK_DATA = json.load(f)
except (FileNotFoundError, json.JSONDecodeError) as e:
    print(f"Warning: Could not load geopolitical risk data. {e}")

def _handle_geopolitical_rule(rule, full_text):
    """
    Handles the special case for geopolitical risk.
    1. Finds the clause using the rule's pattern.
    2. Extracts potential locations from the clause.
    3. Checks extracted locations against the risk data.
    """
    suggestions = []
    all_locations = {**GEOPOLITICAL_RISK_DATA.get('countries', {}), **GEOPOLITICAL_RISK_DATA.get('states', {})}
    if not all_locations:
        return suggestions

    # Create a regex to find any of the known locations
    location_pattern = r'\b(' + '|'.join(re.escape(loc) for loc in all_locations.keys()) + r')\b'

    try:
        # 1. Find the governing law clause
        for match in re.finditer(rule.pattern, full_text, re.IGNORECASE):
            clause_text = match.group(0)
            
            # 2. Find a known location within that clause
            location_match = re.search(location_pattern, clause_text, re.IGNORECASE)
            
            if location_match:
                location_name = next((key for key in all_locations if key.lower() == location_match.group(0).lower()), None)
                if location_name:
                    risk_info = all_locations[location_name]
                    suggestions.append(schemas.AnalysisSuggestionCreate(
                        start_index=match.start(),
                        end_index=match.end(),
                        original_text=match.group(0),
                        suggested_text=None,
                        comment=f"Jurisdiction: {location_name}. Risk: {risk_info.get('risk', 'Unknown')}. {risk_info.get('comment', '')}",
                        risk_category=rule.risk_category
                    ))
    except re.error as e:
        print(f"Error processing regex for geopolitical rule '{rule.name}': {e}")
        
    return suggestions

def _handle_standard_rule(rule, full_text):
    """Handles standard regex-based rule matching."""
    suggestions = []
    try:
        for match in re.finditer(rule.pattern, full_text, re.IGNORECASE):
            suggestions.append(schemas.AnalysisSuggestionCreate(
                start_index=match.start(),
                end_index=match.end(),
                original_text=match.group(0),
                suggested_text=None,
                comment=rule.description,
                risk_category=rule.risk_category
            ))
    except re.error as e:
        print(f"Error processing regex for rule '{rule.name}': {e}")
    return suggestions

def analyze_contract(version_id: str, file_contents: bytes, filename: str):
    """
    Processes a contract: extracts text, runs AI analysis, and applies compliance playbooks for eligible organizations.
    """
    print(f"Starting analysis for contract version: {version_id}")
    db = SessionLocal()
    try:
        # Eagerly load the parent contract and organization to check for subscription status
        db_version = db.query(models.ContractVersion).options(
            joinedload(models.ContractVersion.contract)
            .joinedload(models.Contract.organization)
        ).filter(models.ContractVersion.id == version_id).first()
        if not db_version:
            raise ValueError(f"ContractVersion with ID {version_id} not found.")

        crud.update_contract_version_status(db, version_id=version_id, status=models.AnalysisStatus.in_progress)

        # --- Text Extraction ---
        extracted_text = ""
        if filename.lower().endswith('.pdf'):
            reader = PdfReader(io.BytesIO(file_contents))
            for page in reader.pages:
                extracted_text += page.extract_text() or "" + "\n"
            print(f"Successfully extracted {len(extracted_text)} characters from PDF: {filename}")
        elif filename.lower().endswith('.txt'):
            # Assuming txt files are utf-8
            extracted_text = file_contents.decode('utf-8')
            print(f"Successfully read text file: {filename}")
        else:
            raise ValueError(f"Unsupported file type: {filename}. Only .pdf and .txt are supported.")

        # --- AI-Powered Analysis (Mock) ---
        ai_suggestions = []
        full_text = extracted_text

        # Mock suggestion 1: Find a confidentiality term to suggest a change
        conf_term_search = "confidentiality term of 5 years"
        conf_term_index = full_text.find(conf_term_search)
        if conf_term_index != -1:
            ai_suggestions.append(schemas.AnalysisSuggestionCreate(
                start_index=conf_term_index,
                end_index=conf_term_index + len(conf_term_search),
                original_text=conf_term_search,
                suggested_text="confidentiality term of 3 years",
                comment="The typical confidentiality term is 2-3 years. 5 years is unusually long and may be unfavorable.",
                risk_category="Unfavorable Terms"
            ))

        # Mock suggestion 2: Find a generic liability clause to flag for review
        liability_search = "standard Non-Disclosure Agreement"
        liability_index = full_text.find(liability_search)
        if liability_index != -1:
            ai_suggestions.append(schemas.AnalysisSuggestionCreate(
                start_index=liability_index,
                end_index=liability_index + len(liability_search),
                original_text=liability_search,
                suggested_text=None,
                comment="Ensure this standard agreement aligns with our company's specific liability caps. Review against the Clause Library.",
                risk_category="Liability"
            ))

        # --- NEW: Compliance Playbook Analysis ---
        compliance_suggestions = []
        # Check if the organization has an enterprise plan to run compliance modules
        db_contract = db_version.contract
        if db_contract.organization and db_contract.organization.plan_id == "enterprise":
            print(f"Organization {db_contract.organization.name} is on enterprise plan. Running compliance playbooks for version {version_id}.")
            applicable_playbooks = crud.get_playbooks_for_organization(db, organization_id=db_contract.organization_id)
            for playbook in applicable_playbooks:
                for rule in playbook.rules:
                    # For V1 of Geopolitical Risk, we use a special handler.
                    # A more advanced implementation might use a 'rule_type' field.
                    if rule.risk_category == "Geopolitical Risk":
                        compliance_suggestions.extend(_handle_geopolitical_rule(rule, full_text))
                    else:
                        # Standard rule processing
                        compliance_suggestions.extend(_handle_standard_rule(rule, full_text))
        
        # Combine all suggestions
        all_suggestions = ai_suggestions + compliance_suggestions

        print(f"Simulating LLM analysis on {len(extracted_text)} characters of extracted text...")
        time.sleep(2) # Simulate work

        crud.update_contract_version_analysis(db, version_id=version_id, full_text=full_text, suggestions=all_suggestions)
        print(f"Completed analysis for contract version: {version_id}")

        # After successful analysis, index the document for full-text search
        # Re-fetch the contract to ensure we have the latest state
        db_version_updated = crud.get_contract_version_by_id(db, version_id=version_id)
        if db_version_updated and db_version_updated.full_text:
            search_service.index_document(
                contract_id=str(db_version_updated.contract_id),
                text=db_version_updated.full_text,
                organization_id=str(db_version_updated.contract.organization_id)
            )
    except Exception as e:
        print(f"Analysis failed for contract version {version_id}: {e}")
        crud.update_contract_version_status(db, version_id=version_id, status=models.AnalysisStatus.failed)
    finally:
        db.close()