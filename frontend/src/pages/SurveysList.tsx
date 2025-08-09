import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Survey = {
  id: string;
  title: string;
  isAnonymous: boolean;
  isPublished: boolean;
  isCompleted?: boolean;
  createdAt: string;
};

export default function SurveysList(){
  const [items, setItems] = useState<Survey[]>([]);
  const [myMap, setMyMap] = useState<Record<string, { exists: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(()=>{
    (async()=>{
      try{
        const res = await api.get('/api/surveys');
        const list = res.data.items || [];
        setItems(list);
        // If student, fetch my-response for identified surveys
        if (user?.role === 'STUDENT'){
          const entries = await Promise.all(list.filter((s: Survey)=> !s.isAnonymous).map(async (s: Survey) => {
            try{
              const mr = await api.get(`/api/surveys/${s.id}/my-response`);
              return [s.id, { exists: !!mr.data?.exists } as const] as const;
            }catch{ return [s.id, { exists: false } as const] as const; }
          }));
          setMyMap(Object.fromEntries(entries));
        }
      }catch(err:any){
        setError(err?.response?.data?.error || 'Failed to load surveys');
      }finally{ setLoading(false); }
    })();
  },[user]);

  const togglePublish = async (id: string, next: boolean) => {
    try {
      await api.post(`/api/surveys/${id}/publish`, { isPublished: next });
      setItems(prev => prev.map(s => s.id===id? { ...s, isPublished: next } : s));
    } catch(err:any){
      alert(err?.response?.data?.error || 'Failed to update publish state');
    }
  };

  const toggleComplete = async (id: string, next: boolean) => {
    try {
      await api.post(`/api/surveys/${id}/complete`, { isCompleted: next });
      setItems(prev => prev.map(s => s.id===id? { ...s, isCompleted: next } : s));
    } catch(err:any){
      alert(err?.response?.data?.error || 'Failed to update completion state');
    }
  };

  const deleteSurvey = async (id: string) => {
    if (!confirm('Delete this survey? This will remove all its responses.')) return;
    try {
      await api.delete(`/api/surveys/${id}`);
      setItems(prev => prev.filter(s=> s.id!==id));
    } catch(err:any){
      alert(err?.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass card flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Surveys</h2>
        {(user?.role === 'FACULTY' || user?.role === 'ADMIN') && (
          <Link to="/surveys/new" className="btn btn-primary">New Survey</Link>
        )}
      </div>
      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}
  <ul className="space-y-3 glass-list">
        {items.map(s=> (
      <li key={s.id} className="glass card flex items-center justify-between transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-xl">
            <div>
              <div className="font-medium">{s.title}</div>
              <div className="text-sm opacity-70">{new Date(s.createdAt).toLocaleString()} • {s.isAnonymous? 'Anonymous' : 'Identified'} • {s.isPublished? 'Published' : 'Draft'} {s.isCompleted? '• Completed' : ''}</div>
            </div>
            <div className="text-sm flex items-center gap-2">
              <Link to={`/surveys/${s.id}`} className="btn btn-ghost">Open</Link>
              {user?.role==='STUDENT' && s.isPublished && !s.isCompleted && !s.isAnonymous && myMap[s.id]?.exists && (
                <Link to={`/surveys/${s.id}`} className="btn btn-ghost">Edit</Link>
              )}
              {(user?.role==='FACULTY' || user?.role==='ADMIN') && (
                <>
                  {s.isPublished ? (
                    <button className="btn btn-ghost" onClick={()=>togglePublish(s.id, false)}>Unpublish</button>
                  ) : (
                    <button className="btn btn-primary" onClick={()=>togglePublish(s.id, true)}>Publish</button>
                  )}
                  {s.isCompleted ? (
                    <button className="btn btn-ghost" onClick={()=>toggleComplete(s.id, false)}>Reopen</button>
                  ) : (
                    <button className="btn btn-ghost" onClick={()=>toggleComplete(s.id, true)}>Complete</button>
                  )}
                  <button className="btn btn-ghost" onClick={()=>deleteSurvey(s.id)}>Delete</button>
                </>
              )}
            </div>
          </li>
        ))}
        {!loading && items.length===0 && (
          <li className="glass card text-sm opacity-80">No surveys yet.</li>
        )}
      </ul>
    </div>
  );
}
