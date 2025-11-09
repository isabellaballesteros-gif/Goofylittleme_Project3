const galleryGrid = document.getElementById('galleryGrid');
let currentUsername = null;

// Check authentication and get current user
async function checkAuth() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const data = await response.json();
            currentUsername = data.username;
            // Show friend requests button when logged in
            const friendRequestsBtn = document.getElementById('friendRequestsBtn');
            if (friendRequestsBtn) {
                friendRequestsBtn.style.display = 'flex';
            }
            // Show edit avatar button when logged in
            const editAvatarBtn = document.getElementById('editAvatarBtn');
            if (editAvatarBtn) {
                editAvatarBtn.style.display = 'inline-block';
            }
            await loadNotifications();
        } else {
            // Not logged in, but still show gallery
            currentUsername = null;
            const friendRequestsBtn = document.getElementById('friendRequestsBtn');
            if (friendRequestsBtn) {
                friendRequestsBtn.style.display = 'none';
            }
            const editAvatarBtn = document.getElementById('editAvatarBtn');
            if (editAvatarBtn) {
                editAvatarBtn.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Auth error:', error);
        currentUsername = null;
        const friendRequestsBtn = document.getElementById('friendRequestsBtn');
        if (friendRequestsBtn) {
            friendRequestsBtn.style.display = 'none';
        }
        const editAvatarBtn = document.getElementById('editAvatarBtn');
        if (editAvatarBtn) {
            editAvatarBtn.style.display = 'none';
        }
    }
}

// Load and display friend request notifications
async function loadNotifications() {
    const container = document.getElementById('notificationsContainer');
    const friendRequestsBtn = document.getElementById('friendRequestsBtn');
    const friendRequestsBadge = document.getElementById('friendRequestsBadge');
    
    if (!currentUsername) {
        if (friendRequestsBtn) friendRequestsBtn.style.display = 'none';
        return;
    }
    
    // Always show the friend requests button if logged in
    if (friendRequestsBtn) {
        friendRequestsBtn.style.display = 'flex';
    }
    
    try {
        const response = await fetch('/api/notifications/friend-requests');
        if (response.ok) {
            const requests = await response.json();
            
            // Update badge - show count if there are requests, hide if none
            if (friendRequestsBadge) {
                if (requests.length > 0) {
                    friendRequestsBadge.textContent = requests.length;
                    friendRequestsBadge.style.display = 'flex';
                } else {
                    friendRequestsBadge.style.display = 'none';
                }
            }
            
            // Update header notifications (keep for backward compatibility)
            if (container) {
                if (requests.length > 0) {
                    container.innerHTML = `
                        <div style="position: relative;">
                            <button id="notificationBtn" style="background: var(--accent); color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; font-size: 1.2em; position: relative;">
                                🔔
                                <span style="position: absolute; top: -5px; right: -5px; background: red; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 0.7em;">${requests.length}</span>
                            </button>
                        </div>
                    `;
                    
                    const btn = document.getElementById('notificationBtn');
                    if (btn) {
                        btn.addEventListener('click', () => {
                            openFriendRequestsModal();
                        });
                    }
                } else {
                    container.innerHTML = '';
                }
            }
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Load friend requests for modal
async function loadFriendRequestsModal() {
    const list = document.getElementById('friendRequestsList');
    if (!list) return;
    
    if (!currentUsername) {
        list.innerHTML = '<div class="empty-state" style="text-align: center; padding: 40px; color: var(--text-light);">Please log in to view friend requests</div>';
        return;
    }
    
    try {
        const response = await fetch('/api/notifications/friend-requests');
        if (response.ok) {
            const requests = await response.json();
            
            if (requests.length === 0) {
                list.innerHTML = '<div class="empty-state" style="text-align: center; padding: 40px; color: var(--text-light); font-size: 1.1em;">No pending friend requests</div>';
                return;
            }
            
            list.innerHTML = requests.map(req => {
                const avatarImg = req.avatar 
                    ? `<img src="${req.avatar}" alt="${req.username}" class="friend-request-avatar">`
                    : `<div class="friend-request-avatar" style="background: var(--card-bg); display: flex; align-items: center; justify-content: center; font-size: 1.5em;">👤</div>`;
                
                return `
                    <div class="friend-request-item">
                        ${avatarImg}
                        <div class="friend-request-info">
                            <a href="/profile.html?username=${encodeURIComponent(req.username)}" class="friend-request-username" target="_blank">@${req.username}</a>
                            <div style="font-size: 0.9em; color: var(--text-light);">wants to be friends</div>
                        </div>
                        <div class="friend-request-actions">
                            <button class="accept-btn" onclick="handleAcceptRequest('${req.username}')" title="Accept">✓</button>
                            <button class="reject-btn" onclick="handleRejectRequest('${req.username}')" title="Reject">×</button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading friend requests:', error);
        list.innerHTML = '<div class="empty-state" style="text-align: center; padding: 40px; color: var(--danger);">Error loading friend requests</div>';
    }
}

// Open friend requests modal
function openFriendRequestsModal() {
    const modal = document.getElementById('friendRequestsModal');
    if (modal) {
        modal.style.display = 'flex';
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
        loadFriendRequestsModal();
    }
}

// Close friend requests modal
function closeFriendRequestsModal() {
    const modal = document.getElementById('friendRequestsModal');
    if (modal) {
        modal.style.display = 'none';
        // Restore body scroll when modal is closed
        document.body.style.overflow = '';
    }
}

// Handle accept friend request
async function handleAcceptRequest(username) {
    try {
        const response = await fetch(`/api/notifications/friend-requests/${encodeURIComponent(username)}/accept`, {
            method: 'POST'
        });
        
        if (response.ok) {
            await loadFriendRequestsModal();
            await loadNotifications();
            alert(`You are now friends with @${username}!`);
        } else {
            alert('Failed to accept friend request');
        }
    } catch (error) {
        console.error('Error accepting friend request:', error);
        alert('Failed to accept friend request');
    }
}

// Handle reject friend request
async function handleRejectRequest(username) {
    if (!confirm(`Reject friend request from @${username}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/notifications/friend-requests/${encodeURIComponent(username)}/reject`, {
            method: 'POST'
        });
        
        if (response.ok) {
            await loadFriendRequestsModal();
            await loadNotifications();
        } else {
            alert('Failed to reject friend request');
        }
    } catch (error) {
        console.error('Error rejecting friend request:', error);
        alert('Failed to reject friend request');
    }
}

// Make functions globally accessible
window.openFriendRequestsModal = openFriendRequestsModal;
window.closeFriendRequestsModal = closeFriendRequestsModal;
window.handleAcceptRequest = handleAcceptRequest;
window.handleRejectRequest = handleRejectRequest;

// Accept friend request (global function - for backward compatibility)
window.acceptFriendRequest = async function(username) {
    await handleAcceptRequest(username);
};

// Poll for new notifications every 10 seconds
setInterval(() => {
    if (currentUsername) {
        loadNotifications();
    }
}, 10000);

// Load avatars
async function loadAvatars() {
    try {
        // Don't await checkAuth here - it's called separately and we want to show all avatars
        const response = await fetch('/api/avatars');
        if (!response.ok) {
            throw new Error('Failed to fetch avatars');
        }
        const avatars = await response.json();
        allAvatars = avatars; // Store for search functionality
        
        if (avatars.length === 0) {
            galleryGrid.innerHTML = '<div class="empty-gallery">No avatars yet. Be the first to create one!</div>';
            return;
        }
        
        // Sort avatars: user's own avatar first, then others
        const sortedAvatars = [...avatars];
        if (currentUsername) {
            const ownAvatarIndex = sortedAvatars.findIndex(a => a.username === currentUsername);
            if (ownAvatarIndex > 0) {
                const ownAvatar = sortedAvatars.splice(ownAvatarIndex, 1)[0];
                sortedAvatars.unshift(ownAvatar);
            }
        }
        
        galleryGrid.innerHTML = '';
        
        sortedAvatars.forEach(avatar => {
            const card = document.createElement('div');
            // Add 'current-user' class if this is the logged-in user's avatar
            if (currentUsername && avatar.username === currentUsername) {
                card.className = 'avatar-card current-user';
            } else {
            card.className = 'avatar-card';
            }
            
            const usernameLabel = document.createElement('div');
            usernameLabel.className = 'avatar-username';
            const userIdText = avatar.userId ? ` (ID: ${avatar.userId})` : '';
            usernameLabel.textContent = `@${avatar.username}${userIdText}`;
            
            const img = document.createElement('img');
            img.src = avatar.imageData;
            img.alt = `${avatar.username}'s Avatar`;
            
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'avatar-actions';
            
            const profileBtn = document.createElement('button');
            profileBtn.className = 'edit-btn';
            profileBtn.textContent = 'View Profile';
            profileBtn.addEventListener('click', () => {
                window.location.href = `/profile.html?username=${encodeURIComponent(avatar.username)}`;
            });
            
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', () => {
                window.location.href = '/';
            });
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => deleteAvatar());
            
            // Profile button for all users
            buttonContainer.appendChild(profileBtn);
            
            // Only show edit/delete buttons for own avatar
            if (currentUsername && avatar.username === currentUsername) {
                buttonContainer.appendChild(editBtn);
                buttonContainer.appendChild(deleteBtn);
            }
            
            card.appendChild(usernameLabel);
            card.appendChild(img);
            card.appendChild(buttonContainer);
            galleryGrid.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading avatars:', error);
        galleryGrid.innerHTML = '<div class="empty-gallery">Error loading avatars. Please try again.</div>';
    }
}

// Delete avatar
async function deleteAvatar() {
    if (!confirm('Are you sure you want to delete your avatar?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/avatar', {
            method: 'DELETE',
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Avatar deleted successfully!');
            loadAvatars();
        } else {
            alert(data.error || 'Failed to delete avatar');
        }
    } catch (error) {
        console.error('Error deleting avatar:', error);
        alert('Failed to delete avatar');
    }
}

// Update friend request icon based on theme
function updateFriendRequestIcon() {
    const friendRequestsIcon = document.getElementById('friendRequestsIcon');
    if (friendRequestsIcon && friendRequestsIcon.tagName === 'IMG') {
        // Icon is now an image, apply grayscale filter for black-white theme
        const currentTheme = localStorage.getItem('selectedTheme') || 'default';
        if (currentTheme === 'black-white') {
            friendRequestsIcon.style.filter = 'grayscale(100%)';
        } else {
            friendRequestsIcon.style.filter = 'none';
        }
    }
}

// Make function globally accessible for theme.js
window.updateFriendRequestIcon = updateFriendRequestIcon;

// Friends modal functions
async function openFriendsModal(username) {
    const modal = document.getElementById('friendsModal');
    const title = document.getElementById('friendsModalTitle');
    const list = document.getElementById('friendsList');
    
    if (!username) {
        // Get current user if no username provided
        username = currentUsername;
    }
    
    if (!username) {
        list.innerHTML = '<div class="empty-state">Please log in to view friends</div>';
        modal.style.display = 'flex';
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
        return;
    }
    
    title.textContent = `@${username}'s Friends`;
    list.innerHTML = '<div class="empty-state">Loading friends...</div>';
    modal.style.display = 'flex';
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    try {
        const response = await fetch(`/api/friends/list/${encodeURIComponent(username)}`);
        if (response.ok) {
            const friends = await response.json();
            
            if (friends.length === 0) {
                list.innerHTML = '<div class="empty-state">No friends yet</div>';
                return;
            }
            
            list.innerHTML = friends.map(friend => {
                const avatarImg = friend.avatar 
                    ? `<img src="${friend.avatar}" alt="${friend.username}" class="friend-avatar">`
                    : `<div class="friend-avatar" style="background: var(--card-bg); display: flex; align-items: center; justify-content: center; font-size: 1.5em;">👤</div>`;
                
                const userIdText = friend.userId ? ` (ID: ${friend.userId})` : '';
                
                return `
                    <div class="friend-item" onclick="window.location.href='/profile.html?username=${encodeURIComponent(friend.username)}'">
                        ${avatarImg}
                        <div class="friend-info">
                            <a href="/profile.html?username=${encodeURIComponent(friend.username)}" class="friend-username">@${friend.username}${userIdText}</a>
                        </div>
                    </div>
                `;
            }).join('');
        } else if (response.status === 404) {
            // User not found
            list.innerHTML = '<div class="empty-state">User not found</div>';
        } else {
            // Other error
            const errorData = await response.json().catch(() => ({}));
            console.error('Error loading friends:', response.status, errorData);
            list.innerHTML = '<div class="empty-state">Unable to load friends. Please try again later.</div>';
        }
    } catch (error) {
        console.error('Error loading friends:', error);
        list.innerHTML = '<div class="empty-state">Unable to load friends. Please check your connection and try again.</div>';
    }
}

function closeFriendsModal() {
    const modal = document.getElementById('friendsModal');
    modal.style.display = 'none';
    // Restore body scroll when modal is closed
    document.body.style.overflow = '';
}

// Make functions globally accessible
window.openFriendsModal = openFriendsModal;
window.closeFriendsModal = closeFriendsModal;

// Setup friend requests button
document.addEventListener('DOMContentLoaded', () => {
    const friendRequestsBtn = document.getElementById('friendRequestsBtn');
    if (friendRequestsBtn) {
        // Hide button initially, will show after auth check
        friendRequestsBtn.style.display = 'none';
        
        friendRequestsBtn.addEventListener('click', () => {
            openFriendRequestsModal();
        });
    }
    
    // Setup friends button
    const friendsBtn = document.getElementById('friendsBtn');
    if (friendsBtn) {
        friendsBtn.addEventListener('click', () => {
            openFriendsModal(currentUsername);
        });
    }
    
    // Close friends modal when clicking outside or pressing Escape
    const friendsModal = document.getElementById('friendsModal');
    if (friendsModal) {
        friendsModal.addEventListener('click', (e) => {
            if (e.target === friendsModal) {
                closeFriendsModal();
            }
        });
        // Prevent clicks inside modal content from closing the modal
        const friendsModalContent = friendsModal.querySelector('.friends-modal-content');
        if (friendsModalContent) {
            friendsModalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }
    
    // Close modals on Escape key (optional - users can also click outside)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const friendsModal = document.getElementById('friendsModal');
            const friendRequestsModal = document.getElementById('friendRequestsModal');
            if (friendsModal && friendsModal.style.display === 'flex') {
                closeFriendsModal();
            }
            if (friendRequestsModal && friendRequestsModal.style.display === 'flex') {
                closeFriendRequestsModal();
            }
        }
    });
    
    // Update icon based on current theme
    updateFriendRequestIcon();
    
    // Listen for theme changes
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.addEventListener('change', updateFriendRequestIcon);
    }
    
    // Also check periodically in case theme changes elsewhere
    setInterval(updateFriendRequestIcon, 1000);
    
    // Close modal when clicking outside
    const modal = document.getElementById('friendRequestsModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeFriendRequestsModal();
            }
        });
        // Prevent clicks inside modal content from closing the modal
        const modalContent = modal.querySelector('.friend-requests-modal-content');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }
});

// Setup logout button
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch('/api/logout', { method: 'POST' });
                window.location.href = '/login.html';
            } catch (error) {
                console.error('Logout error:', error);
                window.location.href = '/login.html';
            }
        });
    }
});

// Search functionality
let allAvatars = [];
let searchTimeout = null;

async function handleSearch(query) {
    if (!query || query.trim().length === 0) {
        document.getElementById('searchResults').style.display = 'none';
        return;
    }
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`/api/user/search/${encodeURIComponent(query.trim())}`);
            if (response.ok) {
                const results = await response.json();
                displaySearchResults(results);
            }
        } catch (error) {
            console.error('Error searching:', error);
        }
    }, 300);
}

function displaySearchResults(results) {
    const resultsDiv = document.getElementById('searchResults');
    if (results.length === 0) {
        resultsDiv.innerHTML = '<div style="padding: 10px; color: var(--text-light);">No users found</div>';
        resultsDiv.style.display = 'block';
        return;
    }
    
    resultsDiv.innerHTML = results.map(user => {
        const userIdText = user.userId ? ` (ID: ${user.userId})` : '';
        return `
            <div style="padding: 10px; cursor: pointer; border-bottom: 1px solid var(--border);" 
                 onclick="window.location.href='/profile.html?username=${encodeURIComponent(user.username)}'"
                 onmouseover="this.style.background='var(--hover-bg)'"
                 onmouseout="this.style.background='transparent'">
                <strong>@${user.username}${userIdText}</strong>
            </div>
        `;
    }).join('');
    resultsDiv.style.display = 'block';
}

// Setup search bar
document.addEventListener('DOMContentLoaded', () => {
    const searchBar = document.getElementById('searchBar');
    if (searchBar) {
        searchBar.addEventListener('input', (e) => {
            handleSearch(e.target.value);
        });
        
        // Hide search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#searchBar') && !e.target.closest('#searchResults')) {
                document.getElementById('searchResults').style.display = 'none';
            }
        });
    }
});

// Load avatars on page load
(async () => {
    await checkAuth(); // Check auth first
    loadAvatars(); // Then load avatars
})();

// Auto-refresh gallery every 5 seconds to show new avatars
setInterval(() => {
    loadAvatars();
}, 5000);
