from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from feedback.models import Feedback
import datetime

User = get_user_model()

class Command(BaseCommand):
    help = 'Creates initial data for the College Feedback System'

    def handle(self, *args, **kwargs):
        self.stdout.write('Creating initial data...')
        
        # Create admin user if it doesn't exist
        if not User.objects.filter(email='admin@example.com').exists():
            admin_user = User.objects.create_user(
                username='admin',
                email='admin@example.com',
                password='admin123',
                first_name='Admin',
                last_name='User',
                user_type='admin',
                is_staff=True,
                is_superuser=True
            )
            self.stdout.write(self.style.SUCCESS(f'Created admin user: {admin_user.email}'))
        else:
            self.stdout.write('Admin user already exists, skipping...')
        
        # Create student user if it doesn't exist
        if not User.objects.filter(email='student@example.com').exists():
            student_user = User.objects.create_user(
                username='student',
                email='student@example.com',
                password='student123',
                first_name='Student',
                last_name='User',
                user_type='student'
            )
            self.stdout.write(self.style.SUCCESS(f'Created student user: {student_user.email}'))
        else:
            self.stdout.write('Student user already exists, skipping...')
        
        # Get the users (in case they already existed)
        admin_user = User.objects.get(email='admin@example.com')
        student_user = User.objects.get(email='student@example.com')
        
        # Create sample feedbacks if none exist
        if Feedback.objects.count() == 0:
            # Academic feedback
            Feedback.objects.create(
                title='Improve Computer Science Curriculum',
                description='The computer science curriculum needs to be updated with the latest technologies. We need more practical sessions on cloud computing and AI.',
                category='academic',
                student=student_user,
                assigned_admin=admin_user,
                status='pending'
            )
            
            # Infrastructure feedback
            Feedback.objects.create(
                title='Computer Lab Needs Upgrades',
                description='The computers in Lab 2 are outdated and slow. Many of them crash frequently during our practical sessions.',
                category='infrastructure',
                student=student_user,
                assigned_admin=admin_user,
                status='pending'
            )
            
            # Administrative feedback with resolved status
            resolved_feedback = Feedback.objects.create(
                title='Library Opening Hours',
                description='Can the library stay open until 8pm instead of closing at 6pm? This would be very helpful for students who have late classes.',
                category='administrative',
                student=student_user,
                assigned_admin=admin_user,
                status='resolved',
                resolved_at=datetime.datetime.now()
            )
            
            self.stdout.write(self.style.SUCCESS('Created sample feedback entries'))
        else:
            self.stdout.write('Feedback entries already exist, skipping...')
        
        self.stdout.write(self.style.SUCCESS('Initial data creation completed successfully!')) 