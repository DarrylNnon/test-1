import asyncio
from core.database import SessionLocal
from core import crud

async def process_suggestion_outcomes():
    """
    A background job to process suggestion acceptance/rejection events
    and aggregate them into the negotiation_outcomes table.
    """
    print("Starting suggestion outcome processing job...")
    db = SessionLocal()
    try:
        events = crud.get_unprocessed_suggestion_outcomes(db, limit=200)
        if not events:
            print("No new suggestion outcomes to process.")
            return

        print(f"Found {len(events)} new suggestion outcomes to process.")
        
        for event in events:
            # This function contains the core INSERT...ON CONFLICT logic
            crud.upsert_negotiation_outcome(db=db, event=event)

        # Mark the batch as processed
        event_ids = [event.id for event in events]
        crud.mark_suggestion_outcomes_as_processed(db, event_ids=event_ids)
        print(f"Successfully processed {len(events)} outcomes.")

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(process_suggestion_outcomes())