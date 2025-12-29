/* ==========================================================================
   Messages Module - Django Integration
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // Only run on messages page
    if (!document.getElementById('messages-area')) {
        return;
    }

    // --- State Variables ---
    let activeConversationId = null;
    let activeConversationData = null;
    let statusUpdateInterval = null;

    // --- Initialize ---
    initMessagesPage();

    function initMessagesPage() {
        console.log('Initializing messages page...');
        
        setupConversationClicks();
        setupMessageInput();
        setupSearch();
        
        // Load first conversation if exists
        const firstConv = document.querySelector('.conversation-item');
        if (firstConv && firstConv.dataset.conversationId) {
            firstConv.click();
        }
    }
    
    // Update user status
    function updateUserStatus(userId) {
        if (!userId) return;
        
        fetch(`/user/${userId}/status/`)
            .then(response => response.json())
            .then(data => {
                const statusElement = document.getElementById('chat-user-status');
                if (statusElement) {
                    statusElement.textContent = data.status;
                    statusElement.style.color = data.is_online ? '#31a24c' : '#65676b';
                }
            })
            .catch(error => console.error('Error fetching status:', error));
    }

    // --- Conversation Handling ---
    function setupConversationClicks() {
        const convItems = document.querySelectorAll('.conversation-item');
        
        convItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                
                const convId = this.dataset.conversationId;
                const userName = this.dataset.userName;
                const userAvatar = this.dataset.userAvatar;
                const userId = this.dataset.userId;
                
                setActiveConversation(this);
                loadConversation(convId, userName, userAvatar, userId);
            });
        });
    }

    function setActiveConversation(element) {
        // Remove active class from all
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add to current
        element.classList.add('active');
    }

    function loadConversation(convId, userName, userAvatar, userId) {
        activeConversationId = convId;
        activeConversationData = { userName, userAvatar, userId };

        // Toggle Views - hide no-conversation and show active-chat
        const noConversation = document.getElementById('no-conversation');
        const activeChat = document.getElementById('active-chat');

        if (noConversation) {
            noConversation.style.display = 'none';
        }
        if (activeChat) {
            activeChat.style.display = 'flex';
            activeChat.style.flexDirection = 'column';
        }

        // Update Header
        const chatName = document.getElementById('chat-user-name');
        const chatAvatar = document.getElementById('chat-avatar');
        const conversationInput = document.getElementById('conversation-id');

        if (chatName) chatName.textContent = userName;
        if (chatAvatar) {
            chatAvatar.src = userAvatar;
            chatAvatar.alt = userName;
        }
        if (conversationInput) conversationInput.value = convId;

        // Update user status
        updateUserStatus(userId);
        
        // Clear previous status update interval
        if (statusUpdateInterval) {
            clearInterval(statusUpdateInterval);
        }
        
        // Set up new status update interval (every 10 seconds)
        statusUpdateInterval = setInterval(() => {
            updateUserStatus(userId);
        }, 10000);

        // Load messages from server
        fetchMessages(convId);
    }

    function fetchMessages(convId) {
        fetch(`/conversation/${convId}/messages/`)
            .then(response => response.json())
            .then(data => {
                const messagesList = document.getElementById('messages-list');
                if (!messagesList) {
                    console.error('messages-list element not found');
                    return;
                }
                
                // Clear existing messages
                messagesList.innerHTML = '';
                
                // Add date divider
                const dateDivider = document.createElement('div');
                dateDivider.className = 'date-divider';
                dateDivider.innerHTML = '<span class="date-text">Today</span>';
                messagesList.appendChild(dateDivider);
                
                // Render each message
                data.messages.forEach(msg => {
                    const messageDiv = createMessageElement(msg);
                    messagesList.appendChild(messageDiv);
                });
                
                scrollToBottom();
            })
            .catch(error => {
                console.error('Error fetching messages:', error);
                const messagesList = document.getElementById('messages-list');
                if (messagesList) {
                    messagesList.innerHTML = '<div style="text-align: center; padding: 20px; color: #65676b;">Error loading messages. Please refresh.</div>';
                }
            });
    }
    
    function createMessageElement(msg) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.is_own ? 'sent' : 'received'}`;
        
        let contentHtml = '';
        
        // Add attachment if exists
        if (msg.has_attachment) {
            if (msg.is_image) {
                contentHtml += `<img src="${msg.attachment_url}" alt="Attachment" style="max-width: 300px; border-radius: 8px; margin-bottom: 8px; display: block;" />`;
            } else {
                const fileName = msg.attachment_url.split('/').pop();
                contentHtml += `<a href="${msg.attachment_url}" target="_blank" style="display: block; padding: 8px 12px; background: #f0f2f5; border-radius: 8px; text-decoration: none; color: #050505; margin-bottom: 8px;">📎 ${fileName}</a>`;
            }
        }
        
        // Add text content
        if (msg.content) {
            contentHtml += `<p>${escapeHtml(msg.content)}</p>`;
        }
        
        if (msg.is_own) {
            messageDiv.className = `message sent`;
            messageDiv.setAttribute('data-message-id', msg.id);
            messageDiv.innerHTML = `
                <div class="message-content">
                    <div class="message-bubble">
                        ${contentHtml}
                    </div>
                    <div class="message-actions">
                        <time class="message-time">${msg.created_at}</time>
                        <button class="message-menu-btn" data-message-id="${msg.id}" type="button">⋯</button>
                    </div>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <img src="${msg.sender_avatar}" alt="${msg.sender_username}" class="message-avatar" />
                <div class="message-content">
                    <div class="message-bubble">
                        ${contentHtml}
                    </div>
                    <time class="message-time">${msg.created_at}</time>
                </div>
            `;
        }
        
        return messageDiv;
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Setup event delegation for message menu buttons
    document.addEventListener('click', function(e) {
        const menuBtn = e.target.closest('.message-menu-btn');
        if (menuBtn) {
            e.stopPropagation();
            const messageId = menuBtn.dataset.messageId;
            
            // Remove any existing menu
            const existingMenu = document.querySelector('.message-dropdown-menu');
            if (existingMenu) {
                existingMenu.remove();
                return;
            }
            
            // Create dropdown menu
            const menu = document.createElement('div');
            menu.className = 'message-dropdown-menu';
            menu.innerHTML = `
                <button data-delete-id="${messageId}">
                    <span>🗑️</span> Delete Message
                </button>
            `;
            
            // Position menu near the button
            const rect = menuBtn.getBoundingClientRect();
            menu.style.top = rect.bottom + 5 + 'px';
            menu.style.left = (rect.left - 150) + 'px';
            
            document.body.appendChild(menu);
            
            // Close menu when clicking outside
            setTimeout(() => {
                document.addEventListener('click', function closeMenu() {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                });
            }, 0);
        }
        
        // Handle delete button click
        const deleteBtn = e.target.closest('[data-delete-id]');
        if (deleteBtn) {
            e.stopPropagation();
            const messageId = deleteBtn.dataset.deleteId;
            confirmDeleteMessage(messageId);
        }
    });
    
    // Show custom confirmation modal
    function confirmDeleteMessage(messageId) {
        const modal = document.createElement('div');
        modal.className = 'custom-modal-overlay';
        modal.innerHTML = `
            <div class="custom-modal">
                <div class="custom-modal-header">
                    <h3>Delete Message</h3>
                </div>
                <div class="custom-modal-body">
                    <p>Are you sure you want to delete this message? This action cannot be undone.</p>
                </div>
                <div class="custom-modal-footer">
                    <button class="modal-btn-cancel">Cancel</button>
                    <button class="modal-btn-delete" data-confirm-delete="${messageId}">Delete</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Handle modal buttons
        modal.querySelector('.modal-btn-cancel').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('.modal-btn-delete').addEventListener('click', () => {
            deleteMessage(messageId);
            modal.remove();
        });
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    // Delete message function
    function deleteMessage(messageId) {
        fetch(`/message/${messageId}/delete/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            }
        })
        .then(response => response.json())
        .then(data => {
            // Always refresh messages since deletion likely succeeded
            if (currentConversationId) {
                fetchMessages(currentConversationId);
            }
        })
        .catch(error => {
            console.error('Error deleting message:', error);
            // Still refresh to check if it was deleted
            if (currentConversationId) {
                fetchMessages(currentConversationId);
            }
        });
    };
    
    // Show error notification
    function showErrorNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    function scrollToBottom() {
        const messagesArea = document.getElementById('messages-area');
        if (messagesArea) {
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
    }

    // --- Message Input ---
    function setupMessageInput() {
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-btn');
        const messageForm = document.getElementById('message-form');
        const photoButton = document.getElementById('photo-button');
        const fileInput = document.getElementById('file-input');
        const filePreview = document.getElementById('file-preview');
        const removeFileBtn = document.getElementById('remove-file-btn');

        if (!messageInput || !sendButton || !messageForm) return;

        // Auto-resize textarea
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            
            // Enable/disable send button - allow send if either text or file exists
            const hasText = this.value.trim() !== '';
            const hasFile = fileInput && fileInput.files.length > 0;
            sendButton.disabled = !hasText && !hasFile;
        });
        
        // Photo/file upload button
        if (photoButton && fileInput) {
            photoButton.addEventListener('click', () => {
                fileInput.click();
            });
            
            fileInput.addEventListener('change', function() {
                if (this.files.length > 0) {
                    const file = this.files[0];
                    showFilePreview(file);
                    // Enable send button when file is selected, even without text
                    sendButton.disabled = false;
                } else {
                    // If no file, check if there's text
                    sendButton.disabled = messageInput.value.trim() === '';
                }
            });
        }
        
        // Remove file
        if (removeFileBtn && fileInput && filePreview) {
            removeFileBtn.addEventListener('click', () => {
                fileInput.value = '';
                filePreview.classList.add('hidden');
                // Disable send button only if there's no text either
                sendButton.disabled = messageInput.value.trim() === '';
            });
        }
        
        function showFilePreview(file) {
            const previewImage = document.getElementById('preview-image');
            const previewFileInfo = document.getElementById('preview-file-info');
            const fileName = document.getElementById('file-name');
            const fileSize = document.getElementById('file-size');
            
            if (!filePreview) return;
            
            filePreview.classList.remove('hidden');
            
            // Show image preview for images
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (previewImage) {
                        previewImage.src = e.target.result;
                        previewImage.classList.remove('hidden');
                    }
                    if (previewFileInfo) previewFileInfo.classList.add('hidden');
                };
                reader.readAsDataURL(file);
            } else {
                // Show file info for non-images
                if (previewImage) previewImage.classList.add('hidden');
                if (previewFileInfo) previewFileInfo.classList.remove('hidden');
                if (fileName) fileName.textContent = file.name;
                if (fileSize) fileSize.textContent = formatFileSize(file.size);
            }
        }
        
        function formatFileSize(bytes) {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        }

        // Handle form submission
        messageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const content = messageInput.value.trim();
            const convId = document.getElementById('conversation-id').value;
            
            if (!content || !convId) return;

            // Disable send button to prevent double submit
            sendButton.disabled = true;

            // Send message via AJAX
            const formData = new FormData(messageForm);
            
            fetch(`/conversation/${convId}/`, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(() => {
                // Clear input and file
                messageInput.value = '';
                messageInput.style.height = 'auto';
                
                if (fileInput) {
                    fileInput.value = '';
                }
                if (filePreview) {
                    filePreview.classList.add('hidden');
                }
                
                // Reload messages immediately
                fetchMessages(convId);
                
                // Update conversation preview
                updateConversationPreview(convId, content || '📎 Attachment');
            })
            .catch(error => {
                console.error('Error sending message:', error);
                sendButton.disabled = false;
            });
        });

        // Send on Enter (not Shift+Enter)
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendButton.disabled) {
                    messageForm.dispatchEvent(new Event('submit'));
                }
            }
        });
    }

    function updateConversationPreview(convId, content) {
        const convItem = document.querySelector(`[data-conversation-id="${convId}"]`);
        if (convItem) {
            const lastMessage = convItem.querySelector('.last-message');
            const timeSpan = convItem.querySelector('.conversation-time');
            
            if (lastMessage) {
                lastMessage.textContent = 'You: ' + (content.length > 50 ? content.substring(0, 50) + '...' : content);
            }
            if (timeSpan) {
                timeSpan.textContent = 'Just now';
            }
        }
    }

    // --- Search Conversations ---
    function setupSearch() {
        const searchInput = document.getElementById('conversation-search');

        if (searchInput) {
            searchInput.addEventListener('input', function() {
                const query = this.value.toLowerCase();
                const items = document.querySelectorAll('.conversation-item');

                items.forEach(item => {
                    const name = item.dataset.userName.toLowerCase();
                    if (name.includes(query)) {
                        item.style.display = '';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        }
    }

    // Auto-refresh messages every 3 seconds if a conversation is active
    setInterval(() => {
        if (activeConversationId) {
            const messagesArea = document.getElementById('messages-area');
            if (!messagesArea) return;
            
            const currentScrollHeight = messagesArea.scrollHeight;
            const currentScrollTop = messagesArea.scrollTop;
            const isAtBottom = currentScrollHeight - currentScrollTop <= messagesArea.clientHeight + 50;
            
            fetchMessages(activeConversationId);
            
            // Only scroll if user was already at bottom
            if (isAtBottom) {
                setTimeout(scrollToBottom, 100);
            }
        }
    }, 3000);
});
