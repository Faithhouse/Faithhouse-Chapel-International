
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';

interface Leader {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  category: 'Pastor' | 'Minister' | 'Ministry Head/Deputy' | 'Worker';
  department: string;
  email: string;
  phone: string;
  image_url?: string;
}

const categories = ['Pastor', 'Minister', 'Ministry Head/Deputy', 'Worker'] as const;

const LeadershipView: React.FC<{ userProfile: UserProfile | null }> = ({ userProfile }) => {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [editingLeader, setEditingLeader] = useState<Partial<Leader> | null>(null);

  useEffect(() => {
    fetchLeaders();
  }, []);

  const fetchLeaders = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('leadership').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setLeaders(data || []);
    } catch (err) {
      console.warn("Leadership table might not exist yet. Using sample data.");
      setLeaders([
        { id: '1', first_name: 'John', last_name: 'Doe', position: 'Head Pastor', category: 'Pastor', department: 'General', email: 'john@faithhouse.church', phone: '+233 24 000 0001' },
        { id: '2', first_name: 'Jane', last_name: 'Smith', position: 'Associate Pastor', category: 'Pastor', department: 'Worship', email: 'jane@faithhouse.church', phone: '+233 24 000 0002' },
        { id: '3', first_name: 'Samuel', last_name: 'Mensah', position: 'Senior Minister', category: 'Minister', department: 'Finance', email: 'samuel@faithhouse.church', phone: '+233 24 000 0003' },
        { id: '4', first_name: 'Grace', last_name: 'Appiah', position: 'Media Head', category: 'Ministry Head/Deputy', department: 'Media', email: 'grace@faithhouse.church', phone: '+233 24 000 0004' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLeaders = activeCategory === 'All' 
    ? leaders 
    : leaders.filter(l => l.category === activeCategory);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const leaderData = {
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      position: formData.get('position') as string,
      category: formData.get('category') as any,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      department: formData.get('department') as string,
    };

    try {
      if (editingLeader?.id) {
        const { error } = await supabase
          .from('leadership')
          .update(leaderData)
          .eq('id', editingLeader.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('leadership').insert([leaderData]);
        if (error) throw error;
      }
      fetchLeaders();
      setIsModalOpen(false);
      setEditingLeader(null);
    } catch (err: any) {
      console.error("Supabase Save Error:", err);
      alert(`VAULT ERROR: ${err.message || "Unknown database error"}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this leader from the registry?")) return;
    
    try {
      const { error } = await supabase.from('leadership').delete().eq('id', id);
      if (error) throw error;
      setLeaders(leaders.filter(l => l.id !== id));
    } catch (err) {
      alert("Failed to delete leader.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Church Leadership</h2>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em]">Governance & Oversight Node</p>
        </div>
        <button 
          onClick={() => { setEditingLeader({}); setIsModalOpen(true); }}
          className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 transition-all active:scale-95 shadow-xl"
        >
          Appoint New Leader
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {['All', ...categories].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
          >
            {cat}s
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-56 bg-white rounded-[2rem] animate-pulse border border-slate-100"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredLeaders.map((leader) => (
            <div key={leader.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-50 hover:shadow-md transition-shadow group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[4rem] -mr-12 -mt-12 transition-transform group-hover:scale-110"></div>
              
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl mb-4 shadow-lg">
                  {leader.first_name[0]}{leader.last_name[0]}
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate w-full">{leader.first_name} {leader.last_name}</h3>
                <div className="flex flex-col items-center mt-1">
                  <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{leader.position}</p>
                  <span className="mt-2 px-2 py-0.5 bg-slate-100 rounded-full text-[7px] font-black text-slate-400 uppercase tracking-wider">{leader.category}</span>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-50 w-full space-y-2">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <span className="text-[10px] font-medium truncate max-w-full">{leader.email}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    <span className="text-[10px] font-medium">{leader.phone}</span>
                  </div>
                </div>

                <div className="mt-6 flex gap-2">
                  <button 
                    onClick={() => { setEditingLeader(leader); setIsModalOpen(true); }}
                    className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button 
                    onClick={() => handleDelete(leader.id)}
                    className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                {editingLeader?.id ? 'Edit Leader Details' : 'Leader Appointment'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); setEditingLeader(null); }} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">First Name</label>
                  <input name="first_name" defaultValue={editingLeader?.first_name} required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Last Name</label>
                  <input name="last_name" defaultValue={editingLeader?.last_name} required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Category</label>
                  <select name="category" defaultValue={editingLeader?.category} required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all">
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Position / Title</label>
                  <input name="position" defaultValue={editingLeader?.position} required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all" placeholder="e.g. Head Pastor, Elder" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Email Address</label>
                  <input name="email" defaultValue={editingLeader?.email} type="email" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Phone Number</label>
                  <input name="phone" defaultValue={editingLeader?.phone} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Department</label>
                <input name="department" defaultValue={editingLeader?.department} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all" />
              </div>
              <div className="pt-6">
                <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-blue-600 transition-all active:scale-[0.98]">
                  {editingLeader?.id ? 'Update Registry' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadershipView;
