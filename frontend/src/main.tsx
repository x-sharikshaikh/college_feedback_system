import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="p-4 shadow bg-white"><h1 className="text-xl font-semibold">College Feedback</h1></header>
      <main className="p-6">
        <p>Welcome! Frontend is up. Connect to API at {import.meta.env.VITE_API_URL || 'http://localhost:4000'}</p>
      </main>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
