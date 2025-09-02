import re
from typing import Dict, Optional
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

    async def generate_clause(self, prompt: str, context: Optional[Dict] = None) -> str:
        """
        Generates a contract clause from a natural language prompt using an LLM.
        """
        if not self.client:
            return self._mock_generate_clause(prompt)

        return await self._real_generate_clause(prompt, context or {})

    def _mock_generate_clause(self, prompt: str) -> str:
        """A simple mock implementation for clause generation."""
        print(f"AIService: Generating clause in MOCK mode for prompt: '{prompt}'")
        return f"This is a mock-generated clause in response to the prompt: '{prompt}'. It should be compliant and well-drafted."

    async def _real_generate_clause(self, user_prompt: str, context: Dict) -> str:
        """Generates a clause using the OpenAI API."""
        print(f"AIService: Generating clause with OpenAI for prompt: '{user_prompt}'")
        
        system_prompt = (
            "You are a legal assistant AI specializing in contract law. Your task is to generate a clear, concise, and legally sound contract clause based on the user's request. "
            "The clause should be neutral and suitable for a standard commercial agreement. "
            "The final output must be only the generated clause text, with no conversational filler, preambles, or explanations."
        )
        
        full_prompt = f"User Request: \"{user_prompt}\"\n\nContext:\n- Contract Type: {context.get('contract_type', 'General Commercial')}"

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": full_prompt},
                ],
                temperature=0.2, # Low temperature for more predictable, formal output
            )
            return response.choices[0].message.content.strip()
        except APIError as e:
            print(f"OpenAI API Error: {e}")
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI clause generation service is currently unavailable.")

# Create a single, shared instance of the service
ai_service = AIService(api_key=settings.OPENAI_API_KEY)