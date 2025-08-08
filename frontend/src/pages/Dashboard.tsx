import React, { useEffect, useState } from 'react';
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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        {user && <button onClick={logout} className="bg-gray-800 text-white px-3 py-1">Logout</button>}
      </div>
      {user && <p>Welcome, <b>{user.name}</b> ({user.role})</p>}
      {error && <p className="text-red-600">{error}</p>}
      {cards && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(cards).map(([k,v]) => (
            <div key={k} className="border rounded p-4 bg-white shadow-sm">
              <div className="text-sm text-gray-600">{k}</div>
              <div className="text-2xl font-semibold">{String(v)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
