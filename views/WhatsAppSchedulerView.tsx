
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, ScheduledMessage, Branch, Member, AttendanceEvent } from '../types';

interface WhatsAppSchedulerViewProps {
  userProfile: UserProfile | null;
}

const WhatsAppSchedulerView: React.FC<WhatsAppSchedulerViewProps> = ({ userProfile }) => {
  const [activeTab, setActiveTab] = useState<'Ledger' | 'Gateway' | 'Direct'>('Ledger');
  const [schedules, setSchedules] = useState<ScheduledMessage[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [attendanceEvents, setAttendanceEvents] = useState<AttendanceEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  
  // Gateway Config State
  const [config, setConfig] = useState({
    api_url: '',
    access_token: '',
    sender_number: '',
    provider: 'Meta Official API'
  });

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target_group: 'All' as ScheduledMessage['target_group'],
    branch_context: '',
    event_id: '',
  });

  const [scheduledTimes, setScheduledTimes] = useState<string[]>(['']);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    setTableMissing(false);
    try {
      const { data: bData } = await supabase.from('branches').select('*').order('name');
      setBranches(bData || []);

      const { data: mData } = await supabase.from('members').select('*').order('first_name');
      setMembers(mData || []);

      const { data: eData } = await supabase.from('attendance_events').select('*').order('event_date', { ascending: false });
      setAttendanceEvents(eData || []);

      // Fetch Config
      const { data: cData } = await supabase.from('whatsapp_config').select('*').single();
      if (cData) setConfig(cData);

      const { data: sData, error } = await supabase
        .from('whatsapp_schedules')
        .select('*')
        .order('scheduled_for', { ascending: true });

      if (error) {
        if (error.code === '42P01' || error.code === '42703') setTableMissing(true);
        else throw error;
      } else {
        setSchedules(sData || []);
      }
    } catch (err) {
      console.error('WhatsApp Sync Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveGatewayConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('whatsapp_config').upsert([{ 
        ...config, 
        updated_at: new Date().toISOString() 
      }]);
      if (error) throw error;
      alert("Official Gateway Protocol Linked Successfully.");
    } catch (err: any) {
      alert(`Configuration Failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTimeSlot = () => setScheduledTimes([...scheduledTimes, '']);
  const removeTimeSlot = (index: number) => {
    if (scheduledTimes.length > 1) setScheduledTimes(scheduledTimes.filter((_, i) => i !== index));
  };
  const updateTimeSlot = (index: number, value: string) => {
    const updated = [...scheduledTimes];
    updated[index] = value;
    setScheduledTimes(updated);
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message) return alert("Fill mandatory fields.");
    const validTimes = scheduledTimes.filter(t => t !== '');
    if (validTimes.length === 0) return alert("At least one dispatch time is required.");

    setIsSubmitting(true);
    try {
      const payloads = validTimes.map(time => ({
        ...formData,
        scheduled_for: time,
        status: 'Pending',
        created_by: userProfile?.id,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase.from('whatsapp_schedules').insert(payloads);
      if (error) throw error;
      
      alert(`Successfully scheduled ${payloads.length} broadcast intervals.`);
      setIsModalOpen(false);
      setFormData({ title: '', message: '', target_group: 'All', branch_context: '', event_id: '' });
      setScheduledTimes(['']);
      fetchInitialData();
    } catch (err: any) {
      alert(`Scheduling Failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm('Permanent Deletion?')) return;
    try {
      await supabase.from('whatsapp_schedules').delete().eq('id', id);
      fetchInitialData();
    } catch (err) { console.error(err); }
  };

  if (tableMissing) {
    const repairSQL = `-- WHATSAPP HUB MASTER REPAIR & SCHEMA UPDATE
CREATE TABLE IF NOT EXISTS public.whatsapp_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  api_url TEXT,
  access_token TEXT,
  sender_number TEXT,
  provider TEXT DEFAULT 'Meta Official API',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT one_row CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS public.whatsapp_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  target_group TEXT DEFAULT 'All',
  branch_context TEXT,
  event_id UUID,
  status TEXT DEFAULT 'Pending',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ENSURE COLUMNS EXIST FOR EXISTING TABLES
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_schedules' AND column_name='scheduled_for') THEN
    ALTER TABLE public.whatsapp_schedules ADD COLUMN scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_schedules' AND column_name='event_id') THEN
    ALTER TABLE public.whatsapp_schedules ADD COLUMN event_id UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_schedules' AND column_name='target_group') THEN
    ALTER TABLE public.whatsapp_schedules ADD COLUMN target_group TEXT DEFAULT 'All';
  END IF;
END $$;

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON public.whatsapp_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.whatsapp_schedules FOR ALL USING (true) WITH CHECK (true);`;

    return (
      <div className="max-w-4xl mx-auto py-12 px-4 animate-in zoom-in-95">
        <div className="bg-white p-12 rounded-[4rem] shadow-2xl text-center border-b-[16px] border-emerald-500">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
             <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">WhatsApp Hub Reset</h2>
          <p className="text-slate-500 mb-10 text-[11px] font-bold uppercase tracking-widest max-w-lg mx-auto">The communication system is not ready. Run the script to authorize.</p>
          <pre className="bg-slate-950 text-fh-gold p-8 rounded-[2rem] text-[10px] font-mono text-left h-48 overflow-y-auto mb-10 shadow-2xl border border-white/5 scrollbar-hide">{repairSQL}</pre>
          <button onClick={fetchInitialData} className="px-16 py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl border-b-4 border-black active:scale-95">Verify Protocols</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-fh-green tracking-tighter uppercase leading-none">WhatsApp Broadcast Hub</h2>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">Official Communication Gateway</p>
        </div>
        <div className="flex gap-4">
            <div className="flex bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm">
               <button onClick={() => setActiveTab('Ledger')} className={`px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'Ledger' ? 'bg-fh-green text-fh-gold shadow-lg' : 'text-slate-400'}`}>Dispatch Ledger</button>
               <button onClick={() => setActiveTab('Direct')} className={`px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'Direct' ? 'bg-fh-green text-fh-gold shadow-lg' : 'text-slate-400'}`}>Direct Relay</button>
               <button onClick={() => setActiveTab('Gateway')} className={`px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'Gateway' ? 'bg-fh-green text-fh-gold shadow-lg' : 'text-slate-400'}`}>Gateway Link</button>
            </div>
            {activeTab === 'Ledger' && (
              <button onClick={() => setIsModalOpen(true)} className="px-10 py-5 bg-fh-green text-fh-gold rounded-[1.75rem] font-black uppercase tracking-widest text-[10px] shadow-2xl active:scale-95 transition-all border-b-4 border-black/30 flex items-center gap-3">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                 Bulk Dispatch
              </button>
            )}
        </div>
      </div>

      {activeTab === 'Ledger' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="royal-card p-10 bg-white rounded-[3rem] border border-slate-100 flex flex-col justify-between group hover:border-emerald-400 transition-colors shadow-sm">
               <div>
                  <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2">Relay Queue</p>
                  <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{schedules.filter(s => s.status === 'Pending').length}</h3>
               </div>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6">Future Signals</p>
            </div>
            <div className="royal-card p-10 bg-white rounded-[3rem] border border-slate-100 flex flex-col justify-between group hover:border-blue-400 transition-colors shadow-sm">
               <div>
                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-2">Gateway Status</p>
                  <h3 className={`text-xl font-black tracking-tight ${config.api_url ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {config.api_url ? 'LINKED' : 'UNLINKED'}
                  </h3>
               </div>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6">{config.provider}</p>
            </div>
            <div className="royal-card p-10 bg-slate-950 text-white rounded-[3rem] flex flex-col justify-between group shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
               <div className="relative z-10">
                  <p className="text-[9px] font-black text-fh-gold uppercase tracking-widest mb-2">Next Scheduled Activity</p>
                  <h3 className="text-xl font-black text-white tracking-tight leading-tight">
                    {schedules.find(s => s.status === 'Pending')?.title || 'No Pending Relay'}
                  </h3>
               </div>
               <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-6 relative z-10">Automation System v2.1</p>
            </div>
          </div>

          <div className="cms-card bg-white rounded-[3.5rem] overflow-hidden border-none shadow-sm">
             <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Transmission Ledger</h3>
                <span className="px-5 py-1.5 bg-white border border-slate-200 rounded-full text-[9px] font-black text-fh-green uppercase shadow-sm">Relay Monitoring Active</span>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100">
                      <tr>
                        <th className="px-10 py-6">Mission / Message</th>
                        <th className="px-10 py-6">Target Audience</th>
                        <th className="px-10 py-6">Scheduled Slot</th>
                        <th className="px-10 py-6 text-right">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {isLoading ? (
                        <tr><td colSpan={4} className="px-10 py-24 text-center animate-pulse text-slate-300 font-black uppercase tracking-[0.5em]">Syncing Broadcast Array...</td></tr>
                      ) : schedules.length > 0 ? schedules.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50 transition-all group">
                           <td className="px-10 py-6 max-w-sm">
                              <p className="font-black text-slate-800 uppercase tracking-tight mb-2">{s.title}</p>
                              <p className="text-[10px] text-slate-500 line-clamp-1 italic">"{s.message}"</p>
                           </td>
                           <td className="px-10 py-6">
                              <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 shadow-sm">
                                {s.target_group} {s.event_id ? '• Service' : ''} {s.branch_context ? `• ${s.branch_context}` : ''}
                              </span>
                           </td>
                           <td className="px-10 py-6">
                              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-0.5">{new Date(s.scheduled_for).toLocaleDateString()}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(s.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                           </td>
                           <td className="px-10 py-6 text-right">
                              <div className="flex items-center justify-end gap-4">
                                 <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                   s.status === 'Sent' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                   s.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-400'
                                 }`}>{s.status}</span>
                                 {s.status === 'Pending' && (
                                   <button onClick={() => deleteSchedule(s.id)} className="p-2 text-slate-200 hover:text-rose-500 transition-colors active:scale-90"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                 )}
                              </div>
                           </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={4} className="px-10 py-32 text-center text-slate-300 font-black uppercase tracking-widest italic opacity-50">Interval Array Empty.</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        </>
      ) : activeTab === 'Direct' ? (
        <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
           <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center shadow-xl">
                       <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </div>
                    <div>
                       <h3 className="text-3xl font-black text-slate-900 uppercase leading-none tracking-tighter">Direct Relay</h3>
                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-2">Individual Outreach</p>
                    </div>
                 </div>
              </div>

              <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
                 <div className="space-y-6">
                    <div className="relative">
                       <svg className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                       <input 
                          type="text" 
                          placeholder="Search Identity..." 
                          className="w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-xs uppercase outline-none focus:ring-8 focus:ring-emerald-500/5 transition-all"
                          onChange={(e) => {
                             const term = e.target.value.toLowerCase();
                             // Filter logic here or just use a state
                          }}
                       />
                    </div>
                    <div className="h-[400px] overflow-y-auto pr-4 space-y-3 scrollbar-hide">
                       {members.slice(0, 10).map(m => (
                          <div key={m.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:border-emerald-400 transition-all group cursor-pointer">
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-900 text-fh-gold rounded-xl flex items-center justify-center font-black text-[10px]">
                                   {m.first_name[0]}{m.last_name[0]}
                                </div>
                                <div>
                                   <p className="text-xs font-black text-slate-800 uppercase">{m.first_name} {m.last_name}</p>
                                   <p className="text-[9px] text-slate-400 font-bold uppercase">{m.phone || 'No Phone'}</p>
                                </div>
                             </div>
                             <button 
                                onClick={() => {
                                   if (!m.phone) return alert("No phone linked.");
                                   const msg = `Shalom ${m.first_name}! 🕊️ Greetings from Faithhouse Chapel International.`;
                                   window.open(`https://wa.me/${m.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                                }}
                                className="p-3 bg-emerald-50 text-emerald-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-500 hover:text-white"
                             >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 448 512"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.6-30.6-37.9-3.2-5.5-.3-8.5 2.5-11.2 2.5-2.5 5.5-6.5 8.3-9.7 2.8-3.3 3.7-5.6 5.6-9.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.3 5.7 23.6 9.2 31.7 11.7 13.3 4.2 25.5 3.6 35.1 2.2 10.7-1.5 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
                             </button>
                          </div>
                       ))}
                    </div>
                 </div>
                 <div className="bg-slate-950 rounded-[3rem] p-10 text-white relative overflow-hidden flex flex-col justify-center text-center">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full"></div>
                    <div className="relative z-10 space-y-6">
                       <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-white/10">
                          <svg className="w-10 h-10 text-fh-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                       </div>
                       <h4 className="text-2xl font-black uppercase tracking-tight">Quick Relay</h4>
                       <p className="text-slate-400 text-xs font-medium leading-relaxed uppercase tracking-widest">Select a congregant to start a direct communication link via the official gateway.</p>
                       <div className="pt-6">
                          <span className="px-6 py-3 bg-white/5 border border-white/10 rounded-full text-[9px] font-black text-fh-gold uppercase tracking-[0.3em]">Ready for Dispatch</span>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto py-4 animate-in slide-in-from-right-4 duration-500">
           <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-100 overflow-hidden border-b-[16px] border-fh-gold">
              <div className="p-12 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-6">
                   <div className="w-16 h-16 bg-slate-900 text-fh-gold rounded-[2rem] flex items-center justify-center shadow-xl">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
                   </div>
                   <div>
                      <h3 className="text-3xl font-black text-slate-900 uppercase leading-none tracking-tighter">Gateway Link</h3>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-2">Authorize Official Platform Connection</p>
                   </div>
                </div>
              </div>

              <form onSubmit={saveGatewayConfig} className="p-12 space-y-10">
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Official API Provider</label>
                       <select value={config.provider} onChange={e => setConfig({...config, provider: e.target.value})} className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 outline-none transition-all">
                          <option>Meta Official API</option>
                          <option>Twilio for WhatsApp</option>
                          <option>Third-Party System (UltraMsg/Wati)</option>
                          <option>Manual Browser Bridge</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Official Sender Number</label>
                       <input required placeholder="e.g. +233200000000" value={config.sender_number} onChange={e => setConfig({...config, sender_number: e.target.value})} className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner" />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Official API Endpoint URL (The Link)</label>
                    <input required type="url" placeholder="https://graph.facebook.com/v17.0/..." value={config.api_url} onChange={e => setConfig({...config, api_url: e.target.value})} className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner" />
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-2 px-4 italic">* Provide the destination link for automated relays.</p>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Permanent Access Token</label>
                    <input required type="password" placeholder="••••••••••••••••••••••••" value={config.access_token} onChange={e => setConfig({...config, access_token: e.target.value})} className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner" />
                 </div>

                 <div className="bg-emerald-50/50 p-8 rounded-[2.5rem] border border-emerald-100 flex items-start gap-4">
                    <svg className="w-6 h-6 text-emerald-500 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    <p className="text-[10px] text-emerald-600 font-bold leading-relaxed uppercase tracking-tighter">Identity Linked: Once saved, the automation engine will use these credentials for all background dispatches. Ensure your API token has "whatsapp_business_messaging" permissions.</p>
                 </div>

                 <button type="submit" disabled={isSubmitting} className="w-full py-7 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.4em] shadow-2xl active:scale-95 transition-all border-b-4 border-black/30 flex items-center justify-center gap-4">
                    {isSubmitting ? <div className="w-6 h-6 border-2 border-white/50 border-t-white animate-spin rounded-full" /> : "Authorize & Lock Gateway"}
                 </button>
              </form>
           </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md animate-in fade-in" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border-b-[16px] border-emerald-500">
             <div className="p-12 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
               <div className="flex items-center gap-6">
                 <div className="w-16 h-16 bg-fh-green text-fh-gold rounded-[2rem] flex items-center justify-center shadow-xl">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8" /></svg>
                 </div>
                 <div>
                    <h3 className="text-3xl font-black text-fh-green uppercase leading-none tracking-tighter">Multi-Slot Dispatch</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-2">Start Multiple Daily Reminders</p>
                 </div>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-5 hover:bg-slate-100 rounded-full transition-all text-slate-400 active:scale-90"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <form onSubmit={handleCreateSchedule} className="p-12 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
               <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Relay Identification</label>
                 <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Service Day Reminders" className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner" />
               </div>

               <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Audience Cluster</label>
                    <select value={formData.target_group} onChange={e => setFormData({...formData, target_group: e.target.value as any})} className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner appearance-none cursor-pointer">
                       <option>All</option>
                       <option>Active Members</option>
                       <option>Visitors</option>
                       <option>Ministry Heads</option>
                       <option>Absentees</option>
                    </select>
                  </div>
                  {formData.target_group === 'Absentees' ? (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Service Session</label>
                      <select required value={formData.event_id} onChange={e => setFormData({...formData, event_id: e.target.value})} className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner appearance-none cursor-pointer">
                         <option value="">Select Service...</option>
                         {attendanceEvents.map(ev => (
                           <option key={ev.id} value={ev.id}>{new Date(ev.event_date).toLocaleDateString()} - {ev.event_name}</option>
                         ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Local Context</label>
                      <select value={formData.branch_context} onChange={e => setFormData({...formData, branch_context: e.target.value})} className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner appearance-none cursor-pointer">
                         <option value="">Global Network</option>
                         {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                      </select>
                    </div>
                  )}
               </div>

               <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Message Payload</label>
                 <textarea required value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} rows={4} placeholder="Draft WhatsApp payload..." className="w-full p-8 bg-slate-50 border border-slate-200 rounded-[2.5rem] font-bold text-slate-600 shadow-inner leading-relaxed resize-none italic" />
               </div>

               {/* MULTI-TIME SLOT COMPONENT */}
               <div className="space-y-4">
                 <div className="flex items-center justify-between px-4">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Scheduled Dispatch Intervals</label>
                    <button type="button" onClick={addTimeSlot} className="text-[9px] font-black text-cms-blue uppercase tracking-widest hover:underline">+ Add Time Slot</button>
                 </div>
                 
                 <div className="space-y-3">
                   {scheduledTimes.map((time, idx) => (
                     <div key={idx} className="flex gap-4 items-center animate-in slide-in-from-left-2 duration-300">
                        <div className="flex-1 relative">
                           <input 
                              required 
                              type="datetime-local" 
                              value={time} 
                              onChange={e => updateTimeSlot(idx, e.target.value)} 
                              className="w-full px-8 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-800 shadow-inner" 
                           />
                           <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-emerald-500 rounded-full flex items-center justify-center text-[8px] font-black text-emerald-600 shadow-sm">{idx + 1}</div>
                        </div>
                        {scheduledTimes.length > 1 && (
                          <button type="button" onClick={() => removeTimeSlot(idx)} className="p-4 text-slate-300 hover:text-rose-500 transition-colors">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                     </div>
                   ))}
                 </div>
               </div>

               <div className="bg-emerald-50/50 p-8 rounded-[2.5rem] border border-emerald-100 flex items-start gap-4">
                  <svg className="w-6 h-6 text-emerald-500 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-[10px] text-emerald-600 font-bold leading-relaxed uppercase tracking-tighter">Queue: Individual relay points will be established for each slot. Ensure sufficient buffer between daily signals to optimize engagement.</p>
               </div>

               <button type="submit" disabled={isSubmitting} className="w-full py-7 bg-fh-green text-fh-gold rounded-[2rem] font-black uppercase text-xs tracking-[0.4em] shadow-2xl active:scale-95 transition-all border-b-4 border-black/30 flex items-center justify-center gap-4">
                  {isSubmitting ? <div className="w-6 h-6 border-2 border-fh-gold/50 border-t-fh-gold animate-spin rounded-full" /> : "Authorize Multi-Slot Relay"}
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppSchedulerView;
