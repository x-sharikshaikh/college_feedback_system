import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
// Recharts imports removed; not currently used in this file
const LikertBar = React.lazy(() => import('../components/LikertBar'));
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function SurveyDetail(){
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [survey, setSurvey] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [analytics, setAnalytics] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [myResponse, setMyResponse] = useState<{ id: string; createdAt: string; data: any } | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [copied, setCopied] = useState(false);
  // Builder state for staff-friendly editor
  type EditQuestion = { id: string; type: 'likert'|'text'; label: string; scale?: number; required?: boolean; key?: string };
  type EditSection = { id: string; title: string; description?: string; items: EditQuestion[] };
  const [editSections, setEditSections] = useState<EditSection[] | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAnonymous, setEditAnonymous] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const isStaff = user?.role==='FACULTY' || user?.role==='ADMIN';

  useEffect(()=>{
    (async()=>{
      try{
        const s = await api.get(`/api/surveys/${id}`);
        setSurvey(s.data.survey);
        if (isStaff) {
          const q = s.data.survey?.questions;
          const hasSections = Array.isArray(q?.sections);
          const srcItems = hasSections
            ? (q.sections as any[])
            : [{ title: 'Section 1', description: '', items: Array.isArray(q?.items)? q.items: [] }];
          const mapped: EditSection[] = srcItems.map((sec: any) => ({
            id: crypto.randomUUID(),
            title: sec?.title || 'Section',
            description: sec?.description || '',
            items: Array.isArray(sec?.items) ? sec.items.map((it: any) => ({
              id: crypto.randomUUID(),
              type: String(it?.type || 'text').toLowerCase() === 'likert' ? 'likert' : 'text',
              label: it?.label || it?.key || 'Question',
              scale: it?.scale ? Number(it.scale) : undefined,
              required: !!it?.required,
              key: it?.key,
            })) : []
          }));
          setEditSections(mapped);
          setEditTitle(String(s.data.survey?.title || ''));
          setEditDescription(String(s.data.survey?.description || ''));
          setEditAnonymous(!!s.data.survey?.isAnonymous);
        }
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
        } else {
          // Student: load my existing response (non-anonymous surveys only return data)
          try{
            const mr = await api.get(`/api/surveys/${id}/my-response`);
            if (mr.data?.exists && mr.data.response) {
              setMyResponse(mr.data.response);
              setAnswers(mr.data.response.data || {});
            } else {
              setMyResponse(null);
            }
          }catch{/* ignore */}
        }
      }catch(e:any){ setError(e?.response?.data?.error || 'Failed to load survey'); }
    })();
  },[id, isStaff, startDate, endDate]);

  const sections = useMemo(()=> Array.isArray(survey?.questions?.sections) ? survey.questions.sections : null, [survey]);
  const flatItems = useMemo(()=> sections? sections.flatMap((s:any)=> Array.isArray(s?.items)? s.items:[]) : (Array.isArray(survey?.questions?.items) ? survey.questions.items : []), [sections, survey]);
  const items = flatItems;
  const totalQuestions = items.length;
  const answeredCount = useMemo(()=> items.reduce((acc:number, q:any)=> acc + (answers[q.key]!==undefined && answers[q.key]!=='' ? 1:0), 0), [answers, items]);

  const LikertLegend = () => (
    <div className="text-xs opacity-80 flex flex-wrap gap-3">
      <span className="px-2 py-0.5 rounded-full glass">1 • Strongly Disagree</span>
      <span className="px-2 py-0.5 rounded-full glass">2 • Disagree</span>
      <span className="px-2 py-0.5 rounded-full glass">3 • Neutral</span>
      <span className="px-2 py-0.5 rounded-full glass">4 • Agree</span>
      <span className="px-2 py-0.5 rounded-full glass">5 • Strongly Agree</span>
    </div>
  );

  const setPresetRange = (preset: '7d'|'30d'|'semester'|'all') => {
    if (preset==='all'){ setStartDate(''); setEndDate(''); return; }
    const now = new Date();
    if (preset==='7d'){
      const s = new Date(now); s.setDate(now.getDate()-7);
      setStartDate(s.toISOString().slice(0,16)); setEndDate(now.toISOString().slice(0,16)); return;
    }
    if (preset==='30d'){
      const s = new Date(now); s.setDate(now.getDate()-30);
      setStartDate(s.toISOString().slice(0,16)); setEndDate(now.toISOString().slice(0,16)); return;
    }
    // semester: Jan 1 or Aug 1 depending on month
    const month = now.getMonth(); // 0-based
    const semStart = month >= 7 ? new Date(now.getFullYear(), 7, 1) : new Date(now.getFullYear(), 0, 1);
    setStartDate(semStart.toISOString().slice(0,16)); setEndDate(now.toISOString().slice(0,16));
  };

  const copyShareLink = async () => {
    try{
      const shareUrl = `${window.location.origin}/surveys/${id}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(()=> setCopied(false), 2000);
    }catch{/* ignore */}
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try{
      if (myResponse) {
        await api.put(`/api/surveys/${id}/response`, { data: answers });
      } else {
        await api.post(`/api/surveys/${id}/submit`, { data: answers });
      }
      nav('/surveys');
    }catch(err:any){ setError(err?.response?.data?.error || 'Failed to submit'); }
    finally{ setSaving(false); }
  };

  const saveEdits = async () => {
    try{
      if (!editSections) return;
      const mapped = { sections: editSections.map((s, si) => ({
        title: s.title,
        description: s.description || '',
        items: s.items.map((q, qi) => ({
          type: q.type,
          key: q.key || `s${si+1}_q${qi+1}`,
          label: q.label,
          ...(q.type==='likert' ? { scale: q.scale ?? 5 } : {}),
          required: !!q.required,
        }))
      })) };
      await api.put(`/api/surveys/${id}`, { title: editTitle, description: editDescription || null, isAnonymous: editAnonymous, questions: mapped });
      alert('Saved');
      // reflect in local survey state for student view immediately
      setSurvey((prev:any)=> prev ? { ...prev, title: editTitle, description: editDescription || null, isAnonymous: editAnonymous, questions: mapped } : prev);
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

  if (!survey) return <div role="status" aria-live="polite">{error || 'Loading...'}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Survey</h2>
      </div>

      {/* Meta header with badges and quick actions */}
      <div className="glass card flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <div className="text-lg font-semibold">{survey.title}</div>
            <div className="text-xs opacity-70">
              {survey.createdAt ? <>Created {new Date(survey.createdAt).toLocaleDateString()} • </> : null}
              {survey.isAnonymous ? <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Anonymous</span> : <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">Identified</span>}
              {typeof survey.isPublished === 'boolean' ? <span className="ml-2 px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">{survey.isPublished? 'Published' : 'Draft'}</span> : null}
              {survey.isCompleted ? <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-700 dark:text-gray-300">Completed</span> : null}
            </div>
          </div>
          {isStaff && (
            <div className="flex items-center gap-2 text-sm">
              <button className="btn btn-ghost" onClick={copyShareLink} disabled={!survey.isPublished}>Copy share link</button>
              {copied && <span className="text-xs opacity-80">Copied!</span>}
            </div>
          )}
        </div>
        {survey.description ? (
          <div className="text-sm opacity-80">{survey.description}</div>
        ) : null}
        {!isStaff && (
          <div className="text-xs opacity-75">Your responses are {survey.isAnonymous? 'anonymous' : 'associated with your account'} and help improve teaching quality, course content, and campus services.</div>
        )}
      </div>

      {isStaff && (
        <div className="glass card space-y-3">
          <input className="input-glass" value={editTitle} onChange={e=>setEditTitle(e.target.value)} placeholder="Survey title" />
          <textarea className="input-glass min-h-20" value={editDescription} onChange={e=>setEditDescription(e.target.value)} placeholder="Description (optional)" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editAnonymous} onChange={e=>setEditAnonymous(e.target.checked)} /> Anonymous responses</label>

          {/* Section & question builder */}
          {editSections && editSections.map((sec, si)=> (
            <div key={sec.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">{sec.title}</div>
                <div className="flex items-center gap-2 text-xs">
                  <button type="button" className="btn btn-ghost" onClick={()=>setEditSections(prev=> prev?.map(s=> s.id===sec.id? { ...s, title: s.title + ' *' } : s) || null)}>Rename</button>
                  <button type="button" className="btn btn-ghost" onClick={()=>setEditSections(prev=> (prev||[]).filter(s=> s.id!==sec.id))} disabled={(editSections||[]).length===1}>Remove section</button>
                </div>
              </div>
              <input className="input-glass" value={sec.title} onChange={e=>setEditSections(prev=> prev?.map(s=> s.id===sec.id? { ...s, title: e.target.value } : s) || null)} />
              <textarea className="input-glass min-h-16" placeholder="Section description (optional)" value={sec.description||''} onChange={e=>setEditSections(prev=> prev?.map(s=> s.id===sec.id? { ...s, description: e.target.value } : s) || null)} />

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event:any)=>{
                const { active, over } = event; if (!over || active.id===over.id) return;
                setEditSections(prev => prev?.map(s=> {
                  if (s.id!==sec.id) return s;
                  const oldIndex = s.items.findIndex(x=> x.id===active.id);
                  const newIndex = s.items.findIndex(x=> x.id===over.id);
                  if (oldIndex<0 || newIndex<0) return s;
                  return { ...s, items: arrayMove(s.items, oldIndex, newIndex) };
                }) || null);
              }}>
                <SortableContext items={sec.items.map(i=>i.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {sec.items.map((q, qi)=> (
                      <EditQuestionCard key={q.id} secId={sec.id} q={q} idx={qi}
                        onRemove={(qid)=> setEditSections(prev=> prev?.map(s=> s.id===sec.id? { ...s, items: s.items.filter(i=> i.id!==qid) } : s) || null)}
                        onUpdate={(qid,patch)=> setEditSections(prev=> prev?.map(s=> s.id===sec.id? { ...s, items: s.items.map(i=> i.id===qid? { ...i, ...patch } : i) } : s) || null)}
                        onMove={(qid,dir)=> setEditSections(prev=> prev?.map(s=> {
                          if (s.id!==sec.id) return s; const arr=s.items.slice(); const ix=arr.findIndex(i=>i.id===qid); if (ix<0) return s; const ni=ix+dir; if (ni<0||ni>=arr.length) return s; const [sp]=arr.splice(ix,1); arr.splice(ni,0,sp); return { ...s, items: arr };
                        }) || null)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-ghost" onClick={()=> setEditSections(prev=> prev?.map(s=> s.id===sec.id? { ...s, items: [...s.items, { id: crypto.randomUUID(), type: 'likert', label: 'Untitled question', scale: 5 }] } : s) || null)}>+ Likert question</button>
                <button type="button" className="btn btn-ghost" onClick={()=> setEditSections(prev=> prev?.map(s=> s.id===sec.id? { ...s, items: [...s.items, { id: crypto.randomUUID(), type: 'text', label: 'Untitled question' }] } : s) || null)}>+ Short answer</button>
                <div className="relative inline-block">
                  <details>
                    <summary className="btn btn-ghost cursor-pointer list-none">+ From templates</summary>
                    <div className="absolute z-10 mt-2 glass p-2 space-y-1 min-w-56">
                      <button type="button" className="btn btn-ghost w-full" onClick={()=> setEditSections(prev=> prev?.map(s=> s.id===sec.id? { ...s, items: [...s.items,
                        { id: crypto.randomUUID(), type: 'likert', label: 'Course content relevance', scale: 5, required: true },
                        { id: crypto.randomUUID(), type: 'likert', label: 'Course organization', scale: 5, required: true },
                      ] } : s) || null)}>Course quality</button>
                      <button type="button" className="btn btn-ghost w-full" onClick={()=> setEditSections(prev=> prev?.map(s=> s.id===sec.id? { ...s, items: [...s.items,
                        { id: crypto.randomUUID(), type: 'likert', label: 'Instructor clarity', scale: 5, required: true },
                        { id: crypto.randomUUID(), type: 'likert', label: 'Instructor engagement', scale: 5 },
                        { id: crypto.randomUUID(), type: 'text', label: 'Suggestions for instructor' },
                      ] } : s) || null)}>Instructor clarity</button>
                    </div>
                  </details>
                </div>
              </div>
              {si < (editSections?.length||0) - 1 && <div className="h-px bg-white/10" />}
            </div>
          ))}

          <button type="button" className="btn btn-ghost" onClick={()=> setEditSections(prev=> ([...(prev||[]), { id: crypto.randomUUID(), title: `Section ${(prev?.length||0)+1}`, description: '', items: [] }]))}>+ Add section</button>
          <div>
            <button className="mt-2 btn btn-primary" onClick={saveEdits}>Save</button>
          </div>
        </div>
      )}

      {!isStaff && (
        <form className="glass card space-y-3" onSubmit={submit}>
          <div className="flex items-center justify-between text-xs opacity-80">
            <LikertLegend />
            <div>Progress: {answeredCount}/{totalQuestions}</div>
          </div>
          {myResponse && (
            <div className="text-xs opacity-80">You already submitted this survey on {new Date(myResponse.createdAt).toLocaleString()}. You can update your answers below.</div>
          )}
          {sections ? (
            sections.map((sec:any, i:number)=> (
              <div key={i} className="space-y-2">
                <div className="text-lg font-semibold">{sec.title}</div>
                {sec.description ? <div className="text-sm opacity-75">{sec.description}</div> : null}
                {Array.isArray(sec.items) && sec.items.map((q:any)=> {
                  const val = answers[q.key];
                  const isMissing = !!q.required && (val === undefined || val === '');
                  const labelId = `label-${q.key}`;
                  const hintId = `hint-${q.key}`;
                  return (
                    <div key={q.key} className="space-y-1">
                      <div className="font-medium" id={labelId}>{q.label || q.key} {q.required? <span className="text-red-500">*</span> : null}</div>
                      {String(q.type).toLowerCase()==='likert' ? (
                        <div role="radiogroup" aria-labelledby={labelId} aria-required={q.required?true:undefined} aria-invalid={isMissing?true:undefined} aria-describedby={isMissing?hintId:undefined} className="flex items-center gap-3">
                          {Array.from({ length: Number(q.scale||5)||5 }, (_,i)=> i+1).map(v=> (
                            <label key={v} className="flex items-center gap-1 text-sm">
                              <input type="radio" name={q.key} value={v} onChange={()=>setAnswers(a=>({ ...a, [q.key]: v }))} {...(q.required && v===1 ? { required: true } : {})} /> {v}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <>
                          <input className="input-glass" name={q.key} aria-labelledby={labelId} aria-required={q.required?true:undefined} aria-invalid={isMissing?true:undefined} aria-describedby={isMissing?hintId:undefined} {...(q.required?{required:true}:{})} onChange={e=>setAnswers(a=>({ ...a, [q.key]: e.target.value }))} />
                          {isMissing && <div id={hintId} className="text-xs text-red-600">This question is required.</div>}
                        </>
                      )}
                      {String(q.type).toLowerCase()==='likert' && isMissing && (
                        <div id={hintId} className="text-xs text-red-600">This question is required.</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            items.map((q:any)=> {
              const val = answers[q.key];
              const isMissing = !!q.required && (val === undefined || val === '');
              const labelId = `label-${q.key}`;
              const hintId = `hint-${q.key}`;
              return (
                <div key={q.key} className="space-y-1">
                  <div className="font-medium" id={labelId}>{q.label || q.key} {q.required? <span className="text-red-500">*</span> : null}</div>
                  {String(q.type).toLowerCase()==='likert' ? (
                    <div role="radiogroup" aria-labelledby={labelId} aria-required={q.required?true:undefined} aria-invalid={isMissing?true:undefined} aria-describedby={isMissing?hintId:undefined} className="flex items-center gap-3">
                      {Array.from({ length: Number(q.scale||5)||5 }, (_,i)=> i+1).map(v=> (
                        <label key={v} className="flex items-center gap-1 text-sm">
                          <input type="radio" name={q.key} value={v} onChange={()=>setAnswers(a=>({ ...a, [q.key]: v }))} {...(q.required && v===1 ? { required: true } : {})} /> {v}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <>
                      <input className="input-glass" name={q.key} aria-labelledby={labelId} aria-required={q.required?true:undefined} aria-invalid={isMissing?true:undefined} aria-describedby={isMissing?hintId:undefined} {...(q.required?{required:true}:{})} onChange={e=>setAnswers(a=>({ ...a, [q.key]: e.target.value }))} />
                      {isMissing && <div id={hintId} className="text-xs text-red-600">This question is required.</div>}
                    </>
                  )}
                  {String(q.type).toLowerCase()==='likert' && isMissing && (
                    <div id={hintId} className="text-xs text-red-600">This question is required.</div>
                  )}
                </div>
              );
            })
          )}
          {/* Optional general comments */}
          <div className="space-y-1">
            <div className="font-medium">General comments</div>
            <textarea className="input-glass min-h-24" onChange={e=>setAnswers(a=>({ ...a, general_comments: e.target.value }))} placeholder="Any additional feedback about the course, teaching, or campus experience" />
          </div>
  <button disabled={saving || survey.isCompleted} className="btn btn-primary">{saving? (myResponse? 'Saving...' : 'Submitting...') : (survey.isCompleted? 'Survey completed' : (myResponse? 'Save changes' : 'Submit'))}</button>
        </form>
      )}

      {isStaff && analytics && (
        <div className="glass card space-y-2">
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
              <div className="flex items-center gap-1 text-xs">
                <button type="button" className="btn btn-ghost" onClick={()=>setPresetRange('7d')}>Last 7 days</button>
                <button type="button" className="btn btn-ghost" onClick={()=>setPresetRange('30d')}>Last 30 days</button>
                <button type="button" className="btn btn-ghost" onClick={()=>setPresetRange('semester')}>This semester</button>
                <button type="button" className="btn btn-ghost" onClick={()=>setPresetRange('all')}>All time</button>
              </div>
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
                <div key={key} className="glass p-3">
                  <div className="font-medium mb-2">{info.label} (avg {Number(info.avg).toFixed(2)})</div>
                  <Suspense fallback={<div className="text-sm opacity-70">Loading chart…</div>}>
                    <LikertBar data={data} />
                  </Suspense>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isStaff && responses && (
        <div className="glass card space-y-3">
          <h3 className="text-xl font-semibold">Responses ({responses.length})</h3>
          <ResponsesListFriendly survey={survey} responses={responses} />
        </div>
      )}
    </div>
  );
}

function EditQuestionCard({ secId: _secId, q, idx, onRemove, onUpdate, onMove }: { secId: string; q: any; idx: number; onRemove: (id: string)=>void; onUpdate: (id: string, patch: any)=>void; onMove: (id: string, dir: -1|1)=>void }){
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: q.id });
  const style = { transform: CSS.Transform.toString(transform), transition } as React.CSSProperties;
  return (
    <div ref={setNodeRef} style={style} className="glass card">
      <div className="flex items-center justify-between">
        <div className="text-sm opacity-70" {...attributes} {...listeners} title="Drag to reorder">Question {idx+1}</div>
        <div className="flex items-center gap-2 text-xs">
          <button type="button" className="btn btn-ghost" onClick={()=>onMove(q.id, -1)} disabled={idx===0}>↑</button>
          <button type="button" className="btn btn-ghost" onClick={()=>onMove(q.id, 1)}>↓</button>
          <button type="button" className="btn btn-ghost" onClick={()=>onRemove(q.id)}>Remove</button>
        </div>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[160px_1fr] items-start">
        <div>
          <label className="block text-xs opacity-70">Type</label>
          <select className="input-glass" value={q.type} onChange={(e: React.ChangeEvent<HTMLSelectElement>)=> onUpdate(q.id, { type: e.target.value as 'likert'|'text' })}>
            <option value="likert">Likert (1–5)</option>
            <option value="text">Short answer</option>
          </select>
        </div>
        <div>
          <label className="block text-xs opacity-70">Question</label>
          <input className="input-glass" placeholder="Enter question text" value={q.label} onChange={(e: React.ChangeEvent<HTMLInputElement>)=> onUpdate(q.id, { label: e.target.value })} />
        </div>
      </div>
      {q.type==='likert' && (
        <div className="mt-2 grid gap-2 sm:grid-cols-[160px_1fr] items-center">
          <div>
            <label className="block text-xs opacity-70">Scale</label>
            <select className="input-glass" value={q.scale ?? 5} onChange={(e: React.ChangeEvent<HTMLSelectElement>)=> onUpdate(q.id, { scale: Number(e.target.value) })}>
              {[3,4,5,6,7].map((s:number)=> <option key={s} value={s}>{s}-point</option>)}
            </select>
          </div>
          <div className="text-xs opacity-80">1 = Strongly Disagree … {q.scale ?? 5} = Strongly Agree</div>
        </div>
      )}
      <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={!!q.required} onChange={e=>onUpdate(q.id, { required: e.target.checked })} /> Required</label>
    </div>
  );
}

function ResponsesListFriendly({ survey, responses }: { survey: any; responses: any[] }){
  // Build key -> label mapping
  const items = React.useMemo(()=>{
    const q = survey?.questions;
    const arr = Array.isArray(q?.sections)? q.sections.flatMap((s:any)=> Array.isArray(s?.items)? s.items:[]) : (Array.isArray(q?.items)? q.items: []);
    return arr as Array<{ key: string; label?: string; type?: string }>;
  }, [survey]);
  const labelMap = React.useMemo(()=> Object.fromEntries(items.filter(i=>i?.key).map(i=> [i.key, i.label || i.key])), [items]);
  return (
    <ul className="space-y-3">
      {responses.map((r:any)=> (
        <li key={r.id} className="glass p-3 rounded">
          <div className="text-xs opacity-70 mb-2">{new Date(r.createdAt).toLocaleString()} {r.userId? `• ${r.userId}`:''}</div>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            {Object.entries(r.data || {}).map(([k, v])=> (
              <div key={k} className="flex items-start gap-2">
                <div className="font-medium min-w-36">{labelMap[k] || k}</div>
                <div className="opacity-80 break-words">{typeof v==='object'? JSON.stringify(v) : String(v)}</div>
              </div>
            ))}
          </div>
          <details className="mt-2">
            <summary className="text-xs opacity-70 cursor-pointer">Show raw JSON</summary>
            <pre className="bg-gray-100 p-2 rounded overflow-auto text-xs">{JSON.stringify(r.data, null, 2)}</pre>
          </details>
        </li>
      ))}
      {responses.length===0 && <li className="py-2 text-gray-600">No responses yet.</li>}
    </ul>
  );
}
