from django.contrib import admin
from .models import FeedbackCategory, Feedback, FeedbackResponse, FeedbackTag

@admin.register(FeedbackCategory)
class FeedbackCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'category_type', 'is_active', 'created_at')
    list_filter = ('category_type', 'is_active')
    search_fields = ('name', 'description')
    ordering = ('name',)

@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'user', 'status', 'rating', 'created_at')
    list_filter = ('status', 'category', 'rating', 'is_anonymous')
    search_fields = ('title', 'content', 'user__email')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')

@admin.register(FeedbackResponse)
class FeedbackResponseAdmin(admin.ModelAdmin):
    list_display = ('feedback', 'responder', 'is_internal', 'created_at')
    list_filter = ('is_internal', 'created_at')
    search_fields = ('feedback__title', 'responder__email', 'content')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')

@admin.register(FeedbackTag)
class FeedbackTagAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name', 'description')
    ordering = ('name',)