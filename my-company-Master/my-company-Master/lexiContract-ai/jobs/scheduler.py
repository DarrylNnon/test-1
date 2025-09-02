from apscheduler.schedulers.asyncio import AsyncIOScheduler
from jobs.milestone_scanner import scan_for_upcoming_milestones
from jobs.dispatcher import dispatch_pending_notifications

scheduler = AsyncIOScheduler(timezone="UTC")

def setup_scheduler():
    """
    Adds jobs to the scheduler.
    This function is called on application startup.
    """
    # Schedule the milestone scanner to run once daily at 01:00 UTC
    # as per the technical specification.
    scheduler.add_job(
        scan_for_upcoming_milestones,
        'cron',
        hour=1,
        minute=0,
        id='milestone_scanner_job',
        replace_existing=True
    )

    # Schedule the notification dispatcher to run every 5 minutes
    # as per the technical specification.
    scheduler.add_job(
        dispatch_pending_notifications,
        'interval',
        minutes=5,
        id='dispatcher_job',
        replace_existing=True
    )
    
    print("Scheduler jobs have been configured.")
    return scheduler