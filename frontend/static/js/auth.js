document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
        });

        if (!response.ok) {
            throw new Error('Ошибка авторизации');
        }

        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        window.location.href = '/proposals';
    } catch (error) {
        alert(error.message);
    }
});

// Проверка авторизации при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname !== '/login' && !localStorage.getItem('access_token')) {
        window.location.href = '/login';
    }
});