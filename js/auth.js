document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const verifyForm = document.getElementById('verify-form');

    // Register User
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const message = document.getElementById('message');

            try {
                const response = await fetch('http://localhost:3000/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await response.json();
                if (response.ok) {
                    message.style.color = 'green';
                    message.textContent = 'Registration successful! Redirecting to verification...';
                    setTimeout(() => window.location.href = `verify-email.html?email=${encodeURIComponent(email)}`, 2000);
                } else {
                    message.style.color = 'red';
                    message.textContent = data.message;
                }
            } catch (err) {
                console.error(err);
                message.textContent = 'An error occurred';
            }
        });
    }

    // Login User
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const message = document.getElementById('message');

            try {
                const response = await fetch('http://localhost:3000/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    window.location.href = 'dashboard.html';
                } else if (response.status === 403 && data.needsVerification) {
                    message.style.color = 'orange';
                    message.textContent = 'Account not verified. Redirecting...';
                    setTimeout(() => window.location.href = `verify-email.html?email=${encodeURIComponent(email)}`, 2000);
                } else {
                    message.style.color = 'red';
                    message.textContent = data.message;
                }
            } catch (err) {
                console.error(err);
                message.textContent = 'Login failed';
            }
        });
    }

    // Verify Email
    if (verifyForm) {
        verifyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email-hidden').value;
            const code = document.getElementById('verification-code').value;
            const message = document.getElementById('message');

            try {
                const response = await fetch('http://localhost:3000/api/auth/verify-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, code })
                });

                const data = await response.json();
                if (response.ok) {
                    message.style.color = 'green';
                    message.textContent = 'Verification successful! Logging you in...';
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    setTimeout(() => window.location.href = 'dashboard.html', 1500);
                } else {
                    message.style.color = 'red';
                    message.textContent = data.message;
                }
            } catch (err) {
                console.error(err);
                message.textContent = 'Verification failed';
            }
        });
    }

    // Dashboard Protected Route
    if (window.location.pathname.includes('dashboard.html')) {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
        } else {
            const user = JSON.parse(localStorage.getItem('user'));
            document.getElementById('welcome-message').textContent = `Welcome, ${user.name}!`;

            document.getElementById('logout-btn').addEventListener('click', () => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'index.html';
            });
        }
    }
});
