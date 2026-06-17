import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

def send_email_notification(to_email: str, subject: str, body: str) -> bool:
    """
    Sends an email notification. 
    In a real production app on a free tier, you could use Resend, SendGrid free tier, or standard SMTP.
    For this scaffold, we just simulate the notification.
    """
    # Replace with real SMTP credentials if needed
    smtp_server = os.getenv("SMTP_SERVER", "smtp.example.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")

    if not smtp_user or not smtp_pass:
        print(f"Simulation: Notification sent to {to_email}")
        print(f"Subject: {subject}\nBody preview: {body[:100]}...")
        return True

    try:
        msg = MIMEMultipart()
        msg['From'] = smtp_user
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False
