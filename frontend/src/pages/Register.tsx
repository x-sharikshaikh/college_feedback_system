import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function Register(){
  const { register, loading } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<'STUDENT'|'FACULTY'|'ADMIN'>('STUDENT');
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent)=>{
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
  try{ await register({ name, email, password, confirmPassword: confirm, role }); nav('/'); }catch(err:any){ setError(err?.response?.data?.error || 'Register failed'); }
  };

  return (
    <div className="max-w-md mx-auto p-4 sm:p-6">
      <div className="glass card">
        <h2 className="text-2xl font-semibold mb-4">Register</h2>
  {error && <p className="text-red-600 mb-2" role="alert" aria-live="polite">{error}</p>}
        <form onSubmit={onSubmit} className="space-y-4">
          <input className="w-full rounded-lg border border-white/40 bg-white/60 dark:bg-white/10 px-3 py-2 outline-none" placeholder="Name" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setName(e.target.value)} />
          <input className="w-full rounded-lg border border-white/40 bg-white/60 dark:bg-white/10 px-3 py-2 outline-none" placeholder="Email" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setEmail(e.target.value)} />
          <input type="password" className="w-full rounded-lg border border-white/40 bg-white/60 dark:bg-white/10 px-3 py-2 outline-none" placeholder="Password" value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setPassword(e.target.value)} />
          <div>
            <input type="password" className="w-full rounded-lg border border-white/40 bg-white/60 dark:bg-white/10 px-3 py-2 outline-none" placeholder="Confirm Password" value={confirm} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setConfirm(e.target.value)} aria-invalid={confirm.length>0 && password!==confirm ? true : undefined} aria-describedby={confirm.length>0 && password!==confirm ? 'pw-mismatch' : undefined} />
            {confirm.length>0 && password!==confirm && <div id="pw-mismatch" className="text-xs text-red-600 mt-1">Passwords do not match</div>}
          </div>
          <select className="w-full rounded-lg border border-white/40 bg-white/60 dark:bg-white/10 px-3 py-2 outline-none" value={role} onChange={(e: React.ChangeEvent<HTMLSelectElement>)=>setRole(e.target.value as 'STUDENT'|'FACULTY'|'ADMIN')}>
            <option value="STUDENT">Student</option>
            <option value="FACULTY">Faculty</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button disabled={loading} className="btn btn-primary w-full">{loading? '...' : 'Register'}</button>
        </form>
        <p className="mt-3 text-sm">Have an account? <Link to="/login" className="underline">Login</Link></p>
      </div>
    </div>
  );
}
