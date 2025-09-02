import io
from pypdf import PdfReader

def extract_text_from_file(file_contents: bytes, filename: str) -> str:
    """Extracts text from a file's contents based on its extension."""
    extracted_text = ""
    if filename.lower().endswith('.pdf'):
        try:
            reader = PdfReader(io.BytesIO(file_contents))
            for page in reader.pages:
                extracted_text += page.extract_text() or "" + "\n"
        except Exception as e:
            print(f"Error reading PDF {filename}: {e}")
            raise ValueError("Could not process PDF file.")
    elif filename.lower().endswith('.txt'):
        try:
            extracted_text = file_contents.decode('utf-8')
        except UnicodeDecodeError:
            raise ValueError("Could not decode .txt file as UTF-8.")
    else:
        raise ValueError(f"Unsupported file type: {filename}. Only .pdf and .txt are supported.")
    return extracted_text