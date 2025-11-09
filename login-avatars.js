// Tiny animated avatars for login page
(function() {
    'use strict';
    
    // Only run on login page
    if (!document.querySelector('.login-container')) {
        return;
    }
    
    // Avatar URLs provided by user
    const avatarUrls = [
        'https://i.postimg.cc/TYF706dr/avatar1.png',
        'https://i.postimg.cc/cJNDqBtV/avater2.png', // Note: typo in original URL preserved
        'https://i.postimg.cc/Vkt7HVvp/avatar3.png',
        'https://i.postimg.cc/2SWHXKyJ/avatar4.png',
        'https://i.postimg.cc/htmC35vY/avatar5.png',
        'https://i.postimg.cc/L8Py0b5Q/avatar6.png',
        'https://i.postimg.cc/yNzfqy3f/avatar7.png'
    ];
    
    // Number of avatars to display - one for each image
    function getAvatarCount() {
        return avatarUrls.length; // Always show one of each (7 avatars)
    }
    
    // Create avatar container
    function createAvatarContainer() {
        // Remove existing container if any
        const existing = document.querySelector('.login-avatars-container');
        if (existing) {
            existing.remove();
        }
        
        const container = document.createElement('div');
        container.className = 'login-avatars-container';
        document.body.insertBefore(container, document.body.firstChild);
        return container;
    }
    
    // Calculate safe zones for avatar placement (avoiding content areas)
    function getSafeZones() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const zones = [];
        
        // Define content areas to avoid
        // Login container typically spans center of page
        const centerX = width / 2;
        const centerY = height / 2;
        const contentWidth = Math.min(1400, width * 0.9); // Login container max-width
        const contentHeight = Math.min(800, height * 0.9); // Approximate content height
        const safePadding = 180; // Extra padding around content
        
        // Create safe zones: corners and edges
        const cornerSize = Math.min(300, width * 0.25, height * 0.25);
        const edgeWidth = 200;
        const edgeHeight = 150;
        
        // Top-left corner
        if (centerX - contentWidth/2 - safePadding > cornerSize) {
            zones.push({
                x: 50,
                y: 50,
                width: cornerSize,
                height: cornerSize
            });
        }
        
        // Top-right corner
        if (centerX + contentWidth/2 + safePadding < width - cornerSize) {
            zones.push({
                x: width - cornerSize - 50,
                y: 50,
                width: cornerSize,
                height: cornerSize
            });
        }
        
        // Bottom-left corner
        if (centerX - contentWidth/2 - safePadding > cornerSize) {
            zones.push({
                x: 50,
                y: height - cornerSize - 50,
                width: cornerSize,
                height: cornerSize
            });
        }
        
        // Bottom-right corner
        if (centerX + contentWidth/2 + safePadding < width - cornerSize) {
            zones.push({
                x: width - cornerSize - 50,
                y: height - cornerSize - 50,
                width: cornerSize,
                height: cornerSize
            });
        }
        
        // Top edge (between corners, avoiding center)
        if (width > contentWidth + safePadding * 2) {
            const topLeftX = Math.max(50, centerX - contentWidth/2 - safePadding - edgeWidth);
            const topRightX = Math.min(width - edgeWidth - 50, centerX + contentWidth/2 + safePadding);
            if (topRightX > topLeftX + edgeWidth) {
                zones.push({
                    x: topLeftX,
                    y: 50,
                    width: topRightX - topLeftX,
                    height: edgeHeight
                });
            }
        }
        
        // Bottom edge (between corners, avoiding center)
        if (width > contentWidth + safePadding * 2) {
            const bottomLeftX = Math.max(50, centerX - contentWidth/2 - safePadding - edgeWidth);
            const bottomRightX = Math.min(width - edgeWidth - 50, centerX + contentWidth/2 + safePadding);
            if (bottomRightX > bottomLeftX + edgeWidth) {
                zones.push({
                    x: bottomLeftX,
                    y: height - edgeHeight - 50,
                    width: bottomRightX - bottomLeftX,
                    height: edgeHeight
                });
            }
        }
        
        // Left edge (avoiding center)
        if (centerX - contentWidth/2 - safePadding > edgeWidth + 50) {
            zones.push({
                x: 50,
                y: Math.max(50, centerY - contentHeight/2 - safePadding),
                width: edgeWidth,
                height: Math.min(400, height * 0.6)
            });
        }
        
        // Right edge (avoiding center)
        if (centerX + contentWidth/2 + safePadding < width - edgeWidth - 50) {
            zones.push({
                x: width - edgeWidth - 50,
                y: Math.max(50, centerY - contentHeight/2 - safePadding),
                width: edgeWidth,
                height: Math.min(400, height * 0.6)
            });
        }
        
        return zones;
    }
    
    // Check if position is far enough from existing avatars
    function isPositionValid(x, y, size, existingPositions, minDistance) {
        for (const pos of existingPositions) {
            const distance = Math.sqrt(
                Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2)
            );
            if (distance < minDistance) {
                return false;
            }
        }
        return true;
    }
    
    // Get corner positions (ensuring one avatar in each corner)
    function getCornerPositions(avatarSize) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const padding = 60;
        
        return [
            { x: padding, y: padding, zone: 'top-left' }, // Top-left
            { x: width - avatarSize - padding, y: padding, zone: 'top-right' }, // Top-right
            { x: padding, y: height - avatarSize - padding, zone: 'bottom-left' }, // Bottom-left
            { x: width - avatarSize - padding, y: height - avatarSize - padding, zone: 'bottom-right' } // Bottom-right
        ];
    }
    
    // Get edge positions (for remaining avatars)
    function getEdgePositions(avatarSize, safeZones) {
        const positions = [];
        const width = window.innerWidth;
        const height = window.innerHeight;
        const padding = 60;
        
        // Top edge (center area)
        if (safeZones.length > 0) {
            const topEdge = safeZones.find(z => z.y === 50 && z.height === 150);
            if (topEdge && topEdge.width > avatarSize) {
                positions.push({
                    x: topEdge.x + (topEdge.width - avatarSize) / 2,
                    y: topEdge.y + (topEdge.height - avatarSize) / 2,
                    zone: 'top-edge'
                });
            }
        }
        
        // Bottom edge (center area)
        if (safeZones.length > 0) {
            const bottomEdge = safeZones.find(z => z.y === height - 150 - 50);
            if (bottomEdge && bottomEdge.width > avatarSize) {
                positions.push({
                    x: bottomEdge.x + (bottomEdge.width - avatarSize) / 2,
                    y: bottomEdge.y + (bottomEdge.height - avatarSize) / 2,
                    zone: 'bottom-edge'
                });
            }
        }
        
        // Left edge (center area)
        if (safeZones.length > 0) {
            const leftEdge = safeZones.find(z => z.x === 50 && z.width === 200);
            if (leftEdge && leftEdge.height > avatarSize) {
                positions.push({
                    x: leftEdge.x + (leftEdge.width - avatarSize) / 2,
                    y: leftEdge.y + (leftEdge.height - avatarSize) / 2,
                    zone: 'left-edge'
                });
            }
        }
        
        // Right edge (center area)
        if (safeZones.length > 0) {
            const rightEdge = safeZones.find(z => z.x === width - 200 - 50);
            if (rightEdge && rightEdge.height > avatarSize) {
                positions.push({
                    x: rightEdge.x + (rightEdge.width - avatarSize) / 2,
                    y: rightEdge.y + (rightEdge.height - avatarSize) / 2,
                    zone: 'right-edge'
                });
            }
        }
        
        return positions;
    }
    
    // Get random position in a safe zone with distance checking
    function getRandomPositionInSafeZone(zones, avatarSize, existingPositions, minDistance) {
        if (zones.length === 0) {
            // Fallback: use corners if no zones defined
            const corners = getCornerPositions(avatarSize);
            for (const corner of corners) {
                if (isPositionValid(corner.x, corner.y, avatarSize, existingPositions, minDistance)) {
                    return corner;
                }
            }
            // If all corners are taken, return first corner anyway
            return corners[0];
        }
        
        // Try multiple zones to find a valid position
        const shuffledZones = [...zones].sort(() => Math.random() - 0.5);
        
        for (const zone of shuffledZones) {
            // Try up to 10 random positions in this zone
            for (let i = 0; i < 10; i++) {
                const x = zone.x + Math.random() * Math.max(0, zone.width - avatarSize);
                const y = zone.y + Math.random() * Math.max(0, zone.height - avatarSize);
                
                if (isPositionValid(x, y, avatarSize, existingPositions, minDistance)) {
                    return { x, y, zone: 'random' };
                }
            }
        }
        
        // Fallback: use center of first zone if no valid position found
        const zone = zones[0];
        return {
            x: zone.x + (zone.width - avatarSize) / 2,
            y: zone.y + (zone.height - avatarSize) / 2,
            zone: 'fallback'
        };
    }
    
    // Create a single avatar - one for each image
    function createTinyAvatar(container, index, existingPositions) {
        const avatar = document.createElement('img');
        // Use each image exactly once
        const avatarUrl = avatarUrls[index];
        
        avatar.src = avatarUrl;
        avatar.className = 'login-tiny-avatar';
        avatar.alt = `Avatar ${index + 1}`;
        
        // Handle image load errors gracefully
        avatar.onerror = function() {
            this.style.display = 'none';
        };
        
        // Much bigger size (100px to 150px)
        const size = 100 + Math.random() * 50;
        avatar.style.width = size + 'px';
        avatar.style.height = size + 'px';
        
        // Minimum distance between avatars (size + padding)
        const minDistance = size + 80;
        
        let position;
        const safeZones = getSafeZones();
        
        // First 4 avatars go in corners (one per corner)
        if (index < 4) {
            const corners = getCornerPositions(size);
            position = corners[index];
            
            // Verify corner position is valid (not too close to existing avatars)
            if (!isPositionValid(position.x, position.y, size, existingPositions, minDistance)) {
                // If corner is taken, try to find alternative position nearby
                const corner = corners[index];
                let attempts = 0;
                let valid = false;
                while (!valid && attempts < 20) {
                    const offset = 30;
                    position = {
                        x: corner.x + (Math.random() - 0.5) * offset * 2,
                        y: corner.y + (Math.random() - 0.5) * offset * 2,
                        zone: corners[index].zone
                    };
                    // Ensure still in bounds
                    position.x = Math.max(30, Math.min(position.x, window.innerWidth - size - 30));
                    position.y = Math.max(30, Math.min(position.y, window.innerHeight - size - 30));
                    valid = isPositionValid(position.x, position.y, size, existingPositions, minDistance);
                    attempts++;
                }
                if (!valid) {
                    // Last resort: use corner anyway
                    position = corners[index];
                }
            }
        } else {
            // Remaining avatars (5, 6, 7) go in edges or other safe zones
            const edgePositions = getEdgePositions(size, safeZones);
            
            if (edgePositions.length > 0 && (index - 4) < edgePositions.length) {
                // Use predefined edge positions
                position = edgePositions[index - 4];
                // Verify it's valid
                if (!isPositionValid(position.x, position.y, size, existingPositions, minDistance)) {
                    // Find alternative in safe zones
                    position = getRandomPositionInSafeZone(safeZones, size, existingPositions, minDistance);
                }
            } else {
                // Use safe zones with distance checking
                position = getRandomPositionInSafeZone(safeZones, size, existingPositions, minDistance);
            }
        }
        
        avatar.style.left = Math.max(0, Math.min(position.x, window.innerWidth - size)) + 'px';
        avatar.style.top = Math.max(0, Math.min(position.y, window.innerHeight - size)) + 'px';
        
        // Store position for overlap checking
        existingPositions.push({
            x: parseFloat(avatar.style.left),
            y: parseFloat(avatar.style.top),
            size: size
        });
        
        // Full opacity (100%)
        avatar.style.opacity = 1.0;
        
        // Random animation delay for variety
        const delay = Math.random() * 5;
        avatar.style.animationDelay = delay + 's';
        
        // Assign animation class based on index for variety
        const animationTypes = ['float', 'bounce', 'rotate', 'wiggle', 'float', 'bounce', 'rotate'];
        avatar.classList.add(`avatar-${animationTypes[index % animationTypes.length]}`);
        
        container.appendChild(avatar);
    }
    
    // Initialize tiny avatars
    let isInitialized = false;
    let resizeTimeout = null;
    
    function initTinyAvatars() {
        if (isInitialized) {
            return;
        }
        
        const container = createAvatarContainer();
        const count = getAvatarCount();
        
        // Track positions to prevent overlap
        const existingPositions = [];
        
        for (let i = 0; i < count; i++) {
            createTinyAvatar(container, i, existingPositions);
        }
        
        isInitialized = true;
    }
    
    // Clean up avatars
    function cleanupAvatars() {
        const container = document.querySelector('.login-avatars-container');
        if (container) {
            container.remove();
        }
        isInitialized = false;
    }
    
    // Handle resize
    function handleResize() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            cleanupAvatars();
            initTinyAvatars();
        }, 300);
    }
    
    // Initialize when DOM is ready
    function initialize() {
        cleanupAvatars();
        initTinyAvatars();
    }
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();

