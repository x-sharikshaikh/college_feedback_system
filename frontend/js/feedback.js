// Feedback Module for College Feedback System

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (typeof checkAuth === 'function') {
        checkAuth();
    }
    
    // Initialize feedback form handlers
    const feedbackForm = document.getElementById('feedback-form');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', handleFeedbackSubmission);
    }
    
    // Initialize rating stars functionality
    initializeRatingStars();
    
    // Load feedback data if on admin dashboard
    if (document.getElementById('feedback-list-container')) {
        loadFeedbackData();
    }
});

/**
 * Initialize the star rating functionality
 */
function initializeRatingStars() {
    const ratingContainers = document.querySelectorAll('.rating-container');
    
    ratingContainers.forEach(container => {
        const stars = container.querySelectorAll('.star');
        const ratingInput = container.querySelector('input[type="hidden"]');
        
        stars.forEach((star, index) => {
            // Add hover effect
            star.addEventListener('mouseover', () => {
                for (let i = 0; i <= index; i++) {
                    stars[i].classList.add('hover');
                }
            });
            
            star.addEventListener('mouseout', () => {
                stars.forEach(s => s.classList.remove('hover'));
            });
            
            // Add click event to set rating
            star.addEventListener('click', () => {
                const rating = index + 1;
                ratingInput.value = rating;
                
                // Update visual state of stars
                stars.forEach((s, i) => {
                    if (i < rating) {
                        s.classList.add('selected');
                    } else {
                        s.classList.remove('selected');
                    }
                });
            });
        });
    });
}

/**
 * Handle feedback form submission
 * @param {Event} e - Form submission event
 */
function handleFeedbackSubmission(e) {
    e.preventDefault();
    
    // Collect form data
    const form = e.target;
    const courseId = form.querySelector('[name="course_id"]').value;
    const teacherId = form.querySelector('[name="teacher_id"]').value;
    const teachingRating = form.querySelector('[name="teaching_rating"]').value;
    const contentRating = form.querySelector('[name="content_rating"]').value;
    const supportRating = form.querySelector('[name="support_rating"]').value;
    const comments = form.querySelector('[name="comments"]').value;
    
    // Validate form data
    if (!validateFeedbackForm(teachingRating, contentRating, supportRating)) {
        return;
    }
    
    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';
    
    // Prepare feedback data
    const feedbackData = {
        courseId,
        teacherId,
        ratings: {
            teaching: parseInt(teachingRating),
            content: parseInt(contentRating),
            support: parseInt(supportRating)
        },
        comments,
        studentId: getCurrentUserId(),
        submittedAt: new Date().toISOString()
    };
    
    // Submit feedback (in a real app, this would be an API call)
    setTimeout(() => {
        // Simulate successful submission
        saveFeedback(feedbackData);
        
        // Reset form and show success message
        form.reset();
        showFeedbackMessage('success', 'Thank you! Your feedback has been submitted.');
        
        // Reset stars
        form.querySelectorAll('.star').forEach(star => {
            star.classList.remove('selected');
        });
        
        // Reset button state
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit Feedback';
    }, 1500);
}

/**
 * Validate the feedback form data
 * @param {string} teachingRating - Teaching rating value
 * @param {string} contentRating - Content rating value
 * @param {string} supportRating - Support rating value
 * @returns {boolean} - True if form is valid
 */
function validateFeedbackForm(teachingRating, contentRating, supportRating) {
    if (!teachingRating || !contentRating || !supportRating) {
        showFeedbackMessage('error', 'Please provide all ratings before submitting');
        return false;
    }
    
    return true;
}

/**
 * Display a message to the user after feedback submission
 * @param {string} type - Message type (success or error)
 * @param {string} message - Message content
 */
function showFeedbackMessage(type, message) {
    const messageContainer = document.getElementById('feedback-message');
    if (!messageContainer) return;
    
    messageContainer.textContent = message;
    messageContainer.className = `alert alert-${type === 'success' ? 'success' : 'danger'}`;
    messageContainer.style.display = 'block';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        messageContainer.style.display = 'none';
    }, 5000);
}

/**
 * Get current user ID from session
 * @returns {string} - User ID
 */
function getCurrentUserId() {
    // In a real app, this would come from the authentication system
    return 'student_001';
}

/**
 * Save feedback to local storage (simulating a database)
 * @param {Object} feedback - Feedback data object
 */
function saveFeedback(feedback) {
    // In a real application, this would be an API call to your backend
    // For this demo, we'll store it in localStorage
    
    let feedbackData = JSON.parse(localStorage.getItem('feedbackData')) || [];
    feedback.id = generateUniqueId();
    feedbackData.push(feedback);
    localStorage.setItem('feedbackData', JSON.stringify(feedbackData));
}

/**
 * Generate a unique ID for the feedback
 * @returns {string} - Unique ID
 */
function generateUniqueId() {
    return 'feedback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Load feedback data for admin dashboard
 */
function loadFeedbackData() {
    // In a real application, this would be an API call to your backend
    // For this demo, we'll retrieve it from localStorage
    
    const feedbackData = JSON.parse(localStorage.getItem('feedbackData')) || [];
    const container = document.getElementById('feedback-list-container');
    
    if (feedbackData.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No feedback submissions yet.</div>';
        return;
    }
    
    // Render feedback items
    const feedbackList = document.createElement('div');
    feedbackList.className = 'feedback-list';
    
    feedbackData.forEach(feedback => {
        const feedbackItem = createFeedbackItem(feedback);
        feedbackList.appendChild(feedbackItem);
    });
    
    container.innerHTML = '';
    container.appendChild(feedbackList);
    
    // Initialize feedback analytics
    initializeFeedbackAnalytics(feedbackData);
}

/**
 * Create a feedback item element
 * @param {Object} feedback - Feedback data object
 * @returns {HTMLElement} - Feedback item element
 */
function createFeedbackItem(feedback) {
    const item = document.createElement('div');
    item.className = 'card feedback-item mb-3';
    
    const averageRating = (feedback.ratings.teaching + feedback.ratings.content + feedback.ratings.support) / 3;
    
    item.innerHTML = `
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
                <h5 class="card-title">Course Feedback</h5>
                <span class="badge bg-primary">${averageRating.toFixed(1)} / 5</span>
            </div>
            <h6 class="card-subtitle mb-2 text-muted">Submitted on ${new Date(feedback.submittedAt).toLocaleDateString()}</h6>
            <div class="ratings-summary my-3">
                <div><strong>Teaching:</strong> ${getRatingStars(feedback.ratings.teaching)}</div>
                <div><strong>Content:</strong> ${getRatingStars(feedback.ratings.content)}</div>
                <div><strong>Support:</strong> ${getRatingStars(feedback.ratings.support)}</div>
            </div>
            ${feedback.comments ? `<p class="card-text">${feedback.comments}</p>` : ''}
        </div>
    `;
    
    return item;
}

/**
 * Generate HTML for rating stars
 * @param {number} rating - Rating value
 * @returns {string} - HTML string for rating stars
 */
function getRatingStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star text-warning"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
}

/**
 * Initialize feedback analytics charts
 * @param {Array} feedbackData - Array of feedback objects
 */
function initializeFeedbackAnalytics(feedbackData) {
    const analyticsContainer = document.getElementById('feedback-analytics');
    if (!analyticsContainer) return;
    
    // Calculate average ratings
    let teachingSum = 0;
    let contentSum = 0;
    let supportSum = 0;
    
    feedbackData.forEach(feedback => {
        teachingSum += feedback.ratings.teaching;
        contentSum += feedback.ratings.content;
        supportSum += feedback.ratings.support;
    });
    
    const count = feedbackData.length;
    const teachingAvg = (teachingSum / count).toFixed(1);
    const contentAvg = (contentSum / count).toFixed(1);
    const supportAvg = (supportSum / count).toFixed(1);
    const overallAvg = ((teachingSum + contentSum + supportSum) / (count * 3)).toFixed(1);
    
    // Create analytics summary
    analyticsContainer.innerHTML = `
        <div class="analytics-summary">
            <div class="row">
                <div class="col-md-3">
                    <div class="card analytics-card">
                        <div class="card-body text-center">
                            <h3>${overallAvg}</h3>
                            <p>Overall Rating</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card analytics-card">
                        <div class="card-body text-center">
                            <h3>${teachingAvg}</h3>
                            <p>Teaching Quality</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card analytics-card">
                        <div class="card-body text-center">
                            <h3>${contentAvg}</h3>
                            <p>Course Content</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card analytics-card">
                        <div class="card-body text-center">
                            <h3>${supportAvg}</h3>
                            <p>Student Support</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // In a real application, we'd add charts here using a library like Chart.js
} 