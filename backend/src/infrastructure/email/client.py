import structlog

logger = structlog.get_logger(__name__)

async def send_email(to_email: str, subject: str, body: str) -> None:
    """
    Mock email client.
    In a real production environment, this would integrate with SendGrid, Resend, or AWS SES.
    """
    logger.info(
        "mock_email_sent",
        to_email=to_email,
        subject=subject,
    )
    
    print("\n" + "="*60)
    print(f"📧 EMAIL SENT TO: {to_email}")
    print(f"📌 SUBJECT: {subject}")
    print("-" * 60)
    print(body)
    print("="*60 + "\n")
