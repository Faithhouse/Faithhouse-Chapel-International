
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Branch, UserProfile } from '../types';
import { toast } from 'sonner';

// Added interface for BranchesView props
interface BranchesViewProps {
  userProfile: UserProfile | null;
}

const BranchesView: React.FC<BranchesViewProps> = ({ userProfile }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    pastor_in_charge: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    fetchBranches();
  }, [searchTerm]);

  const fetchBranches = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('branches')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        // Handle table or column errors
        if (error.code === '42P01' || error.code === 'PGRST205' || error.message.includes("does not exist") || error.message.includes('schema cache') || error.message.includes('Could not find')) {
          setTableError("Table Missing");
          toast.error("Branches table missing. Please run the SQL script.");
        } else if (error.code === 'PGRST204' || error.message.includes("column")) {
          setTableError("Schema Mismatch (Columns Missing)");
          toast.error("Database schema mismatch. Please check your tables.");
        } else {
          console.error('Fetch error:', error);
          toast.error(`Error fetching branches: ${error.message}`);
        }
      } else {
        setTableError(null);
        setBranches(data || []);
        if (isLoading) toast.success("Branches synced successfully!");
      }
    } catch (err) {
      console.error('System error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.location.trim()) {
      alert("Branch Name and Location are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = { 
        name: formData.name.trim(),
        location: formData.location.trim(),
        pastor_in_charge: formData.pastor_in_charge.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null
      };
      
      let error;
      if (editingId) {
        const result = await supabase.from('branches').update(payload).eq('id', editingId);
        error = result.error;
      } else {
        const result = await supabase.from('branches').insert([payload]);
        error = result.error;
      }

      if (error) {
        // If the error is about a missing column during insert/update
        if (error.code === 'PGRST204' || error.message.includes("column")) {
          setTableError("Schema Mismatch (Missing Email or Other Columns)");
          throw new Error("Your database table is out of date. Please run the SQL repair script provided on the screen.");
        }
        if (error.message?.includes('schema cache') || error.message?.includes('not found') || error.message?.includes('Could not find')) {
          setTableError("Table Missing");
          return;
        }
        throw error;
      }

      setIsModalOpen(false);
      setEditingId(null);
      resetForm();
      await fetchBranches();
      alert(editingId ? "Branch updated successfully!" : "New branch created successfully!");
    } catch (error: any) {
      console.error('Submission error:', error);
      alert(error.message || 'Unknown database error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      pastor_in_charge: '',
      phone: '',
      email: '',
    });
  };

  const handleEdit = (branch: Branch) => {
    setEditingId(branch.id);
    setFormData({
      name: branch.name,
      location: branch.location,
      pastor_in_charge: branch.pastor_in_charge || '',
      phone: branch.phone || '',
      email: branch.email || '',
    });
    setIsModalOpen(true);
  };

  const deleteBranch = async (id: string) => {
    if (!confirm('Are you sure you want to delete this branch?')) return;
    
    try {
      const { error } = await supabase.from('branches').delete().eq('id', id);
      if (error) throw error;
      await fetchBranches();
    } catch (error: any) {
      alert(`Error deleting branch: ${error.message}`);
    }
  };

  if (tableError) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white border border-slate-200 p-10 rounded-3xl shadow-xl text-center">
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Database Error: {tableError}</h2>
          <p className="text-slate-500 mb-8 max-w-lg mx-auto font-medium">The system detected that your <code>branches</code> table is either missing or missing the <code>email</code> column. Please run this SQL script to repair it.</p>
          <div className="relative group">
            <pre className="bg-slate-900 text-slate-300 p-6 rounded-2xl text-left text-[11px] font-mono overflow-x-auto h-64 shadow-inner leading-relaxed border border-slate-800">
{`-- CLEAN SLATE: Recreate the branches table with the correct columns
drop table if exists branches cascade;

create table branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null,
  pastor_in_charge text,
  phone text,
  email text,
  created_at timestamp with time zone default now()
);

-- Re-enable security
alter table branches enable row level security;
create policy "Allow all actions for now" on branches for all using (true) with check (true);`}
            </pre>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(`drop table if exists branches cascade; create table branches (id uuid primary key default gen_random_uuid(), name text not null, location text not null, pastor_in_charge text, phone text, email text, created_at timestamp with time zone default now()); alter table branches enable row level security; create policy "Allow all actions for now" on branches for all using (true) with check (true);`);
                alert('Repair script copied to clipboard!');
              }}
              className="absolute top-4 right-4 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg active:scale-95"
            >
              Copy Repair SQL
            </button>
          </div>
          <button 
            onClick={fetchBranches} 
            disabled={isLoading}
            className="mt-8 px-10 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50"
          >
            {isLoading ? "Syncing..." : "I've run the SQL, Sync Now"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Branches Management</h2>
          <p className="text-slate-500 text-sm font-medium">Maintain a registry of all church locations and site leadership.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setEditingId(null); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Add New Branch
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input 
            type="text" 
            placeholder="Search by branch name or location..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={fetchBranches}
          className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
          title="Reload Data"
        >
          <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-widest">
              <tr>
                <th className="px-6 py-4">Branch Name</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Pastor in Charge</th>
                <th className="px-6 py-4">Contact Details</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading && branches.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic text-sm">Synchronizing with server...</td></tr>
              ) : branches.length > 0 ? branches.map((branch) => (
                <tr key={branch.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-xs border border-indigo-100 shadow-inner group-hover:scale-110 transition-transform">
                        {branch.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-bold text-slate-800">{branch.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600 flex items-center gap-1.5 font-medium">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {branch.location}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-indigo-700 px-3 py-1 bg-indigo-50 rounded-lg border border-indigo-100/50">
                      {branch.pastor_in_charge || 'No Leader Assigned'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-slate-600 font-bold">{branch.phone || 'N/A'}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{branch.email || 'No email provided'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-200 transform lg:translate-x-2 lg:group-hover:translate-x-0">
                      <button 
                        onClick={() => handleEdit(branch)} 
                        className="p-2.5 lg:p-2 bg-slate-100 lg:bg-transparent text-slate-500 lg:text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Edit Details"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button 
                        onClick={() => deleteBranch(branch.id)} 
                        className="p-2.5 lg:p-2 bg-slate-100 lg:bg-transparent text-slate-500 lg:text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Delete Branch"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-6 py-24 text-center text-slate-400 italic text-sm font-medium">No branches found. Click "Add Branch" to begin building your network.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300" onClick={() => !isSubmitting && setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 tracking-tight">{editingId ? 'Update Branch' : 'New Branch'}</h3>
                  <p className="text-xs text-slate-500 font-medium">Enter location and leadership details</p>
                </div>
              </div>
              <button 
                disabled={isSubmitting}
                onClick={() => setIsModalOpen(false)} 
                className="p-2 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-50"
              >
                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Branch Name *</label>
                  <input 
                    type="text" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleInputChange} 
                    disabled={isSubmitting}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-bold text-slate-800 placeholder:text-slate-300 disabled:opacity-50" 
                    placeholder="e.g. Faithful House Main Cathedral" 
                    required 
                  />
                </div>
                
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Location / Address *</label>
                  <input 
                    type="text" 
                    name="location" 
                    value={formData.location} 
                    onChange={handleInputChange} 
                    disabled={isSubmitting}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-bold text-slate-800 placeholder:text-slate-300 disabled:opacity-50" 
                    placeholder="e.g. 123 Church Way, City Center" 
                    required 
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Pastor in Charge</label>
                  <input 
                    type="text" 
                    name="pastor_in_charge" 
                    value={formData.pastor_in_charge} 
                    onChange={handleInputChange} 
                    disabled={isSubmitting}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-bold text-slate-800 placeholder:text-slate-300 disabled:opacity-50" 
                    placeholder="Head pastor name" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
                  <input 
                    type="tel" 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleInputChange} 
                    disabled={isSubmitting}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-bold text-slate-800 placeholder:text-slate-300 disabled:opacity-50" 
                    placeholder="+1 (000) 000-0000" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                  <input 
                    type="email" 
                    name="email" 
                    value={formData.email} 
                    onChange={handleInputChange} 
                    disabled={isSubmitting}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-bold text-slate-800 placeholder:text-slate-300 disabled:opacity-50" 
                    placeholder="branch@church.com" 
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  type="button" 
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 py-4 border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Processing...
                    </>
                  ) : (
                    editingId ? 'Update Branch' : 'Create Branch'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchesView;
