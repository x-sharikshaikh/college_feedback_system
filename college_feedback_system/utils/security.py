from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.utils.html import strip_tags
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from django.conf import settings
import re
from .logging import logger

def sanitize_input(data):
    """
    Basic input sanitization for strings and dictionaries
    """
    if isinstance(data, str):
        # Remove HTML tags
        data = strip_tags(data)
        # Remove potentially dangerous characters
        data = re.sub(r'[<>]', '', data)
        return data.strip()
    elif isinstance(data, dict):
        return {k: sanitize_input(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_input(item) for item in data]
    return data

def validate_email_format(email):
    """
    Validate email format
    """
    try:
        validate_email(email)
        return True
    except ValidationError:
        return False

def validate_password_strength(password):
    """
    Basic password strength validation
    """
    if len(password) < 8:
        raise ValidationError("Password must be at least 8 characters long")
    
    if not re.search(r'[A-Z]', password):
        raise ValidationError("Password must contain at least one uppercase letter")
    
    if not re.search(r'[a-z]', password):
        raise ValidationError("Password must contain at least one lowercase letter")
    
    if not re.search(r'[0-9]', password):
        raise ValidationError("Password must contain at least one number")
    
    return True

def validate_file_upload(file, allowed_types=None, max_size=5*1024*1024):
    """
    Validate file upload
    """
    if not file:
        return True

    # Check file size
    if file.size > max_size:
        raise ValidationError(f"File size must be less than {max_size/1024/1024}MB")

    # Check file type
    if allowed_types:
        file_extension = file.name.split('.')[-1].lower()
        if file_extension not in allowed_types:
            raise ValidationError(f"File type not allowed. Allowed types: {', '.join(allowed_types)}")

    return True

def log_security_event(event_type, details):
    """
    Log security-related events
    """
    logger.warning(
        "security_event",
        event_type=event_type,
        **details
    )

def generate_password_reset_token(user):
    """
    Generate a password reset token for a user
    """
    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    return uid, token

def send_password_reset_email(user, reset_url):
    """
    Send password reset email to user
    """
    try:
        subject = 'Password Reset Request'
        message = f"""
        Hello {user.first_name},

        You have requested to reset your password. Please click the link below to reset your password:

        {reset_url}

        If you did not request this password reset, please ignore this email.

        Best regards,
        {settings.SITE_NAME} Team
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
        
        logger.info(
            "password_reset_email_sent",
            user=user.email
        )
        return True
    except Exception as e:
        logger.error(
            "password_reset_email_failed",
            error=str(e),
            user=user.email
        )
        return False

def validate_reset_token(user, token):
    """
    Validate password reset token
    """
    return default_token_generator.check_token(user, token) 