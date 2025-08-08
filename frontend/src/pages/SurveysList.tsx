import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Survey = {
  id: string;
  title: string;
  isAnonymous: boolean;
  isPublished: boolean;
  createdAt: string;
};

export default function SurveysList(){
  const [items, setItems] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(()=>{
    (async()=>{
      try{
        const res = await api.get('/api/surveys');
        setItems(res.data.items || []);
      }catch(err:any){
        setError(err?.response?.data?.error || 'Failed to load surveys');
      }finally{ setLoading(false); }
    })();
  },[]);

  const togglePublish = async (id: string, next: boolean) => {
    try {
      await api.post(`/api/surveys/${id}/publish`, { isPublished: next });
      setItems(prev => prev.map(s => s.id===id? { ...s, isPublished: next } : s));
    } catch(err:any){
      alert(err?.response?.data?.error || 'Failed to update publish state');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Surveys</h2>
        {(user?.role === 'FACULTY' || user?.role === 'ADMIN') && (
          <Link to="/surveys/new" className="bg-blue-600 text-white px-3 py-1 rounded">New Survey</Link>
        )}
      </div>
      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}
      <ul className="divide-y">
        {items.map(s=> (
          <li key={s.id} className="py-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{s.title}</div>
              <div className="text-sm text-gray-600">{new Date(s.createdAt).toLocaleString()} • {s.isAnonymous? 'Anonymous' : 'Identified'} • {s.isPublished? 'Published' : 'Draft'}</div>
            </div>
            <div className="text-sm flex items-center gap-3">
              <Link to={`/surveys/${s.id}`} className="text-blue-700">Open</Link>
              {(user?.role==='FACULTY' || user?.role==='ADMIN') && (
                s.isPublished ? (
                  <button className="text-orange-700" onClick={()=>togglePublish(s.id, false)}>Unpublish</button>
                ) : (
                  <button className="text-green-700" onClick={()=>togglePublish(s.id, true)}>Publish</button>
                )
              )}
            </div>
          </li>
        ))}
        {!loading && items.length===0 && (
          <li className="py-3 text-gray-600">No surveys yet.</li>
        )}
      </ul>
    </div>
  );
}
