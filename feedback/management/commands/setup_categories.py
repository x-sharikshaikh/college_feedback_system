from django.core.management.base import BaseCommand
from feedback.models import FeedbackCategory

class Command(BaseCommand):
    help = 'Creates initial feedback categories'

    def handle(self, *args, **kwargs):
        # Define categories to create
        categories = [
            {
                'name': 'Academic',
                'description': 'Issues related to courses, curriculum, teaching methods, and academic resources',
            },
            {
                'name': 'Infrastructure',
                'description': 'Feedback about buildings, classrooms, labs, wifi, and other physical facilities',
            },
            {
                'name': 'Administrative',
                'description': 'Issues with administration, enrollment, fees, or general management',
            },
            {
                'name': 'Faculty',
                'description': 'Feedback about professors, teaching assistants, and academic staff',
            },
            {
                'name': 'Student Services',
                'description': 'Comments about student support services, counseling, and extracurricular activities',
            },
            {
                'name': 'Other',
                'description': 'Any other feedback that doesn\'t fit into the above categories',
            }
        ]

        # Create categories if they don't exist
        for category_data in categories:
            category, created = FeedbackCategory.objects.get_or_create(
                name=category_data['name'],
                defaults=category_data
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created category: {category.name}"))
            else:
                self.stdout.write(self.style.WARNING(f"Category already exists: {category.name}")) 