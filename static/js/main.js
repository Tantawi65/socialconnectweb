/* ==========================================================================
   Main Module - Pure Vanilla JS Version
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    // Always setup navigation regardless of page
    setupNavigationGlobal();
    
    // Only run if we are on the home page/feed
    const isHomePage = window.location.pathname === '/' || 
                       window.location.pathname === '/home/' ||
                       document.querySelector('.posts-container');
    
    if (!isHomePage) return;

    let postCounter = 0;
    let currentUser = null;
    
    // Get CSRF token for Django requests
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    const csrftoken = getCookie('csrftoken');
    
    initMainPage();
    
    function initMainPage() {
        // Get current user from Django context (should be set in template)
        currentUser = window.currentUserData || { 
            name: 'User', 
            avatar: '/media/defaults/default.jpg' 
        };

        updateUserInterface();
        setupSearch();
        setupPostActions();
        setupProfileNavigation();
    }

    // --- Helper Function: Time Ago ---
    function formatTimeAgo(date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m";
        return "Just now";
    }
    
    function updateUserInterface() {
        // Update user avatar and name across the page
        const userAvatars = document.querySelectorAll('.user-avatar');
        const userNames = document.querySelectorAll('.user-name');
        
        userAvatars.forEach(function(avatar) {
            avatar.src = currentUser.avatar;
            avatar.alt = currentUser.name;
        });
        
        userNames.forEach(function(nameElement) {
            nameElement.textContent = currentUser.name;
        });
        
        // Update profile link section and user card specifically
        const profileImages = document.querySelectorAll('.profile-link-avatar, .profile-section img, .profile-img, .creator-avatar');
        const profileNames = document.querySelectorAll('.profile-link-name, .profile-section h4, .user-card h3');
        
        profileImages.forEach(function(img) {
            img.src = currentUser.avatar;
            img.alt = currentUser.name;
        });
        
        profileNames.forEach(function(nameElement) {
            const text = nameElement.textContent;
            if (text !== 'Shortcuts' && text !== 'See your profile') {
                nameElement.textContent = currentUser.name
            }
        });
    }
    
    function setupSearch() {
        const searchInput = document.querySelector('.search-input');
        const searchButton = document.querySelector('.search-btn');
        
        if (searchInput) {
            let searchTimeout;
            
            // Search on input
            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                const query = this.value.trim();
                
                searchTimeout = setTimeout(() => {
                    performSearch(query);
                }, 300);
            });
            
            // Search on button click
            if (searchButton) {
                searchButton.addEventListener('click', function() {
                    const query = searchInput.value.trim();
                    performSearch(query);
                });
            }
            
            // Search on Enter key
            searchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const query = this.value.trim();
                    performSearch(query);
                }
            });
        }
    }
    
    function performSearch(query) {
        const posts = document.querySelectorAll('.post-card');
        
        if (query.length === 0) {
            // Show all posts if search is empty
            posts.forEach(post => {
                post.style.display = '';
                post.classList.remove('search-highlight');
            });
            return;
        }
        
        const searchLower = query.toLowerCase();
        let foundCount = 0;
        
        posts.forEach(post => {
            const author = post.querySelector('.post-author')?.textContent.toLowerCase() || '';
            const content = post.querySelector('.post-content')?.textContent.toLowerCase() || '';
            
            if (author.includes(searchLower) || content.includes(searchLower)) {
                post.style.display = '';
                post.classList.add('search-highlight');
                foundCount++;
            } else {
                post.style.display = 'none';
                post.classList.remove('search-highlight');
            }
        });
        
        // Show search results feedback
        showSearchFeedback(query, foundCount);
    }
    
    function showSearchFeedback(query, count) {
        // Remove existing feedback
        const existingFeedback = document.querySelector('.search-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }
        
        // Add new feedback
        const feedContainer = document.querySelector('.posts-container');
        if (feedContainer && query.length > 0) {
            const feedback = document.createElement('div');
            feedback.className = 'search-feedback';
            feedback.style.cssText = `
                padding: 15px;
                margin-bottom: 15px;
                background: #f0f2f5;
                border-radius: 8px;
                text-align: center;
                color: #65676b;
                font-size: 14px;
            `;
            feedback.textContent = count > 0 
                ? `Found ${count} post${count === 1 ? '' : 's'} matching "${query}"` 
                : `No posts found matching "${query}"`;
            
            feedContainer.insertBefore(feedback, feedContainer.firstChild);
        }
    }
    
    // Setup post action handlers (like, comment, share)
    function setupPostActions() {
        document.addEventListener('click', function(e) {
            const likeBtn = e.target.closest('.like-btn');
            const commentBtn = e.target.closest('.comment-btn');
            const shareBtn = e.target.closest('.share-btn');
            
            if (likeBtn) {
                handleLike(likeBtn);
            } else if (commentBtn) {
                handleComment(commentBtn);
            } else if (shareBtn) {
                handleShare(shareBtn);
            }
        });
    }
    
    // JSON
    function handleLike(btn) {
        const postCard = btn.closest('.post-card');
        const postId = postCard.dataset.postId;
        
        fetch('/post/' + postId + '/like/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken,
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update UI
                const countSpan = btn.querySelector('.action-count');
                const icon = btn.querySelector('.action-icon');
                
                if (data.liked) {
                    btn.classList.add('liked');
                    icon.textContent = '❤️';
                    btn.style.color = '#e74c3c';
                } else {
                    btn.classList.remove('liked');
                    icon.textContent = '👍';
                    btn.style.color = '';
                }
                
                countSpan.textContent = data.like_count > 0 ? data.like_count : '';
            }
        })
        .catch(error => console.error('Error toggling like:', error));
    }
    
    function handleComment(btn) {
        const postCard = btn.closest('.post-card');
        let commentsSection = postCard.querySelector('.post-comments');
        
        if (!commentsSection) {
            commentsSection = document.createElement('div');
            commentsSection.className = 'post-comments';
            commentsSection.style.display = 'none';
            postCard.appendChild(commentsSection);
        }
        
        const isHidden = commentsSection.style.display === 'none';
        
        if (isHidden) {
            commentsSection.style.display = 'block';
            // Only load interface if it hasn't been initialized
            if (!commentsSection.dataset.initialized) {
                loadCommentsInterface(commentsSection);
                commentsSection.dataset.initialized = 'true';
            }
        } else {
            commentsSection.style.display = 'none';
        }
    }
    
    function loadCommentsInterface(container) {
        const postCard = container.closest('.post-card');
        const postId = postCard.dataset.postId;
        
        // Attach event listeners to existing or new form
        const input = container.querySelector('.comment-input');
        const postBtn = container.querySelector('.comment-publish-btn');
        
        if (!input || !postBtn) return;

        const postComment = () => {
            const text = input.value.trim();
            
            if (!text) return;
            
            // Disable button to prevent double submission
            postBtn.disabled = true;
            
            // Send to Django backend
            const formData = new FormData();
            formData.append('content', text);
            
            fetch('/post/' + postId + '/comment/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrftoken
                },
                body: formData
            })
            .then(response => {
                if (response.ok) {
                    // Add comment to UI
                    let list = container.querySelector('.comments-container');
                    if (!list) {
                        list = document.createElement('div');
                        list.className = 'comments-container';
                        list.style.marginBottom = '15px';
                        container.insertBefore(list, container.querySelector('.comment-form'));
                    }
                    
                    const newComment = document.createElement('div');
                    newComment.className = 'comment-item';
                    newComment.style.cssText = 'display: flex; align-items: flex-start; margin-bottom: 12px;';
                    newComment.innerHTML = `
                        <img src="${currentUser.avatar}" class="comment-avatar" 
                             style="width: 32px; height: 32px; border-radius: 50%; margin-right: 10px; flex-shrink: 0;">
                        <div class="comment-content" style="flex: 1;">
                            <div class="comment-bubble" style="background: #ffffff; border-radius: 16px; padding: 8px 12px; display: inline-block; border: 1px solid #e4e6ea; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                                <div class="comment-author" style="font-weight: 600; font-size: 13px; color: #050505; margin-bottom: 2px;">${currentUser.name}</div>
                                <div class="comment-text" style="font-size: 14px; color: #050505; line-height: 1.3;">${text}</div>
                            </div>
                        </div>`;
                    list.appendChild(newComment);
                    input.value = '';
                    
                    // Update count
                    const countSpan = postCard.querySelector('.comment-btn .action-count');
                    let c = parseInt(countSpan.textContent) || 0;
                    countSpan.textContent = c + 1;
                    
                    postBtn.disabled = false;
                } else {
                    alert('Failed to post comment');
                    postBtn.disabled = false;
                }
            })
            .catch(error => {
                console.error('Error posting comment:', error);
                alert('Failed to post comment');
                postBtn.disabled = false;
            });
        };
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                postComment();
            }
        });

        postBtn.addEventListener('click', postComment);
    }
    
    function handleShare(btn) {
        const postCard = btn.closest('.post-card');
        const postId = postCard.dataset.postId;
        fetch(`/post/${postId}/share/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrftoken,
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Post shared to your profile!');
            } else {
                alert('Failed to share post: ' + (data.message || 'Unknown error'));
            }
        })
        .catch(() => {
            alert('Failed to share post.');
        });
    }
    
    function setupProfileNavigation() {
        // Profile link in sidebar
        const profileLink = document.getElementById('profile-link');
        if (profileLink) {
            profileLink.style.cursor = 'pointer';
            profileLink.addEventListener('click', function() {
                window.location.href = '/profile/';
            });
        }
    }
    
    // Global navigation setup (runs on all pages)
    function setupNavigationGlobal() {
        // User Avatar Dropdown
        const userAvatar = document.getElementById('user-avatar-btn');
        const dropdownMenu = document.getElementById('user-dropdown');
        const userMenuContainer = document.getElementById('user-menu-container');
        
        if (userAvatar && dropdownMenu) {
            userAvatar.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Toggle display and position
                if (dropdownMenu.style.display === 'block') {
                    dropdownMenu.style.display = 'none';
                } else {
                    // Get avatar position
                    const rect = userAvatar.getBoundingClientRect();
                    
                    // Position dropdown below avatar
                    dropdownMenu.style.position = 'fixed';
                    dropdownMenu.style.top = (rect.bottom + 8) + 'px';
                    dropdownMenu.style.right = '16px';
                    dropdownMenu.style.display = 'block';
                }
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', function(e) {
                if (!userAvatar.contains(e.target) && !dropdownMenu.contains(e.target)) {
                    dropdownMenu.style.display = 'none';
                }
            });
        }
    }
});