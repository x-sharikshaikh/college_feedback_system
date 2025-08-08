import React, { useMemo, useState } from 'react';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type BuilderQuestion = {
  id: string;
  type: 'likert' | 'text';
  label: string;
  scale?: number; // for likert
  required?: boolean;
};

type BuilderSection = {
  id: string;
  title: string;
  description?: string;
  items: BuilderQuestion[];
};

function SortableQuestion({ q, idx, onMove, onRemove, onUpdate }: { q: BuilderQuestion; idx: number; onMove: (id: string, dir: -1|1)=>void; onRemove: (id: string)=>void; onUpdate: (id: string, patch: Partial<BuilderQuestion>)=>void }){
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: q.id });
  const style = { transform: CSS.Transform.toString(transform), transition } as React.CSSProperties;
  return (
    <div ref={setNodeRef} style={style} className="glass card">
      <div className="flex items-center justify-between">
        <div className="text-sm opacity-70" {...attributes} {...listeners} title="Drag to reorder">Question {idx+1}</div>
        <div className="flex items-center gap-2 text-xs">
          <button type="button" className="btn btn-ghost" onClick={()=>onMove(q.id, -1)} disabled={idx===0}>↑</button>
          <button type="button" className="btn btn-ghost" onClick={()=>onMove(q.id, 1)} disabled={false}>↓</button>
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
              {[3,4,5,6,7].map(s=> <option key={s} value={s}>{s}-point</option>)}
            </select>
          </div>
          <div className="text-xs opacity-80">1 = Strongly Disagree … {q.scale ?? 5} = Strongly Agree</div>
        </div>
      )}
      <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={!!q.required} onChange={e=>onUpdate(q.id, { required: e.target.checked })} /> Required</label>
    </div>
  );
}

export default function SurveyCreate(){
  const nav = useNavigate();
  const [title, setTitle] = useState('');
  const [surveyDescription, setSurveyDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [publishNow, setPublishNow] = useState(false);
  const [sections, setSections] = useState<BuilderSection[]>([{
    id: crypto.randomUUID(),
    title: 'Section 1',
    description: 'Course & Instructor',
    items: [
      { id: crypto.randomUUID(), type: 'likert', label: 'Overall course quality', scale: 5, required: true },
      { id: crypto.randomUUID(), type: 'likert', label: 'Instructor clarity', scale: 5, required: true },
      { id: crypto.randomUUID(), type: 'text', label: 'Comments' },
    ]
  }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const canSubmit = useMemo(() => {
    const flat = sections.flatMap(s=> s.items);
    return title.trim().length>0 && flat.length>0 && flat.every(q=> q.label.trim().length>0 && (q.type==='text' || (q.scale && q.scale>=3 && q.scale<=7)));
  }, [title, sections]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const addSection = () => setSections(prev => [...prev, { id: crypto.randomUUID(), title: `Section ${prev.length+1}`, description: '', items: [] }]);
  const removeSection = (sid: string) => setSections(prev => prev.filter(s=> s.id!==sid));
  const updateSection = (sid: string, patch: Partial<BuilderSection>) => setSections(prev => prev.map(s=> s.id===sid? { ...s, ...patch } : s));

  const addQuestion = (sid: string, kind: 'likert'|'text') => {
    const q: BuilderQuestion = kind==='likert'
      ? { id: crypto.randomUUID(), type: 'likert', label: 'Untitled question', scale: 5 }
      : { id: crypto.randomUUID(), type: 'text', label: 'Untitled question' };
    setSections(prev => prev.map(s=> s.id===sid? { ...s, items: [...s.items, q] } : s));
  };
  const removeQuestion = (sid: string, qid: string) => setSections(prev => prev.map(s=> s.id===sid? { ...s, items: s.items.filter(q=> q.id!==qid) } : s));
  const move = (sid: string, id: string, dir: -1|1) => setSections(prev => prev.map(s=> {
    if (s.id!==sid) return s;
    const arr = s.items.slice();
    const idx = arr.findIndex(q=> q.id===id); if (idx<0) return s;
    const ni = idx + dir; if (ni<0 || ni>=arr.length) return s;
    const [sp] = arr.splice(idx,1); arr.splice(ni,0,sp); return { ...s, items: arr };
  }));
  const updateQuestion = (sid: string, id: string, patch: Partial<BuilderQuestion>) => setSections(prev => prev.map(s=> s.id===sid? { ...s, items: s.items.map(q=> q.id===id? { ...q, ...patch } : q) } : s));

  const onDragEnd = (sid: string) => (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSections(prev => prev.map(s=> {
      if (s.id!==sid) return s;
      const oldIndex = s.items.findIndex(x=> x.id===active.id);
      const newIndex = s.items.findIndex(x=> x.id===over.id);
      if (oldIndex<0 || newIndex<0) return s;
      return { ...s, items: arrayMove(s.items, oldIndex, newIndex) };
    }));
  };

  // Templates / Question Bank
  const templates = {
    courseQuality: [
      { id: crypto.randomUUID(), type: 'likert', label: 'Course content relevance', scale: 5, required: true },
      { id: crypto.randomUUID(), type: 'likert', label: 'Course organization', scale: 5, required: true },
    ] as BuilderQuestion[],
    instructorClarity: [
      { id: crypto.randomUUID(), type: 'likert', label: 'Instructor clarity', scale: 5, required: true },
      { id: crypto.randomUUID(), type: 'likert', label: 'Instructor engagement', scale: 5 },
      { id: crypto.randomUUID(), type: 'text', label: 'Suggestions for instructor' },
    ] as BuilderQuestion[]
  } as const;

  const applyTemplate = (sid: string, key: keyof typeof templates) => {
    const clone = templates[key].map(q=> ({ ...q, id: crypto.randomUUID() }));
    setSections(prev => prev.map(s=> s.id===sid? { ...s, items: [...s.items, ...clone] } : s));
  };

  const onSubmit = async (e: React.FormEvent)=>{
    e.preventDefault();
    setError('');
    if (!canSubmit) { setError('Please complete the form and ensure each question has a label.'); return; }
    setSaving(true);
    try{
      // Map builder -> backend schema: supports sections and required
      const mapped = { sections: sections.map((s, si) => ({
        title: s.title,
        description: s.description || '',
        items: s.items.map((q, qi) => ({
          type: q.type,
          key: `s${si+1}_q${qi+1}`,
          label: q.label.trim(),
          ...(q.type==='likert' ? { scale: q.scale ?? 5 } : {}),
          required: !!q.required,
        }))
      })) };
      const body = { title, description: surveyDescription || null, isAnonymous, questions: mapped };
      const resp = await api.post('/api/surveys', body);
      const createdId = resp?.data?.survey?.id;
      if (publishNow && createdId){
        await api.post(`/api/surveys/${createdId}/publish`, { isPublished: true });
      }
      nav('/surveys');
    }catch(err:any){
      setError(err?.response?.data?.error || 'Failed to create survey');
    }finally{ setSaving(false); }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="glass card">
        <h2 className="text-2xl font-semibold">Create Survey</h2>
        {error && <p className="text-red-600" role="alert" aria-live="polite">{error}</p>}
        <form className="space-y-4" onSubmit={onSubmit}>
          <input className="input-glass" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
          <textarea className="input-glass min-h-20" placeholder="Description (optional)" value={surveyDescription} onChange={e=>setSurveyDescription(e.target.value)} />

          <div className="space-y-4">
            {sections.map((s, si)=> (
              <div key={s.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold">{s.title}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <button type="button" className="btn btn-ghost" onClick={()=>updateSection(s.id, { title: `${s.title} *` })}>Rename</button>
                    <button type="button" className="btn btn-ghost" onClick={()=>removeSection(s.id)} disabled={sections.length===1}>Remove section</button>
                  </div>
                </div>
                <input className="input-glass" placeholder="Section title" value={s.title} onChange={e=>updateSection(s.id, { title: e.target.value })} />
                <textarea className="input-glass min-h-16" placeholder="Section description (optional)" value={s.description||''} onChange={e=>updateSection(s.id, { description: e.target.value })} />

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd(s.id)}>
                  <SortableContext items={s.items.map(i=>i.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {s.items.map((q, idx)=> (
                        <SortableQuestion key={q.id} q={q} idx={idx} onMove={(id,dir)=>move(s.id,id,dir)} onRemove={(id)=>removeQuestion(s.id,id)} onUpdate={(id,patch)=>updateQuestion(s.id,id,patch)} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-ghost" onClick={()=>addQuestion(s.id,'likert')}>+ Likert question</button>
                  <button type="button" className="btn btn-ghost" onClick={()=>addQuestion(s.id,'text')}>+ Short answer</button>
                  <div className="relative inline-block">
                    <details>
                      <summary className="btn btn-ghost cursor-pointer list-none">+ From templates</summary>
                      <div className="absolute z-10 mt-2 glass p-2 space-y-1 min-w-56">
                        <button type="button" className="btn btn-ghost w-full" onClick={()=>applyTemplate(s.id,'courseQuality')}>Course quality</button>
                        <button type="button" className="btn btn-ghost w-full" onClick={()=>applyTemplate(s.id,'instructorClarity')}>Instructor clarity</button>
                      </div>
                    </details>
                  </div>
                </div>
                {si < sections.length - 1 && <div className="h-px bg-white/10" />}
              </div>
            ))}
          </div>

          <button type="button" className="btn btn-ghost" onClick={addSection}>+ Add section</button>

          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={isAnonymous} onChange={e=>setIsAnonymous(e.target.checked)} /> Anonymous responses</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={publishNow} onChange={e=>setPublishNow(e.target.checked)} /> Publish immediately</label>
          </div>

          <button disabled={saving || !canSubmit} className="btn btn-primary">{saving? 'Saving...' : 'Create'}</button>
        </form>
      </div>
    </div>
  );
}
