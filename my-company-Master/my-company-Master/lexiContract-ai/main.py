from fastapi import FastAPI
from contextlib import asynccontextmanager

from api.v1.api import api_router
from core.database import SessionLocal
from core import crud

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Code to run on startup
    print("Starting up...")
    db = SessionLocal()
    try:
        # Seed initial data
        if not crud.get_integration_by_name(db, "Salesforce"):
            crud.create_system_integration(db, name="Salesforce", description="Connect to your Salesforce CRM to sync contract and account data.")
            print("Seeded Salesforce integration.")
    finally:
        db.close()
    
    yield
    
    # Code to run on shutdown
    print("Shutting down...")

app = FastAPI(title="LexiContract AI", lifespan=lifespan)

app.include_router(api_router, prefix="/api/v1")