from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Assuming your API router is defined in api.v1.api
from api.v1.api import api_router

app = FastAPI(
    title="LexiContract AI",
    openapi_url="/api/v1/openapi.json"
)

# This regex allows requests from localhost and any dynamically generated GitHub Codespace URL.
# Using a regex is necessary because Codespace URLs are dynamic.
origin_regex = r"http://localhost:3000|https://.*\.app\.github\.dev"

app.add_middleware(
    CORSMiddleware,
    # Do not use `allow_origins` and `allow_origin_regex` together,
    # as `allow_origins` takes precedence and will ignore the regex.
    # We use a single regex to handle both localhost and dynamic Codespace URLs.
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")