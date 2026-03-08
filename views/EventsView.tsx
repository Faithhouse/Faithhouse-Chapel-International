import React, { useState, useEffect, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, parseISO, isSameDay } from 'date-fns';
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';
import { permissions } from '../src/utils/permissions';

interface EventsViewProps {
  userProfile: UserProfile | null;
}

// Moved outside to prevent re-creation and hoisting issues
const categoryColors = {
  'Prophetic Word Service': 'bg-fh-green/10 text-fh-green border-fh-green/20',
  'Help from above service': 'bg-indigo-50 text-indigo-700 border-indigo-100',
  'Special services': 'bg-amber-50 text-amber-700 border-amber-100',
  'Conferences': 'bg-slate-900 text-fh-gold border-slate-700',
};

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);

const EventsView: React.FC<EventsViewProps> = ({ userProfile }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);
  const [repairNeeded, setRepairNeeded] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Form State for New Event
  const [formData, setFormData] = useState({
    title: '',
    category: 'Prophetic Word Service',
    date: new Date().toISOString().split('T')[0],
    time: '18:00',
    location: '',
    branch_id: '',
    description: '',
    status: 'Upcoming'
  });

  useEffect(() => {
    fetchInitialData();
    
    const subscription = supabase
      .channel('events_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchInitialData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    setTableMissing(false);
    try {
      const { data: bData, error: bError } = await supabase.from('branches').select('*').order('name');
      if (bError) {
        if (bError.code === '42P01' || bError.message.includes('not found')) {
          setTableMissing(true);
          return;
        }
      }
      setBranches(bData || []);

      const { data: eventData, error: eventError } = await supabase.from('events').select('*').order('date', { ascending: false });
      if (eventError) {
        if (eventError.code === '42P01' || eventError.message.includes('not found')) {
          setTableMissing(true);
          return;
        }
        throw eventError;
      }
      setEvents(eventData || []);
    } catch (err) {
      console.error("Sync Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const runDiagnostic = async () => {
    setIsDiagnosticRunning(true);
    setNotification("Running system diagnostic...");
    try {
      // 1. Check for branches
      const { data: currentBranches, error: branchError } = await supabase.from('branches').select('*');
      if (branchError) throw branchError;
      
      if (!currentBranches || currentBranches.length === 0) {
        setNotification("No branches found. Creating default...");
        const { error: createBranchError } = await supabase.from('branches').insert([{ name: 'Main Branch', location: 'Main Sanctuary' }]);
        if (createBranchError) throw createBranchError;
      }

      // 2. Check for events without attendance logs
      const { data: allEvents, error: eventsError } = await supabase.from('events').select('*');
      if (eventsError) throw eventsError;

      const { data: allLogs, error: logsError } = await supabase.from('attendance_events').select('*');
      if (logsError) throw logsError;

      const missingLogs = allEvents.filter(ev => {
        if (ev.category === 'Conferences') return false;
        return !allLogs.some(log => 
          log.event_date === ev.date && 
          log.event_type === ev.category && 
          log.branch_id === ev.branch_id
        );
      });

      if (missingLogs.length > 0) {
        setNotification(`Found ${missingLogs.length} missing logs. Repairing...`);
        const repairLogs = missingLogs.map(ev => ({
          event_name: ev.title,
          event_type: ev.category,
          event_date: ev.date,
          branch_id: ev.branch_id
        }));
        const { error: repairError } = await supabase.from('attendance_events').upsert(repairLogs, { onConflict: 'event_date,event_type,branch_id' });
        if (repairError) throw repairError;
        setNotification(`Diagnostic complete: ${missingLogs.length} logs restored.`);
      } else {
        setNotification("Diagnostic complete: System is healthy.");
      }
      
      setTimeout(() => setNotification(null), 3000);
      fetchInitialData();
    } catch (err: any) {
      console.error("Diagnostic Error:", err);
      setNotification("Diagnostic failed: " + err.message);
      setRepairNeeded(true);
    } finally {
      setIsDiagnosticRunning(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canEditEvents(userProfile?.role)) return;
    try {
      const { data: newEvent, error } = await supabase.from('events').insert([{...formData, branch_id: formData.branch_id || null}]).select().single();
      if (error) throw error;
      
      if (formData.category !== 'Conferences') {
        await supabase.from('attendance_events').insert([{ event_name: formData.title, event_type: formData.category, event_date: formData.date, branch_id: formData.branch_id || null }]);
      }

      setNotification("Event scheduled successfully.");
      setIsModalOpen(false);
      setFormData({ title: '', category: 'Prophetic Word Service', date: new Date().toISOString().split('T')[0], time: '18:00', location: '', branch_id: '', description: '', status: 'Upcoming' });
      setTimeout(() => setNotification(null), 3000);
      fetchInitialData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(deleteConfirmId);
    try {
      const eventToDelete = events.find(e => e.id === deleteConfirmId);
      
      const { error } = await supabase.from('events').delete().eq('id', deleteConfirmId);
      if (error) throw error;

      // Also delete from attendance_events to keep in sync
      if (eventToDelete) {
        await supabase.from('attendance_events')
          .delete()
          .eq('event_date', eventToDelete.date)
          .eq('event_type', eventToDelete.category)
          .eq('branch_id', eventToDelete.branch_id);
      }
      
      setDeleteConfirmId(null);
      setNotification("Programme deleted successfully.");
      setTimeout(() => setNotification(null), 3000);
      fetchInitialData();
    } catch (err: any) {
      alert(`Deletion Failed: ${err.message}`);
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      const [year, month] = ev.date.split('-').map(Number);
      const matchesSearch = ev.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'All' || ev.category === filterCategory;
      return matchesSearch && matchesCategory && (month - 1) === selectedMonth && year === selectedYear;
    });
  }, [events, searchTerm, filterCategory, selectedMonth, selectedYear]);

  if (tableMissing || repairNeeded) {
    const repairSQL = `-- MASTER DATABASE REPAIR SCRIPT
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_date, event_type, branch_id)
);

-- 4. Enable RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;

-- 5. Create Permissive Policies
DROP POLICY IF EXISTS "Allow all" ON public.branches;
CREATE POLICY "Allow all" ON public.branches FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON public.events;
CREATE POLICY "Allow all" ON public.events FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON public.attendance_events;
CREATE POLICY "Allow all" ON public.attendance_events FOR ALL USING (true) WITH CHECK (true);`;

    return (
      <div className="max-w-4xl mx-auto py-12 px-4 animate-in zoom-in-95 duration-500">
        <div className="royal-card p-12 md:p-16 rounded-[4rem] bg-white text-center border-2 border-rose-100 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 inset-x-0 h-2 bg-rose-500"></div>
          <h2 className="text-3xl font-black text-slate-900 uppercase mb-4">{repairNeeded ? 'Database Repair Required' : 'Database Inaccessible'}</h2>
          <p className="text-slate-500 mb-8 text-[11px] font-bold uppercase tracking-widest max-w-lg mx-auto leading-relaxed">
            {repairNeeded 
              ? "The system encountered a synchronization conflict. Please execute the repair script in your Supabase SQL Editor to restore full functionality."
              : "The required database tables are missing or inaccessible. Please execute the initialization script below."}
          </p>
          <pre className="bg-slate-900 text-fh-gold-pale p-8 rounded-[2rem] text-[10px] text-left h-48 overflow-y-auto mb-10 shadow-inner">
            {repairSQL}
          </pre>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => { navigator.clipboard.writeText(repairSQL); alert('SQL Copied.'); }} className="px-10 py-5 bg-slate-100 rounded-2xl font-black uppercase text-xs">Copy Script</button>
            <button onClick={() => { setRepairNeeded(false); fetchInitialData(); }} className="px-16 py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-xs">Verify Restoration</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen pb-20 relative">
      {notification && (
        <div className="fixed top-10 right-10 z-[300] bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right-10 font-black uppercase text-[10px] tracking-widest flex items-center gap-3 border-b-4 border-black/20">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          {notification}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-fh-green tracking-tighter uppercase">Upcoming Events</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Programmes & Vitality Management</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={runDiagnostic} 
            disabled={isDiagnosticRunning}
            className="p-4 bg-white border border-slate-200 text-amber-500 rounded-2xl hover:bg-amber-50 transition-all"
            title="Run System Diagnostic"
          >
            <svg className={`w-5 h-5 ${isDiagnosticRunning ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </button>
          <div className="flex bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <button onClick={() => setViewMode('list')} className={`p-4 ${viewMode === 'list' ? 'bg-fh-green text-fh-gold' : 'text-slate-400'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <button onClick={() => setViewMode('calendar')} className={`p-4 ${viewMode === 'calendar' ? 'bg-fh-green text-fh-gold' : 'text-slate-400'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </button>
          </div>
          <button onClick={fetchInitialData} className="p-4 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:bg-slate-50 transition-all">
            <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
          {permissions.canEditEvents(userProfile?.role) && (
            <button onClick={() => setIsModalOpen(true)} className="px-8 py-4 bg-fh-green text-fh-gold rounded-2xl font-black text-xs uppercase shadow-xl border-b-4 border-black/20">
              Schedule Programme
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
        {viewMode === 'list' ? (
          <>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <input type="text" placeholder="Search programmes..." className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <select className="w-full md:w-64 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-[10px] font-black uppercase" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="All">All Categories</option>
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
          </>
        ) : (
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-full md:w-auto">
              <Calendar 
                onChange={(d) => {
                  const date = d as Date;
                  setSelectedMonth(date.getMonth());
                  setSelectedYear(date.getFullYear());
                }}
                value={new Date(selectedYear, selectedMonth, 1)}
                className="rounded-3xl border-none shadow-none font-sans"
                tileClassName={({ date }) => {
                  const hasEvent = events.some(ev => isSameDay(parseISO(ev.date), date));
                  return hasEvent ? 'bg-fh-green/10 text-fh-green font-bold rounded-xl' : '';
                }}
              />
            </div>
            <div className="flex-1 space-y-4">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Events in {months[selectedMonth]} {selectedYear}</h3>
              <div className="space-y-3">
                {filteredEvents.length > 0 ? filteredEvents.map(ev => (
                  <div key={ev.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-800">{ev.title}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{format(parseISO(ev.date), 'EEEE, MMM do')} • {ev.time}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase ${categoryColors[ev.category as keyof typeof categoryColors] || 'bg-slate-200'}`}>
                      {ev.category.substring(0, 10)}...
                    </span>
                  </div>
                )) : (
                  <p className="text-xs text-slate-400 font-bold uppercase italic">No events for this selection</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full py-20 text-center text-slate-400 font-bold uppercase text-xs">Synchronizing...</div>
          ) : filteredEvents.length > 0 ? filteredEvents.map(ev => (
            <div key={ev.id} className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${categoryColors[ev.category as keyof typeof categoryColors] || 'bg-slate-100 text-slate-600'}`}>
                  {ev.category}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black uppercase ${ev.status === 'Completed' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                    {ev.status}
                  </span>
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">{ev.title}</h3>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex flex-col items-center justify-center border border-slate-100">
                  <span className="text-[8px] font-black text-slate-400 uppercase">{new Date(ev.date + 'T12:00:00').toLocaleString('default', { month: 'short' })}</span>
                  <span className="text-xs font-black text-slate-800">{ev.date.split('-')[2]}</span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{ev.time} • {ev.location || 'Main Sanctuary'}</p>
              </div>
              
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Synced with Attendance</span>
                </div>
                {permissions.canEditEvents(userProfile?.role) && (
                  <button onClick={() => setDeleteConfirmId(ev.id)} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
              </div>
            </div>
          )) : (
            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200 p-12">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase mb-2">No Programmes Scheduled</h3>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-10 max-w-sm mx-auto leading-relaxed">
                There are no service sessions recorded for {months[selectedMonth]} {selectedYear}.
              </p>
              {permissions.canEditEvents(userProfile?.role) && (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-fh-green hover:text-fh-gold transition-all"
                >
                  Schedule First Programme
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <form onSubmit={handleCreateEvent} className="relative bg-white w-full max-w-md rounded-[3rem] p-10 space-y-4 shadow-2xl border-b-[12px] border-fh-gold animate-in zoom-in-95">
            <h2 className="text-2xl font-black text-fh-green uppercase mb-6">New Programme Entry</h2>
            
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Programme Title</label>
              <input required placeholder="e.g. Sunday Miracle Service" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-800"
                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Date</label>
                <input type="date" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-800"
                  value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Time</label>
                <input type="time" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-800"
                  value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Category</label>
              <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-800 cursor-pointer"
                value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                <option>Prophetic Word Service</option>
                <option>Help from above service</option>
                <option>Special services</option>
                <option>Conferences</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Location</label>
                <input placeholder="e.g. Main Sanctuary" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-800"
                  value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Branch Assignment</label>
                <select required className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-800 cursor-pointer"
                  value={formData.branch_id} onChange={e => setFormData({...formData, branch_id: e.target.value})}>
                  <option value="">Select Branch...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" className="w-full py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase shadow-lg tracking-widest mt-4 border-b-4 border-black/20 active:scale-95 transition-all">
              Confirm Programme
            </button>
          </form>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" onClick={() => setDeleteConfirmId(null)}></div>
          <div className="relative bg-white p-8 rounded-[2.5rem] max-w-sm w-full text-center">
            <h3 className="text-xl font-black text-slate-900 mb-2 uppercase">Delete Programme?</h3>
            <p className="text-slate-500 text-xs mb-8">This action is permanent and will remove associated logs.</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black uppercase text-[10px]">Cancel</button>
              <button onClick={handleDeleteEvent} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-rose-200">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsView;