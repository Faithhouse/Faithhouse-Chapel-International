
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, UserRole } from '../types';

interface AdminUsersViewProps {
  userProfile: UserProfile | null;
}

interface DirectoryTemplate {
  label: string;
  email: string;
  role: UserRole;
  level: string;
  genesisKey: string;
  desc: string;
}

const ministryDirectory: DirectoryTemplate[] = [
  { label: 'System Administrator', email: 'sysadmin@faithhouse.church', role: 'System Administrator', level: 'Level 4', genesisKey: 'FHCI_Root_Access!2026', desc: 'Global Infrastructure & Root Access' },
  { label: 'Head Pastor', email: 'headpastor@faithhouse.church', role: 'Head Pastor', level: 'Level 3', genesisKey: 'FHCI_Pastor_Master!2026', desc: 'Full System Oversight' },
  { label: 'Finance / Treasury', email: 'finance@faithhouse.church', role: 'Finance / Treasury', level: 'Level 3', genesisKey: 'FHCI_Vault_Admin!2026', desc: 'Fiscal & Vault Records' },
  { label: 'Evangelism Ministry', email: 'evangelism@faithhouse.church', role: 'Evangelism Ministry', level: 'Level 2', genesisKey: 'FHCI_Go_Harvest!2026', desc: 'Outreach & Souls Tracking' },
  { label: 'Follow-up & Visitation', email: 'care@faithhouse.church', role: 'Follow-up & Visitation', level: 'Level 2', genesisKey: 'FHCI_Care_Reach!2026', desc: 'Congregant Retention' },
  { label: 'Music Ministry', email: 'music@faithhouse.church', role: 'Music Ministry', level: 'Level 2', genesisKey: 'FHCI_Sound_Worship!2026', desc: 'Logistics & Rehearsals' },
  { label: 'Security & Facilities', email: 'ops@faithhouse.church', role: 'Security & Facilities', level: 'Level 1', genesisKey: 'FHCI_Ops_Secure!2026', desc: 'Asset & Safety Logs' },
  { label: 'General Admin', email: 'admin@faithhouse.church', role: 'General Admin', level: 'Level 3', genesisKey: 'FHCI_System_Admin!2026', desc: 'System Master Management' },
  { label: 'General Office', email: 'office@faithhouse.church', role: 'General Office', level: 'Level 4', genesisKey: 'FHCI_Office_GodMode!2026', desc: 'Administrative God Mode Access' },
];

const AdminUsersView: React.FC<AdminUsersViewProps> = ({ userProfile }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthConflict, setIsAuthConflict] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'General Admin' as UserRole
  });

  const isExistingInDirectory = users.some(u => u.email.toLowerCase() === formData.email.toLowerCase());

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    setTableMissing(false);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('role', { ascending: true });

      if (error) {
        if (error.code === '42P01' || error.message.includes('not found') || (error as any).status === 404 || error.message.includes('schema cache') || error.message.includes('Could not find')) {
          setTableMissing(true);
          return;
        }
        throw error;
      }
      setUsers(data || []);
    } catch (err: any) {
      console.error('Directory access failed:', err);
      if (err.message?.includes('schema cache')) setTableMissing(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setIsAuthConflict(false);

    try {
      if (isExistingInDirectory) {
        await syncProfileRecord(editingUserId || undefined);
        closeAndReset();
        alert(`Metadata Updated: ${formData.email} has been resynchronized.`);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { first_name: formData.first_name, last_name: formData.last_name } }
      });
      
      if (authError) {
        if (authError.status === 422 || authError.message.includes('already registered')) {
          setIsAuthConflict(true);
          throw new Error("IDENTITY CONFLICT (422): This email already exists in the Auth Vault. Use 'Force Sync' to establish the database record.");
        }
        throw authError;
      }

      if (authData.user) {
        await syncProfileRecord(authData.user.id);
      }

      closeAndReset();
      alert(`Provisioning Success: ${formData.email} is now active.`);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForceSync = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.from('profiles').upsert([
        { 
          email: formData.email.toLowerCase(), 
          first_name: formData.first_name, 
          last_name: formData.last_name, 
          role: formData.role 
        }
      ], { onConflict: 'email' });

      if (error) {
        if (error.code === '42P01' || error.message.includes('schema cache') || error.message.includes('not found') || error.message.includes('Could not find')) {
          setTableMissing(true);
          setIsModalOpen(false);
          return;
        }
        throw error;
      }

      closeAndReset();
      alert(`Vault Recovered: Profile established for ${formData.email}.`);
    } catch (err: any) {
      setErrorMessage(`Manual Sync Failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const syncProfileRecord = async (id?: string) => {
    const { error: profileError } = await supabase.from('profiles').upsert([
      { 
        id: id,
        email: formData.email.toLowerCase(), 
        first_name: formData.first_name, 
        last_name: formData.last_name, 
        role: formData.role 
      }
    ], { onConflict: 'email' });
    
    if (profileError) throw profileError;
    fetchUsers();
  };

  const deployTemplate = (template: DirectoryTemplate) => {
    setFormData({
      ...formData,
      email: template.email,
      role: template.role,
      first_name: template.label.split(' ')[0],
      last_name: template.label.includes('Admin') ? 'Office' : 'Pastorate',
      password: template.genesisKey
    });
    setErrorMessage(null);
    setIsAuthConflict(false);
    setIsModalOpen(true);
  };

  const closeAndReset = () => {
    setIsModalOpen(false);
    setIsAuthConflict(false);
    setErrorMessage(null);
    setEditingUserId(null);
    setFormData({ email: '', password: '', first_name: '', last_name: '', role: 'General Admin' });
    fetchUsers();
  };

  const decommissionNode = async (id: string, email: string) => {
    if (!confirm(`Confirm Decommission: Remove [${email}] from directory?`)) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      fetchUsers();
    } catch (err: any) {
      alert(`Purge Failed: ${err.message}`);
    }
  };

  const resetNodePassword = async (email: string) => {
    if (!confirm(`Protocol Reset: Send password recovery instructions to [${email}]?`)) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) throw error;
      alert(`Recovery Dispatched: An access key reset link has been sent to ${email}.`);
    } catch (err: any) {
      alert(`Reset Failed: ${err.message}`);
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUserId(user.id);
    setFormData({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      password: '' // Don't show password for editing
    });
    setErrorMessage(null);
    setIsAuthConflict(false);
    setIsModalOpen(true);
  };

  const getLevelBadge = (role: UserRole) => {
    if (role === 'System Administrator' || role === 'General Office') return { text: 'ROOT LEVEL 4', color: 'bg-slate-950 text-fh-gold ring-1 ring-fh-gold/50' };
    if (['Head Pastor', 'Finance / Treasury', 'General Admin'].includes(role)) return { text: 'LEVEL 3', color: 'bg-fh-green text-fh-gold' };
    if (['Security & Facilities'].includes(role)) return { text: 'LEVEL 1', color: 'bg-slate-100 text-slate-500' };
    return { text: 'LEVEL 2', color: 'bg-indigo-50 text-indigo-600' };
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copied.`);
  };

  if (tableMissing) {
    const repairSQL = `-- MASTER PROFILES VAULT REPAIR SCRIPT
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'General Admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for staff" ON public.profiles;
CREATE POLICY "Allow all for staff" ON public.profiles FOR ALL USING (true) WITH CHECK (true);`;

    return (
      <div className="max-w-4xl mx-auto py-12 px-4 animate-in zoom-in-95 duration-500">
        <div className="royal-card p-12 md:p-16 rounded-[4rem] bg-white text-center border-2 border-rose-100 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 inset-x-0 h-2 bg-rose-500"></div>
          <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-inner">
             <svg className="w-12 h-12 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase mb-4 tracking-tighter">Profiles Vault Inaccessible</h2>
          <p className="text-slate-500 mb-10 font-medium max-w-lg mx-auto leading-relaxed">
            Run the profiles restoration script to establish relational connectivity.
          </p>
          <pre className="bg-slate-900 text-fh-gold-pale p-8 rounded-[2rem] text-[10px] font-mono text-left h-48 overflow-y-auto mb-10 shadow-inner leading-relaxed border border-fh-gold/10 scrollbar-hide">
            {repairSQL}
          </pre>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => copyToClipboard(repairSQL, 'SQL Script')} className="px-10 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Copy Script</button>
            <button onClick={fetchUsers} className="px-16 py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all border-b-4 border-black">Verify Restoration</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-24">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 py-2">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-fh-gold/10 rounded-full mb-2">
             <span className="w-1.5 h-1.5 rounded-full bg-fh-gold animate-pulse"></span>
             <span className="text-[10px] font-black text-fh-gold uppercase tracking-[0.2em]">Security Protocol Active</span>
          </div>
          <h2 className="text-4xl font-black text-fh-green tracking-tighter uppercase leading-none">Security Hierarchy</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.4em]">Administrative Node Directory</p>
        </div>
        <button onClick={() => { setErrorMessage(null); setIsAuthConflict(false); setIsModalOpen(true); }} className="px-10 py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl active:scale-95 transition-all border-b-4 border-black/30">Provision Manual Access</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <div className="royal-card rounded-[3.5rem] overflow-hidden bg-white border border-slate-100 shadow-sm">
            <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Authorized System Nodes</h3>
               <span className="px-5 py-1.5 bg-white border border-slate-200 rounded-full text-[9px] font-black text-fh-green uppercase shadow-sm">{users.length} Nodes Synchronized</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100">
                  <tr><th className="px-10 py-6">Node Identity</th><th className="px-10 py-6">Clearance</th><th className="px-10 py-6 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {isLoading ? (
                    <tr><td colSpan={3} className="px-10 py-24 text-center animate-pulse text-slate-300 font-black uppercase tracking-widest">Accessing identity vault...</td></tr>
                  ) : users.length > 0 ? users.map(u => {
                    const badge = getLevelBadge(u.role);
                    return (
                      <tr key={u.id} className="hover:bg-fh-slate/50 transition-colors group">
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-5">
                            <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center font-black text-xs border border-white/10 shadow-lg group-hover:scale-110 transition-transform ${['System Administrator', 'General Office'].includes(u.role) ? 'bg-fh-gold text-fh-green-dark ring-2 ring-fh-gold/50 shadow-fh-gold/20' : 'bg-slate-950 text-fh-gold'}`}>
                              {u.first_name?.[0] || '?'}{u.last_name?.[0] || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800 leading-none mb-1">{u.first_name} {u.last_name}</p>
                              <p className="text-[10px] text-slate-400 font-bold lowercase">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <div className="flex flex-col gap-1.5">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${['System Administrator', 'General Office'].includes(u.role) ? 'text-fh-gold' : 'text-slate-900'}`}>{u.role}</span>
                            <span className={`w-fit px-2.5 py-1 rounded-md text-[7px] font-black uppercase tracking-tighter shadow-sm ${badge.color}`}>
                              {badge.text}
                            </span>
                          </div>
                        </td>
                        <td className="px-10 py-6 text-right">
                           <div className="flex justify-end gap-2">
                             {['System Administrator', 'General Office'].includes(userProfile?.role || '') && (
                               <button onClick={() => resetNodePassword(u.email)} className="p-3 text-slate-300 hover:text-fh-gold hover:bg-fh-gold/5 rounded-xl transition-all active:scale-90" title="Reset Access Key">
                                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                               </button>
                             )}
                             <button onClick={() => handleEditUser(u)} className="p-3 text-slate-300 hover:text-fh-green hover:bg-fh-green/5 rounded-xl transition-all active:scale-90" title="Edit Node Metadata">
                               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                             </button>
                             <button onClick={() => decommissionNode(u.id, u.email)} className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-90" title="Decommission Node">
                               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                             </button>
                           </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={3} className="px-10 py-32 text-center text-slate-400 font-black uppercase tracking-widest italic opacity-50">No administrative nodes recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
           <div className="royal-card rounded-[3.5rem] bg-slate-950 text-white relative overflow-hidden shadow-2xl border border-white/5">
              <div className="absolute top-0 right-0 w-48 h-48 bg-fh-gold/5 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
              <div className="p-10 pb-0">
                <h4 className="text-xs font-black uppercase tracking-[0.4em] text-fh-gold mb-4">Credentials Inventory</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-10 leading-relaxed">Official organizational emails and deployment keys for ministry onboarding.</p>
              </div>
              
              <div className="space-y-1 max-h-[550px] overflow-y-auto scrollbar-hide px-6 pb-10">
                 {ministryDirectory.map((m, idx) => (
                   <div key={idx} className={`group p-5 hover:bg-white/10 rounded-[2rem] border transition-all mb-4 ${['System Administrator', 'General Office'].includes(m.role) ? 'bg-fh-gold/5 border-fh-gold/20' : 'bg-white/5 border-white/5'}`}>
                     <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-white uppercase tracking-tight">{m.label}</p>
                          <p className={`text-[8px] font-bold uppercase tracking-widest ${['System Administrator', 'General Office'].includes(m.role) ? 'text-fh-gold animate-pulse' : 'text-fh-gold opacity-60'}`}>{m.level} Clearance</p>
                        </div>
                        <button onClick={() => deployTemplate(m)} className="px-4 py-2 bg-fh-gold/10 hover:bg-fh-gold text-fh-gold hover:text-fh-green rounded-xl text-[8px] font-black uppercase tracking-widest transition-all shadow-inner">Deploy</button>
                     </div>
                     <div className="space-y-3 pt-3 border-t border-white/5">
                        <div className="flex items-center justify-between">
                           <p className="text-[9px] text-slate-400 font-medium lowercase truncate flex-1">{m.email}</p>
                           <button onClick={() => copyToClipboard(m.email, 'Email')} className="p-2 text-white/30 hover:text-fh-gold transition-colors"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></button>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl shadow-inner border border-white/5">
                           <p className="font-mono text-[9px] text-indigo-400 font-bold truncate">{m.genesisKey}</p>
                           <button onClick={() => copyToClipboard(m.genesisKey, 'Genesis Key')} className="p-2 text-white/30 hover:text-indigo-400 transition-colors"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></button>
                        </div>
                     </div>
                   </div>
                 ))}
              </div>
           </div>

           <div className="royal-card p-10 rounded-[3rem] bg-white border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-inner">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">Security Hierarchy</h4>
              </div>
              <ul className="space-y-5 text-[10px] text-slate-500 font-bold uppercase tracking-tighter leading-relaxed">
                 <li className="flex gap-4"><span className="text-fh-gold shrink-0">LEVEL 4</span> <b>Master/Root:</b> Universal system access including architecture control.</li>
                 <li className="flex gap-4"><span className="text-indigo-600 shrink-0">LEVEL 3</span> <b>Pastorate/Staff:</b> Complete oversight of all organizational modules.</li>
                 <li className="flex gap-4"><span className="text-slate-400 shrink-0">LEVEL 2</span> <b>Ministry Head:</b> Read/Write access to specific departmental data.</li>
              </ul>
           </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md animate-in fade-in" onClick={() => !isSubmitting && closeAndReset()} />
          <div className="relative bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden border-b-[12px] border-fh-gold animate-in zoom-in-95">
            <div className="p-12 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
               <div>
                  <h3 className="text-3xl font-black text-fh-green uppercase leading-none tracking-tight">{isExistingInDirectory ? 'Node Resynchronization' : 'Provisioning Node'}</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-2">Authorized Access Issuance System</p>
               </div>
               <button onClick={() => closeAndReset()} className="p-5 hover:bg-slate-200 rounded-full transition-all text-slate-400 active:scale-90"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <form onSubmit={handleCreateUser} className="p-12 pt-10 space-y-8">
              {errorMessage && (
                <div className="p-8 bg-rose-50 border border-rose-100 rounded-[2.5rem] animate-in shake duration-500">
                  <div className="flex gap-5">
                    <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
                    <div className="space-y-3 flex-1">
                      <p className="text-xs font-black text-rose-800 uppercase tracking-tight leading-none">Vault Link Conflict</p>
                      <p className="text-[10px] font-bold text-rose-600 leading-relaxed uppercase tracking-tighter">{errorMessage}</p>
                      {isAuthConflict && (
                        <div className="pt-4 flex flex-col gap-3">
                           <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Protocol Overwrite Available:</p>
                           <button type="button" onClick={handleForceSync} className="w-fit px-6 py-3 bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-md flex items-center gap-2 border-b-4 border-black/20 active:translate-y-0.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>Force Profile Sync</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Entity Identity (First)</label><input required value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} className="w-full px-7 py-5 bg-slate-100 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner outline-none focus:ring-4 focus:ring-fh-gold/5 transition-all" /></div>
                <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Entity Identity (Last)</label><input required value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} className="w-full px-7 py-5 bg-slate-100 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner outline-none focus:ring-4 focus:ring-fh-gold/5 transition-all" /></div>
              </div>

              <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Organizational Email Gateway</label><input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-7 py-5 bg-slate-100 border border-slate-200 rounded-3xl font-black text-fh-green shadow-inner outline-none focus:ring-4 focus:ring-fh-gold/5 transition-all" placeholder="dept@faithhouse.church" /></div>

              {!isExistingInDirectory && !isAuthConflict && (
                <div className="space-y-2 animate-in slide-in-from-left-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Initial Genesis Key</label><input type="text" required value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-7 py-5 bg-slate-100 border border-slate-200 rounded-3xl font-mono text-sm font-black text-indigo-600 shadow-inner outline-none focus:ring-4 focus:ring-fh-gold/5 transition-all" /></div>
              )}

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Security Role Assignment</label>
                <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})} className="w-full px-7 py-5 bg-slate-100 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner appearance-none cursor-pointer outline-none focus:ring-4 focus:ring-fh-gold/5 transition-all">
                  {ministryDirectory.map(m => <option key={m.role} value={m.role}>{m.label}</option>)}
                  <option value="Assistant">Office Assistant</option>
                </select>
              </div>

              <div className="pt-8 flex gap-5">
                <button type="button" onClick={() => closeAndReset()} className="flex-1 py-6 border-2 border-slate-100 text-slate-400 rounded-3xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95">Discard Entry</button>
                <button type="submit" disabled={isSubmitting} className={`flex-[2] py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.4em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 border-b-4 border-black ${isExistingInDirectory ? 'bg-amber-500 text-white' : 'bg-fh-green text-fh-gold'}`}>
                   {isSubmitting ? <div className="w-6 h-6 border-2 border-white/50 border-t-white animate-spin rounded-full"></div> : <><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>{isExistingInDirectory ? 'Update Node Metadata' : 'Authorize Node Entry'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersView;
