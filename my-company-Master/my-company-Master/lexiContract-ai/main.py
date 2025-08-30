from fastapi import FastAPI
from contextlib import asynccontextmanager
from api.v1.api import api_router
from core.database import SessionLocal
from core import crud
from core.scheduler import setup_scheduler

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

    scheduler = setup_scheduler()
    scheduler.start()
    print("Scheduler started.")
    
    yield
    
    # Code to run on shutdown
    print("Shutting down...")
    scheduler.shutdown()
    print("Scheduler shut down.")

app = FastAPI(title="LexiContract AI", lifespan=lifespan)

app.include_router(api_router, prefix="/api/v1")