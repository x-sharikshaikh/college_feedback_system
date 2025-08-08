import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

export default function SurveyDetail(){
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [survey, setSurvey] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [analytics, setAnalytics] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const isStaff = user?.role==='FACULTY' || user?.role==='ADMIN';

  useEffect(()=>{
    (async()=>{
      try{
        const s = await api.get(`/api/surveys/${id}`);
        setSurvey(s.data.survey);
        if (isStaff){
          const params: Record<string,string> = {};
          if (startDate) params.startDate = new Date(startDate).toISOString();
          if (endDate) params.endDate = new Date(endDate).toISOString();
          const qs = new URLSearchParams(params).toString();
          const [a, r] = await Promise.all([
            api.get(`/api/surveys/${id}/analytics${qs?`?${qs}`:''}`),
            api.get(`/api/surveys/${id}/responses`),
          ]);
          setAnalytics(a.data);
          setResponses(r.data.items || []);
        }
      }catch(e:any){ setError(e?.response?.data?.error || 'Failed to load survey'); }
    })();
  },[id, isStaff, startDate, endDate]);

  const items = useMemo(()=> Array.isArray(survey?.questions?.items) ? survey.questions.items : [], [survey]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try{
      await api.post(`/api/surveys/${id}/submit`, { data: answers });
      nav('/surveys');
    }catch(err:any){ setError(err?.response?.data?.error || 'Failed to submit'); }
    finally{ setSaving(false); }
  };

  const saveEdits = async () => {
    try{
      await api.put(`/api/surveys/${id}`, { title: survey.title, isAnonymous: survey.isAnonymous, questions: survey.questions });
      alert('Saved');
    }catch(err:any){ alert(err?.response?.data?.error || 'Save failed'); }
  };

  const buildExportUrl = (ext: 'csv'|'xlsx'|'pdf') => {
    const base = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/surveys/${id}/export.${ext}`;
    const params: Record<string,string> = {};
    if (startDate) params.startDate = new Date(startDate).toISOString();
    if (endDate) params.endDate = new Date(endDate).toISOString();
    const qs = new URLSearchParams(params).toString();
    return `${base}${qs?`?${qs}`:''}`;
  };

  const downloadFile = async (url: string, filename: string) => {
    try{
      // Use fetch to get blob and trigger download
      const token = localStorage.getItem('token') || '';
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` }});
      if (!resp.ok) throw new Error('Failed to download');
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    }catch(err:any){
      alert(err?.message || 'Download failed');
    }
  };
  const downloadCsv = async () => downloadFile(buildExportUrl('csv'), `survey-${id}.csv`);
  const downloadXlsx = async () => downloadFile(buildExportUrl('xlsx'), `survey-${id}.xlsx`);
  const downloadPdf = async () => downloadFile(buildExportUrl('pdf'), `survey-${id}.pdf`);

  if (!survey) return <div>{error || 'Loading...'}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Survey</h2>
      </div>

      {isStaff ? (
        <div className="space-y-3">
          <input className="border p-2 w-full" value={survey.title} onChange={e=>setSurvey({ ...survey, title: e.target.value })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={survey.isAnonymous} onChange={e=>setSurvey({ ...survey, isAnonymous: e.target.checked })} /> Anonymous responses</label>
          <div>
            <label className="block text-sm font-medium mb-1">Questions JSON</label>
            <textarea className="w-full border p-2 font-mono min-h-[220px]" value={JSON.stringify(survey.questions, null, 2)} onChange={e=>{
              try{ setSurvey({ ...survey, questions: JSON.parse(e.target.value) }); }catch{}
            }} />
            <button className="mt-2 bg-gray-800 text-white px-3 py-1" onClick={saveEdits}>Save</button>
          </div>
        </div>
      ) : null}

      {!isStaff && (
        <form className="space-y-3" onSubmit={submit}>
          {items.map((q:any)=> (
            <div key={q.key} className="space-y-1">
              <div className="font-medium">{q.label || q.key}</div>
              {String(q.type).toLowerCase()==='likert' ? (
                <div className="flex items-center gap-3">
                  {Array.from({ length: Number(q.scale||5)||5 }, (_,i)=> i+1).map(v=> (
                    <label key={v} className="flex items-center gap-1 text-sm">
                      <input type="radio" name={q.key} value={v} onChange={()=>setAnswers(a=>({ ...a, [q.key]: v }))} /> {v}
                    </label>
                  ))}
                </div>
              ) : (
                <input className="border p-2 w-full" onChange={e=>setAnswers(a=>({ ...a, [q.key]: e.target.value }))} />
              )}
            </div>
          ))}
          <button disabled={saving} className="bg-blue-600 text-white px-4 py-2">{saving? 'Submitting...' : 'Submit'}</button>
        </form>
      )}

      {isStaff && analytics && (
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Analytics</h3>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-gray-600">Start date</label>
                <input type="datetime-local" className="border p-1 rounded" value={startDate} onChange={e=>setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-600">End date</label>
                <input type="datetime-local" className="border p-1 rounded" value={endDate} onChange={e=>setEndDate(e.target.value)} />
              </div>
              <div className="text-sm text-gray-700">Total responses: {analytics.totalResponses}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={downloadCsv} className="bg-green-600 text-white px-3 py-1 rounded">CSV</button>
              <button onClick={downloadXlsx} className="bg-emerald-600 text-white px-3 py-1 rounded">XLSX</button>
              <button onClick={downloadPdf} className="bg-indigo-600 text-white px-3 py-1 rounded">PDF</button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries<any>(analytics.likert || {}).map(([key, info])=> {
              const data = Object.entries(info.counts as Record<string, number>).map(([score, count])=> ({ score, count }));
              return (
                <div key={key} className="border rounded p-3">
                  <div className="font-medium mb-2">{info.label} (avg {Number(info.avg).toFixed(2)})</div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="score" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6">
                          <LabelList dataKey="count" position="top" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isStaff && responses && (
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Responses ({responses.length})</h3>
          <ul className="divide-y">
            {responses.map((r:any)=> (
              <li key={r.id} className="py-2 text-sm">
                <div className="text-gray-600">{new Date(r.createdAt).toLocaleString()} {r.userId? `• ${r.userId}`:''}</div>
                <pre className="bg-gray-100 p-2 rounded overflow-auto">{JSON.stringify(r.data, null, 2)}</pre>
              </li>
            ))}
            {responses.length===0 && <li className="py-2 text-gray-600">No responses yet.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
