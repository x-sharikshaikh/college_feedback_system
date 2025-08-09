import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import './styles.css'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
const Login = React.lazy(() => import('./pages/Login'))
const Register = React.lazy(() => import('./pages/Register'))
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const SurveysList = React.lazy(() => import('./pages/SurveysList'))
const SurveyCreate = React.lazy(() => import('./pages/SurveyCreate'))
import { useAuth } from './context/AuthContext'
const SurveyDetail = React.lazy(() => import('./pages/SurveyDetail'))
import { ThemeToggle } from './components/ThemeToggle'
const AdminUsers = React.lazy(() => import('./pages/AdminUsers'))

function Shell({ children }: { children: React.ReactNode }){
  const { user } = useAuth();
  // Preloaders for lazy routes
function ApiStatusBanner(){
  const [ok, setOk] = React.useState<boolean | null>(null)
  const [last, setLast] = React.useState<string>('')
  React.useEffect(()=>{
    let closed = false
    const ping = async ()=>{
      try{
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/health`)
        if (!closed) { setOk(res.ok); setLast(new Date().toLocaleTimeString()) }
      }catch{
        if (!closed) { setOk(false); setLast(new Date().toLocaleTimeString()) }
      }
    }
    ping();
    const id = setInterval(ping, 15000)
    return ()=>{ closed = true; clearInterval(id) }
  },[])
  if (ok === null || ok) return null
  return (
    <div className="w-full bg-red-600/90 text-white text-sm text-center py-1">
      API unreachable at {import.meta.env.VITE_API_URL || 'http://localhost:4000'} (last check {last}).
      Check that the backend is running and VITE_API_URL matches.
    </div>
  )
}
  const preloadDashboard = () => import('./pages/Dashboard');
  const preloadSurveys = () => import('./pages/SurveysList');
  const preloadSurveyCreate = () => import('./pages/SurveyCreate');

  // Idle prefetch commonly visited pages after auth
  React.useEffect(() => {
    const idle = (cb: () => void) => {
  // Feature-detect requestIdleCallback with a safe fallback without ts-directives
  const w = window as unknown as { requestIdleCallback?: (fn: () => void) => number };
  const ric = w.requestIdleCallback?.bind(window) ?? ((fn: () => void) => window.setTimeout(fn, 300));
  ric(cb);
    };
    if (user) {
      idle(preloadDashboard);
      idle(preloadSurveys);
      if (user.role === 'FACULTY' || user.role === 'ADMIN') idle(preloadSurveyCreate);
    }
  }, [user]);
  return (
    <div className="min-h-screen hero-bg">
      <header className="sticky top-0 z-40 mx-4 mt-4 glass card flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          <Link to="/" className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-400">College Feedback</Link>
        </h1>
  <nav className="flex items-center gap-2 text-sm">
          <Link to="/" className="btn-ghost" onMouseEnter={preloadDashboard} onFocus={preloadDashboard}>Home</Link>
          <Link to="/surveys" className="btn-ghost" onMouseEnter={preloadSurveys} onFocus={preloadSurveys}>Surveys</Link>
          {(user?.role==='FACULTY' || user?.role==='ADMIN') && (
            <Link to="/surveys/new" className="btn-ghost" onMouseEnter={preloadSurveyCreate} onFocus={preloadSurveyCreate}>New Survey</Link>
          )}
          {user?.role==='ADMIN' && (
            <Link to="/admin/users" className="btn-ghost">Users</Link>
          )}
          {!user && <Link to="/login" className="btn-ghost">Login</Link>}
          {!user && <Link to="/register" className="btn-ghost">Register</Link>}
          <ThemeToggle />
        </nav>
      </header>
  <ApiStatusBanner />
      <main className="p-6 max-w-6xl mx-auto space-y-6">{children}</main>
      <div className="pb-8" />
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Shell>
          <Routes>
            <Route path="/login" element={<Suspense fallback={<div className="glass card">Loading…</div>}><Login /></Suspense>} />
            <Route path="/register" element={<Suspense fallback={<div className="glass card">Loading…</div>}><Register /></Suspense>} />
            <Route path="/" element={<ProtectedRoute><Suspense fallback={<div className="glass card">Loading…</div>}><Dashboard /></Suspense></ProtectedRoute>} />
            <Route path="/surveys" element={<ProtectedRoute><Suspense fallback={<div className="glass card">Loading…</div>}><SurveysList /></Suspense></ProtectedRoute>} />
            <Route path="/surveys/new" element={<ProtectedRoute allow={['FACULTY','ADMIN']}><Suspense fallback={<div className="glass card">Loading…</div>}><SurveyCreate /></Suspense></ProtectedRoute>} />
            <Route path="/surveys/:id" element={<ProtectedRoute><Suspense fallback={<div className="glass card">Loading…</div>}><SurveyDetail /></Suspense></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allow={['ADMIN']}><Suspense fallback={<div className="glass card">Loading…</div>}><AdminUsers /></Suspense></ProtectedRoute>} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
)
