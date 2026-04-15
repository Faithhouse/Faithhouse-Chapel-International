
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Volunteer, Member, Branch } from '../types';
import { toast } from 'sonner';

// Added interface for VolunteersView props
interface VolunteersViewProps {
}

const VolunteersView: React.FC<VolunteersViewProps> = () => {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);

  const [formData, setFormData] = useState({
    member_id: '',
    ministry: '',
    branch_id: '',
    skill: '',
    availability: 'Sundays' as const,
    status: 'Active' as const,
    joined_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: mData } = await supabase.from('members').select('*').order('first_name');
      const { data: bData } = await supabase.from('branches').select('*').order('name');
      setMembers(mData || []);
      setBranches(bData || []);

      const { data: vData, error } = await supabase
        .from('volunteers')
        .select('*, members(*), branches(*)')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
          setTableMissing(true);
          toast.error("Volunteers table missing. Please run the SQL script.");
        }
      } else {
        setTableMissing(false);
        setVolunteers(vData || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.member_id || !formData.branch_id) return alert("Select Member and Branch.");

    try {
      const res = await supabase.from('volunteers').insert([formData]);
      if (res.error) throw res.error;
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (tableMissing) {
    const repairSQL = `-- VOLUNTEERS RELATIONAL SCHEMA MASTER REPAIR
create table if not exists volunteers (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  ministry text not null,
  skill text,
  availability text,
  status text default 'Active',
  joined_date date,
  created_at timestamp with time zone default now(),
  unique(member_id, ministry)
);

alter table volunteers enable row level security;

-- Robust Policy Deployment
drop policy if exists "Allow all on volunteers" on volunteers;
create policy "Allow all on volunteers" on volunteers for all using (true) with check (true);`;

    return (
      <div className="max-w-4xl mx-auto py-12 text-center bg-white border border-slate-200 rounded-3xl p-10 shadow-xl animate-in fade-in">
        <h2 className="text-xl font-black mb-4 uppercase tracking-tight">Workforce Table Setup</h2>
        <p className="text-slate-500 mb-6 font-medium">Establish the relational volunteer registry by running this script.</p>
        <pre className="bg-slate-900 text-slate-300 p-6 rounded-xl text-left text-[10px] mb-6 overflow-x-auto leading-relaxed shadow-inner border border-slate-800">
          {repairSQL}
        </pre>
        <button 
          onClick={fetchData} 
          disabled={isLoading}
          className="px-10 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
        >
          {isLoading ? "Verifying..." : "Load Volunteers"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-center md:text-left">
          <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-none">Ministry Volunteers</h2>
          <p className="text-slate-500 text-[7px] md:text-sm font-medium mt-1 md:mt-2">Relational deployment of church human resources.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="px-6 md:px-8 py-3 md:py-3.5 bg-emerald-600 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-sm uppercase tracking-widest shadow-xl shadow-emerald-100 active:scale-95 transition-all hover:bg-emerald-700">Add Volunteer</button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-widest">
              <tr>
                <th className="px-8 py-5">Volunteer Profile</th>
                <th className="px-8 py-5">Ministry / Skill</th>
                <th className="px-8 py-5">Assigned Campus</th>
                <th className="px-8 py-5">Availability</th>
                <th className="px-8 py-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={5} className="px-8 py-12 text-center text-slate-400 italic">Syncing records...</td></tr>
              ) : volunteers.length > 0 ? volunteers.map(v => (
                <tr key={v.id} className="hover:bg-slate-50/50 group transition-all">
                  <td className="px-8 py-5">
                     <p className="text-sm font-black text-slate-800">{v.members?.first_name} {v.members?.last_name}</p>
                     <p className="text-[10px] text-slate-400 uppercase tracking-widest">{v.members?.phone || 'No Contact'}</p>
                  </td>
                  <td className="px-8 py-5">
                     <p className="text-xs font-black text-indigo-600 leading-none mb-1.5">{v.ministry}</p>
                     <p className="text-[10px] text-slate-400 italic leading-none">{v.skill || 'No specific talent recorded'}</p>
                  </td>
                  <td className="px-8 py-5">
                     <span className="text-xs font-bold text-slate-700">{v.branches?.name || '---'}</span>
                  </td>
                  <td className="px-8 py-5 text-xs font-medium text-slate-500">{v.availability}</td>
                  <td className="px-8 py-5 text-right">
                     <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${v.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>{v.status}</span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-medium italic">No workforce assignments recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 overflow-hidden animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-slate-800 mb-8 tracking-tight">Deploy Workforce</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Source from Directory *</label>
                <select value={formData.member_id} onChange={(e) => setFormData({...formData, member_id: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold cursor-pointer transition-all hover:bg-slate-100 shadow-inner" required>
                  <option value="">Search members...</option>
                  {members.map(mb => <option key={mb.id} value={mb.id}>{mb.first_name} {mb.last_name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Assigned Campus *</label>
                <select value={formData.branch_id} onChange={(e) => setFormData({...formData, branch_id: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold cursor-pointer transition-all hover:bg-slate-100 shadow-inner" required>
                  <option value="">Select Location...</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Ministry Dept." value={formData.ministry} onChange={(e) => setFormData({...formData, ministry: e.target.value})} className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold shadow-inner" required />
                <input placeholder="Core Talent/Skill" value={formData.skill} onChange={(e) => setFormData({...formData, skill: e.target.value})} className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold shadow-inner" />
              </div>
              <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-100 active:scale-95 transition-all hover:bg-emerald-700">Authorize Assignment</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolunteersView;
