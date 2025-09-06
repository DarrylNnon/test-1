import uvicorn
from fastapi import FastAPI, Request
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import Response

# Assuming these imports based on the project structure in README.md
# and a typical FastAPI project layout.
from api.v1.api import api_router
from core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Add Content-Security-Policy middleware for development.
# This is necessary to allow resources from web-based IDEs like GitHub Codespaces.
@app.middleware("http")
async def add_csp_header(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "trusted-types nextjs ProseMirrorClipboard; "
        "img-src 'self' data: vscode-remote:; "  # Allow images from vscode-remote scheme
        "script-src 'self' 'unsafe-inline'; "   # Allow inline scripts for development
        "style-src 'self' 'unsafe-inline'; "    # Allow inline styles for development
        "object-src 'none'; "
        "frame-ancestors 'self';"
    )
    return response

# Set all CORS enabled origins.
# This middleware must be placed before any routers to ensure it
# handles preflight OPTIONS requests correctly before they can be redirected.
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin).strip("/") for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    # This is for running the app directly for debugging,
    # not for production.
    uvicorn.run(app, host="0.0.0.0", port=8000)