from rest_framework import serializers
from .models import Feedback, FeedbackResponse
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'user_type']

class FeedbackSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Feedback
        fields = [
            'id', 'title', 'description', 'category', 'photo', 
            'status', 'student', 'student_name', 'assigned_admin',
            'created_at', 'updated_at', 'resolved_at'
        ]
        read_only_fields = ['student', 'assigned_admin', 'status', 'resolved_at']
    
    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name}" if obj.student.first_name or obj.student.last_name else obj.student.email
    
    def create(self, validated_data):
        # Set the student to the current user
        validated_data['student'] = self.context['request'].user
        
        # Assign an admin based on the feedback category
        category = validated_data.get('category')
        admin_users = User.objects.filter(user_type='admin')
        
        if admin_users.exists():
            # Simple round-robin assignment - in a real app, you'd have more complex logic
            admin_index = Feedback.objects.count() % admin_users.count()
            validated_data['assigned_admin'] = admin_users[admin_index]
        
        return super().create(validated_data)

class FeedbackResponseSerializer(serializers.ModelSerializer):
    responder_name = serializers.SerializerMethodField()
    
    class Meta:
        model = FeedbackResponse
        fields = [
            'id', 'feedback', 'responder', 'responder_name', 
            'content', 'created_at', 'is_internal', 'attachment'
        ]
        read_only_fields = ['responder', 'created_at']
    
    def get_responder_name(self, obj):
        return f"{obj.responder.first_name} {obj.responder.last_name}" if obj.responder.first_name or obj.responder.last_name else obj.responder.email
    
    def create(self, validated_data):
        # Set the responder to the current user
        validated_data['responder'] = self.context['request'].user
        return super().create(validated_data) 