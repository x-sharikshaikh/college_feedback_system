import React from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

type U = { id: string; email: string; name: string; role: 'STUDENT'|'FACULTY'|'ADMIN'; createdAt: string };

export default function AdminUsers(){
  const { user } = useAuth();
  const [items, setItems] = React.useState<U[]>([]);
  const [total, setTotal] = React.useState(0);
  const [q, setQ] = React.useState('');
  const [role, setRole] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<{ user: U & { locked?: boolean }; stats: { responses: number; feedbacks: number } } | null>(null);

  const fetchUsers = React.useCallback(async ()=>{
    setLoading(true);
    try{
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (role) params.set('role', role);
      const res = await api.get(`/api/users?${params.toString()}`);
      setItems(res.data.items);
      setTotal(res.data.total);
    } finally { setLoading(false); }
  }, [q, role]);

  React.useEffect(()=>{ if (user?.role==='ADMIN') fetchUsers(); }, [fetchUsers, user]);

  const view = async (id: string) => {
    const res = await api.get(`/api/users/${id}`);
    setSelected(res.data);
  };
  const patch = async (id: string, data: Partial<{ role: U['role']; locked: boolean }>) => {
    const res = await api.patch(`/api/users/${id}`, data);
    // Refresh selected with latest minimal view
    setSelected((prev)=> prev && prev.user.id===id ? { ...prev, user: { ...prev.user, role: res.data.user.role, locked: res.data.user.locked } } : prev);
    fetchUsers();
  };
  const remove = async (id: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    await api.delete(`/api/users/${id}`);
    setSelected(null);
    fetchUsers();
  };

  if (user?.role !== 'ADMIN') return <div className="glass card">Forbidden</div>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Users ({total})</h2>
        <div className="flex gap-2 text-sm">
          <input className="input-glass" placeholder="Search name or email" value={q} onChange={e=>setQ(e.target.value)} />
          <select className="input-glass" value={role} onChange={e=>setRole(e.target.value)}>
            <option value="">All roles</option>
            <option value="STUDENT">Students</option>
            <option value="FACULTY">Faculty</option>
            <option value="ADMIN">Admins</option>
          </select>
          <button className="btn btn-primary" onClick={fetchUsers} disabled={loading}>{loading? 'Loading…' : 'Filter'}</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ul className="glass card divide-y divide-white/10">
          {items.map(u => (
            <li key={u.id} className="py-2 flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">{u.name} <span className="ml-2 px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-xs">{u.role}</span></div>
                <div className="opacity-70">{u.email}</div>
              </div>
              <div className="flex gap-2 text-xs">
                <button className="btn btn-ghost" onClick={()=>view(u.id)}>Details</button>
                <button className="btn btn-ghost" onClick={()=>remove(u.id)}>Delete</button>
              </div>
            </li>
          ))}
          {items.length===0 && <li className="py-3 text-sm opacity-70">No users found.</li>}
        </ul>

        <div className="glass card min-h-[200px]">
          {!selected ? (
            <div className="opacity-70">Select a user to see details.</div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="text-lg font-semibold">{selected.user.name}</div>
              <div>{selected.user.email}</div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-xs">{selected.user.role}</span>
                <label className="flex items-center gap-2">
                  <span>Role:</span>
                  <select className="input-glass" value={selected.user.role} onChange={(e)=> patch(selected.user.id, { role: e.target.value as U['role'] })}>
                    <option value="STUDENT">STUDENT</option>
                    <option value="FACULTY">FACULTY</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={!!selected.user.locked} onChange={(e)=> patch(selected.user.id, { locked: e.target.checked })} />
                  <span>Locked</span>
                </label>
              </div>
              <div>Joined: {new Date(selected.user.createdAt).toLocaleString()}</div>
              <div className="flex gap-4">
                <div>Responses: {selected.stats.responses}</div>
                <div>Feedbacks: {selected.stats.feedbacks}</div>
              </div>
              <div className="pt-2">
                <button className="btn btn-ghost" onClick={()=>remove(selected.user.id)}>Delete user</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
