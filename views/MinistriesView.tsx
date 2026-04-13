
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Ministry, NavItem } from '../types';
import { toast } from 'sonner';

interface MinistriesViewProps {
  setActiveItem: (item: NavItem | string) => void;
}

const MinistriesView: React.FC<MinistriesViewProps> = ({ setActiveItem }) => {
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [activeTab, setActiveTab] = useState<'Registry' | 'Email Setup'>('Registry');

  const [formData, setFormData] = useState({
    name: '',
    leader_name: '',
    email: '',
    description: '',
    meeting_schedule: '',
    status: 'Active' as 'Active' | 'Inactive',
  });

  useEffect(() => {
    fetchMinistries();
  }, [searchTerm]);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const fetchMinistries = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('ministries')
        .select('*')
        .order('name', { ascending: true });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,leader_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205' || error.message.includes("does not exist") || error.message.includes('schema cache') || error.message.includes('Could not find')) {
          setTableError("Table Missing");
          toast.error("Ministries table missing. Please run the SQL script.");
        } else if (error.code === 'PGRST204' || error.message.includes("column")) {
          setTableError("Schema Mismatch");
          toast.error("Database schema mismatch. Please check your tables.");
        } else {
          console.error('Fetch error:', error);
        }
      } else {
        setTableError(null);
        setMinistries(data || []);
        if (isLoading) toast.success("Ministries synced successfully!");
      }
    } catch (err) {
      console.error('System error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateOfficialEmails = async () => {
    if (!confirm('This will generate official @faithhouse.church emails for all ministries that don\'t have one. Continue?')) return;
    
    setIsGenerating(true);
    try {
      const { data: currentMinistries } = await supabase.from('ministries').select('*');
      if (!currentMinistries) return;

      const updates = currentMinistries.map(min => {
        if (min.email) return null;
        
        // Create slug from name
        const slug = min.name
          .toLowerCase()
          .replace(/ ministry/g, '')
          .replace(/ department/g, '')
          .replace(/[^a-z0-9]/g, '');
          
        return {
          ...min,
          email: `${slug}@faithhouse.church`
        };
      }).filter(Boolean);

      if (updates.length > 0) {
        const { error } = await supabase.from('ministries').upsert(updates);
        if (error) throw error;

        // Also add these emails to the profiles table so they can be managed as users
        const profileUpdates = updates.map(min => ({
          email: min.email,
          full_name: min.name,
          role: 'worker', // Default role for ministry accounts
          temp_password: 'FaithHouse2026!' // Default temporary password
        }));

        // Use upsert on profiles based on email to avoid duplicates
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(profileUpdates, { onConflict: 'email' });

        if (profileError) {
          console.warn('Could not sync all emails to profiles:', profileError);
          toast.info("Emails generated, but user profile sync had issues.");
        } else {
          toast.success(`Generated ${updates.length} official emails and synced to User Directory!`);
        }
        
        await fetchMinistries();
      } else {
        toast.info("All ministries already have official emails.");
      }
    } catch (err: any) {
      console.error('Generation error:', err);
      toast.error("Failed to generate emails. Check database schema.");
    } finally {
      setIsGenerating(false);
    }
  };

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
        leader_name: formData.leader_name.trim() || null,
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

      // Sync to profiles if email exists
      if (payload.email) {
        await supabase.from('profiles').upsert({
          email: payload.email,
          full_name: payload.name,
          role: 'worker',
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
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      leader_name: '',
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
      leader_name: ministry.leader_name || '',
      email: ministry.email || '',
      description: ministry.description || '',
      meeting_schedule: ministry.meeting_schedule || '',
      status: ministry.status,
    });
    setIsModalOpen(true);
  };

  const deleteMinistry = async (id: string) => {
    if (!confirm('Permanent Delete?')) return;
    try {
      const { error } = await supabase.from('ministries').delete().eq('id', id);
      if (error) throw error;
      await fetchMinistries();
    } catch (error: any) {
      console.error(error);
    }
  };

  if (tableError) {
    const repairSQL = `-- MASTER MINISTRIES DATABASE REPAIR SCRIPT
CREATE TABLE IF NOT EXISTS public.ministries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  leader_name TEXT,
  email TEXT,
  description TEXT,
  meeting_schedule TEXT,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.ministries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for staff" ON public.ministries;
CREATE POLICY "Allow all for staff" ON public.ministries FOR ALL USING (true) WITH CHECK (true);

-- Ensure profiles table has temp_password column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS temp_password TEXT;

-- Create ministry_members table for roles
CREATE TABLE IF NOT EXISTS public.ministry_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  ministry_name TEXT NOT NULL,
  role TEXT DEFAULT 'Member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(member_id, ministry_name)
);
ALTER TABLE public.ministry_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for staff" ON public.ministry_members;
CREATE POLICY "Allow all for staff" ON public.ministry_members FOR ALL USING (true) WITH CHECK (true);`;

    return (
      <div className="max-w-4xl mx-auto py-12 px-4 animate-in zoom-in-95 duration-500">
        <div className="royal-card p-12 md:p-16 rounded-[4rem] bg-white text-center border-2 border-rose-100 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 inset-x-0 h-2 bg-rose-500"></div>
          <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-inner">
             <svg className="w-12 h-12 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase mb-4 tracking-tighter">Ministries Database Inaccessible</h2>
          <p className="text-slate-500 mb-10 font-medium max-w-lg mx-auto leading-relaxed">
            The organizational structure database is missing. Run the restoration script to establish connectivity.
          </p>
          <pre className="bg-slate-900 text-fh-gold-pale p-8 rounded-[2rem] text-[10px] font-mono text-left h-48 overflow-y-auto mb-10 shadow-inner leading-relaxed border border-fh-gold/10 scrollbar-hide">
            {repairSQL}
          </pre>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => { navigator.clipboard.writeText(repairSQL); alert('SQL Script copied.'); }} className="px-10 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Copy Script</button>
            <button 
              onClick={fetchMinistries} 
              disabled={isLoading}
              className="px-16 py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all border-b-4 border-black disabled:opacity-50"
            >
              {isLoading ? "Verifying..." : "Verify Restoration"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-fh-green tracking-tighter uppercase leading-none">Ministries</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em]">Operational Oversight Hub</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] border border-slate-200">
            {(['Registry', 'Email Setup'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab 
                    ? 'bg-fh-green text-fh-gold shadow-md' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button 
            onClick={() => { resetForm(); setEditingId(null); setIsModalOpen(true); }}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-fh-green text-fh-gold rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all border-b-4 border-black/30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Provision Ministry
          </button>
        </div>
      </div>

      {activeTab === 'Registry' ? (
        <>
          <div className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input 
                type="text" 
                placeholder="Search ministries..." 
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-fh-gold transition-all text-sm font-bold text-slate-800 shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
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
                  
                  <div className="space-y-1.5 pt-2 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                       <svg className="w-2.5 h-2.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                       <p className="text-[9px] font-bold text-slate-600 truncate">{min.leader_name || 'Unassigned'}</p>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300">
                   <div className="flex gap-1.5">
                     <button onClick={() => handleEdit(min)} className="p-2 lg:p-1 bg-white border border-slate-200 rounded-md text-slate-400 hover:text-fh-green transition-all shadow-sm active:scale-90">
                       <svg className="w-4 h-4 lg:w-3 lg:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                     </button>
                     <button onClick={() => deleteMinistry(min.id)} className="p-2 lg:p-1 bg-white border border-slate-200 rounded-md text-slate-400 hover:text-rose-500 transition-all shadow-sm active:scale-90">
                       <svg className="w-4 h-4 lg:w-3 lg:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                     </button>
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
              <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-slate-100 shadow-inner italic text-slate-300 font-black uppercase tracking-widest text-xs">No departments detected.</div>
            )}
          </div>
        </>
      ) : (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm text-center max-w-3xl mx-auto">
            <div className="w-24 h-24 bg-fh-green/5 text-fh-green rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
               <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Official Email Provisioning</h3>
            <p className="text-slate-500 font-medium mb-10 leading-relaxed">
              Generate professional @faithhouse.church email addresses for all ministries. This will also sync these accounts to the User Directory for centralized management.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 text-left">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black text-fh-green uppercase tracking-widest mb-2">Naming Convention</p>
                <p className="text-xs text-slate-600 font-bold">ministryname@faithhouse.church</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black text-fh-gold uppercase tracking-widest mb-2">User Sync</p>
                <p className="text-xs text-slate-600 font-bold">Automatic Profile Creation</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">Temp Password</p>
                <p className="text-xs text-slate-600 font-bold">FaithHouse2026!</p>
              </div>
            </div>

            <button 
              onClick={generateOfficialEmails}
              disabled={isGenerating}
              className="w-full py-6 bg-fh-green text-fh-gold rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:translate-y-[-2px] active:translate-y-0 transition-all disabled:opacity-50 flex items-center justify-center gap-4"
            >
              {isGenerating ? (
                <div className="w-5 h-5 border-4 border-fh-gold/30 border-t-fh-gold rounded-full animate-spin" />
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              )}
              {isGenerating ? 'Provisioning Accounts...' : 'Authorize Global Email Generation'}
            </button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in" onClick={() => !isSubmitting && setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-b-[12px] border-fh-gold">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">{editingId ? 'Modify Dept' : 'Setup Dept'}</h3>
              <button disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-200 rounded-full transition-colors"><svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ministry Name *</label><input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-bold text-slate-800 shadow-inner" placeholder="e.g. Media Ministry" required /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Leader</label><input type="text" name="leader_name" value={formData.leader_name} onChange={handleInputChange} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-bold text-slate-800 shadow-inner" placeholder="Leader Name" /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ministry Email</label><input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-bold text-slate-800 shadow-inner" placeholder="e.g. music@faithhouse.church" /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Meeting Schedule</label><input type="text" name="meeting_schedule" value={formData.meeting_schedule} onChange={handleInputChange} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-bold text-slate-800 shadow-inner" placeholder="e.g. Sundays 4PM" /></div>
                <div className="md:col-span-2 space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Description</label><textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-bold text-slate-800 shadow-inner resize-none" placeholder="Brief mission statement..." /></div>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-fh-green text-fh-gold rounded-[2rem] font-black uppercase text-[10px] tracking-[0.4em] shadow-xl active:scale-95 transition-all border-b-4 border-black/30">
                {isSubmitting ? 'Syncing...' : (editingId ? 'Update Registry' : 'Add Department')}
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
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Active Depts</p>
                  <h2 className="text-3xl font-black text-emerald-600">{ministries.filter(m => m.status === 'Active').length}</h2>
                </div>
                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Inactive Depts</p>
                  <h2 className="text-3xl font-black text-rose-500">{ministries.filter(m => m.status === 'Inactive').length}</h2>
                </div>
              </div>

              <div className="space-y-8">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-2">Ministry Distribution Ledger</h4>
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                      <th className="py-4">Ministry Name</th>
                      <th className="py-4">Leader</th>
                      <th className="py-4">Schedule</th>
                      <th className="py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {ministries.map(min => (
                      <tr key={min.id} className="text-[10px] font-bold text-slate-700">
                        <td className="py-4 uppercase">{min.name}</td>
                        <td className="py-4">{min.leader_name || '---'}</td>
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
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Ministry Coordinator Signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MinistriesView;
