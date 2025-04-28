from django.contrib.auth import get_user_model, login, logout, authenticate
from rest_framework import status, permissions, viewsets, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth.decorators import login_required

from .serializers import (
    UserSerializer, UserRegistrationSerializer, 
    ChangePasswordSerializer, AdminUserSerializer
)
from .forms import LoginForm, StudentRegistrationForm

User = get_user_model()

class IsAdminUser(permissions.BasePermission):
    """Permission class to check if user is admin"""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type in ['admin', 'superadmin']

class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for user operations"""
    
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAuthenticated()]

class LoginView(APIView):
    """View for user login"""
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            email = request.data.get('email') or request.data.get('username')
            password = request.data.get('password')
            
            if not email or not password:
                return Response(
                    {'error': 'Please provide both email and password'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Use username=email since Django's authenticate expects username
            user = authenticate(username=email, password=password)
            
            # If not found, try to find by email and authenticate
            if not user:
                try:
                    user_obj = User.objects.get(email=email)
                    user = authenticate(username=user_obj.username, password=password)
                except User.DoesNotExist:
                    pass
            
            if user is not None and user.is_active:
                refresh = RefreshToken.for_user(user)
                
                # Include all relevant user data in response
                return Response({
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'username': getattr(user, 'username', user.email),
                        'first_name': getattr(user, 'first_name', ''),
                        'last_name': getattr(user, 'last_name', ''),
                        'user_type': getattr(user, 'user_type', 'student')
                    },
                    'message': 'Login successful'
                })
            
            return Response(
                {'error': 'Invalid credentials'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            print(f"Login error: {str(e)}")  # Add debug print
            return Response(
                {'error': 'An error occurred during login. Please try again.'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class LogoutView(APIView):
    """View for user logout"""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
                return Response({'message': 'Logout successful'})
            else:
                return Response(
                    {'error': 'Refresh token is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {'error': f'An error occurred during logout: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UserRegistrationView(generics.CreateAPIView):
    """View for user registration"""
    
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Generate tokens for the user
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': serializer.data,
                'message': 'Registration successful'
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for user management"""
    
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        # Only admins can see all users
        if user.user_type in ['admin', 'superadmin']:
            return User.objects.all()
        # Regular users can only see their own profile
        return User.objects.filter(id=user.id)
    
    def get_permissions(self):
        if self.action in ['list', 'create', 'destroy']:
            return [IsAdminUser()]
        # Allow users to view and update their own profile
        return [IsAuthenticated()]
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user profile"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """Change password endpoint"""
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            
            # Check old password
            if not user.check_password(serializer.data.get('old_password')):
                return Response(
                    {'error': 'Current password is incorrect'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Set new password
            user.set_password(serializer.data.get('new_password'))
            user.save()
            
            return Response({'message': 'Password changed successfully'})
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def admins(self, request):
        """Get list of admin users by category"""
        admins = User.objects.filter(user_type='admin', is_active=True)
        serializer = AdminUserSerializer(admins, many=True)
        return Response(serializer.data)

def login_view(request):
    """
    View for user login - both students and admins
    """
    # Redirect if already logged in
    if request.user.is_authenticated:
        if request.user.is_student():
            return redirect('student_dashboard')
        else:
            return redirect('admin_dashboard')
    
    # Process login form
    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            
            # Authenticate user
            user = authenticate(request, username=username, password=password)
            
            if user is not None:
                # Log in the user
                login(request, user)
                messages.success(request, f"Welcome back, {user.first_name}!")
                
                # Redirect based on user type
                if user.is_student():
                    return redirect('student_dashboard')
                else:
                    return redirect('admin_dashboard')
            else:
                messages.error(request, "Invalid username or password.")
    else:
        form = LoginForm()
    
    return render(request, 'accounts/login.html', {'form': form})

def register_view(request):
    """
    View for student registration
    """
    # Redirect if already logged in
    if request.user.is_authenticated:
        if request.user.is_student():
            return redirect('student_dashboard')
        else:
            return redirect('admin_dashboard')
    
    # Process registration form
    if request.method == 'POST':
        form = StudentRegistrationForm(request.POST)
        if form.is_valid():
            # Save the user
            user = form.save()
            
            # Log the user in
            login(request, user)
            
            # Success message
            messages.success(request, f"Account created successfully! Welcome, {user.first_name}!")
            return redirect('student_dashboard')
    else:
        form = StudentRegistrationForm()
    
    return render(request, 'accounts/register.html', {'form': form})

@login_required
def logout_view(request):
    """
    View for user logout
    """
    logout(request)
    messages.success(request, "You have been logged out successfully.")
    return redirect('login')

@login_required
def profile_view(request):
    """
    View for user profile
    """
    return render(request, 'accounts/profile.html')

@login_required
def student_dashboard(request):
    """
    Dashboard view for students
    """
    # Check if user is a student
    if not request.user.is_student():
        messages.error(request, "You don't have permission to access the student dashboard.")
        return redirect('admin_dashboard')
    
    # Get user's feedback submissions
    feedbacks = request.user.submitted_feedbacks.all()
    
    return render(request, 'accounts/student_dashboard.html', {
        'feedbacks': feedbacks
    })

@login_required
def admin_dashboard(request):
    """
    Dashboard view for admins
    """
    # Check if user is an admin
    if not request.user.is_admin():
        messages.error(request, "You don't have permission to access the admin dashboard.")
        return redirect('student_dashboard')
    
    # Determine which category this admin handles
    admin_type = request.user.user_type
    
    # Filter feedbacks based on admin type
    if admin_type == User.ACADEMIC_ADMIN:
        category = 'academic'
        feedbacks = Feedback.objects.filter(category=category)
    elif admin_type == User.INFRASTRUCTURE_ADMIN:
        category = 'infrastructure'
        feedbacks = Feedback.objects.filter(category=category)
    elif admin_type == User.ADMINISTRATIVE_ADMIN:
        category = 'administrative'
        feedbacks = Feedback.objects.filter(category=category)
    else:
        # Super admin can see all
        feedbacks = Feedback.objects.all()
    
    return render(request, 'accounts/admin_dashboard.html', {
        'feedbacks': feedbacks,
        'admin_type': admin_type
    })