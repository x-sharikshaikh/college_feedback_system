from django.urls import path
from . import views

urlpatterns = [
    # Feedback homepage/index
    path('', views.list_feedbacks, name='list_feedbacks'),
    
    # Submit feedback
    path('submit/', views.submit_feedback, name='submit_feedback'),
    
    # View feedback
    path('view/<int:feedback_id>/', views.view_feedback, name='view_feedback'),
    
    # Resolve feedback
    path('resolve/<int:feedback_id>/', views.resolve_feedback, name='resolve_feedback'),
]