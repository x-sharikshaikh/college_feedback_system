from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FeedbackViewSet, CategoryViewSet, DepartmentViewSet
from .views.admin import AdminDashboardViewSet

router = DefaultRouter()
router.register(r'feedback', FeedbackViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'departments', DepartmentViewSet)
router.register(r'admin/dashboard', AdminDashboardViewSet, basename='admin-dashboard')

urlpatterns = [
    path('', include(router.urls)),
] 