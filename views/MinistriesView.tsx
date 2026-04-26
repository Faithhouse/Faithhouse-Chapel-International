
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Ministry, NavItem, UserProfile } from '../types';
import { toast } from 'sonner';
import { 
  Users, 
  Target, 
  Activity, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownRight,
  Briefcase,
  Layers
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  ResponsiveContainer 
} from 'recharts';

interface MinistriesViewProps {
  setActiveItem: (item: NavItem | string) => void;
  currentUser: UserProfile | null;
}

const MinistriesView: React.FC<MinistriesViewProps> = ({ setActiveItem, currentUser }) => {
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    leader_id: '',
    leader_name: '',
    deputy_id: '',
    deputy_name: '',
    email: '',
    description: '',
    meeting_schedule: '',
    status: 'Active' as 'Active' | 'Inactive',
  });

  useEffect(() => {
    fetchMinistries();
  }, [searchTerm]);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const isMinistryRole = (role: string) => {
    const standardRoles = ['system_admin', 'general_overseer', 'admin', 'pastor', 'finance', 'media', 'worker'];
    return !standardRoles.includes(role);
  };

  const isReadOnly = currentUser && isMinistryRole(currentUser.role);

  const fetchMinistries = async () => {
    setIsLoading(true);
    try {
      // First check if ministries table exists by a simple probe
      const { error: probeError } = await supabase.from('ministries').select('id').limit(1);
      
      if (probeError && (probeError.code === '42P01' || probeError.message?.includes("does not exist"))) {
         setTableError("Table Missing");
         return;
      }

      // Fetch leaders for the dropdowns
      try {
        const { data: leadersData } = await supabase.from('leadership').select('id, first_name, last_name, position');
        setLeaders(leadersData || []);
      } catch (lErr) {
        console.warn("Leadership table might be missing or inaccessible", lErr);
      }

      let query = supabase
        .from('ministries')
        .select(`
          *,
          lead:leader_id(first_name, last_name, position),
          deputy:deputy_id(first_name, last_name, position)
        `)
        .order('name', { ascending: true });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,leader_name.ilike.%${searchTerm}%`);
      }

      if (currentUser && isMinistryRole(currentUser.role)) {
        query = query.ilike('name', currentUser.role);
      }

      const { data, error } = await query;

      if (error) {
        // Fallback: If relationship fetch fails (common on schema changes), try raw fetch
        if (error.message.includes('Could not find') || error.code === 'PGRST205') {
          console.warn("Complex query failed, falling back to simple fetch:", error.message);
          let rawQuery = supabase.from('ministries').select('*').order('name');
          if (searchTerm) rawQuery = rawQuery.or(`name.ilike.%${searchTerm}%,leader_name.ilike.%${searchTerm}%`);
          if (currentUser && isMinistryRole(currentUser.role)) rawQuery = rawQuery.ilike('name', currentUser.role);
          
          const { data: rawData, error: rawError } = await rawQuery;
          if (!rawError) {
            setTableError(null);
            setMinistries(rawData || []);
            return;
          }
        }

        if (error.code === '42P01' || error.code === 'PGRST205' || error.message.includes("does not exist") || error.message.includes('schema cache') || error.message.includes('Could not find')) {
          setTableError("Table Missing");
          toast.error("Ministries database structural issue detected.");
        } else {
          console.error('Fetch error:', error);
          toast.error("Fetch error: " + error.message);
        }
      } else {
        setTableError(null);
        setMinistries(data || []);
      }
    } catch (err: any) {
      console.error('System error:', err);
      if (err.message?.includes('not found')) {
        setTableError("Table Missing");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const ministryStats = useMemo(() => {
    const total = ministries.length;
    const active = ministries.filter(m => m.status === 'Active').length;
    
    return {
      total: { value: total, trend: 5, status: 'growth' as const },
      active: { value: active, trend: 3, status: 'growth' as const },
      coverage: { value: "100%", trend: 0, status: 'neutral' as const },
      health: { value: "Optimal", trend: 12, status: 'growth' as const }
    };
  }, [ministries]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = { 
        name: formData.name.trim(),
        leader_id: formData.leader_id || null,
        leader_name: formData.leader_name.trim() || null,
        deputy_id: formData.deputy_id || null,
        deputy_name: formData.deputy_name || null,
        email: formData.email.trim() || null,
        description: formData.description.trim() || null,
        meeting_schedule: formData.meeting_schedule.trim() || null,
        status: formData.status
      };
      
      let error;
      if (editingId) {
        const result = await supabase.from('ministries').update(payload).eq('id', editingId);
        error = result.error;
      } else {
        const result = await supabase.from('ministries').insert([payload]);
        error = result.error;
      }

      if (error) throw error;
      toast.success(editingId ? "Ministry updated successfully" : "Ministry created successfully");

      // Sync to profiles if email exists
      if (payload.email) {
        await supabase.from('profiles').upsert({
          email: payload.email,
          full_name: payload.name,
          role: payload.name, // Set role to ministry name
          temp_password: 'FaithHouse2026!'
        }, { onConflict: 'email' });
      }

      setIsModalOpen(false);
      setEditingId(null);
      resetForm();
      await fetchMinistries();
    } catch (error: any) {
      if (error.message?.includes('schema cache') || error.message?.includes('not found') || error.message?.includes('Could not find')) {
        setTableError("Table Missing");
      } else {
        console.error('Submission error:', error);
        toast.error(error.message || "Operation failed");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      leader_id: '',
      leader_name: '',
      deputy_id: '',
      deputy_name: '',
      email: '',
      description: '',
      meeting_schedule: '',
      status: 'Active',
    });
  };

  const handleEdit = (ministry: Ministry) => {
    setEditingId(ministry.id);
    setFormData({
      name: ministry.name,
      leader_id: ministry.leader_id || '',
      leader_name: ministry.leader_name || '',
      deputy_id: ministry.deputy_id || '',
      deputy_name: ministry.deputy_name || '',
      email: ministry.email || '',
      description: ministry.description || '',
      meeting_schedule: ministry.meeting_schedule || '',
      status: ministry.status,
    });
    setIsModalOpen(true);
  };

  const deleteMinistry = async (id: string) => {
    const isConfirmed = window.confirm('DANGER: Permanent Delete?\n\nThis will permanently remove this ministry and its access portal. This cannot be undone.\n\nAre you sure?');
    if (!isConfirmed) return;
    
    setIsSubmitting(true); // Reuse submitting state for loading
    try {
      console.log('Attempting to delete ministry:', id);
      const { error } = await supabase.from('ministries').delete().eq('id', id);
      if (error) {
        console.error('Delete error details:', error);
        throw error;
      }
      toast.success("Ministry purged successfully");
      await fetchMinistries();
    } catch (error: any) {
      console.error('Full delete error:', error);
      toast.error(error.message || "Failed to purge ministry. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (tableError) {
    const repairSQL = `-- FAITHHOUSE COMPREHENSIVE SYSTEM REPAIR v6.0
-- Ensures all core infrastructure and data tables are fully synchronized.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. INFRASTRUCTURE: BRANCHES
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT,
  gps_address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  maps_url TEXT,
  pastor_in_charge TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. CORE: MEMBERS
CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  gender TEXT,
  dob DATE,
  wedding_anniversary DATE,
  date_joined DATE DEFAULT CURRENT_DATE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'Active',
  follow_up_status TEXT DEFAULT 'Pending',
  last_seen TIMESTAMP WITH TIME ZONE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  ministry TEXT,
  role TEXT,
  gps_address TEXT,
  maps_url TEXT,
  location_area TEXT,
  marital_status TEXT,
  invited_by TEXT,
  prayer_request TEXT,
  occupation TEXT,
  place_of_work TEXT,
  educational_level TEXT,
  water_baptised BOOLEAN DEFAULT false,
  holy_ghost_baptised BOOLEAN DEFAULT false,
  hometown TEXT,
  spouse_name TEXT,
  spouse_phone TEXT,
  children JSONB DEFAULT '[]',
  emergency_contact_name TEXT,
  emergency_contact_relationship TEXT,
  emergency_contact_phone TEXT,
  notify_birthday BOOLEAN DEFAULT true,
  notify_events BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. PIPELINE: ENROLLMENT QUEUE
CREATE TABLE IF NOT EXISTS public.member_enrollment_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  gender TEXT,
  dob DATE,
  wedding_anniversary DATE,
  date_joined DATE DEFAULT CURRENT_DATE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'Pending',
  follow_up_status TEXT DEFAULT 'Pending',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  ministry TEXT,
  gps_address TEXT,
  maps_url TEXT,
  location_area TEXT,
  marital_status TEXT,
  occupation TEXT,
  place_of_work TEXT,
  educational_level TEXT,
  water_baptised BOOLEAN DEFAULT false,
  holy_ghost_baptised BOOLEAN DEFAULT false,
  hometown TEXT,
  spouse_name TEXT,
  spouse_phone TEXT,
  children JSONB DEFAULT '[]',
  emergency_contact_name TEXT,
  emergency_contact_relationship TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. LEADERSHIP & MINISTRIES
CREATE TABLE IF NOT EXISTS public.leadership (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  position TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Worker',
  ministry TEXT,
  email TEXT,
  phone TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.ministries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  leader_id UUID REFERENCES public.leadership(id) ON DELETE SET NULL,
  leader_name TEXT,
  deputy_id UUID REFERENCES public.leadership(id) ON DELETE SET NULL,
  deputy_name TEXT,
  email TEXT,
  description TEXT,
  meeting_schedule TEXT,
  status TEXT DEFAULT 'Active',
  color TEXT DEFAULT '#4f46e5',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. FINANCE: TITHE ENTRIES
CREATE TABLE IF NOT EXISTS public.tithe_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL,
  service_type TEXT,
  recorded_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. COLUMN REPAIRS (For existing tables)
DO $$ 
BEGIN 
  -- Members Table Repairs
  BEGIN ALTER TABLE public.members ADD COLUMN hometown TEXT; EXCEPTION WHEN duplicate_column THEN END;
  BEGIN ALTER TABLE public.members ADD COLUMN marital_status TEXT; EXCEPTION WHEN duplicate_column THEN END;
  BEGIN ALTER TABLE public.members ADD COLUMN phone TEXT; EXCEPTION WHEN duplicate_column THEN END;
  BEGIN ALTER TABLE public.members ADD COLUMN gps_address TEXT; EXCEPTION WHEN duplicate_column THEN END;
  BEGIN ALTER TABLE public.members ADD COLUMN maps_url TEXT; EXCEPTION WHEN duplicate_column THEN END;
  BEGIN ALTER TABLE public.members ADD COLUMN children JSONB DEFAULT '[]'; EXCEPTION WHEN duplicate_column THEN END;
  
  -- Queue Table Repairs
  BEGIN ALTER TABLE public.member_enrollment_queue ADD COLUMN hometown TEXT; EXCEPTION WHEN duplicate_column THEN END;
  BEGIN ALTER TABLE public.member_enrollment_queue ADD COLUMN marital_status TEXT; EXCEPTION WHEN duplicate_column THEN END;
  BEGIN ALTER TABLE public.member_enrollment_queue ADD COLUMN phone TEXT; EXCEPTION WHEN duplicate_column THEN END;
  BEGIN ALTER TABLE public.member_enrollment_queue ADD COLUMN gps_address TEXT; EXCEPTION WHEN duplicate_column THEN END;
  BEGIN ALTER TABLE public.member_enrollment_queue ADD COLUMN maps_url TEXT; EXCEPTION WHEN duplicate_column THEN END;
  BEGIN ALTER TABLE public.member_enrollment_queue ADD COLUMN children JSONB DEFAULT '[]'; EXCEPTION WHEN duplicate_column THEN END;
END $$;

-- 8. SECURITY (RLS)
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_enrollment_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leadership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tithe_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access" ON public.branches;
CREATE POLICY "Allow all access" ON public.branches FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access" ON public.members;
CREATE POLICY "Allow all access" ON public.members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access" ON public.member_enrollment_queue;
CREATE POLICY "Allow all access" ON public.member_enrollment_queue FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access" ON public.leadership;
CREATE POLICY "Allow all access" ON public.leadership FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access" ON public.ministries;
CREATE POLICY "Allow all access" ON public.ministries FOR ALL USING (true) WITH CHECK (true);

-- 9. SCHEMA REFRESH
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload schema';`;

    return (
      <div className="max-w-4xl mx-auto py-12 px-4 animate-in zoom-in-95 duration-500">
        <div className="royal-card p-12 md:p-16 rounded-[4rem] bg-white text-center border-2 border-rose-100 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 inset-x-0 h-2 bg-rose-500"></div>
          <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-inner">
             <ShieldCheck className="w-12 h-12 text-rose-500" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase mb-4 tracking-tighter">Database Structural Alert</h2>
          <p className="text-slate-500 mb-6 font-medium max-w-lg mx-auto leading-relaxed">
            The system detected missing database components required for ministry management. Run the technical script below in your Supabase SQL Editor.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 text-left">
            <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1 flex items-center gap-2">
              <Activity className="w-3 h-3" /> System Diagnostics
            </p>
            <p className="text-xs text-blue-600 font-medium leading-relaxed">
              If you have already run this script, click <b>Verify Connectivity</b> again. Note that Supabase may take a few seconds to refresh its API cache.
            </p>
          </div>

          <pre className="bg-slate-900 text-fh-gold-pale p-8 rounded-[2rem] text-[10px] font-mono text-left h-48 overflow-y-auto mb-10 shadow-inner leading-relaxed border border-fh-gold/10 scrollbar-hide">
            {repairSQL}
          </pre>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => { navigator.clipboard.writeText(repairSQL); toast.success('Script copied to clipboard.'); }} className="px-10 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Copy Script</button>
            <button 
              onClick={() => {
                setTableError(null);
                setTimeout(() => fetchMinistries(), 100);
              }} 
              disabled={isLoading}
              className="px-16 py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all border-b-4 border-black disabled:opacity-50"
            >
              {isLoading ? "Verifying..." : "Verify Connectivity"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
        <div className="space-y-1 text-center md:text-left">
          <h2 className="text-xl md:text-3xl font-black text-fh-green tracking-tighter uppercase leading-none">Ministries</h2>
          <p className="text-slate-400 font-bold text-[7px] md:text-[10px] uppercase tracking-[0.4em]">Operational Oversight Hub</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 md:gap-4">
          <div className="relative flex-1 min-w-full md:min-w-[300px]">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input 
              type="text" 
              placeholder="Search ministries..." 
              className="w-full pl-10 pr-4 py-3 md:py-4 bg-white border border-slate-200 rounded-xl md:rounded-2xl outline-none focus:border-fh-gold transition-all text-[10px] md:text-sm font-bold text-slate-800 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {!isReadOnly && (
            <button 
              onClick={() => { resetForm(); setEditingId(null); setIsModalOpen(true); }}
              className="flex items-center justify-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 bg-fh-green text-fh-gold rounded-xl md:rounded-2xl font-black text-[8px] md:text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all border-b-2 md:border-b-4 border-black/30"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              Provision Ministry
            </button>
          )}
        </div>
      </div>

      {/* 2. Compact KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-1">
        <KPICard 
          title="Active Depts" 
          value={ministryStats.total.value} 
          trend={ministryStats.total.trend} 
          icon={<Layers />} 
          status={ministryStats.total.status}
          sparkline={[5, 6, 7, 6, 8, 7]}
          isLoading={isLoading}
        />
        <KPICard 
          title="Operational" 
          value={ministryStats.active.value} 
          trend={ministryStats.active.trend} 
          icon={<ShieldCheck />} 
          status={ministryStats.active.status}
          sparkline={[4, 5, 5, 5, 6, 6]}
          isLoading={isLoading}
        />
        <KPICard 
          title="System Health" 
          value={ministryStats.health.value} 
          trend={ministryStats.health.trend} 
          icon={<Activity />} 
          status={ministryStats.health.status}
          sparkline={[80, 85, 82, 88, 90, 95]}
          isLoading={isLoading}
        />
        <KPICard 
          title="Dept Coverage" 
          value={ministryStats.coverage.value} 
          trend={ministryStats.coverage.trend} 
          icon={<Target />} 
          status={ministryStats.coverage.status}
          sparkline={[100, 100, 100, 100, 100, 100]}
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {isLoading && ministries.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-300 font-black uppercase tracking-[0.3em] animate-pulse">Scanning Database...</div>
        ) : ministries.length > 0 ? ministries.map((min) => (
          <div key={min.id} className="royal-card bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden flex flex-col hover:-translate-y-1 duration-300 border-b-4 hover:border-fh-gold">
            <div className="p-4 flex-1">
              <div className="flex justify-between items-start mb-3">
                <div className="w-8 h-8 bg-slate-50 text-fh-green rounded-lg flex items-center justify-center font-black text-xs border border-slate-100 shadow-inner group-hover:scale-105 transition-transform">
                  {min.name.charAt(0).toUpperCase()}
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider ${
                  min.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400'
                }`}>
                  {min.status}
                </span>
              </div>
              
              <h3 className="text-xs font-black text-slate-900 mb-1 group-hover:text-fh-green transition-colors uppercase truncate">{min.name}</h3>
              
              {min.email && (
                <p className="text-[8px] font-black text-fh-green mb-1 truncate opacity-80">
                  {min.email}
                </p>
              )}

              <p className="text-[9px] text-slate-400 line-clamp-2 h-6 font-medium mb-3 leading-relaxed">
                {min.description || 'Ministry operational scope.'}
              </p>
              
              <div className="space-y-2 pt-2 border-t border-slate-50">
                <div className="flex items-center gap-2">
                   <svg className="w-2.5 h-2.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                   <p className="text-[9px] font-bold text-slate-600 truncate">Head: {min.lead ? `${min.lead.first_name} ${min.lead.last_name}` : (min.leader_name || 'Unassigned')}</p>
                </div>
                <div className="flex items-center gap-2">
                   <svg className="w-2.5 h-2.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                   <p className="text-[9px] font-bold text-slate-500 truncate">Dep: {min.deputy ? `${min.deputy.first_name} ${min.deputy.last_name}` : (min.deputy_name || '---')}</p>
                </div>
              </div>
            </div>

            <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between transition-all duration-300">
               <div className="flex gap-1.5">
                 {!isReadOnly && (
                   <>
                     <button onClick={() => handleEdit(min)} className="p-2 lg:p-1 bg-white border border-slate-200 rounded-md text-slate-400 hover:text-fh-green transition-all shadow-sm active:scale-90">
                       <svg className="w-4 h-4 lg:w-3 lg:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                     </button>
                     <button onClick={() => deleteMinistry(min.id)} className="p-2 lg:p-1 bg-white border border-slate-200 rounded-md text-slate-400 hover:text-rose-500 transition-all shadow-sm active:scale-90">
                       <svg className="w-4 h-4 lg:w-3 lg:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                     </button>
                   </>
                 )}
               </div>
               <button 
                  onClick={() => setActiveItem(min.name)}
                  className="text-[9px] lg:text-[7px] font-black text-fh-green uppercase tracking-widest hover:underline underline-offset-2 bg-white lg:bg-transparent px-3 py-1.5 lg:p-0 rounded-lg border border-slate-200 lg:border-none shadow-sm lg:shadow-none"
               >
                Access Details
               </button>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-slate-100 shadow-inner italic text-slate-300 font-black uppercase tracking-widest text-xs">No ministries detected.</div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in" onClick={() => !isSubmitting && setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-b-[12px] border-fh-gold">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">{editingId ? 'Modify Ministry' : 'Setup Ministry'}</h3>
              <button disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-200 rounded-full transition-colors"><svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ministry Name *</label><input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-bold text-slate-800 shadow-inner" placeholder="e.g. Media Ministry" required /></div>
                <div className="md:col-span-2 grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ministry Head</label>
                    <select name="leader_id" value={formData.leader_id} onChange={handleInputChange} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-bold text-slate-800 shadow-inner">
                      <option value="">Select a Head...</option>
                      {leaders.map(l => <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Deputy Head</label>
                    <select name="deputy_id" value={formData.deputy_id} onChange={handleInputChange} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-bold text-slate-800 shadow-inner">
                      <option value="">Select a Deputy...</option>
                      {leaders.map(l => <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ministry Email</label><input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-bold text-slate-800 shadow-inner" placeholder="e.g. music@faithhouse.church" /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Meeting Schedule</label><input type="text" name="meeting_schedule" value={formData.meeting_schedule} onChange={handleInputChange} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-bold text-slate-800 shadow-inner" placeholder="e.g. Sundays 4PM" /></div>
                <div className="md:col-span-2 space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Description</label><textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-bold text-slate-800 shadow-inner resize-none" placeholder="Brief mission statement..." /></div>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-fh-green text-fh-gold rounded-[2rem] font-black uppercase text-[10px] tracking-[0.4em] shadow-xl active:scale-95 transition-all border-b-4 border-black/30">
                {isSubmitting ? 'Syncing...' : (editingId ? 'Update Registry' : 'Add Ministry')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODALS: MINISTRIES REPORT */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md animate-in fade-in" onClick={() => setIsReportModalOpen(false)} />
          <div className="relative bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-10 border-b border-slate-50 flex items-center justify-between no-print">
              <h3 className="text-2xl font-black text-fh-green uppercase tracking-tighter">Organizational Structure Report</h3>
              <div className="flex gap-4">
                <button onClick={() => window.print()} className="px-6 py-3 bg-slate-900 text-fh-gold rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">Print Report</button>
                <button onClick={() => setIsReportModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-full transition-all text-slate-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            </div>
            
            <div className="p-12 overflow-y-auto print:p-0">
              <div className="text-center mb-12">
                <h1 className="text-4xl font-black text-fh-green uppercase tracking-tighter mb-2">Faithhouse Chapel International</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">General Oversight • Ministry Distribution Summary</p>
                <p className="text-xs font-bold text-slate-500 mt-4">Report Generated: {new Date().toLocaleString()}</p>
              </div>

              <div className="grid grid-cols-3 gap-8 mb-12">
                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Ministries</p>
                  <h2 className="text-3xl font-black text-fh-green">{ministries.length}</h2>
                </div>
                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Active Ministries</p>
                  <h2 className="text-3xl font-black text-emerald-600">{ministries.filter(m => m.status === 'Active').length}</h2>
                </div>
                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Inactive Ministries</p>
                  <h2 className="text-3xl font-black text-rose-500">{ministries.filter(m => m.status === 'Inactive').length}</h2>
                </div>
              </div>

              <div className="space-y-8">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-2">Ministry Distribution Ledger</h4>
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                      <th className="py-4">Ministry Name</th>
                      <th className="py-4">Ministry Head</th>
                      <th className="py-4">Deputy Head</th>
                      <th className="py-4">Schedule</th>
                      <th className="py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {ministries.map(min => (
                      <tr key={min.id} className="text-[10px] font-bold text-slate-700">
                        <td className="py-4 uppercase">{min.name}</td>
                        <td className="py-4">{min.lead ? `${min.lead.first_name} ${min.lead.last_name}` : (min.leader_name || '---')}</td>
                        <td className="py-4">{min.deputy ? `${min.deputy.first_name} ${min.deputy.last_name}` : (min.deputy_name || '---')}</td>
                        <td className="py-4">{min.meeting_schedule || '---'}</td>
                        <td className="py-4 text-right">
                          <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${
                            min.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'
                          }`}>
                            {min.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-20 pt-10 border-t-2 border-dashed border-slate-200 grid grid-cols-2 gap-20 text-center">
                <div className="space-y-12">
                  <div className="h-px bg-slate-300 w-48 mx-auto"></div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">General Overseer Signature</p>
                </div>
                <div className="space-y-12">
                  <div className="h-px bg-slate-300 w-48 mx-auto"></div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Council of Ministry Heads</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPACT KPI COMPONENT ---
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
    <div className="bg-white p-3 rounded-2xl border border-slate-200/50 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between min-h-[90px] md:min-h-[110px]">
      <div className="flex justify-between items-start">
        <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center ${statusClasses[status]}`}>
          {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-3.5 h-3.5 md:w-4 md:h-4' })}
        </div>
        <div className={`flex items-center gap-0.5 text-[8px] md:text-[9px] font-black uppercase tracking-tighter ${trendColor}`}>
          {isPositive ? <ArrowUpRight className="w-2.5 h-2.5 md:w-3 md:h-3" /> : <ArrowDownRight className="w-2.5 h-2.5 md:w-3 md:h-3" />}
          {Math.abs(trend)}%
        </div>
      </div>
      <div className="mt-2">
        <h2 className="text-base md:text-xl font-black text-slate-900 tracking-tighter leading-none">{isLoading ? '...' : value}</h2>
        <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1 leading-tight">{title}</p>
      </div>
      <div className="mt-2 h-4 w-full opacity-20 group-hover:opacity-50 transition-opacity">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparkline.map((v: any, i: any) => ({ v, i }))}>
            <Line type="monotone" dataKey="v" stroke="currentColor" strokeWidth={1.5} dot={false} className={trendColor} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MinistriesView;
