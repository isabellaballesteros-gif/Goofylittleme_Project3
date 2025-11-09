let canvas, ctx, colorPicker, brushSize, brushSizeValue;
let canvasContainer;
let clearBtn, sendGiftBtn, logoutBtn, undoBtn;
let brushTool, eraserTool, usernameDisplay, messageDiv, recipientName;
let currentTool = 'brush';
let currentUser = null;
let recipient = null;

// Undo/Redo history
let history = [];
let historyIndex = -1;
const MAX_HISTORY = 50;

// Initialize DOM elements
function initElements() {
    canvas = document.getElementById('canvas');
    canvasContainer = document.querySelector('.canvas-flex');
    ctx = canvas?.getContext('2d');
    colorPicker = document.getElementById('colorPicker');
    brushSize = document.getElementById('brushSize');
    brushSizeValue = document.getElementById('brushSizeValue');
    clearBtn = document.getElementById('clearBtn');
    sendGiftBtn = document.getElementById('sendGiftBtn');
    logoutBtn = document.getElementById('logoutBtn');
    undoBtn = document.getElementById('undoBtn');
    brushTool = document.getElementById('brushTool');
    eraserTool = document.getElementById('eraserTool');
    usernameDisplay = document.getElementById('usernameDisplay');
    messageDiv = document.getElementById('message');
    recipientName = document.getElementById('recipientName');
    
    if (!canvas || !ctx) {
        console.error('Canvas not found');
        return false;
    }
    return true;
}

// Check authentication and get recipient from URL
async function checkAuth() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const data = await response.json();
            currentUser = data.username;
            if (usernameDisplay) {
                usernameDisplay.textContent = `Logged in as: ${currentUser}`;
            }
            
            // Get recipient from URL
            const params = new URLSearchParams(window.location.search);
            recipient = params.get('to');
            if (recipientName) {
                recipientName.textContent = recipient || 'Unknown';
            }
            
            if (!recipient) {
                showMessage('No recipient specified', 'error');
                setTimeout(() => {
                    window.location.href = '/gallery.html';
                }, 2000);
            }
        } else {
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Auth error:', error);
        window.location.href = '/login.html';
    }
}

// Initialize canvas
function initCanvas() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
}

// Save current canvas state to history
function saveState() {
    if (!canvas || !ctx) return;
    try {
        const state = canvas.toDataURL('image/png');
        history = history.slice(0, historyIndex + 1);
        history.push(state);
        historyIndex++;
        if (history.length > MAX_HISTORY) {
            history.shift();
            historyIndex--;
        }
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
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    };
    img.src = stateImageData;
}

// Update undo button enabled state
function updateUndoButton() {
    if (undoBtn) {
        undoBtn.disabled = historyIndex <= 0;
    }
}

// Resize canvas to container
function setCanvasSize(preserve = true) {
    if (!canvas || !canvasContainer) return;
    let backup = null;
    if (preserve) {
        try {
            backup = canvas.toDataURL('image/png');
        } catch (_) {}
    }
    const w = canvasContainer.clientWidth;
    const h = canvasContainer.clientHeight;
    if (w <= 0 || h <= 0) return;
    canvas.width = w;
    canvas.height = h;
    initCanvas();
    if (backup) {
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = backup;
    }
}

let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Drawing functions
function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
    saveState();
}

function draw(e) {
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
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
    if (isDrawing) {
        isDrawing = false;
    }
}

// Send gift
async function sendGift() {
    if (!recipient) {
        showMessage('No recipient specified', 'error');
        return;
    }
    
    try {
        const imageData = canvas.toDataURL('image/png');
        
        sendGiftBtn.disabled = true;
        sendGiftBtn.textContent = 'Sending...';
        
        const response = await fetch('/api/gifts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recipient: recipient,
                imageData: imageData
            })
        });
        
        if (response.ok) {
            showMessage('Gift sent successfully!', 'success');
            setTimeout(() => {
                window.location.href = '/gallery.html';
            }, 1500);
        } else {
            const data = await response.json();
            showMessage(data.error || 'Failed to send gift', 'error');
            sendGiftBtn.disabled = false;
            sendGiftBtn.textContent = 'Send Gift';
        }
    } catch (error) {
        console.error('Error sending gift:', error);
        showMessage('Failed to send gift', 'error');
        sendGiftBtn.disabled = false;
        sendGiftBtn.textContent = 'Send Gift';
    }
}

// Show message
function showMessage(text, type = 'info') {
    if (messageDiv) {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.className = 'message';
        }, 3000);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Tool selection
    if (brushTool) {
        brushTool.addEventListener('click', () => {
            currentTool = 'brush';
            brushTool.classList.add('active');
            eraserTool.classList.remove('active');
        });
    }
    
    if (eraserTool) {
        eraserTool.addEventListener('click', () => {
            currentTool = 'eraser';
            eraserTool.classList.add('active');
            brushTool.classList.remove('active');
        });
    }
    
    // Brush size
    if (brushSize && brushSizeValue) {
        brushSize.addEventListener('input', () => {
            brushSizeValue.textContent = brushSize.value;
        });
    }
    
    // Canvas drawing
    if (canvas) {
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        
        // Touch events for mobile
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        });
        
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            canvas.dispatchEvent(mouseEvent);
        });
    }
    
    // Buttons
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Clear the entire canvas?')) {
                initCanvas();
            }
        });
    }
    
    if (undoBtn) {
        undoBtn.addEventListener('click', undo);
    }
    
    if (sendGiftBtn) {
        sendGiftBtn.addEventListener('click', sendGift);
    }
    
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
}

// Initialize
(async () => {
    if (!initElements()) {
        console.error('Failed to initialize elements');
        return;
    }
    
    await checkAuth();
    setCanvasSize(false);
    setupEventListeners();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        setCanvasSize(true);
    });
})();

