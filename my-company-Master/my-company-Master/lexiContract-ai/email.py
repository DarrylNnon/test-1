from . import models

class MockEmailService:
    """
    A mock client to simulate sending emails for notifications.
    In a real application, this would integrate with a service like SendGrid or AWS SES.
    """

    def send_milestone_reminder(self, notification: models.Notification):
        """Simulates sending a milestone reminder email."""
        user = notification.user
        contract = notification.contract
        milestone = notification.milestone

        print("--- MOCK EMAIL SERVICE ---")
        print(f"To: {user.email}")
        print(f"Subject: Upcoming Contract Milestone: {milestone.milestone_type.value}")
        print(f"Body:")
        print(f"  Hi {user.email.split('@')[0]},")
        print(f"  This is a reminder regarding the contract '{contract.filename}'.")
        print(f"  The following milestone is approaching:")
        print(f"    - Milestone: {milestone.milestone_type.value}")
        print(f"    - Date: {milestone.milestone_date.strftime('%Y-%m-%d')}")
        print(f"    - Details: {notification.details}")
        print(f"  You can view the contract here: http://localhost:3000/dashboard/contracts/{contract.id}")
        print("--------------------------")

# Create a single, shared instance of the service
email_service = MockEmailService()