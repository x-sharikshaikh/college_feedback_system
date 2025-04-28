from django.core.cache import cache
from django.http import HttpResponseForbidden, JsonResponse
from django.utils import timezone
from django.conf import settings
import re
import html
from .utils.logging import logger
import time
from django.utils.deprecation import MiddlewareMixin

class RequestThrottlingMiddleware:
    """
    Middleware to implement request throttling
    """
    def __init__(self, get_response):
        self.get_response = get_response
        self.rate_limit = getattr(settings, 'RATE_LIMIT', 100)  # requests per minute
        self.rate_window = 60  # 1 minute window

    def __call__(self, request):
        # Skip throttling for admin and documentation URLs
        if request.path.startswith(('/admin/', '/swagger/', '/redoc/')):
            return self.get_response(request)

        # Generate cache key based on IP and path
        ip = request.META.get('REMOTE_ADDR')
        path = request.path
        cache_key = f"throttle:{ip}:{path}"

        # Get current request count
        request_count = cache.get(cache_key, 0)

        # Check if rate limit exceeded
        if request_count >= self.rate_limit:
            logger.warning(
                "rate_limit_exceeded",
                ip=ip,
                path=path,
                count=request_count
            )
            return HttpResponseForbidden("Rate limit exceeded. Please try again later.")

        # Increment request count
        cache.set(cache_key, request_count + 1, self.rate_window)

        response = self.get_response(request)
        return response

class InputSanitizationMiddleware:
    """
    Middleware to sanitize user input
    """
    def __init__(self, get_response):
        self.get_response = get_response
        self.sanitize_patterns = [
            (r'<script.*?>.*?</script>', ''),  # Remove script tags
            (r'<.*?javascript:.*?>', ''),     # Remove javascript: URLs
            (r'<.*?\son\w+=.*?>', ''),        # Remove event handlers
        ]

    def __call__(self, request):
        # Sanitize GET parameters
        request.GET = self._sanitize_dict(request.GET)
        
        # Sanitize POST parameters
        if request.method == 'POST':
            request.POST = self._sanitize_dict(request.POST)
        
        # Sanitize request body for JSON requests
        if request.content_type == 'application/json':
            try:
                request._body = self._sanitize_json(request.body)
            except:
                pass

        response = self.get_response(request)
        return response

    def _sanitize_dict(self, data):
        """
        Sanitize dictionary values
        """
        sanitized = {}
        for key, value in data.items():
            if isinstance(value, str):
                sanitized[key] = self._sanitize_string(value)
            elif isinstance(value, (list, tuple)):
                sanitized[key] = [self._sanitize_string(v) if isinstance(v, str) else v for v in value]
            else:
                sanitized[key] = value
        return sanitized

    def _sanitize_string(self, value):
        """
        Sanitize string value
        """
        # HTML escape
        value = html.escape(value)
        
        # Apply additional sanitization patterns
        for pattern, replacement in self.sanitize_patterns:
            value = re.sub(pattern, replacement, value, flags=re.IGNORECASE | re.DOTALL)
        
        return value

    def _sanitize_json(self, json_data):
        """
        Sanitize JSON data
        """
        import json
        data = json.loads(json_data)
        sanitized = self._sanitize_dict(data)
        return json.dumps(sanitized)

class BasicSecurityMiddleware(MiddlewareMixin):
    """
    Basic security middleware for the college feedback system.
    Implements:
    - Basic XSS protection
    - Rate limiting for API requests
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.rate_limit = 60  # requests per minute
        self.rate_limit_window = 60  # seconds
        
    def process_request(self, request):
        """
        Process the incoming request.
        - Check rate limiting
        """
        # Skip middleware for admin and static files
        if request.path.startswith('/admin/') or request.path.startswith('/static/'):
            return None
            
        # Rate limiting for API requests
        if request.path.startswith('/api/'):
            ip = self.get_client_ip(request)
            if not self.check_rate_limit(ip):
                logger.warning(f"Rate limit exceeded for IP: {ip}")
                return HttpResponseForbidden("Rate limit exceeded. Try again later.")
        
        return None
        
    def process_response(self, request, response):
        """
        Process the outgoing response.
        Add security headers to the response.
        """
        # Add basic security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-XSS-Protection'] = '1; mode=block'
        response['X-Frame-Options'] = 'SAMEORIGIN'
        
        return response
        
    def get_client_ip(self, request):
        """Get the client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
        
    def check_rate_limit(self, ip):
        """
        Check if the IP has exceeded rate limits.
        Return True if request is allowed, False otherwise.
        """
        cache_key = f"rate_limit:{ip}"
        history = cache.get(cache_key)
        
        now = time.time()
        
        if history is None:
            # First request from this IP
            new_history = [now]
            cache.set(cache_key, new_history, self.rate_limit_window * 2)
            return True
            
        # Filter out requests older than the window
        updated_history = [timestamp for timestamp in history if now - timestamp < self.rate_limit_window]
        
        # Add current request
        updated_history.append(now)
        
        # Update cache
        cache.set(cache_key, updated_history, self.rate_limit_window * 2)
        
        # Check if rate limit is exceeded
        return len(updated_history) <= self.rate_limit

class ErrorHandlingMiddleware(MiddlewareMixin):
    """Middleware for handling errors in the application."""
    
    def process_exception(self, request, exception):
        """Process exceptions raised during request handling."""
        logger.exception("Unhandled exception", exc_info=exception)
        
        # Only return JSON for API requests
        if request.path.startswith('/api/'):
            return JsonResponse({
                'error': 'Server error occurred',
                'message': str(exception)
            }, status=500)
        
        return None

def custom_exception_handler(exc, context):
    """Custom exception handler for DRF."""
    from rest_framework.views import exception_handler
    from rest_framework.response import Response
    from rest_framework import status
    
    # Call DRF's default exception handler first
    response = exception_handler(exc, context)
    
    # If response is None, DRF doesn't know how to handle the exception
    if response is None:
        logger.exception("Unhandled API exception", exc_info=exc)
        return Response(
            {'error': 'Server error', 'message': str(exc)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    return response 