// Main JS for College Feedback System

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userRole = localStorage.getItem('userRole');
    
    // Update navigation based on login status
    updateNavigation(isLoggedIn, userRole);
    
    // Add logout functionality
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
});

/**
 * Update navigation UI based on login status
 * @param {boolean} isLoggedIn - Whether user is logged in
 * @param {string} userRole - User role (student or admin)
 */
function updateNavigation(isLoggedIn, userRole) {
    const loginLink = document.getElementById('login-link');
    const logoutLink = document.getElementById('logout-link');
    const dashboardLink = document.getElementById('dashboard-link');
    
    if (isLoggedIn) {
        // Show logout link
        if (loginLink) loginLink.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'block';
        
        // Show dashboard link with correct path
        if (dashboardLink) {
            dashboardLink.style.display = 'block';
            dashboardLink.href = userRole === 'admin' ? 'admin-dashboard.html' : 'student-dashboard.html';
        }
    } else {
        // Show login link
        if (loginLink) loginLink.style.display = 'block';
        if (logoutLink) logoutLink.style.display = 'none';
        if (dashboardLink) dashboardLink.style.display = 'none';
    }
}

/**
 * Logout function (if not already defined in auth.js)
 */
if (typeof logout !== 'function') {
    function logout() {
        localStorage.removeItem('userRole');
        localStorage.removeItem('isLoggedIn');
        window.location.href = 'login.html';
    }
} 