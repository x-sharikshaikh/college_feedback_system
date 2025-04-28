from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Department, Category, UserProfile, Feedback, FeedbackComment

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = ['id', 'user', 'department', 'role', 'created_at', 'updated_at']

class FeedbackCommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = FeedbackComment
        fields = ['id', 'feedback', 'user', 'content', 'created_at', 'updated_at']
        read_only_fields = ['feedback', 'user']

class FeedbackSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)
    created_by = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    comments = FeedbackCommentSerializer(many=True, read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source='category',
        write_only=True
    )
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source='department',
        write_only=True
    )
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='assigned_to',
        write_only=True,
        required=False
    )

    class Meta:
        model = Feedback
        fields = [
            'id', 'title', 'content', 'category', 'department',
            'status', 'priority', 'created_by', 'assigned_to',
            'is_anonymous', 'attachment', 'created_at', 'updated_at',
            'resolved_at', 'comments', 'category_id', 'department_id',
            'assigned_to_id'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at', 'resolved_at']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data) 