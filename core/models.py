from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


class User(AbstractUser):
    bio = models.TextField(blank=True)
    profile_photo = models.ImageField(upload_to='profiles/', blank=True, null=True)
    cover_photo = models.ImageField(upload_to='covers/', blank=True, null=True)
    date_of_birth = models.DateField(null=True, blank=True)
    location = models.CharField(max_length=100, blank=True)
    website = models.URLField(blank=True)
    gender = models.CharField(max_length=10, choices=[('male', 'Male'), ('female', 'Female')], blank=True)
    relationship_status = models.CharField(max_length=10, choices=[('single', 'Single'), ('married', 'Married')], blank=True)
    last_active = models.DateTimeField(default=timezone.now)
    
    def get_profile_photo_url(self):
        if self.profile_photo:
            return self.profile_photo.url
        return '/media/defaults/default-avatar.jpg'
    
    def get_cover_photo_url(self):
        if self.cover_photo:
            return self.cover_photo.url
        return '/media/defaults/default-cover.jpg'
    
    def is_online(self):
        if not self.last_active:
            return False
        return timezone.now() - self.last_active < timezone.timedelta(minutes=2)
    
    def get_last_active_display(self):
        if self.is_online():
            return 'Active now'
        
        if not self.last_active:
            return 'Offline'
        
        diff = timezone.now() - self.last_active
        
        if diff.days > 0:
            return f'Active {diff.days}d ago'
        elif diff.seconds >= 3600:
            hours = diff.seconds // 3600
            return f'Active {hours}h ago'
        elif diff.seconds >= 60:
            minutes = diff.seconds // 60
            return f'Active {minutes}m ago'
        else:
            return 'Active just now'


class Post(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    content = models.TextField()
    image = models.ImageField(upload_to='posts/', blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    shared_from = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='shared_posts')
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.created_at}"


class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.user.username} on {self.post}"


class Like(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        unique_together = ('post', 'user')
    
    def __str__(self):
        return f"{self.user.username} likes {self.post}"


class Friendship(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friendships')
    friend = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friends')
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        unique_together = ('user', 'friend')
    
    def __str__(self):
        return f"{self.user.username} & {self.friend.username}"


class FriendRequest(models.Model):
    from_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_requests')
    to_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_requests')
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        unique_together = ('from_user', 'to_user')
    
    def __str__(self):
        return f"{self.from_user.username} → {self.to_user.username}"


class Conversation(models.Model):
    participants = models.ManyToManyField(User, related_name='conversations')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Conversation {self.id}"


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField(blank=True)
    attachment = models.FileField(upload_to='message_attachments/', blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    is_read = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.sender.username} in {self.conversation}"
    
    def get_attachment_url(self):
        if self.attachment:
            return self.attachment.url
        return None
    
    def is_image(self):
        if self.attachment:
            ext = self.attachment.name.lower().split('.')[-1]
            return ext in ['jpg', 'jpeg', 'png', 'gif', 'webp']
        return False
