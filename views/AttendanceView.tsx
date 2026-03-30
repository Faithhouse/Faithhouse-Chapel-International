
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { AttendanceEvent, AttendanceRecord, Member, Branch, UserProfile } from '../types';

interface AttendanceViewProps {
  userProfile: UserProfile | null;
}

interface EventStats {
  present: number;
  absent: number;
  unmarked: number;
}

const AttendanceView: React.FC<AttendanceViewProps> = ({ userProfile }) => {
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [eventStats, setEventStats] = useState<Record<string, EventStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeEvent, setActiveEvent] = useState<AttendanceEvent | null>(null);
  const [activeEventCounts, setActiveEventCounts] = useState({
    men_count: 0,
    women_count: 0,
    children_count: 0
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // Filters
  const [branchFilter, setBranchFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);

  // Form State for New Service
  const [newService, setNewService] = useState({
    event_name: '',
    event_type: 'Prophetic Word Service' as AttendanceEvent['event_type'],
    event_date: new Date().toISOString().split('T')[0],
    branch_id: ''
  });

  useEffect(() => {
    fetchInitialData();

    // Real-time subscription for attendance events
    const eventSubscription = supabase
      .channel('attendance_events_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_events' }, () => {
        fetchInitialData();
      })
      .subscribe();

    // Real-time subscription for attendance records
    const recordSubscription = supabase
      .channel('attendance_records_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => {
        fetchInitialData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(eventSubscription);
      supabase.removeChannel(recordSubscription);
    };
  }, [branchFilter, typeFilter, selectedMonth, selectedYear]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    setSchemaError(null);
    setNetworkError(null);
    try {
      const { data: bData, error: bError } = await supabase.from('branches').select('*').order('name');
      if (bError) throw bError;
      setBranches(bData || []);

      let eventQuery = supabase.from('attendance_events').select('*, branches(*)').order('event_date', { ascending: false });
      if (branchFilter !== 'All') eventQuery = eventQuery.eq('branch_id', branchFilter);
      if (typeFilter !== 'All') eventQuery = eventQuery.eq('event_type', typeFilter);
      
      // Add month/year filtering
      const startDate = new Date(Date.UTC(selectedYear, selectedMonth, 1)).toISOString().split('T')[0];
      const endDate = new Date(Date.UTC(selectedYear, selectedMonth + 1, 0)).toISOString().split('T')[0];
      eventQuery = eventQuery.gte('event_date', startDate).lte('event_date', endDate);

      const { data: eventData, error: eventError } = await eventQuery;
      if (eventError) {
         if (eventError.code === '42P01' || eventError.code === 'PGRST205') throw new Error("ATTENDANCE_TABLE_MISSING");
         if (eventError.code === 'PGRST204') throw new Error("SCHEMA_OUT_OF_SYNC");
         throw eventError;
      }
      setEvents(eventData || []);

      // Optimize: Fetch records only for the events displayed
      const eventIds = (eventData || []).map(e => e.id);
      let recordsQuery = supabase.from('attendance_records').select('attendance_event_id, status');
      if (eventIds.length > 0) {
        recordsQuery = recordsQuery.in('attendance_event_id', eventIds);
      } else {
        // If no events, no records to fetch
        setEventStats({});
        setMembers([]);
        return;
      }

      const { data: allRecords, error: recordsError } = await recordsQuery;
      if (recordsError) throw recordsError;
      
      const statsMap: Record<string, EventStats> = {};
      allRecords?.forEach(rec => {
        if (!statsMap[rec.attendance_event_id]) {
          statsMap[rec.attendance_event_id] = { present: 0, absent: 0, unmarked: 0 };
        }
        if (rec.status === 'Present') statsMap[rec.attendance_event_id].present++;
        if (rec.status === 'Absent') statsMap[rec.attendance_event_id].absent++;
        if (rec.status === 'Unmarked') statsMap[rec.attendance_event_id].unmarked++;
      });
      setEventStats(statsMap);

      const { data: memberData, error: memberError } = await supabase.from('members').select('*, branches(*)').eq('status', 'Active').order('first_name', { ascending: true });
      if (memberError) throw memberError;
      setMembers(memberData || []);
    } catch (err: any) {
      console.error("Attendance Sync Error:", err);
      if (err.message === "ATTENDANCE_TABLE_MISSING") {
        setSchemaError("INITIALIZATION_REQUIRED");
      } else if (err.message === "SCHEMA_OUT_OF_SYNC") {
        setSchemaError("REPAIR_REQUIRED");
      } else {
        const errorMessage = err.message === 'Failed to fetch' || err.name === 'TypeError' 
          ? "Network Error: Unable to connect to the database. Please check your internet connection."
          : err.message || "An unexpected error occurred while fetching attendance data.";
        setNetworkError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('attendance_events').insert([newService]);
      if (error) throw error;

      // Two-way sync: Create event in the events table
      await supabase.from('events').insert([{
        title: newService.event_name,
        category: newService.event_type,
        date: newService.event_date,
        branch_id: newService.branch_id || null,
        time: '18:00', // Default time
        status: 'Upcoming'
      }]);

      setIsModalOpen(false);
      setNewService({
        event_name: '',
        event_type: 'Prophetic Word Service',
        event_date: new Date().toISOString().split('T')[0],
        branch_id: ''
      });
      fetchInitialData();
    } catch (err: any) {
      alert(`Provision Failure: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openSheet = async (event: AttendanceEvent) => {
    setIsLoading(true);
    setActiveEvent(event);
    setActiveEventCounts({
      men_count: event.men_count || 0,
      women_count: event.women_count || 0,
      children_count: event.children_count || 0
    });
    try {
      const { data, error } = await supabase.from('attendance_records').select('*').eq('attendance_event_id', event.id);
      if (error) throw error;
      
      // Pre-populate records for all active members to ensure full synchronization
      const existingRecords = data || [];
      const fullRecords: AttendanceRecord[] = members.map(m => {
        const existing = existingRecords.find(r => r.member_id === m.id);
        if (existing) return existing;
        return {
          attendance_event_id: event.id,
          member_id: m.id,
          status: 'Unmarked'
        };
      });
      
      setRecords(fullRecords);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = (memberId: string, status: AttendanceRecord['status']) => {
    setRecords(prev => {
      const idx = prev.findIndex(r => r.member_id === memberId);
      if (idx > -1) {
        const up = [...prev];
        // Toggle logic: if clicking the same status, set to 'Unmarked'
        const newStatus = up[idx].status === status ? 'Unmarked' : status;
        up[idx] = { ...up[idx], status: newStatus };
        return up;
      }
      return [...prev, { attendance_event_id: activeEvent!.id, member_id: memberId, status }];
    });
  };

  const saveAttendance = async () => {
    if (!activeEvent) return;
    setIsSaving(true);
    try {
      // Logic Fix: Omit 'id' for new records to prevent Null Constraint Violation
      const cleanRecords = records.map(({ id, ...rest }) => id ? { id, ...rest } : rest);
      
      const { error: recordsError } = await supabase.from('attendance_records').upsert(cleanRecords, { onConflict: 'attendance_event_id, member_id' });
      
      if (recordsError) {
         if (recordsError.message.includes('column "id"') || recordsError.code === '23502') {
           setSchemaError("PRIMARY_KEY_DEFAULT_MISSING");
           throw new Error("Database Schema Conflict: The database requires manual repair to support automatic ID generation.");
         }
         if (recordsError.message.includes('unique or exclusion constraint')) {
           setSchemaError("UNIQUE_CONSTRAINT_MISSING");
           throw new Error("Database Schema Conflict: Missing unique constraint for attendance synchronization.");
         }
         throw recordsError;
      }

      // Save the summary counts to attendance_events
      const total = activeEventCounts.men_count + 
                    activeEventCounts.women_count + 
                    activeEventCounts.children_count;

      const { error: eventError } = await supabase
        .from('attendance_events')
        .update({
          men_count: activeEventCounts.men_count,
          women_count: activeEventCounts.women_count,
          children_count: activeEventCounts.children_count,
          total_attendance: total
        })
        .eq('id', activeEvent.id);

      if (eventError) throw eventError;

      setActiveEvent(null);
      fetchInitialData();
    } catch (err: any) {
      alert(`Sync Conflict: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteConfirmId) return;
    
    setIsDeleting(deleteConfirmId);
    try {
      const { error } = await supabase.from('attendance_events').delete().eq('id', deleteConfirmId);
      if (error) throw error;
      
      setDeleteConfirmId(null);
      setNotification("Attendance log deleted successfully.");
      setTimeout(() => setNotification(null), 3000);
      fetchInitialData();
    } catch (err: any) {
      alert(`Deletion Failed: ${err.message}`);
    } finally {
      setIsDeleting(null);
    }
  };

  if (schemaError) {
     let repairSQL = '';
     
     if (schemaError === "INITIALIZATION_REQUIRED") {
       repairSQL = `-- MASTER DATABASE REPAIR SCRIPT
-- 1. Create Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create Events Table with Unique Constraint
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'Upcoming',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(date, category, branch_id)
);

-- 3. Create Attendance Events Table with Unique Constraint
CREATE TABLE IF NOT EXISTS public.attendance_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  total_attendance INTEGER DEFAULT 0,
  men_count INTEGER DEFAULT 0,
  women_count INTEGER DEFAULT 0,
  children_count INTEGER DEFAULT 0,
  young_adult_count INTEGER DEFAULT 0,
  teen_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_date, event_type, branch_id)
);

-- 4. Create Attendance Records Table
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_event_id UUID NOT NULL REFERENCES attendance_events(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(attendance_event_id, member_id)
);

-- 5. Enable RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- 6. Create Permissive Policies
DROP POLICY IF EXISTS "Allow all" ON public.branches;
CREATE POLICY "Allow all" ON public.branches FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON public.events;
CREATE POLICY "Allow all" ON public.events FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON public.attendance_events;
CREATE POLICY "Allow all" ON public.attendance_events FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON public.attendance_records;
CREATE POLICY "Allow all" ON public.attendance_records FOR ALL USING (true) WITH CHECK (true);

-- 7. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';`;
     } else {
       repairSQL = `-- SCHEMA REPAIR: ADD UUID DEFAULTS & UNIQUE CONSTRAINTS
ALTER TABLE public.attendance_records 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ENSURE ALL ATTENDANCE COLUMNS EXIST
ALTER TABLE public.attendance_events ADD COLUMN IF NOT EXISTS total_attendance INTEGER DEFAULT 0;
ALTER TABLE public.attendance_events ADD COLUMN IF NOT EXISTS children_count INTEGER DEFAULT 0;
ALTER TABLE public.attendance_events ADD COLUMN IF NOT EXISTS young_adult_count INTEGER DEFAULT 0;
ALTER TABLE public.attendance_events ADD COLUMN IF NOT EXISTS teen_count INTEGER DEFAULT 0;
ALTER TABLE public.attendance_events ADD COLUMN IF NOT EXISTS men_count INTEGER DEFAULT 0;
ALTER TABLE public.attendance_events ADD COLUMN IF NOT EXISTS women_count INTEGER DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_event_member') THEN
    ALTER TABLE public.attendance_records ADD CONSTRAINT unique_event_member UNIQUE (attendance_event_id, member_id);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN others THEN
    -- Fallback if the above fails: try to drop and recreate if it exists under a different name or just force it
    ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_attendance_event_id_member_id_key;
    ALTER TABLE public.attendance_records ADD CONSTRAINT unique_event_member UNIQUE (attendance_event_id, member_id);
END $$;

-- REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';`;
     }

     return (
       <div className="max-w-4xl mx-auto py-12 px-4 animate-in zoom-in-95">
         <div className="bg-white p-12 rounded-[4rem] shadow-2xl text-center border-b-[16px] border-rose-500">
           <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
           </div>
           <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Database Sync Conflict Detected</h2>
           <p className="text-slate-500 mb-10 text-[11px] font-bold uppercase tracking-widest max-w-lg mx-auto">The attendance registry requires a schema update to support automatic identification. Execute the recovery script below.</p>
           <pre className="bg-slate-950 text-fh-gold p-8 rounded-[2rem] text-[10px] font-mono text-left h-48 overflow-y-auto mb-10 shadow-2xl border border-white/5 scrollbar-hide">{repairSQL}</pre>
           <div className="flex gap-4 justify-center">
              <button onClick={() => { navigator.clipboard.writeText(repairSQL); alert('Repair protocol copied.'); }} className="px-10 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95">Copy Script</button>
              <button onClick={fetchInitialData} className="px-16 py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl border-b-4 border-black active:scale-95">Re-Authorize Sync</button>
           </div>
         </div>
       </div>
     );
  }

  if (activeEvent) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <button onClick={() => setActiveEvent(null)} className="p-4 bg-white border border-slate-200 rounded-[1.5rem] shadow-sm hover:bg-slate-50 transition-all text-slate-400 hover:text-cms-blue">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h2 className="text-3xl font-black tracking-tighter text-slate-900 uppercase leading-none">{activeEvent.event_name}</h2>
              <p className="text-cms-blue font-black text-[10px] uppercase tracking-[0.4em] mt-2">{activeEvent.branches?.name || 'Main Office'} • {new Date(activeEvent.event_date).toLocaleDateString()}</p>
            </div>
          </div>
          <button onClick={saveAttendance} disabled={isSaving} className="px-10 py-5 bg-fh-green text-fh-gold rounded-[1.75rem] font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl active:scale-95 transition-all border-b-4 border-black/30 flex items-center gap-3">
             {isSaving ? <div className="w-4 h-4 border-2 border-white/50 border-t-white animate-spin rounded-full" /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
             Authorize Sync
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-cms-blue/10 text-cms-blue rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Men</p>
              <input 
                type="number" 
                value={activeEventCounts.men_count} 
                onChange={e => setActiveEventCounts({...activeEventCounts, men_count: parseInt(e.target.value) || 0})}
                className="text-xl font-black text-slate-800 bg-transparent border-none p-0 focus:ring-0 w-full"
              />
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-cms-rose/10 text-cms-rose rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Women</p>
              <input 
                type="number" 
                value={activeEventCounts.women_count} 
                onChange={e => setActiveEventCounts({...activeEventCounts, women_count: parseInt(e.target.value) || 0})}
                className="text-xl font-black text-slate-800 bg-transparent border-none p-0 focus:ring-0 w-full"
              />
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-cms-purple/10 text-cms-purple rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Children</p>
              <input 
                type="number" 
                value={activeEventCounts.children_count} 
                onChange={e => setActiveEventCounts({...activeEventCounts, children_count: parseInt(e.target.value) || 0})}
                className="text-xl font-black text-slate-800 bg-transparent border-none p-0 focus:ring-0 w-full"
              />
            </div>
          </div>
          <div className="bg-fh-green p-6 rounded-[2rem] shadow-xl flex items-center gap-4 border-b-4 border-black/20">
            <div className="w-12 h-12 bg-white/20 text-fh-gold rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <div>
              <p className="text-[9px] font-black text-fh-gold/60 uppercase tracking-widest">Total Attendance</p>
              <p className="text-2xl font-black text-fh-gold leading-none">
                {activeEventCounts.men_count + activeEventCounts.women_count + activeEventCounts.children_count}
              </p>
            </div>
          </div>
        </div>

        <div className="cms-card cms-card-blue bg-white rounded-[3rem] overflow-hidden border-none shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100">
                <tr>
                  <th className="px-10 py-6">Identity</th>
                  <th className="px-10 py-6 text-center">Status Toggle</th>
                  <th className="px-10 py-6 text-right">Site</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {members.map(m => {
                  const record = records.find(r => r.member_id === m.id);
                  const s = record?.status || 'Unmarked';
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center font-black text-xs shadow-inner ${
                            s === 'Present' ? 'bg-cms-emerald text-white' : 
                            s === 'Absent' ? 'bg-cms-rose text-white' :
                            s === 'Excused' ? 'bg-cms-purple text-white' :
                            'bg-slate-100 text-slate-400'
                          }`}>
                            {m.first_name[0]}{m.last_name ? m.last_name[0] : ''}
                          </div>
                          <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{m.first_name} {m.last_name}</p>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex justify-center gap-1 lg:gap-2 bg-slate-50 p-1.5 lg:p-2 rounded-2xl w-fit mx-auto border border-slate-100 shadow-inner">
                          {(['Present', 'Absent', 'Excused'] as const).map(st => (
                            <button 
                              key={st} 
                              onClick={() => handleStatusChange(m.id, st)} 
                              className={`px-3 lg:px-6 py-2 lg:py-2.5 rounded-xl text-[8px] lg:text-[9px] font-black uppercase tracking-widest transition-all ${
                                s === st ? (
                                  st === 'Present' ? 'bg-cms-emerald text-white shadow-lg' : 
                                  st === 'Absent' ? 'bg-cms-rose text-white shadow-lg' : 
                                  'bg-cms-purple text-white shadow-lg'
                                ) : 'text-slate-400 hover:bg-white'
                              }`}
                            >
                              {st.charAt(0)}<span className="hidden lg:inline">{st.slice(1)}</span>
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-10 py-6 text-right">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.branches?.name || '---'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 relative">
      {networkError && (
        <div className="p-6 bg-rose-50 border-2 border-rose-100 rounded-[2rem] flex items-center gap-4 animate-in slide-in-from-top-4">
          <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <div>
            <h3 className="text-sm font-black text-rose-900 uppercase tracking-tight">System Warning</h3>
            <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mt-0.5">{networkError}</p>
          </div>
          <button 
            onClick={() => fetchInitialData()}
            className="ml-auto px-6 py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-md"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className="fixed top-10 right-10 z-[300] bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right-10 font-black uppercase text-[10px] tracking-widest flex items-center gap-3 border-b-4 border-black/20">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          {notification}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-fh-green tracking-tighter uppercase leading-none">Attendance Registry</h2>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">Service Growth & Records Ledger</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="px-10 py-5 bg-fh-green text-fh-gold rounded-[1.75rem] font-black uppercase tracking-widest text-[10px] shadow-2xl active:scale-95 transition-all border-b-4 border-black/30 flex items-center gap-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Create Service Log
        </button>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <select className="w-full md:w-64 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-[10px] font-black uppercase" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
            <option value="All">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className="w-full md:w-64 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-[10px] font-black uppercase" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="All">All Service Types</option>
            <option>Prophetic Word Service</option>
            <option>Help from above service</option>
            <option>Special services</option>
            <option>Conferences</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl">
            {months.map((month, index) => (
              <button key={month} onClick={() => setSelectedMonth(index)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${selectedMonth === index ? 'bg-fh-green text-fh-gold' : 'text-slate-400'}`}>
                {month.substring(0, 3)}
              </button>
            ))}
          </div>
          <select className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
            {years.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
        {events.length > 0 ? events.map(ev => {
          const stats = eventStats[ev.id] || { present: 0, absent: 0 };
          return (
            <div key={ev.id} className="cms-card cms-card-purple bg-white rounded-[2.5rem] p-8 hover:shadow-2xl transition-all group overflow-hidden flex flex-col hover:-translate-y-2 duration-500 border-b-[8px] border-slate-50 hover:border-fh-gold">
              <div className="flex justify-between items-start mb-8">
                <span className="px-4 py-1.5 bg-cms-purple/10 text-cms-purple text-[9px] font-black uppercase tracking-widest rounded-xl border border-cms-purple/10">{ev.event_type}</span>
                <div className="flex flex-col items-end gap-2">
                   <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cms-emerald"></span><span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Present: {stats.present}</span></div>
                   <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cms-rose"></span><span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Absent: {stats.absent}</span></div>
                   <div className="mt-2 pt-2 border-t border-slate-100 w-full flex flex-col items-end gap-1">
                      <span className="text-[8px] font-bold text-slate-400 uppercase">M: {ev.men_count || 0} • W: {ev.women_count || 0} • C: {ev.children_count || 0}</span>
                      <span className="text-[9px] font-black text-fh-green uppercase">Total: {ev.total_attendance || 0}</span>
                   </div>
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 leading-tight mb-8 group-hover:text-cms-blue transition-colors uppercase tracking-tight">{ev.event_name}</h3>
              <div className="space-y-4 mb-8">
                 <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest"><svg className="w-4 h-4 text-cms-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7" /></svg>{new Date(ev.event_date).toLocaleDateString()}</div>
                 <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest"><svg className="w-4 h-4 text-cms-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>{ev.branches?.name || 'Main Campus'}</div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => openSheet(ev)} 
                  className="flex-1 py-5 bg-slate-950 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] active:scale-95 transition-all group-hover:bg-cms-blue"
                >
                  Access Sheet
                </button>
                <button 
                  onClick={() => setDeleteConfirmId(ev.id)}
                  className="px-5 py-5 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all active:scale-95 flex items-center justify-center"
                  title="Delete Log"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          );
        }) : (
           <div className="col-span-full py-40 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-200"><p className="text-slate-300 font-black uppercase tracking-[0.5em] italic">No operational logs recorded</p></div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-[3rem] p-10 text-center shadow-2xl border-t-[12px] border-rose-500 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
               <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase mb-2 tracking-tighter">Confirm Deletion</h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8 leading-relaxed">
              Are you sure you want to permanently remove this attendance log? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteEvent}
                disabled={!!isDeleting}
                className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-200 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white/50 border-t-white animate-spin rounded-full" />
                ) : (
                  "Delete Now"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-fh-green-dark/95 backdrop-blur-md animate-in fade-in" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border-b-[16px] border-fh-gold">
            <div className="p-12 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
               <div className="flex items-center gap-6">
                 <div className="w-16 h-16 bg-fh-green text-fh-gold rounded-[2rem] flex items-center justify-center shadow-xl"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7" /></svg></div>
                 <div><h3 className="text-3xl font-black text-fh-green uppercase leading-none tracking-tighter">Log Service</h3><p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-2">Setup Attendance Tracking</p></div>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-5 hover:bg-slate-100 rounded-full transition-all text-slate-400 active:scale-90"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleCreateService} className="p-12 space-y-8">
              <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Service Designation</label><input required value={newService.event_name} onChange={e => setNewService({...newService, event_name: e.target.value})} placeholder="e.g. Mid-week Power Service" className="w-full px-7 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800" /></div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Service Type</label><select value={newService.event_type} onChange={e => setNewService({...newService, event_type: e.target.value as any})} className="w-full px-7 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800"><option>Prophetic Word Service</option><option>Help from above service</option><option>Special services</option><option>Conferences</option></select></div>
                <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Branch Assignment</label><select required value={newService.branch_id} onChange={e => setNewService({...newService, branch_id: e.target.value})} className="w-full px-7 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800"><option value="">Select Branch...</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
              </div>
              <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Service Date</label><input type="date" required value={newService.event_date} onChange={e => setNewService({...newService, event_date: e.target.value})} className="w-full px-7 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800" /></div>
              <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-fh-green text-fh-gold rounded-[2.5rem] font-black uppercase text-xs tracking-[0.4em] shadow-2xl active:scale-95 transition-all border-b-4 border-black/30 flex items-center justify-center gap-3">{isSubmitting ? <div className="w-5 h-5 border-2 border-white/50 border-t-white animate-spin rounded-full" /> : "Confirm Service Log"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceView;
