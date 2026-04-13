
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { 
  MinisterialAppraisal, 
  LeadershipPipeline, 
  Minister, 
  Member, 
  UserProfile 
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
  ArrowLeft, Calendar, Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Leader {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  category: 'Pastor' | 'Minister' | 'Ministry Head/Deputy' | 'Worker';
  department: string;
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
  const [activeTab, setActiveTab] = useState<'Registry' | 'Appraisals' | 'Pipeline'>('Registry');
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [appraisals, setAppraisals] = useState<MinisterialAppraisal[]>([]);
  const [pipeline, setPipeline] = useState<LeadershipPipeline[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);
  
  // Modals
  const [isLeaderModalOpen, setIsLeaderModalOpen] = useState(false);
  const [isAppraisalModalOpen, setIsAppraisalModalOpen] = useState(false);
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);
  
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

  const repairSQL = `
    -- Ensure leadership table exists
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

    ALTER TABLE public.leadership ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.ministerial_appraisals ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.leadership_pipeline ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow all for authenticated users on leadership" ON public.leadership;
    CREATE POLICY "Allow all for authenticated users on leadership" ON public.leadership FOR ALL TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all for authenticated users on ministerial_appraisals" ON public.ministerial_appraisals;
    CREATE POLICY "Allow all for authenticated users on ministerial_appraisals" ON public.ministerial_appraisals FOR ALL TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all for authenticated users on leadership_pipeline" ON public.leadership_pipeline;
    CREATE POLICY "Allow all for authenticated users on leadership_pipeline" ON public.leadership_pipeline FOR ALL TO authenticated USING (true) WITH CHECK (true);

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
      department: formData.get('department') as string,
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

  const filteredLeaders = leaders.filter(l => {
    const matchesCategory = activeCategory === 'All' || l.category === activeCategory;
    const matchesSearch = (l.first_name + ' ' + l.last_name).toLowerCase().includes(searchTerm.toLowerCase()) || 
                         l.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         l.department.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const selectedLeader = leaders.find(l => l.id === selectedLeaderId);
  const leaderAppraisals = appraisals.filter(a => a.leader_id === selectedLeaderId);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Leadership & Development</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] flex items-center gap-2">
            <GraduationCap className="w-3 h-3 text-fh-gold" />
            Governance, Oversight & Pipeline
          </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => { setEditingLeader({}); setIsLeaderModalOpen(true); }}
            className="px-6 py-4 bg-slate-900 text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center gap-3"
          >
            <Plus className="w-4 h-4" />
            Appoint Leader
          </button>
          <button 
            onClick={() => setIsPipelineModalOpen(true)}
            className="px-6 py-4 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-3"
          >
            <UserPlus className="w-4 h-4" />
            Add to Pipeline
          </button>
        </div>
      </div>

      {/* Tabs */}
      {!selectedLeaderId && (
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-[2rem] w-fit">
          {(['Registry', 'Appraisals', 'Pipeline'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-3 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest transition-all ${
                activeTab === tab 
                  ? 'bg-white text-fh-green shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab === 'Registry' ? 'Leader Registry' : tab === 'Appraisals' ? 'Global Appraisals' : 'Leadership Pipeline'}
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
                      {selectedLeader?.department}
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
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search leaders..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-fh-green/20 outline-none w-64 shadow-sm"
                />
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {isLoading ? (
                [1,2,3,4].map(i => <div key={i} className="h-72 bg-white rounded-[2.5rem] animate-pulse border border-slate-100 shadow-sm" />)
              ) : filteredLeaders.length > 0 ? filteredLeaders.map((leader, idx) => (
                <motion.div 
                  key={leader.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedLeaderId(leader.id)}
                  className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden cursor-pointer"
                >
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
                        <span className="text-[10px] font-bold uppercase tracking-widest">{leader.department || 'General'}</span>
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
        ) : (
          <motion.div 
            key="pipeline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {pipeline.length > 0 ? pipeline.map((item) => (
              <div key={item.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all border-b-4 border-fh-green">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-slate-50 text-fh-green rounded-2xl flex items-center justify-center font-black text-lg border border-slate-100 shadow-inner">
                    {item.members?.first_name.charAt(0)}
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Progress</p>
                    <p className="text-lg font-black text-fh-green">{item.progress_percentage}%</p>
                  </div>
                </div>

                <h3 className="text-xl font-black text-slate-900 mb-1 uppercase tracking-tight">
                  {item.members?.first_name} {item.members?.last_name}
                </h3>
                <div className="flex items-center gap-2 mb-6">
                  <BookOpen className="w-3 h-3 text-fh-gold" />
                  <p className="text-[10px] font-black text-fh-gold uppercase tracking-[0.2em]">{item.current_level}</p>
                </div>
                
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-6">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${item.progress_percentage}%` }}
                    className="h-full bg-fh-green"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mentor: {item.mentor?.full_name || 'Assigned'}</p>
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                    item.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                  }`}>
                    {item.status}
                  </span>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-slate-100 shadow-inner italic text-slate-300 font-black uppercase tracking-widest text-xs">No leadership candidates in pipeline.</div>
            )}
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Department</label>
                  <input name="department" defaultValue={editingLeader?.department} className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-7 py-4.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-fh-green/5 outline-none transition-all" />
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
                        <option value="Departmental Lead">Departmental Lead</option>
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
    </div>
  );
};

export default LeadershipDevelopmentView;
