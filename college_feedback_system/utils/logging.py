import structlog
from functools import wraps
from django.core.cache import cache
from django.conf import settings

logger = structlog.get_logger()

def log_request_response(logger=logger):
    """
    Decorator to log request and response details
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Log request
            logger.info(
                "request_received",
                method=request.method,
                path=request.path,
                user=request.user.email if request.user.is_authenticated else "anonymous",
                ip=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT')
            )

            try:
                response = view_func(request, *args, **kwargs)
                # Log response
                logger.info(
                    "response_sent",
                    status_code=response.status_code,
                    path=request.path
                )
                return response
            except Exception as e:
                # Log error
                logger.error(
                    "request_error",
                    error=str(e),
                    path=request.path,
                    exc_info=True
                )
                raise
        return wrapper
    return decorator

def cache_view(timeout=60 * 15):  # Default 15 minutes
    """
    Decorator to cache view responses
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Generate cache key
            cache_key = f"view_cache:{request.path}:{request.user.id if request.user.is_authenticated else 'anonymous'}"
            
            # Try to get from cache
            response = cache.get(cache_key)
            if response is not None:
                logger.info("cache_hit", path=request.path)
                return response

            # If not in cache, execute view
            response = view_func(request, *args, **kwargs)
            
            # Cache the response
            cache.set(cache_key, response, timeout)
            logger.info("cache_miss", path=request.path)
            
            return response
        return wrapper
    return decorator

def log_model_changes(model_name):
    """
    Decorator to log model changes
    """
    def decorator(func):
        @wraps(func)
        def wrapper(instance, *args, **kwargs):
            try:
                result = func(instance, *args, **kwargs)
                logger.info(
                    f"{model_name}_changed",
                    action=func.__name__,
                    model_id=instance.id,
                    changes=instance.get_changes() if hasattr(instance, 'get_changes') else {}
                )
                return result
            except Exception as e:
                logger.error(
                    f"{model_name}_change_error",
                    action=func.__name__,
                    model_id=instance.id,
                    error=str(e),
                    exc_info=True
                )
                raise
        return wrapper
    return decorator 