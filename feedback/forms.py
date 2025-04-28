from django import forms
from .models import Feedback, FeedbackComment

class FeedbackForm(forms.ModelForm):
    """
    Form for submitting new feedback
    """
    class Meta:
        model = Feedback
        fields = ['title', 'category', 'description', 'photo']
        widgets = {
            'title': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter a brief title for your feedback'
            }),
            'category': forms.Select(attrs={
                'class': 'form-select'
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 5,
                'placeholder': 'Describe your feedback in detail'
            }),
            'photo': forms.FileInput(attrs={
                'class': 'form-control'
            })
        }
        
    def clean_photo(self):
        """Validate that photo is an image file"""
        photo = self.cleaned_data.get('photo')
        if photo:
            if not photo.name.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                raise forms.ValidationError('File must be an image (PNG, JPG, JPEG, GIF)')
            if photo.size > 5 * 1024 * 1024:  # 5MB
                raise forms.ValidationError('Image file size should not exceed 5MB')
        return photo

class FeedbackCommentForm(forms.ModelForm):
    """
    Form for adding comments to feedback
    """
    class Meta:
        model = FeedbackComment
        fields = ['comment']
        widgets = {
            'comment': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': 'Add your comment here'
            })
        }

class CommentForm(forms.ModelForm):
    """Form for adding comments to feedbacks"""
    
    class Meta:
        model = FeedbackComment
        fields = ['comment']
        widgets = {
            'comment': forms.Textarea(attrs={'class': 'form-control', 'rows': 3, 'placeholder': 'Enter your comment here...'}),
        }
        labels = {
            'comment': 'Add a Comment',
        } 