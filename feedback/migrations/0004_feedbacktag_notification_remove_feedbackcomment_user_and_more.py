# Generated by Django 4.2.7 on 2025-04-19 18:02

from django.conf import settings
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
import feedback.models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('feedback', '0003_feedbackcategory_created_at'),
    ]

    operations = [
        migrations.CreateModel(
            name='FeedbackTag',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50, unique=True)),
                ('color', models.CharField(default='#000000', max_length=7)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('notification_type', models.CharField(choices=[('feedback_created', 'New Feedback'), ('feedback_updated', 'Feedback Updated'), ('feedback_status_changed', 'Status Changed'), ('feedback_assigned', 'Feedback Assigned'), ('feedback_comment', 'New Comment')], max_length=50)),
                ('message', models.TextField()),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.RemoveField(
            model_name='feedbackcomment',
            name='user',
        ),
        migrations.AddField(
            model_name='feedback',
            name='department',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='feedbackcategory',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name='feedbackcomment',
            name='author',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='feedback_comments', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='feedback',
            name='attachment',
            field=models.ImageField(blank=True, null=True, upload_to=feedback.models.feedback_attachment_path, validators=[feedback.models.validate_image_file]),
        ),
        migrations.AlterField(
            model_name='feedback',
            name='category',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='feedbacks', to='feedback.feedbackcategory'),
        ),
        migrations.AlterField(
            model_name='feedback',
            name='description',
            field=models.TextField(validators=[django.core.validators.MinLengthValidator(10)]),
        ),
        migrations.AlterField(
            model_name='feedbackcomment',
            name='attachment',
            field=models.ImageField(blank=True, null=True, upload_to=feedback.models.comment_attachment_path, validators=[feedback.models.validate_image_file]),
        ),
        migrations.AlterField(
            model_name='feedbackcomment',
            name='comment',
            field=models.TextField(validators=[django.core.validators.MinLengthValidator(1)]),
        ),
        migrations.AlterField(
            model_name='feedbackhistory',
            name='new_status',
            field=models.CharField(default='pending', max_length=20),
        ),
        migrations.AddIndex(
            model_name='feedback',
            index=models.Index(fields=['department'], name='feedback_fe_departm_00a37a_idx'),
        ),
        migrations.AddIndex(
            model_name='feedbackcomment',
            index=models.Index(fields=['feedback', 'created_at'], name='feedback_fe_feedbac_8bca7e_idx'),
        ),
        migrations.AddIndex(
            model_name='feedbackcomment',
            index=models.Index(fields=['author'], name='feedback_fe_author__271ae1_idx'),
        ),
        migrations.AddField(
            model_name='notification',
            name='feedback',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='feedback.feedback'),
        ),
        migrations.AddField(
            model_name='notification',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddIndex(
            model_name='feedbacktag',
            index=models.Index(fields=['name'], name='feedback_fe_name_8d6868_idx'),
        ),
        migrations.AddField(
            model_name='feedback',
            name='tags',
            field=models.ManyToManyField(blank=True, related_name='feedbacks', to='feedback.feedbacktag'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['user', 'is_read'], name='feedback_no_user_id_e71caa_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['created_at'], name='feedback_no_created_9e8e17_idx'),
        ),
    ]
