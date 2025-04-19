from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator, MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
import os

def validate_file_type(value):
    ext = os.path.splitext(value.name)[1][1:].lower()
    if ext not in settings.ALLOWED_FILE_TYPES:
        raise ValidationError(f'File type not allowed. Allowed types: {", ".join(settings.ALLOWED_FILE_TYPES)}')

class FeedbackCategory(models.Model):
    """Model to store different feedback categories"""
    
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    icon = models.CharField(max_length=50, blank=True, null=True, help_text="Font Awesome icon class")
    active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name_plural = "Feedback Categories"
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['active']),
        ]
    
    def __str__(self):
        return self.name

class Feedback(models.Model):
    """Model to store feedback submitted by users"""
    
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
        ('rejected', 'Rejected'),
    )
    
    PRIORITY_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    )
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.ForeignKey(FeedbackCategory, on_delete=models.CASCADE, related_name='feedbacks')
    submitter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='submitted_feedbacks')
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        related_name='assigned_feedbacks',
        blank=True, 
        null=True
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    
    # For tracking changes
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(blank=True, null=True)
    
    # Additional fields
    attachment = models.FileField(
        upload_to='feedback_attachments/',
        blank=True,
        null=True,
        validators=[validate_file_type]
    )
    is_anonymous = models.BooleanField(default=False, help_text="Keep submitter's identity hidden")
    rating = models.PositiveSmallIntegerField(
        blank=True,
        null=True,
        help_text="User satisfaction rating (1-5)",
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['priority']),
            models.Index(fields=['created_at']),
            models.Index(fields=['category']),
            models.Index(fields=['submitter']),
            models.Index(fields=['assigned_to']),
        ]
    
    def __str__(self):
        return self.title
    
    @property
    def days_open(self):
        """Calculate days since feedback was submitted"""
        from django.utils import timezone
        if self.status in ['resolved', 'closed']:
            return (self.resolved_at - self.created_at).days
        return (timezone.now() - self.created_at).days
        
    def clean(self):
        """Validate admin category matches feedback category"""
        if self.assigned_to and self.assigned_to.user_type == 'admin':
            if self.assigned_to.admin_category != self.category.name.lower():
                raise ValidationError(
                    f"Assigned admin's category ({self.assigned_to.admin_category}) "
                    f"does not match feedback category ({self.category.name.lower()})"
                )

class FeedbackComment(models.Model):
    """Model to store comments on feedback"""
    
    feedback = models.ForeignKey(Feedback, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    attachment = models.FileField(upload_to='comment_attachments/', blank=True, null=True)
    is_internal = models.BooleanField(default=False, help_text="Visible only to admins")
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment by {self.user.email} on {self.feedback.title}"

class FeedbackHistory(models.Model):
    """Model to track feedback status changes"""
    
    feedback = models.ForeignKey(Feedback, on_delete=models.CASCADE, related_name='history')
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    old_status = models.CharField(max_length=20, blank=True, null=True)
    new_status = models.CharField(max_length=20)
    old_assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        related_name='old_assignments',
        blank=True, 
        null=True
    )
    new_assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        related_name='new_assignments',
        blank=True, 
        null=True
    )
    notes = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name_plural = "Feedback Histories"
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"Status change on {self.feedback.title} by {self.changed_by.email}"