import time
import io
from pypdf import PdfReader

from . import crud, models, schemas
from .core.search import search_service
from .database import SessionLocal

def analyze_contract(contract_id: str, file_contents: bytes, filename: str):
    """
    A mock analysis function that simulates processing a contract.
     It now extracts text from the uploaded file.
    """
    print(f"Starting analysis for contract: {contract_id}")
    db = SessionLocal()
    try:
        crud.update_contract_status(db, contract_id=contract_id, status=models.AnalysisStatus.in_progress)

        # --- Text Extraction ---
        extracted_text = ""
        if filename.lower().endswith('.pdf'):
            reader = PdfReader(io.BytesIO(file_contents))
            for page in reader.pages:
                extracted_text += page.extract_text() or "" + "\n"
            print(f"Successfully extracted {len(extracted_text)} characters from PDF: {filename}")
        elif filename.lower().endswith('.txt'):
            extracted_text = file_contents.decode('utf-8')
            print(f"Successfully read text file: {filename}")
        else:
            # We should gracefully fail the analysis for unsupported file types
            raise ValueError(f"Unsupported file type: {filename}. Only .pdf and .txt are supported.")

        # --- NEW: Mock Structured Analysis ---
        suggestions = []
        full_text = extracted_text

        # Mock suggestion 1: Find a confidentiality term to suggest a change
        conf_term_search = "confidentiality term of 5 years"
        conf_term_index = full_text.find(conf_term_search)
        if conf_term_index != -1:
            suggestions.append(schemas.AnalysisSuggestionCreate(
                start_index=conf_term_index,
                end_index=conf_term_index + len(conf_term_search),
                original_text=conf_term_search,
                suggested_text="confidentiality term of 3 years",
                comment="The typical confidentiality term is 2-3 years. 5 years is unusually long and may be unfavorable.",
                risk_category="Unfavorable Terms"
            ))

        # Mock suggestion 2: Find a generic liability clause to flag for review
        # We'll just find some text that we know exists in the mock summary for now.
        liability_search = "standard Non-Disclosure Agreement"
        liability_index = full_text.find(liability_search)
        if liability_index != -1:
            suggestions.append(schemas.AnalysisSuggestionCreate(
                start_index=liability_index,
                end_index=liability_index + len(liability_search),
                original_text=liability_search,
                suggested_text=None,  # This is just a comment/flag, not a direct text replacement
                comment="Ensure this standard agreement aligns with our company's specific liability caps. Review against the Clause Library.",
                risk_category="Liability"
            ))

        print(f"Simulating LLM analysis on {len(extracted_text)} characters of extracted text...")
        time.sleep(2) # Simulate work

        crud.update_contract_analysis(db, contract_id=contract_id, full_text=full_text, suggestions=suggestions)
        print(f"Completed analysis for contract: {contract_id}")

        # After successful analysis, index the document for full-text search
        db_contract = crud.get_contract_by_id(db, contract_id=contract_id)
        if db_contract and db_contract.full_text:
            search_service.index_document(
                contract_id=str(db_contract.id),
                text=db_contract.full_text,
                organization_id=str(db_contract.organization_id)
            )
    except Exception as e:
        print(f"Analysis failed for contract {contract_id}: {e}")
        # Update the status to 'failed' in the DB
        crud.update_contract_status(db, contract_id=contract_id, status=models.AnalysisStatus.failed)
    finally:
        db.close()