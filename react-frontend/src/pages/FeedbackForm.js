import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const FeedbackForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'academic',
    photo: null
  });
  
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  
  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  useEffect(() => {
    // Redirect if not logged in or not a student
    if (!user || !user.token || user.user_type !== 'student') {
      navigate('/login');
    }
  }, [navigate, user]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size should not exceed 10MB');
        return;
      }
      
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setError('Only JPG, PNG, and GIF images are allowed');
        return;
      }
      
      setFormData({
        ...formData,
        photo: file
      });
      
      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      setError('');
    }
  };
  
  const handleRemovePhoto = () => {
    setFormData({
      ...formData,
      photo: null
    });
    setPhotoPreview('');
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    // Create a FormData object for file upload
    const formDataObj = new FormData();
    formDataObj.append('title', formData.title);
    formDataObj.append('description', formData.description);
    formDataObj.append('category', formData.category);
    if (formData.photo) {
      formDataObj.append('photo', formData.photo);
    }
    
    try {
      await axios.post('http://localhost:8000/api/feedbacks/', formDataObj, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setSuccess('Feedback submitted successfully!');
      setLoading(false);
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/student/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit feedback. Please try again.');
      setLoading(false);
    }
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
                <Link className="nav-link" to="/student/dashboard">Dashboard</Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      
      <div className="container mt-4">
        <div className="row">
          <div className="col-md-8 mx-auto">
            <div className="card">
              <div className="card-header bg-primary text-white">
                <h4 className="mb-0">Submit Feedback</h4>
              </div>
              <div className="card-body">
                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="alert alert-success" role="alert">
                    {success}
                  </div>
                )}
                
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="title" className="form-label">Title</label>
                    <input
                      type="text"
                      className="form-control"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="category" className="form-label">Category</label>
                    <select
                      className="form-select"
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      required
                    >
                      <option value="academic">Academic</option>
                      <option value="infrastructure">Infrastructure</option>
                      <option value="administrative">Administrative</option>
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="description" className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      id="description"
                      name="description"
                      rows="5"
                      value={formData.description}
                      onChange={handleChange}
                      required
                    ></textarea>
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="photo" className="form-label">Photo (Optional)</label>
                    <input
                      type="file"
                      className="form-control"
                      id="photo"
                      name="photo"
                      accept="image/*"
                      onChange={handlePhotoChange}
                    />
                    <small className="text-muted">Max size: 10MB. Formats: JPG, PNG, GIF</small>
                  </div>
                  
                  {photoPreview && (
                    <div className="mb-3">
                      <div className="d-flex align-items-center">
                        <img 
                          src={photoPreview} 
                          alt="Preview" 
                          className="img-thumbnail" 
                          style={{ maxHeight: '200px', maxWidth: '100%' }} 
                        />
                        <button 
                          type="button"
                          className="btn btn-sm btn-danger ms-2"
                          onClick={handleRemovePhoto}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="d-grid gap-2">
                    <button
                      type="submit"
                      className="btn btn-success"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Submitting...
                        </>
                      ) : 'Submit Feedback'}
                    </button>
                    <Link to="/student/dashboard" className="btn btn-secondary">Cancel</Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackForm; 