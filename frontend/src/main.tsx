import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import './styles.css'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import SurveysList from './pages/SurveysList'
import SurveyCreate from './pages/SurveyCreate'
import { useAuth } from './context/AuthContext'
import SurveyDetail from './pages/SurveyDetail'

function Shell({ children }: { children: React.ReactNode }){
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="p-4 shadow bg-white flex items-center justify-between">
        <h1 className="text-xl font-semibold"><Link to="/">College Feedback</Link></h1>
        <nav className="space-x-4 text-sm">
          <Link to="/">Home</Link>
          <Link to="/surveys">Surveys</Link>
          {(user?.role==='FACULTY' || user?.role==='ADMIN') && (<Link to="/surveys/new">New Survey</Link>)}
          {!user && <Link to="/login">Login</Link>}
          {!user && <Link to="/register">Register</Link>}
        </nav>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Shell>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/surveys" element={<ProtectedRoute><SurveysList /></ProtectedRoute>} />
            <Route path="/surveys/new" element={<ProtectedRoute allow={['FACULTY','ADMIN']}><SurveyCreate /></ProtectedRoute>} />
            <Route path="/surveys/:id" element={<ProtectedRoute><SurveyDetail /></ProtectedRoute>} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
)
