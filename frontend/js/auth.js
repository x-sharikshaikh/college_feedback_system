// Authentication Module for College Feedback System

document.addEventListener('DOMContentLoaded', function() {
    // Get the login form element
    const loginForm = document.getElementById('login-form');
    
    // Add event listener for form submission
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Check for demo login buttons
    const demoStudentBtn = document.getElementById('demo-student-login');
    const demoAdminBtn = document.getElementById('demo-admin-login');
    
    if (demoStudentBtn) {
        demoStudentBtn.addEventListener('click', function() {
            loginWithDemo('student@example.com', 'studentpass');
        });
    }
    
    if (demoAdminBtn) {
        demoAdminBtn.addEventListener('click', function() {
            loginWithDemo('admin@example.com', 'adminpass');
        });
    }
});

/**
 * Handle the login form submission
 * @param {Event} e - The form submit event
 */
function handleLogin(e) {
    e.preventDefault();
    
    // Get form values
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Basic client-side validation
    if (!email || !password) {
        showError('Email and password are required');
        return;
    }
    
    // In a real application, you would send these credentials to your backend
    // For this demo, we'll simulate the authentication process
    authenticateUser(email, password);
}

/**
 * Authenticate user with the backend
 * @param {string} email - User's email
 * @param {string} password - User's password
 */
function authenticateUser(email, password) {
    // Simulate API call with setTimeout
    showLoading();
    
    setTimeout(() => {
        // This is where you would normally make an API call to your backend
        // For demo purposes, we'll check against hardcoded credentials
        
        if (email === 'student@example.com' && password === 'studentpass') {
            // Student login successful
            loginSuccess('student');
        } else if (email === 'admin@example.com' && password === 'adminpass') {
            // Admin login successful
            loginSuccess('admin');
        } else {
            // Login failed
            hideLoading();
            showError('Invalid email or password');
        }
    }, 1000);
}

/**
 * Login with demo credentials
 * @param {string} email - Demo email
 * @param {string} password - Demo password
 */
function loginWithDemo(email, password) {
    document.getElementById('email').value = email;
    document.getElementById('password').value = password;
    
    authenticateUser(email, password);
}

/**
 * Handle successful login
 * @param {string} role - User role (student or admin)
 */
function loginSuccess(role) {
    // Store user session (in a real app, this would be a JWT token)
    localStorage.setItem('userRole', role);
    localStorage.setItem('isLoggedIn', 'true');
    
    // Redirect to the appropriate dashboard
    if (role === 'admin') {
        window.location.href = 'admin-dashboard.html';
    } else {
        window.location.href = 'student-dashboard.html';
    }
}

/**
 * Display error message to the user
 * @param {string} message - The error message to display
 */
function showError(message) {
    const errorElement = document.getElementById('login-error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    } else {
        alert(message); // Fallback to alert if error element not found
    }
}

/**
 * Show loading state
 */
function showLoading() {
    const submitBtn = document.querySelector('#login-form button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';
    }
}

/**
 * Hide loading state
 */
function hideLoading() {
    const submitBtn = document.querySelector('#login-form button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Sign In';
    }
}

/**
 * Logout function - can be called from other pages
 */
function logout() {
    localStorage.removeItem('userRole');
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'login.html';
}

// Check if user is logged in (can be used on protected pages)
function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
        window.location.href = 'login.html';
    }
} 