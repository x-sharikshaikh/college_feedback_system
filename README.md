# College Feedback System

A comprehensive web-based application designed to facilitate communication between students and college administration through a structured feedback system.

## Project Overview

The College Feedback System enables educational institutions to digitize and streamline their feedback collection process. The system provides:

- **Student Portal**: Submit feedback in multiple categories: Academic, Infrastructure, Administrative, and Other
- **Admin Dashboard**: View, manage, and resolve student feedback with detailed analytics
- **Authentication**: Secure email-based authentication for students and administrators
- **Real-time Notifications**: Keep users informed about feedback status changes
- **Responsive Design**: Works seamlessly across all devices

## Features

### For Students
- Register and login securely using email
- Submit detailed feedback with optional photo attachments
- View submitted feedback and track status in real-time
- Add comments to existing feedback threads
- Receive notifications about feedback updates

### For Administrators
- Secure admin login with role-based access control
- Comprehensive dashboard with feedback statistics and analytics
- View, assign, and respond to student feedback
- Mark feedback as resolved with detailed history tracking
- Communicate with students through threaded comments

## Technology Stack

- **Frontend**:
  - React 19.1 with React Router 7.5
  - Bootstrap 5.3 for responsive design
  - Axios for API communication
  - HTML5, CSS3, JavaScript

- **Backend**:
  - Django 4.2.7 (Python web framework)
  - Django REST Framework 3.14 for API endpoints
  - JWT Authentication with Simple JWT 5.3.1
  - SQLite database (development)

## Project Structure

```
college_feedback_system/
├── accounts/                # User account management app
├── authentication/          # Authentication app with JWT support
├── college_feedback_system/ # Django project settings
├── feedback/                # Core feedback functionality app
├── media/                   # User uploaded files
├── react-frontend/          # React frontend application
│   ├── public/              # Static public assets
│   └── src/                 # React source code
├── static/                  # Static files (CSS, JS)
├── staticfiles/             # Collected static files
├── templates/               # Django HTML templates
├── .venv/, venv/            # Virtual environment directories
├── manage.py                # Django project management
└── requirements.txt         # Python dependencies
```

## How to Run the Project

### Prerequisites
- Python 3.8+ and pip
- Node.js 14+ and npm
- Git (optional)

### Backend Setup
1. Clone the repository or download the project
   ```
   git clone https://github.com/yourusername/college_feedback_system.git
   cd college_feedback_system
   ```

2. Create and activate a virtual environment
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install required Python dependencies
   ```
   pip install -r requirements.txt
   ```

4. Run migrations to create the database
   ```
   python manage.py migrate
   ```

5. Create an admin user
   ```
   python manage.py createsuperuser
   ```

6. Start the Django development server
   ```
   python manage.py runserver
   ```

### Frontend Setup (React)
1. Navigate to the React frontend directory
   ```
   cd react-frontend
   ```

2. Install Node.js dependencies
   ```
   npm install
   ```

3. Start the React development server
   ```
   npm start
   ```

4. Open your browser and go to `http://localhost:3000` for the React frontend
   (The Django backend will be running at `http://localhost:8000`)

## API Endpoints

The system provides a RESTful API for frontend communication:

- `/api/auth/` - Authentication endpoints
- `/api/feedback/` - Feedback management
- `/api/accounts/` - User account management

## Demo Credentials

### Student Login
- Email: student@example.com
- Password: student123

### Admin Login
- Email: admin@example.com
- Password: admin123

## Project Screenshots

(Screenshots would be inserted here)

## Key Project Components

1. **User Management System**
   - Custom User model with email-based authentication
   - Role-based access control (Students and Admins)
   - JWT authentication for secure API access

2. **Feedback System**
   - Multiple feedback categories with customizable fields
   - File upload capability for supporting evidence
   - Status tracking with full change history
   - Comment threads for ongoing communication

3. **Notification System**
   - Real-time notifications for feedback updates
   - Email notifications for important events
   - Dashboard alerts for administrators

4. **Analytics & Reporting**
   - Feedback trend analysis
   - Resolution time tracking
   - Category-wise distribution reports

## Future Enhancements

- Mobile application for easier student access
- Advanced analytics dashboard
- Integration with college management systems
- Department-specific feedback routing

---

© 2023-2024 College Feedback System