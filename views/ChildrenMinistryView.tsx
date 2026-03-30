
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Child, Parent, ClassGroup, Teacher, ChildrenService, 
  ChildrenAttendance, CheckInLog, MedicalRecord, IncidentReport,
  UserProfile 
} from '../types';
import { 
  Users, Baby, ShieldCheck, ClipboardList, AlertTriangle, 
  Plus, Search, Filter, Printer, CheckCircle2, XCircle, 
  Clock, HeartPulse, UserPlus, LogIn, LogOut, ChevronRight,
  MoreVertical, Edit, Trash2, Save, X, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface ChildrenMinistryViewProps {
  userProfile: UserProfile | null;
}

const ChildrenMinistryView: React.FC<ChildrenMinistryViewProps> = ({ userProfile }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'children' | 'attendance' | 'safety' | 'reports'>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  
  // Data States
  const [children, setChildren] = useState<Child[]>([]);
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
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [checkInChildId, setCheckInChildId] = useState<string>('');
  const [checkInParentId, setCheckInParentId] = useState<string>('');
  const [authorizedPerson, setAuthorizedPerson] = useState<string>('');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<string>('Children Register');

  // Form States
  const [newChild, setNewChild] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'Male',
    class_group_id: '',
    parent_name: '',
    parent_phone: '',
    parent_relationship: '',
    emergency_contact: '',
    medical_notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [
        { data: childrenData, error: childrenError },
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

      // Filter for Children (Ages 12 and under)
      const now = new Date();
      const filteredChildren = (childrenData || []).filter(child => {
        const age = now.getFullYear() - new Date(child.date_of_birth).getFullYear();
        return age <= 12;
      });

      setChildren(filteredChildren);
      setParents(parentsData || []);
      setClassGroups(classesData || []);
      setTeachers(teachersData || []);
      setServices(servicesData || []);
    } catch (error) {
      console.error('Error fetching children ministry data:', error);
      toast.error('Failed to load ministry data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeService) {
      toast.error('Please select or create a service session first');
      return;
    }

    try {
      const { error } = await supabase.from('check_in_logs').insert([{
        child_id: checkInChildId,
        parent_id: checkInParentId,
        service_id: activeService.id,
        authorized_person: authorizedPerson,
        recorded_by: userProfile?.id
      }]);

      if (error) throw error;

      // Also mark attendance as present
      await supabase.from('children_attendance').upsert([{
        child_id: checkInChildId,
        class_group_id: children.find(c => c.id === checkInChildId)?.class_group_id,
        service_id: activeService.id,
        date: activeService.date,
        check_in_time: new Date().toISOString(),
        status: 'Present',
        marked_by: userProfile?.id
      }]);

      toast.success('Child checked in successfully');
      setIsCheckInModalOpen(false);
      setCheckInChildId('');
      setCheckInParentId('');
      setAuthorizedPerson('');
      fetchData();
    } catch (error) {
      console.error('Check-in error:', error);
      toast.error('Check-in failed');
    }
  };

  const handleRegisterChild = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Create/Find Parent
      const { data: parentData, error: parentError } = await supabase
        .from('parents')
        .insert([{
          full_name: newChild.parent_name,
          phone_number: newChild.parent_phone,
          relationship_to_child: newChild.parent_relationship || 'Parent',
          emergency_contact: newChild.emergency_contact
        }])
        .select()
        .single();

      if (parentError) throw parentError;

      // 2. Create Child
      const { error: childError } = await supabase
        .from('children')
        .insert([{
          first_name: newChild.first_name,
          last_name: newChild.last_name,
          date_of_birth: newChild.date_of_birth,
          gender: newChild.gender,
          class_group_id: newChild.class_group_id || null,
          parent_id: parentData.id,
          medical_notes: newChild.medical_notes,
          status: 'Active'
        }]);

      if (childError) throw childError;

      toast.success('Child registered successfully');
      setIsRegisterModalOpen(false);
      setNewChild({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: 'Male',
        class_group_id: '',
        parent_name: '',
        parent_phone: '',
        parent_relationship: '',
        emergency_contact: '',
        medical_notes: ''
      });
      fetchData();
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Failed to register child');
    }
  };

  const handleCheckOut = async (childId: string) => {
    if (!activeService) return;

    try {
      const { error } = await supabase.from('check_in_logs')
        .update({ check_out_time: new Date().toISOString() })
        .eq('child_id', childId)
        .eq('service_id', activeService.id)
        .is('check_out_time', null);

      if (error) throw error;

      await supabase.from('children_attendance')
        .update({ check_out_time: new Date().toISOString() })
        .eq('child_id', childId)
        .eq('service_id', activeService.id);

      toast.success('Child checked out successfully');
      fetchData();
    } catch (error) {
      console.error('Check-out error:', error);
      toast.error('Check-out failed');
    }
  };

  const syncToMainAttendance = async (serviceId: string) => {
    try {
      const { count, error: countError } = await supabase
        .from('children_attendance')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', serviceId)
        .eq('status', 'Present');

      if (countError) throw countError;

      const service = services.find(s => s.id === serviceId);
      if (!service) return;

      const { data: mainEvents, error: mainError } = await supabase
        .from('attendance_events')
        .select('id')
        .eq('event_date', service.date)
        .limit(1);

      if (mainError) throw mainError;

      if (mainEvents && mainEvents.length > 0) {
        await supabase
          .from('attendance_events')
          .update({ children_count: count || 0 })
          .eq('id', mainEvents[0].id);
        
        toast.success('Synced with main church attendance');
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  const handleMarkAttendance = async (childId: string, status: 'Present' | 'Absent') => {
    if (!activeService) return;

    try {
      const { error } = await supabase.from('children_attendance').upsert([{
        child_id: childId,
        class_group_id: children.find(c => c.id === childId)?.class_group_id,
        service_id: activeService.id,
        date: activeService.date,
        status,
        marked_by: userProfile?.id
      }]);

      if (error) throw error;
      
      setAttendance(prev => {
        const existing = prev.findIndex(a => a.child_id === childId && a.service_id === activeService.id);
        if (existing > -1) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], status };
          return updated;
        }
        return [...prev, { child_id: childId, service_id: activeService.id, status, date: activeService.date } as any];
      });

      toast.success(`Attendance marked as ${status}`);
    } catch (error) {
      console.error('Attendance error:', error);
      toast.error('Failed to mark attendance');
    }
  };

  const filteredChildren = useMemo(() => {
    return children.filter(c => {
      const matchesSearch = `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = selectedClass === 'All' || c.class_group_id === selectedClass;
      return matchesSearch && matchesClass;
    });
  }, [children, searchQuery, selectedClass]);

  const stats = useMemo(() => {
    return {
      totalChildren: children.length,
      activeClasses: classGroups.length,
      totalTeachers: teachers.length,
      todayAttendance: 0 // Will be calculated from attendance records
    };
  }, [children, classGroups, teachers]);

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
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl text-center border-b-[16px] border-fh-green">
          <div className="w-20 h-20 bg-fh-green/10 text-fh-green rounded-3xl flex items-center justify-center mx-auto mb-8">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Ministry System Initialization</h2>
          <p className="text-slate-500 mb-10 text-sm font-bold uppercase tracking-widest max-w-lg mx-auto">The Children's Ministry database tables are not yet provisioned. Please execute the initialization script in your Supabase SQL Editor.</p>
          <pre className="bg-slate-950 text-fh-gold p-8 rounded-[2rem] text-[10px] font-mono text-left h-64 overflow-y-auto mb-10 shadow-2xl border border-white/5 scrollbar-hide">{repairSQL}</pre>
          <div className="flex gap-4 justify-center">
            <button onClick={() => { navigator.clipboard.writeText(repairSQL); toast.success('Initialization script copied'); }} className="px-10 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95">Copy Script</button>
            <button onClick={fetchData} className="px-16 py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl border-b-4 border-black active:scale-95">Re-Check Status</button>
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
          <h1 className="text-4xl font-black text-fh-green tracking-tighter uppercase leading-none">Children's Ministry</h1>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">Faithhouse Chapel International • Sunday School System</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsRegisterModalOpen(true)}
            className="px-8 py-4 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all border-b-4 border-black/30 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Register Child
          </button>
          <button 
            onClick={() => window.print()}
            className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-all text-slate-400 hover:text-fh-green"
          >
            <Printer className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 bg-slate-100/50 p-1.5 rounded-[2rem] w-fit">
        {[
          { id: 'dashboard', label: 'Overview', icon: ClipboardList },
          { id: 'children', label: 'Children Register', icon: Baby },
          { id: 'attendance', label: 'Attendance', icon: CheckCircle2 },
          { id: 'safety', label: 'Safety & Logs', icon: ShieldCheck },
          { id: 'reports', label: 'Leadership Reports', icon: Printer },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id 
                ? 'bg-fh-green text-fh-gold shadow-lg' 
                : 'text-slate-500 hover:bg-white hover:text-fh-green'
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
                <Baby className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Children</p>
                <p className="text-3xl font-black text-slate-900">{stats.totalChildren}</p>
              </div>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Classes</p>
                <p className="text-3xl font-black text-slate-900">{stats.activeClasses}</p>
              </div>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Teachers</p>
                <p className="text-3xl font-black text-slate-900">{stats.totalTeachers}</p>
              </div>
            </div>
            <div className="bg-fh-green p-8 rounded-[2.5rem] shadow-xl flex items-center gap-6 border-b-8 border-black/20">
              <div className="w-16 h-16 bg-white/20 text-fh-gold rounded-[1.5rem] flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[10px] font-black text-fh-gold/60 uppercase tracking-widest">Today's Attendance</p>
                <p className="text-3xl font-black text-fh-gold">{stats.todayAttendance}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Services */}
            <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Recent Services</h3>
                <button className="text-[10px] font-black text-fh-green uppercase tracking-widest hover:underline">View All</button>
              </div>
              <div className="space-y-4">
                {services.slice(0, 4).map(service => (
                  <div key={service.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] group hover:bg-fh-green/5 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-fh-green shadow-sm">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 uppercase">{service.service_name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(service.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button className="p-3 bg-white rounded-xl text-slate-400 group-hover:text-fh-green shadow-sm">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                {services.length === 0 && (
                  <div className="py-12 text-center text-slate-300 font-black uppercase tracking-widest text-xs italic">
                    No services recorded yet
                  </div>
                )}
              </div>
            </div>

            {/* Safety Alerts / Incidents */}
            <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Safety Monitor</h3>
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <div className="space-y-4">
                <div className="p-6 bg-amber-50 border border-amber-100 rounded-[2rem] flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-amber-900 uppercase">Check-In Active</p>
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">All safety protocols engaged</p>
                  </div>
                </div>
                <div className="p-12 text-center text-slate-300 font-black uppercase tracking-widest text-xs italic border-2 border-dashed border-slate-100 rounded-[2rem]">
                  No active incidents reported today
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Children Register */}
      {activeTab === 'children' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search children by name..." 
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
              <option value="All">All Classes</option>
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
                    <th className="px-10 py-6">Child Identity</th>
                    <th className="px-10 py-6">Age / Gender</th>
                    <th className="px-10 py-6">Class Group</th>
                    <th className="px-10 py-6">Parent / Guardian</th>
                    <th className="px-10 py-6">Status</th>
                    <th className="px-10 py-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredChildren.map(child => {
                    const parent = parents.find(p => p.id === child.parent_id);
                    const classGroup = classGroups.find(cg => cg.id === child.class_group_id);
                    const age = new Date().getFullYear() - new Date(child.date_of_birth).getFullYear();
                    
                    return (
                      <tr key={child.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-fh-green/10 text-fh-green rounded-2xl flex items-center justify-center font-black text-xs shadow-inner">
                              {child.first_name[0]}{child.last_name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800 uppercase">{child.first_name} {child.last_name}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {child.id.substring(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <p className="text-xs font-bold text-slate-600 uppercase">{age} Years • {child.gender}</p>
                        </td>
                        <td className="px-10 py-6">
                          <span className="px-4 py-1.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest rounded-xl border border-blue-100">
                            {classGroup?.group_name || 'Unassigned'}
                          </span>
                        </td>
                        <td className="px-10 py-6">
                          <p className="text-xs font-bold text-slate-800 uppercase">{parent?.full_name || 'N/A'}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{parent?.phone_number || '---'}</p>
                        </td>
                        <td className="px-10 py-6">
                          <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                            child.status === 'Active' 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                              : 'bg-slate-50 text-slate-400 border-slate-100'
                          }`}>
                            {child.status}
                          </span>
                        </td>
                        <td className="px-10 py-6 text-right">
                          <button className="p-3 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-fh-green">
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredChildren.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs italic">
                        No children records found
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
                  <button onClick={() => setActiveService(null)} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-all text-slate-400 hover:text-fh-green">
                    <LogOut className="w-5 h-5 rotate-180" />
                  </button>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{activeService.service_name}</h3>
                    <p className="text-[10px] text-fh-green font-black uppercase tracking-[0.4em] mt-2">{new Date(activeService.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => syncToMainAttendance(activeService.id)}
                    className="px-8 py-4 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all border-b-4 border-black/30 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Sync to Main
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-[3rem] overflow-hidden border border-slate-100 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100">
                      <tr>
                        <th className="px-10 py-6">Child</th>
                        <th className="px-10 py-6">Class</th>
                        <th className="px-10 py-6 text-center">Status</th>
                        <th className="px-10 py-6">Check-In</th>
                        <th className="px-10 py-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {children.map(child => {
                        const att = attendance.find(a => a.child_id === child.id && a.service_id === activeService.id);
                        const status = att?.status || 'Absent';
                        const classGroup = classGroups.find(cg => cg.id === child.class_group_id);
                        
                        return (
                          <tr key={child.id} className="hover:bg-slate-50/50 transition-all group">
                            <td className="px-10 py-6">
                              <p className="text-sm font-black text-slate-800 uppercase">{child.first_name} {child.last_name}</p>
                            </td>
                            <td className="px-10 py-6">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{classGroup?.group_name || '---'}</span>
                            </td>
                            <td className="px-10 py-6">
                              <div className="flex justify-center gap-2">
                                <button 
                                  onClick={() => handleMarkAttendance(child.id, 'Present')}
                                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                    status === 'Present' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-white'
                                  }`}
                                >
                                  Present
                                </button>
                                <button 
                                  onClick={() => handleMarkAttendance(child.id, 'Absent')}
                                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                    status === 'Absent' ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-white'
                                  }`}
                                >
                                  Absent
                                </button>
                              </div>
                            </td>
                            <td className="px-10 py-6">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {att?.check_in_time ? new Date(att.check_in_time).toLocaleTimeString() : '---'}
                              </p>
                            </td>
                            <td className="px-10 py-6 text-right">
                              {att?.check_in_time && !att?.check_out_time ? (
                                <button 
                                  onClick={() => handleCheckOut(child.id)}
                                  className="px-4 py-2 bg-rose-50 text-rose-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                                >
                                  Check-Out
                                </button>
                              ) : att?.check_out_time ? (
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Completed</span>
                              ) : (
                                <button 
                                  onClick={() => {
                                    setCheckInChildId(child.id);
                                    setCheckInParentId(child.parent_id);
                                    setIsCheckInModalOpen(true);
                                  }}
                                  className="px-4 py-2 bg-blue-50 text-blue-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all"
                                >
                                  Check-In
                                </button>
                              )}
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
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Attendance Tracking</h3>
                <button 
                  onClick={() => setIsAttendanceModalOpen(true)}
                  className="px-8 py-4 bg-slate-950 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Service Session
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {services.map(service => (
                  <div key={service.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                    <div className="flex justify-between items-start mb-6">
                      <span className="px-4 py-1.5 bg-fh-green/10 text-fh-green text-[9px] font-black uppercase tracking-widest rounded-xl border border-fh-green/10">
                        {new Date(service.date).toLocaleDateString()}
                      </span>
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                        <Calendar className="w-5 h-5" />
                      </div>
                    </div>
                    <h4 className="text-xl font-black text-slate-900 uppercase mb-4 group-hover:text-fh-green transition-colors">{service.service_name}</h4>
                    <div className="space-y-3 mb-8">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Theme:</span>
                        <span className="text-slate-600">{service.theme || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>In-Charge:</span>
                        <span className="text-slate-600">Teacher {teachers.find(t => t.id === service.teacher_in_charge)?.full_name || '---'}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveService(service)}
                      className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-fh-green hover:text-fh-gold transition-all"
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

      {/* Safety & Logs Tab */}
      {activeTab === 'safety' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Check-In / Check-Out Console */}
            <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-fh-green" />
                Safety Console
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <button 
                  onClick={() => {
                    if (!activeService) {
                      toast.error('Please select an active service session first');
                      return;
                    }
                    setIsCheckInModalOpen(true);
                  }}
                  className="p-8 bg-emerald-50 border border-emerald-100 rounded-[2.5rem] flex flex-col items-center gap-4 group hover:bg-emerald-500 hover:text-white transition-all"
                >
                  <LogIn className="w-8 h-8 text-emerald-500 group-hover:text-white" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Check-In Child</span>
                </button>
                <button 
                  onClick={() => setActiveTab('attendance')}
                  className="p-8 bg-rose-50 border border-rose-100 rounded-[2.5rem] flex flex-col items-center gap-4 group hover:bg-rose-500 hover:text-white transition-all"
                >
                  <LogOut className="w-8 h-8 text-rose-500 group-hover:text-white" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Check-Out Child</span>
                </button>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Live Activity Log</h4>
                <div className="py-12 text-center text-slate-300 font-black uppercase tracking-widest text-xs italic border-2 border-dashed border-slate-50 rounded-[2rem]">
                  No check-in activity recorded yet
                </div>
              </div>
            </div>

            {/* Incident & Medical Records */}
            <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
                Incident & Medical
              </h3>
              <div className="space-y-6">
                <button className="w-full p-6 bg-slate-50 rounded-[2rem] flex items-center justify-between group hover:bg-fh-green/5 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-slate-800 uppercase">Report Incident</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Record safety or health events</p>
                    </div>
                  </div>
                  <Plus className="w-5 h-5 text-slate-300 group-hover:text-fh-green" />
                </button>
                <button className="w-full p-6 bg-slate-50 rounded-[2rem] flex items-center justify-between group hover:bg-fh-green/5 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm">
                      <HeartPulse className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-slate-800 uppercase">Medical Records</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manage allergies & special needs</p>
                    </div>
                  </div>
                  <Plus className="w-5 h-5 text-slate-300 group-hover:text-fh-green" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: 'Children Register', desc: 'Full list of registered children by class', icon: Baby },
              { title: 'Attendance Summary', desc: 'Monthly attendance trends and totals', icon: CheckCircle2 },
              { title: 'Emergency Contacts', desc: 'Quick access to parent & medical info', icon: ShieldCheck },
              { title: 'Incident History', desc: 'Audit trail of all reported incidents', icon: AlertTriangle },
              { title: 'Class Lists', desc: 'Teacher assignments and child counts', icon: Users },
              { title: 'Check-In Audit', desc: 'Security log of check-in/out times', icon: Clock },
            ].map(report => (
              <button 
                key={report.title} 
                onClick={() => {
                  setSelectedReportType(report.title);
                  setIsReportModalOpen(true);
                }}
                className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm hover:shadow-2xl transition-all group text-left flex flex-col"
              >
                <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-[1.5rem] flex items-center justify-center mb-8 group-hover:bg-fh-green group-hover:text-fh-gold transition-all shadow-inner">
                  <report.icon className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-black text-slate-900 uppercase mb-2 tracking-tighter">{report.title}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8 flex-1">{report.desc}</p>
                <div className="flex items-center gap-2 text-fh-green font-black uppercase text-[10px] tracking-widest">
                  Generate Report
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MODALS */}
      <AnimatePresence>
        {isRegisterModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" 
              onClick={() => setIsRegisterModalOpen(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border-b-[16px] border-fh-green"
            >
              <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-fh-green text-fh-gold rounded-[1.5rem] flex items-center justify-center shadow-xl">
                    <UserPlus className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Register Child</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-2">New Ministry Record</p>
                  </div>
                </div>
                <button onClick={() => setIsRegisterModalOpen(false)} className="p-4 hover:bg-slate-100 rounded-full transition-all text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-10 max-h-[70vh] overflow-y-auto scrollbar-hide">
                <form onSubmit={handleRegisterChild} className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">First Name</label>
                      <input 
                        required 
                        className="w-full px-7 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-fh-green transition-all" 
                        value={newChild.first_name}
                        onChange={(e) => setNewChild({...newChild, first_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Last Name</label>
                      <input 
                        required 
                        className="w-full px-7 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-fh-green transition-all" 
                        value={newChild.last_name}
                        onChange={(e) => setNewChild({...newChild, last_name: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Date of Birth</label>
                      <input 
                        type="date" 
                        required 
                        className="w-full px-7 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-fh-green transition-all" 
                        value={newChild.date_of_birth}
                        onChange={(e) => setNewChild({...newChild, date_of_birth: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Gender</label>
                      <select 
                        required 
                        className="w-full px-7 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-fh-green transition-all"
                        value={newChild.gender}
                        onChange={(e) => setNewChild({...newChild, gender: e.target.value})}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Class Assignment</label>
                    <select 
                      required 
                      className="w-full px-7 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-fh-green transition-all"
                      value={newChild.class_group_id}
                      onChange={(e) => setNewChild({...newChild, class_group_id: e.target.value})}
                    >
                      <option value="">Select Class...</option>
                      {classGroups.map(cg => <option key={cg.id} value={cg.id}>{cg.group_name}</option>)}
                    </select>
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-[10px] font-black text-fh-green uppercase tracking-[0.3em] mb-6">Parent / Guardian Information</h4>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Full Name</label>
                        <input 
                          required 
                          className="w-full px-7 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-fh-green transition-all" 
                          value={newChild.parent_name}
                          onChange={(e) => setNewChild({...newChild, parent_name: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Phone Number</label>
                          <input 
                            required 
                            className="w-full px-7 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-fh-green transition-all" 
                            value={newChild.parent_phone}
                            onChange={(e) => setNewChild({...newChild, parent_phone: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Relationship</label>
                          <input 
                            required 
                            className="w-full px-7 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-fh-green transition-all" 
                            placeholder="e.g. Mother" 
                            value={newChild.parent_relationship}
                            onChange={(e) => setNewChild({...newChild, parent_relationship: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Emergency Contact (Name & Phone)</label>
                        <input 
                          required 
                          className="w-full px-7 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-fh-green transition-all" 
                          placeholder="e.g. John Doe - 08012345678" 
                          value={newChild.emergency_contact}
                          onChange={(e) => setNewChild({...newChild, emergency_contact: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Medical Notes / Allergies</label>
                    <textarea 
                      className="w-full px-7 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-fh-green transition-all h-24 resize-none" 
                      value={newChild.medical_notes}
                      onChange={(e) => setNewChild({...newChild, medical_notes: e.target.value})}
                    />
                  </div>
                  <div className="pt-6">
                    <button 
                      type="submit"
                      className="w-full py-5 bg-fh-green text-fh-gold font-black uppercase tracking-[0.3em] rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      Complete Registration
                    </button>
                  </div>
                </form>
              </div>
              <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-4">
                <button 
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="flex-1 py-5 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button className="flex-2 py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl border-b-4 border-black/30 active:scale-95 transition-all">
                  Complete Registration
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isCheckInModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" 
              onClick={() => setIsCheckInModalOpen(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden border-b-[16px] border-fh-green"
            >
              <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-fh-green text-fh-gold rounded-[1.5rem] flex items-center justify-center shadow-xl">
                    <LogIn className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Security Check-In</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-2">Authorized Entry Protocol</p>
                  </div>
                </div>
                <button onClick={() => setIsCheckInModalOpen(false)} className="p-4 hover:bg-slate-100 rounded-full transition-all text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleCheckIn} className="p-10 space-y-8">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Select Child</label>
                  <select 
                    required 
                    value={checkInChildId} 
                    onChange={e => {
                      setCheckInChildId(e.target.value);
                      const child = children.find(c => c.id === e.target.value);
                      if (child) setCheckInParentId(child.parent_id);
                    }}
                    className="w-full px-7 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-fh-green transition-all"
                  >
                    <option value="">Select Child...</option>
                    {children.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Authorized Person (Pickup)</label>
                  <input 
                    required 
                    value={authorizedPerson}
                    onChange={e => setAuthorizedPerson(e.target.value)}
                    placeholder="Full Name of person dropping off"
                    className="w-full px-7 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-fh-green transition-all" 
                  />
                </div>
                <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2">Safety Note</p>
                  <p className="text-[10px] font-bold text-blue-800 leading-relaxed">
                    By confirming check-in, you verify that the guardian is authorized and the child is assigned to the correct class group for this session.
                  </p>
                </div>
                <button type="submit" className="w-full py-6 bg-fh-green text-fh-gold rounded-[2.5rem] font-black uppercase text-xs tracking-[0.4em] shadow-2xl active:scale-95 transition-all border-b-4 border-black/30">
                  Confirm Check-In
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isReportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" 
              onClick={() => setIsReportModalOpen(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95"
            >
              <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-white no-print">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-fh-green text-fh-gold rounded-[1.5rem] flex items-center justify-center shadow-xl">
                    <Printer className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{selectedReportType}</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-2">Official Ministry Document</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => window.print()} className="px-8 py-4 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-2">
                    <Printer className="w-4 h-4" />
                    Print Report
                  </button>
                  <button onClick={() => setIsReportModalOpen(false)} className="p-4 hover:bg-slate-100 rounded-full transition-all text-slate-400">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-16 overflow-y-auto max-h-[80vh] print:p-0 print:max-h-none print:overflow-visible bg-white">
                {/* Official Report Header */}
                <div className="text-center mb-16 border-b-4 border-fh-green pb-10">
                  <h1 className="text-4xl font-black text-fh-green uppercase tracking-tighter mb-2">Faithhouse Chapel International</h1>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Children's Ministry Department • Sunday School</p>
                  <div className="mt-8 flex justify-center gap-12">
                    <div className="text-left">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Report Type</p>
                      <p className="text-sm font-black text-slate-900 uppercase">{selectedReportType}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date Generated</p>
                      <p className="text-sm font-black text-slate-900 uppercase">{new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Organization</p>
                      <p className="text-sm font-black text-slate-900 uppercase">FCI HQ</p>
                    </div>
                  </div>
                </div>

                {/* Report Content based on type */}
                {selectedReportType === 'Children Register' && (
                  <div className="space-y-8">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-900">
                          <th className="py-4 text-xs font-black uppercase">Child Name</th>
                          <th className="py-4 text-xs font-black uppercase">DOB</th>
                          <th className="py-4 text-xs font-black uppercase">Class</th>
                          <th className="py-4 text-xs font-black uppercase">Parent Contact</th>
                          <th className="py-4 text-xs font-black uppercase">Medical Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {children.map(c => (
                          <tr key={c.id} className="text-[10px] font-bold text-slate-700">
                            <td className="py-4 uppercase">{c.first_name} {c.last_name}</td>
                            <td className="py-4">{new Date(c.date_of_birth).toLocaleDateString()}</td>
                            <td className="py-4 uppercase">{classGroups.find(cg => cg.id === c.class_group_id)?.group_name || '---'}</td>
                            <td className="py-4">{parents.find(p => p.id === c.parent_id)?.phone_number || '---'}</td>
                            <td className="py-4 italic text-slate-400">{c.medical_notes || 'None'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Signature Section */}
                <div className="mt-32 pt-10 border-t-2 border-dashed border-slate-200 grid grid-cols-2 gap-20 text-center">
                  <div className="space-y-12">
                    <div className="h-px bg-slate-300 w-48 mx-auto"></div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Ministry Leader Signature</p>
                  </div>
                  <div className="space-y-12">
                    <div className="h-px bg-slate-300 w-48 mx-auto"></div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Head Pastor Approval</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChildrenMinistryView;
