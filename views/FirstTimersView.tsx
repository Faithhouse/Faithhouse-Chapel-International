
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Branch } from '../types';

interface FirstTimer {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  location_area: string;
  landmark: string;
  marital_status: string;
  invited_by: string;
  visit_date: string;
  prayer_request: string;
  visitor_type: 'First-time' | 'Returning visitor' | 'Member of another church';
  status: 'New' | 'Followed Up' | 'Member';
  created_at: string;
}

interface FirstTimersViewProps {
}

const FirstTimersView: React.FC<FirstTimersViewProps> = () => {
  const [visitors, setVisitors] = useState<FirstTimer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    location_area: '',
    landmark: '',
    marital_status: 'Single',
    invited_by: '',
    visit_date: new Date().toISOString().split('T')[0],
    prayer_request: '',
    visitor_type: 'First-time' as FirstTimer['visitor_type'],
    status: 'New' as FirstTimer['status']
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    setTableMissing(false);
    try {
      const { data: bData } = await supabase.from('branches').select('*').order('name');
      setBranches(bData || []);

      const { data, error } = await supabase
        .from('first_timers')
        .select('*')
        .order('visit_date', { ascending: false });

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') setTableMissing(true);
        else throw error;
      } else {
        setVisitors(data || []);
      }
    } catch (err) {
      console.error('First Timers Sync Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.phone) return alert("Name and Phone are mandatory.");

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('first_timers').insert([{
        full_name: formData.full_name,
        phone: formData.phone,
        location_area: formData.location_area,
        landmark: formData.landmark,
        marital_status: formData.marital_status,
        invited_by: formData.invited_by,
        visit_date: formData.visit_date,
        prayer_request: formData.prayer_request,
        visitor_type: formData.visitor_type,
        status: formData.status
      }]);
      if (error) throw error;
      
      alert(`Successfully logged visitor: ${formData.full_name}`);
      setIsModalOpen(false);
      setFormData({
        full_name: '',
        phone: '',
        location_area: '',
        landmark: '',
        marital_status: 'Single',
        invited_by: '',
        visit_date: new Date().toISOString().split('T')[0],
        prayer_request: '',
        visitor_type: 'First-time',
        status: 'New'
      });
      fetchInitialData();
    } catch (err: any) {
      alert(`Logging Failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (id: string, newStatus: FirstTimer['status']) => {
    try {
      const { error } = await supabase.from('first_timers').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      fetchInitialData();
    } catch (err: any) {
      alert(`Update Failed: ${err.message}`);
    }
  };

  const convertToMember = async (visitor: FirstTimer) => {
    if (!confirm(`Convert ${visitor.full_name} to a full member?`)) return;
    
    setIsSubmitting(true);
    try {
      // 1. Insert into members table
      const names = visitor.full_name.split(' ');
      const firstName = names[0];
      const lastName = names.slice(1).join(' ') || '[Visitor]';

      const { error: insertError } = await supabase.from('members').insert([{
        first_name: firstName,
        last_name: lastName,
        phone: visitor.phone,
        email: visitor.email,
        date_joined: visitor.visit_date || new Date().toISOString().split('T')[0],
        branch_id: branches[0]?.id || '',
        status: 'Active',
        location_area: visitor.location_area,
        landmark: visitor.landmark,
        marital_status: visitor.marital_status,
        invited_by: visitor.invited_by,
        prayer_request: visitor.prayer_request,
        visitor_type: visitor.visitor_type
      }]);

      if (insertError) throw insertError;

      // 2. Update status in first_timers table
      const { error: updateError } = await supabase.from('first_timers').update({ status: 'Member' }).eq('id', visitor.id);
      if (updateError) throw updateError;

      alert(`${visitor.full_name} has been successfully registered as a member.`);
      fetchInitialData();
    } catch (err: any) {
      alert(`Conversion Failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteVisitor = async (id: string, name: string) => {
    if (!confirm(`Permanently remove ${name} from guest registry?`)) return;
    try {
      const { error } = await supabase.from('first_timers').delete().eq('id', id);
      if (error) throw error;
      fetchInitialData();
    } catch (err: any) {
      alert(`Delete Failed: ${err.message}`);
    }
  };

  if (tableMissing) {
    const repairSQL = `-- VISITORS REGISTRY REPAIR
CREATE TABLE IF NOT EXISTS public.first_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  location_area TEXT,
  landmark TEXT,
  marital_status TEXT,
  invited_by TEXT,
  prayer_request TEXT,
  visitor_type TEXT DEFAULT 'First-time',
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'New',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.first_timers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON public.first_timers FOR ALL USING (true) WITH CHECK (true);`;

    return (
      <div className="max-w-4xl mx-auto py-12 px-4 animate-in zoom-in-95">
        <div className="bg-white p-12 rounded-[4rem] shadow-2xl text-center border-b-[16px] border-fh-gold">
          <div className="w-20 h-20 bg-fh-gold/10 text-fh-gold rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
             <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Visitor Registry Reset</h2>
          <p className="text-slate-500 mb-10 text-[11px] font-bold uppercase tracking-widest max-w-lg mx-auto">The guest intake system is not ready. Run the script to authorize.</p>
          <pre className="bg-slate-950 text-fh-gold p-8 rounded-[2rem] text-[10px] font-mono text-left h-48 overflow-y-auto mb-10 shadow-2xl border border-white/5 scrollbar-hide">{repairSQL}</pre>
          <button onClick={fetchInitialData} className="px-16 py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl border-b-4 border-black active:scale-95">Verify Protocols</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      
      <div className="flex justify-end">
        <button onClick={() => setIsModalOpen(true)} className="px-10 py-5 bg-fh-green text-fh-gold rounded-[1.75rem] font-black uppercase tracking-widest text-[10px] shadow-2xl active:scale-95 transition-all border-b-4 border-black/30 flex items-center gap-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Register New Visitor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="royal-card p-10 bg-white rounded-[3rem] border border-slate-100 flex flex-col justify-between group hover:border-fh-gold transition-colors shadow-sm">
           <div>
              <p className="text-[9px] font-black text-fh-gold uppercase tracking-widest mb-2">Total Guests</p>
              <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{visitors.length}</h3>
           </div>
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6">Historical Intake</p>
        </div>
        <div className="royal-card p-10 bg-white rounded-[3rem] border border-slate-100 flex flex-col justify-between group hover:border-emerald-400 transition-colors shadow-sm">
           <div>
              <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2">Pending Follow-up</p>
              <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{visitors.filter(v => v.status === 'New').length}</h3>
           </div>
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6">Action Required</p>
        </div>
        <div className="royal-card p-10 bg-slate-950 text-white rounded-[3rem] flex flex-col justify-between group shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-fh-gold/10 blur-[50px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
           <div className="relative z-10">
              <p className="text-[9px] font-black text-fh-gold uppercase tracking-widest mb-2">Latest Visitor</p>
              <h3 className="text-xl font-black text-white tracking-tight leading-tight">
                {visitors[0] ? visitors[0].full_name : 'No Guests Logged'}
              </h3>
           </div>
           <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-6 relative z-10">Reception System v1.0</p>
        </div>
      </div>

      <div className="cms-card bg-white rounded-[3.5rem] overflow-hidden border-none shadow-sm">
         <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Guest Reception Ledger</h3>
            <span className="px-5 py-1.5 bg-white border border-slate-200 rounded-full text-[9px] font-black text-fh-green uppercase shadow-sm">Intake Monitoring Active</span>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100">
                  <tr>
                    <th className="px-10 py-6">Guest Identity</th>
                    <th className="px-10 py-6">Contact Relay</th>
                    <th className="px-10 py-6">Location & Type</th>
                    <th className="px-10 py-6">Invited By</th>
                    <th className="px-10 py-6 text-right">Status</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {isLoading ? (
                    <tr><td colSpan={5} className="px-10 py-24 text-center animate-pulse text-slate-300 font-black uppercase tracking-[0.5em]">Syncing Guest Array...</td></tr>
                  ) : visitors.length > 0 ? visitors.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-all group">
                       <td className="px-10 py-6">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-slate-900 text-fh-gold rounded-2xl flex items-center justify-center font-black text-xs border border-white/10 shadow-lg">
                                {v.full_name[0]}
                             </div>
                             <div>
                                <p className="font-black text-slate-800 uppercase tracking-tight text-sm">{v.full_name}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{v.visitor_type}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-10 py-6">
                          <p className="text-[11px] font-black text-slate-700">{v.phone}</p>
                          <p className="text-[9px] text-slate-400 lowercase">{v.email || 'no-email'}</p>
                       </td>
                       <td className="px-10 py-6">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                            {v.location_area || 'N/A'}<br/>
                            <span className="text-slate-400 font-medium lowercase">Near {v.landmark || 'N/A'}</span>
                          </p>
                       </td>
                       <td className="px-10 py-6">
                          <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-relaxed">
                            {v.invited_by || 'Walk-in'}<br/>
                            <span className="text-slate-400 text-[8px] font-medium">{new Date(v.visit_date).toLocaleDateString()}</span>
                          </p>
                       </td>
                       <td className="px-10 py-6 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {v.status !== 'Member' && (
                              <button 
                                onClick={() => convertToMember(v)}
                                disabled={isSubmitting}
                                className="px-3 py-1.5 bg-fh-gold/10 text-fh-gold rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-fh-gold hover:text-fh-green transition-all shadow-sm disabled:opacity-50"
                                title="Convert to Full Member"
                              >
                                {isSubmitting ? '...' : 'Register as Member'}
                              </button>
                            )}
                            <select 
                              value={v.status} 
                              disabled={isSubmitting}
                              onChange={(e) => updateStatus(v.id, e.target.value as any)}
                              className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border outline-none cursor-pointer disabled:opacity-50 ${
                                v.status === 'New' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                v.status === 'Followed Up' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                'bg-emerald-50 text-emerald-600 border-emerald-100'
                              }`}
                            >
                               <option value="New">New</option>
                               <option value="Followed Up">Followed Up</option>
                               <option value="Member">Member</option>
                            </select>
                            <button onClick={() => deleteVisitor(v.id, v.full_name)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                       </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="px-10 py-32 text-center text-slate-300 font-black uppercase tracking-widest italic opacity-50">No Guests Logged in Registry.</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md animate-in fade-in" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-3xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border-b-[16px] border-fh-gold">
             <div className="p-12 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
               <div className="flex items-center gap-6">
                 <div className="w-16 h-16 bg-fh-green text-fh-gold rounded-[2rem] flex items-center justify-center shadow-xl">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                 </div>
                 <div>
                    <h3 className="text-3xl font-black text-fh-green uppercase leading-none tracking-tighter">Visitor Intake</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-2">Create Visitor Record</p>
                 </div>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-5 hover:bg-slate-100 rounded-full transition-all text-slate-400 active:scale-90"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <form onSubmit={handleCreateVisitor} className="p-12 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
               <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Full Name *</label>
                 <input required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} placeholder="e.g. John Doe" className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner" />
               </div>

               <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Phone Number *</label>
                 <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+233..." className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner" />
               </div>

               <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Location / Area</label>
                    <input value={formData.location_area} onChange={e => setFormData({...formData, location_area: e.target.value})} placeholder="e.g. East Legon" className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Landmark</label>
                    <input value={formData.landmark} onChange={e => setFormData({...formData, landmark: e.target.value})} placeholder="e.g. Near Shell Signboard" className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner" />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Marital Status</label>
                    <select value={formData.marital_status} onChange={e => setFormData({...formData, marital_status: e.target.value})} className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner appearance-none cursor-pointer">
                       <option>Single</option>
                       <option>Married</option>
                       <option>Widowed</option>
                       <option>Divorced</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Date of Visit</label>
                    <input type="date" value={formData.visit_date} onChange={e => setFormData({...formData, visit_date: e.target.value})} className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner" />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Who Invited You?</label>
                    <input value={formData.invited_by} onChange={e => setFormData({...formData, invited_by: e.target.value})} placeholder="Name of inviter..." className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Visitor Type</label>
                    <select value={formData.visitor_type} onChange={e => setFormData({...formData, visitor_type: e.target.value as any})} className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner appearance-none cursor-pointer">
                       <option value="First-time">1. First-time</option>
                       <option value="Returning visitor">2. Returning visitor</option>
                       <option value="Member of another church">3. Member of another church</option>
                    </select>
                  </div>
               </div>

               <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Prayer Request</label>
                 <textarea value={formData.prayer_request} onChange={e => setFormData({...formData, prayer_request: e.target.value})} rows={3} placeholder="Any specific needs or prayer requests..." className="w-full p-8 bg-slate-50 border border-slate-200 rounded-[2.5rem] font-bold text-slate-600 shadow-inner leading-relaxed resize-none italic" />
               </div>

               <button type="submit" disabled={isSubmitting} className="w-full py-7 bg-fh-green text-fh-gold rounded-[2rem] font-black uppercase text-xs tracking-[0.4em] shadow-2xl active:scale-95 transition-all border-b-4 border-black/30 flex items-center justify-center gap-4">
                  {isSubmitting ? <div className="w-6 h-6 border-2 border-fh-gold/50 border-t-fh-gold animate-spin rounded-full" /> : "Authorize Guest Entry"}
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FirstTimersView;
