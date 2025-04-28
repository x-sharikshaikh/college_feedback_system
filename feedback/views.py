from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.paginator import Paginator
from django.db.models import Q
from django.http import HttpResponseForbidden
from django.utils import timezone
from django.contrib.auth import get_user_model

from .models import Feedback, FeedbackCategory, FeedbackComment
from .forms import FeedbackForm, CommentForm, FeedbackCommentForm

User = get_user_model()

def index(request):
    """Home page view"""
    return render(request, 'index.html')

@login_required
def dashboard(request):
    """Dashboard view for users"""
    user = request.user
    
    # For students, show only their own feedbacks
    if user.user_type == 'student':
        feedbacks = Feedback.objects.filter(submitter=user)
        pending_count = feedbacks.filter(status='pending').count()
        in_progress_count = feedbacks.filter(status='in_progress').count()
        resolved_count = feedbacks.filter(status='resolved').count()
    # For admins, show all feedbacks or those of their department
    else:
        feedbacks = Feedback.objects.all()
        pending_count = feedbacks.filter(status='pending').count()
        in_progress_count = feedbacks.filter(status='in_progress').count()
        resolved_count = feedbacks.filter(status='resolved').count()
    
    # Paginate feedbacks
    paginator = Paginator(feedbacks, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'feedbacks': page_obj,
        'pending_count': pending_count,
        'in_progress_count': in_progress_count,
        'resolved_count': resolved_count,
    }
    
    return render(request, 'feedback/dashboard.html', context)

@login_required
def feedback_list(request):
    """View for listing all feedbacks"""
    user = request.user
    status_filter = request.GET.get('status', '')
    category_filter = request.GET.get('category', '')
    search_query = request.GET.get('search', '')
    
    # Filter feedbacks based on user type
    if user.is_student():
        feedbacks = Feedback.objects.filter(student=user)
    else:
        feedbacks = Feedback.objects.all()
    
    # Apply filters
    if status_filter:
        feedbacks = feedbacks.filter(status=status_filter)
    if category_filter:
        feedbacks = feedbacks.filter(category__name=category_filter)
    if search_query:
        feedbacks = feedbacks.filter(
            Q(title__icontains=search_query) | 
            Q(content__icontains=search_query)
        )
    
    # Paginate feedbacks
    paginator = Paginator(feedbacks, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # Get categories for filter dropdown
    categories = FeedbackCategory.objects.all()
    
    context = {
        'feedbacks': page_obj,
        'categories': categories,
        'status_filter': status_filter,
        'category_filter': category_filter,
        'search_query': search_query,
        'feedback_status_choices': Feedback.STATUS_CHOICES,
    }
    
    return render(request, 'feedback/feedback_list.html', context)

@login_required
def feedback_detail(request, feedback_id):
    """View for showing a single feedback with comments"""
    feedback = get_object_or_404(Feedback, id=feedback_id)
    user = request.user
    
    # Check if user has permission to view this feedback
    if user.user_type == 'student' and feedback.submitter != user:
        return HttpResponseForbidden("You don't have permission to view this feedback")
    
    # Handle comment form submission
    if request.method == 'POST':
        comment_form = CommentForm(request.POST)
        if comment_form.is_valid():
            comment = comment_form.save(commit=False)
            comment.feedback = feedback
            comment.author = user
            comment.save()
            messages.success(request, "Comment added successfully.")
            return redirect('feedback_detail', feedback_id=feedback.id)
    else:
        comment_form = CommentForm()
    
    # Get all comments for this feedback
    comments = feedback.comments.all()
    
    context = {
        'feedback': feedback,
        'comments': comments,
        'comment_form': comment_form,
    }
    
    return render(request, 'feedback/feedback_detail.html', context)

@login_required
def feedback_create(request):
    """View for creating a new feedback"""
    if request.method == 'POST':
        form = FeedbackForm(request.POST, request.FILES)
        if form.is_valid():
            feedback = form.save(commit=False)
            feedback.submitter = request.user
            feedback.save()
            messages.success(request, "Feedback submitted successfully.")
            return redirect('dashboard')
    else:
        form = FeedbackForm()
    
    context = {
        'form': form,
    }
    
    return render(request, 'feedback/feedback_form.html', context)

@login_required
def feedback_update_status(request, feedback_id):
    """View for admins to update feedback status"""
    feedback = get_object_or_404(Feedback, id=feedback_id)
    
    # Only admins can update status
    if request.user.user_type != 'admin':
        return HttpResponseForbidden("You don't have permission to update feedback status")
    
    if request.method == 'POST':
        new_status = request.POST.get('status')
        if new_status in [s[0] for s in Feedback.STATUS_CHOICES]:
            feedback.status = new_status
            feedback.save()
            messages.success(request, f"Feedback status updated to {new_status}.")
        else:
            messages.error(request, "Invalid status provided.")
            
        return redirect('feedback_detail', feedback_id=feedback.id)
    
    return redirect('feedback_detail', feedback_id=feedback.id)

@login_required
def list_feedbacks(request):
    """
    View for listing all feedbacks
    """
    user = request.user
    
    # Filter feedbacks based on user type
    if user.is_student():
        # Students can only see their own feedbacks
        feedbacks = Feedback.objects.filter(student=user).order_by('-created_at')
    else:
        # Admins can see the feedbacks assigned to them
        feedbacks = Feedback.objects.filter(assigned_admin=user).order_by('-created_at')
    
    # Pagination
    paginator = Paginator(feedbacks, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    return render(request, 'feedback/list_feedbacks.html', {
        'feedbacks': page_obj,
    })

@login_required
def submit_feedback(request):
    """
    View for submitting new feedback
    """
    # Only students can submit feedback
    if not request.user.is_student():
        messages.error(request, "Only students can submit feedback.")
        return redirect('admin_dashboard')
    
    if request.method == 'POST':
        form = FeedbackForm(request.POST, request.FILES)
        if form.is_valid():
            # Create feedback but don't save yet
            feedback = form.save(commit=False)
            
            # Set the student
            feedback.student = request.user
            
            # Find an admin to assign based on category
            User = get_user_model()
            
            # Assign to any admin for now
            admin = User.objects.filter(user_type='admin').first()
            feedback.assigned_admin = admin
            
            # Save the feedback
            feedback.save()
            
            messages.success(request, "Your feedback has been submitted successfully!")
            return redirect('view_feedback', feedback_id=feedback.id)
    else:
        form = FeedbackForm()
    
    return render(request, 'feedback/submit_feedback.html', {'form': form})

@login_required
def view_feedback(request, feedback_id):
    """
    View for displaying a single feedback with comments
    """
    feedback = get_object_or_404(Feedback, id=feedback_id)
    
    # Check permissions - only the student who submitted or assigned admin can view
    if not (request.user == feedback.student or request.user == feedback.assigned_admin):
        messages.error(request, "You don't have permission to view this feedback.")
        return redirect('list_feedbacks')
    
    # Handle comment form
    if request.method == 'POST':
        comment_form = FeedbackCommentForm(request.POST)
        if comment_form.is_valid():
            # Create comment but don't save yet
            comment = comment_form.save(commit=False)
            
            # Set feedback and user
            comment.feedback = feedback
            comment.user = request.user
            
            # Save the comment
            comment.save()
            
            messages.success(request, "Your comment has been added.")
            return redirect('view_feedback', feedback_id=feedback.id)
    else:
        comment_form = FeedbackCommentForm()
    
    # Get all comments for this feedback
    comments = feedback.comments.all().order_by('created_at')
    
    return render(request, 'feedback/view_feedback.html', {
        'feedback': feedback,
        'comments': comments,
        'comment_form': comment_form
    })

@login_required
def resolve_feedback(request, feedback_id):
    """
    View for admin to mark feedback as resolved
    """
    feedback = get_object_or_404(Feedback, id=feedback_id)
    
    # Only the assigned admin can resolve the feedback
    if request.user != feedback.assigned_admin:
        messages.error(request, "You don't have permission to resolve this feedback.")
        return redirect('view_feedback', feedback_id=feedback.id)
    
    # Mark the feedback as resolved
    feedback.status = Feedback.RESOLVED
    feedback.resolved_at = timezone.now()
    feedback.save()
    
    messages.success(request, "Feedback has been marked as resolved.")
    return redirect('view_feedback', feedback_id=feedback.id)
