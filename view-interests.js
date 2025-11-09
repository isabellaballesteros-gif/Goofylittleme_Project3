let currentUsername = null;

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const data = await response.json();
            currentUsername = data.username;
        }
    } catch (error) {
        // Not logged in, that's okay for viewing
        currentUsername = null;
    }
}

// Get username from URL parameter
function getUsernameFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('username');
}

// Load and display interests
async function loadInterests() {
    await checkAuth();
    const username = getUsernameFromURL();
    if (!username) {
        document.getElementById('interestsGrid').innerHTML = '<div class="error-message">No username specified</div>';
        return;
    }

    // Update page title
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = `${username}'s Interests`;
    }

    // Show edit button if viewing own interests
    const editBtnContainer = document.getElementById('editButtonContainer');
    if (editBtnContainer && currentUsername && currentUsername === username) {
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-interests-btn';
        editBtn.textContent = 'Edit My Interests';
        editBtn.addEventListener('click', () => {
            window.location.href = '/interests.html';
        });
        editBtnContainer.appendChild(editBtn);
    }
    
    // Show back to profile button if viewing own interests or any user
    const backToProfileBtn = document.getElementById('backToProfileBtn');
    if (backToProfileBtn) {
        backToProfileBtn.href = `/profile.html?username=${encodeURIComponent(username)}`;
        backToProfileBtn.style.display = 'inline-block';
    }

    try {
        const response = await fetch(`/api/interests/${username}`);
        if (response.ok) {
            const interests = await response.json();
            displayInterests(interests, username);
        } else {
            document.getElementById('interestsGrid').innerHTML = '<div class="error-message">No interests found for this user</div>';
        }
    } catch (error) {
        console.error('Error loading interests:', error);
        document.getElementById('interestsGrid').innerHTML = '<div class="error-message">Error loading interests</div>';
    }
}

// Display interests
async function displayInterests(interests, username) {
    const grid = document.getElementById('interestsGrid');
    
    if (Object.keys(interests).length === 0) {
        grid.innerHTML = '<div class="error-message">This user hasn\'t created any interests yet</div>';
        return;
    }

    const categoryNames = {
        'dream-house': 'Dream House',
        'pets': 'Pets',
        'food': 'Food',
        'car': 'Car',
        'drink': 'Drink',
        'season': 'Season',
        'character': 'Character',
        'hobby': 'Hobby',
        'sport': 'Sport',
        'music': 'Music',
        'job': 'Job',
        'time-of-day': 'Time of Day'
    };

    // Get current preview interest if viewing own profile
    let currentPreviewInterest = null;
    if (currentUsername && currentUsername === username) {
        try {
            const response = await fetch(`/api/profile/${encodeURIComponent(username)}`);
            if (response.ok) {
                const profile = await response.json();
                currentPreviewInterest = profile.previewInterest;
            }
        } catch (error) {
            console.error('Error loading preview interest:', error);
        }
    }

    grid.innerHTML = '';

    for (const [category, imageData] of Object.entries(interests)) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'interest-category view';
        
        const title = document.createElement('h3');
        title.textContent = categoryNames[category] || category;
        
        const img = document.createElement('img');
        img.src = imageData;
        img.alt = category;
        img.className = 'interest-image';
        
        categoryDiv.appendChild(title);
        categoryDiv.appendChild(img);
        
        // Add "Set as Preview" button if viewing own interests
        if (currentUsername && currentUsername === username) {
            const previewBtn = document.createElement('button');
            previewBtn.className = 'set-preview-btn';
            previewBtn.textContent = currentPreviewInterest === category ? '✓ Preview' : 'Set as Preview';
            previewBtn.style.cssText = 'margin-top: 10px; padding: 8px 16px; background: var(--accent2); color: white; border: 2px solid var(--border-light); border-radius: 12px; cursor: pointer; font-size: 0.9em; font-weight: 600;';
            if (currentPreviewInterest === category) {
                previewBtn.style.background = 'var(--primary)';
            }
            previewBtn.addEventListener('click', async () => {
                await setPreviewInterest(category);
                previewBtn.textContent = '✓ Preview';
                previewBtn.style.background = 'var(--primary)';
                // Update other buttons
                document.querySelectorAll('.set-preview-btn').forEach(btn => {
                    if (btn !== previewBtn) {
                        btn.textContent = 'Set as Preview';
                        btn.style.background = 'var(--accent2)';
                    }
                });
            });
            categoryDiv.appendChild(previewBtn);
        }
        
        grid.appendChild(categoryDiv);
    }
}

async function setPreviewInterest(category) {
    try {
        const response = await fetch('/api/profile/preview-interest', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ category })
        });
        
        if (response.ok) {
            console.log('Preview interest set');
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to set preview interest');
        }
    } catch (error) {
        console.error('Error setting preview interest:', error);
        alert('Failed to set preview interest');
    }
}

// Load interests on page load
document.addEventListener('DOMContentLoaded', loadInterests);

