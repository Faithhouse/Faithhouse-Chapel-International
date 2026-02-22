
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Branch, AttendanceEvent } from '../types';

interface ScheduledVisitationMessage {
  id: string;
  title: string;
  message: string;
  scheduled_for: string;
  target_group?: string;
  event_id?: string;
  status: string;
  created_at: string;
}

interface VisitationWhatsAppViewProps {
  userProfile: UserProfile | null;
}

const VisitationWhatsAppView: React.FC<VisitationWhatsAppViewProps> = ({ userProfile }) => {
  const [activeSubTab, setActiveSubTab] = useState<'Ledger' | 'Instant'>('Ledger');
  const [schedules, setSchedules] = useState<ScheduledVisitationMessage[]>([]);
  const [attendanceEvents, setAttendanceEvents] = useState<AttendanceEvent[]>([]);
  const [absentees, setAbsentees] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target_group: 'All',
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
      const { data: eData } = await supabase.from('attendance_events').select('*').order('event_date', { ascending: false });
      setAttendanceEvents(eData || []);
      
      if (eData?.length && !selectedEventId) {
        setSelectedEventId(eData[0].id);
        fetchAbsentees(eData[0].id);
      }

      const { data, error } = await supabase
        .from('visitation_whatsapp_schedules')
        .select('*')
        .order('scheduled_for', { ascending: true });

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') setTableMissing(true);
        else throw error;
      } else {
        setSchedules(data || []);
      }
    } catch (err) {
      console.error('Visitation WhatsApp Sync Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAbsentees = async (eventId: string) => {
    if (!eventId) return;
    try {
      const { data } = await supabase
        .from('attendance_records')
        .select('*, members(*)')
        .eq('attendance_event_id', eventId)
        .in('status', ['Absent', 'Unmarked']);
      setAbsentees(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const startInstantRelay = () => {
    if (absentees.length === 0) return alert("No absentees detected for this session.");
    
    const confirmMsg = `Initialize instant follow-up for ${absentees.length} absentees? This will open WhatsApp links sequentially.`;
    if (!confirm(confirmMsg)) return;

    absentees.forEach((abs, index) => {
      const member = abs.members;
      if (member?.phone) {
        const msg = `Shalom ${member.first_name}! 🕊️ We missed you at our recent service. We hope all is well. God bless you!`;
        const url = `https://wa.me/${member.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
        setTimeout(() => {
          window.open(url, '_blank');
        }, index * 1000); // Stagger to avoid popup blockers
      }
    });
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

      const { error } = await supabase.from('visitation_whatsapp_schedules').insert(payloads);
      if (error) throw error;
      
      alert(`Successfully scheduled ${payloads.length} visitation outreach intervals.`);
      setIsModalOpen(false);
      setFormData({ title: '', message: '', target_group: 'All', event_id: '' });
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
      await supabase.from('visitation_whatsapp_schedules').delete().eq('id', id);
      fetchInitialData();
    } catch (err) { console.error(err); }
  };

  if (tableMissing) {
    const repairSQL = `-- VISITATION WHATSAPP REPAIR & SCHEMA UPDATE
CREATE TABLE IF NOT EXISTS public.visitation_whatsapp_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  target_group TEXT DEFAULT 'All',
  event_id UUID,
  status TEXT DEFAULT 'Pending',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ENSURE COLUMNS EXIST FOR EXISTING TABLES
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitation_whatsapp_schedules' AND column_name='target_group') THEN
    ALTER TABLE public.visitation_whatsapp_schedules ADD COLUMN target_group TEXT DEFAULT 'All';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitation_whatsapp_schedules' AND column_name='event_id') THEN
    ALTER TABLE public.visitation_whatsapp_schedules ADD COLUMN event_id UUID;
  END IF;
END $$;

ALTER TABLE public.visitation_whatsapp_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON public.visitation_whatsapp_schedules FOR ALL USING (true) WITH CHECK (true);`;

    return (
      <div className="max-w-4xl mx-auto py-12 px-4 animate-in zoom-in-95">
        <div className="bg-white p-12 rounded-[4rem] shadow-2xl text-center border-b-[16px] border-emerald-500">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
             <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Visitation Relay Reset</h2>
          <p className="text-slate-500 mb-10 text-[11px] font-bold uppercase tracking-widest max-w-lg mx-auto">The visitation communication engine is not initialized. Run the script to authorize.</p>
          <pre className="bg-slate-950 text-fh-gold p-8 rounded-[2rem] text-[10px] font-mono text-left h-48 overflow-y-auto mb-10 shadow-2xl border border-white/5 scrollbar-hide">{repairSQL}</pre>
          <button onClick={fetchInitialData} className="px-16 py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl border-b-4 border-black active:scale-95">Verify Protocols</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm">
          <button onClick={() => setActiveSubTab('Ledger')} className={`px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'Ledger' ? 'bg-fh-green text-fh-gold shadow-lg' : 'text-slate-400'}`}>Dispatch Ledger</button>
          <button onClick={() => setActiveSubTab('Instant')} className={`px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'Instant' ? 'bg-fh-green text-fh-gold shadow-lg' : 'text-slate-400'}`}>Instant Absentee Relay</button>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setIsModalOpen(true)} className="px-10 py-5 bg-fh-green text-fh-gold rounded-[1.75rem] font-black uppercase tracking-widest text-[10px] shadow-2xl active:scale-95 transition-all border-b-4 border-black/30 flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Schedule Care Relay
          </button>
        </div>
      </div>

      {activeSubTab === 'Instant' ? (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="cms-card bg-slate-950 p-12 rounded-[4rem] relative overflow-hidden group border-none shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
              <div className="space-y-3">
                 <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Absentee Detection Radar</h3>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em]">Initialize immediate follow-up for missed service sessions.</p>
              </div>
              <div className="flex-1 max-w-lg flex items-center gap-4">
                <select value={selectedEventId} onChange={(e) => { setSelectedEventId(e.target.value); fetchAbsentees(e.target.value); }} className="flex-1 px-8 py-5 bg-white/5 border border-white/10 rounded-[1.75rem] font-black text-xs uppercase tracking-widest text-fh-gold outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all cursor-pointer">
                  <option value="" className="bg-slate-900">Choose Service Session...</option>
                  {attendanceEvents.map(ev => (<option key={ev.id} value={ev.id} className="bg-slate-900">{new Date(ev.event_date).toLocaleDateString()} - {ev.event_name}</option>))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-10 bg-white rounded-[3rem] border border-slate-100 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-2">Absentees Detected</p>
                <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{absentees.length}</h3>
              </div>
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
            <button 
              onClick={startInstantRelay}
              disabled={absentees.length === 0}
              className="p-10 bg-emerald-500 text-white rounded-[3rem] flex items-center justify-between shadow-2xl shadow-emerald-200 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
            >
              <div className="text-left">
                <p className="text-[9px] font-black text-emerald-100 uppercase tracking-widest mb-2">Ready for Dispatch</p>
                <h3 className="text-2xl font-black uppercase tracking-tight">Start Bulk Relay</h3>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="royal-card p-10 bg-white rounded-[3rem] border border-slate-100 flex flex-col justify-between group hover:border-emerald-400 transition-colors shadow-sm">
           <div>
              <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2">Care Queue</p>
              <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{schedules.filter(s => s.status === 'Pending').length}</h3>
           </div>
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6">Pending Outreach</p>
        </div>
        <div className="royal-card p-10 bg-white rounded-[3rem] border border-slate-100 flex flex-col justify-between group hover:border-blue-400 transition-colors shadow-sm">
           <div>
              <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-2">Completed Missions</p>
              <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{schedules.filter(s => s.status === 'Sent').length}</h3>
           </div>
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6">Successful Relays</p>
        </div>
        <div className="royal-card p-10 bg-slate-950 text-white rounded-[3rem] flex flex-col justify-between group shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
           <div className="relative z-10">
              <p className="text-[9px] font-black text-fh-gold uppercase tracking-widest mb-2">Next Care Signal</p>
              <h3 className="text-xl font-black text-white tracking-tight leading-tight">
                {schedules.find(s => s.status === 'Pending')?.title || 'No Pending Care Relay'}
              </h3>
           </div>
           <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-6 relative z-10">Visitation Node v1.0</p>
        </div>
      </div>

      <div className="cms-card bg-white rounded-[3.5rem] overflow-hidden border-none shadow-sm">
         <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Visitation Relay Ledger</h3>
            <span className="px-5 py-1.5 bg-white border border-slate-200 rounded-full text-[9px] font-black text-fh-green uppercase shadow-sm">Care Monitoring Active</span>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100">
                  <tr>
                    <th className="px-10 py-6">Care Mission</th>
                    <th className="px-10 py-6">Scheduled Slot</th>
                    <th className="px-10 py-6 text-right">Status</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {isLoading ? (
                    <tr><td colSpan={3} className="px-10 py-24 text-center animate-pulse text-slate-300 font-black uppercase tracking-[0.5em]">Syncing Care Array...</td></tr>
                  ) : schedules.length > 0 ? schedules.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-all group">
                       <td className="px-10 py-6 max-w-sm">
                          <p className="font-black text-slate-800 uppercase tracking-tight mb-2">{s.title}</p>
                          <p className="text-[10px] text-slate-500 line-clamp-1 italic">"{s.message}"</p>
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
                    <tr><td colSpan={3} className="px-10 py-32 text-center text-slate-300 font-black uppercase tracking-widest italic opacity-50">No Visitation Relays Scheduled.</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
      </>
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
                    <h3 className="text-3xl font-black text-fh-green uppercase leading-none tracking-tighter">Care Dispatch</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-2">Initialize Visitation Outreach Relays</p>
                 </div>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-5 hover:bg-slate-100 rounded-full transition-all text-slate-400 active:scale-90"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <form onSubmit={handleCreateSchedule} className="p-12 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
               <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Mission Identification</label>
                 <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. First-time Visitor Follow-up" className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner" />
               </div>

               <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Audience Cluster</label>
                    <select value={formData.target_group} onChange={e => setFormData({...formData, target_group: e.target.value})} className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner appearance-none cursor-pointer">
                       <option value="All">All</option>
                       <option value="Absentees">Absentees</option>
                    </select>
                  </div>
                  {formData.target_group === 'Absentees' && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Service Session</label>
                      <select required value={formData.event_id} onChange={e => setFormData({...formData, event_id: e.target.value})} className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner appearance-none cursor-pointer">
                         <option value="">Select Service...</option>
                         {attendanceEvents.map(ev => (
                           <option key={ev.id} value={ev.id}>{new Date(ev.event_date).toLocaleDateString()} - {ev.event_name}</option>
                         ))}
                      </select>
                    </div>
                  )}
               </div>

               <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Care Message Payload</label>
                 <textarea required value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} rows={4} placeholder="Draft care message..." className="w-full p-8 bg-slate-50 border border-slate-200 rounded-[2.5rem] font-bold text-slate-600 shadow-inner leading-relaxed resize-none italic" />
               </div>

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
                  <p className="text-[10px] text-emerald-600 font-bold leading-relaxed uppercase tracking-tighter">Queue: Individual care relay points will be established for each slot. Ensure personal touch in messages for effective follow-up.</p>
               </div>

               <button type="submit" disabled={isSubmitting} className="w-full py-7 bg-fh-green text-fh-gold rounded-[2rem] font-black uppercase text-xs tracking-[0.4em] shadow-2xl active:scale-95 transition-all border-b-4 border-black/30 flex items-center justify-center gap-4">
                  {isSubmitting ? <div className="w-6 h-6 border-2 border-fh-gold/50 border-t-fh-gold animate-spin rounded-full" /> : "Authorize Care Relay"}
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitationWhatsAppView;
