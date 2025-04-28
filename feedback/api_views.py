from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Feedback, FeedbackResponse
from .serializers import FeedbackSerializer, FeedbackResponseSerializer
from django.utils import timezone
from django.db.models import Q

class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object or admins to access it.
    """
    def has_object_permission(self, request, view, obj):
        # Admin users can see all
        if request.user.user_type == 'admin':
            return True
        
        # Check if the object has a student attribute (Feedback model)
        if hasattr(obj, 'student'):
            return obj.student == request.user
        
        # Check if the object has a responder attribute (FeedbackResponse model)
        if hasattr(obj, 'responder'):
            return obj.responder == request.user
        
        return False

class FeedbackViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing feedback instances.
    """
    serializer_class = FeedbackSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    
    def get_queryset(self):
        user = self.request.user
        
        # Admins can see all feedback assigned to them
        if user.user_type == 'admin':
            return Feedback.objects.filter(assigned_admin=user)
        
        # Students can only see their own feedback
        return Feedback.objects.filter(student=user)
    
    @action(detail=False, methods=['get'])
    def student(self, request):
        """
        Action to get all feedback submitted by the student
        """
        if request.user.user_type != 'student':
            return Response(
                {"detail": "Only students can access this endpoint"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        feedbacks = Feedback.objects.filter(student=request.user)
        serializer = self.get_serializer(feedbacks, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def admin(self, request):
        """
        Action to get all feedback assigned to the admin
        """
        if request.user.user_type != 'admin':
            return Response(
                {"detail": "Only admins can access this endpoint"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        feedbacks = Feedback.objects.filter(assigned_admin=request.user)
        serializer = self.get_serializer(feedbacks, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['put'])
    def resolve(self, request, pk=None):
        """
        Action to mark a feedback as resolved
        """
        feedback = self.get_object()
        
        # Only admins can resolve feedback
        if request.user.user_type != 'admin':
            return Response(
                {"detail": "Only admins can resolve feedback"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Only the assigned admin can resolve this feedback
        if feedback.assigned_admin != request.user:
            return Response(
                {"detail": "You are not assigned to this feedback"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Mark as resolved
        feedback.status = Feedback.RESOLVED
        feedback.resolved_at = timezone.now()
        feedback.save()
        
        serializer = self.get_serializer(feedback)
        return Response(serializer.data)

class FeedbackResponseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing feedback response instances.
    """
    serializer_class = FeedbackResponseSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.user_type == 'admin':
            # Admins can see all responses to feedback assigned to them
            return FeedbackResponse.objects.filter(
                Q(feedback__assigned_admin=user) | 
                Q(responder=user)
            )
        
        # Students can see all responses to their feedback
        return FeedbackResponse.objects.filter(
            Q(feedback__student=user) & 
            Q(is_internal=False)  # Don't show internal responses to students
        ) 