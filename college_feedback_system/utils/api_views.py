from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_yasg.utils import swagger_auto_schema
from .logging import log_request_response, cache_view

class BaseAPIView(APIView):
    """
    Base API view with common functionality
    """
    version = 'v1'
    
    def get_serializer_context(self):
        """
        Extra context provided to the serializer class.
        """
        return {
            'request': self.request,
            'format': self.format_kwarg,
            'view': self
        }

    def get_serializer(self, *args, **kwargs):
        """
        Return the serializer instance that should be used for validating and
        deserializing input, and for serializing output.
        """
        serializer_class = self.get_serializer_class()
        kwargs['context'] = self.get_serializer_context()
        return serializer_class(*args, **kwargs)

    def get_serializer_class(self):
        """
        Return the class to use for the serializer.
        Defaults to using `self.serializer_class`.
        """
        assert self.serializer_class is not None, (
            "'%s' should either include a `serializer_class` attribute, "
            "or override the `get_serializer_class()` method."
            % self.__class__.__name__
        )
        return self.serializer_class

class CachedAPIView(BaseAPIView):
    """
    API view with caching support
    """
    cache_timeout = 60 * 15  # 15 minutes by default

    @cache_view(timeout=cache_timeout)
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

class LoggedAPIView(BaseAPIView):
    """
    API view with request/response logging
    """
    @log_request_response()
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)

class DocumentedAPIView(BaseAPIView):
    """
    API view with Swagger documentation
    """
    @swagger_auto_schema(
        operation_description="Get a list of objects",
        responses={200: "Success", 400: "Bad Request", 401: "Unauthorized"}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_description="Create a new object",
        responses={201: "Created", 400: "Bad Request", 401: "Unauthorized"}
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_description="Update an object",
        responses={200: "Success", 400: "Bad Request", 401: "Unauthorized", 404: "Not Found"}
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_description="Partially update an object",
        responses={200: "Success", 400: "Bad Request", 401: "Unauthorized", 404: "Not Found"}
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_description="Delete an object",
        responses={204: "No Content", 401: "Unauthorized", 404: "Not Found"}
    )
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)

class EnhancedAPIView(CachedAPIView, LoggedAPIView, DocumentedAPIView):
    """
    API view with all enhancements (caching, logging, and documentation)
    """
    pass 