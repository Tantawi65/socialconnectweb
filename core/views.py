from django.http import JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Q
from django.utils import timezone
from .models import User, Post, Comment, Like, Friendship, FriendRequest, Conversation, Message

@login_required
def share_post(request, post_id):
    if request.method == 'POST':
        original_post = get_object_or_404(Post, id=post_id)
        # Copy content and image (if any), and set shared_from
        new_post = Post.objects.create(
            user=request.user,
            content=original_post.content,
            image=original_post.image if original_post.image else None,
            shared_from=original_post
        )
        return JsonResponse({'success': True, 'message': 'Post shared successfully!'})
    return JsonResponse({'success': False, 'message': 'Invalid request'}, status=400)


def signup_view(request):
    if request.method == 'POST':

        import re
        username = request.POST.get('username')
        email = request.POST.get('email')
        password = request.POST.get('password')
        password_confirm = request.POST.get('password_confirm')

        # Username: 3-20 chars, letters, numbers, _
        if not re.match(r'^[a-zA-Z0-9_]{3,20}$', username or ''):
            messages.error(request, 'Username must be 3-20 characters, letters, numbers, or _')
            return render(request, 'signup.html')

        # Email: basic pattern
        if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email or ''):
            messages.error(request, 'Enter a valid email address')
            return render(request, 'signup.html')

        # Password: any char, min 6
        if not password or len(password) < 6:
            messages.error(request, 'Password must be at least 6 characters')
            return render(request, 'signup.html')

        if password != password_confirm:
            messages.error(request, 'Passwords do not match')
            return render(request, 'signup.html')

        if User.objects.filter(username=username).exists():
            messages.error(request, 'Username already exists')
            return render(request, 'signup.html')

        if User.objects.filter(email=email).exists():
            messages.error(request, 'Email already exists')
            return render(request, 'signup.html')

        user = User.objects.create_user(username=username, email=email, password=password)

        # Handle profile photo upload
        if 'profile_photo' in request.FILES:
            user.profile_photo = request.FILES['profile_photo']
            user.save()

        login(request, user)
        messages.success(request, 'Account created successfully!')
        return redirect('home')

    return render(request, 'signup.html')


def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            user.last_active = timezone.now()
            user.save(update_fields=['last_active'])
            return redirect('home')
        else:
            messages.error(request, 'Invalid username or password')
    
    return render(request, 'login.html')


def logout_view(request):
    logout(request)
    return redirect('login')


@login_required
def home_view(request):
    if request.method == 'POST':
        content = request.POST.get('content')
        image = request.FILES.get('image')
        
        if content:
            post = Post.objects.create(user=request.user, content=content)
            if image:
                post.image = image
                post.save()
            messages.success(request, 'Post created successfully!')
            return redirect('home')
    
    # Get posts from user and friends
    friend_ids = Friendship.objects.filter(user=request.user).values_list('friend_id', flat=True)
    posts = Post.objects.filter(Q(user=request.user) | Q(user_id__in=friend_ids))
    
    # Get IDs of users who sent requests to current user
    incoming_request_ids = FriendRequest.objects.filter(to_user=request.user).values_list('from_user_id', flat=True)
    
    # Get suggested users (exclude friends and users who sent requests)
    suggested_users_query = User.objects.exclude(id=request.user.id).exclude(id__in=friend_ids).exclude(id__in=incoming_request_ids)[:5]
    
    # Get pending request IDs (requests sent by current user)
    pending_request_ids = FriendRequest.objects.filter(from_user=request.user).values_list('to_user_id', flat=True)
    
    # Prepare suggested users with status
    suggested_users = []
    for user in suggested_users_query:
        suggested_users.append({
            'user': user,
            'has_pending_request': user.id in pending_request_ids
        })
    
    context = {
        'posts': posts,
        'user': request.user,
        'suggested_users': suggested_users
    }
    return render(request, 'index.html', context)


@login_required
def profile_view(request, username=None):
    if username:
        profile_user = get_object_or_404(User, username=username)
    else:
        profile_user = request.user
    
    if request.method == 'POST' and profile_user == request.user:
        # Update profile
        profile_user.bio = request.POST.get('bio', '')
        profile_user.location = request.POST.get('location', '')
        profile_user.website = request.POST.get('website', '')
        profile_user.gender = request.POST.get('gender', '')
        profile_user.relationship_status = request.POST.get('relationship_status', '')
        
        if 'profile_photo' in request.FILES:
            profile_user.profile_photo = request.FILES['profile_photo']
        
        if 'cover_photo' in request.FILES:
            profile_user.cover_photo = request.FILES['cover_photo']
        
        profile_user.save()
        messages.success(request, 'Profile updated successfully!')
        return redirect('profile', username=profile_user.username)
    
    posts = Post.objects.filter(user=profile_user)
    
    # Get user's friends
    friend_ids = Friendship.objects.filter(user=profile_user).values_list('friend_id', flat=True)
    friends = User.objects.filter(id__in=friend_ids)[:6]  # Show first 6 friends
    
    # Check friendship status
    is_friend = Friendship.objects.filter(user=request.user, friend=profile_user).exists()
    has_sent_request = FriendRequest.objects.filter(from_user=request.user, to_user=profile_user).exists()
    received_request = FriendRequest.objects.filter(from_user=profile_user, to_user=request.user).first()
    has_received_request = received_request is not None
    
    context = {
        'user': request.user,  # Explicitly add logged-in user for navbar
        'profile_user': profile_user,
        'posts': posts,
        'friends': friends,
        'friends_count': Friendship.objects.filter(user=profile_user).count(),
        'is_own_profile': profile_user == request.user,
        'is_friend': is_friend,
        'has_sent_request': has_sent_request,
        'has_received_request': has_received_request,
        'friend_request_id': received_request.id if received_request else None
    }
    return render(request, 'profile.html', context)


@login_required
def messages_view(request):
    # Get all conversations for current user
    conversations = request.user.conversations.all().order_by('-updated_at')
    
    # Get user's friends
    friend_ids = Friendship.objects.filter(user=request.user).values_list('friend_id', flat=True)
    friends = User.objects.filter(id__in=friend_ids)
    
    context = {
        'conversations': conversations,
        'friends': friends,
        'user': request.user
    }
    return render(request, 'messages.html', context)


@login_required
def conversation_view(request, conversation_id):
    conversation = get_object_or_404(Conversation, id=conversation_id, participants=request.user)
    
    if request.method == 'POST':
        content = request.POST.get('content', '')
        attachment = request.FILES.get('attachment')
        
        if content or attachment:
            message = Message.objects.create(
                conversation=conversation, 
                sender=request.user, 
                content=content
            )
            if attachment:
                message.attachment = attachment
                message.save()
            
            # Update sender's last_active
            request.user.last_active = timezone.now()
            request.user.save(update_fields=['last_active'])
            
            conversation.updated_at = timezone.now()
            conversation.save()
            
            # If AJAX request, return success
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest' or 'X-CSRFToken' in request.headers:
                from django.http import JsonResponse
                return JsonResponse({'success': True})
            
            return redirect('conversation', conversation_id=conversation_id)
    
    messages_list = conversation.messages.all().order_by('created_at')
    # Mark messages as read
    messages_list.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
    
    # Get the other user in the conversation
    other_user = conversation.participants.exclude(id=request.user.id).first()
    
    context = {
        'conversation': conversation,
        'messages': messages_list,
        'user': request.user,
        'other_user': other_user
    }
    return render(request, 'conversation.html', context)


@login_required
def get_messages_json(request, conversation_id):
    from django.http import JsonResponse
    conversation = get_object_or_404(Conversation, id=conversation_id, participants=request.user)
    messages_list = conversation.messages.all().order_by('created_at')
    
    # Mark messages as read
    messages_list.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
    
    messages_data = []
    for msg in messages_list:
        messages_data.append({
            'id': msg.id,
            'content': msg.content,
            'sender_username': msg.sender.username,
            'sender_avatar': msg.sender.get_profile_photo_url(),
            'is_own': msg.sender == request.user,
            'created_at': msg.created_at.strftime('%I:%M %p'),
            'has_attachment': bool(msg.attachment),
            'attachment_url': msg.get_attachment_url(),
            'is_image': msg.is_image()
        })
    
    return JsonResponse({'messages': messages_data})


@login_required
def delete_message(request, message_id):
    from django.http import JsonResponse
    
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid method'}, status=400)
    
    message = get_object_or_404(Message, id=message_id, sender=request.user)
    message.delete()
    
    return JsonResponse({'success': True})


@login_required
def get_user_status(request, user_id):
    from django.http import JsonResponse
    user = get_object_or_404(User, id=user_id)
    return JsonResponse({
        'is_online': user.is_online(),
        'status': user.get_last_active_display()
    })


@login_required
def like_post(request, post_id):
    from django.http import JsonResponse
    
    post = get_object_or_404(Post, id=post_id)
    like, created = Like.objects.get_or_create(post=post, user=request.user)
    
    if not created:
        like.delete()
        liked = False
    else:
        liked = True
    
    like_count = post.likes.count()
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest' or request.content_type == 'application/json':
        return JsonResponse({
            'success': True,
            'liked': liked,
            'like_count': like_count
        })
    
    return redirect('home')


@login_required
def add_comment(request, post_id):
    from django.http import JsonResponse
    
    if request.method == 'POST':
        post = get_object_or_404(Post, id=post_id)
        content = request.POST.get('content')
        
        if content:
            comment = Comment.objects.create(post=post, user=request.user, content=content)
            
            # If AJAX request, return JSON
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest' or 'X-CSRFToken' in request.headers:
                return JsonResponse({
                    'success': True,
                    'comment': {
                        'id': comment.id,
                        'content': comment.content,
                        'user': comment.user.username,
                        'avatar': comment.user.get_profile_photo_url(),
                        'created_at': comment.created_at.strftime('%Y-%m-%d %H:%M:%S')
                    },
                    'comment_count': post.comments.count()
                })
    
    return redirect('home')


@login_required
def get_comments(request, post_id):
    from django.http import JsonResponse
    
    post = get_object_or_404(Post, id=post_id)
    comments = post.comments.all().order_by('created_at')
    
    comments_data = []
    for comment in comments:
        comments_data.append({
            'id': comment.id,
            'content': comment.content,
            'user': comment.user.username,
            'avatar': comment.user.get_profile_photo_url(),
            'created_at': comment.created_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    
    return JsonResponse({
        'comments': comments_data,
        'count': comments.count()
    })


@login_required
def send_friend_request(request, username):
    to_user = get_object_or_404(User, username=username)
    
    if to_user != request.user:
        FriendRequest.objects.get_or_create(from_user=request.user, to_user=to_user)
        messages.success(request, f'Friend request sent to {to_user.username}')
    
    return redirect('profile', username=username)


@login_required
def cancel_friend_request(request, username):
    to_user = get_object_or_404(User, username=username)
    
    # Delete the friend request
    FriendRequest.objects.filter(from_user=request.user, to_user=to_user).delete()
    messages.success(request, f'Friend request to {to_user.username} cancelled')
    
    # Get the referer to redirect back to the same page
    referer = request.META.get('HTTP_REFERER')
    if referer:
        return redirect(referer)
    return redirect('home')


@login_required
def accept_friend_request(request, request_id):
    friend_request = get_object_or_404(FriendRequest, id=request_id, to_user=request.user)
    
    # Create friendship both ways
    Friendship.objects.create(user=request.user, friend=friend_request.from_user)
    Friendship.objects.create(user=friend_request.from_user, friend=request.user)
    
    # Delete the request
    friend_request.delete()
    
    messages.success(request, f'You are now friends with {friend_request.from_user.username}')
    
    # Get the referer to redirect back to the same page
    referer = request.META.get('HTTP_REFERER')
    if referer:
        return redirect(referer)
    return redirect('home')


@login_required
def reject_friend_request(request, request_id):
    friend_request = get_object_or_404(FriendRequest, id=request_id, to_user=request.user)
    
    # Delete the request without creating friendship
    friend_request.delete()
    
    messages.success(request, f'Friend request from {friend_request.from_user.username} declined')
    
    # Get the referer to redirect back to the same page
    referer = request.META.get('HTTP_REFERER')
    if referer:
        return redirect(referer)
    return redirect('home')


@login_required
def unfriend(request, username):
    friend_user = get_object_or_404(User, username=username)
    
    # Delete friendship both ways
    Friendship.objects.filter(user=request.user, friend=friend_user).delete()
    Friendship.objects.filter(user=friend_user, friend=request.user).delete()
    
    messages.success(request, f'You are no longer friends with {friend_user.username}')
    
    # Get the referer to redirect back to the same page
    referer = request.META.get('HTTP_REFERER')
    if referer:
        return redirect(referer)
    return redirect('home')


@login_required
def start_conversation(request, username):
    other_user = get_object_or_404(User, username=username)
    
    # Check if conversation already exists
    conversation = Conversation.objects.filter(participants=request.user).filter(participants=other_user).first()
    
    if not conversation:
        conversation = Conversation.objects.create()
        conversation.participants.add(request.user, other_user)
    
    return redirect('conversation', conversation_id=conversation.id)


@login_required
def find_friends_view(request):
    # Get list of friend IDs
    friend_ids = Friendship.objects.filter(user=request.user).values_list('friend_id', flat=True)
    
    # Get IDs of users who sent requests to current user
    incoming_request_ids = FriendRequest.objects.filter(to_user=request.user).values_list('from_user_id', flat=True)
    
    # Get all users except current user, friends, and users who sent requests
    all_users = User.objects.exclude(id=request.user.id).exclude(id__in=friend_ids).exclude(id__in=incoming_request_ids)
    
    # Get list of users who have pending requests (sent by current user)
    pending_request_ids = FriendRequest.objects.filter(from_user=request.user).values_list('to_user_id', flat=True)
    
    # Annotate users with friendship status
    users_list = []
    for user in all_users:
        has_pending_request = user.id in pending_request_ids
        users_list.append({
            'user': user,
            'is_friend': False,  # Already excluded friends
            'has_pending_request': has_pending_request
        })
    
    context = {
        'users': users_list
    }
    return render(request, 'find_friends.html', context)


@login_required
def all_friends_view(request, username=None):
    if username:
        profile_user = get_object_or_404(User, username=username)
    else:
        profile_user = request.user
    
    # Get all friends
    friend_ids = Friendship.objects.filter(user=profile_user).values_list('friend_id', flat=True)
    friends = User.objects.filter(id__in=friend_ids).order_by('username')
    
    context = {
        'profile_user': profile_user,
        'friends': friends,
        'is_own_profile': profile_user == request.user
    }
    return render(request, 'all_friends.html', context)


@login_required
def delete_post(request, post_id):
    from django.http import JsonResponse
    
    if request.method == 'POST':
        post = get_object_or_404(Post, id=post_id)
        
        # Check if user owns the post
        if post.user == request.user:
            post.delete()
            return JsonResponse({'success': True, 'message': 'Post deleted successfully'})
        else:
            return JsonResponse({'success': False, 'message': 'You do not have permission to delete this post'}, status=403)
    
    return JsonResponse({'success': False, 'message': 'Invalid request'}, status=400)
