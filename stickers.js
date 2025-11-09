// Animated Background Stickers System
(function() {
    'use strict';
    
    // Prevent multiple script executions
    if (window.stickersInitialized) {
        return;
    }
    window.stickersInitialized = true;
    
    // Avatar URLs
    const avatarUrls = [
        'https://i.postimg.cc/TYF706dr/avatar1.png',
        'https://i.postimg.cc/Vkt7HVvp/avatar3.png',
        'https://i.postimg.cc/2SWHXKyJ/avatar4.png',
        'https://i.postimg.cc/htmC35vY/avatar5.png',
        'https://i.postimg.cc/L8Py0b5Q/avatar6.png',
        'https://i.postimg.cc/yNzfqy3f/avatar7.png'
    ];
    
    // Number of stickers to display (adjust based on screen size)
    // Reduced count to ensure better spacing
    function getStickerCount() {
        const width = window.innerWidth;
        if (width < 768) {
            return 3; // Fewer stickers on mobile
        } else if (width < 1024) {
            return 4; // Medium screens
        } else {
            return 8; // Large screens - more avatars since they're more scattered
        }
    }
    
    // Create sticker container
    function createStickerContainer() {
        const container = document.createElement('div');
        container.className = 'sticker-container';
        document.body.insertBefore(container, document.body.firstChild);
        return container;
    }
    
    // Create a single sticker
    function createSticker(container, index, position) {
        const sticker = document.createElement('img');
        const avatarUrl = avatarUrls[index % avatarUrls.length];
        
        sticker.src = avatarUrl;
        sticker.className = 'background-sticker';
        sticker.alt = `Background sticker ${index + 1}`;
        
        // Handle image load errors gracefully
        sticker.onerror = function() {
            this.style.display = 'none';
        };
        
        // Use provided position or calculate random position
        if (position) {
            sticker.style.left = Math.max(50, Math.min(position.x, window.innerWidth - 100)) + 'px';
            sticker.style.top = Math.max(50, Math.min(position.y, window.innerHeight - 100)) + 'px';
        } else {
            // Fallback to random position if no position provided
            const padding = 100;
            const maxX = Math.max(window.innerWidth - padding, padding);
            const maxY = Math.max(window.innerHeight - padding, padding);
            sticker.style.left = (padding + Math.random() * (maxX - padding)) + 'px';
            sticker.style.top = (padding + Math.random() * (maxY - padding)) + 'px';
        }
        
        // Random size variation (80px to 120px) - bigger avatars
        const size = 80 + Math.random() * 40;
        sticker.style.width = size + 'px';
        sticker.style.height = size + 'px';
        
        // Full opacity (not transparent)
        sticker.style.opacity = 0.85 + Math.random() * 0.15; // 0.85 to 1.0
        
        // Add random animation delay for more variety
        const delay = Math.random() * 3;
        sticker.style.animationDelay = delay + 's';
        
        container.appendChild(sticker);
    }
    
    // Calculate more scattered random positions for stickers
    function calculateGridPositions(count, containerWidth, containerHeight, stickerSize) {
        const positions = [];
        const padding = 150; // Increased padding for better spacing
        const minDistance = 200; // Minimum distance between stickers (larger spacing)
        const availableWidth = containerWidth - (padding * 2);
        const availableHeight = containerHeight - (padding * 2);
        
        // Generate random scattered positions with minimum distance constraint
        for (let i = 0; i < count; i++) {
            let attempts = 0;
            let validPosition = false;
            let x, y;
            
            // Try to find a valid position that's far enough from others
            while (!validPosition && attempts < 50) {
                x = padding + Math.random() * availableWidth;
                y = padding + Math.random() * availableHeight;
                
                // Check distance from existing positions
                validPosition = true;
                for (const existingPos of positions) {
                    const distance = Math.sqrt(
                        Math.pow(x - existingPos.x, 2) + 
                        Math.pow(y - existingPos.y, 2)
                    );
                    if (distance < minDistance) {
                        validPosition = false;
                        break;
                    }
                }
                attempts++;
            }
            
            // If we couldn't find a valid position after many attempts, just use random
            if (!validPosition) {
                x = padding + Math.random() * availableWidth;
                y = padding + Math.random() * availableHeight;
            }
            
            positions.push({
                x: x - (stickerSize / 2),
                y: y - (stickerSize / 2)
            });
        }
        
        return positions;
    }
    
    // Initialize stickers
    let isInitialized = false; // Prevent duplicate initialization
    let resizeTimeout = null;
    let initTimeout = null;
    
    function initStickers() {
        // DISABLED: Background avatars are no longer shown
        // Clean up any existing stickers on all pages
        const existingContainers = document.querySelectorAll('.sticker-container');
        existingContainers.forEach(container => container.remove());
        isInitialized = false;
        return;
    }
    
    // Clean up all stickers
    function cleanupStickers() {
        const existingContainers = document.querySelectorAll('.sticker-container');
        existingContainers.forEach(container => container.remove());
        isInitialized = false;
    }
    
    // Reinitialize on resize (with debounce)
    function handleResize() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            cleanupStickers();
            initStickers();
        }, 250);
    }
    
    // Initialize when DOM is ready (with timeout to prevent multiple calls)
    function initializeStickers() {
        clearTimeout(initTimeout);
        cleanupStickers(); // Always clean up first
        initTimeout = setTimeout(function() {
            cleanupStickers(); // Clean up again to be sure
            initStickers();
        }, 100);
    }
    
    // Clean up on page unload
    window.addEventListener('beforeunload', cleanupStickers);
    
    // Only add resize listener once
    if (!window.stickersResizeListenerAdded) {
        window.addEventListener('resize', handleResize);
        window.stickersResizeListenerAdded = true;
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeStickers, { once: true });
    } else {
        initializeStickers();
    }
})();

