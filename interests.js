let canvas, ctx;
let colorPicker, brushSize, brushSizeValue;
let brushTool, eraserTool, clearBtn, saveBtn, setPreviewBtn;
let currentCategory = 'dream-house';
let currentUsername = null;
let currentTool = 'brush';
let isDrawing = false;
let lastX = 0, lastY = 0;
let savedInterests = {};
let currentPreviewInterest = null;

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const data = await response.json();
            currentUsername = data.username;
            if (document.getElementById('usernameDisplay')) {
                const userIdText = data.userId ? ` (ID: ${data.userId})` : '';
                document.getElementById('usernameDisplay').textContent = `@${data.username}${userIdText}`;
            }
            // Update back to profile link
            const backToProfileBtn = document.getElementById('backToProfileBtn');
            if (backToProfileBtn) {
                backToProfileBtn.href = `/profile.html?username=${encodeURIComponent(currentUsername)}`;
            }
            await loadExistingInterests();
        } else {
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Auth error:', error);
        window.location.href = '/login.html';
    }
}

// Load existing interests and current preview
async function loadExistingInterests() {
    try {
        const response = await fetch(`/api/interests/${currentUsername}`);
        if (response.ok) {
            savedInterests = await response.json();
            // Load the first category if it exists
            if (savedInterests[currentCategory]) {
                loadCategoryImage(savedInterests[currentCategory]);
            } else {
                initCanvas();
            }
        } else {
            initCanvas();
        }
        
        // Load current preview interest
        await loadCurrentPreview();
    } catch (error) {
        console.error('Error loading interests:', error);
        initCanvas();
    }
}

// Load current preview interest
async function loadCurrentPreview() {
    try {
        const response = await fetch(`/api/profile/${encodeURIComponent(currentUsername)}`);
        if (response.ok) {
            const data = await response.json();
            currentPreviewInterest = data.previewInterest || null;
            updatePreviewButton();
        }
    } catch (error) {
        console.error('Error loading preview interest:', error);
    }
}

// Update preview button visibility and state
function updatePreviewButton() {
    if (!setPreviewBtn) return;
    
    const hasInterest = savedInterests[currentCategory] && savedInterests[currentCategory] !== 'data:,';
    const isPreview = currentPreviewInterest === currentCategory;
    
    if (hasInterest) {
        setPreviewBtn.style.display = 'inline-block';
        if (isPreview) {
            setPreviewBtn.textContent = '✓ Preview Set';
            setPreviewBtn.classList.add('active');
        } else {
            setPreviewBtn.textContent = 'Set as Preview';
            setPreviewBtn.classList.remove('active');
        }
    } else {
        setPreviewBtn.style.display = 'none';
    }
}

// Initialize canvas
function initCanvas() {
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Load category image
function loadCategoryImage(imageData) {
    const img = new Image();
    img.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = imageData;
}

// Switch category
function switchCategory(category) {
    // Save current canvas state before switching
    if (canvas && ctx) {
        const imageData = canvas.toDataURL('image/png');
        savedInterests[currentCategory] = imageData;
    }
    
    currentCategory = category;
    
    // Update UI
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.category === category) {
            item.classList.add('active');
        }
    });
    
    // Update title
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
    
    const titleEl = document.getElementById('currentCategoryTitle');
    if (titleEl) {
        titleEl.textContent = categoryNames[category] || category;
    }
    
    // Load category image if exists, otherwise clear canvas
    if (savedInterests[category]) {
        loadCategoryImage(savedInterests[category]);
    } else {
        initCanvas();
    }
    
    // Update preview button for new category
    updatePreviewButton();
}

// Helper function to get correct canvas coordinates accounting for scaling
function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

// Drawing functions
function startDrawing(e) {
    isDrawing = true;
    const coords = getCanvasCoordinates(e);
    lastX = coords.x;
    lastY = coords.y;
}

function draw(e) {
    if (!isDrawing) return;
    const coords = getCanvasCoordinates(e);
    const currentX = coords.x;
    const currentY = coords.y;
    
    ctx.lineWidth = brushSize.value;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = colorPicker.value;
    }
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
    
    lastX = currentX;
    lastY = currentY;
}

function stopDrawing() {
    isDrawing = false;
    ctx.globalCompositeOperation = 'source-over';
}

// Touch events
function getTouchPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
    };
}

// Setup canvas
function setupCanvas() {
    canvas = document.getElementById('interestCanvas');
    if (!canvas) return false;
    
    ctx = canvas.getContext('2d');
    
    // Set canvas size to fit container
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Initialize white background
    initCanvas();
    
    // Event listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = getTouchPos(e);
        lastX = touch.x;
        lastY = touch.y;
        isDrawing = true;
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!isDrawing) return;
        const touch = getTouchPos(e);
        const currentX = touch.x;
        const currentY = touch.y;
        
        ctx.lineWidth = brushSize.value;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (currentTool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = colorPicker.value;
        }
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        
        lastX = currentX;
        lastY = currentY;
    });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        isDrawing = false;
        ctx.globalCompositeOperation = 'source-over';
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        const container = canvas.parentElement;
        const currentImage = canvas.toDataURL('image/png');
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = currentImage;
    });
    
    return true;
}

// Setup event listeners
function setupEventListeners() {
    colorPicker = document.getElementById('colorPicker');
    brushSize = document.getElementById('brushSize');
    brushSizeValue = document.getElementById('brushSizeValue');
    brushTool = document.getElementById('brushTool');
    eraserTool = document.getElementById('eraserTool');
    clearBtn = document.getElementById('clearBtn');
    saveBtn = document.getElementById('saveBtn');
    setPreviewBtn = document.getElementById('setPreviewBtn');
    
    // Initialize preview button state
    if (setPreviewBtn) {
        updatePreviewButton();
    }
    
    // Category selection
    document.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', () => {
            switchCategory(item.dataset.category);
        });
    });
    
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
        if (confirm('Clear this drawing?')) {
            initCanvas();
        }
    });
    
    saveBtn.addEventListener('click', async () => {
        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            
            if (!canvas || !ctx) {
                showMessage('Canvas not initialized', 'error');
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save';
                return;
            }
            
            const imageData = canvas.toDataURL('image/png');
            
            if (!imageData || imageData === 'data:,') {
                showMessage('No drawing to save', 'error');
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save';
                return;
            }
            
            const response = await fetch(`/api/interests/${currentCategory}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageData })
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { error: errorText || 'Failed to save' };
                }
                showMessage(errorData.error || 'Failed to save', 'error');
                console.error('Save error:', errorData);
            } else {
                const data = await response.json();
                savedInterests[currentCategory] = imageData;
                showMessage('✓ Saved!', 'success');
                updatePreviewButton();
            }
        } catch (error) {
            console.error('Error saving interest:', error);
            showMessage(`Failed to save: ${error.message}`, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
        }
    });
    
    // Set as Preview button
    if (setPreviewBtn) {
        setPreviewBtn.addEventListener('click', async () => {
            try {
                setPreviewBtn.disabled = true;
                setPreviewBtn.textContent = 'Setting...';
                
                const response = await fetch('/api/profile/preview-interest', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ category: currentCategory })
                });
                
                if (response.ok) {
                    currentPreviewInterest = currentCategory;
                    updatePreviewButton();
                    showMessage('✓ Set as preview!', 'success');
                } else {
                    const data = await response.json();
                    showMessage(data.error || 'Failed to set preview', 'error');
                }
            } catch (error) {
                console.error('Error setting preview:', error);
                showMessage('Failed to set preview', 'error');
            } finally {
                setPreviewBtn.disabled = false;
            }
        });
    }
    
    // Update back to profile link
    const backToProfileBtn = document.getElementById('backToProfileBtn');
    if (backToProfileBtn && currentUsername) {
        backToProfileBtn.href = `/profile.html?username=${encodeURIComponent(currentUsername)}`;
    }
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch('/api/logout', { method: 'POST' });
                window.location.href = '/login.html';
            } catch (error) {
                window.location.href = '/login.html';
            }
        });
    }
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        setTimeout(() => {
            messageDiv.className = 'message';
            messageDiv.textContent = '';
        }, 2000);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    if (setupCanvas()) {
        setupEventListeners();
    }
});
