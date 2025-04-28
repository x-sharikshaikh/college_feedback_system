from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Department, Category, Feedback, FeedbackComment
from .serializers import FeedbackSerializer

User = get_user_model()

class FeedbackTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        self.admin = User.objects.create_superuser(
            email='admin@example.com',
            password='adminpass123'
        )
        self.department = Department.objects.create(
            name='Test Department',
            description='Test Description'
        )
        self.category = Category.objects.create(
            name='Test Category',
            description='Test Description'
        )
        self.feedback = Feedback.objects.create(
            title='Test Feedback',
            content='Test Content',
            category=self.category,
            department=self.department,
            created_by=self.user
        )

    def test_create_feedback(self):
        self.client.force_authenticate(user=self.user)
        data = {
            'title': 'New Feedback',
            'content': 'New Content',
            'category_id': self.category.id,
            'department_id': self.department.id,
            'is_anonymous': False
        }
        response = self.client.post('/api/feedback/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Feedback.objects.count(), 2)

    def test_get_feedback_list(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/feedback/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_get_feedback_detail(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/feedback/{self.feedback.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], self.feedback.title)

    def test_update_feedback_status(self):
        self.client.force_authenticate(user=self.admin)
        data = {'status': 'in_progress'}
        response = self.client.patch(
            f'/api/feedback/{self.feedback.id}/update_status/',
            data
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.feedback.refresh_from_db()
        self.assertEqual(self.feedback.status, 'in_progress')

    def test_add_comment(self):
        self.client.force_authenticate(user=self.user)
        data = {'content': 'Test Comment'}
        response = self.client.post(
            f'/api/feedback/{self.feedback.id}/comments/',
            data
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FeedbackComment.objects.count(), 1)

class AdminDashboardTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            email='admin@example.com',
            password='adminpass123'
        )
        self.department = Department.objects.create(
            name='Test Department',
            description='Test Description'
        )
        self.category = Category.objects.create(
            name='Test Category',
            description='Test Description'
        )

    def test_get_dashboard_stats(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/admin/dashboard/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_feedback', response.data)
        self.assertIn('open_feedback', response.data)
        self.assertIn('resolution_rate', response.data)

    def test_get_department_stats(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/admin/dashboard/department-stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], self.department.name)

    def test_get_category_stats(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/admin/dashboard/category-stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], self.category.name) 