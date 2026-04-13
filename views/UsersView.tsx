
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, UserRole } from '../types';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert, 
  Mail, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  Shield,
  UserCheck,
  Key,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface UsersViewProps {
  currentUser: UserProfile | null;
}

const UsersView: React.FC<UsersViewProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'All'>('All');
  const [isGenerating, setIsGenerating] = useState(false);
  const [ministries, setMinistries] = useState<any[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'worker' as UserRole,
    password: '',
    ministry_id: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchMinistries();
    // Auto-sync if admin and no users found (optional, but helps populate)
    if (currentUser && (currentUser.role === 'system_admin' || currentUser.role === 'admin')) {
      checkAndAutoSync();
    }
  }, [currentUser]);

  const checkAndAutoSync = async () => {
    const { data: profiles } = await supabase.from('profiles').select('email');
    const { data: mins } = await supabase.from('ministries').select('email');
    
    if (mins && profiles) {
      const profileEmails = new Set(profiles.map(p => p.email?.toLowerCase()));
      const missingEmails = mins.filter(m => m.email && !profileEmails.has(m.email.toLowerCase()));
      
      if (missingEmails.length > 0) {
        console.log('Auto-syncing missing ministry accounts...');
        await performSync();
        toast.success(`Populated ${missingEmails.length} missing ministry accounts.`);
      }
    }
  };

  const performSync = async () => {
    try {
      const { data: currentMinistries } = await supabase.from('ministries').select('*');
      if (!currentMinistries) return;

      const updates = currentMinistries.map(min => {
        if (min.email) return null;
        
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
      }

      // Now sync ALL ministries that have emails to the profiles table
      const { data: allMinistries } = await supabase.from('ministries').select('*').not('email', 'is', null);
      
      if (allMinistries && allMinistries.length > 0) {
        // Fetch existing profiles to avoid conflict issues if unique constraint is missing
        const { data: existingProfiles } = await supabase.from('profiles').select('email');
        const existingEmails = new Set(existingProfiles?.map(p => p.email?.toLowerCase()) || []);

        const profileUpdates = allMinistries.map(min => {
          const email = min.email.toLowerCase();
          return {
            email: min.email,
            full_name: min.name,
            role: min.name,
            temp_password: 'FaithHouse2026!',
            is_active: true
          };
        });

        // Use upsert with onConflict if possible, or manual check
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(profileUpdates, { onConflict: 'email' });

        if (profileError) {
          console.warn('Profile sync error:', profileError);
          // Fallback: try inserting only missing ones
          const missingProfiles = profileUpdates.filter(p => !existingEmails.has(p.email.toLowerCase()));
          if (missingProfiles.length > 0) {
            await supabase.from('profiles').insert(missingProfiles);
          }
        }
      }
      
      fetchUsers();
      fetchMinistries();
    } catch (err: any) {
      console.error('Sync error:', err);
      if (err.code === '22P02' || err.message.includes('enum user_role')) {
        setDbError("Role Schema Mismatch");
      }
    }
  };

  const generateOfficialEmails = async () => {
    if (!confirm('This will generate official @faithhouse.church emails for all ministries and sync them to the user directory. Continue?')) return;
    
    setIsGenerating(true);
    await performSync();
    setIsGenerating(false);
    toast.success("Ministry accounts synchronized successfully!");
  };

  const fetchMinistries = async () => {
    const { data } = await supabase.from('ministries').select('*').order('name');
    setMinistries(data || []);
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '22P02' || error.message.includes('enum user_role')) {
          setDbError("Role Schema Mismatch");
        }
        throw error;
      }
      setUsers(data || []);
      setDbError(null);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || (currentUser.role !== 'system_admin' && currentUser.role !== 'general_overseer' && currentUser.role !== 'admin' && currentUser.email !== 'systemadmin@faithhouse.church')) {
      toast.error('Unauthorized action');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        const { data, error } = await supabase
          .from('profiles')
          .update({
            email: formData.email,
            full_name: formData.full_name,
            role: formData.role
          })
          .eq('id', editingUser.id)
          .select()
          .single();

        if (error) throw error;

        toast.success(`Account updated for ${formData.full_name}`);
        setUsers(users.map(u => u.id === editingUser.id ? data : u));
      } else {
        // In a real app, this would call a Supabase Edge Function or a backend API
        // that uses the service_role key to create the user in auth.users AND profiles.
        // For this demo, we'll simulate the profile creation.
        
        const { data, error } = await supabase
          .from('profiles')
          .insert([{
            id: crypto.randomUUID(), // Simulated UUID
            email: formData.email,
            full_name: formData.full_name,
            role: formData.role,
            is_active: true,
            temp_password: formData.password || 'FaithHouse2026',
            created_by: currentUser.id
          }])
          .select()
          .single();

        if (error) throw error;

        toast.success(`Account created for ${formData.full_name}. Temporary password: ${formData.password || 'FaithHouse2026'}`);
        setUsers([data, ...users]);
      }
      setIsModalOpen(false);
      setEditingUser(null);
      setFormData({ email: '', full_name: '', role: 'worker', password: '', ministry_id: '' });
    } catch (error: any) {
      console.error('Error saving user:', error);
      if (error.code === '22P02' || error.message.includes('enum user_role')) {
        setDbError("Role Schema Mismatch");
      }
      toast.error(error.message || 'Failed to save user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'}`);
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  const handleSetTempPassword = async (user: UserProfile) => {
    const tempPass = prompt(`Enter a new temporary password for ${user.full_name}:`, "FaithHouse2026");
    if (!tempPass) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          temp_password: tempPass,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success(`Temporary password set for ${user.full_name}. They can now login with: ${tempPass}`);
    } catch (error: any) {
      console.error('Reset error:', error);
      toast.error(error.message || 'Failed to set temporary password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const name = u.full_name || '';
    const email = u.email || '';
    const search = searchTerm.toLowerCase();
    
    const matchesSearch = 
      name.toLowerCase().includes(search) ||
      email.toLowerCase().includes(search);
    const standardRoles = ['system_admin', 'general_overseer', 'admin', 'pastor', 'finance', 'media', 'worker'];
    const matchesRole = 
      roleFilter === 'All' || 
      (roleFilter === 'ministry' ? !standardRoles.includes(u.role) : u.role === roleFilter);
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'system_admin': return 'bg-slate-900 text-fh-gold border-slate-800';
      case 'general_overseer': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'admin': return 'bg-red-100 text-red-700 border-red-200';
      case 'pastor': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'finance': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'media': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'worker': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: 
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    }
  };

  if (dbError) {
    const repairSQL = `-- USER DIRECTORY SCHEMA REPAIR (ROBUST VERSION)
-- This script converts the role column to TEXT to allow dynamic ministry roles
-- and handles dependencies on policies.

-- 1. Temporarily drop policies that block the alteration
DROP POLICY IF EXISTS "Only high-level admins can update system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow all for staff" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update temp passwords" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can do everything" ON public.profiles;

-- 2. Alter the column in profiles
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE TEXT USING role::text;

-- 3. Re-create the policies
CREATE POLICY "Only high-level admins can update system settings" 
ON public.system_settings 
FOR ALL 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('system_admin', 'general_overseer', 'admin')
);

CREATE POLICY "Allow all for staff" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- Optional: Re-create more specific policies if needed
-- CREATE POLICY "Admins can update temp passwords" ON public.profiles FOR UPDATE USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'system_admin') );

-- 4. Ensure other columns exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS temp_password TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_by UUID;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';`;

    return (
      <div className="max-w-4xl mx-auto py-12 px-4 animate-in zoom-in-95 duration-500">
        <div className="royal-card p-12 md:p-16 rounded-[4rem] bg-white text-center border-2 border-rose-100 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 inset-x-0 h-2 bg-rose-500"></div>
          <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-inner">
             <ShieldAlert className="w-12 h-12 text-rose-500" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase mb-4 tracking-tighter">Database Schema Conflict</h2>
          <p className="text-slate-500 mb-10 font-medium max-w-lg mx-auto leading-relaxed">
            The user directory is using a restricted role system. Run this script to enable dynamic ministry roles and advanced security features.
          </p>
          <pre className="bg-slate-900 text-fh-gold-pale p-8 rounded-[2rem] text-[10px] font-mono text-left h-48 overflow-y-auto mb-10 shadow-inner leading-relaxed border border-fh-gold/10 scrollbar-hide">
            {repairSQL}
          </pre>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => { navigator.clipboard.writeText(repairSQL); toast.success('SQL Script copied.'); }} className="px-10 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Copy Script</button>
            <button 
              onClick={() => { setDbError(null); fetchUsers(); }} 
              disabled={isLoading}
              className="px-16 py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all border-b-4 border-black disabled:opacity-50"
            >
              {isLoading ? "Verifying..." : "Verify Fix"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-fh-gold" />
            User Management
          </h1>
          <p className="text-slate-500 font-medium">Manage church staff and system access roles</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={generateOfficialEmails}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 px-6 py-3 rounded-2xl font-bold hover:bg-indigo-100 transition-all border border-indigo-200 shadow-sm disabled:opacity-50"
          >
            {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
            Sync Ministry Emails
          </button>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-slate-900 text-fh-gold px-6 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            <UserPlus className="w-5 h-5" />
            Add New User
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-fh-gold/20 focus:border-fh-gold transition-all font-medium"
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-fh-gold/20 focus:border-fh-gold transition-all font-medium appearance-none"
          >
            <option value="All">All Roles</option>
            <option value="system_admin">System Admins</option>
            <option value="general_overseer">General Overseer</option>
            <option value="admin">Administrators</option>
            <option value="pastor">Pastors</option>
            <option value="finance">Finance Officers</option>
            <option value="media">Media Team</option>
            <option value="worker">Church Workers</option>
            <option value="ministry">Ministries</option>
          </select>
        </div>

        <button 
          onClick={fetchUsers}
          className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>

        <button
          onClick={generateOfficialEmails}
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-600 px-4 py-4 rounded-2xl font-bold hover:bg-indigo-100 transition-all disabled:opacity-50"
        >
          <Mail className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Syncing...' : 'Sync Ministry Emails'}
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-bottom border-slate-200">
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Credentials</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Joined</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="w-8 h-8 text-fh-gold animate-spin" />
                      <p className="text-slate-500 font-bold">Loading users...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="w-12 h-12 text-slate-200" />
                      <p className="text-slate-500 font-bold">No users found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-fh-gold flex items-center justify-center font-black">
                          {(user.full_name || 'U').charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{user.full_name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                        {user.temp_password ? (
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-1 bg-slate-100 rounded text-[10px] font-mono text-slate-600 border border-slate-200">
                              {user.temp_password}
                            </code>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(user.temp_password || '');
                                toast.success('Password copied to clipboard');
                              }}
                              className="p-1 text-slate-400 hover:text-fh-green transition-colors"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 italic">Auth Managed</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {user.is_active ? (
                          <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4" />
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-400 text-xs font-bold">
                            <XCircle className="w-4 h-4" />
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => toggleUserStatus(user.id, user.is_active)}
                          className={`p-2 rounded-lg transition-colors ${user.is_active ? 'text-slate-400 hover:bg-slate-100' : 'text-emerald-600 hover:bg-emerald-50'}`}
                          title={user.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {user.is_active ? <ShieldAlert className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                        </button>
                        <button 
                          onClick={() => handleSetTempPassword(user)}
                          className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Set Temporary Password"
                        >
                          <Key className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingUser(user);
                            setFormData({
                              email: user.email,
                              full_name: user.full_name,
                              role: user.role,
                              password: '',
                              ministry_id: '' // We don't store ministry_id yet, but we can infer it if needed
                            });
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-fh-gold flex items-center justify-center">
                    {editingUser ? <Edit3 className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">{editingUser ? 'Edit Staff Account' : 'Create Staff Account'}</h2>
                    <p className="text-sm text-slate-500 font-medium">{editingUser ? 'Update access details' : 'Internal access generation'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingUser(null);
                    setFormData({ email: '', full_name: '', role: 'worker', password: '', ministry_id: '' });
                  }}
                  className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        required
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-fh-gold/20 focus:border-fh-gold transition-all font-medium"
                        placeholder="e.g. John Doe"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-fh-gold/20 focus:border-fh-gold transition-all font-medium"
                        placeholder="staff@faithhouse.church"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">System Role</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <select
                        value={formData.role}
                        onChange={(e) => {
                          const newRole = e.target.value;
                          setFormData({ ...formData, role: newRole as UserRole });
                        }}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-fh-gold/20 focus:border-fh-gold transition-all font-medium appearance-none"
                      >
                        <option value="worker">Worker</option>
                        <option value="media">Media</option>
                        <option value="finance">Finance</option>
                        <option value="pastor">Pastor</option>
                        <option value="admin">Admin</option>
                        <option value="general_overseer">General Overseer</option>
                        <option value="system_admin">System Admin</option>
                        <option value="Ministry">Ministry Account</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Associate with Ministry</label>
                    <div className="relative">
                      <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <select
                        value={formData.ministry_id}
                        onChange={(e) => {
                          const minId = e.target.value;
                          const min = ministries.find(m => m.id === minId);
                          if (min) {
                            setFormData({ 
                              ...formData, 
                              ministry_id: minId,
                              role: min.name,
                              full_name: formData.full_name || min.name
                            });
                          } else {
                            setFormData({ ...formData, ministry_id: minId });
                          }
                        }}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-fh-gold/20 focus:border-fh-gold transition-all font-medium appearance-none"
                      >
                        <option value="">None / Staff Only</option>
                        {ministries.map(min => (
                          <option key={min.id} value={min.id}>{min.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">{editingUser ? 'New Password' : 'Temp Password'}</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-fh-gold/20 focus:border-fh-gold transition-all font-medium"
                      placeholder={editingUser ? "Leave blank to keep" : "Optional (Default: FaithHouse2026)"}
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-2 py-4 bg-slate-900 text-fh-gold rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        {editingUser ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        {editingUser ? <CheckCircle2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                        {editingUser ? 'Update Account' : 'Generate Account'}
                      </>
                    )}
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

export default UsersView;
