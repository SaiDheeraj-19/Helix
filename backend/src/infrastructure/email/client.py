from email.message import EmailMessage

import aiosmtplib
import structlog

from src.core.config import settings

logger = structlog.get_logger(__name__)

async def send_email(to_email: str, subject: str, body: str) -> None:
    """
    Sends an email using standard SMTP.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(
            "email_mocked",
            to_email=to_email,
            subject=subject,
            reason="SMTP credentials not configured"
        )
        print("\n" + "="*60)
        print(f"📧 EMAIL SENT TO: {to_email}")
        print(f"📌 SUBJECT: {subject}")
        print("-" * 60)
        print(body)
        print("="*60 + "\n")
        return

    msg = EmailMessage()
    msg.set_content(body)
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM}>"
    msg["To"] = to_email

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            use_tls=settings.SMTP_TLS,
        )
        logger.info("email_sent", to_email=to_email, subject=subject)
    except Exception as e:
        logger.error("email_send_failed", to_email=to_email, error=str(e))

