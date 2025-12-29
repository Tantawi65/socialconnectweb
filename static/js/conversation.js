/* ==========================================================================
   Conversation Module - File Upload, Message Actions, Dynamic Updates
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // --- ELEMENTS ---
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const photoButton = document.getElementById('photo-button');
    const fileInput = document.getElementById('file-input');
    const filePreview = document.getElementById('file-preview');
    const previewImage = document.getElementById('preview-image');
    const previewFileInfo = document.getElementById('preview-file-info');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const removeFileBtn = document.getElementById('remove-file-btn');
    const messagesArea = document.getElementById('messages-area');
    const messagesList = document.getElementById('messages-list');

    // --- FILE UPLOAD HANDLING ---
    if (photoButton && fileInput) {
        photoButton.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                displayFilePreview(file);
            }
        });
    }

    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', function() {
            clearFilePreview();
        });
    }

    function displayFilePreview(file) {
        filePreview.classList.remove('hidden');
        
        // Display file name and size
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        
        // If image, show preview
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImage.src = e.target.result;
                previewImage.classList.remove('hidden');
                previewFileInfo.style.display = 'none';
            };
            reader.readAsDataURL(file);
        } else {
            previewImage.classList.add('hidden');
            previewFileInfo.style.display = 'block';
        }
    }

    function clearFilePreview() {
        fileInput.value = '';
        filePreview.classList.add('hidden');
        previewImage.src = '';
        previewImage.classList.add('hidden');
        previewFileInfo.style.display = 'block';
        fileName.textContent = '';
        fileSize.textContent = '';
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // --- MESSAGE SENDING ---
    if (messageForm) {
        messageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const content = messageInput.value.trim();
            const file = fileInput.files[0];
            
            if (!content && !file) return;
            
            const formData = new FormData(messageForm);
            
            fetch(window.location.href, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken'),
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    messageInput.value = '';
                    clearFilePreview();
                    // Reload page to show new message
                    location.reload();
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
        });
    }

    // --- AUTO-RESIZE TEXTAREA ---
    if (messageInput) {
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });

        // Allow Enter to send, Shift+Enter for new line
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                messageForm.dispatchEvent(new Event('submit'));
            }
        });
    }

    // --- MESSAGE MENU (THREE DOTS) ---
    document.addEventListener('click', function(e) {
        const menuBtn = e.target.closest('.message-menu-btn');
        
        if (menuBtn) {
            e.preventDefault();
            e.stopPropagation();
            toggleMessageMenu(menuBtn);
            return;
        }

        // Delete message button
        const deleteBtn = e.target.closest('.delete-message-btn');
        if (deleteBtn) {
            e.preventDefault();
            const messageId = deleteBtn.dataset.messageId;
            confirmDeleteMessage(messageId);
            return;
        }

        // Close any open dropdowns when clicking outside
        const dropdown = document.querySelector('.message-dropdown-menu');
        if (dropdown && !dropdown.contains(e.target)) {
            dropdown.remove();
        }
    });

    function toggleMessageMenu(btn) {
        // Close any existing menus
        document.querySelectorAll('.message-dropdown-menu').forEach(menu => menu.remove());
        
        const messageId = btn.dataset.messageId;
        const dropdown = document.createElement('div');
        dropdown.className = 'message-dropdown-menu';
        dropdown.innerHTML = `
            <button class="delete-message-btn" data-message-id="${messageId}" type="button">
                <span style="margin-right: 8px;">🗑️</span>
                Delete Message
            </button>`;
        
        // Position dropdown near the button
        const rect = btn.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${rect.bottom + 5}px`;
        dropdown.style.right = `${window.innerWidth - rect.right}px`;
        
        document.body.appendChild(dropdown);
    }

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
        
        // Remove dropdown if exists
        document.querySelectorAll('.message-dropdown-menu').forEach(menu => menu.remove());
    }

    function deleteMessage(messageId) {
        fetch(`/message/${messageId}/delete/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Remove the message from DOM
                const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
                if (messageEl) {
                    messageEl.style.transition = 'opacity 0.3s';
                    messageEl.style.opacity = '0';
                    setTimeout(() => messageEl.remove(), 300);
                }
                
                // Close dropdown
                document.querySelectorAll('.message-dropdown-menu').forEach(menu => menu.remove());
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }

    // --- UPDATE USER STATUS ---
    function updateUserStatus() {
        if (typeof otherUserId !== 'undefined') {
            fetch(`/user/${otherUserId}/status/`)
                .then(response => response.json())
                .then(data => {
                    const statusEl = document.getElementById('chat-user-status');
                    if (statusEl) {
                        statusEl.textContent = data.status;
                    }
                })
                .catch(error => console.error('Error fetching status:', error));
        }
    }

    // Update status immediately and every 10 seconds
    updateUserStatus();
    setInterval(updateUserStatus, 10000);

    // --- AUTO-SCROLL TO BOTTOM ---
    if (messagesArea) {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    // --- HELPER FUNCTION ---
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
});
