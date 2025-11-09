// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginFormElement = document.getElementById('loginFormElement');
    const registerFormElement = document.getElementById('registerFormElement');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');
    const messageDiv = document.getElementById('message');

    if (!loginForm || !registerForm || !loginFormElement || !registerFormElement || !showRegister || !showLogin || !messageDiv) {
        console.error('Required elements not found');
        return;
    }

    // Switch between login and register forms
    showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    clearMessage();
});

    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        clearMessage();
    });

    // Login
    loginFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const email = document.getElementById('loginEmail').value.trim();

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, email })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Login successful!', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } else {
            showMessage(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Failed to login. Please try again.', 'error');
    }
    });

    // Register
    registerFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const email = document.getElementById('registerEmail').value.trim();

    if (username.length < 3) {
        showMessage('Username must be at least 3 characters', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, email })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('Registration response data:', data);
            if (data.userId) {
                showMessage(`Registration successful! Your ID is: ${data.userId}`, 'success');
            } else {
                showMessage('Registration successful! (User ID will be assigned)', 'success');
            }
            setTimeout(() => {
                // Redirect to tutorial page for new users
                window.location.href = '/tutorial.html?newUser=true';
            }, 2000);
        } else {
            showMessage(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Failed to register. Please try again.', 'error');
    }
    });

    function showMessage(text, type) {
        if (messageDiv) {
            messageDiv.textContent = text;
            messageDiv.className = `message ${type}`;
        }
    }

    function clearMessage() {
        if (messageDiv) {
            messageDiv.className = 'message';
            messageDiv.textContent = '';
        }
    }
});

