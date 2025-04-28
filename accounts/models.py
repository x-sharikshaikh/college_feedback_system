from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator, MinValueValidator, MaxValueValidator, FileExtensionValidator
import re

def validate_student_id(value):
    """Validate student ID format"""
    pattern = r'^[A-Z]{2}\d{6}$'  # Example: AB123456
    if not re.match(pattern, value):
        raise ValidationError(
            _('Student ID must be in the format: 2 letters followed by 6 numbers (e.g., AB123456)')
        )

class UserManager(BaseUserManager):
    """Define a model manager for User model with no username field."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        """Create and save a User with the given email and password."""
        if not email:
            raise ValueError('The given email must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular User with the given email and password."""
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a SuperUser with the given email and password."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('user_type', 'admin')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self._create_user(email, password, **extra_fields)

class User(AbstractUser):
    """
    Custom User model for College Feedback System
    """
    # User type choices
    STUDENT = 'student'
    ADMIN = 'admin'
    
    USER_TYPE_CHOICES = [
        (STUDENT, 'Student'),
        (ADMIN, 'Admin'),
    ]
    
    # Additional fields
    user_type = models.CharField(
        max_length=30, 
        choices=USER_TYPE_CHOICES, 
        default=STUDENT,
        help_text="Type of user account (Student or Admin)"
    )
    
    username = models.CharField(_('username'), max_length=150, blank=True)
    email = models.EmailField(_('email address'), unique=True)
    
    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['user_type']

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.get_full_name()} ({self.get_user_type_display()})"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}" if self.first_name or self.last_name else self.email

    def get_short_name(self):
        return self.first_name if self.first_name else self.email.split('@')[0]

    def is_student(self):
        """Check if user is a student"""
        return self.user_type == self.STUDENT
    
    def is_admin(self):
        """Check if user is an admin"""
        return self.user_type == self.ADMIN