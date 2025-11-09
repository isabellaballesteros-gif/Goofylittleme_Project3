let canvas, ctx, colorPicker, brushSize, brushSizeValue;
let canvasContainer;
let clearBtn, saveBtn, loadBtn, deleteAvatarBtn, interestsBtn, galleryBtn, logoutBtn, undoBtn, deleteAccountBtn;
let brushTool, eraserTool, usernameDisplay, messageDiv, greetingHeading, greetingUsername;
let poseSelector, biographyInput, saveBiographyBtn;
let currentPoseUrl = 'https://i.postimg.cc/JzRC0pFc/mepose1.png';
let poseImage = null;

let isDrawing = false;
let lastX = null; // Use null to track if position is initialized
let lastY = null;
let hasMoved = false; // Track if mouse has moved since mousedown
let movementCount = 0; // Track number of valid movement events (for additional safety)
let currentTool = 'brush'; // 'brush' or 'eraser'
let currentUser = null;
let hasExistingAvatar = false;

// Undo/Redo history
let history = [];
let historyIndex = -1;
const MAX_HISTORY = 50; // Limit history size
let baseLayerImage = null; // Stores the base layer (white background + guide)

// Separate drawing layer for user drawings (keeps pose guide safe from eraser)
let drawingLayer = null; // Offscreen canvas for user drawings only
let drawingLayerCtx = null;

// Initialize DOM elements
function initElements() {
    canvas = document.getElementById('canvas');
    canvasContainer = document.querySelector('.canvas-flex');
    ctx = canvas?.getContext('2d');
    colorPicker = document.getElementById('colorPicker');
    brushSize = document.getElementById('brushSize');
    brushSizeValue = document.getElementById('brushSizeValue');
    clearBtn = document.getElementById('clearBtn');
    saveBtn = document.getElementById('saveBtn');
    loadBtn = document.getElementById('loadBtn');
    deleteAvatarBtn = document.getElementById('deleteAvatarBtn');
    interestsBtn = document.getElementById('interestsBtn');
    galleryBtn = document.getElementById('galleryBtn');
    logoutBtn = document.getElementById('logoutBtn');
    undoBtn = document.getElementById('undoBtn');
    brushTool = document.getElementById('brushTool');
    eraserTool = document.getElementById('eraserTool');
    usernameDisplay = document.getElementById('usernameDisplay');
    greetingHeading = document.getElementById('greetingHeading');
    greetingUsername = document.getElementById('greetingUsername');
    messageDiv = document.getElementById('message');
    poseSelector = document.getElementById('poseSelector');
    biographyInput = document.getElementById('biography');
    saveBiographyBtn = document.getElementById('saveBiographyBtn');
    deleteAccountBtn = document.getElementById('deleteAccountBtn');
    
    // Debug logging
    if (!saveBiographyBtn) {
        console.warn('Save biography button not found in DOM');
    } else {
        console.log('Save biography button found');
    }
    
    if (!canvas || !ctx) {
        console.error('Canvas not found');
        return false;
    }
    return true;
}

// Check authentication and load user info
async function checkAuth() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const data = await response.json();
            const newUsername = data.username;
            
            // If username changed, clear the canvas to prevent data mixing
            if (currentUser && currentUser !== newUsername) {
                console.warn(`User changed from ${currentUser} to ${newUsername}, clearing canvas`);
                if (canvas && ctx) {
                    initCanvas();
                }
            }
            
            currentUser = newUsername;
            if (usernameDisplay) {
                const userIdText = data.userId ? ` (ID: ${data.userId})` : '';
                usernameDisplay.textContent = `Logged in as: ${currentUser}${userIdText}`;
            }
            // Update greeting heading
            if (greetingHeading && greetingUsername) {
                greetingUsername.textContent = currentUser;
                greetingHeading.style.display = 'block';
            }
            // Check if avatar exists (UI only, will auto-load after canvas is ready)
            await checkExistingAvatar();
            await loadNotifications();
        } else {
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Auth error:', error);
        window.location.href = '/login.html';
    }
}

// Load and display friend request notifications
async function loadNotifications() {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;
    
    try {
        const response = await fetch('/api/notifications/friend-requests');
        if (response.ok) {
            const requests = await response.json();
            if (requests.length > 0) {
                container.innerHTML = `
                    <div style="position: relative;">
                        <button id="notificationBtn" style="background: var(--accent); color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; font-size: 1.2em; position: relative;">
                            🔔
                            <span style="position: absolute; top: -5px; right: -5px; background: red; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 0.7em;">${requests.length}</span>
                        </button>
                        <div id="notificationDropdown" style="display: none; position: absolute; top: 45px; right: 0; background: white; border: 2px solid var(--border); border-radius: 12px; padding: 15px; min-width: 250px; max-width: 350px; box-shadow: 0 4px 12px var(--shadow); z-index: 1000;">
                            <div style="font-weight: 600; margin-bottom: 10px; font-size: 1.1em;">Friend Requests (${requests.length})</div>
                            ${requests.map(req => `
                                <div style="padding: 10px; margin-bottom: 8px; background: var(--card-bg); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div style="font-weight: 600;">@${req.username}</div>
                                        <div style="font-size: 0.8em; color: var(--text-light);">wants to be friends</div>
                                    </div>
                                    <button onclick="acceptFriendRequest('${req.username}')" style="background: var(--accent); color: white; border: none; border-radius: 8px; padding: 6px 12px; cursor: pointer; font-size: 0.9em;">Accept</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                
                // Toggle dropdown
                const btn = document.getElementById('notificationBtn');
                if (btn) {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const dropdown = document.getElementById('notificationDropdown');
                        if (dropdown) {
                            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                        }
                    });
                }
                
                // Close dropdown when clicking outside
                document.addEventListener('click', (e) => {
                    if (container && !container.contains(e.target)) {
                        const dropdown = document.getElementById('notificationDropdown');
                        if (dropdown) dropdown.style.display = 'none';
                    }
                });
            } else {
                container.innerHTML = '';
            }
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Accept friend request (global function)
window.acceptFriendRequest = async function(username) {
    try {
        const response = await fetch(`/api/notifications/friend-requests/${encodeURIComponent(username)}/accept`, {
            method: 'POST'
        });
        
        if (response.ok) {
            await loadNotifications();
            showMessage(`You are now friends with @${username}!`, 'success');
        } else {
            showMessage('Failed to accept friend request', 'error');
        }
    } catch (error) {
        console.error('Error accepting friend request:', error);
        showMessage('Failed to accept friend request', 'error');
    }
};

// Poll for new notifications every 10 seconds
setInterval(() => {
    if (currentUser) {
        loadNotifications();
    }
}, 10000);

// Check if user has existing avatar
async function checkExistingAvatar() {
    try {
        const response = await fetch('/api/avatar');
        if (response.ok) {
            const data = await response.json();
            if (data.hasAvatar) {
                hasExistingAvatar = true;
                // Show load button and delete button
                if (loadBtn) loadBtn.style.display = 'inline-block';
                if (deleteAvatarBtn) deleteAvatarBtn.style.display = 'inline-block';
                if (saveBtn) saveBtn.textContent = 'Update Avatar';
            } else {
                // No existing avatar
                hasExistingAvatar = false;
                if (loadBtn) loadBtn.style.display = 'none';
                if (deleteAvatarBtn) deleteAvatarBtn.style.display = 'none';
                if (saveBtn) saveBtn.textContent = 'Save Avatar';
            }
        }
    } catch (error) {
        console.error('Error checking avatar:', error);
    }
}

// Load existing avatar
async function loadExistingAvatar(showStatusMessage = false) {
    try {
        console.log('loadExistingAvatar called', { showStatusMessage, canvasReady: !!(canvas && ctx), canvasSize: canvas ? `${canvas.width}x${canvas.height}` : 'no canvas' });
        
        // Ensure canvas is ready
        if (!canvas || !ctx) {
            console.warn('Canvas or context not available');
            if (showStatusMessage) {
                showMessage('Canvas not ready. Please wait...', 'error');
            }
            return;
        }
        
        if (canvas.width === 0 || canvas.height === 0) {
            console.warn('Canvas size is zero, waiting...');
            // Wait a bit and retry
            setTimeout(() => loadExistingAvatar(showStatusMessage), 200);
            return;
        }
        
        const response = await fetch('/api/avatar');
        if (!response.ok) {
            console.error('Failed to fetch avatar:', response.status);
            if (showStatusMessage) {
                showMessage('Failed to load avatar', 'error');
            }
            return;
        }
        
        const data = await response.json();
        if (!data.imageData) {
            console.warn('No image data in response');
            if (showStatusMessage) {
                showMessage('No avatar found', 'error');
            }
            return;
        }
        
        console.log('Loading avatar image...');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            console.log('Avatar image loaded, drawing to canvas...');
            if (!canvas || !ctx) {
                console.error('Canvas lost during image load');
                return;
            }
            
            // Ensure base layer and drawing layer are initialized
            saveBaseLayer();
            if (!drawingLayer || drawingLayer.width !== canvas.width || drawingLayer.height !== canvas.height) {
                initDrawingLayer();
            }
            
            // Clear canvas and drawing layer
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (drawingLayerCtx) {
                drawingLayerCtx.clearRect(0, 0, drawingLayer.width, drawingLayer.height);
            }
            
            // Draw the saved image directly to the main canvas so user sees it immediately
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Also copy to drawing layer so eraser works on it
            // The entire saved image goes on the drawing layer
            if (drawingLayerCtx) {
                drawingLayerCtx.drawImage(img, 0, 0, drawingLayer.width, drawingLayer.height);
            }
            
            // Save state for undo
            saveState();
            
            console.log('Avatar loaded successfully!');
            if (showStatusMessage) {
                showMessage('Avatar loaded!', 'success');
            }
            
            // Note: We're not calling renderCanvas() here because that would draw the base layer
            // (current pose guide) over the loaded image. Instead, we draw the image directly.
            // The user's drawing is now visible. When they start drawing new strokes, those will
            // be added to the drawing layer, and renderCanvas() will be called automatically.
        };
        
        img.onerror = (error) => {
            console.error('Error loading avatar image:', error);
            if (showStatusMessage) {
                showMessage('Failed to load avatar image', 'error');
            }
        };
        
        img.src = data.imageData;
        
        // Load biography if available
        if (biographyInput && data.biography) {
            biographyInput.value = data.biography;
        }
    } catch (error) {
        console.error('Error loading avatar:', error);
        if (showStatusMessage) {
            showMessage('Failed to load avatar', 'error');
        }
    }
}

// Draw selected pose guide (faint)
function drawPoseGuide() {
    if (!poseImage) return;
    const iw = poseImage.width;
    const ih = poseImage.height;
    if (iw === 0 || ih === 0) return;
    // Fit pose within canvas with vertical breathing room
    const maxScale = 0.85; // leave ~15% space combined above/below
    const scale = Math.min(canvas.width / iw, canvas.height / ih) * maxScale;
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (canvas.width - dw) / 2;
    const dy = (canvas.height - dh) / 2;
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.drawImage(poseImage, dx, dy, dw, dh);
    ctx.restore();
}

// Save base layer (white background + guide) for redrawing after erase
function saveBaseLayer() {
    if (!canvas || !ctx) return;
    // Create a temporary canvas to save just the base (white + guide)
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    // Draw guide on temp canvas
    if (poseImage) {
        const iw = poseImage.width;
        const ih = poseImage.height;
        if (iw > 0 && ih > 0) {
            const maxScale = 0.85;
            const scale = Math.min(tempCanvas.width / iw, tempCanvas.height / ih) * maxScale;
            const dw = iw * scale;
            const dh = ih * scale;
            const dx = (tempCanvas.width - dw) / 2;
            const dy = (tempCanvas.height - dh) / 2;
            tempCtx.save();
            tempCtx.globalAlpha = 0.25;
            tempCtx.drawImage(poseImage, dx, dy, dw, dh);
            tempCtx.restore();
        }
    }
    baseLayerImage = new Image();
    baseLayerImage.src = tempCanvas.toDataURL('image/png');
    
    // Ensure drawing layer is initialized
    if (!drawingLayer || drawingLayer.width !== canvas.width || drawingLayer.height !== canvas.height) {
        initDrawingLayer();
    }
}

// Redraw just the guide portion (used during erasing to restore guide)
function redrawGuideOnly() {
    if (!canvas || !ctx || !poseImage) return;
    const iw = poseImage.width;
    const ih = poseImage.height;
    if (iw === 0 || ih === 0) return;
    const maxScale = 0.85;
    const scale = Math.min(canvas.width / iw, canvas.height / ih) * maxScale;
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (canvas.width - dw) / 2;
    const dy = (canvas.height - dh) / 2;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.25;
    ctx.drawImage(poseImage, dx, dy, dw, dh);
    ctx.restore();
}

// Initialize drawing layer (separate canvas for user drawings)
function initDrawingLayer() {
    if (!canvas) return;
    drawingLayer = document.createElement('canvas');
    drawingLayer.width = canvas.width;
    drawingLayer.height = canvas.height;
    drawingLayerCtx = drawingLayer.getContext('2d');
    // Clear the drawing layer (transparent)
    drawingLayerCtx.clearRect(0, 0, drawingLayer.width, drawingLayer.height);
}

// Render composite: base layer (white + guide) + drawing layer (user drawings)
function renderCanvas() {
    if (!canvas || !ctx) return;
    // Clear main canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw base layer (white background + pose guide)
    if (baseLayerImage && baseLayerImage.complete) {
        ctx.drawImage(baseLayerImage, 0, 0);
    } else {
        // Fallback: draw white background and guide directly
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawPoseGuide();
    }
    
    // Draw user drawings on top
    if (drawingLayer) {
        ctx.drawImage(drawingLayer, 0, 0);
    }
}

// Initialize canvas
function initCanvas() {
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawPoseGuide();
    saveBaseLayer(); // Save base layer after initialization
    
    // Initialize or resize drawing layer
    if (!drawingLayer || drawingLayer.width !== canvas.width || drawingLayer.height !== canvas.height) {
        initDrawingLayer();
    }
    
    renderCanvas(); // Render composite
    saveState(); // Save initial state to history
}

// Save current canvas state to history
// Saves the drawing layer only (not the composite) to avoid base layer mismatch issues
function saveState() {
    if (!canvas || !ctx || !drawingLayer) return;
    try {
        // Save only the drawing layer state (user drawings), not the composite
        // This ensures undo/redo works correctly even if base layer changes
        const drawingState = drawingLayer.toDataURL('image/png');
        
        // Remove any states after current index (when undoing and then drawing)
        history = history.slice(0, historyIndex + 1);
        // Add new state
        history.push(drawingState);
        historyIndex++;
        // Limit history size
        if (history.length > MAX_HISTORY) {
            history.shift();
            historyIndex--;
        }
        // Update undo button state
        updateUndoButton();
    } catch (e) {
        console.error('Error saving state:', e);
    }
}

// Undo last action
function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        restoreState(history[historyIndex]);
        updateUndoButton();
    }
}

// Restore canvas from state
function restoreState(stateImageData) {
    if (!canvas || !ctx) return;
    const img = new Image();
    img.onload = () => {
        // The saved state is the drawing layer only (user drawings)
        // We just need to restore it to the drawing layer and re-render
        
        // Ensure drawing layer exists and is properly sized
        if (!drawingLayer || drawingLayer.width !== canvas.width || drawingLayer.height !== canvas.height) {
            initDrawingLayer();
        }
        
        // Restore the drawing layer from saved state
        if (drawingLayerCtx) {
            drawingLayerCtx.clearRect(0, 0, drawingLayer.width, drawingLayer.height);
            drawingLayerCtx.globalCompositeOperation = 'source-over';
            drawingLayerCtx.drawImage(img, 0, 0);
        }
        
        // Re-render the composite (base layer + drawing layer)
        renderCanvas();
    };
    img.onerror = () => {
        console.error('Error loading state image');
        // If there's an error, clear the drawing layer
        if (drawingLayerCtx) {
            drawingLayerCtx.clearRect(0, 0, drawingLayer.width, drawingLayer.height);
        }
        renderCanvas();
    };
    img.src = stateImageData;
}

// Update undo button enabled state
function updateUndoButton() {
    if (undoBtn) {
        undoBtn.disabled = historyIndex <= 0;
    }
}

// Load pose image
function loadPoseImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            poseImage = img;
            resolve();
        };
        img.onerror = () => {
            poseImage = null;
            resolve();
        };
        img.src = url;
    });
}

// Resize canvas to container, optionally preserving current drawing
function setCanvasSize(preserve = true) {
    if (!canvas || !canvasContainer) return;
    let backupDrawingLayer = null;
    if (preserve && drawingLayer) {
        try {
            backupDrawingLayer = drawingLayer.toDataURL('image/png');
        } catch (_) {}
    }
    const w = canvasContainer.clientWidth;
    const h = canvasContainer.clientHeight;
    if (w <= 0 || h <= 0) return;
    canvas.width = w;
    canvas.height = h;
    
    // Update base layer and reinitialize drawing layer
    saveBaseLayer();
    initDrawingLayer();
    
    // Restore drawing layer if preserving
    if (backupDrawingLayer) {
        const img = new Image();
        img.onload = () => {
            if (drawingLayer && drawingLayerCtx) {
                drawingLayerCtx.drawImage(img, 0, 0, drawingLayer.width, drawingLayer.height);
            }
            renderCanvas();
            saveState();
        };
        img.src = backupDrawingLayer;
    } else {
        renderCanvas();
        saveState();
    }
}

// Drawing functions
function startDrawing(e) {
    if (!canvas || !ctx) return;
    
    // CRITICAL: Prevent any drawing/erasing on click - only set up for potential drag
    e.preventDefault();
    
    isDrawing = true;
    hasMoved = false; // Reset movement flag - NO drawing/erasing until this is true
    movementCount = 0; // Reset movement counter
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Initialize position - validate coordinates are reasonable
    // Clamp to canvas bounds immediately to prevent invalid coordinates
    lastX = Math.max(0, Math.min(x, canvas.width));
    lastY = Math.max(0, Math.min(y, canvas.height));
    
    // Additional safety: If coordinates are still invalid, abort
    if (isNaN(lastX) || isNaN(lastY) || lastX < 0 || lastX > canvas.width || lastY < 0 || lastY > canvas.height) {
        console.warn('Invalid start coordinates, aborting startDrawing');
        isDrawing = false;
        lastX = null;
        lastY = null;
        return;
    }
    
    // DO NOT save state here - wait until we confirm actual movement
    // DO NOT draw anything here - wait until movement is confirmed
}

function draw(e) {
    // CRITICAL: Exit immediately if not actively drawing
    if (!isDrawing || !canvas || !ctx) return;
    
    // Prevent default to avoid any browser interference
    e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    // Validate starting coordinates - must have valid starting point
    if (lastX === null || lastY === null || isNaN(lastX) || isNaN(lastY)) {
        lastX = currentX;
        lastY = currentY;
        return; // Exit - don't draw anything
    }
    
    // Calculate distance moved - must be at least 3 pixels to prevent accidental triggers
    // Increased threshold to prevent single-click erase issues
    const dx = currentX - lastX;
    const dy = currentY - lastY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // CRITICAL: Only proceed if mouse has moved at least 3 pixels
    // This prevents any drawing/erasing on single click or tiny movements
    if (distance < 3) {
        return; // Exit immediately - no drawing/erasing
    }
    
    // SAFETY CHECK: Prevent drawing if distance is suspiciously large (likely coordinate error)
    // If distance is more than canvas diagonal, something is wrong
    const maxDistance = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
    if (distance > maxDistance * 0.5) {
        console.warn('Suspiciously large movement detected, aborting draw', { distance, maxDistance, lastX, lastY, currentX, currentY });
        lastX = currentX;
        lastY = currentY;
        return; // Abort to prevent accidental full-canvas erase
    }
    
    // Increment movement counter
    movementCount++;
    
    // On first actual movement, save state before drawing/erasing
    // This ensures we can undo, but only after we confirm this is a real drag
    if (!hasMoved) {
        // Save the current state BEFORE we start drawing/erasing this stroke
        saveState();
        hasMoved = true;
    }
    
    // Clamp coordinates to canvas bounds to prevent drawing outside
    const clampedX = Math.max(0, Math.min(currentX, canvas.width));
    const clampedY = Math.max(0, Math.min(currentY, canvas.height));
    const clampedLastX = Math.max(0, Math.min(lastX, canvas.width));
    const clampedLastY = Math.max(0, Math.min(lastY, canvas.height));
    
    // Validate clamped coordinates
    if (isNaN(clampedX) || isNaN(clampedY) || isNaN(clampedLastX) || isNaN(clampedLastY)) {
        console.warn('Invalid coordinates detected, aborting draw');
        return;
    }
    
    // Set drawing properties
    ctx.lineWidth = brushSize.value;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Ensure drawing layer exists and is properly sized
    if (!drawingLayer || drawingLayer.width !== canvas.width || drawingLayer.height !== canvas.height) {
        initDrawingLayer();
    }
    
    if (currentTool === 'eraser') {
        // ERASER MODE: Only erase from the drawing layer (not the pose guide)
        if (drawingLayerCtx) {
            drawingLayerCtx.save();
            drawingLayerCtx.globalCompositeOperation = 'destination-out';
            drawingLayerCtx.lineWidth = brushSize.value;
            drawingLayerCtx.lineCap = 'round';
            drawingLayerCtx.lineJoin = 'round';
            drawingLayerCtx.beginPath();
            drawingLayerCtx.moveTo(clampedLastX, clampedLastY);
            drawingLayerCtx.lineTo(clampedX, clampedY);
            drawingLayerCtx.stroke();
            drawingLayerCtx.restore();
        }
    } else {
        // BRUSH MODE: Draw to the drawing layer only
        if (drawingLayerCtx) {
            drawingLayerCtx.globalCompositeOperation = 'source-over';
            drawingLayerCtx.strokeStyle = colorPicker.value;
            drawingLayerCtx.lineWidth = brushSize.value;
            drawingLayerCtx.lineCap = 'round';
            drawingLayerCtx.lineJoin = 'round';
            drawingLayerCtx.beginPath();
            drawingLayerCtx.moveTo(clampedLastX, clampedLastY);
            drawingLayerCtx.lineTo(clampedX, clampedY);
            drawingLayerCtx.stroke();
        }
    }
    
    // Re-render the composite (base layer + drawing layer)
    renderCanvas();
    
    // Update last position for next segment
    lastX = clampedX;
    lastY = clampedY;
}

function stopDrawing() {
    if (isDrawing) {
        // Reset drawing state
        isDrawing = false;
        
        // Ensure we're in normal composite mode
        if (ctx) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1.0;
        }
        
        // NOTE: We already saved state at the START of the stroke (when movement was first detected)
        // So we don't need to save again here. This prevents duplicate states and ensures
        // each stroke can be undone individually.
        
        // Reset movement flag and counter for next draw session
        hasMoved = false;
        movementCount = 0;
        
        // Reset last position to prevent drawing from old coordinates
        lastX = null;
        lastY = null;
    }
}

// Touch events for mobile
function getTouchPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
    };
}


function showMessage(text, type) {
    if (messageDiv) {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        setTimeout(() => {
            if (messageDiv) {
                messageDiv.className = 'message';
            }
        }, 3000);
    } else {
        console.log(`Message (${type}): ${text}`);
    }
}

// Save biography function (moved outside setupEventListeners for better scope)
async function saveBiography() {
    if (!biographyInput) {
        console.error('Biography input not found');
        showMessage('Biography input not found', 'error');
        return;
    }
    
    const biography = biographyInput.value.trim();
    
    if (saveBiographyBtn) {
        saveBiographyBtn.disabled = true;
        saveBiographyBtn.textContent = 'Saving...';
    }
    
    try {
        const response = await fetch('/api/biography', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ biography }),
        });
        
            if (response.ok) {
                showMessage('Save successful!', 'success');
            } else {
            const data = await response.json();
            showMessage(data.error || 'Failed to save biography', 'error');
        }
    } catch (error) {
        console.error('Error saving biography:', error);
        showMessage('Failed to save biography', 'error');
    } finally {
        if (saveBiographyBtn) {
            saveBiographyBtn.disabled = false;
            saveBiographyBtn.textContent = 'Save Biography';
        }
    }
}

// Initialize when DOM is ready
async function init() {
    if (!initElements()) {
        console.error('Failed to initialize elements');
        return;
    }
    
    await checkAuth();
    // Preload default pose image, then init canvas
    await loadPoseImage(currentPoseUrl);
    setCanvasSize(false);
    initCanvas();
    updateUndoButton(); // Initialize undo button state
    setupEventListeners();
    
    // Now that canvas is fully initialized, auto-load avatar if user has one
    if (hasExistingAvatar) {
        console.log('Auto-loading existing avatar...');
        // Small delay to ensure everything is ready
        setTimeout(async () => {
            await loadExistingAvatar();
        }, 200);
    }
}

function setupEventListeners() {
    if (!canvas || !brushTool || !eraserTool || !brushSize || !clearBtn || !saveBtn || !galleryBtn) {
        console.error('Required elements not found for event listeners');
        return;
    }
    
    // Canvas event listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!canvas || !ctx) return;
        
        const touch = getTouchPos(e);
        const x = touch.x;
        const y = touch.y;
        
        // Validate and clamp coordinates immediately
        lastX = Math.max(0, Math.min(x, canvas.width));
        lastY = Math.max(0, Math.min(y, canvas.height));
        
        // Additional safety check
        if (isNaN(lastX) || isNaN(lastY) || lastX < 0 || lastX > canvas.width || lastY < 0 || lastY > canvas.height) {
            console.warn('Invalid touch start coordinates, aborting');
            isDrawing = false;
            lastX = null;
            lastY = null;
            return;
        }
        
        isDrawing = true;
        hasMoved = false; // Reset movement flag - NO drawing/erasing until movement confirmed
        movementCount = 0; // Reset movement counter
        // Don't save state here - wait until we actually start drawing (movement detected)
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!isDrawing || !canvas || !ctx) return;
        
        const touch = getTouchPos(e);
        const currentX = touch.x;
        const currentY = touch.y;
        
        // Validate starting coordinates
        if (lastX === null || lastY === null || isNaN(lastX) || isNaN(lastY)) {
            lastX = currentX;
            lastY = currentY;
            return; // Exit - don't draw anything
        }
        
        // Calculate distance moved - must be at least 3 pixels
        const dx = currentX - lastX;
        const dy = currentY - lastY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // CRITICAL: Only proceed if finger has moved at least 3 pixels
        if (distance < 3) {
            return; // Exit immediately - no drawing/erasing
        }
        
        // SAFETY CHECK: Prevent drawing if distance is suspiciously large
        const maxDistance = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
        if (distance > maxDistance * 0.5) {
            console.warn('Suspiciously large touch movement detected, aborting');
            lastX = currentX;
            lastY = currentY;
            return;
        }
        
        // Increment movement counter
        movementCount++;
        
        // On first movement, save the state before we start drawing/erasing
        if (!hasMoved) {
            // Save the current state BEFORE we start drawing/erasing this stroke
            saveState();
            hasMoved = true;
        }
        
        // Clamp coordinates to canvas bounds
        const clampedX = Math.max(0, Math.min(currentX, canvas.width));
        const clampedY = Math.max(0, Math.min(currentY, canvas.height));
        const clampedLastX = Math.max(0, Math.min(lastX, canvas.width));
        const clampedLastY = Math.max(0, Math.min(lastY, canvas.height));
        
        // Validate clamped coordinates
        if (isNaN(clampedX) || isNaN(clampedY) || isNaN(clampedLastX) || isNaN(clampedLastY)) {
            return; // Exit if invalid
        }
        
        ctx.lineWidth = brushSize.value;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Ensure drawing layer exists and is properly sized
        if (!drawingLayer || drawingLayer.width !== canvas.width || drawingLayer.height !== canvas.height) {
            initDrawingLayer();
        }
        
        if (currentTool === 'eraser') {
            // ERASER MODE: Only erase from the drawing layer (not the pose guide)
            if (drawingLayerCtx) {
                drawingLayerCtx.save();
                drawingLayerCtx.globalCompositeOperation = 'destination-out';
                drawingLayerCtx.lineWidth = brushSize.value;
                drawingLayerCtx.lineCap = 'round';
                drawingLayerCtx.lineJoin = 'round';
                drawingLayerCtx.beginPath();
                drawingLayerCtx.moveTo(clampedLastX, clampedLastY);
                drawingLayerCtx.lineTo(clampedX, clampedY);
                drawingLayerCtx.stroke();
                drawingLayerCtx.restore();
            }
        } else {
            // BRUSH MODE: Draw to the drawing layer only
            if (drawingLayerCtx) {
                drawingLayerCtx.globalCompositeOperation = 'source-over';
                drawingLayerCtx.strokeStyle = colorPicker.value;
                drawingLayerCtx.lineWidth = brushSize.value;
                drawingLayerCtx.lineCap = 'round';
                drawingLayerCtx.lineJoin = 'round';
                drawingLayerCtx.beginPath();
                drawingLayerCtx.moveTo(clampedLastX, clampedLastY);
                drawingLayerCtx.lineTo(clampedX, clampedY);
                drawingLayerCtx.stroke();
            }
        }
        
        // Re-render the composite (base layer + drawing layer)
        renderCanvas();
        
        // Update last position
        lastX = clampedX;
        lastY = clampedY;
    });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (isDrawing) {
            // Reset drawing state
            isDrawing = false;
            
            // Ensure we're in normal composite mode
            if (ctx) {
                ctx.globalCompositeOperation = 'source-over';
                ctx.globalAlpha = 1.0;
            }
            
            // NOTE: We already saved state at the START of the stroke (when movement was first detected)
            // So we don't need to save again here. This prevents duplicate states and ensures
            // each stroke can be undone individually.
            
            // Reset movement flag, counter, and position
            hasMoved = false;
            movementCount = 0;
            lastX = null;
            lastY = null;
        }
    });

    // Handle window resize preserving drawing
    window.addEventListener('resize', () => setCanvasSize(true));
    
    // Tool selection
    brushTool.addEventListener('click', () => {
        currentTool = 'brush';
        brushTool.classList.add('active');
        eraserTool.classList.remove('active');
        canvas.style.cursor = 'crosshair';
    });
    
    eraserTool.addEventListener('click', () => {
        currentTool = 'eraser';
        eraserTool.classList.add('active');
        brushTool.classList.remove('active');
        canvas.style.cursor = 'grab';
    });
    
    brushSize.addEventListener('input', (e) => {
        if (brushSizeValue) {
            brushSizeValue.textContent = e.target.value;
        }
    });
    
    clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear your drawing?')) {
            // Clear only the drawing layer (preserve pose guide)
            if (drawingLayer && drawingLayerCtx) {
                drawingLayerCtx.clearRect(0, 0, drawingLayer.width, drawingLayer.height);
            }
            // Re-render the composite (base layer remains, drawing layer is now empty)
            renderCanvas();
            saveState(); // Save cleared state
        }
    });
    
    // Undo button
    if (undoBtn) {
        undoBtn.addEventListener('click', () => {
            undo();
        });
    }
    
    if (loadBtn) {
        loadBtn.addEventListener('click', () => {
            loadExistingAvatar(true);
        });
    }
    
    // Delete existing avatar button
    if (deleteAvatarBtn) {
        deleteAvatarBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to delete your existing avatar? This action cannot be undone.')) {
                return;
            }
            
            try {
                const response = await fetch('/api/avatar', {
                    method: 'DELETE',
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Clear only the drawing layer (preserve pose guide)
                    if (drawingLayer && drawingLayerCtx) {
                        drawingLayerCtx.clearRect(0, 0, drawingLayer.width, drawingLayer.height);
                    }
                    // Re-render composite (base layer remains, drawing layer is now empty)
                    renderCanvas();
                    
                    // Reset state
                    hasExistingAvatar = false;
                    history = [];
                    historyIndex = -1;
                    saveState();
                    updateUndoButton();
                    
                    // Hide delete button and show regular save button
                    if (deleteAvatarBtn) deleteAvatarBtn.style.display = 'none';
                    if (loadBtn) loadBtn.style.display = 'none';
                    saveBtn.textContent = 'Save Avatar';
                    
                    // Clear biography
                    if (biographyInput) {
                        biographyInput.value = '';
                    }
                    
                    showMessage('Avatar deleted successfully!', 'success');
                } else {
                    showMessage(data.error || 'Failed to delete avatar', 'error');
                }
            } catch (error) {
                console.error('Error deleting avatar:', error);
                showMessage('Failed to delete avatar', 'error');
            }
        });
    }
    
    // Add click handler for save biography button
    if (saveBiographyBtn) {
        console.log('Setting up save biography button listener');
        saveBiographyBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('Save biography button clicked');
            await saveBiography();
        });
    } else {
        console.error('Save biography button not found!');
    }
    
    // Auto-save biography on blur or after typing stops (optional, can be removed if user prefers manual save only)
    if (biographyInput) {
        let biographySaveTimeout = null;
        
        biographyInput.addEventListener('blur', async () => {
            if (biographySaveTimeout) {
                clearTimeout(biographySaveTimeout);
            }
            // Auto-save on blur (optional)
            // await saveBiography();
        });
    }
    
    saveBtn.addEventListener('click', async () => {
        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            
            const imageData = canvas.toDataURL('image/png');
            const biography = biographyInput ? biographyInput.value.trim() : '';
            
            // Save biography first
            if (biography) {
                await saveBiography();
            }
            
            const response = await fetch('/api/avatar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ imageData, biography }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showMessage('Avatar saved successfully!', 'success');
                hasExistingAvatar = true;
                saveBtn.textContent = 'Update Avatar';
                setTimeout(() => {
                    window.location.href = '/gallery.html';
                }, 1500);
            } else {
                showMessage(data.error || 'Failed to save avatar', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('Failed to save avatar', 'error');
        } finally {
            saveBtn.disabled = false;
            if (!hasExistingAvatar) {
                saveBtn.textContent = 'Save Avatar';
            }
        }
    });
    
    if (interestsBtn) {
        interestsBtn.addEventListener('click', () => {
            window.location.href = '/interests.html';
        });
    }
    
    galleryBtn.addEventListener('click', () => {
        window.location.href = '/gallery.html';
    });
    
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
    
    // Delete account button
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            const confirmMessage = 'Are you sure you want to delete your account? This will permanently delete:\n\n' +
                '• Your username and email\n' +
                '• Your avatar\n' +
                '• All your interests\n' +
                '• All your messages\n' +
                '• Your friendships\n\n' +
                'This action CANNOT be undone!';
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            // Double confirmation
            const doubleConfirm = confirm('This is your last chance! Are you absolutely sure you want to delete your account?');
            if (!doubleConfirm) {
                return;
            }
            
            try {
                deleteAccountBtn.disabled = true;
                deleteAccountBtn.textContent = 'Deleting...';
                
                const response = await fetch('/api/account', {
                    method: 'DELETE'
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showMessage('Account deleted successfully. Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 2000);
                } else {
                    showMessage(data.error || 'Failed to delete account', 'error');
                    deleteAccountBtn.disabled = false;
                    deleteAccountBtn.textContent = 'Delete Account';
                }
            } catch (error) {
                console.error('Error deleting account:', error);
                showMessage('Failed to delete account', 'error');
                deleteAccountBtn.disabled = false;
                deleteAccountBtn.textContent = 'Delete Account';
            }
        });
    }

    // Pose selection
    if (poseSelector) {
        poseSelector.querySelectorAll('.pose-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (isDrawing && !confirm('Switching pose will redraw the guide. Continue?')) {
                    return;
                }
                poseSelector.querySelectorAll('.pose-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentPoseUrl = btn.getAttribute('data-pose');
                await loadPoseImage(currentPoseUrl);
                // Update base layer with new pose (preserve user drawings in drawing layer)
                saveBaseLayer();
                // Re-render composite with new pose guide
                renderCanvas();
                saveState(); // Save state after pose change
            });
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
