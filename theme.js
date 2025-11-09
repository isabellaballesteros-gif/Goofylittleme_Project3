// Theme system for the website
const themes = {
    'default': {
        name: 'Default',
        bgGradient: 'linear-gradient(135deg, #ffe5f1 0%, #ffd6e8 25%, #ffeef8 50%, #e8f4f8 75%, #d6e8ff 100%)',
        bgImage: 'url(https://i.postimg.cc/dQyhL5Kb/Pinkbackground.png)',
        primary: '#ffb6c1',
        primaryHover: '#ffa8b8',
        primaryDark: '#ff6b9d',
        secondary: '#d1a5e0',
        secondaryHover: '#c494d4',
        navBtn: '#b8e6d1',
        navBtnHover: '#a8dcc1',
        poseBtn: '#a8d6f0',
        poseBtnHover: '#8fc9e8',
        poseBtnActive: '#7fb9d8',
        bioGalleryBtn: '#b8e6d1',
        bioGalleryBtnHover: '#a8dcc1',
        interestsBtn: '#a8d6f0',
        interestsBtnHover: '#8fc9e8',
        galleryHeaderBtn: '#ffd4b3',
        galleryHeaderBtnHover: '#ffcaa3',
        tutorialBtn: '#d1a5e0', // pastel purple
        tutorialBtnHover: '#c494d4', // darker pastel purple
        accent: '#ffd4b3',
        accentHover: '#ffcaa3',
        accent2: '#ffe0a3',
        accent2Hover: '#ffd893',
        danger: '#ffb3ba',
        dangerHover: '#ffa3ab',
        text: '#333',
        textLight: '#555',
        border: 'rgba(255, 182, 193, 0.4)',
        borderLight: 'rgba(255, 255, 255, 0.5)',
        shadow: 'rgba(255, 182, 193, 0.3)',
        containerBg: 'rgba(255, 255, 255, 0.95)',
        cardBg: 'linear-gradient(135deg, #ffe5f1 0%, #ffd6e8 100%)'
    },
    'black-white': {
        name: 'Black & White',
        bgGradient: 'linear-gradient(135deg, #e0e0e0 0%, #d0d0d0 50%, #c0c0c0 100%)',
        bgImage: 'none',
        primary: '#666666',
        primaryHover: '#555555',
        primaryDark: '#333333',
        secondary: '#888888',
        secondaryHover: '#777777',
        navBtn: '#777777',
        navBtnHover: '#666666',
        poseBtn: '#888888',
        poseBtnHover: '#777777',
        poseBtnActive: '#666666',
        bioGalleryBtn: '#888888',
        bioGalleryBtnHover: '#777777',
        interestsBtn: '#888888',
        interestsBtnHover: '#777777',
        galleryHeaderBtn: '#999999',
        galleryHeaderBtnHover: '#888888',
        tutorialBtn: '#888888',
        tutorialBtnHover: '#777777',
        accent: '#999999',
        accentHover: '#888888',
        accent2: '#aaaaaa',
        accent2Hover: '#999999',
        danger: '#666666',
        dangerHover: '#555555',
        text: '#333333',
        textLight: '#555555',
        border: 'rgba(0, 0, 0, 0.3)',
        borderLight: 'rgba(0, 0, 0, 0.2)',
        shadow: 'rgba(0, 0, 0, 0.3)',
        containerBg: 'rgba(255, 255, 255, 0.95)',
        cardBg: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)'
    },
};

// Apply theme to the document
function applyTheme(themeName) {
    const theme = themes[themeName] || themes['default'];
    const root = document.documentElement;
    
    root.style.setProperty('--bg-gradient', theme.bgGradient);
    if (theme.bgImage && theme.bgImage !== 'none') {
        root.style.setProperty('--bg-image', theme.bgImage);
    } else {
        root.style.setProperty('--bg-image', 'none');
    }
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--primary-hover', theme.primaryHover);
    root.style.setProperty('--primary-dark', theme.primaryDark);
    root.style.setProperty('--secondary', theme.secondary);
    root.style.setProperty('--secondary-hover', theme.secondaryHover);
    root.style.setProperty('--nav-btn', theme.navBtn || theme.secondary);
    root.style.setProperty('--nav-btn-hover', theme.navBtnHover || theme.secondaryHover);
    root.style.setProperty('--pose-btn', theme.poseBtn || theme.primary);
    root.style.setProperty('--pose-btn-hover', theme.poseBtnHover || theme.primaryHover);
    root.style.setProperty('--pose-btn-active', theme.poseBtnActive || theme.primary);
    root.style.setProperty('--bio-gallery-btn', theme.bioGalleryBtn || theme.accent);
    root.style.setProperty('--bio-gallery-btn-hover', theme.bioGalleryBtnHover || theme.accentHover);
    root.style.setProperty('--interests-btn', theme.interestsBtn || theme.accent);
    root.style.setProperty('--interests-btn-hover', theme.interestsBtnHover || theme.accentHover);
    root.style.setProperty('--gallery-header-btn', theme.galleryHeaderBtn || theme.navBtn);
    root.style.setProperty('--gallery-header-btn-hover', theme.galleryHeaderBtnHover || theme.navBtnHover);
    root.style.setProperty('--tutorial-btn', theme.tutorialBtn || theme.primary);
    root.style.setProperty('--tutorial-btn-hover', theme.tutorialBtnHover || theme.primaryHover);
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--accent-hover', theme.accentHover);
    root.style.setProperty('--accent2', theme.accent2);
    root.style.setProperty('--accent2-hover', theme.accent2Hover);
    root.style.setProperty('--danger', theme.danger);
    root.style.setProperty('--danger-hover', theme.dangerHover);
    root.style.setProperty('--text', theme.text);
    root.style.setProperty('--text-light', theme.textLight);
    root.style.setProperty('--border', theme.border);
    root.style.setProperty('--border-light', theme.borderLight);
    root.style.setProperty('--shadow', theme.shadow);
    root.style.setProperty('--container-bg', theme.containerBg);
    root.style.setProperty('--card-bg', theme.cardBg);
    
    // Save to localStorage
    localStorage.setItem('selectedTheme', themeName);
    
    // Apply grayscale to all images in black-white theme
    applyImageFilters(themeName);
    
    // Update friend request icon if function exists
    if (window.updateFriendRequestIcon && typeof window.updateFriendRequestIcon === 'function') {
        window.updateFriendRequestIcon();
    }
}

// Apply grayscale filters to images based on theme
function applyImageFilters(themeName) {
    const body = document.body;
    const html = document.documentElement;
    
    if (themeName === 'black-white') {
        // Add class to body and html for CSS targeting
        body.classList.add('theme-black-white');
        html.classList.add('theme-black-white');
        body.classList.remove('theme-default');
        html.classList.remove('theme-default');
        
        // Also apply inline filters as backup for maximum compatibility
        // This ensures images added before CSS loads are also filtered
        setTimeout(() => {
            const images = document.querySelectorAll('img:not(.no-grayscale)');
            images.forEach(img => {
                if (!img.style.filter || img.style.filter === 'none') {
                    img.style.filter = 'grayscale(100%)';
                }
            });
            
            const canvases = document.querySelectorAll('canvas');
            canvases.forEach(canvas => {
                if (!canvas.style.filter || canvas.style.filter === 'none') {
                    canvas.style.filter = 'grayscale(100%)';
                }
            });
        }, 100);
        
        // Observe for new images added dynamically (backup for edge cases)
        if (!window.imageObserver) {
            window.imageObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            // Check if it's an image
                            if (node.tagName === 'IMG' && !node.classList.contains('no-grayscale')) {
                                node.style.filter = 'grayscale(100%)';
                            }
                            // Check for images inside the node
                            if (node.querySelectorAll) {
                                const images = node.querySelectorAll('img:not(.no-grayscale)');
                                images.forEach(img => {
                                    img.style.filter = 'grayscale(100%)';
                                });
                                
                                // Check for canvas elements
                                const canvases = node.querySelectorAll('canvas');
                                canvases.forEach(canvas => {
                                    canvas.style.filter = 'grayscale(100%)';
                                });
                            }
                            // Check for canvas elements directly
                            if (node.tagName === 'CANVAS') {
                                node.style.filter = 'grayscale(100%)';
                            }
                        }
                    });
                });
            });
            
            window.imageObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    } else {
        // Remove class from body and html
        body.classList.remove('theme-black-white');
        html.classList.remove('theme-black-white');
        body.classList.add('theme-default');
        html.classList.add('theme-default');
        
        // Remove inline filters (CSS will handle it, but remove inline overrides)
        const images = document.querySelectorAll('img:not(.no-grayscale)');
        images.forEach(img => {
            if (img.style.filter === 'grayscale(100%)') {
                img.style.filter = 'none';
            }
        });
        
        const canvases = document.querySelectorAll('canvas');
        canvases.forEach(canvas => {
            if (canvas.style.filter === 'grayscale(100%)') {
                canvas.style.filter = 'none';
            }
        });
        
        // Disconnect observer if it exists
        if (window.imageObserver) {
            window.imageObserver.disconnect();
            window.imageObserver = null;
        }
    }
}

// Initialize theme on page load
function initTheme() {
    let savedTheme = localStorage.getItem('selectedTheme') || 'default';
    // Migrate old 'pastel' theme name to 'default'
    if (savedTheme === 'pastel') {
        savedTheme = 'default';
        localStorage.setItem('selectedTheme', 'default');
    }
    // Reset to default if saved theme no longer exists
    if (!themes[savedTheme]) {
        applyTheme('default');
    } else {
        applyTheme(savedTheme);
    }
}

// Create theme selector dropdown
function createThemeSelector() {
    // Don't create theme selector on tutorial, gifts, messages, or login pages
    if (window.location.pathname.includes('tutorial.html') || 
        window.location.pathname.includes('gifts.html') || 
        window.location.pathname.includes('messages.html') ||
        window.location.pathname.includes('login.html')) {
        return;
    }
    
    // Check if selector already exists
    if (document.getElementById('themeSelector')) {
        return;
    }
    
    const themeSelector = document.createElement('div');
    themeSelector.id = 'themeSelector';
    themeSelector.className = 'theme-selector';
    
    const label = document.createElement('label');
    label.textContent = 'Theme: ';
    label.setAttribute('for', 'themeSelect');
    
    const select = document.createElement('select');
    select.id = 'themeSelect';
    select.name = 'theme';
    
    // Add options for each theme
    Object.keys(themes).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = themes[key].name;
        if (localStorage.getItem('selectedTheme') === key) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    // Add event listener
    select.addEventListener('change', (e) => {
        applyTheme(e.target.value);
    });
    
    themeSelector.appendChild(label);
    themeSelector.appendChild(select);
    
    // Try to add to header-bar or user-info
    const headerBar = document.querySelector('.header-bar');
    const userInfo = document.querySelector('.user-info');
    const galleryHeader = document.querySelector('.gallery-header');
    const profileHeader = document.querySelector('.profile-header');
    
    // For profile page, add to header-actions or create a position
    if (profileHeader) {
        const headerActions = profileHeader.querySelector('.profile-header-actions');
        if (headerActions) {
            headerActions.insertBefore(themeSelector, headerActions.firstChild);
        } else {
            // Create a wrapper for theme selector in upper right
            const themeWrapper = document.createElement('div');
            themeWrapper.style.position = 'absolute';
            themeWrapper.style.top = '0';
            themeWrapper.style.right = '0';
            themeWrapper.appendChild(themeSelector);
            profileHeader.appendChild(themeWrapper);
        }
    } else if (headerBar && !headerBar.querySelector('#themeSelector')) {
        headerBar.appendChild(themeSelector);
    } else if (userInfo && !userInfo.querySelector('#themeSelector')) {
        userInfo.insertBefore(themeSelector, userInfo.firstChild);
    } else if (galleryHeader && !galleryHeader.querySelector('#themeSelector')) {
        galleryHeader.appendChild(themeSelector);
    } else {
        // Fallback: add to body
        document.body.insertBefore(themeSelector, document.body.firstChild);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initTheme();
        createThemeSelector();
    });
} else {
    initTheme();
    createThemeSelector();
}


