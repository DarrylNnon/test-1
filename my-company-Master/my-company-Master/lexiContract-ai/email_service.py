import os

class MockEmailService:
    """A mock client to simulate sending emails."""

    def send_password_reset_email(self, email: str, token: str):
        """Simulates sending a password reset email."""
        # In a real app, this would use a service like SendGrid or AWS SES
        # to send an HTML email to the user.
        reset_link = f"http://localhost:3000/reset-password?token={token}"
        print("--- MOCK EMAIL SERVICE ---")
        print(f"To: {email}")
        print(f"Subject: Reset Your LexiContract AI Password")
        print(f"Body: Please use the following link to reset your password: {reset_link}")
        print("--------------------------")

# Create a single, shared instance of the service
email_service = MockEmailService()