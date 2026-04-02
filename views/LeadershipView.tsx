
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  Briefcase, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Award,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

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
}

const categories = ['Pastor', 'Minister', 'Ministry Head/Deputy', 'Worker'] as const;

const LeadershipView: React.FC<{ userProfile: UserProfile | null }> = ({ userProfile }) => {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [editingLeader, setEditingLeader] = useState<Partial<Leader> | null>(null);
  const [tableMissing, setTableMissing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLeaders();
  }, []);

  const fetchLeaders = async () => {
    setIsLoading(true);
    setError(null);
    setTableMissing(false);
    try {
      const { data, error } = await supabase.from('leadership').select('*').order('created_at', { ascending: false });
      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
          setTableMissing(true);
          throw error;
        }
        throw error;
      }
      setLeaders(data || []);
    } catch (err: any) {
      console.error("Leadership fetch error:", err);
      if (err.code !== '42P01' && err.code !== 'PGRST205') {
        const errorMessage = err.message === 'Failed to fetch' || err.name === 'TypeError' 
          ? "Network Error: Unable to connect to the database. Please check your internet connection."
          : err.message || "An unexpected error occurred while fetching leadership data.";
        setError(errorMessage);
      }
      
      // Fallback to sample data only if table exists but fetch failed for other reasons
      if (!tableMissing) {
        setLeaders([
          { id: '1', first_name: 'John', last_name: 'Doe', position: 'Head Pastor', category: 'Pastor', department: 'General', email: 'john@faithhouse.church', phone: '+233 24 000 0001' },
          { id: '2', first_name: 'Jane', last_name: 'Smith', position: 'Associate Pastor', category: 'Pastor', department: 'Worship', email: 'jane@faithhouse.church', phone: '+233 24 000 0002' },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLeaders = leaders.filter(l => {
    const matchesCategory = activeCategory === 'All' || l.category === activeCategory;
    const matchesSearch = (l.first_name + ' ' + l.last_name).toLowerCase().includes(searchTerm.toLowerCase()) || 
                         l.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         l.department.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
        const { error } = await supabase
          .from('leadership')
          .update(leaderData)
          .eq('id', editingLeader.id);
        if (error) throw error;
        toast.success("Leader updated successfully");
      } else {
        const { error } = await supabase.from('leadership').insert([leaderData]);
        if (error) throw error;
        toast.success("New leader appointed successfully");
      }
      fetchLeaders();
      setIsModalOpen(false);
      setEditingLeader(null);
    } catch (err: any) {
      console.error("Supabase Save Error:", err);
      toast.error(`DATABASE ERROR: ${err.message || "Unknown database error"}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this leader from the registry?")) return;
    
    try {
      const { error } = await supabase.from('leadership').delete().eq('id', id);
      if (error) throw error;
      setLeaders(leaders.filter(l => l.id !== id));
      toast.success("Leader removed from registry");
    } catch (err) {
      toast.error("Failed to delete leader.");
    }
  };

  if (tableMissing) {
    const repairSQL = `-- LEADERSHIP REGISTRY SCHEMA
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

ALTER TABLE public.leadership ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for staff" ON public.leadership;
CREATE POLICY "Allow all for staff" ON public.leadership FOR ALL USING (true) WITH CHECK (true);

-- REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';`;

    return (
      <div className="max-w-4xl mx-auto py-12 px-4 animate-in zoom-in-95 duration-500">
        <div className="royal-card p-12 md:p-16 rounded-[4rem] bg-white text-center border-2 border-rose-100 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 inset-x-0 h-2 bg-rose-500"></div>
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
            <AlertCircle className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase mb-4 tracking-tighter">Leadership Registry Offline</h2>
          <p className="text-slate-500 mb-8 text-[11px] font-bold uppercase tracking-widest max-w-lg mx-auto leading-relaxed">
            The leadership database table is missing. Please execute the initialization script below in your Supabase SQL Editor.
          </p>
          <pre className="bg-slate-900 text-fh-gold-pale p-8 rounded-[2rem] text-[10px] text-left h-48 overflow-y-auto mb-10 shadow-inner font-mono leading-relaxed border border-fh-gold/10">
            {repairSQL}
          </pre>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => { navigator.clipboard.writeText(repairSQL); toast.success('SQL Copied.'); }} className="px-10 py-5 bg-slate-100 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Copy Script</button>
            <button 
              onClick={() => fetchLeaders()} 
              disabled={isLoading}
              className="px-16 py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-xs tracking-[0.3em] disabled:opacity-50 shadow-xl border-b-4 border-black/20 active:scale-95 transition-all"
            >
              {isLoading ? "Verifying..." : "Verify Restoration"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-slate-50/50 min-h-screen pb-24 relative">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-fh-green tracking-tighter uppercase leading-none">Church Leadership</h2>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em]">Governance & Spiritual Oversight</p>
        </div>

        <div className="flex items-center gap-3">
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
          <button 
            onClick={fetchLeaders}
            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-fh-green transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => { setEditingLeader({}); setIsModalOpen(true); }}
            className="px-8 py-3.5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl border-b-4 border-black/20 active:scale-95 transition-all"
          >
            Appoint Leader
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-8"
      >
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

        {error && (
          <div className="p-6 bg-rose-50 border-2 border-rose-100 rounded-[2rem] flex items-center gap-4 animate-in slide-in-from-top-4">
            <AlertCircle className="w-6 h-6 text-rose-500" />
            <div>
              <h3 className="text-sm font-black text-rose-900 uppercase tracking-tight">System Warning</h3>
              <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mt-0.5">{error}</p>
            </div>
            <button 
              onClick={() => fetchLeaders()}
              className="ml-auto px-6 py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-md"
            >
              Retry Sync
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-72 bg-white rounded-[2.5rem] animate-pulse border border-slate-100 shadow-sm"></div>
            ))}
          </div>
        ) : filteredLeaders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredLeaders.map((leader, idx) => (
              <motion.div 
                key={leader.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[5rem] -mr-16 -mt-16 transition-transform group-hover:scale-110 group-hover:bg-fh-green/5"></div>
                
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-[2rem] bg-slate-950 text-fh-gold flex items-center justify-center font-black text-2xl mb-6 shadow-2xl group-hover:rotate-3 transition-transform border-b-4 border-fh-gold/20">
                    {leader.first_name[0]}{leader.last_name[0]}
                  </div>
                  
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight truncate w-full mb-1">
                    {leader.first_name} {leader.last_name}
                  </h3>
                  
                  <div className="flex flex-col items-center">
                    <p className="text-[10px] font-black text-fh-green uppercase tracking-widest mb-3">
                      {leader.position}
                    </p>
                    <span className="px-3 py-1 bg-slate-100 rounded-full text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] border border-slate-200/50">
                      {leader.category}
                    </span>
                  </div>
                  
                  <div className="mt-8 pt-8 border-t border-slate-50 w-full space-y-4">
                    <div className="flex items-center gap-3 text-slate-400 group-hover:text-slate-600 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold truncate max-w-[150px]">{leader.email || 'No Email'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 group-hover:text-slate-600 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold">{leader.phone || 'No Phone'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 group-hover:text-slate-600 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                        <Briefcase className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest">{leader.department || 'General'}</span>
                    </div>
                  </div>

                  <div className="mt-8 flex gap-2 w-full">
                    <button 
                      onClick={() => { setEditingLeader(leader); setIsModalOpen(true); }}
                      className="flex-1 py-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-fh-green/10 hover:text-fh-green transition-all flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-widest"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(leader.id)}
                      className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-32 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-200 p-12">
            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8">
              <UserCheck className="w-12 h-12 text-slate-200" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase mb-3 tracking-tighter">No Leaders Registered</h3>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mb-10 max-w-sm mx-auto leading-relaxed">
              The leadership registry is currently empty for this category.
            </p>
            <button 
              onClick={() => { setEditingLeader({}); setIsModalOpen(true); }}
              className="px-12 py-5 bg-fh-green text-fh-gold rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl border-b-4 border-black/20 active:scale-95 transition-all"
            >
              Appoint First Leader
            </button>
          </div>
        )}
      </motion.div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" 
            onClick={() => { setIsModalOpen(false); setEditingLeader(null); }} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden border-b-[16px] border-fh-gold"
          >
            <div className="p-12 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-fh-green text-fh-gold rounded-[2rem] flex items-center justify-center shadow-xl border-b-4 border-black/20">
                  <Award className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-fh-green uppercase tracking-tighter leading-none">
                    {editingLeader?.id ? 'Modify Record' : 'Appointment'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-2">Leadership Registry Entry</p>
                </div>
              </div>
              <button onClick={() => { setIsModalOpen(false); setEditingLeader(null); }} className="p-4 hover:bg-white rounded-full transition-all text-slate-400 active:scale-90">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-12 space-y-8">
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
                  <input name="position" defaultValue={editingLeader?.position} required className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-7 py-4.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-fh-green/5 outline-none transition-all" placeholder="e.g. Head Pastor, Elder" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Email Address</label>
                  <input name="email" defaultValue={editingLeader?.email} type="email" className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-7 py-4.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-fh-green/5 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Phone Number</label>
                  <input name="phone" defaultValue={editingLeader?.phone} className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-7 py-4.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-fh-green/5 outline-none transition-all" />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Department</label>
                <input name="department" defaultValue={editingLeader?.department} className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-7 py-4.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-fh-green/5 outline-none transition-all" placeholder="e.g. Worship, Finance, Media" />
              </div>
              
              <div className="pt-8">
                <button type="submit" className="w-full bg-fh-green text-fh-gold py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl border-b-4 border-black/30 hover:bg-slate-950 transition-all active:scale-[0.98]">
                  {editingLeader?.id ? 'Update Registry Record' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default LeadershipView;
