from django.contrib import admin
from .models import FeedbackCategory, Feedback, FeedbackComment

class FeedbackCommentInline(admin.TabularInline):
    model = FeedbackComment
    extra = 0
    fields = ('user', 'comment', 'created_at')
    readonly_fields = ('created_at',)

class FeedbackAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'student', 'status', 'created_at')
    list_filter = ('status', 'category', 'created_at')
    search_fields = ('title', 'description', 'student__email')
    readonly_fields = ('created_at',)
    inlines = [FeedbackCommentInline]

class FeedbackCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name', 'description')

admin.site.register(FeedbackCategory, FeedbackCategoryAdmin)
admin.site.register(Feedback, FeedbackAdmin)
admin.site.register(FeedbackComment)