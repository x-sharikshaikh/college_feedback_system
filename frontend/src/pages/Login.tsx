import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function Login(){
  const { login, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent)=>{
    e.preventDefault();
    setError('');
    try{ await login(email, password); nav('/'); }catch(err:any){ setError(err?.response?.data?.error || 'Login failed'); }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">Login</h2>
      {error && <p className="text-red-600 mb-2">{error}</p>}
      <form onSubmit={onSubmit} className="space-y-4">
        <input className="w-full border p-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" className="w-full border p-2" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button disabled={loading} className="bg-blue-600 text-white px-4 py-2">{loading? '...' : 'Login'}</button>
      </form>
      <p className="mt-3 text-sm">No account? <Link to="/register" className="text-blue-700">Register</Link></p>
    </div>
  );
}
