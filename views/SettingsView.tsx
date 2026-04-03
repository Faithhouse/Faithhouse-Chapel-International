
import React, { useState } from 'react';
import { Role, UserProfile, RecentActivity } from '../types';
import { supabase } from '../supabaseClient';

interface SettingsViewProps {
  userProfile: UserProfile | null;
  initialTab?: 'General' | 'Roles' | 'Security';
}

const defaultRoles: Role[] = [
  {
    id: 'r1',
    name: 'Administrator',
    description: 'Full access to all modules and system settings.',
    permissions: [
      { module: 'Members', read: true, write: true, delete: true },
      { module: 'Finance', read: true, write: true, delete: true },
      { module: 'Events', read: true, write: true, delete: true },
    ]
  },
  {
    id: 'r2',
    name: 'Finance Manager',
    description: 'Manage contributions, donations, and expense reports.',
    permissions: [
      { module: 'Members', read: true, write: false, delete: false },
      { module: 'Finance', read: true, write: true, delete: true },
      { module: 'Events', read: true, write: false, delete: false },
    ]
  },
  {
    id: 'r3',
    name: 'Ministry Lead',
    description: 'Manage specific ministry members and events.',
    permissions: [
      { module: 'Members', read: true, write: true, delete: false },
      { module: 'Finance', read: false, write: false, delete: false },
      { module: 'Events', read: true, write: true, delete: false },
    ]
  }
];

const mockActivities: RecentActivity[] = [
  { id: '1', user: 'System', action: 'automated', target: 'Database Backup', time: 'Just Now', type: 'system' },
  { id: '2', user: 'Secretary', action: 'registered', target: 'New Member Profile', time: '14m ago', type: 'member' },
  { id: '3', user: 'Finance', action: 'posted', target: 'Sunday Service Ledger', time: '2h ago', type: 'finance' }
];

const SettingsView: React.FC<SettingsViewProps> = ({ userProfile, initialTab }) => {
  const [roles, setRoles] = useState<Role[]>(defaultRoles);
  const [activeTab, setActiveTab] = useState<'General' | 'Roles' | 'Security'>(initialTab || 'General');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: passwordData.newPassword })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update password');
      }

      setPasswordSuccess("Password updated successfully.");
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPasswordError(err.message || "Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleFormData, setRoleFormData] = useState({
    name: '',
    description: ''
  });

  const handleOpenRoleModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setRoleFormData({ name: role.name, description: role.description });
    } else {
      setEditingRole(null);
      setRoleFormData({ name: '', description: '' });
    }
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRole) {
      setRoles(prev => prev.map(r => r.id === editingRole.id ? { ...r, name: roleFormData.name, description: roleFormData.description } : r));
    } else {
      const newRole: Role = {
        id: `r${Date.now()}`,
        name: roleFormData.name,
        description: roleFormData.description,
        permissions: [
          { module: 'Members', read: true, write: false, delete: false },
          { module: 'Finance', read: false, write: false, delete: false },
          { module: 'Events', read: true, write: false, delete: false },
        ]
      };
      setRoles(prev => [...prev, newRole]);
    }
    setIsRoleModalOpen(false);
  };

  const handleDeleteRole = (id: string) => {
    if (confirm('Are you sure you want to deactivate this role? This will remove it from the system.')) {
      setRoles(prev => prev.filter(r => r.id !== id));
    }
  };

  const togglePermission = (roleId: string, moduleName: string, type: 'read' | 'write' | 'delete') => {
    setRoles(prev => prev.map(r => {
      if (r.id !== roleId) return r;
      return {
        ...r,
        permissions: r.permissions.map(p => {
          if (p.module !== moduleName) return p;
          return { ...p, [type]: !p[type] };
        })
      };
    }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase">System Settings</h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.4em]">Administrative Hub & Control Suite</p>
        </div>
      </div>

      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('General')}
          className={`px-8 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'General' ? 'border-fh-green text-fh-green' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
        >
          General Configuration
        </button>
        <button 
          onClick={() => setActiveTab('Roles')}
          className={`px-8 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'Roles' ? 'border-fh-green text-fh-green' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
        >
          Roles & Permissions
        </button>
        {['System Administrator', 'General Office'].includes(userProfile?.role || '') && (
          <button 
            onClick={() => setActiveTab('Security')}
            className={`px-8 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'Security' ? 'border-fh-green text-fh-green' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
          >
            Security & Access
          </button>
        )}
      </div>

      {activeTab === 'Roles' ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Access Control Groups</h3>
            <button 
              onClick={() => handleOpenRoleModal()}
              className="px-6 py-2.5 bg-fh-green text-fh-gold rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-md"
            >
              + Create New Role
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {roles.map(role => (
              <div key={role.id} className="royal-card rounded-[2.5rem] bg-white border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">{role.name}</h4>
                    <p className="text-xs text-slate-500 font-medium">{role.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOpenRoleModal(role)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
                    >
                      Modify
                    </button>
                    <button 
                      onClick={() => handleDeleteRole(role.id)}
                      className="px-4 py-2 bg-rose-50 border border-rose-100 rounded-lg text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-100 transition-all"
                    >
                      Deactivate
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-white border-b border-slate-100 text-[9px] uppercase font-black text-slate-400 tracking-widest">
                      <tr>
                        <th className="px-8 py-4">Module Name</th>
                        <th className="px-8 py-4 text-center">Read Access</th>
                        <th className="px-8 py-4 text-center">Write Access</th>
                        <th className="px-8 py-4 text-center">Delete Access</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {role.permissions.map(perm => (
                        <tr key={perm.module} className="hover:bg-slate-50 transition-colors">
                          <td className="px-8 py-4 text-xs font-black text-slate-700 uppercase tracking-widest">{perm.module}</td>
                          <td className="px-8 py-4 text-center">
                            <button 
                              onClick={() => togglePermission(role.id, perm.module, 'read')}
                              className={`w-10 h-5 rounded-full transition-all relative ${perm.read ? 'bg-fh-green' : 'bg-slate-200'}`}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${perm.read ? 'translate-x-5' : ''}`}></span>
                            </button>
                          </td>
                          <td className="px-8 py-4 text-center">
                            <button 
                              onClick={() => togglePermission(role.id, perm.module, 'write')}
                              className={`w-10 h-5 rounded-full transition-all relative ${perm.write ? 'bg-fh-green' : 'bg-slate-200'}`}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${perm.write ? 'translate-x-5' : ''}`}></span>
                            </button>
                          </td>
                          <td className="px-8 py-4 text-center">
                            <button 
                              onClick={() => togglePermission(role.id, perm.module, 'delete')}
                              className={`w-10 h-5 rounded-full transition-all relative ${perm.delete ? 'bg-rose-500' : 'bg-slate-200'}`}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${perm.delete ? 'translate-x-5' : ''}`}></span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'Security' ? (
        <div className="max-w-2xl animate-in slide-in-from-right-4 duration-500">
          <div className="royal-card p-10 rounded-[3rem] bg-white border border-slate-100 shadow-sm">
            <div className="mb-8">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Change Access Key</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Update your security credentials for the Faithhouse System.</p>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-6">
              {passwordError && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-[10px] font-black uppercase tracking-widest text-center">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 text-[10px] font-black uppercase tracking-widest text-center">
                  {passwordSuccess}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">New Access Key</label>
                <input 
                  type="password"
                  required 
                  value={passwordData.newPassword} 
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-100 border border-slate-200 rounded-2xl font-black text-slate-800 outline-none focus:ring-4 focus:ring-fh-green/5 transition-all"
                  placeholder="••••••••••••"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Confirm New Key</label>
                <input 
                  type="password"
                  required 
                  value={passwordData.confirmPassword} 
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-100 border border-slate-200 rounded-2xl font-black text-slate-800 outline-none focus:ring-4 focus:ring-fh-green/5 transition-all"
                  placeholder="••••••••••••"
                />
              </div>

              <button 
                type="submit"
                disabled={isUpdatingPassword}
                className="w-full py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isUpdatingPassword ? (
                  <div className="w-4 h-4 border-2 border-fh-gold/20 border-t-fh-gold animate-spin rounded-full"></div>
                ) : (
                  'Update Security Credentials'
                )}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="space-y-10 animate-in slide-in-from-left-4 duration-500">
           {/* System Health Section */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="royal-card p-10 rounded-[3rem] bg-slate-950 text-white overflow-hidden relative shadow-2xl">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-fh-gold/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
                 <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      <h4 className="text-[10px] font-black text-fh-gold uppercase tracking-[0.4em]">System Audit</h4>
                    </div>
                    <div className="flex items-end justify-between">
                       <div>
                         <p className="text-4xl font-black tracking-tighter leading-none mb-2">Sync: 100%</p>
                         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Database Access Active</p>
                       </div>
                       <button className="px-6 py-2.5 bg-fh-gold/10 text-fh-gold border border-fh-gold/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-fh-gold/20 transition-all">Re-Verify Connection</button>
                    </div>
                 </div>
              </div>

              <div className="royal-card p-10 rounded-[3rem] bg-white border border-slate-100 flex items-center justify-between shadow-sm">
                 <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-3">Security Protocol</h4>
                    <p className="text-2xl font-black text-fh-green tracking-tight leading-none mb-1">AES-256 Encryption</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">End-to-End Encryption Active</p>
                 </div>
                 <div className="w-16 h-16 bg-slate-50 rounded-[1.75rem] flex items-center justify-center text-slate-400">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                 </div>
              </div>
           </div>

           {/* Security Audit Ledger Section */}
           <div className="royal-card rounded-[3.5rem] overflow-hidden bg-white border border-slate-100 shadow-sm">
              <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <div>
                   <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Security Audit Ledger</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Administrative Transaction Logs</p>
                </div>
                <button className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-fh-green transition-all shadow-sm active:scale-95">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100">
                    <tr><th className="px-10 py-6">User</th><th className="px-10 py-6">Action</th><th className="px-10 py-6">Target</th><th className="px-10 py-6 text-right">Time</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {mockActivities.map((act) => (
                      <tr key={act.id} className="hover:bg-fh-slate/50 transition-colors group">
                        <td className="px-10 py-6">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-[1.25rem] bg-slate-950 text-fh-gold flex items-center justify-center font-black text-xs border border-white/10 shadow-lg">
                                 {act.user[0]}
                              </div>
                              <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{act.user}</span>
                           </div>
                        </td>
                        <td className="px-10 py-6">
                           <span className="px-5 py-2 bg-fh-green/5 text-fh-green text-[10px] font-black uppercase tracking-widest rounded-xl border border-fh-green/10">
                              {act.action}
                           </span>
                        </td>
                        <td className="px-10 py-6">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                              {act.target}
                           </span>
                        </td>
                        <td className="px-10 py-6 text-right">
                           <span className="font-mono text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                              {act.time}
                           </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>
        </div>
      )}

      <RoleModal 
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        onSave={handleSaveRole}
        formData={roleFormData}
        setFormData={setRoleFormData}
        isEditing={!!editingRole}
      />
    </div>
  );
};

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  formData: { name: string; description: string };
  setFormData: React.Dispatch<React.SetStateAction<{ name: string; description: string }>>;
  isEditing: boolean;
}

const RoleModal: React.FC<RoleModalProps> = ({ isOpen, onClose, onSave, formData, setFormData, isEditing }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
            {isEditing ? 'Modify Role' : 'Create New Role'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={onSave} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Role Name</label>
            <input 
              required 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-6 py-4 bg-slate-100 border border-slate-200 rounded-2xl font-black text-slate-800 outline-none focus:ring-4 focus:ring-fh-green/5 transition-all"
              placeholder="e.g. Department Head"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Description</label>
            <textarea 
              required 
              value={formData.description} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-6 py-4 bg-slate-100 border border-slate-200 rounded-2xl font-medium text-slate-700 outline-none focus:ring-4 focus:ring-fh-green/5 transition-all h-32 resize-none"
              placeholder="Describe the responsibilities of this role..."
            />
          </div>
          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-4 border-2 border-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-[2] py-4 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-black transition-all"
            >
              {isEditing ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsView;
