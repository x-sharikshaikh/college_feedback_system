from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    PasswordChangeSerializer,
    PasswordResetSerializer
)
from ..utils.login_tracker import track_login_attempt, get_remaining_attempts
from ..utils.security import validate_password_strength, log_security_event

User = get_user_model()

class UserRegistrationView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Validate password strength
        password = serializer.validated_data.get('password')
        if not validate_password_strength(password):
            return Response(
                {'error': 'Password does not meet strength requirements'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create user
        user = serializer.save()
        user.set_password(password)
        user.save()

        # Create user profile
        user.profile = user.profile or user.profile.create(
            role=serializer.validated_data.get('role', 'student')
        )

        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        log_security_event('user_registration', {
            'user_id': user.id,
            'email': user.email
        })

        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': serializer.data
        }, status=status.HTTP_201_CREATED)

class UserLoginView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = UserLoginSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        try:
            user = User.objects.get(email=email)
            if not user.check_password(password):
                track_login_attempt(email, False)
                remaining = get_remaining_attempts(email)
                return Response(
                    {'error': 'Invalid credentials', 'remaining_attempts': remaining},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            track_login_attempt(email, True)
            refresh = RefreshToken.for_user(user)

            log_security_event('user_login', {
                'user_id': user.id,
                'email': user.email
            })

            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'role': user.profile.role if hasattr(user, 'profile') else None
                }
            })

        except User.DoesNotExist:
            track_login_attempt(email, False)
            remaining = get_remaining_attempts(email)
            return Response(
                {'error': 'Invalid credentials', 'remaining_attempts': remaining},
                status=status.HTTP_401_UNAUTHORIZED
            )

class PasswordChangeView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PasswordChangeSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = self.get_object()
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'error': 'Invalid old password'},
                status=status.HTTP_400_BAD_REQUEST
            )

        new_password = serializer.validated_data['new_password']
        if not validate_password_strength(new_password):
            return Response(
                {'error': 'New password does not meet strength requirements'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()

        log_security_event('password_change', {
            'user_id': user.id,
            'email': user.email
        })

        return Response({'message': 'Password changed successfully'})

class PasswordResetView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = PasswordResetSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        try:
            user = User.objects.get(email=email)
            # Generate reset token and send email
            # Implementation depends on your email service
            log_security_event('password_reset_request', {
                'user_id': user.id,
                'email': user.email
            })
            return Response({'message': 'Password reset email sent'})
        except User.DoesNotExist:
            return Response(
                {'error': 'No user found with this email'},
                status=status.HTTP_404_NOT_FOUND
            ) 