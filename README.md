# College Feedback System

A PGDCA Final Year Project that enables students to provide feedback to college administration in various categories and allows administrators to view and respond to feedback.

## Project Overview

The College Feedback System is a web-based application designed to streamline the feedback collection process in educational institutions. The system provides:

- **Student Portal**: Submit feedback in three categories: Academic, Infrastructure, and Administrative
- **Admin Dashboard**: View, manage, and resolve student feedback
- **Authentication**: Simple login for students and administrators
- **Responsive Design**: Works on desktops, tablets, and mobile devices

## Features

### For Students
- Register and login securely
- Submit feedback in three categories
- Optionally upload photos with feedback
- View submitted feedback and track status
- Add comments to existing feedback

### For Administrators
- Secure admin login
- Dashboard with feedback statistics
- View and respond to assigned feedback
- Mark feedback as resolved
- Communicate with students through comments

## Technology Stack

- **Frontend**:
  - HTML5, CSS3
  - Bootstrap 5 for responsive design
  - Font Awesome for icons

- **Backend**:
  - Django 4.2 (Python web framework)
  - SQLite database 

## Project Structure

```
college_feedback_system/
├── templates/            # Django HTML templates
│   ├── accounts/         # User account templates
│   └── feedback/         # Feedback templates
├── college_feedback_system/  # Django project settings
├── accounts/             # User account app
├── feedback/             # Feedback functionality app
├── authentication/       # Authentication app
├── static/               # Static files (CSS, JS)
├── media/                # User uploaded files
└── manage.py             # Django project management
```

## How to Run the Project

### Prerequisites
- Python 3.8+ and pip
- Git (optional)

### Installation Steps
1. Clone the repository or download the project
   ```
   git clone https://github.com/yourusername/college_feedback_system.git
   cd college_feedback_system
   ```

2. Create and activate a virtual environment (optional but recommended)
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install required dependencies
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

7. Open your browser and go to `http://localhost:8000`

## Demo Credentials

### Student Login
- Email: student@example.com
- Password: student123

### Admin Login
- Email: admin@example.com
- Password: admin123

## Project Screenshots

(Screenshots would be inserted here)

## Features Implemented

1. **Authentication System**
   - Single login page for both students and admins
   - Role-based access control
   - Simple registration for students

2. **Feedback Management**
   - Three feedback categories: Academic, Infrastructure, Administrative
   - Optional photo upload with feedback
   - Status tracking: Pending/Resolved

3. **Admin Features**
   - View assigned feedback
   - Mark feedback as resolved
   - Admin-specific dashboard

4. **Student Features**
   - Submit new feedback
   - View submitted feedback
   - Track feedback status

---

© 2023 College Feedback System - PGDCA Final Year Project