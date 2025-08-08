import React, { useState } from 'react';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';

export default function SurveyCreate(){
  const nav = useNavigate();
  const [title, setTitle] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [publishNow, setPublishNow] = useState(false);
  const [questions, setQuestions] = useState<string>(JSON.stringify({ items: [
    { type: 'likert', key: 'q1', label: 'Overall satisfaction', scale: 5 },
    { type: 'text', key: 'q2', label: 'Comments' }
  ] }, null, 2));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [jsonError, setJsonError] = useState<string>('');

  const onQuestionsChange = (val: string) => {
    setQuestions(val);
    try{
      JSON.parse(val);
      setJsonError('');
    }catch(e:any){
      setJsonError(e?.message || 'Invalid JSON');
    }
  };

  const onSubmit = async (e: React.FormEvent)=>{
    e.preventDefault();
    setError('');
    // basic validations
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    try{ JSON.parse(questions); }catch{ setError('Questions JSON is invalid'); return; }
    setSaving(true);
    try{
      const body = { title, isAnonymous, questions: JSON.parse(questions) };
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
      <h2 className="text-2xl font-semibold">Create Survey</h2>
      {error && <p className="text-red-600">{error}</p>}
      <form className="space-y-3" onSubmit={onSubmit}>
        <input className="w-full border p-2" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isAnonymous} onChange={e=>setIsAnonymous(e.target.checked)} /> Anonymous responses</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={publishNow} onChange={e=>setPublishNow(e.target.checked)} /> Publish immediately</label>
        <div>
          <label className="block text-sm font-medium mb-1">Questions JSON</label>
          <textarea className={`w-full border p-2 font-mono min-h-[220px] ${jsonError? 'border-red-500':''}`} value={questions} onChange={e=>onQuestionsChange(e.target.value)} />
          {jsonError && <div className="text-xs text-red-600 mt-1">{jsonError}</div>}
          <div className="text-xs text-gray-600">
            Example:
            <pre className="bg-gray-100 p-2 rounded mt-1 overflow-auto">
{`{
  "items": [
    { "type": "likert", "key": "q1", "label": "Clarity", "scale": 5 },
    { "type": "text", "key": "q2", "label": "Comments" }
  ]
}`}
            </pre>
          </div>
        </div>
        <button disabled={saving || !!jsonError || !title.trim()} className="bg-blue-600 text-white px-4 py-2">{saving? 'Saving...' : 'Create'}</button>
      </form>
    </div>
  );
}
