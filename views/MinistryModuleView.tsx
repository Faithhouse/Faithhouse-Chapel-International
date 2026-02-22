import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Member } from '../types';

interface MinistryModuleViewProps {
  ministryName: string;
  userProfile: UserProfile | null;
}

const MinistryModuleView: React.FC<MinistryModuleViewProps> = ({ ministryName, userProfile }) => {
  const [activeTab, setActiveTab] = useState<'Overview' | 'Personnel' | 'Operations' | 'Resources'>('Overview');
  const [ministryMembers, setMinistryMembers] = useState<Member[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  useEffect(() => {
    fetchPersonnel();
  }, [ministryName]);

  const fetchPersonnel = async () => {
    setIsLoading(true);
    try {
      // 1. Get members currently assigned to this specific ministry
      const { data: assigned, error: assignedErr } = await supabase
        .from('members')
        .select('*')
        .eq('ministry', ministryName)
        .order('first_name');
      
      if (assignedErr) throw assignedErr;
      setMinistryMembers(assigned || []);

      // 2. Get ALL members so we can pick from them in the "Add" modal
      const { data: available, error: availableErr } = await supabase
        .from('members')
        .select('*')
        .order('first_name');
      
      if (availableErr) throw availableErr;
      setAllMembers(available || []);
    } catch (err) {
      console.error('Personnel Sync Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) return;

    setIsSubmitting(true);
    try {
      // This updates the 'ministry' column for that specific member in Supabase
      const { error } = await supabase
        .from('members')
        .update({ ministry: ministryName })
        .eq('id', selectedMemberId);

      if (error) throw error;

      // Reset UI state
      setIsAddModalOpen(false);
      setSelectedMemberId('');
      setMemberSearchTerm('');
      
      // Refresh the list so the new member shows up immediately
      await fetchPersonnel();
      alert(`Successfully added to ${ministryName}`);
    } catch (err: any) {
      console.error('Member Assignment Error:', err);
      alert('Failed to provision member: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeMember = async (id: string, name: string) => {
    if (!confirm(`Revoke ministry assignment for ${name}?`)) return;
    
    setIsLoading(true);
    try {
      // Sets the ministry back to 'N/A' or empty
      const { error } = await supabase
        .from('members')
        .update({ ministry: 'N/A' })
        .eq('id', id);

      if (error) throw error;
      await fetchPersonnel();
    } catch (err: any) {
      console.error('Removal Error:', err);
      alert('Revoke failed: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter members for the search dropdown: 
  // 1. Don't show people already in THIS ministry.
  // 2. Filter by search text.
  const filteredAvailableMembers = allMembers.filter(m => 
    m.ministry !== ministryName && 
    (`${m.first_name} ${m.last_name}`).toLowerCase().includes(memberSearchTerm.toLowerCase())
  ).slice(0, 10); // Limit to top 10 for performance

  const getMinistryConfig = () => {
    // Ensuring every case returns a valid object to avoid "Missing Initializer" errors
    const base = {
       icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16',
       accent: 'text-slate-600',
       bg: 'bg-slate-50',
       opsLabel: 'Departmental Logistics',
       kpi1: 'Deployment', kpi1Val: 'Active',
       kpi2: 'Team Count', kpi2Val: ministryMembers.length.toString(),
       kpi3: 'Vitality Score', kpi3Val: '92%'
    };

    switch (ministryName) {
      case 'Media Ministry':
        return { ...base, icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', accent: 'text-cyan-500', bg: 'bg-cyan-50', opsLabel: 'Technical Asset Management', kpi1: 'Stream Uptime', kpi1Val: '99.8%' };
      case 'Music Ministry':
        return { ...base, icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3', accent: 'text-indigo-600', bg: 'bg-indigo-50', opsLabel: 'Ensemble Control', kpi1: 'Vocal Ensemble', kpi1Val: '32' };
      case 'Prayer Ministry':
        return { ...base, icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', accent: 'text-rose-600', bg: 'bg-rose-50', opsLabel: 'Intercession Registry', kpi1: 'Active Warriors', kpi1Val: '18' };
      case 'Ushering Ministry':
        return { ...base, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', accent: 'text-amber-600', bg: 'bg-amber-50', opsLabel: 'Hospitality Protocols', kpi1: 'Ushers on Duty', kpi1Val: '12' };
      case 'Evangelism':
        return { ...base, icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z', accent: 'text-emerald-600', bg: 'bg-emerald-50', opsLabel: 'Souls Tracking', kpi1: 'Fields Active', kpi1Val: '4' };
      case 'Children Ministry':
        return { ...base, icon: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', accent: 'text-orange-500', bg: 'bg-orange-50', opsLabel: 'Curriculum Oversight', kpi1: 'Educators', kpi1Val: '10' };
      default:
        return base;
    }
  };

  const cfg = getMinistryConfig();

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 pb-20">
      
      {/* 1. Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 py-4 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-6">
          <div className={`w-20 h-20 ${cfg.bg} ${cfg.accent} rounded-[2.5rem] flex items-center justify-center shadow-xl border-4 border-white ring-1 ring-slate-100 transform hover:rotate-3 transition-transform`}>
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={cfg.icon} /></svg>
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-fh-gold/10 rounded-full mb-1">
               <span className="w-1.5 h-1.5 rounded-full bg-fh-gold animate-pulse"></span>
               <span className="text-[10px] font-black text-fh-gold uppercase tracking-[0.2em]">Oversight Active</span>
            </div>
            <h2 className="text-4xl font-black text-fh-green tracking-tighter uppercase leading-none">{ministryName}</h2>
          </div>
        </div>

        <div className="flex bg-slate-50 p-1.5 rounded-[1.75rem] border border-slate-200">
            {(['Overview', 'Personnel', 'Operations', 'Resources'] as const).map((tab) => (
             <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab ? 'bg-fh-green text-fh-gold shadow-lg' : 'text-slate-400 hover:text-fh-green'}`}
             >
               {tab}
             </button>
            ))}
        </div>
      </div>

      {activeTab === 'Personnel' && (
        <div className="royal-card rounded-[3.5rem] bg-white overflow-hidden shadow-sm border border-slate-100 animate-in fade-in duration-500">
           <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30">
              <div>
                 <h3 className="text-2xl font-black text-fh-green uppercase tracking-tighter">Ministry Workforce</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Departmental Node Registry</p>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(true)} 
                className="px-10 py-4 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl active:scale-95 transition-all border-b-4 border-black/30 flex items-center gap-3"
              >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                 Provision Staff
              </button>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100">
                    <tr>
                       <th className="px-10 py-6">Staff Identity</th>
                       <th className="px-10 py-6">Relay Contact</th>
                       <th className="px-10 py-6 text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {isLoading ? (
                      <tr><td colSpan={3} className="px-10 py-20 text-center text-slate-300 font-black uppercase tracking-widest animate-pulse">Syncing...</td></tr>
                    ) : ministryMembers.length > 0 ? ministryMembers.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50 transition-all group">
                        <td className="px-10 py-6">
                           <div className="flex items-center gap-5">
                              <div className="w-12 h-12 bg-slate-900 text-fh-gold rounded-xl flex items-center justify-center font-black text-xs uppercase">
                                {m.first_name[0]}{m.last_name ? m.last_name[0] : ''}
                              </div>
                              <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{m.first_name} {m.last_name}</p>
                           </div>
                        </td>
                        <td className="px-10 py-6 text-[10px] font-bold text-slate-500 uppercase">{m.phone || 'NO PHONE'}</td>
                        <td className="px-10 py-6 text-right">
                           <button onClick={() => removeMember(m.id, m.first_name)} className="p-3 text-slate-300 hover:text-rose-500 transition-all">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                           </button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={3} className="px-10 py-32 text-center text-slate-300 uppercase tracking-widest italic opacity-50">Empty Department.</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* MODAL SECTION - ADD MEMBER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => !isSubmitting && setIsAddModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border-b-[12px] border-fh-gold">
            <div className="p-8 bg-slate-50 flex items-center justify-between border-b border-slate-100">
               <h3 className="text-2xl font-black text-fh-green uppercase tracking-tighter">Deploy Personnel</h3>
               <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-black"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <form onSubmit={handleAddMember} className="p-8 space-y-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Search Global Registry</label>
                 <input 
                    type="text" 
                    placeholder="Type name here..."
                    value={memberSearchTerm}
                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-fh-gold/20 transition-all"
                 />
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Select Identity</label>
                 <select 
                    required
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-fh-gold/20 transition-all appearance-none"
                 >
                    <option value="">{filteredAvailableMembers.length > 0 ? '-- Select a Member --' : 'No Results Found'}</option>
                    {filteredAvailableMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                    ))}
                 </select>
               </div>

               <button 
                 type="submit" 
                 disabled={isSubmitting || !selectedMemberId} 
                 className="w-full py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:translate-y-[-2px] active:translate-y-0 transition-all disabled:opacity-50"
               >
                 {isSubmitting ? 'Processing...' : `Confirm Deployment to ${ministryName}`}
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MinistryModuleView;