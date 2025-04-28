from django.core.cache import cache
from django.conf import settings
from django.core.exceptions import ValidationError
from .security import log_security_event

def track_login_attempt(username, success):
    """
    Track login attempts and implement basic rate limiting
    """
    cache_key = f"login_attempts:{username}"
    attempts = cache.get(cache_key, 0)

    if success:
        # Reset attempts on successful login
        cache.delete(cache_key)
        return True

    # Increment failed attempts
    attempts += 1
    cache.set(cache_key, attempts, settings.LOGIN_ATTEMPTS_TIMEOUT)

    # Log failed attempt
    log_security_event(
        'login_failed',
        {
            'username': username,
            'attempts': attempts,
            'limit': settings.LOGIN_ATTEMPTS_LIMIT
        }
    )

    # Check if limit exceeded
    if attempts >= settings.LOGIN_ATTEMPTS_LIMIT:
        log_security_event(
            'login_blocked',
            {
                'username': username,
                'attempts': attempts
            }
        )
        raise ValidationError(
            f"Too many failed login attempts. Please try again after {settings.LOGIN_ATTEMPTS_TIMEOUT//60} minutes."
        )

    return False

def get_remaining_attempts(username):
    """
    Get remaining login attempts for a user
    """
    cache_key = f"login_attempts:{username}"
    attempts = cache.get(cache_key, 0)
    return max(0, settings.LOGIN_ATTEMPTS_LIMIT - attempts) 