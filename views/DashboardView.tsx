import React, { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { supabase } from '../supabaseClient';
import { UserProfile, NavItem, Member } from '../types';
import { permissions } from '../src/utils/permissions';
import { toast } from 'sonner';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownRight, 
  MoreHorizontal, 
  Plus, 
  Calendar, 
  UserPlus, 
  CheckSquare, 
  TrendingUp, 
  Users, 
  UserCheck, 
  Clock, 
  AlertCircle,
  ChevronRight,
  UserMinus,
  MessageSquare,
  Activity,
  Zap,
  CheckCircle2,
  ExternalLink,
  DollarSign,
  Gift,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardViewProps {
  userProfile?: UserProfile | null;
  setActiveItem: (item: NavItem) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ userProfile, setActiveItem }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ 
    totalMembers: { value: 0, trend: 0, status: 'neutral' as 'neutral' | 'growth' | 'attention' | 'warning', sparkline: [] as any[] },
    attendanceRate: { value: 0, trend: 0, status: 'neutral' as 'neutral' | 'growth' | 'attention' | 'warning', sparkline: [] as any[] },
    newConverts: { value: 0, trend: 0, status: 'growth' as 'neutral' | 'growth' | 'attention' | 'warning', sparkline: [] as any[] },
    followUpsPending: { value: 0, trend: 0, status: 'warning' as 'neutral' | 'growth' | 'attention' | 'warning', sparkline: [] as any[] },
    inactiveMembers: { value: 0, trend: 0, status: 'attention' as 'neutral' | 'growth' | 'attention' | 'warning', sparkline: [] as any[] }
  });

  const [growthData, setGrowthData] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [recentMembers, setRecentMembers] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<Member[]>([]);
  const [upcomingAnniversaries, setUpcomingAnniversaries] = useState<Member[]>([]);
  const [financialTrends, setFinancialTrends] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('This Month');
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

    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_instances' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitation_records' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_events' }, () => fetchDashboardData())
      .subscribe();

    const handleFocus = () => fetchDashboardData();
    window.addEventListener('focus', handleFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', handleFocus);
    };
  }, [userProfile, dateFilter]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const localNow = new Date();
      const todayStr = localNow.toLocaleDateString('en-CA');
      
      // 0. Auto-cleanup expired events
      await supabase.from('events').delete().lt('date', todayStr);

      // 1. Fetch Global Stats & Trends
      const { data: allMembers, error: mErr } = await supabase.from('members').select('*');
      if (mErr) throw mErr;

      const { data: allAttendance, error: aErr } = await supabase.from('attendance_events').select('*').order('event_date', { ascending: true });
      if (aErr && aErr.code !== '42P01' && aErr.code !== 'PGRST205') throw aErr;

      const { data: allFollowUps, error: fErr } = await supabase.from('visitation_records').select('*');
      if (fErr && fErr.code !== '42P01' && fErr.code !== 'PGRST205') throw fErr;

      const { data: events, error: eErr } = await supabase.from('events').select('*').gte('date', todayStr).order('date', { ascending: true }).limit(5);
      if (eErr) throw eErr;

      const { data: tasks, error: tErr } = await supabase.from('task_instances').select('*').eq('due_date', todayStr).order('status', { ascending: false });
      if (tErr && tErr.code !== '42P01' && tErr.code !== 'PGRST205') throw tErr;

      const { data: finance, error: finErr } = await supabase.from('financial_records').select('*').order('service_date', { ascending: true });
      if (finErr && finErr.code !== '42P01' && finErr.code !== 'PGRST205') throw finErr;

      // Processing Data
      const members = allMembers || [];
      const attendance = allAttendance || [];
      const followUps = allFollowUps || [];
      
      // Calculate Stats
      const totalMembers = members.length;
      const newConverts = members.filter(m => {
        const joinDate = new Date(m.created_at);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return joinDate > thirtyDaysAgo;
      }).length;

      const followUpsPending = followUps.filter(f => f.status === 'Pending').length;
      const inactiveMembers = members.filter(m => m.status === 'Inactive').length;

      // Attendance Rate (Last 4 services)
      const last4Attendance = attendance.slice(-4);
      const avgAttendance = last4Attendance.length > 0 
        ? Math.round(last4Attendance.reduce((acc, curr) => acc + (curr.total_attendance || 0), 0) / last4Attendance.length)
        : 0;
      const attendanceRate = totalMembers > 0 ? Math.round((avgAttendance / totalMembers) * 100) : 0;

      // Trends (Mocking trends for now based on last 30 days vs previous 30 days)
      const getTrend = (current: number, previous: number) => {
        if (previous === 0) return 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      setStats({
        totalMembers: { value: totalMembers, trend: 0, status: 'neutral', sparkline: [] },
        attendanceRate: { value: attendanceRate, trend: 0, status: attendanceRate > 80 ? 'growth' : attendanceRate > 60 ? 'warning' : 'attention', sparkline: [] },
        newConverts: { value: newConverts, trend: 0, status: 'growth', sparkline: [] },
        followUpsPending: { value: followUpsPending, trend: 0, status: followUpsPending > 10 ? 'attention' : followUpsPending > 5 ? 'warning' : 'neutral', sparkline: [] },
        inactiveMembers: { value: inactiveMembers, trend: 0, status: inactiveMembers > 20 ? 'attention' : 'warning', sparkline: [] }
      });

      // 2. Growth Chart Data (Last 6 Months)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(currentMonth - i);
        const monthName = months[d.getMonth()];
        const count = members.filter(m => {
          const mDate = new Date(m.created_at);
          return mDate.getMonth() === d.getMonth() && mDate.getFullYear() === d.getFullYear();
        }).length;
        last6Months.push({ name: monthName, count: count });
      }
      setGrowthData(last6Months);

      // 3. Attendance Chart Data (Last 6 entries)
      setAttendanceData(attendance.slice(-6).map(a => ({
        name: new Date(a.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total: a.total_attendance,
        men: a.men_count,
        women: a.women_count,
        children: a.children_count
      })));

      // 4. Pastoral Insights
      const newInsights = [];
      
      if (newConverts > 0) {
        newInsights.push({
          type: 'success',
          title: 'Growth Spike',
          message: `${newConverts} new converts joined this month. Ensure follow-up protocols are active.`,
          icon: <TrendingUp className="w-5 h-5" />
        });
      }
      if (followUpsPending > 5) {
        newInsights.push({
          type: 'warning',
          title: 'Follow-up Backlog',
          message: `There are ${followUpsPending} pending follow-ups. Retention risk is increasing.`,
          icon: <Clock className="w-5 h-5" />
        });
      }
      if (attendanceRate < 70) {
        newInsights.push({
          type: 'danger',
          title: 'Attendance Dip',
          message: `Attendance rate dropped to ${attendanceRate}%. Consider a community outreach or check-in call.`,
          icon: <AlertCircle className="w-5 h-5" />
        });
      }
      setInsights(newInsights);

      setRecentMembers(members.slice(0, 4));
      setUpcomingEvents(events || []);
      setTodayTasks(tasks || []);

      // 5. Birthdays & Anniversaries (Next 7 Days)
      const upcomingBdays = members.filter(m => {
        if (!m.dob) return false;
        const bday = new Date(m.dob);
        const today = new Date();
        const next7Days = new Date();
        next7Days.setDate(today.getDate() + 7);
        
        const bdayThisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
        // Handle year wrap around if today is late December
        if (bdayThisYear < today && bday.getMonth() === 0 && today.getMonth() === 11) {
          bdayThisYear.setFullYear(today.getFullYear() + 1);
        }
        return bdayThisYear >= today && bdayThisYear <= next7Days;
      }).sort((a, b) => {
        const dateA = new Date(a.dob!);
        const dateB = new Date(b.dob!);
        return dateA.getMonth() - dateB.getMonth() || dateA.getDate() - dateB.getDate();
      });
      setUpcomingBirthdays(upcomingBdays);

      const upcomingAnnis = members.filter(m => {
        if (!m.wedding_anniversary) return false;
        const anni = new Date(m.wedding_anniversary);
        const today = new Date();
        const next7Days = new Date();
        next7Days.setDate(today.getDate() + 7);
        
        const anniThisYear = new Date(today.getFullYear(), anni.getMonth(), anni.getDate());
        if (anniThisYear < today && anni.getMonth() === 0 && today.getMonth() === 11) {
          anniThisYear.setFullYear(today.getFullYear() + 1);
        }
        return anniThisYear >= today && anniThisYear <= next7Days;
      }).sort((a, b) => {
        const dateA = new Date(a.wedding_anniversary!);
        const dateB = new Date(b.wedding_anniversary!);
        return dateA.getMonth() - dateB.getMonth() || dateA.getDate() - dateB.getDate();
      });
      setUpcomingAnniversaries(upcomingAnnis);

      // 6. Financial Trends
      if (finance && finance.length > 0) {
        const finData = finance.slice(-6).map(f => ({
          name: new Date(f.service_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          tithes: Number(f.tithes || 0),
          offerings: Number(f.offerings || 0),
          total: Number(f.tithes || 0) + Number(f.offerings || 0) + Number(f.seed || 0) + Number(f.other_income || 0)
        }));
        setFinancialTrends(finData);
      }

      setTableMissing(false);
      if (isLoading) toast.success("Dashboard data synced successfully!");
    } catch (err: any) {
      console.error("Dashboard Data Sync Error:", err);
      if (err.code === '42P01' || err.code === 'PGRST205') {
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
-- Ensure members table exists first
CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  gender TEXT DEFAULT 'Male',
  dob DATE,
  wedding_anniversary DATE,
  date_joined DATE,
  status TEXT DEFAULT 'Active',
  ministry TEXT DEFAULT 'N/A',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_date DATE NOT NULL,
  service_type TEXT NOT NULL,
  tithes NUMERIC DEFAULT 0,
  offerings NUMERIC DEFAULT 0,
  seed NUMERIC DEFAULT 0,
  expenses NUMERIC DEFAULT 0,
  other_income NUMERIC DEFAULT 0,
  total_income NUMERIC DEFAULT 0,
  bank_balance NUMERIC DEFAULT 0,
  momo_balance NUMERIC DEFAULT 0,
  witness1_name TEXT NOT NULL,
  witness2_name TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'Posted',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tithe_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL,
  service_type TEXT,
  recorded_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_member FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tithe_member_id ON public.tithe_entries(member_id);

CREATE TABLE IF NOT EXISTS public.recurring_task_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  service_type TEXT NOT NULL,
  assigned_ministry TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  location TEXT,
  description TEXT,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'Upcoming',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(date, category, branch_id)
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

CREATE TABLE IF NOT EXISTS public.leadership (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  position TEXT NOT NULL,
  category TEXT NOT NULL,
  department TEXT,
  email TEXT,
  phone TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tithe_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leadership ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for staff" ON public.members;
CREATE POLICY "Allow all for staff" ON public.members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for staff" ON public.financial_records;
CREATE POLICY "Allow all for staff" ON public.financial_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for staff" ON public.tithe_entries;
CREATE POLICY "Allow all for staff" ON public.tithe_entries FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for staff" ON public.recurring_task_templates;
CREATE POLICY "Allow all for staff" ON public.recurring_task_templates FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for staff" ON public.task_instances;
CREATE POLICY "Allow all for staff" ON public.task_instances FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for staff" ON public.events;
CREATE POLICY "Allow all for staff" ON public.events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for staff" ON public.leadership;
CREATE POLICY "Allow all for staff" ON public.leadership FOR ALL USING (true) WITH CHECK (true);

-- FORCE SCHEMA CACHE RELOAD
NOTIFY pgrst, 'reload schema';`;

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
          onClick={() => { fetchDashboardData(); }}
          disabled={isLoading}
          className="px-12 py-4 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all disabled:opacity-50"
        >
          {isLoading ? "Verifying..." : "Verify Restoration"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24 relative">
      
      {/* 1. Header Section */}
      <div className="flex flex-col items-center text-center gap-6 mb-10 pt-4">
        <div className="space-y-3 max-w-4xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            Church Governance & Insight
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-slate-500 font-medium italic tracking-wide leading-relaxed">
            "Know the state of your flocks, and put your heart into caring for your herds." – Proverbs 27:23
          </p>
        </div>
        
        {/* Control Area */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-fh-green/20 focus:border-fh-green transition-all outline-none shadow-sm"
            />
          </div>
          <div className="flex bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
            {['This Week', 'This Month'].map((filter) => (
              <button
                key={filter}
                onClick={() => setDateFilter(filter)}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dateFilter === filter ? 'bg-fh-green text-fh-gold shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {filter}
              </button>
            ))}
          </div>
          <button 
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-fh-green transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-between gap-4 text-rose-800"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            <p className="text-xs font-bold uppercase tracking-wide">{error}</p>
          </div>
          <button onClick={() => fetchDashboardData()} className="px-4 py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-sm">Retry</button>
        </motion.div>
      )}

      {/* 2. KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard 
          title="Total Members" 
          value={stats.totalMembers.value} 
          trend={stats.totalMembers.trend} 
          icon={<Users className="w-5 h-5" />} 
          status={stats.totalMembers.status}
          sparkline={stats.totalMembers.sparkline}
          isLoading={isLoading}
        />
        <KPICard 
          title="Attendance Rate" 
          value={`${stats.attendanceRate.value}%`} 
          trend={stats.attendanceRate.trend} 
          icon={<UserCheck className="w-5 h-5" />} 
          status={stats.attendanceRate.status}
          sparkline={stats.attendanceRate.sparkline}
          isLoading={isLoading}
        />
        <KPICard 
          title="New Converts" 
          value={stats.newConverts.value} 
          trend={stats.newConverts.trend} 
          icon={<Zap className="w-5 h-5" />} 
          status={stats.newConverts.status}
          sparkline={stats.newConverts.sparkline}
          isLoading={isLoading}
        />
        <KPICard 
          title="Follow-ups Pending" 
          value={stats.followUpsPending.value} 
          trend={stats.followUpsPending.trend} 
          icon={<MessageSquare className="w-5 h-5" />} 
          status={stats.followUpsPending.status}
          sparkline={stats.followUpsPending.sparkline}
          isLoading={isLoading}
        />
        <KPICard 
          title="Inactive Members" 
          value={stats.inactiveMembers.value} 
          trend={stats.inactiveMembers.trend} 
          icon={<UserMinus className="w-5 h-5" />} 
          status={stats.inactiveMembers.status}
          sparkline={stats.inactiveMembers.sparkline}
          isLoading={isLoading}
        />
      </div>

      {/* 3. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Charts */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Membership Growth Chart */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/50 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp className="w-32 h-32 text-fh-green" />
            </div>
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Analytics</h3>
                <p className="text-xl font-black text-slate-900 tracking-tighter mt-1">Membership Growth</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                <ArrowUpRight className="w-3 h-3" />
                <span>+12.5% vs Last Period</span>
              </div>
            </div>
            <div className="h-[300px] w-full relative z-10">
              {growthData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthData} id="dashboard-growth-line">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 10, fontWeight: '700'}} 
                      dy={10}
                      label={{ value: 'Month', position: 'insideBottom', offset: -5, fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 10, fontWeight: '700'}}
                      label={{ value: 'Members', angle: -90, position: 'insideLeft', fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      name="Total Members"
                      stroke="#20c997" 
                      strokeWidth={4} 
                      dot={{ r: 6, fill: '#20c997', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 8, strokeWidth: 0 }}
                      animationDuration={1500}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Insufficient Data for Analysis</p>
                </div>
              )}
            </div>
          </div>

          {/* Financial Trends Chart */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/50 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <DollarSign className="w-32 h-32 text-fh-green" />
            </div>
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Finance</h3>
                <p className="text-xl font-black text-slate-900 tracking-tighter mt-1">Income Trends</p>
              </div>
              <button onClick={() => setActiveItem('Finance')} className="text-[10px] font-black text-fh-green uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                Full Report <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="h-[300px] w-full relative z-10">
              {financialTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financialTrends} id="dashboard-finance-bar">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 10, fontWeight: '700'}} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 10, fontWeight: '700'}}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                    <Bar dataKey="tithes" name="Tithes" fill="#20c997" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="offerings" name="Offerings" fill="#ffd700" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No Financial Data Available</p>
                </div>
              )}
            </div>
          </div>

          {/* Attendance Overview Chart */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/50 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Engagement</h3>
                <p className="text-xl font-black text-slate-900 tracking-tighter mt-1">Attendance Overview</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-fh-green"></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Total</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Segments</span>
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              {attendanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceData} id="dashboard-attendance-bar">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 10, fontWeight: '700'}}
                      dy={10}
                      label={{ value: 'Service Date', position: 'insideBottom', offset: -5, fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 10, fontWeight: '700'}}
                      label={{ value: 'Headcount', angle: -90, position: 'insideLeft', fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                    />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                    <Bar dataKey="total" name="Total Attendance" fill="#20c997" radius={[6, 6, 0, 0]} barSize={32} />
                    <Bar dataKey="men" name="Men" fill="#e2e8f0" radius={[6, 6, 0, 0]} barSize={8} />
                    <Bar dataKey="women" name="Women" fill="#cbd5e1" radius={[6, 6, 0, 0]} barSize={8} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No Attendance Records Found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Insights & Tasks */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Pastoral Insights Panel */}
          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-fh-green/10 rounded-full blur-3xl"></div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-fh-green/20 text-fh-green rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-fh-green/60">Decision Support</h3>
                <p className="text-lg font-black tracking-tighter">Pastoral Insights</p>
              </div>
            </div>

            <div className="space-y-4">
              {insights.length > 0 ? insights.map((insight, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`p-4 rounded-2xl border ${
                    insight.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                    insight.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                    'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{insight.icon}</div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest mb-1">{insight.title}</p>
                      <p className="text-[11px] font-medium leading-relaxed opacity-80">{insight.message}</p>
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div className="py-12 text-center opacity-40">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">All protocols are optimal</p>
                </div>
              )}
            </div>

            <button className="w-full mt-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all">
              Generate Full Report
            </button>
          </div>

          {/* Service Checklist */}
          <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-200/50 shadow-sm">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-fh-green" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Service Checklist</h3>
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
            <div className="p-6 space-y-3">
              {todayTasks.length > 0 ? todayTasks.map((task, i) => (
                <div 
                  key={i} 
                  onClick={() => toggleTaskStatus(task.id, task.status)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group ${task.status === 'Completed' ? 'bg-emerald-50/30 border-emerald-100 opacity-60' : 'bg-white border-slate-100 hover:border-fh-green hover:shadow-md'}`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${task.status === 'Completed' ? 'bg-fh-green border-fh-green text-fh-gold' : 'border-slate-200 group-hover:border-fh-green'}`}>
                    {task.status === 'Completed' && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs font-black uppercase tracking-tight ${task.status === 'Completed' ? 'text-emerald-700 line-through' : 'text-slate-800'}`}>{task.title}</p>
                    {task.description && <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 truncate">{task.description}</p>}
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center">
                   <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                     <CheckSquare className="w-6 h-6 text-slate-200" />
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">No tasks for today</p>
                   <button onClick={() => setActiveItem('Recurring Tasks')} className="mt-4 text-[9px] font-black text-fh-green uppercase tracking-widest hover:underline">Manage Tasks</button>
                </div>
              )}
            </div>
          </div>

          {/* Birthday & Anniversary Tracker */}
          <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-200/50 shadow-sm">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-fh-green" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Celebrations</h3>
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Next 7 Days</span>
            </div>
            <div className="p-6 space-y-6">
              {/* Birthdays */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-fh-green"></div>
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Upcoming Birthdays</h4>
                </div>
                <div className="space-y-3">
                  {upcomingBirthdays.length > 0 ? upcomingBirthdays.map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-fh-green transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-900">
                          {m.first_name[0]}{m.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{m.first_name} {m.last_name}</p>
                          <p className="text-[8px] font-bold text-fh-green uppercase">{new Date(m.dob!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        </div>
                      </div>
                      <button className="p-2 bg-white rounded-lg border border-slate-200 text-slate-400 hover:text-fh-green hover:border-fh-green transition-all opacity-0 group-hover:opacity-100">
                        <MessageSquare className="w-3 h-3" />
                      </button>
                    </div>
                  )) : (
                    <p className="text-[9px] text-slate-300 font-bold uppercase text-center py-2">No birthdays this week</p>
                  )}
                </div>
              </div>

              {/* Anniversaries */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Wedding Anniversaries</h4>
                </div>
                <div className="space-y-3">
                  {upcomingAnniversaries.length > 0 ? upcomingAnniversaries.map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/30 border border-amber-100 group hover:border-amber-400 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white border border-amber-200 flex items-center justify-center text-[10px] font-black text-slate-900">
                          <Heart className="w-3 h-3 text-rose-400" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{m.first_name} {m.last_name}</p>
                          <p className="text-[8px] font-bold text-amber-600 uppercase">{new Date(m.wedding_anniversary!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        </div>
                      </div>
                      <button className="p-2 bg-white rounded-lg border border-amber-200 text-amber-400 hover:text-amber-600 transition-all opacity-0 group-hover:opacity-100">
                        <MessageSquare className="w-3 h-3" />
                      </button>
                    </div>
                  )) : (
                    <p className="text-[9px] text-slate-300 font-bold uppercase text-center py-2">No anniversaries this week</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Members List */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200/50 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-fh-green" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recent Members</h3>
            </div>
            <button onClick={() => setActiveItem('Members')} className="text-[10px] font-black text-fh-green uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
              View Directory <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {recentMembers.length > 0 ? recentMembers.map((m, idx) => (
              <div key={idx} className="flex items-center justify-between p-6 hover:bg-slate-50/50 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-fh-gold flex items-center justify-center font-black text-sm shadow-lg group-hover:scale-110 transition-transform">
                    {m.first_name ? m.first_name[0] : '?'}{m.last_name ? m.last_name[0] : ''}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{m.first_name} {m.last_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                        m.status === 'New' ? 'bg-blue-50 text-blue-600' : 
                        m.status === 'Visitor' ? 'bg-amber-50 text-amber-600' : 
                        'bg-emerald-50 text-emerald-600'
                      }`}>
                        {m.status || 'Returning'}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Last: {getRelativeTime(m.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                    View Profile
                  </button>
                  <button className="px-3 py-1.5 bg-fh-green text-fh-gold rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md">
                    Follow Up
                  </button>
                </div>
              </div>
            )) : (
              <div className="py-20 text-center opacity-30">
                <Users className="w-12 h-12 mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">Registry is empty</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Programmes List */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200/50 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-fh-green" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Upcoming Programmes</h3>
            </div>
            <button onClick={() => setActiveItem('Upcoming Events' as any)} className="text-[10px] font-black text-fh-green uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
              Full Calendar <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {upcomingEvents.length > 0 ? upcomingEvents.map((ev, i) => (
              <div key={i} className="flex items-center justify-between p-6 hover:bg-slate-50/50 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-950 rounded-2xl flex flex-col items-center justify-center text-fh-gold shadow-lg group-hover:rotate-3 transition-transform">
                    <p className="text-lg font-black leading-none">{ev.date ? ev.date.split('-')[2] : '?'}</p>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mt-1">
                      {ev.date ? new Date(ev.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' }) : '---'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{ev.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                        <Clock className="w-3 h-3" /> {ev.time || 'TBD'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                        ev.category === 'Service' ? 'bg-fh-green/10 text-fh-green' : 
                        ev.category === 'Meeting' ? 'bg-blue-50 text-blue-600' : 
                        'bg-purple-50 text-purple-600'
                      }`}>
                        {ev.category || 'Service'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                    View
                  </button>
                  <button className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md">
                    Edit
                  </button>
                </div>
              </div>
            )) : (
              <div className="py-20 text-center opacity-30">
                <Calendar className="w-12 h-12 mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">No scheduled events</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Footer Scripture */}
      {/* 5. Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col-reverse items-end gap-4 group">
        <button className="w-16 h-16 bg-slate-900 text-fh-gold rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group-hover:rotate-90">
          <Plus className="w-8 h-8" />
        </button>
        
        {/* Quick Actions Menu */}
        <div className="flex flex-col items-end gap-3 opacity-0 translate-y-10 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300">
          <ActionButton icon={<UserPlus className="w-4 h-4" />} label="Add Member" onClick={() => setActiveItem('Members')} />
          <ActionButton icon={<CheckSquare className="w-4 h-4" />} label="Record Attendance" onClick={() => setActiveItem('Events' as any)} />
          <ActionButton icon={<Calendar className="w-4 h-4" />} label="Add Programme" onClick={() => setActiveItem('Upcoming Events' as any)} />
        </div>
      </div>

    </div>
  );
};

// Helper Components
const KPICard = ({ title, value, trend, icon, status, sparkline, isLoading }: any) => {
  const isPositive = trend >= 0;
  const statusClasses: any = {
    growth: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    attention: 'text-rose-600 bg-rose-50 border-rose-100',
    warning: 'text-amber-600 bg-amber-50 border-amber-100',
    neutral: 'text-blue-600 bg-blue-50 border-blue-100'
  };

  const trendColor = status === 'growth' ? 'text-emerald-600' : status === 'attention' ? 'text-rose-600' : status === 'warning' ? 'text-amber-600' : 'text-blue-600';

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200/50 shadow-sm hover:shadow-md transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusClasses[status]}`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter ${trendColor}`}>
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend)}%
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{isLoading ? '...' : value}</h2>
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">{title}</p>
      </div>
      <div className="mt-4 h-8 w-full opacity-30 group-hover:opacity-60 transition-opacity">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparkline.map((v: any, i: any) => ({ v, i }))}>
            <Line type="monotone" dataKey="v" stroke="currentColor" strokeWidth={2} dot={false} className={trendColor} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const ActionButton = ({ icon, label, onClick }: any) => (
  <button 
    onClick={onClick}
    className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-xl hover:bg-slate-50 transition-all group"
  >
    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover:text-fh-green">{label}</span>
    <div className="w-8 h-8 bg-slate-900 text-fh-gold rounded-xl flex items-center justify-center">
      {icon}
    </div>
  </button>
);

export default DashboardView;
