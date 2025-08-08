import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function Register(){
  const { register, loading } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'STUDENT'|'FACULTY'|'ADMIN'>('STUDENT');
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent)=>{
    e.preventDefault();
    setError('');
    try{ await register({ name, email, password, role }); nav('/'); }catch(err:any){ setError(err?.response?.data?.error || 'Register failed'); }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">Register</h2>
      {error && <p className="text-red-600 mb-2">{error}</p>}
      <form onSubmit={onSubmit} className="space-y-4">
        <input className="w-full border p-2" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
        <input className="w-full border p-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" className="w-full border p-2" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        <select className="w-full border p-2" value={role} onChange={e=>setRole(e.target.value as any)}>
          <option value="STUDENT">Student</option>
          <option value="FACULTY">Faculty</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button disabled={loading} className="bg-blue-600 text-white px-4 py-2">{loading? '...' : 'Register'}</button>
      </form>
      <p className="mt-3 text-sm">Have an account? <Link to="/login" className="text-blue-700">Login</Link></p>
    </div>
  );
}
