from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from feedback.models import FeedbackCategory, Feedback

User = get_user_model()

class Command(BaseCommand):
    help = 'Initialize the database with sample data'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('Starting database initialization...'))
        
        # Create categories if they don't exist
        categories = [
            {
                'name': 'Academic',
                'description': 'Issues related to courses, teaching, exams, etc.',
            },
            {
                'name': 'Infrastructure',
                'description': 'Issues related to buildings, classrooms, labs, etc.',
            },
            {
                'name': 'Administrative',
                'description': 'Issues related to administration, fees, certificates, etc.',
            },
            {
                'name': 'Other',
                'description': 'Other issues not covered by the above categories',
            },
        ]
        
        for category_data in categories:
            category, created = FeedbackCategory.objects.get_or_create(
                name=category_data['name'],
                defaults={'description': category_data['description']}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created category: {category.name}'))
        
        # Create test users if they don't exist
        users = [
            {
                'email': 'student@example.com',
                'password': 'student123',
                'first_name': 'John',
                'last_name': 'Doe',
                'user_type': 'student',
                'department': 'Computer Science',
                'student_id': 'CS123456',
                'year_of_study': 3,
            },
            {
                'email': 'admin@example.com',
                'password': 'admin123',
                'first_name': 'Jane',
                'last_name': 'Smith',
                'user_type': 'admin',
                'department': 'Computer Science',
                'is_staff': True,
            },
        ]
        
        for user_data in users:
            password = user_data.pop('password')
            user, created = User.objects.get_or_create(
                email=user_data['email'],
                defaults=user_data
            )
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(self.style.SUCCESS(f'Created user: {user.email}'))
        
        # Create sample feedback if none exists
        if Feedback.objects.count() == 0:
            student = User.objects.get(email='student@example.com')
            academic = FeedbackCategory.objects.get(name='Academic')
            infra = FeedbackCategory.objects.get(name='Infrastructure')
            
            feedbacks = [
                {
                    'title': 'Need more programming practice sessions',
                    'content': 'The programming course needs more practical sessions. Theory alone is not enough to learn programming effectively.',
                    'category': academic,
                    'submitter': student,
                    'status': 'pending',
                },
                {
                    'title': 'Computer lab needs better internet',
                    'content': 'The internet in the computer lab is too slow for development work. Please upgrade the connection.',
                    'category': infra,
                    'submitter': student,
                    'status': 'in_progress',
                },
            ]
            
            for feedback_data in feedbacks:
                feedback = Feedback.objects.create(**feedback_data)
                self.stdout.write(self.style.SUCCESS(f'Created feedback: {feedback.title}'))
        
        self.stdout.write(self.style.SUCCESS('Database initialization completed successfully.')) 