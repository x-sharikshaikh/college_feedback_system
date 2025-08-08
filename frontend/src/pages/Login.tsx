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
    <div className="max-w-md mx-auto p-4 sm:p-6">
      <div className="glass card">
        <h2 className="text-2xl font-semibold mb-4">Login</h2>
  {error && <p className="text-red-600 mb-2" role="alert" aria-live="polite">{error}</p>}
        <form onSubmit={onSubmit} className="space-y-4">
          <input className="w-full rounded-lg border border-white/40 bg-white/60 dark:bg-white/10 px-3 py-2 outline-none" placeholder="Email" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setEmail(e.target.value)} />
          <input type="password" className="w-full rounded-lg border border-white/40 bg-white/60 dark:bg-white/10 px-3 py-2 outline-none" placeholder="Password" value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setPassword(e.target.value)} />
          <button disabled={loading} className="btn btn-primary w-full">{loading? '...' : 'Login'}</button>
        </form>
        <p className="mt-3 text-sm">No account? <Link to="/register" className="underline">Register</Link></p>
      </div>
    </div>
  );
}
