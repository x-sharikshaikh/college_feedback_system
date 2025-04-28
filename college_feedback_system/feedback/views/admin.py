from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from datetime import timedelta
from ..models import Feedback, Department, Category
from ..serializers import FeedbackSerializer
from ..utils.caching import cache_view
from ..utils.logging import log_admin_action

class AdminDashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminUser]

    @cache_view(timeout=300)  # Cache for 5 minutes
    def get_stats(self, request):
        """Get overall dashboard statistics"""
        total_feedback = Feedback.objects.count()
        open_feedback = Feedback.objects.filter(status='open').count()
        in_progress_feedback = Feedback.objects.filter(status='in_progress').count()
        resolved_feedback = Feedback.objects.filter(status='resolved').count()

        stats = {
            'total_feedback': total_feedback,
            'open_feedback': open_feedback,
            'in_progress_feedback': in_progress_feedback,
            'resolved_feedback': resolved_feedback,
            'resolution_rate': (resolved_feedback / total_feedback * 100) if total_feedback > 0 else 0
        }
        return Response(stats)

    @cache_view(timeout=300)
    def get_recent_feedback(self, request):
        """Get recent feedback entries"""
        recent_feedback = Feedback.objects.order_by('-created_at')[:10]
        serializer = FeedbackSerializer(recent_feedback, many=True)
        return Response(serializer.data)

    @cache_view(timeout=300)
    def get_department_stats(self, request):
        """Get statistics by department"""
        department_stats = Department.objects.annotate(
            total_feedback=Count('feedback'),
            open_feedback=Count('feedback', filter=Q(feedback__status='open')),
            resolved_feedback=Count('feedback', filter=Q(feedback__status='resolved'))
        ).values('name', 'total_feedback', 'open_feedback', 'resolved_feedback')
        return Response(department_stats)

    @cache_view(timeout=300)
    def get_category_stats(self, request):
        """Get statistics by category"""
        category_stats = Category.objects.annotate(
            total_feedback=Count('feedback'),
            open_feedback=Count('feedback', filter=Q(feedback__status='open')),
            resolved_feedback=Count('feedback', filter=Q(feedback__status='resolved'))
        ).values('name', 'total_feedback', 'open_feedback', 'resolved_feedback')
        return Response(category_stats)

    @cache_view(timeout=300)
    def get_feedback_trends(self, request):
        """Get feedback trends over time"""
        days = int(request.query_params.get('days', 7))
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)

        # Generate dates for the period
        dates = []
        for i in range(days + 1):
            date = start_date + timedelta(days=i)
            dates.append(date.date())

        # Get feedback counts for each date
        trends = []
        for date in dates:
            count = Feedback.objects.filter(
                created_at__date=date
            ).count()
            trends.append({
                'date': date,
                'count': count
            })

        return Response(trends)

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update feedback status"""
        feedback = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in dict(Feedback.STATUS_CHOICES):
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        feedback.status = new_status
        feedback.save()

        log_admin_action(
            request.user,
            f'Updated feedback {feedback.id} status to {new_status}'
        )

        return Response(FeedbackSerializer(feedback).data) 