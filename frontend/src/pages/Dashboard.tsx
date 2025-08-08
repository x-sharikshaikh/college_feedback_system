import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function Dashboard(){
  const { user, logout } = useAuth();
  const [cards, setCards] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(()=>{
    (async()=>{
      try{
        const res = await api.get('/api/dashboard/summary');
        setCards(res.data.cards);
      }catch(e:any){ setError(e?.response?.data?.error || 'Failed to load summary'); }
    })();
  },[]);

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-6 space-y-6">
      <div className="glass card flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          {user && <p className="text-sm opacity-80">Welcome, <b>{user.name}</b> ({user.role})</p>}
        </div>
        {user && <button onClick={logout} className="btn btn-ghost">Logout</button>}
      </div>
      {error && <p className="text-red-600">{error}</p>}
      {cards && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(cards).map(([k,v]) => (
            <div key={k} className="glass card transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-xl">
              <div className="text-sm opacity-70">{k}</div>
              <div className="mt-1 text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-pink-400">{String(v)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
