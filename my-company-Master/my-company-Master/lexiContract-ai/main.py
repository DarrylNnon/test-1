from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from api.v1.api import api_router
from core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# NEW: Middleware to add a trailing slash to API paths.
# This prevents a 307 redirect from FastAPI's router, which can break
# CORS preflight (OPTIONS) requests from the browser.
@app.middleware("http")
async def add_trailing_slash(request: Request, call_next):
    path = request.scope["path"]
    if path.startswith("/api/") and not path.endswith("/"):
        request.scope["path"] = path + "/"
    return await call_next(request)

# Set all CORS enabled origins
# In a production environment, you would want to be more restrictive.
# For development, allowing localhost and specific cloud IDEs is common.
origins = [
    "http://localhost:3000",
    "https://bookish-eureka-wrvjqgxj6973v997-3000.app.github.dev", # Your GitHub Codespaces URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)