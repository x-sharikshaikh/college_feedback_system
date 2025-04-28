import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminDashboard = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  useEffect(() => {
    // Redirect if not logged in or not an admin
    if (!user || !user.token || user.user_type !== 'admin') {
      navigate('/login');
      return;
    }
    
    // Fetch admin's assigned feedbacks
    const fetchFeedbacks = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/feedbacks/admin/', {
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
  
  const handleResolveFeedback = async (feedbackId) => {
    try {
      await axios.put(`http://localhost:8000/api/feedbacks/${feedbackId}/resolve/`, {}, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      
      // Update local state
      setFeedbacks(prevFeedbacks => 
        prevFeedbacks.map(feedback => 
          feedback.id === feedbackId 
            ? { ...feedback, status: 'resolved', resolved_at: new Date().toISOString() } 
            : feedback
        )
      );
    } catch (err) {
      setError('Failed to resolve feedback. Please try again.');
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };
  
  return (
    <div className="container-fluid">
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <Link className="navbar-brand" to="/admin/dashboard">College Feedback System (Admin)</Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <span className="nav-link">
                  Welcome, {user.first_name || 'Admin'}
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
          <div className="col-12">
            <h2>Assigned Feedbacks</h2>
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
                No feedbacks assigned to you at the moment.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Student</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbacks.map((feedback) => (
                      <tr key={feedback.id}>
                        <td>{feedback.title}</td>
                        <td>{feedback.category}</td>
                        <td>{feedback.description.substring(0, 50)}...</td>
                        <td>{feedback.student_name}</td>
                        <td>{new Date(feedback.created_at).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${feedback.status === 'resolved' ? 'bg-success' : 'bg-warning'}`}>
                            {feedback.status}
                          </span>
                        </td>
                        <td>
                          {feedback.status === 'pending' && (
                            <button 
                              className="btn btn-sm btn-success"
                              onClick={() => handleResolveFeedback(feedback.id)}
                            >
                              Mark as Resolved
                            </button>
                          )}
                          {feedback.status === 'resolved' && (
                            <span className="text-muted">
                              <small>Resolved on: {new Date(feedback.resolved_at).toLocaleDateString()}</small>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard; 