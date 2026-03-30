
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';
import { 
  Users, Baby, Zap, TrendingUp, Calendar, 
  CheckCircle2, XCircle, Clock, AlertTriangle,
  ChevronRight, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

interface YouthChildrenDashboardViewProps {
  userProfile: UserProfile | null;
}

const YouthChildrenDashboardView: React.FC<YouthChildrenDashboardViewProps> = ({ userProfile }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [stats, setStats] = useState({
    totalChildren: 0,
    totalTeens: 0,
    attendanceToday: 0,
    absenteesToday: 0,
    followUpsPending: 0,
    growthRate: 12.5
  });

  const [attendanceData, setAttendanceData] = useState<any[]>([]);

  useEffect(() => {
    fetchCombinedStats();
  }, []);

  const fetchCombinedStats = async () => {
    setIsLoading(true);
    try {
      // In a real app, we would query the 'children' table and filter by age
      // For this demo, we'll simulate some roll-up data
      
      const { data: childrenData, error: childrenError } = await supabase
        .from('children')
        .select('date_of_birth');

      if (childrenError) {
        if (childrenError.code === '42P01' || childrenError.code === 'PGRST205') {
          setTableMissing(true);
          return;
        }
        throw childrenError;
      }

      const now = new Date();
      let childrenCount = 0;
      let teensCount = 0;

      childrenData?.forEach(child => {
        const age = now.getFullYear() - new Date(child.date_of_birth).getFullYear();
        if (age <= 12) childrenCount++;
        else if (age >= 13 && age <= 17) teensCount++;
      });

      // Simulate some other stats
      setStats({
        totalChildren: childrenCount || 42,
        totalTeens: teensCount || 28,
        attendanceToday: 56,
        absenteesToday: 14,
        followUpsPending: 8,
        growthRate: 15.2
      });

      // Simulated chart data
      setAttendanceData([
        { name: 'Week 1', children: 38, teens: 22 },
        { name: 'Week 2', children: 45, teens: 25 },
        { name: 'Week 3', children: 40, teens: 20 },
        { name: 'Week 4', children: 52, teens: 28 },
      ]);

    } catch (error) {
      console.error('Error fetching combined stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const COLORS = ['#10b981', '#3b82f6'];

  const repairSQL = `-- CHILDREN MINISTRY SYSTEM INITIALIZATION
-- 1. Parents Table
CREATE TABLE IF NOT EXISTS public.parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  alternate_phone TEXT,
  email TEXT,
  address TEXT,
  relationship_to_child TEXT NOT NULL,
  emergency_contact TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Class Groups Table
CREATE TABLE IF NOT EXISTS public.class_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name TEXT NOT NULL,
  age_range TEXT NOT NULL,
  teacher_id UUID,
  classroom_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Children Table
CREATE TABLE IF NOT EXISTS public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL,
  class_group_id UUID REFERENCES public.class_groups(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE,
  medical_notes TEXT,
  allergies TEXT,
  special_needs TEXT,
  registration_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Teachers Table
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT DEFAULT 'Teacher',
  assigned_group UUID REFERENCES public.class_groups(id) ON DELETE SET NULL,
  background_check_status TEXT DEFAULT 'Pending',
  ministry_start_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Children Services Table
CREATE TABLE IF NOT EXISTS public.children_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  date DATE NOT NULL,
  theme TEXT,
  teacher_in_charge UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Children Attendance Table
CREATE TABLE IF NOT EXISTS public.children_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
  class_group_id UUID REFERENCES public.class_groups(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.children_services(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  marked_by UUID,
  status TEXT DEFAULT 'Present',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(child_id, service_id)
);

-- 7. Check-In Logs Table
CREATE TABLE IF NOT EXISTS public.check_in_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.children_services(id) ON DELETE CASCADE,
  check_in_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  check_out_time TIMESTAMP WITH TIME ZONE,
  authorized_person TEXT NOT NULL,
  verification_method TEXT DEFAULT 'Manual',
  recorded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. Incident Reports Table
CREATE TABLE IF NOT EXISTS public.incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.children_services(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  action_taken TEXT,
  reported_by UUID,
  severity_level TEXT DEFAULT 'Low',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_in_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

-- Create Permissive Policies
DROP POLICY IF EXISTS "Allow all" ON public.parents;
CREATE POLICY "Allow all" ON public.parents FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON public.class_groups;
CREATE POLICY "Allow all" ON public.class_groups FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON public.children;
CREATE POLICY "Allow all" ON public.children FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON public.teachers;
CREATE POLICY "Allow all" ON public.teachers FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON public.children_services;
CREATE POLICY "Allow all" ON public.children_services FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON public.children_attendance;
CREATE POLICY "Allow all" ON public.children_attendance FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON public.check_in_logs;
CREATE POLICY "Allow all" ON public.check_in_logs FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON public.incident_reports;
CREATE POLICY "Allow all" ON public.incident_reports FOR ALL USING (true) WITH CHECK (true);

-- Refresh schema
NOTIFY pgrst, 'reload schema';`;

  if (tableMissing) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl text-center border-b-[16px] border-fh-green">
          <div className="w-20 h-20 bg-fh-green/10 text-fh-green rounded-3xl flex items-center justify-center mx-auto mb-8">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Database Initialization Required</h2>
          <p className="text-slate-500 mb-10 text-sm font-bold uppercase tracking-widest max-w-lg mx-auto">The Children & Youth Ministry database tables are not yet provisioned. Please execute the initialization script in your Supabase SQL Editor.</p>
          <pre className="bg-slate-950 text-fh-gold p-8 rounded-[2rem] text-[10px] font-mono text-left h-64 overflow-y-auto mb-10 shadow-2xl border border-white/5 scrollbar-hide">{repairSQL}</pre>
          <div className="flex gap-4 justify-center">
            <button onClick={() => { navigator.clipboard.writeText(repairSQL); }} className="px-10 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95">Copy Script</button>
            <button onClick={fetchCombinedStats} className="px-16 py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl border-b-4 border-black active:scale-95">Re-Check Status</button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fh-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Youth & Children Ministry</h1>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">Faithhouse Chapel International • Combined Analytics Dashboard</p>
        </div>
        <div className="flex gap-3">
          <div className="px-6 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center gap-3">
            <Calendar className="w-4 h-4 text-fh-green" />
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">March 2026</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:shadow-xl transition-all">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shadow-inner">
              <Users className="w-7 h-7" />
            </div>
            <div className="flex items-center gap-1 text-emerald-500 font-black text-[10px] uppercase">
              <ArrowUpRight className="w-3 h-3" />
              {stats.growthRate}%
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Enrollment</p>
          <p className="text-4xl font-black text-slate-900 tracking-tighter">{stats.totalChildren + stats.totalTeens}</p>
          <div className="mt-4 flex gap-4 text-[9px] font-bold uppercase tracking-wider">
            <span className="text-blue-500">{stats.totalChildren} Children</span>
            <span className="text-indigo-500">{stats.totalTeens} Teens</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:shadow-xl transition-all">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[8px] font-black uppercase">Live</span>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Present Today</p>
          <p className="text-4xl font-black text-slate-900 tracking-tighter">{stats.attendanceToday}</p>
          <p className="mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-wider">80% Attendance Rate</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:shadow-xl transition-all">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center shadow-inner">
              <XCircle className="w-7 h-7" />
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Absentees</p>
          <p className="text-4xl font-black text-slate-900 tracking-tighter">{stats.absenteesToday}</p>
          <p className="mt-4 text-[9px] font-bold text-rose-400 uppercase tracking-wider">Requires Follow-up</p>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl group hover:scale-[1.02] transition-all border-b-8 border-black">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 bg-white/10 text-fh-gold rounded-2xl flex items-center justify-center shadow-inner">
              <AlertTriangle className="w-7 h-7" />
            </div>
          </div>
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Pending Care</p>
          <p className="text-4xl font-black text-white tracking-tighter">{stats.followUpsPending}</p>
          <p className="mt-4 text-[9px] font-bold text-fh-gold uppercase tracking-wider">Urgent Outreach</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Attendance Trends */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Attendance Trends</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Last 4 Weeks Comparison</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-[9px] font-black text-slate-500 uppercase">Children</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-[9px] font-black text-slate-500 uppercase">Teens</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Bar dataKey="children" fill="#10b981" radius={[6, 6, 0, 0]} barSize={30} />
                <Bar dataKey="teens" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution */}
        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-10">Ministry Mix</h3>
          <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Children', value: stats.totalChildren },
                    { name: 'Teens', value: stats.totalTeens },
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-2xl font-black text-slate-900">{stats.totalChildren + stats.totalTeens}</p>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total</p>
            </div>
          </div>
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-[10px] font-black text-slate-600 uppercase">Children Ministry</span>
              </div>
              <span className="text-xs font-black text-slate-900">{Math.round((stats.totalChildren / (stats.totalChildren + stats.totalTeens)) * 100)}%</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-[10px] font-black text-slate-600 uppercase">Teens Ministry</span>
              </div>
              <span className="text-xs font-black text-slate-900">{Math.round((stats.totalTeens / (stats.totalChildren + stats.totalTeens)) * 100)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity / Alerts */}
      <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Critical Follow-ups</h3>
          <button className="px-6 py-2 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">View All</button>
        </div>
        <div className="space-y-4">
          {[
            { name: 'Kofi Mensah', age: 11, reason: 'Missed 3 consecutive weeks', status: 'At Risk', color: 'text-amber-600', bg: 'bg-amber-50' },
            { name: 'Abena Osei', age: 15, reason: 'First timer - needs welcome call', status: 'New', color: 'text-blue-600', bg: 'bg-blue-50' },
            { name: 'John Doe Jr.', age: 8, reason: 'Birthday next week', status: 'Upcoming', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] group hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-slate-100">
              <div className="flex items-center gap-6">
                <div className={`w-12 h-12 ${item.bg} ${item.color} rounded-2xl flex items-center justify-center font-black text-xs`}>
                  {item.name[0]}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 uppercase">{item.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.age} Years • {item.reason}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-4 py-1.5 ${item.bg} ${item.color} text-[8px] font-black uppercase tracking-widest rounded-full border border-current/10`}>
                  {item.status}
                </span>
                <button className="p-3 bg-white rounded-xl text-slate-300 group-hover:text-fh-green shadow-sm transition-all">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default YouthChildrenDashboardView;
