import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Member } from '../types';
import { permissions } from '../src/utils/permissions';

interface EventsViewProps {
  userProfile: UserProfile | null;
}

const categoryColors = {
  'Prophetic Word Service': 'bg-fh-green/10 text-fh-green border-fh-green/20',
  'Help from above service': 'bg-indigo-50 text-indigo-700 border-indigo-100',
  'Special services': 'bg-amber-50 text-amber-700 border-amber-100',
  'Conferences': 'bg-slate-900 text-fh-gold border-slate-700',
};

const EventsView: React.FC<EventsViewProps> = ({ userProfile }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [isGenerating, setIsGenerating] = useState(false);
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
    
    // Real-time subscription for events
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

  // Automatic generation check
  useEffect(() => {
    if (!isLoading && branches.length > 0 && permissions.canEditEvents(userProfile?.role)) {
      const upcomingEvents = events.filter(e => new Date(e.date) >= new Date());
      if (upcomingEvents.length < 4) {
        autoGenerateServices(true);
      }
    }
  }, [isLoading, branches.length, events.length]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    setTableMissing(false);
    try {
      // Fetch Branches for assignment
      const { data: bData, error: bError } = await supabase.from('branches').select('*').order('name');
      
      if (bError) {
        if (bError.code === '42P01' || bError.message.includes('not found') || bError.message.includes('schema cache')) {
          setTableMissing(true);
          return;
        }
      }
      setBranches(bData || []);

      const { data: eventData, error: eventError } = await supabase.from('events').select('*').order('date', { ascending: false });
      if (eventError) {
        if (eventError.code === '42P01' || eventError.code === '42703' || eventError.message.includes('not found') || eventError.message.includes('schema cache') || eventError.message.includes('Could not find') || eventError.message.includes('column')) {
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

  const autoGenerateServices = async (silent = false, targetMonth?: number, targetYear?: number) => {
    if (!permissions.canEditEvents(userProfile?.role)) return;
    
    let currentBranches = [...branches];
    
    if (currentBranches.length === 0) {
      try {
        // Try to create a default branch if none exists
        const { data: newBranch, error: branchError } = await supabase
          .from('branches')
          .insert([{ name: 'Main Branch', location: 'Main Sanctuary' }])
          .select()
          .single();
        
        if (branchError) throw branchError;
        if (newBranch) {
          currentBranches = [newBranch];
          setBranches(currentBranches);
        } else {
          throw new Error("Failed to create default branch");
        }
      } catch (err) {
        console.error("Branch Creation Error:", err);
        if (!silent) alert("No branches found. Please create a branch in the Branches module first.");
        return;
      }
    }

    const isSpecificMonth = targetMonth !== undefined && targetYear !== undefined;

    if (!silent) {
      const msg = isSpecificMonth 
        ? `Generate Sunday and Friday services for ${months[targetMonth]} ${targetYear}?`
        : "Generate Sunday and Friday services for the next 60 days?";
      const confirmGen = window.confirm(msg);
      if (!confirmGen) return;
    }

    setIsGenerating(true);
    try {
      const defaultBranchId = currentBranches[0].id;
      const generatedEvents = [];

      if (isSpecificMonth) {
        // Generate for specific month
        const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
          const d = new Date(targetYear, targetMonth, day);
          const dayOfWeek = d.getDay(); // 0: Sunday, 5: Friday
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

          if (dayOfWeek === 0) { // Sunday
            generatedEvents.push({
              title: 'Sunday Miracle Service',
              category: 'Prophetic Word Service',
              date: dateStr,
              time: '08:00',
              location: '',
              branch_id: defaultBranchId,
              status: 'Upcoming'
            });
          } else if (dayOfWeek === 5) { // Friday
            generatedEvents.push({
              title: 'Help From Above Service',
              category: 'Help from above service',
              date: dateStr,
              time: '18:00',
              location: '',
              branch_id: defaultBranchId,
              status: 'Upcoming'
            });
          }
        }
      } else {
        // Generate for next 60 days (approx 2 months)
        const today = new Date();
        for (let i = 0; i < 60; i++) {
          const d = new Date();
          d.setDate(today.getDate() + i);
          const day = d.getDay(); // 0: Sunday, 5: Friday
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

          if (day === 0) { // Sunday
            generatedEvents.push({
              title: 'Sunday Miracle Service',
              category: 'Prophetic Word Service',
              date: dateStr,
              time: '08:00',
              location: '',
              branch_id: defaultBranchId,
              status: 'Upcoming'
            });
          } else if (day === 5) { // Friday
            generatedEvents.push({
              title: 'Help From Above Service',
              category: 'Help from above service',
              date: dateStr,
              time: '18:00',
              location: '',
              branch_id: defaultBranchId,
              status: 'Upcoming'
            });
          }
        }
      }

      let createdCount = 0;
      for (const ev of generatedEvents) {
        // Check if exists for THIS branch and THIS date/category
        const { data: existing, error: checkError } = await supabase
          .from('events')
          .select('id')
          .eq('date', ev.date)
          .eq('category', ev.category)
          .eq('branch_id', ev.branch_id)
          .limit(1);

        if (checkError) {
          console.error("Check Error:", checkError);
          continue;
        }

        if (!existing || existing.length === 0) {
          // Create Event
          const { data: newEvent, error: evError } = await supabase.from('events').insert([ev]).select().single();
          if (evError) {
            console.error("Event Insert Error:", evError);
            continue;
          }

          // Create Attendance Event
          try {
            await supabase.from('attendance_events').insert([{
              event_name: ev.title,
              event_type: ev.category,
              event_date: ev.date,
              branch_id: ev.branch_id
            }]);
          } catch (attErr) {
            console.error("Attendance Event Error:", attErr);
          }

          // Generate Tasks (Optional, don't fail if table missing)
          try {
            const { data: templates, error: tempError } = await supabase
              .from('recurring_task_templates')
              .select('*')
              .or(`service_type.eq."${ev.category}",service_type.eq.All`);

            if (!tempError && templates && templates.length > 0) {
              const taskInstances = templates.map(t => ({
                template_id: t.id,
                event_id: newEvent.id,
                title: t.title,
                description: t.description,
                status: 'Pending',
                due_date: ev.date
              }));
              await supabase.from('task_instances').insert(taskInstances);
            }
          } catch (taskErr) {
            console.warn("Task generation skipped:", taskErr);
          }
          createdCount++;
        }
      }

      if (createdCount > 0) {
        setNotification(`Generated ${createdCount} new service sessions.`);
        setTimeout(() => setNotification(null), 3000);
        fetchInitialData();
      } else if (!silent) {
        alert("All standard services for this period already exist.");
      }
    } catch (err: any) {
      console.error("Generation Error:", err);
      if (!silent) alert("Error generating services: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canEditEvents(userProfile?.role)) {
      alert("Unauthorized to create events.");
      return;
    }
    try {
      // 1. Create the Event in the Registry
      const eventPayload = {
        ...formData,
        branch_id: formData.branch_id || null
      };
      
      const { data: newEvent, error } = await supabase.from('events').insert([eventPayload]).select().single();
      if (error) throw error;
      
      // 2. Automatically create a Service Log in Attendance (except for Conferences)
      if (formData.category !== 'Conferences') {
        const serviceLog = {
          event_name: formData.title,
          event_type: formData.category,
          event_date: formData.date,
          branch_id: formData.branch_id || null
        };
        
        await supabase.from('attendance_events').insert([serviceLog]);
      }

      // 3. Generate Task Instances from Recurring Templates
      const { data: templates } = await supabase
        .from('recurring_task_templates')
        .select('*')
        .or(`service_type.eq.${formData.category},service_type.eq.All`);

      if (templates && templates.length > 0) {
        const taskInstances = templates.map(t => ({
          template_id: t.id,
          event_id: newEvent.id,
          title: t.title,
          description: t.description,
          status: 'Pending',
          due_date: formData.date
        }));

        const { error: taskError } = await supabase.from('task_instances').insert(taskInstances);
        if (taskError) console.warn("Event created, but tasks failed to generate:", taskError);
      }
      
      setNotification("Event scheduled and attendance log created.");
      
      setIsModalOpen(false);
      setFormData({ 
        title: '', 
        category: 'Prophetic Word Service', 
        date: new Date().toISOString().split('T')[0], 
        time: '18:00', 
        location: '', 
        branch_id: '',
        description: '', 
        status: 'Upcoming' 
      });
      setTimeout(() => setNotification(null), 3000);
      fetchInitialData();
    } catch (err: any) {
      console.error("Create Event Error:", err);
      if (err.message?.includes('schema cache') || err.message?.includes('not found') || err.message?.includes('Could not find') || err.message?.includes('column "branch_id" of relation "events" does not exist')) {
        setTableMissing(true);
      } else {
        alert("Error creating event: " + (err.details || err.message));
      }
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteConfirmId) return;
    
    setIsDeleting(deleteConfirmId);
    try {
      const { error } = await supabase.from('events').delete().eq('id', deleteConfirmId);
      if (error) throw error;
      
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
      // Parse YYYY-MM-DD manually to avoid timezone/UTC shifts
      const [year, month, day] = ev.date.split('-').map(Number);
      const matchesSearch = ev.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'All' || ev.category === filterCategory;
      const matchesMonth = (month - 1) === selectedMonth;
      const matchesYear = year === selectedYear;
      return matchesSearch && matchesCategory && matchesMonth && matchesYear;
    });
  }, [events, searchTerm, filterCategory, selectedMonth, selectedYear]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);

  if (tableMissing) {
    const repairSQL = `-- MASTER EVENTS REGISTRY REPAIR SCRIPT
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  pastor_in_charge TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  location TEXT,
  branch_id UUID REFERENCES public.branches(id),
  description TEXT,
  status TEXT DEFAULT 'Upcoming',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attendance_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_type TEXT,
  event_date DATE NOT NULL,
  branch_id UUID REFERENCES public.branches(id),
  total_attendance INTEGER DEFAULT 0,
  men_count INTEGER DEFAULT 0,
  women_count INTEGER DEFAULT 0,
  children_count INTEGER DEFAULT 0,
  new_souls INTEGER DEFAULT 0,
  first_timers INTEGER DEFAULT 0,
  offering_amount DECIMAL(10,2) DEFAULT 0,
  tithe_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recurring_task_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  service_type TEXT DEFAULT 'All',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.recurring_task_templates(id),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Pending',
  assigned_to UUID,
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ensure branch_id exists if table was created previously
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for staff" ON public.events;
CREATE POLICY "Allow all for staff" ON public.events FOR ALL USING (true) WITH CHECK (true);`;

    return (
      <div className="max-w-4xl mx-auto py-12 px-4 animate-in zoom-in-95 duration-500">
        <div className="royal-card p-12 md:p-16 rounded-[4rem] bg-white text-center border-2 border-rose-100 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 inset-x-0 h-2 bg-rose-500"></div>
          <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-inner">
             <svg className="w-12 h-12 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase mb-4 tracking-tighter">Programmes Registry Inaccessible</h2>
          <p className="text-slate-500 mb-10 font-medium max-w-lg mx-auto leading-relaxed">
            The programme database is missing. Run the restoration script to establish connectivity.
          </p>
          <pre className="bg-slate-900 text-fh-gold-pale p-8 rounded-[2rem] text-[10px] font-mono text-left h-48 overflow-y-auto mb-10 shadow-inner leading-relaxed border border-fh-gold/10 scrollbar-hide">
            {repairSQL}
          </pre>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => { navigator.clipboard.writeText(repairSQL); alert('SQL Script copied.'); }} className="px-10 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Copy Script</button>
            <button onClick={fetchInitialData} className="px-16 py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all border-b-4 border-black">Verify Restoration</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen pb-20 relative">
      {/* Notification */}
      {notification && (
        <div className="fixed top-10 right-10 z-[300] bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right-10 font-black uppercase text-[10px] tracking-widest flex items-center gap-3 border-b-4 border-black/20">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-fh-green tracking-tighter uppercase">Upcoming Events</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Programmes & Vitality Management</p>
        </div>
        <div className="flex items-center gap-3">
          {permissions.canEditEvents(userProfile?.role) && (
            <>
              <button 
                onClick={() => autoGenerateServices(false)}
                disabled={isGenerating}
                className="px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 animate-spin rounded-full" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                )}
                Auto-Generate
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="px-8 py-4 bg-fh-green text-fh-gold rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl border-b-4 border-black/20"
              >
                Schedule Programme
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search programmes..." 
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-fh-gold transition-all text-sm font-bold text-slate-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="w-full md:w-64 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-[10px] font-black uppercase text-slate-600 tracking-widest cursor-pointer"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            <option>Prophetic Word Service</option>
            <option>Help from above service</option>
            <option>Special services</option>
            <option>Conferences</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-50">
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
            {months.map((month, index) => (
              <button
                key={month}
                onClick={() => setSelectedMonth(index)}
                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                  selectedMonth === index 
                    ? 'bg-fh-green text-fh-gold shadow-md' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
              >
                {month.substring(0, 3)}
              </button>
            ))}
          </div>
          <select 
            className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase text-slate-600 tracking-widest cursor-pointer outline-none focus:ring-2 focus:ring-fh-green/20"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Events Grid */}
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-100" />
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">
            {months[selectedMonth]} {selectedYear}
          </h3>
          <div className="h-px flex-1 bg-slate-100" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full py-20 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">Synchronizing Programmes...</div>
          ) : filteredEvents.length > 0 ? filteredEvents.map(ev => (
            <div key={ev.id} className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm group hover:shadow-xl transition-all relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-fh-green opacity-0 group-hover:opacity-100 transition-all" />
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${categoryColors[ev.category as keyof typeof categoryColors] || 'bg-slate-100 text-slate-600'}`}>
                  {ev.category}
                </span>
                <span className={`text-[10px] font-black uppercase ${ev.status === 'Completed' ? 'text-fh-green' : 'text-indigo-600'}`}>
                  {ev.status}
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">{ev.title}</h3>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-slate-50 rounded-lg flex flex-col items-center justify-center border border-slate-100">
                  <span className="text-[8px] font-black text-slate-400 leading-none uppercase">
                    {new Date(ev.date + 'T12:00:00').toLocaleString('default', { month: 'short' })}
                  </span>
                  <span className="text-xs font-black text-slate-800 leading-none">
                    {ev.date.split('-')[2]}
                  </span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  {new Date(ev.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })} • {ev.time}
                </p>
              </div>
              
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-50">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {ev.location || 'Location Pending'}
                </div>
                {permissions.canEditEvents(userProfile?.role) && (
                  <button 
                    onClick={() => setDeleteConfirmId(ev.id)}
                    className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all active:scale-90"
                    title="Delete Programme"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )) : (
            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mb-6">No programmes found for {months[selectedMonth]} {selectedYear}.</p>
              {permissions.canEditEvents(userProfile?.role) && (
                <button 
                  onClick={() => autoGenerateServices(false, selectedMonth, selectedYear)}
                  className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-fh-green hover:text-fh-gold transition-all"
                >
                  Populate {months[selectedMonth]} {selectedYear}
                </button>
              )}
            </div>
          )}
        </div>
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
              Are you sure you want to permanently remove this programme from the registry?
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

      {/* CREATE EVENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <form onSubmit={handleCreateEvent} className="relative bg-white w-full max-w-md rounded-[3rem] p-10 space-y-4 shadow-2xl border-b-[12px] border-fh-gold">
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

            <button type="submit" className="w-full py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase shadow-lg tracking-widest mt-4">
              Confirm Programme
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default EventsView;
