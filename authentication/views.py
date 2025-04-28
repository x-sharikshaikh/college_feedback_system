from django.shortcuts import render, redirect
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model, authenticate, login, logout
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.exceptions import ValidationError
from college_feedback_system.utils.security import (
    validate_password_strength, 
    sanitize_input, 
    generate_password_reset_token, 
    send_password_reset_email, 
    validate_reset_token,
    log_security_event
)
from college_feedback_system.utils.login_tracker import track_login_attempt, get_remaining_attempts
from college_feedback_system.utils.logging import logger
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserRegistrationSerializer,
    UserProfileSerializer,
    ChangePasswordSerializer,
    PasswordResetSerializer,
    PasswordResetConfirmSerializer,
    UserLoginSerializer,
    PasswordChangeSerializer,
)
from .forms import LoginForm
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.cache import cache
from django.template.loader import render_to_string
from django.urls import reverse
import re
from datetime import datetime, timedelta

User = get_user_model()

# Rate limiting decorator
def rate_limit(key_prefix, limit=5, period=60):
    def decorator(view_func):
        def wrapped_view(request, *args, **kwargs):
            if request.user.is_authenticated:
                return view_func(request, *args, **kwargs)
                
            ip = request.META.get('REMOTE_ADDR')
            key = f"{key_prefix}:{ip}"
            
            # Get current count
            count = cache.get(key, 0)
            
            if count >= limit:
                return Response(
                    {'error': 'Too many attempts. Please try again later.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )
            
            # Increment count
            cache.set(key, count + 1, period)
            return view_func(request, *args, **kwargs)
        return wrapped_view
    return decorator

class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom token view that uses our custom serializer"""
    serializer_class = CustomTokenObtainPairSerializer

class UserRegistrationView(generics.CreateAPIView):
    """View for user registration"""
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Send welcome email
            try:
                subject = 'Welcome to College Feedback System'
                html_message = render_to_string('accounts/welcome_email.html', {
                    'user': user,
                    'login_url': request.build_absolute_uri(reverse('login'))
                })
                plain_message = strip_tags(html_message)
                send_mail(
                    subject,
                    plain_message,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    html_message=html_message,
                    fail_silently=False
                )
            except Exception as e:
                # Log the error but don't fail the registration
                print(f"Failed to send welcome email: {str(e)}")
            
            return Response({
                'message': 'User registered successfully',
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'user_type': user.user_type
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserProfileView(generics.RetrieveUpdateAPIView):
    """View for retrieving and updating user profile"""
    serializer_class = UserProfileSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user

class ChangePasswordView(generics.GenericAPIView):
    """View for changing password"""
    serializer_class = ChangePasswordSerializer
    permission_classes = (permissions.IsAuthenticated,)

    @rate_limit('change_password')
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.validated_data['old_password']):
                return Response(
                    {'error': 'Incorrect old password'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'message': 'Password changed successfully'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetView(generics.CreateAPIView):
    """View for requesting password reset"""
    permission_classes = [AllowAny]
    serializer_class = PasswordResetSerializer

    @rate_limit('password_reset')
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            try:
                user = User.objects.get(email=email)
                # Generate reset token
                token = default_token_generator.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                
                # Create reset URL
                reset_url = request.build_absolute_uri(
                    reverse('password_reset_confirm', kwargs={'uid': uid, 'token': token})
                )
                
                # Send reset email
                subject = 'Password Reset Request'
                html_message = render_to_string('accounts/password_reset_email.html', {
                    'user': user,
                    'reset_url': reset_url,
                    'expiry_hours': 24
                })
                plain_message = strip_tags(html_message)
                
                send_mail(
                    subject,
                    plain_message,
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                    html_message=html_message,
                    fail_silently=False
                )
                
                return Response({
                    'message': 'Password reset email sent successfully'
                })
            except User.DoesNotExist:
                # Don't reveal whether the email exists
                return Response({
                    'message': 'If an account exists with this email, you will receive a password reset link'
                })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetConfirmView(generics.GenericAPIView):
    """View for confirming password reset"""
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = (permissions.AllowAny,)

    @rate_limit('password_reset_confirm')
    def post(self, request, uid, token, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            try:
                # Decode uid
                uid = force_str(urlsafe_base64_decode(uid))
                user = User.objects.get(pk=uid)
                
                # Verify token
                if not default_token_generator.check_token(user, token):
                    return Response(
                        {'error': 'Invalid or expired reset link'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Set new password
                user.set_password(serializer.validated_data['new_password'])
                user.save()
                
                return Response({
                    'message': 'Password reset successfully'
                })
            except (TypeError, ValueError, OverflowError, User.DoesNotExist):
                return Response(
                    {'error': 'Invalid reset link'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    """View for user logout"""
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'message': 'Successfully logged out'})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class UserLoginView(APIView):
    """Consolidated login view that works with both username and email"""
    permission_classes = [AllowAny]

    @rate_limit('login')
    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response(
                {'error': 'Please provide both email/username and password'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Try to authenticate with both email and username
        user = None
        
        # First try direct authentication
        user = authenticate(username=email, password=password)
        
        # If not found, try to find by email and authenticate
        if not user:
            try:
                user_obj = User.objects.get(email=email)
                user = authenticate(username=user_obj.username, password=password)
            except User.DoesNotExist:
                pass
        
        if user and user.is_active:
            # Generate token
            refresh = RefreshToken.for_user(user)
            access = refresh.access_token
            
            # Return success response with token and user data
            return Response({
                'access': str(access),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'user_type': getattr(user, 'user_type', 'student')
                }
            })
        
        # Return error response
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )

class PasswordChangeView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PasswordChangeSerializer

    def get_object(self):
        return self.request.user

    @rate_limit('password_change')
    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = self.get_object()
            if not user.check_password(serializer.validated_data['old_password']):
                return Response(
                    {'error': 'Incorrect old password'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate password strength
            password = serializer.validated_data['new_password']
            if not self._validate_password_strength(password):
                return Response(
                    {'error': 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            user.set_password(password)
            user.save()
            return Response({'message': 'Password changed successfully'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def _validate_password_strength(self, password):
        """Validate password strength"""
        if len(password) < 8:
            return False
        if not re.search(r'[A-Z]', password):
            return False
        if not re.search(r'[a-z]', password):
            return False
        if not re.search(r'[0-9]', password):
            return False
        if not re.search(r'[^A-Za-z0-9]', password):
            return False
        return True

class UserListView(generics.ListAPIView):
    permission_classes = (permissions.IsAdminUser,)
    serializer_class = UserProfileSerializer
    queryset = User.objects.all()

    def get_queryset(self):
        queryset = User.objects.all()
        user_type = self.request.query_params.get('user_type', None)
        if user_type:
            queryset = queryset.filter(user_type=user_type)
        return queryset

def login_view(request):
    if request.user.is_authenticated:
        if request.user.is_staff:
            return redirect('admin_dashboard')
        else:
            return redirect('student_dashboard')
            
    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data.get('email')
            password = form.cleaned_data.get('password')
            user = authenticate(request, username=email, password=password)
            
            if user is not None:
                login(request, user)
                messages.success(request, 'Successfully logged in!')
                if user.is_staff:
                    return redirect('admin_dashboard')
                else:
                    return redirect('student_dashboard')
            else:
                messages.error(request, 'Invalid email or password.')
    else:
        form = LoginForm()
        
    return render(request, 'accounts/login.html', {'form': form})

@rate_limit('web_register')
def register_view(request):
    """
    View for student registration
    """
    # If user is already logged in, redirect to appropriate dashboard
    if request.user.is_authenticated:
        if request.user.is_student():
            return redirect('student_dashboard')
        else:
            return redirect('admin_dashboard')
    
    if request.method == 'POST':
        name = request.POST.get('name')
        username = request.POST.get('username')
        email = request.POST.get('email')
        password = request.POST.get('password')
        
        # Validate password strength
        if not re.match(r'^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$', password):
            messages.error(request, 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character')
            return render(request, 'accounts/register.html')
        
        # Check if username or email already exists
        if User.objects.filter(username=username).exists():
            messages.error(request, 'Username already exists')
            return render(request, 'accounts/register.html')
        
        if User.objects.filter(email=email).exists():
            messages.error(request, 'Email already exists')
            return render(request, 'accounts/register.html')
        
        # Create new user (student)
        try:
            # Parse the name into first and last name
            name_parts = name.split(' ', 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ''
            
            # Create the user
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                user_type='student'
            )
            
            # Log the user in
            login(request, user)
            
            # Send welcome email
            try:
                subject = 'Welcome to College Feedback System'
                html_message = render_to_string('accounts/welcome_email.html', {
                    'user': user,
                    'login_url': request.build_absolute_uri(reverse('login'))
                })
                plain_message = strip_tags(html_message)
                send_mail(
                    subject,
                    plain_message,
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                    html_message=html_message,
                    fail_silently=False
                )
            except Exception as e:
                # Log the error but don't fail the registration
                print(f"Failed to send welcome email: {str(e)}")
            
            # Redirect to student dashboard
            messages.success(request, 'Registration successful! Welcome to College Feedback System.')
            return redirect('student_dashboard')
        except Exception as e:
            messages.error(request, f'Registration failed: {str(e)}')
    
    return render(request, 'accounts/register.html')

@login_required
def logout_view(request):
    """
    View for user logout
    """
    logout(request)
    messages.info(request, 'You have been logged out.')
    return redirect('login')

@login_required
def student_dashboard(request):
    """
    Dashboard view for students
    """
    if not request.user.is_student():
        return redirect('admin_dashboard')
    
    # Get the student's feedbacks
    feedbacks = request.user.submitted_feedbacks.all().order_by('-created_at')
    
    context = {
        'feedbacks': feedbacks
    }
    
    return render(request, 'accounts/student_dashboard.html', context)

@login_required
def admin_dashboard(request):
    """
    Dashboard view for admins
    """
    if request.user.is_student():
        return redirect('student_dashboard')
    
    # Get feedbacks assigned to this admin
    feedbacks = request.user.assigned_feedbacks.all().order_by('-created_at')
    
    # Count pending and resolved feedbacks
    pending_count = feedbacks.filter(status='pending').count()
    resolved_count = feedbacks.filter(status='resolved').count()
    
    context = {
        'feedbacks': feedbacks,
        'pending_count': pending_count,
        'resolved_count': resolved_count
    }
    
    return render(request, 'accounts/admin_dashboard.html', context)
