
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Minister, Member, Branch, UserProfile } from '../types';

// Added interface for MinistersView props
interface MinistersViewProps {
  userProfile: UserProfile | null;
}

const MinistersView: React.FC<MinistersViewProps> = ({ userProfile }) => {
  const [ministers, setMinisters] = useState<Minister[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    member_id: '',
    role: 'Pastor',
    branch_id: '',
    ministry: '',
    ordination_date: '',
    status: 'Active' as const
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: memberData } = await supabase.from('members').select('*').order('first_name');
      const { data: branchData } = await supabase.from('branches').select('*').order('name');
      setMembers(memberData || []);
      setBranches(branchData || []);

      const { data: ministerData, error } = await supabase
        .from('ministers')
        .select('*, members(*), branches(*)')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') setTableMissing(true);
      } else {
        setTableMissing(false);
        setMinisters(ministerData || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.member_id || !formData.branch_id) {
      alert("Please select a Member and Branch.");
      return;
    }

    try {
      let res;
      if (editingId) {
        res = await supabase.from('ministers').update(formData).eq('id', editingId);
      } else {
        res = await supabase.from('ministers').insert([formData]);
      }
      if (res.error) throw res.error;
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (tableMissing) {
    const repairSQL = `-- MINISTERS RELATIONAL SCHEMA MASTER REPAIR
create table if not exists ministers (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  role text not null default 'Pastor',
  ministry text,
  ordination_date date,
  status text default 'Active',
  created_at timestamp with time zone default now(),
  unique(member_id)
);

alter table ministers enable row level security;

-- Robust Policy Deployment
drop policy if exists "Allow all on ministers" on ministers;
create policy "Allow all on ministers" on ministers for all using (true) with check (true);`;

    return (
      <div className="max-w-4xl mx-auto py-12 text-center bg-white border border-slate-200 rounded-3xl p-10 shadow-xl">
        <h2 className="text-xl font-black mb-4 uppercase tracking-tight">Ministerial Table Setup</h2>
        <p className="text-slate-500 mb-6 font-medium">This module requires a relational table linked to members and branches.</p>
        <pre className="bg-slate-900 text-slate-300 p-6 rounded-xl text-left text-[10px] mb-6 overflow-x-auto leading-relaxed shadow-inner">
          {repairSQL}
        </pre>
        <button onClick={fetchData} className="px-10 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Refresh Database</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Ministers & Pastors</h2>
          <p className="text-slate-500">Elevated roles linked to the master directory.</p>
        </div>
        <button onClick={() => { setEditingId(null); setIsModalOpen(true); }} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-700 active:scale-95">Appoint Minister</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-widest">
            <tr>
              <th className="px-8 py-4">Minister Identity</th>
              <th className="px-8 py-4">Rank / Role</th>
              <th className="px-8 py-4">Current Branch</th>
              <th className="px-8 py-4">Status</th>
              <th className="px-8 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
               <tr><td colSpan={5} className="px-8 py-12 text-center text-slate-400 italic">Accessing leadership records...</td></tr>
            ) : ministers.length > 0 ? ministers.map(m => (
              <tr key={m.id} className="hover:bg-slate-50/50 group">
                <td className="px-8 py-4">
                   <p className="text-sm font-black text-slate-800">{m.members?.first_name} {m.members?.last_name}</p>
                   <p className="text-[10px] text-slate-400">{m.members?.email}</p>
                </td>
                <td className="px-8 py-4 text-xs font-bold text-slate-600">{m.role}</td>
                <td className="px-8 py-4">
                   <span className="text-xs font-bold text-indigo-700 px-3 py-1 bg-indigo-50 rounded-lg">{m.branches?.name}</span>
                </td>
                <td className="px-8 py-4">
                   <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">{m.status}</span>
                </td>
                <td className="px-8 py-4 text-right">
                   <button onClick={async () => { if(confirm('Remove appointment?')) { await supabase.from('ministers').delete().eq('id', m.id); fetchData(); }}} className="text-rose-600 p-2 hover:bg-rose-50 rounded-lg transition-all active:scale-90"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-medium">No ministers appointed yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-10">
            <h3 className="text-2xl font-black mb-8 text-slate-800">Appoint Leadership</h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Select Identity *</label>
                <select name="member_id" value={formData.member_id} onChange={(e) => setFormData({...formData, member_id: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl font-bold cursor-pointer hover:bg-slate-100 transition-all" required>
                  <option value="">Choose from directory...</option>
                  {members.map(mb => <option key={mb.id} value={mb.id}>{mb.first_name} {mb.last_name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Assigned Site *</label>
                <select name="branch_id" value={formData.branch_id} onChange={(e) => setFormData({...formData, branch_id: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl font-bold cursor-pointer hover:bg-slate-100 transition-all" required>
                  <option value="">Select Branch...</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Role Rank</label>
                  <select name="role" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl font-bold">
                    <option>Pastor</option><option>Apostle</option><option>Prophet</option><option>Evangelist</option><option>Teacher</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Ordination</label>
                  <input type="date" value={formData.ordination_date} onChange={(e) => setFormData({...formData, ordination_date: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold shadow-inner" />
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">Confirm Appointment</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MinistersView;
