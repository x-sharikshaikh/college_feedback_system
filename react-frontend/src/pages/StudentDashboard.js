import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const StudentDashboard = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  useEffect(() => {
    // Redirect if not logged in or not a student
    if (!user || !user.token || user.user_type !== 'student') {
      navigate('/login');
      return;
    }
    
    // Fetch student's feedbacks
    const fetchFeedbacks = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/feedbacks/student/', {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
        setFeedbacks(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load feedbacks. Please try again later.');
        setLoading(false);
        if (err.response?.status === 401) {
          // Unauthorized, redirect to login
          localStorage.removeItem('user');
          navigate('/login');
        }
      }
    };
    
    fetchFeedbacks();
  }, [navigate, user]);
  
  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };
  
  return (
    <div className="container-fluid">
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <Link className="navbar-brand" to="/student/dashboard">College Feedback System</Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <span className="nav-link">
                  Welcome, {user.first_name || 'Student'}
                </span>
              </li>
              <li className="nav-item">
                <button className="nav-link btn btn-link" onClick={handleLogout}>Logout</button>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      
      <div className="container mt-4">
        <div className="row mb-4">
          <div className="col-md-6">
            <h2>My Feedbacks</h2>
          </div>
          <div className="col-md-6 text-end">
            <Link to="/student/feedback/new" className="btn btn-success">
              <i className="bi bi-plus-circle"></i> Submit New Feedback
            </Link>
          </div>
        </div>
        
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="text-center my-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <>
            {feedbacks.length === 0 ? (
              <div className="alert alert-info" role="alert">
                You haven't submitted any feedback yet. Click on "Submit New Feedback" to get started.
              </div>
            ) : (
              <div className="row">
                {feedbacks.map((feedback) => (
                  <div className="col-md-6 mb-4" key={feedback.id}>
                    <div className="card h-100">
                      <div className="card-header d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">{feedback.title}</h5>
                        <span className={`badge ${feedback.status === 'resolved' ? 'bg-success' : 'bg-warning'}`}>
                          {feedback.status}
                        </span>
                      </div>
                      <div className="card-body">
                        <p className="card-text">{feedback.description}</p>
                        <p className="text-muted">
                          <small>Category: {feedback.category}</small>
                        </p>
                        {feedback.photo && (
                          <div className="mt-2">
                            <img 
                              src={`http://localhost:8000${feedback.photo}`} 
                              alt="Feedback attachment" 
                              className="img-thumbnail" 
                              style={{ maxHeight: '150px' }} 
                            />
                          </div>
                        )}
                      </div>
                      <div className="card-footer text-muted">
                        <small>Submitted on: {new Date(feedback.created_at).toLocaleDateString()}</small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard; 