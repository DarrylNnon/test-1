import re
from typing import Dict
from openai import AsyncOpenAI, APIError
from fastapi import HTTPException, status

from .config import settings

# In a real application, this would use the OpenAI client library.
# from openai import OpenAI
# from .config import settings
# client = OpenAI(api_key=settings.OPENAI_API_KEY)

class AIService:
    """
    A client to interact with a generative AI service like OpenAI.
    It will use a real OpenAI client if the API key is provided,
    otherwise it falls back to a simple mock implementation for development.
    """
    def __init__(self, api_key: str):
        if not api_key or "your_openai_api_key_here" in api_key:
            print("WARNING: OpenAI API key not configured. AI service is running in MOCK mode.")
            self.client = None
        else:
            self.client = AsyncOpenAI(api_key=api_key)

    async def generate_contract_from_template(self, template_content: str, variables: Dict[str, str]) -> str:
        """
        Fills in a template with provided variables using either a real LLM or a mock service.
        """
        if not self.client:
            return self._mock_generate(template_content, variables)
        
        return await self._real_generate(template_content, variables)

    def _mock_generate(self, template_content: str, variables: Dict[str, str]) -> str:
        """A simple mock implementation that replaces placeholders."""
        print("AIService: Generating contract in MOCK mode.")
        
        def replace_var(match):
            var_name = match.group(1).strip()
            return variables.get(var_name, f"{{{{UNDEFINED: {var_name}}}}}")

        filled_content = re.sub(r"\{\{\s*([\w\d_]+)\s*\}\}", replace_var, template_content)
        return filled_content

    async def _real_generate(self, template_content: str, variables: Dict[str, str]) -> str:
        """Generates a contract using the OpenAI API."""
        print("AIService: Generating contract with OpenAI.")
        system_prompt = (
            "You are a world-class legal assistant AI. Your task is to populate a contract template with the provided variables. "
            "The final output must be only the contract text, with no conversational filler, preambles, or explanations. "
            "Ensure the resulting document is clean, professional, and legally coherent. "
            "The template uses {{variable_name}} syntax for placeholders."
        )
        
        variable_list = "\n".join([f"- {key}: {value}" for key, value in variables.items()])
        user_prompt = f"Please populate the following contract template:\n\n---\n{template_content}\n---\n\nUse these variables:\n{variable_list}"

        try:
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.1, # Low temperature for factual, deterministic output
            )
            return response.choices[0].message.content.strip()
        except APIError as e:
            print(f"OpenAI API Error: {e}")
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI service is currently unavailable.")

# Create a single, shared instance of the service
ai_service = AIService(api_key=settings.OPENAI_API_KEY)