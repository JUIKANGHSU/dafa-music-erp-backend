from typing import Optional

class EmailService:
    @staticmethod
    def send_email(to_email: str, subject: str, content: str) -> bool:
        """
        Send an email.
        For now, this simply logs the email to the console.
        In the future, integrate with SMTP or an API like SendGrid/SES.
        """
        if not to_email:
            print("EmailService: No recipient email provided.")
            return False

        # Simulate sending
        print(f"--- [MOCK EMAIL SENT] ---")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Content: {content}")
        print(f"-------------------------")
        
        return True
