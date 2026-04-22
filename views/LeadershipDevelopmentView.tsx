
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { 
  MinisterialAppraisal, 
  LeadershipPipeline, 
  Minister, 
  Member, 
  UserProfile,
  Ministry,
  MinistryMember,
  MinistryAttendance
} from '../types';
import { toast } from 'sonner';
import { 
  Award, Users, TrendingUp, Target, Star, 
  Search, Filter, Plus, ChevronRight, 
  CheckCircle2, AlertCircle, Clock, 
  BarChart3, PieChart, GraduationCap, 
  UserPlus, Edit3, Trash2, Save, X,
  ArrowUpRight, BookOpen, ShieldCheck,
  Mail, Phone, Briefcase, RefreshCw, UserCheck,
  ArrowLeft, Calendar, Layout,
  Bell, ClipboardList, CheckSquare, DownloadCloud, ArrowRight, ArrowLeft as ArrowLeftIcon, BarChart, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Leader {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  category: 'Pastor' | 'Minister' | 'Ministry Head/Deputy' | 'Worker';
  ministry: string;
  email: string;
  phone: string;
  image_url?: string;
  created_at?: string;
}

interface LeadershipDevelopmentViewProps {
  currentUser: UserProfile | null;
}

const categories = ['Pastor', 'Minister', 'Ministry Head/Deputy', 'Worker'] as const;

const LeadershipDevelopmentView: React.FC<LeadershipDevelopmentViewProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'Registry' | 'Appraisals' | 'Pipeline' | 'Ministries'>('Registry');
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [appraisals, setAppraisals] = useState<MinisterialAppraisal[]>([]);
  const [pipeline, setPipeline] = useState<LeadershipPipeline[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  
  const [ministryItems, setMinistryItems] = useState<Ministry[]>([]);
  const [ministryMembers, setMinistryMembers] = useState<MinistryMember[]>([]);
  const [ministryAttendance, setMinistryAttendance] = useState<MinistryAttendance[]>([]);
  const [selectedMinistryId, setSelectedMinistryId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);
  
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedLeaderIds, setSelectedLeaderIds] = useState<string[]>([]);
  
  // Modals
  const [isLeaderModalOpen, setIsLeaderModalOpen] = useState(false);
  const [isAppraisalModalOpen, setIsAppraisalModalOpen] = useState(false);
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);
  const [isMinistryModalOpen, setIsMinistryModalOpen] = useState(false);
  const [isMinistryMemberModalOpen, setIsMinistryMemberModalOpen] = useState(false);
  const [isMinistryAttendanceModalOpen, setIsMinistryAttendanceModalOpen] = useState(false);
  const [isMinistryBulkAssignModalOpen, setIsMinistryBulkAssignModalOpen] = useState(false);
  
  const [editingLeader, setEditingLeader] = useState<Partial<Leader> | null>(null);
  const [tableMissing, setTableMissing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const [appraisalForm, setAppraisalForm] = useState<Partial<MinisterialAppraisal>>({
    leader_id: '',
    period: `${new Date().getFullYear()} Annual`,
    spiritual_growth_score: 5,
    leadership_score: 5,
    operational_efficiency_score: 5,
    pastoral_care_score: 5,
    strengths: '',
    areas_for_improvement: '',
    recommendations: '',
    status: 'Draft'
  });

  const [pipelineForm, setPipelineForm] = useState<Partial<LeadershipPipeline>>({
    member_id: '',
    current_level: 'Discipleship',
    progress_percentage: 0,
    notes: '',
    status: 'Active'
  });

  const [ministryForm, setMinistryForm] = useState<Partial<Ministry>>({
    name: '',
    ministry: '',
    leader_id: '',
    deputy_id: '',
    description: '',
    meeting_day: '',
    status: 'Active',
    color: '#4f46e5'
  });

  const [ministryMemberForm, setMinistryMemberForm] = useState<Partial<MinistryMember>>({
    member_id: '',
    role: '',
    status: 'Active',
    joined_date: new Date().toISOString().split('T')[0]
  });

  const [attendanceForm, setAttendanceForm] = useState<{
    session_date: string;
    notes: string;
    attendees: string[];
  }>({
    session_date: new Date().toISOString().split('T')[0],
    notes: '',
    attendees: []
  });

  const [bulkAssignMinistryId, setBulkAssignMinistryId] = useState('');

    const repairSQL = `
    DO $$ 
    BEGIN
      ALTER TABLE public.leadership RENAME COLUMN department TO ministry;
    EXCEPTION WHEN undefined_column THEN END $$;

    -- Consolidate teams into ministries
    DO $$ 
    BEGIN
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'teams') THEN
        ALTER TABLE public.teams RENAME TO ministries;
      END IF;
    EXCEPTION WHEN duplicate_table THEN END $$;

    DO $$ 
    BEGIN
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'team_members') THEN
        ALTER TABLE public.team_members RENAME TO ministry_members;
        ALTER TABLE public.ministry_members RENAME COLUMN team_id TO ministry_id;
      END IF;
    EXCEPTION WHEN duplicate_table THEN END $$;

    DO $$ 
    BEGIN
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'team_attendance') THEN
        ALTER TABLE public.team_attendance RENAME TO ministry_attendance;
        ALTER TABLE public.ministry_attendance RENAME COLUMN team_id TO ministry_id;
      END IF;
    EXCEPTION WHEN duplicate_table THEN END $$;

    -- Ensure leadership table exists
    CREATE TABLE IF NOT EXISTS public.leadership (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      position TEXT NOT NULL,
      category TEXT NOT NULL,
      ministry TEXT,
      email TEXT,
      phone TEXT,
      image_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    -- Ensure ministries table exists (merged from teams and ministries)
    CREATE TABLE IF NOT EXISTS public.ministries (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      ministry TEXT, -- Parent category/ministry
      leader_id UUID REFERENCES public.leadership(id),
      leader_name TEXT,
      deputy_id UUID REFERENCES public.leadership(id),
      deputy_name TEXT,
      email TEXT,
      description TEXT,
      meeting_schedule TEXT,
      meeting_day TEXT,
      status TEXT DEFAULT 'Active',
      color TEXT DEFAULT '#4f46e5',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    -- Ensure ministerial_appraisals table exists and uses leader_id
    CREATE TABLE IF NOT EXISTS public.ministerial_appraisals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      leader_id UUID REFERENCES public.leadership(id) ON DELETE CASCADE,
      appraiser_id UUID REFERENCES public.profiles(id),
      period TEXT NOT NULL,
      spiritual_growth_score INTEGER DEFAULT 5,
      leadership_score INTEGER DEFAULT 5,
      operational_efficiency_score INTEGER DEFAULT 5,
      pastoral_care_score INTEGER DEFAULT 5,
      strengths TEXT,
      areas_for_improvement TEXT,
      recommendations TEXT,
      status TEXT DEFAULT 'Draft',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    -- Leadership Pipeline Table
    CREATE TABLE IF NOT EXISTS public.leadership_pipeline (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
      current_level TEXT NOT NULL,
      progress_percentage INTEGER DEFAULT 0,
      mentor_id UUID REFERENCES public.profiles(id),
      notes TEXT,
      status TEXT DEFAULT 'Active',
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.ministry_members (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      ministry_id UUID REFERENCES public.ministries(id) ON DELETE CASCADE,
      member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
      role TEXT,
      joined_date DATE DEFAULT CURRENT_DATE,
      status TEXT DEFAULT 'Active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.ministry_attendance (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      ministry_id UUID REFERENCES public.ministries(id) ON DELETE CASCADE,
      session_date DATE NOT NULL,
      notes TEXT,
      attendees JSONB DEFAULT '[]',
      created_by UUID REFERENCES public.profiles(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    ALTER TABLE public.leadership ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.ministerial_appraisals ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.leadership_pipeline ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.ministries ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.ministry_members ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.ministry_attendance ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow all for authenticated users on leadership" ON public.leadership;
    CREATE POLICY "Allow all for authenticated users on leadership" ON public.leadership FOR ALL TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all for authenticated users on ministerial_appraisals" ON public.ministerial_appraisals;
    CREATE POLICY "Allow all for authenticated users on ministerial_appraisals" ON public.ministerial_appraisals FOR ALL TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all for authenticated users on leadership_pipeline" ON public.leadership_pipeline;
    CREATE POLICY "Allow all for authenticated users on leadership_pipeline" ON public.leadership_pipeline FOR ALL TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all on ministries" ON public.ministries;
    CREATE POLICY "Allow all on ministries" ON public.ministries FOR ALL TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all on ministry_members" ON public.ministry_members;
    CREATE POLICY "Allow all on ministry_members" ON public.ministry_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all on ministry_attendance" ON public.ministry_attendance;
    CREATE POLICY "Allow all on ministry_attendance" ON public.ministry_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);

    NOTIFY pgrst, 'reload schema';
  `;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch Leaders
      const { data: lData, error: lError } = await supabase
        .from('leadership')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (lError && (lError.code === '42P01' || lError.code === 'PGRST205')) {
        setTableMissing(true);
      } else {
        setLeaders(lData || []);
      }

      // Fetch Appraisals
      const { data: aData } = await supabase
        .from('ministerial_appraisals')
        .select('*, leadership(first_name, last_name, position), appraiser:appraiser_id(full_name)')
        .order('created_at', { ascending: false });
      setAppraisals(aData || []);

      // Fetch Pipeline
      const { data: pData } = await supabase
        .from('leadership_pipeline')
        .select('*, members(*), mentor:mentor_id(full_name)')
        .order('updated_at', { ascending: false });
      setPipeline(pData || []);

      // Fetch Members for dropdown
      const { data: memData } = await supabase
        .from('members')
        .select('*')
        .order('first_name');
      setMembers(memData || []);

      // Fetch Ministry Items
      const { data: tData } = await supabase
        .from('ministries')
        .select('*, lead:leader_id(first_name, last_name, position), deputy:deputy_id(first_name, last_name, position)')
        .order('name');
      setMinistryItems(tData || []);

      // Fetch Ministry Members
      const { data: tmData } = await supabase
        .from('ministry_members')
        .select('*');
      setMinistryMembers(tmData || []);

      // Fetch Ministry Attendance
      const { data: taData } = await supabase
        .from('ministry_attendance')
        .select('*')
        .order('session_date', { ascending: false });
      setMinistryAttendance(taData || []);

    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLeaderSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const leaderData = {
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      position: formData.get('position') as string,
      category: formData.get('category') as any,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      ministry: formData.get('ministry') as string,
    };

    try {
      if (editingLeader?.id) {
        const { error } = await supabase.from('leadership').update(leaderData).eq('id', editingLeader.id);
        if (error) throw error;
        toast.success("Leader updated successfully");
      } else {
        const { error } = await supabase.from('leadership').insert([leaderData]);
        if (error) throw error;
        toast.success("New leader appointed successfully");
      }
      fetchData();
      setIsLeaderModalOpen(false);
      setEditingLeader(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppraisalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...appraisalForm,
        appraiser_id: currentUser?.id
      };
      const { error } = await supabase.from('ministerial_appraisals').insert([payload]);
      if (error) throw error;
      toast.success("Appraisal submitted successfully");
      setIsAppraisalModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePipelineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('leadership_pipeline').insert([pipelineForm]);
      if (error) throw error;
      toast.success("Member added to pipeline");
      setIsPipelineModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLeader = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this leader?")) return;
    try {
      const { error } = await supabase.from('leadership').delete().eq('id', id);
      if (error) throw error;
      toast.success("Leader removed");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleMinistrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (ministryForm.id) {
        const { error } = await supabase.from('ministries').update(ministryForm).eq('id', ministryForm.id);
        if (error) throw error;
        toast.success("Ministry updated");
      } else {
        const { error } = await supabase.from('ministries').insert([ministryForm]);
        if (error) throw error;
        toast.success("Ministry created");
      }
      setIsMinistryModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMinistryMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...ministryMemberForm, ministry_id: selectedMinistryId };
      const { error } = await supabase.from('ministry_members').insert([payload]);
      if (error) throw error;
      toast.success("Member added to ministry");
      setIsMinistryMemberModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMinistryMember = async (id: string) => {
    if(!window.confirm("Remove member from ministry?")) return;
    try {
      await supabase.from('ministry_members').delete().eq('id', id);
      toast.success("Member removed");
      fetchData();
    } catch(err) {}
  };

  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ministry_id: selectedMinistryId,
        session_date: attendanceForm.session_date,
        notes: attendanceForm.notes,
        attendees: attendanceForm.attendees,
        created_by: currentUser?.id
      };
      const { error } = await supabase.from('ministry_attendance').insert([payload]);
      if (error) throw error;
      toast.success("Attendance logged");
      setIsMinistryAttendanceModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLeaderSelection = (id: string) => {
    setSelectedLeaderIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkAssign = async () => {
    if(!bulkAssignMinistryId || selectedLeaderIds.length === 0) return;
    setIsSubmitting(true);
    try {
      const payloads = selectedLeaderIds.map(id => ({
        ministry_id: bulkAssignMinistryId,
        member_id: id,
        role: 'Member',
        joined_date: new Date().toISOString().split('T')[0],
        status: 'Active'
      }));
      const { error } = await supabase.from('ministry_members').insert(payloads);
      if (error) throw error;
      toast.success(`${selectedLeaderIds.length} leaders assigned to ministry`);
      setIsMinistryBulkAssignModalOpen(false);
      setIsSelectMode(false);
      setSelectedLeaderIds([]);
      fetchData();
    } catch(err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportSelected = () => {
    if(selectedLeaderIds.length === 0) return;
    const selectedData = leaders.filter(l => selectedLeaderIds.includes(l.id));
    const csvHeader = "First Name,Last Name,Position,Category,Ministry,Email,Phone\n";
    const csvContent = selectedData.map(l => `"${l.first_name}","${l.last_name}","${l.position}","${l.category}","${l.ministry}","${l.email}","${l.phone}"`).join("\n");
    
    const blob = new Blob([csvHeader + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'selected_leaders.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export successful");
  };

  const handlePipelineMove = async (id: string, newLevel: string) => {
    try {
      const { error } = await supabase.from('leadership_pipeline').update({ current_level: newLevel, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      toast.success("Moved candidate");
      fetchData();
    } catch(err:any) {}
  };

  const filteredLeaders = leaders.filter(l => {
    const matchesCategory = activeCategory === 'All' || l.category === activeCategory;
    const matchesSearch = (l.first_name + ' ' + l.last_name).toLowerCase().includes(searchTerm.toLowerCase()) || 
                         l.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         l.ministry.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const selectedLeader = leaders.find(l => l.id === selectedLeaderId);
  const leaderAppraisals = appraisals.filter(a => a.leader_id === selectedLeaderId);

  // Analytics Computation
  const avgLeadershipScore = appraisals.length ? (appraisals.reduce((acc, a) => acc + (a.leadership_score || 0), 0) / appraisals.length).toFixed(1) : 'N/A';
  
  const pipelineCounts = pipeline.reduce((acc, p) => {
    acc[p.current_level] = (acc[p.current_level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryCounts = leaders.reduce((acc, l) => {
    acc[l.category] = (acc[l.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Notifications Computation
  const notifications: any[] = [];
  const currentYear = new Date().getFullYear().toString();
  
  leaders.forEach(l => {
    const hasAppraisal = appraisals.some(a => a.leader_id === l.id && a.period.includes(currentYear));
    if (!hasAppraisal) {
      notifications.push({ id: `app-${l.id}`, type: 'Appraisal', message: `No ${currentYear} appraisal for ${l.first_name} ${l.last_name}` });
    }
  });

  pipeline.forEach(p => {
    const lastUpdate = new Date(p.updated_at || new Date());
    const daysSince = (new Date().getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
    if (daysSince > 30) {
      const mem = members.find(m => m.id === p.member_id);
      notifications.push({ id: `pipe-${p.id}`, type: 'Pipeline', message: `${mem?.first_name || 'Member'} stuck in pipeline >30 days` });
    }
  });

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  ministryItems.forEach(t => {
     const recentAtt = ministryAttendance.find(a => a.ministry_id === t.id && new Date(a.session_date) >= fourteenDaysAgo);
     if (!recentAtt) {
       notifications.push({ id: `att-${t.id}`, type: 'Ministry', message: `No attendance for ${t.name} in last 14 days` });
     }
  });

  if (tableMissing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-rose-100">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Leadership Module Offline</h2>
        <p className="text-slate-500 max-w-md mb-8 font-medium">The leadership and development tables haven't been initialized yet. Run the repair script to enable this feature.</p>
        <div className="w-full max-w-2xl bg-slate-900 rounded-2xl p-6 mb-8 text-left overflow-x-auto">
          <pre className="text-fh-gold text-[10px] font-mono leading-relaxed">{repairSQL}</pre>
        </div>
        <button 
          onClick={() => { navigator.clipboard.writeText(repairSQL); toast.success("SQL Copied!"); }}
          className="px-8 py-4 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all"
        >
          Copy Repair Script
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-50">
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Leadership & Development</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] flex items-center gap-2">
            <GraduationCap className="w-3 h-3 text-fh-gold" />
            Governance, Oversight & Pipeline
          </p>
        </div>
        <div className="flex gap-4 items-center">
          
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-4 bg-white rounded-2xl shadow-md text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-2 right-2 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
              )}
            </button>
            
            <AnimatePresence>
              {showNotifications && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Action Required</h4>
                     <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{notifications.length}</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                       <div className="p-8 text-center text-slate-400 text-xs font-bold">You're all caught up!</div>
                    ) : (
                       notifications.map(n => (
                         <div key={n.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3 items-start">
                            <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg shrink-0">
                               <AlertCircle className="w-4 h-4" />
                            </div>
                            <div>
                               <p className="text-[10px] font-bold text-slate-800 leading-snug">{n.message}</p>
                            </div>
                         </div>
                       ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all flex items-center gap-3"
          >
            <BarChart className="w-4 h-4" />
            Analytics
          </button>
          
          <button 
            onClick={() => { setEditingLeader({}); setIsLeaderModalOpen(true); }}
            className="px-6 py-4 bg-slate-900 text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center gap-3"
          >
            <Plus className="w-4 h-4" />
            Appoint Leader
          </button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <AnimatePresence>
        {showAnalytics && (
           <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-950 p-8 rounded-[3rem] shadow-2xl relative">
                <div className="space-y-1">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Total Leaders</h4>
                   <p className="text-4xl font-black text-fh-gold">{leaders.length}</p>
                </div>
                <div className="space-y-1">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Active Ministries</h4>
                   <p className="text-4xl font-black text-fh-green">{ministryItems.length}</p>
                </div>
                <div className="space-y-1">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Pipeline</h4>
                   <p className="text-4xl font-black text-indigo-400">{pipeline.length}</p>
                </div>
                <div className="space-y-1">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Avg Score</h4>
                   <p className="text-4xl font-black text-amber-400">{avgLeadershipScore} <span className="text-lg text-slate-600">/ 5</span></p>
                </div>

                <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-[2rem] p-6 mt-4">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Category Breakdown</h4>
                   <div className="space-y-3">
                     {categories.map(cat => (
                        <div key={cat} className="flex items-center gap-4">
                           <div className="w-24 text-[9px] font-black uppercase tracking-widest text-slate-500 truncate">{cat}</div>
                           <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div className="h-full bg-fh-gold" style={{ width: `${leaders.length ? ((categoryCounts[cat] || 0) / leaders.length) * 100 : 0}%` }} />
                           </div>
                           <div className="w-8 text-[10px] font-bold text-white text-right">{categoryCounts[cat] || 0}</div>
                        </div>
                     ))}
                   </div>
                </div>

                <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-[2rem] p-6 mt-4">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Pipeline Stages</h4>
                   <div className="space-y-3">
                     {['Discipleship', 'Leadership School', 'Minister in Training', 'Ministry Lead'].map(stage => (
                        <div key={stage} className="flex items-center gap-4">
                           <div className="w-32 text-[9px] font-black uppercase tracking-widest text-slate-500 truncate border-l-2 border-active pl-2" style={{ borderColor: stage === 'Discipleship' ? '#64748b' : stage === 'Leadership School' ? '#6366f1' : stage === 'Minister in Training' ? '#f59e0b' : '#10b981' }}>{stage}</div>
                           <div className="flex-1" />
                           <div className="text-[10px] font-bold text-white text-right w-8">{pipelineCounts[stage] || 0}</div>
                           <div className="text-[9px] font-black text-slate-600 w-12 text-right">{pipeline.length ? Math.round(((pipelineCounts[stage] || 0) / pipeline.length) * 100) : 0}%</div>
                        </div>
                     ))}
                   </div>
                </div>
             </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      {!selectedMinistryId && !selectedLeaderId && (
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-[2rem] w-fit overflow-x-auto max-w-full">
          {(['Registry', 'Appraisals', 'Pipeline', 'Ministries'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-3 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab 
                  ? 'bg-white text-fh-green shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab === 'Registry' ? 'Leader Registry' : tab === 'Appraisals' ? 'Global Appraisals' : tab === 'Pipeline' ? 'Leadership Pipeline' : 'Ministries'}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {selectedLeaderId ? (
          <motion.div 
            key="profile"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Leader Profile Header */}
            <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-bl-[10rem] -mr-32 -mt-32" />
              <button 
                onClick={() => setSelectedLeaderId(null)}
                className="mb-8 flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-fh-green transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Registry
              </button>

              <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                <div className="w-32 h-32 rounded-[3rem] bg-slate-950 text-fh-gold flex items-center justify-center font-black text-4xl shadow-2xl border-b-8 border-fh-gold/20">
                  {selectedLeader?.first_name[0]}{selectedLeader?.last_name[0]}
                </div>
                <div className="text-center md:text-left flex-1">
                  <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-2">
                    {selectedLeader?.first_name} {selectedLeader?.last_name}
                  </h3>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4">
                    <span className="px-4 py-1.5 bg-fh-green/10 text-fh-green rounded-full text-[10px] font-black uppercase tracking-widest border border-fh-green/20">
                      {selectedLeader?.position}
                    </span>
                    <span className="px-4 py-1.5 bg-slate-100 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200">
                      {selectedLeader?.category}
                    </span>
                    <span className="px-4 py-1.5 bg-fh-gold/10 text-fh-gold rounded-full text-[10px] font-black uppercase tracking-widest border border-fh-gold/20">
                      {selectedLeader?.ministry}
                    </span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      setAppraisalForm(prev => ({ ...prev, leader_id: selectedLeaderId }));
                      setIsAppraisalModalOpen(true);
                    }}
                    className="px-8 py-4 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-3"
                  >
                    <Star className="w-4 h-4" />
                    New Appraisal
                  </button>
                  <button 
                    onClick={() => { setEditingLeader(selectedLeader!); setIsLeaderModalOpen(true); }}
                    className="p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 pt-12 border-t border-slate-50 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Email Address</p>
                    <p className="text-sm font-bold text-slate-700">{selectedLeader?.email || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Phone Number</p>
                    <p className="text-sm font-bold text-slate-700">{selectedLeader?.phone || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Appointed On</p>
                    <p className="text-sm font-bold text-slate-700">{selectedLeader?.created_at ? new Date(selectedLeader.created_at).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* NEW SECTION A: Ministries Led & NEW SECTION B: Performance Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-4 mb-8">
                     <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center"><Users className="w-5 h-5" /></div>
                     <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Ministries Led</h4>
                  </div>
                  <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                     {ministryItems.filter(t => t.leader_id === selectedLeaderId).length === 0 ? (
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Not leading any ministries currently.</p>
                     ) : (
                         ministryItems.filter(t => t.leader_id === selectedLeaderId).map(min => (
                           <div key={min.id} onClick={() => { setSelectedLeaderId(null); setSelectedMinistryId(min.id); setActiveTab('Ministries'); }} className="p-5 border border-slate-100 rounded-2xl flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow bg-slate-50 border-l-4" style={{ borderLeftColor: min.color }}>
                              <div>
                                 <h5 className="font-black text-slate-800 uppercase tracking-tight mb-1">{min.name}</h5>
                                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{min.ministry}</p>
                              </div>
                              <div className="text-right">
                                 <span className="text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">{ministryMembers.filter(m => m.ministry_id === min.id).length} Members</span>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               </div>
               
               <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-4 mb-8">
                     <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center"><TrendingUp className="w-5 h-5" /></div>
                     <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Performance Trend</h4>
                  </div>
                  <div className="space-y-6">
                     {leaderAppraisals.length === 0 ? (
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No appraisal data available to calculate trends.</p>
                     ) : (
                        [
                           { key: 'leadership_score', label: 'Leadership' },
                           { key: 'spiritual_growth_score', label: 'Spiritual Growth' },
                           { key: 'operational_efficiency_score', label: 'Operational Efficiency' },
                           { key: 'pastoral_care_score', label: 'Pastoral Care' }
                        ].map(metric => {
                           const avg = leaderAppraisals.reduce((sum, a) => sum + (a[metric.key as keyof MinisterialAppraisal] as number || 0), 0) / leaderAppraisals.length;
                           const pct = (avg / 5) * 100;
                           return (
                              <div key={metric.key} className="space-y-2">
                                 <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-slate-500">{metric.label}</span>
                                    <span className="text-fh-green">{pct.toFixed(0)}%</span>
                                 </div>
                                 <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full bg-fh-green rounded-full" />
                                 </div>
                              </div>
                           );
                        })
                     )}
                  </div>
               </div>
            </div>

            {/* Appraisal History for this leader */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Appraisal History</h4>
                <div className="h-0.5 flex-1 bg-slate-100 mx-8" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {leaderAppraisals.length > 0 ? leaderAppraisals.map(appraisal => (
                  <div key={appraisal.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-md transition-all border-b-4 border-fh-gold">
                    <div className="flex justify-between items-start mb-6">
                      <span className="px-3 py-1 bg-fh-gold/10 text-fh-gold rounded-full text-[8px] font-black uppercase tracking-widest">
                        {appraisal.period}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                        appraisal.status === 'Reviewed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {appraisal.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Spiritual</p>
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(s => (
                            <div key={s} className={`w-2 h-2 rounded-full ${s <= appraisal.spiritual_growth_score ? 'bg-fh-gold' : 'bg-slate-100'}`} />
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Leadership</p>
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(s => (
                            <div key={s} className={`w-2 h-2 rounded-full ${s <= appraisal.leadership_score ? 'bg-fh-green' : 'bg-slate-100'}`} />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl mb-4">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Key Strengths</p>
                      <p className="text-xs font-bold text-slate-600 line-clamp-3 italic">"{appraisal.strengths}"</p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">By: {appraisal.appraiser?.full_name || 'System'}</p>
                      <button className="text-[10px] font-black text-fh-green uppercase tracking-widest hover:underline">View Full</button>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-slate-100 shadow-inner italic text-slate-300 font-black uppercase tracking-widest text-xs">No appraisals recorded for this leader yet.</div>
                )}
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'Registry' ? (
          <motion.div 
            key="registry"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm w-fit">
                {['All', ...categories].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                      activeCategory === cat 
                        ? 'bg-fh-green text-fh-gold shadow-md' 
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {cat}s
                  </button>
                ))}
              </div>
              <div className="flex gap-4 items-center w-full md:w-auto">
                <div className="relative flex-1 md:flex-none">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search leaders..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11 pr-4 py-3 w-full bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-fh-green/20 outline-none md:w-64 shadow-sm"
                  />
                </div>
                <button
                  onClick={() => setIsSelectMode(!isSelectMode)}
                  className={`p-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-sm transition-all flex items-center justify-center gap-2 ${isSelectMode ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                >
                  <CheckSquare className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-24">
              {isLoading ? (
                [1,2,3,4].map(i => <div key={i} className="h-72 bg-white rounded-[2.5rem] animate-pulse border border-slate-100 shadow-sm" />)
              ) : filteredLeaders.length > 0 ? filteredLeaders.map((leader, idx) => (
                <motion.div 
                  key={leader.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => isSelectMode ? toggleLeaderSelection(leader.id) : setSelectedLeaderId(leader.id)}
                  className={`bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 transition-all group relative cursor-pointer ${isSelectMode && selectedLeaderIds.includes(leader.id) ? 'ring-2 ring-indigo-500 border-indigo-500' : 'hover:shadow-xl hover:-translate-y-1'}`}
                >
                  {isSelectMode && (
                     <div className="absolute top-6 right-6 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors z-10" style={{ borderColor: selectedLeaderIds.includes(leader.id) ? '#4f46e5' : '#cbd5e1', backgroundColor: selectedLeaderIds.includes(leader.id) ? '#4f46e5' : 'transparent' }}>
                       {selectedLeaderIds.includes(leader.id) && <CheckSquare className="w-4 h-4 text-white" />}
                     </div>
                  )}
                  
                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[5rem] -mr-16 -mt-16 transition-transform group-hover:scale-110 group-hover:bg-fh-green/5" />
                  
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-[2rem] bg-slate-950 text-fh-gold flex items-center justify-center font-black text-2xl mb-6 shadow-2xl group-hover:rotate-3 transition-transform border-b-4 border-fh-gold/20">
                      {leader.first_name[0]}{leader.last_name[0]}
                    </div>
                    
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight truncate w-full mb-1">
                      {leader.first_name} {leader.last_name}
                    </h3>
                    <p className="text-[10px] font-black text-fh-green uppercase tracking-widest mb-3">{leader.position}</p>
                    
                    <div className="mt-8 pt-8 border-t border-slate-50 w-full space-y-4">
                      <div className="flex items-center gap-3 text-slate-400 group-hover:text-slate-600 transition-colors">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                          <Briefcase className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest">{leader.ministry || 'General'}</span>
                      </div>
                    </div>

                    <div className="mt-8 flex gap-2 w-full">
                      <button className="flex-1 py-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-fh-green/10 hover:text-fh-green transition-all flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-widest">
                        View Profile
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-slate-100 shadow-inner italic text-slate-300 font-black uppercase tracking-widest text-xs">No leaders found.</div>
              )}
            </div>

            {/* Bulk Action Bar */}
            <AnimatePresence>
              {isSelectMode && (
                <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] max-w-2xl w-[90%] md:w-full">
                   <div className="bg-slate-900 text-white rounded-[2rem] p-4 px-6 md:px-8 shadow-2xl flex flex-col md:flex-row items-center justify-between border border-slate-800 gap-4">
                      <div className="flex items-center gap-4">
                         <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center font-black text-xs">{selectedLeaderIds.length}</div>
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Leaders Selected</span>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                         <button onClick={() => setIsMinistryBulkAssignModalOpen(true)} disabled={selectedLeaderIds.length === 0} className="px-4 py-2 bg-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-colors">Assign to Ministry</button>
                         <button onClick={handleExportSelected} disabled={selectedLeaderIds.length === 0} className="px-4 py-2 bg-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2"><DownloadCloud className="w-3 h-3" /> Export CSV</button>
                         <button onClick={() => { setIsSelectMode(false); setSelectedLeaderIds([]); }} className="w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"><X className="w-4 h-4" /></button>
                      </div>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        ) : activeTab === 'Appraisals' ? (
          <motion.div 
            key="appraisals"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {appraisals.length > 0 ? appraisals.map(appraisal => (
              <div key={appraisal.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all border-b-4 border-fh-gold">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-slate-50 text-fh-green rounded-2xl flex items-center justify-center font-black text-lg border border-slate-100 shadow-inner">
                    {appraisal.leadership?.first_name.charAt(0)}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                    appraisal.status === 'Reviewed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {appraisal.status}
                  </span>
                </div>

                <h3 className="text-xl font-black text-slate-900 mb-1 uppercase tracking-tight">
                  {appraisal.leadership?.first_name} {appraisal.leadership?.last_name}
                </h3>
                <p className="text-[10px] font-black text-fh-gold uppercase tracking-[0.2em] mb-6">{appraisal.period}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Leadership</p>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(s => (
                        <div key={s} className={`w-2 h-2 rounded-full ${s <= appraisal.leadership_score ? 'bg-fh-green' : 'bg-slate-100'}`} />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Spiritual</p>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(s => (
                        <div key={s} className={`w-2 h-2 rounded-full ${s <= appraisal.spiritual_growth_score ? 'bg-fh-gold' : 'bg-slate-100'}`} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">By: {appraisal.appraiser?.full_name || 'System'}</p>
                  <button 
                    onClick={() => setSelectedLeaderId(appraisal.leader_id)}
                    className="text-[10px] font-black text-fh-green uppercase tracking-widest hover:underline"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-slate-100 shadow-inner italic text-slate-300 font-black uppercase tracking-widest text-xs">No appraisals recorded yet.</div>
            )}
          </motion.div>
        ) : activeTab === 'Pipeline' ? (
          <motion.div 
            key="pipeline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex gap-6 overflow-x-auto pb-8 snap-x"
          >
            {['Discipleship', 'Leadership School', 'Minister in Training', 'Ministry Lead'].map((stage, sIdx, sArr) => {
               const stgItems = pipeline.filter(p => p.current_level === stage);
               return (
                 <div key={stage} className="min-w-[320px] max-w-[320px] bg-slate-100 rounded-[3rem] p-4 flex flex-col snap-center">
                    <div className="p-4 flex items-center justify-between mb-4 border-b border-slate-200">
                       <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">{stage}</h3>
                       <span className="bg-slate-200 text-slate-500 font-bold text-xs px-3 py-1 rounded-full">{stgItems.length}</span>
                    </div>
                    <div className="flex-1 space-y-4 overflow-y-auto">
                       {stgItems.length === 0 ? (
                         <div className="text-center p-8 text-slate-400 text-[10px] font-black uppercase tracking-widest">No candidates</div>
                       ) : stgItems.map(item => (
                         <div key={item.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 rounded-bl-[3rem] -mr-8 -mt-8" />
                            <div className="flex items-center gap-4 mb-4 relative z-10">
                               <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black">{item.members?.first_name.charAt(0)}</div>
                               <div>
                                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">{item.members?.first_name}</h4>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.progress_percentage}% Done</span>
                               </div>
                            </div>
                            
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4 relative z-10">
                               <div className="h-full bg-indigo-500" style={{ width: `${item.progress_percentage}%` }} />
                            </div>

                            <div className="flex justify-between items-center relative z-10 border-t border-slate-50 pt-4">
                               <button 
                                 disabled={sIdx === 0} 
                                 onClick={() => handlePipelineMove(item.id, sArr[sIdx - 1])}
                                 className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 transition-colors"
                               >
                                 <ArrowLeft className="w-4 h-4" />
                               </button>
                               <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Move</span>
                               <button 
                                 disabled={sIdx === sArr.length - 1}
                                 onClick={() => handlePipelineMove(item.id, sArr[sIdx + 1])}
                                 className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 transition-colors"
                               >
                                 <ArrowRight className="w-4 h-4" />
                               </button>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               );
            })}
          </motion.div>
        ) : activeTab === 'Ministries' ? (
          <motion.div 
            key="ministries"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
             {/* Ministries Top Actions */}
             <div className="flex justify-between items-center bg-white p-4 px-8 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-black uppercase tracking-widest text-slate-800">Ministries</h3>
                <button 
                  onClick={() => { setMinistryForm({}); setIsMinistryModalOpen(true); }}
                  className="px-6 py-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Create Ministry
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ministryItems.length === 0 ? (
                   <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-slate-100 shadow-inner italic text-slate-300 font-black uppercase tracking-widest text-xs">No ministries established yet.</div>
                ) : ministryItems.map(min => (
                   <div key={min.id} className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group cursor-pointer" onClick={() => setSelectedMinistryId(min.id)}>
                      <div className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-bl-[5rem] -mr-16 -mt-16 transition-transform group-hover:scale-125" style={{ backgroundColor: min.color }}/>
                      
                      <div className="flex justify-between items-start mb-6">
                         <div className="w-12 h-12 rounded-2xl flex items-center justify-center border" style={{ backgroundColor: `${min.color}15`, color: min.color, borderColor: `${min.color}30` }}>
                            <Users className="w-5 h-5" />
                         </div>
                         <span className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm border border-slate-100">
                           {ministryMembers.filter(m => m.ministry_id === min.id).length} Members
                         </span>
                      </div>
                      
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-1 group-hover:text-indigo-600 transition-colors">{min.name}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">{min.ministry}</p>
                      
                      <div className="border-t border-slate-50 pt-4 mt-6 grid grid-cols-2 gap-4">
                         <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Ministry Head</p>
                            <p className="text-[11px] font-bold text-slate-700 truncate">{min.lead ? `${min.lead.first_name} ${min.lead.last_name}` : 'Unassigned'}</p>
                         </div>
                         <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Deputy Head</p>
                            <p className="text-[11px] font-bold text-slate-700 truncate">{min.deputy ? `${min.deputy.first_name} ${min.deputy.last_name}` : 'Unassigned'}</p>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Ministry Detail View */}
      <AnimatePresence>
         {selectedMinistryId && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 z-[100] bg-slate-100 overflow-y-auto p-4 md:p-8">
               <button onClick={() => setSelectedMinistryId(null)} className="fixed top-8 right-8 z-[110] w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 shadow-xl border border-slate-100 transition-colors">
                  <X className="w-5 h-5" />
               </button>

               {(() => {
                  const min = ministryItems.find(t => t.id === selectedMinistryId);
                  if(!min) return null;
                  const membersList = ministryMembers.filter(m => m.ministry_id === selectedMinistryId);
                  const attHistory = ministryAttendance.filter(a => a.ministry_id === selectedMinistryId);
                  const memberDetails = membersList.map(m => {
                     const memData = members.find(mbr => mbr.id === m.member_id) || leaders.find(ldr => ldr.id === m.member_id);
                     return { ...m, details: memData };
                  });

                  // Calculate overall attendance rate
                  let totalExpected = 0;
                  let totalPresent = 0;
                  attHistory.forEach(a => {
                     const attendees = Array.isArray(a.attendees) ? a.attendees : [];
                     totalExpected += membersList.length;
                     totalPresent += attendees.length;
                  });
                  const overallAttRate = totalExpected > 0 ? ((totalPresent / totalExpected) * 100).toFixed(0) : '0';

                  return (
                     <div className="max-w-7xl mx-auto space-y-8 pb-32">
                        {/* Ministry Header */}
                        <div className="bg-white rounded-[4rem] p-12 shadow-sm border border-slate-200 relative overflow-hidden flex flex-col md:flex-row md:items-end justify-between gap-8">
                           <div className="absolute top-0 right-0 w-96 h-96 opacity-[0.03] rounded-bl-[10rem] -mr-32 -mt-32 pointer-events-none" style={{ backgroundColor: min.color }}/>
                           <div className="relative z-10 space-y-4">
                              <span className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] rounded-full" style={{ backgroundColor: `${min.color}15`, color: min.color }}>{min.ministry}</span>
                              <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">{min.name}</h2>
                              <p className="max-w-2xl text-slate-500 font-medium leading-relaxed">{min.description || 'No description provided.'}</p>
                           </div>
                           <div className="flex gap-6 relative z-10">
                              <div className="bg-slate-50 p-6 rounded-[2rem] min-w-[120px] text-center border border-slate-100 shadow-inner">
                                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Members</p>
                                 <p className="text-3xl font-black text-slate-800">{membersList.length}</p>
                              </div>
                              <div className="bg-slate-50 p-6 rounded-[2rem] min-w-[120px] text-center border border-slate-100 shadow-inner">
                                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Att. Rate</p>
                                 <p className="text-3xl font-black text-slate-800">{overallAttRate}%</p>
                              </div>
                           </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm flex items-center gap-6">
                              <div className="w-16 h-16 rounded-2xl bg-fh-green/10 text-fh-green flex items-center justify-center font-black text-2xl border border-fh-green/20">
                                 {min.lead?.first_name?.charAt(0) || 'H'}
                              </div>
                              <div>
                                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Ministry Head</p>
                                 <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">{min.lead ? `${min.lead.first_name} ${min.lead.last_name}` : 'Unassigned'}</h4>
                                 <p className="text-[10px] font-bold text-fh-green uppercase tracking-widest">{min.lead?.position || 'Lead Role'}</p>
                              </div>
                           </div>
                           <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm flex items-center gap-6">
                              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-2xl border border-indigo-100">
                                 {min.deputy?.first_name?.charAt(0) || 'D'}
                              </div>
                              <div>
                                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Deputy Head</p>
                                 <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">{min.deputy ? `${min.deputy.first_name} ${min.deputy.last_name}` : 'Unassigned'}</h4>
                                 <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{min.deputy?.position || 'Deputy Role'}</p>
                              </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                           {/* Members Roster */}
                           <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm">
                              <div className="flex justify-between items-center mb-8 pb-8 border-b border-slate-100">
                                 <h3 className="text-2xl font-black uppercase tracking-tight text-slate-800">Ministry Roster</h3>
                                 <button onClick={() => setIsMinistryMemberModalOpen(true)} className="px-5 py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors">
                                    <Plus className="w-4 h-4" /> Add Member
                                 </button>
                              </div>
                              <div className="space-y-4">
                                 {memberDetails.length === 0 ? (
                                    <div className="py-12 text-center text-slate-400 font-bold text-sm bg-slate-50 rounded-[2rem]">No members in this ministry.</div>
                                 ) : memberDetails.map(m => (
                                    <div key={m.id} className="flex items-center justify-between p-4 px-6 bg-white border border-slate-100 hover:border-slate-300 transition-colors rounded-[2rem] shadow-sm">
                                       <div className="flex items-center gap-4">
                                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-black text-slate-400 border border-slate-100">
                                             {m.details?.first_name?.charAt(0) || '?'}
                                          </div>
                                          <div>
                                             <h4 className="font-black text-slate-800 uppercase tracking-tight">{m.details?.first_name} {m.details?.last_name}</h4>
                                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{m.role || 'Member'}</p>
                                          </div>
                                       </div>
                                       <button onClick={() => handleRemoveMinistryMember(m.id)} className="w-8 h-8 rounded-full hover:bg-rose-50 text-slate-300 hover:text-rose-500 flex items-center justify-center transition-colors">
                                          <X className="w-4 h-4" />
                                       </button>
                                    </div>
                                 ))}
                              </div>
                           </div>

                           {/* Attendance Log */}
                           <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm">
                              <div className="flex justify-between items-center mb-8 pb-8 border-b border-slate-100">
                                 <h3 className="text-2xl font-black uppercase tracking-tight text-slate-800">Attendance</h3>
                                 <button onClick={() => setIsMinistryAttendanceModalOpen(true)} className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-colors">
                                    <ClipboardList className="w-5 h-5" />
                                 </button>
                              </div>
                              <div className="space-y-6">
                                 {attHistory.length === 0 ? (
                                    <div className="py-12 text-center text-slate-400 font-bold text-sm bg-slate-50 rounded-[2rem]">No attendance logged.</div>
                                 ) : attHistory.slice(0, 5).map(att => (
                                    <div key={att.id} className="p-5 border border-slate-100 rounded-2xl bg-slate-50 hover:bg-white transition-colors relative overflow-hidden">
                                       <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                                       <div className="flex justify-between mb-2">
                                          <p className="text-xs font-black text-slate-800 uppercase tracking-widest">{new Date(att.session_date).toLocaleDateString()}</p>
                                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                             {Array.isArray(att.attendees) ? att.attendees.length : 0} / {membersList.length}
                                          </p>
                                       </div>
                                       {att.notes && <p className="text-xs text-slate-500 font-medium italic mt-2">"{att.notes}"</p>}
                                    </div>
                                 ))}
                              </div>
                           </div>
                        </div>
                     </div>
                  );
               })()}
            </motion.div>
         )}
      </AnimatePresence>

      {/* Leader Modal */}
      <AnimatePresence>
        {isLeaderModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsLeaderModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden border-b-[16px] border-fh-gold">
              <div className="p-12 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-fh-green text-fh-gold rounded-[2rem] flex items-center justify-center shadow-xl border-b-4 border-black/20">
                    <Award className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-fh-green uppercase tracking-tighter leading-none">{editingLeader?.id ? 'Modify Record' : 'Appointment'}</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-2">Leadership Registry Entry</p>
                  </div>
                </div>
                <button onClick={() => setIsLeaderModalOpen(false)} className="p-4 hover:bg-white rounded-full transition-all text-slate-400 active:scale-90"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleLeaderSave} className="p-12 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">First Name</label>
                    <input name="first_name" defaultValue={editingLeader?.first_name} required className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-7 py-4.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-fh-green/5 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Last Name</label>
                    <input name="last_name" defaultValue={editingLeader?.last_name} required className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-7 py-4.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-fh-green/5 outline-none transition-all" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Category</label>
                    <select name="category" defaultValue={editingLeader?.category} required className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-7 py-4.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-fh-green/5 outline-none transition-all cursor-pointer">
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Position / Title</label>
                    <input name="position" defaultValue={editingLeader?.position} required className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-7 py-4.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-fh-green/5 outline-none transition-all" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Email</label>
                    <input name="email" defaultValue={editingLeader?.email} type="email" className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-7 py-4.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-fh-green/5 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Phone</label>
                    <input name="phone" defaultValue={editingLeader?.phone} className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-7 py-4.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-fh-green/5 outline-none transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Ministry</label>
                  <input name="ministry" defaultValue={editingLeader?.ministry} className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-7 py-4.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-fh-green/5 outline-none transition-all" />
                </div>
                <div className="flex gap-4 pt-4">
                  {editingLeader?.id && (
                    <button type="button" onClick={() => handleDeleteLeader(editingLeader.id!)} className="px-8 py-6 bg-rose-50 text-rose-500 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-rose-100 transition-all">Delete</button>
                  )}
                  <button type="submit" disabled={isSubmitting} className="flex-1 bg-fh-green text-fh-gold py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl border-b-4 border-black/30 hover:bg-slate-950 transition-all">
                    {isSubmitting ? 'Processing...' : editingLeader?.id ? 'Update Record' : 'Confirm Appointment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Appraisal Modal */}
      <AnimatePresence>
        {isAppraisalModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsAppraisalModalOpen(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="relative bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-b-[12px] border-fh-gold">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-fh-green text-fh-gold rounded-2xl flex items-center justify-center shadow-lg"><Star className="w-6 h-6" /></div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Leader Appraisal</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Strategic Leadership Evaluation</p>
                  </div>
                </div>
                <button onClick={() => setIsAppraisalModalOpen(false)} className="p-3 hover:bg-slate-200 rounded-full transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleAppraisalSubmit} className="p-10 overflow-y-auto space-y-8 scrollbar-hide">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Select Leader *</label>
                    <select value={appraisalForm.leader_id} onChange={(e) => setAppraisalForm({...appraisalForm, leader_id: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-bold text-slate-800 shadow-inner" required>
                      <option value="">Choose Leader...</option>
                      {leaders.map(l => <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Appraisal Period *</label>
                    <input type="text" value={appraisalForm.period} onChange={(e) => setAppraisalForm({...appraisalForm, period: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-bold text-slate-800 shadow-inner" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Leadership', key: 'leadership_score' },
                    { label: 'Spiritual', key: 'spiritual_growth_score' },
                    { label: 'Efficiency', key: 'operational_efficiency_score' },
                    { label: 'Pastoral Care', key: 'pastoral_care_score' }
                  ].map((score) => (
                    <div key={score.key} className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{score.label}</label>
                      <select value={appraisalForm[score.key as keyof MinisterialAppraisal] as number} onChange={(e) => setAppraisalForm({...appraisalForm, [score.key]: parseInt(e.target.value)})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-black text-slate-800 shadow-inner">
                        {[1,2,3,4,5].map(v => <option key={v} value={v}>{v} Stars</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Key Strengths</label>
                    <textarea value={appraisalForm.strengths} onChange={(e) => setAppraisalForm({...appraisalForm, strengths: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-bold text-slate-800 shadow-inner min-h-[100px]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Areas for Improvement</label>
                    <textarea value={appraisalForm.areas_for_improvement} onChange={(e) => setAppraisalForm({...appraisalForm, areas_for_improvement: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-bold text-slate-800 shadow-inner min-h-[100px]" />
                  </div>
                </div>
                <div className="flex justify-end gap-4 pt-4">
                  <button type="submit" disabled={isSubmitting} className="px-10 py-4 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all flex items-center gap-3">
                    {isSubmitting ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Submit Appraisal
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pipeline Modal */}
      <AnimatePresence>
        {isPipelineModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsPipelineModalOpen(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-b-[12px] border-fh-green">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-fh-green text-fh-gold rounded-2xl flex items-center justify-center shadow-lg"><UserPlus className="w-6 h-6" /></div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Leadership Pipeline</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identify & Nurture Future Leaders</p>
                  </div>
                </div>
                <button onClick={() => setIsPipelineModalOpen(false)} className="p-3 hover:bg-slate-200 rounded-full transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handlePipelineSubmit} className="p-10 overflow-y-auto space-y-8 scrollbar-hide">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Select Member *</label>
                    <select value={pipelineForm.member_id} onChange={(e) => setPipelineForm({...pipelineForm, member_id: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-bold text-slate-800 shadow-inner" required>
                      <option value="">Choose Candidate...</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Current Level *</label>
                      <select value={pipelineForm.current_level} onChange={(e) => setPipelineForm({...pipelineForm, current_level: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-black text-slate-800 shadow-inner">
                        <option value="Discipleship">Discipleship</option>
                        <option value="Leadership School">Leadership School</option>
                        <option value="Minister in Training">Minister in Training</option>
                        <option value="Ministry Lead">Ministry Lead</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Progress (%)</label>
                      <input type="number" min="0" max="100" value={pipelineForm.progress_percentage} onChange={(e) => setPipelineForm({...pipelineForm, progress_percentage: parseInt(e.target.value)})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-bold text-slate-800 shadow-inner" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Mentor Notes</label>
                    <textarea value={pipelineForm.notes} onChange={(e) => setPipelineForm({...pipelineForm, notes: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-bold text-slate-800 shadow-inner min-h-[120px]" />
                  </div>
                </div>
                <div className="flex justify-end gap-4 pt-4">
                  <button type="submit" disabled={isSubmitting} className="px-10 py-4 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all flex items-center gap-3">
                    {isSubmitting ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Add Candidate
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ministry Modal */}
      <AnimatePresence>
        {isMinistryModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsMinistryModalOpen(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border-b-[12px] border-fh-green">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-fh-green text-fh-gold rounded-2xl flex items-center justify-center shadow-lg"><Briefcase className="w-6 h-6" /></div>
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800 leading-none">{ministryForm.id ? 'Edit Ministry' : 'Create Ministry'}</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Structure your groups</p>
                  </div>
                </div>
                <button onClick={() => setIsMinistryModalOpen(false)} className="p-3 hover:bg-slate-200 rounded-full transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleMinistrySubmit} className="p-10 space-y-8 overflow-y-auto max-h-[70vh] scrollbar-hide">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Ministry Name *</label>
                    <input autoFocus required type="text" value={ministryForm.name || ''} onChange={(e) => setMinistryForm({...ministryForm, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-green/10 font-bold text-slate-800 shadow-inner" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Parent Ministry / Category</label>
                      <input type="text" value={ministryForm.ministry || ''} onChange={(e) => setMinistryForm({...ministryForm, ministry: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-green/10 font-bold text-slate-800 shadow-inner" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Color Theme</label>
                      <div className="flex gap-4 items-center px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner">
                        <input type="color" value={ministryForm.color || '#4f46e5'} onChange={(e) => setMinistryForm({...ministryForm, color: e.target.value})} className="w-8 h-8 rounded-full border-0 cursor-pointer" />
                        <span className="text-sm font-bold text-slate-600">{ministryForm.color || '#4f46e5'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Ministry Head</label>
                      <select value={ministryForm.leader_id || ''} onChange={(e) => setMinistryForm({...ministryForm, leader_id: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-green/10 font-bold text-slate-800 shadow-inner">
                        <option value="">Select a Head...</option>
                        {leaders.map(l => <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Deputy Head</label>
                      <select value={ministryForm.deputy_id || ''} onChange={(e) => setMinistryForm({...ministryForm, deputy_id: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-green/10 font-bold text-slate-800 shadow-inner">
                        <option value="">Select a Deputy...</option>
                        {leaders.map(l => <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Description</label>
                    <textarea value={ministryForm.description || ''} onChange={(e) => setMinistryForm({...ministryForm, description: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-green/10 font-bold text-slate-800 shadow-inner min-h-[100px]" />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button type="submit" disabled={isSubmitting} className="px-10 py-4 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all flex items-center gap-3">
                    {isSubmitting ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Ministry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Ministry Member Modal */}
      <AnimatePresence>
        {isMinistryMemberModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsMinistryMemberModalOpen(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border-b-[12px] border-indigo-600">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><UserPlus className="w-6 h-6" /></div>
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800 leading-none">Add Member</h2>
                  </div>
                </div>
                <button onClick={() => setIsMinistryMemberModalOpen(false)} className="p-3 hover:bg-slate-200 rounded-full transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleMinistryMemberSubmit} className="p-10 space-y-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Select Leader *</label>
                    <select required value={ministryMemberForm.member_id || ''} onChange={(e) => setMinistryMemberForm({...ministryMemberForm, member_id: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold text-slate-800 shadow-inner">
                      <option value="">Choose Leader...</option>
                      {leaders.filter(l => !ministryMembers.some(tm => tm.ministry_id === selectedMinistryId && tm.member_id === l.id)).map(l => <option key={l.id} value={l.id}>{l.first_name} {l.last_name} ({l.position})</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Role in Ministry</label>
                    <input type="text" placeholder="e.g. Member, Coordinator, Secretary" value={ministryMemberForm.role || ''} onChange={(e) => setMinistryMemberForm({...ministryMemberForm, role: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold text-slate-800 shadow-inner" />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button type="submit" disabled={isSubmitting} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-3">
                    {isSubmitting ? <Clock className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add to Ministry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Log Ministry Attendance Modal */}
      <AnimatePresence>
        {isMinistryAttendanceModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsMinistryAttendanceModalOpen(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-b-[12px] border-emerald-500">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg"><UserCheck className="w-6 h-6" /></div>
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800 leading-none">Log Attendance</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Record meeting presence</p>
                  </div>
                </div>
                <button onClick={() => setIsMinistryAttendanceModalOpen(false)} className="p-3 hover:bg-slate-200 rounded-full transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleAttendanceSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-10 space-y-8 overflow-y-auto scrollbar-hide flex-1">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Session Date *</label>
                      <input required type="date" value={attendanceForm.session_date} onChange={(e) => setAttendanceForm({...attendanceForm, session_date: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-800 shadow-inner" />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mark Attendees</label>
                      <span className="text-xs font-bold text-slate-500">{attendanceForm.attendees.length} selected</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 max-h-60 overflow-y-auto space-y-2">
                       {ministryMembers.filter(m => m.ministry_id === selectedMinistryId).map(member => {
                         const leader = leaders.find(l => l.id === member.member_id);
                         if(!leader) return null;
                         const isSelected = attendanceForm.attendees.includes(leader.id);
                         return (
                           <div key={leader.id} onClick={() => {
                              if(isSelected) setAttendanceForm({...attendanceForm, attendees: attendanceForm.attendees.filter(id => id !== leader.id)});
                              else setAttendanceForm({...attendanceForm, attendees: [...attendanceForm.attendees, leader.id]});
                           }} className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-colors ${isSelected ? 'bg-emerald-100 border border-emerald-200' : 'bg-white border border-slate-100 hover:border-emerald-200'}`}>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                                 {isSelected && <Check className="w-4 h-4" />}
                              </div>
                              <span className={`font-bold ${isSelected ? 'text-emerald-900' : 'text-slate-700'}`}>{leader.first_name} {leader.last_name}</span>
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-auto">{leader.position}</span>
                           </div>
                         );
                       })}
                       {ministryMembers.filter(m => m.ministry_id === selectedMinistryId).length === 0 && (
                          <div className="text-center py-8 text-slate-400 font-bold text-sm">No members in this ministry yet.</div>
                       )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Session Notes / Minutes</label>
                    <textarea value={attendanceForm.notes} onChange={(e) => setAttendanceForm({...attendanceForm, notes: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-800 shadow-inner min-h-[100px]" />
                  </div>
                </div>
                <div className="p-8 border-t border-slate-50 flex justify-end bg-slate-50/50">
                  <button type="submit" disabled={isSubmitting} className="px-10 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-3 hover:bg-emerald-600">
                    {isSubmitting ? <Clock className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Save Attendance
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Assign Modal */}
      <AnimatePresence>
        {isMinistryBulkAssignModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsMinistryBulkAssignModalOpen(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border-b-[12px] border-indigo-600">
              <div className="p-10 text-center">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                  <Users className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800 mb-2">Assign to Ministry</h2>
                <p className="text-slate-500 mb-8 font-medium">Assigning {selectedLeaderIds.length} leader{selectedLeaderIds.length !== 1 ? 's' : ''}</p>
                
                <div className="space-y-2 text-left mb-8">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Select Ministry *</label>
                  <select value={bulkAssignMinistryId} onChange={(e) => setBulkAssignMinistryId(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold text-slate-800 shadow-inner">
                    <option value="">Choose...</option>
                    {ministryItems.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div className="flex justify-center gap-4">
                   <button onClick={() => setIsMinistryBulkAssignModalOpen(false)} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                   <button onClick={handleBulkAssign} disabled={isSubmitting || !bulkAssignMinistryId} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl disabled:opacity-50 hover:bg-indigo-700 transition-all">
                     Confirm
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeadershipDevelopmentView;
