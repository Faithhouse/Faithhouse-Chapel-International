import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../supabaseClient';
import { UserProfile, NavItem } from '../types';
import { permissions } from '../src/utils/permissions';

interface DashboardViewProps {
  userProfile?: UserProfile | null;
  setActiveItem: (item: NavItem) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ userProfile, setActiveItem }) => {
  console.log("DashboardView rendering with profile:", userProfile?.id);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ 
    members: 0, 
    visitors: 0, 
    events: 0, 
    followUp: 0 
  });

  const [chartData, setChartData] = useState<any[]>([]);
  const [recentMembers, setRecentMembers] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);
  const [missingTableName, setMissingTableName] = useState<string | null>(null);

  // Permission Helpers
  const role = userProfile?.role;
  const isLeadership = permissions.isLeadership(role);
  const isFinance = permissions.canManageFinance(role);
  const canSeeRegistry = permissions.canSeeRegistry(role);
  const isFollowUpTeam = permissions.isFollowUpTeam(role);

  useEffect(() => {
    fetchDashboardData();

    // Set up real-time subscription for dashboard data
    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_instances' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitation_records' }, () => fetchDashboardData())
      .subscribe();

    // Auto-refresh when the window gains focus (crucial for mobile/PWA)
    const handleFocus = () => {
      console.log('App focused, refreshing dashboard data...');
      fetchDashboardData();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', handleFocus);
    };
  }, [userProfile]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use local date for more accurate "today" comparison
      const localNow = new Date();
      const todayStr = localNow.toLocaleDateString('en-CA'); // YYYY-MM-DD
      
      // 0. Auto-cleanup expired events to keep the system clean
      const { error: cleanupError } = await supabase
        .from('events')
        .delete()
        .lt('date', todayStr);
      
      if (cleanupError) {
        console.error("Cleanup Error:", cleanupError);
      } else {
        console.log("Expired events cleaned up successfully.");
      }

      // 1. Fetch Global Stats
      const { count: memberCount, error: mErr } = await supabase.from('members').select('*', { count: 'exact', head: true });
      if (mErr) console.warn("Member count fetch failed:", mErr);

      const { count: visitorCount } = await supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'Visitor');
      const { count: pendingFollowUp } = await supabase.from('visitation_records').select('*', { count: 'exact', head: true }).eq('status', 'Pending');
      
      const firstDay = new Date(localNow.getFullYear(), localNow.getMonth(), 1).toLocaleDateString('en-CA');
      const lastDay = new Date(localNow.getFullYear(), localNow.getMonth() + 1, 0).toLocaleDateString('en-CA');
      
      const { count: eventCount } = await supabase.from('events')
        .select('*', { count: 'exact', head: true })
        .gte('date', firstDay)
        .lte('date', lastDay);

      setStats({
        members: memberCount || 0,
        visitors: visitorCount || 0,
        followUp: pendingFollowUp || 0,
        events: eventCount || 0
      });

      // 2. Conditional Fetch: Recent Members
      if (canSeeRegistry) {
        const { data: recent, error: rErr } = await supabase
          .from('members')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(4);
        if (rErr) console.warn("Recent members fetch failed:", rErr);
        setRecentMembers(recent || []);
      }

      // 3. Fetch Upcoming Events
      const { data: events, error: eErr } = await supabase
        .from('events')
        .select('*')
        .gte('date', todayStr)
        .order('date', { ascending: true })
        .limit(5);
      if (eErr) console.warn("Upcoming events fetch failed:", eErr);
      setUpcomingEvents(events || []);

      // 4. Fetch Today's Tasks
      const { data: tasks, error: tErr } = await supabase
        .from('task_instances')
        .select('*')
        .eq('due_date', todayStr)
        .order('status', { ascending: false });
      
      if (tErr) {
        if (tErr.code !== '42P01' && tErr.code !== 'PGRST205') {
          console.warn("Today's tasks fetch failed:", tErr);
        }
      }
      setTodayTasks(tasks || []);

      // 5. Conditional Fetch: Growth Chart
      if (isLeadership || isFinance) {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const { data: growthData, error: gErr } = await supabase
          .from('members')
          .select('created_at')
          .gte('created_at', sixMonthsAgo.toISOString());
        
        if (gErr) console.warn("Growth data fetch failed:", gErr);

        if (growthData) {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const currentMonth = new Date().getMonth();
          const last6Months = [];
          
          for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(currentMonth - i);
            const monthName = months[d.getMonth()];
            const count = growthData.filter(m => {
              if (!m.created_at) return false;
              const mDate = new Date(m.created_at);
              return mDate.getMonth() === d.getMonth() && mDate.getFullYear() === d.getFullYear();
            }).length;
            last6Months.push({ name: monthName, count: count });
          }
          setChartData(last6Months);
        }
      }

    } catch (err: any) {
      console.error("Dashboard Data Sync Error:", err);
      if (err.code === '42P01') {
        setTableMissing(true);
        setMissingTableName(err.message.match(/'public\.(.*)'/)?.[1] || "database table");
      } else {
        setError(err.message || "Failed to synchronize with the database.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    try {
      const { error } = await supabase
        .from('task_instances')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'Completed' ? new Date().toISOString() : null,
          completed_by: newStatus === 'Completed' ? userProfile?.id : null
        })
        .eq('id', taskId);
      
      if (error) throw error;
      fetchDashboardData();
    } catch (err) {
      console.error("Error updating task:", err);
    }
  };

  if (tableMissing) {
    const repairSQL = `-- SYSTEM REPAIR SCRIPT
CREATE TABLE IF NOT EXISTS public.recurring_task_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  service_type TEXT NOT NULL,
  assigned_ministry TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.recurring_task_templates(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Pending',
  assigned_to TEXT,
  due_date DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.recurring_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for staff" ON public.recurring_task_templates;
CREATE POLICY "Allow all for staff" ON public.recurring_task_templates FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for staff" ON public.task_instances;
CREATE POLICY "Allow all for staff" ON public.task_instances FOR ALL USING (true) WITH CHECK (true);`;

    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2.5rem] flex items-center justify-center shadow-xl border border-rose-100 mb-8">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight mb-4">Database Table Missing</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-10 leading-relaxed">
          The system detected that the <b>{missingTableName}</b> table is missing. Run the following repair script in your Supabase SQL Editor to restore functionality.
        </p>
        <pre className="bg-slate-900 text-fh-gold p-8 rounded-[2rem] text-[10px] font-mono text-left max-w-2xl w-full h-64 overflow-y-auto mb-10 shadow-inner leading-relaxed border border-fh-gold/10">
          {repairSQL}
        </pre>
        <button 
          onClick={() => { setTableMissing(false); fetchDashboardData(); }}
          className="px-12 py-4 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all"
        >
          Verify Restoration
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-16">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-4">
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-4xl md:text-5xl font-black text-fh-green tracking-tighter uppercase leading-none">
            {isLeadership ? 'Church Governance & Oversight' : 'Staff Insight'}
          </h2>
          <div className="mt-8 text-center">
            <p className="text-sm md:text-base text-slate-400 font-medium italic tracking-wide leading-relaxed">
              "Know the state of your flocks, and put your heart into caring for your herds,"
            </p>
            <p className="mt-2 font-black uppercase tracking-[0.5em] text-[10px] text-fh-gold">
              Proverbs 27:23
            </p>
          </div>
        </div>
        <button 
          onClick={fetchDashboardData}
          disabled={isLoading}
          className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-fh-green transition-all shadow-sm active:scale-95 disabled:opacity-50"
          title="Refresh Dashboard"
        >
          <svg className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-[2rem] flex items-center gap-4 text-rose-800">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-xs font-bold uppercase tracking-wide">{error}</p>
        </div>
      )}
      
      {/* 2. Stat Bar - ROLE FILTERED */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Members */}
        {canSeeRegistry && (
          <div className="bg-white rounded-[2rem] shadow-sm p-6 flex flex-col justify-between border-b-4 border-cms-blue">
            <div className="flex justify-between items-start mb-4">
               <div className="w-12 h-12 bg-blue-50 text-cms-blue rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
               </div>
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{isLoading ? '...' : stats.members}</h2>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Active Registry</p>
            </div>
          </div>
        )}

        {/* Visitors */}
        {(isLeadership || isFollowUpTeam) && (
          <div className="bg-white rounded-[2rem] shadow-sm p-6 flex flex-col justify-between border-b-4 border-cms-purple">
            <div className="flex justify-between items-start mb-4">
               <div className="w-12 h-12 bg-purple-50 text-cms-purple rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
               </div>
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{isLoading ? '...' : stats.visitors}</h2>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">New Souls</p>
            </div>
          </div>
        )}

        {/* Follow-up Needed */}
        {isFollowUpTeam && (
          <div 
            onClick={() => setActiveItem('Visitation & Follow-up')}
            className="bg-white rounded-[2rem] shadow-sm p-6 flex flex-col justify-between border-b-4 border-cms-emerald cursor-pointer active:scale-95"
          >
            <div className="flex justify-between items-start mb-4">
               <div className="w-12 h-12 bg-emerald-50 text-cms-emerald rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01" /></svg>
               </div>
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{isLoading ? '...' : stats.followUp}</h2>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Retention Priority</p>
            </div>
          </div>
        )}

        {/* Events */}
        <div 
          onClick={() => setActiveItem('Upcoming Events' as any)}
          className="bg-white rounded-[2rem] shadow-sm p-6 flex flex-col justify-between border-b-4 border-cms-rose cursor-pointer"
        >
          <div className="flex justify-between items-start mb-4">
             <div className="w-12 h-12 bg-rose-50 text-cms-rose rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10" /></svg>
             </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{isLoading ? '...' : stats.events}</h2>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Upcoming Programmes</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Growth Trend */}
          {isLeadership ? (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm">
               <div className="flex items-center justify-between mb-8">
                  <div>
                     <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Growth Delta</h3>
                     <p className="text-xl font-black text-slate-900 tracking-tighter mt-1">Expansion Velocity</p>
                  </div>
               </div>
               <div className="h-[220px] w-full">
                  {chartData && chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#20c997" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#20c997" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f8fafc" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#cbd5e1', fontSize: 10, fontWeight: '800'}} />
                        <YAxis hide />
                        <Tooltip />
                        <Area type="monotone" dataKey="count" stroke="#20c997" strokeWidth={4} fill="url(#colorGrowth)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {isLoading ? 'Calculating Growth...' : 'Insufficient Data for Analysis'}
                      </p>
                    </div>
                  )}
               </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Growth analytics reserved for Leadership</p>
            </div>
          )}

          {/* Recent Registry */}
          {canSeeRegistry && (
            <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-50 shadow-sm">
              <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recent Entries</h3>
                <button onClick={() => setActiveItem('Members')} className="text-[10px] font-black text-cms-blue uppercase tracking-widest">View All</button>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentMembers.length > 0 ? recentMembers.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 border border-slate-100 rounded-2xl">
                      <div className="w-12 h-12 rounded-xl bg-slate-950 text-fh-gold flex items-center justify-center font-black text-[10px]">
                        {m.first_name ? m.first_name[0] : '?'}{m.last_name ? m.last_name[0] : ''}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-black text-slate-900 uppercase truncate">{m.first_name || 'Unknown'} {m.last_name || ''}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{m.created_at ? getRelativeTime(m.created_at) : '---'}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-2 py-8 text-center">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">No recent entries found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-50 shadow-sm">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Upcoming Programmes</h3>
            </div>
            <div className="p-6 space-y-3">
              {upcomingEvents.length > 0 ? upcomingEvents.map((ev, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-50 hover:bg-slate-50">
                  <div className="w-12 h-12 bg-slate-900 rounded-xl flex flex-col items-center justify-center text-white leading-none">
                    <p className="text-[10px] font-black">{ev.date ? ev.date.split('-')[2] : '?'}</p>
                    <p className="text-[7px] font-bold opacity-40 uppercase mt-1">
                      {ev.date ? new Date(ev.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' }) : '---'}
                    </p>
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-black text-slate-900 uppercase truncate">{ev.title || 'Unnamed Programme'}</p>
                  </div>
                </div>
              )) : (
                <div className="py-8 text-center">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">No upcoming programmes</p>
                </div>
              )}
            </div>
          </div>

          {/* Service Checklist */}
          <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-50 shadow-sm">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-fh-green/5">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-fh-green">Service Checklist</h3>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
            <div className="p-6 space-y-2">
              {todayTasks.length > 0 ? todayTasks.map((task, i) => (
                <div 
                  key={i} 
                  onClick={() => toggleTaskStatus(task.id, task.status)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${task.status === 'Completed' ? 'bg-emerald-50/50 border-emerald-100 opacity-60' : 'bg-white border-slate-100 hover:border-fh-gold'}`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${task.status === 'Completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200'}`}>
                    {task.status === 'Completed' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs font-black uppercase tracking-tight ${task.status === 'Completed' ? 'text-emerald-700 line-through' : 'text-slate-800'}`}>{task.title}</p>
                    {task.description && <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 truncate">{task.description}</p>}
                  </div>
                </div>
              )) : (
                <div className="py-8 text-center">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">No tasks for today's service</p>
                   <button onClick={() => setActiveItem('Recurring Tasks')} className="mt-4 text-[9px] font-black text-cms-blue uppercase tracking-widest hover:underline">Manage Tasks</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
