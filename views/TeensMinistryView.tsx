
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Child, Parent, ClassGroup, Teacher, ChildrenService, 
  ChildrenAttendance, CheckInLog, MedicalRecord, IncidentReport,
  UserProfile 
} from '../types';
import { 
  Users, Zap, ShieldCheck, ClipboardList, AlertTriangle, 
  Plus, Search, Filter, Printer, CheckCircle2, XCircle, 
  Clock, HeartPulse, UserPlus, LogIn, LogOut, ChevronRight,
  MoreVertical, Edit, Trash2, Save, X, Calendar, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface TeensMinistryViewProps {
  userProfile: UserProfile | null;
}

const TeensMinistryView: React.FC<TeensMinistryViewProps> = ({ userProfile }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'teens' | 'attendance' | 'safety' | 'reports'>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  
  // Data States
  const [teens, setTeens] = useState<Child[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [services, setServices] = useState<ChildrenService[]>([]);
  const [attendance, setAttendance] = useState<ChildrenAttendance[]>([]);
  
  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [activeService, setActiveService] = useState<ChildrenService | null>(null);

  // Form States
  const [newTeen, setNewTeen] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'Male',
    class_group_id: '',
    parent_name: '',
    parent_phone: '',
    emergency_contact: '',
    medical_notes: ''
  });

  const [newSession, setNewSession] = useState({
    service_name: '',
    date: new Date().toISOString().split('T')[0],
    theme: '',
    teacher_in_charge: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [
        { data: allChildren, error: childrenError },
        { data: parentsData, error: parentsError },
        { data: classesData, error: classesError },
        { data: teachersData, error: teachersError },
        { data: servicesData, error: servicesError }
      ] = await Promise.all([
        supabase.from('children').select('*').order('first_name'),
        supabase.from('parents').select('*').order('full_name'),
        supabase.from('class_groups').select('*').order('group_name'),
        supabase.from('teachers').select('*').order('full_name'),
        supabase.from('children_services').select('*').order('date', { ascending: false })
      ]);

      if (childrenError?.code === '42P01' || childrenError?.code === 'PGRST205') {
        setTableMissing(true);
        return;
      }

      // Filter for Teens (Ages 13-17)
      const now = new Date();
      const filteredTeens = (allChildren || []).filter(child => {
        const age = now.getFullYear() - new Date(child.date_of_birth).getFullYear();
        return age >= 13 && age <= 17;
      });

      setTeens(filteredTeens);
      setParents(parentsData || []);
      setClassGroups(classesData || []);
      setTeachers(teachersData || []);
      setServices(servicesData || []);
    } catch (error) {
      console.error('Error fetching teens ministry data:', error);
      toast.error('Failed to load ministry data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterTeen = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Create/Find Parent
      const { data: parentData, error: parentError } = await supabase
        .from('parents')
        .insert([{
          full_name: newTeen.parent_name,
          phone_number: newTeen.parent_phone,
          emergency_contact: newTeen.emergency_contact,
          relationship_to_child: 'Parent'
        }])
        .select()
        .single();

      if (parentError) throw parentError;

      // 2. Create Teen
      const { error: teenError } = await supabase
        .from('children')
        .insert([{
          first_name: newTeen.first_name,
          last_name: newTeen.last_name,
          date_of_birth: newTeen.date_of_birth,
          gender: newTeen.gender,
          class_group_id: newTeen.class_group_id || null,
          parent_id: parentData.id,
          medical_notes: newTeen.medical_notes,
          status: 'Active'
        }]);

      if (teenError) throw teenError;

      toast.success('Teen registered successfully');
      setIsRegisterModalOpen(false);
      setNewTeen({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: 'Male',
        class_group_id: '',
        parent_name: '',
        parent_phone: '',
        emergency_contact: '',
        medical_notes: ''
      });
      fetchData();
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Failed to register teen');
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('children_services')
        .insert([{
          service_name: newSession.service_name,
          date: newSession.date,
          theme: newSession.theme,
          teacher_in_charge: newSession.teacher_in_charge || null
        }]);

      if (error) throw error;

      toast.success('Session created successfully');
      setIsAttendanceModalOpen(false);
      setNewSession({
        service_name: '',
        date: new Date().toISOString().split('T')[0],
        theme: '',
        teacher_in_charge: ''
      });
      fetchData();
    } catch (error) {
      console.error('Session creation error:', error);
      toast.error('Failed to create session');
    }
  };

  const handleMarkAttendance = async (teenId: string, status: 'Present' | 'Absent') => {
    if (!activeService) return;

    try {
      const { error } = await supabase.from('children_attendance').upsert([{
        child_id: teenId,
        class_group_id: teens.find(t => t.id === teenId)?.class_group_id,
        service_id: activeService.id,
        date: activeService.date,
        status,
        marked_by: userProfile?.id
      }]);

      if (error) throw error;
      
      fetchData();
      toast.success(`Attendance marked as ${status}`);
    } catch (error) {
      console.error('Attendance error:', error);
      toast.error('Failed to mark attendance');
    }
  };

  const filteredTeens = useMemo(() => {
    return teens.filter(t => {
      const matchesSearch = `${t.first_name} ${t.last_name}`.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = selectedClass === 'All' || t.class_group_id === selectedClass;
      return matchesSearch && matchesClass;
    });
  }, [teens, searchQuery, selectedClass]);

  const stats = useMemo(() => {
    return {
      totalTeens: teens.length,
      activeClasses: classGroups.length,
      totalTeachers: teachers.length,
      todayAttendance: 0 
    };
  }, [teens, classGroups, teachers]);

  if (tableMissing) {
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

    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl text-center border-b-[16px] border-blue-500">
          <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Ministry System Initialization</h2>
          <p className="text-slate-500 mb-10 text-sm font-bold uppercase tracking-widest max-w-lg mx-auto">The Teens Ministry database tables are not yet provisioned. Please execute the initialization script in your Supabase SQL Editor.</p>
          <pre className="bg-slate-950 text-fh-gold p-8 rounded-[2rem] text-[10px] font-mono text-left h-64 overflow-y-auto mb-10 shadow-2xl border border-white/5 scrollbar-hide">{repairSQL}</pre>
          <div className="flex gap-4 justify-center">
            <button onClick={() => { navigator.clipboard.writeText(repairSQL); toast.success('Script copied'); }} className="px-10 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95">Copy Script</button>
            <button onClick={fetchData} className="px-16 py-5 bg-blue-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl border-b-4 border-black active:scale-95">Re-Check Status</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-blue-600 tracking-tighter uppercase leading-none">Teens Ministry</h1>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">Faithhouse Chapel International • Youth Empowerment System</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsRegisterModalOpen(true)}
            className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all border-b-4 border-black/30 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Register Teen
          </button>
          <button 
            onClick={() => window.print()}
            className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-all text-slate-400 hover:text-blue-600"
          >
            <Printer className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 bg-slate-100/50 p-1.5 rounded-[2rem] w-fit">
        {[
          { id: 'dashboard', label: 'Overview', icon: ClipboardList },
          { id: 'teens', label: 'Teens Register', icon: Zap },
          { id: 'attendance', label: 'Attendance', icon: CheckCircle2 },
          { id: 'safety', label: 'Care & Logs', icon: ShieldCheck },
          { id: 'reports', label: 'Leadership Reports', icon: Printer },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-slate-500 hover:bg-white hover:text-blue-600'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard Overview */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                <Zap className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Teens</p>
                <p className="text-3xl font-black text-slate-900">{stats.totalTeens}</p>
              </div>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                <TrendingUp className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Growth Groups</p>
                <p className="text-3xl font-black text-slate-900">{stats.activeClasses}</p>
              </div>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mentors</p>
                <p className="text-3xl font-black text-slate-900">{stats.totalTeachers}</p>
              </div>
            </div>
            <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-xl flex items-center gap-6 border-b-8 border-black/20">
              <div className="w-16 h-16 bg-white/20 text-white rounded-[1.5rem] flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Today's Attendance</p>
                <p className="text-3xl font-black text-white">{stats.todayAttendance}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Services */}
            <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Recent Sessions</h3>
                <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">View All</button>
              </div>
              <div className="space-y-4">
                {services.slice(0, 4).map(service => (
                  <div key={service.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] group hover:bg-blue-600/5 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 uppercase">{service.service_name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(service.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button className="p-3 bg-white rounded-xl text-slate-400 group-hover:text-blue-600 shadow-sm">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Care Monitor */}
            <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Care Monitor</h3>
                <HeartPulse className="w-6 h-6 text-rose-500" />
              </div>
              <div className="space-y-4">
                <div className="p-6 bg-blue-50 border border-blue-100 rounded-[2rem] flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-blue-900 uppercase">Mentorship Active</p>
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">All teens assigned to mentors</p>
                  </div>
                </div>
                <div className="p-12 text-center text-slate-300 font-black uppercase tracking-widest text-xs italic border-2 border-dashed border-slate-100 rounded-[2rem]">
                  No urgent care alerts today
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Teens Register */}
      {activeTab === 'teens' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search teens by name..." 
                className="w-full pl-16 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select 
              className="w-full md:w-64 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-[10px] font-black uppercase tracking-widest"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="All">All Groups</option>
              {classGroups.map(cg => (
                <option key={cg.id} value={cg.id}>{cg.group_name}</option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-[3rem] overflow-hidden border border-slate-100 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100">
                  <tr>
                    <th className="px-10 py-6">Teen Identity</th>
                    <th className="px-10 py-6">Age / Gender</th>
                    <th className="px-10 py-6">Growth Group</th>
                    <th className="px-10 py-6">Parent Contact</th>
                    <th className="px-10 py-6">Status</th>
                    <th className="px-10 py-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTeens.map(teen => {
                    const parent = parents.find(p => p.id === teen.parent_id);
                    const classGroup = classGroups.find(cg => cg.id === teen.class_group_id);
                    const age = new Date().getFullYear() - new Date(teen.date_of_birth).getFullYear();
                    
                    return (
                      <tr key={teen.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-600/10 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xs shadow-inner">
                              {teen.first_name[0]}{teen.last_name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800 uppercase">{teen.first_name} {teen.last_name}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {teen.id.substring(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <p className="text-xs font-bold text-slate-600 uppercase">{age} Years • {teen.gender}</p>
                        </td>
                        <td className="px-10 py-6">
                          <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-xl border border-indigo-100">
                            {classGroup?.group_name || 'Unassigned'}
                          </span>
                        </td>
                        <td className="px-10 py-6">
                          <p className="text-xs font-bold text-slate-800 uppercase">{parent?.full_name || 'N/A'}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{parent?.phone_number || '---'}</p>
                        </td>
                        <td className="px-10 py-6">
                          <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                            teen.status === 'Active' 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                              : 'bg-slate-50 text-slate-400 border-slate-100'
                          }`}>
                            {teen.status}
                          </span>
                        </td>
                        <td className="px-10 py-6 text-right">
                          <button className="p-3 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-blue-600">
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTeens.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs italic">
                        No teens records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeService ? (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <button onClick={() => setActiveService(null)} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-all text-slate-400 hover:text-blue-600">
                    <LogOut className="w-5 h-5 rotate-180" />
                  </button>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{activeService.service_name}</h3>
                    <p className="text-[10px] text-blue-600 font-black uppercase tracking-[0.4em] mt-2">{new Date(activeService.date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[3rem] overflow-hidden border border-slate-100 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100">
                      <tr>
                        <th className="px-10 py-6">Teen</th>
                        <th className="px-10 py-6">Group</th>
                        <th className="px-10 py-6 text-center">Status</th>
                        <th className="px-10 py-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {teens.map(teen => {
                        const att = attendance.find(a => a.child_id === teen.id && a.service_id === activeService.id);
                        const status = att?.status || 'Absent';
                        const classGroup = classGroups.find(cg => cg.id === teen.class_group_id);
                        
                        return (
                          <tr key={teen.id} className="hover:bg-slate-50/50 transition-all group">
                            <td className="px-10 py-6">
                              <p className="text-sm font-black text-slate-800 uppercase">{teen.first_name} {teen.last_name}</p>
                            </td>
                            <td className="px-10 py-6">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{classGroup?.group_name || '---'}</span>
                            </td>
                            <td className="px-10 py-6">
                              <div className="flex justify-center gap-2">
                                <button 
                                  onClick={() => handleMarkAttendance(teen.id, 'Present')}
                                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                    status === 'Present' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-white'
                                  }`}
                                >
                                  Present
                                </button>
                                <button 
                                  onClick={() => handleMarkAttendance(teen.id, 'Absent')}
                                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                    status === 'Absent' ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-white'
                                  }`}
                                >
                                  Absent
                                </button>
                              </div>
                            </td>
                            <td className="px-10 py-6 text-right">
                               <button className="p-3 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-blue-600">
                                <MoreVertical className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Session Tracking</h3>
                <button 
                  onClick={() => setIsAttendanceModalOpen(true)}
                  className="px-8 py-4 bg-slate-950 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Session
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {services.map(service => (
                  <div key={service.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                    <div className="flex justify-between items-start mb-6">
                      <span className="px-4 py-1.5 bg-blue-600/10 text-blue-600 text-[9px] font-black uppercase tracking-widest rounded-xl border border-blue-600/10">
                        {new Date(service.date).toLocaleDateString()}
                      </span>
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                        <Calendar className="w-5 h-5" />
                      </div>
                    </div>
                    <h4 className="text-xl font-black text-slate-900 uppercase mb-4 group-hover:text-blue-600 transition-colors">{service.service_name}</h4>
                    <button 
                      onClick={() => setActiveService(service)}
                      className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                    >
                      Mark Attendance
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {isRegisterModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="bg-blue-600 p-8 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Register New Teen</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Add a new member to the youth ministry</p>
                </div>
                <button onClick={() => setIsRegisterModalOpen(false)} className="p-2 hover:bg-white/20 rounded-xl transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleRegisterTeen} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-600 transition-all font-bold"
                      value={newTeen.first_name}
                      onChange={(e) => setNewTeen({...newTeen, first_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-600 transition-all font-bold"
                      value={newTeen.last_name}
                      onChange={(e) => setNewTeen({...newTeen, last_name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date of Birth</label>
                    <input 
                      required
                      type="date" 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-600 transition-all font-bold"
                      value={newTeen.date_of_birth}
                      onChange={(e) => setNewTeen({...newTeen, date_of_birth: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                    <select 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-600 transition-all font-bold"
                      value={newTeen.gender}
                      onChange={(e) => setNewTeen({...newTeen, gender: e.target.value})}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Growth Group</label>
                  <select 
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-600 transition-all font-bold"
                    value={newTeen.class_group_id}
                    onChange={(e) => setNewTeen({...newTeen, class_group_id: e.target.value})}
                  >
                    <option value="">Select Group (Optional)</option>
                    {classGroups.map(cg => (
                      <option key={cg.id} value={cg.id}>{cg.group_name}</option>
                    ))}
                  </select>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Parent / Guardian Information</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                      <input 
                        required
                        type="text" 
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-600 transition-all font-bold"
                        value={newTeen.parent_name}
                        onChange={(e) => setNewTeen({...newTeen, parent_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                      <input 
                        required
                        type="tel" 
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-600 transition-all font-bold"
                        value={newTeen.parent_phone}
                        onChange={(e) => setNewTeen({...newTeen, parent_phone: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="mt-6 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Emergency Contact (Name & Phone)</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Jane Doe - 08012345678"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-600 transition-all font-bold"
                      value={newTeen.emergency_contact}
                      onChange={(e) => setNewTeen({...newTeen, emergency_contact: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Medical Notes / Allergies</label>
                  <textarea 
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-600 transition-all font-bold h-24 resize-none"
                    value={newTeen.medical_notes}
                    onChange={(e) => setNewTeen({...newTeen, medical_notes: e.target.value})}
                  />
                </div>
                <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl border-b-4 border-black active:scale-95 transition-all">
                  Complete Registration
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isAttendanceModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">New Session</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Start a new tracking session</p>
                </div>
                <button onClick={() => setIsAttendanceModalOpen(false)} className="p-2 hover:bg-white/20 rounded-xl transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleCreateSession} className="p-10 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Session Name</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Sunday Youth Empowerment"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-600 transition-all font-bold"
                    value={newSession.service_name}
                    onChange={(e) => setNewSession({...newSession, service_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                  <input 
                    required
                    type="date" 
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-600 transition-all font-bold"
                    value={newSession.date}
                    onChange={(e) => setNewSession({...newSession, date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Theme / Topic</label>
                  <input 
                    type="text" 
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-600 transition-all font-bold"
                    value={newSession.theme}
                    onChange={(e) => setNewSession({...newSession, theme: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mentor In-Charge</label>
                  <select 
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-600 transition-all font-bold"
                    value={newSession.teacher_in_charge}
                    onChange={(e) => setNewSession({...newSession, teacher_in_charge: e.target.value})}
                  >
                    <option value="">Select Mentor</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.full_name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl border-b-4 border-black active:scale-95 transition-all">
                  Initialize Session
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeensMinistryView;
