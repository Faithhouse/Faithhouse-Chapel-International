
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Branch } from '../types';
import { toast } from 'sonner';
import { MapPin, Map, Target, Activity, Users, ArrowUpRight, ArrowDownRight, Search, Plus, X, Globe, Phone, Mail, Edit2, Trash2 } from 'lucide-react';
import { MapPickerModal } from '../components/MapPickerModal';
import { 
  LineChart, 
  Line, 
  ResponsiveContainer 
} from 'recharts';
import { useMemo } from 'react';

// Added interface for BranchesView props
interface BranchesViewProps {
}

const BranchesView: React.FC<BranchesViewProps> = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    pastor_in_charge: '',
    phone: '',
    email: '',
    gps_address: '',
    latitude: 0,
    longitude: 0,
    maps_url: '',
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
        location: formData.location.trim() || 'Location Pinned',
        pastor_in_charge: formData.pastor_in_charge.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        gps_address: formData.gps_address.trim() || null,
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
        maps_url: formData.maps_url.trim() || null,
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
      gps_address: '',
      latitude: 0,
      longitude: 0,
      maps_url: '',
    });
  };

  const branchStats = useMemo(() => {
    const total = branches.length;
    return {
      total: { value: total, trend: 5, status: 'growth' as const },
      outreach: { value: Math.ceil(total * 1.5), trend: 12, status: 'growth' as const },
      impact: { value: total > 0 ? "85%" : "0%", trend: 3, status: 'neutral' as const },
      growth: { value: "+2", trend: 100, status: 'growth' as const }
    };
  }, [branches]);

  const handleEdit = (branch: Branch) => {
    setEditingId(branch.id);
    setFormData({
      name: branch.name,
      location: branch.location || '',
      pastor_in_charge: branch.pastor_in_charge || '',
      phone: branch.phone || '',
      email: branch.email || '',
      gps_address: branch.gps_address || '',
      latitude: branch.latitude || 0,
      longitude: branch.longitude || 0,
      maps_url: branch.maps_url || '',
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

-- 4. COLUMN REPAIRS (For existing tables)
DO $$ 
BEGIN 
  -- Branches Repairs
  BEGIN ALTER TABLE public.branches ADD COLUMN gps_address TEXT; EXCEPTION WHEN duplicate_column THEN END;
  BEGIN ALTER TABLE public.branches ADD COLUMN maps_url TEXT; EXCEPTION WHEN duplicate_column THEN END;
  BEGIN ALTER TABLE public.branches ADD COLUMN latitude DOUBLE PRECISION; EXCEPTION WHEN duplicate_column THEN END;
  BEGIN ALTER TABLE public.branches ADD COLUMN longitude DOUBLE PRECISION; EXCEPTION WHEN duplicate_column THEN END;
  BEGIN ALTER TABLE public.branches ADD COLUMN pastor_in_charge TEXT; EXCEPTION WHEN duplicate_column THEN END;
  BEGIN ALTER TABLE public.branches ADD COLUMN phone TEXT; EXCEPTION WHEN duplicate_column THEN END;
  BEGIN ALTER TABLE public.branches ADD COLUMN email TEXT; EXCEPTION WHEN duplicate_column THEN END;
END $$;

-- 5. SECURITY (RLS)
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access" ON public.branches;
CREATE POLICY "Allow all access" ON public.branches FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access" ON public.members;
CREATE POLICY "Allow all access" ON public.members FOR ALL USING (true) WITH CHECK (true);

-- 6. SCHEMA REFRESH
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload schema';`;

    return (
      <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white border border-slate-200 p-10 rounded-3xl shadow-xl text-center">
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Database Error: {tableError}</h2>
          <p className="text-slate-500 mb-8 max-w-lg mx-auto font-medium">The system detected that your <code>branches</code> table is either missing or out of sync. Please run this SQL script to repair it.</p>
          <div className="relative group">
            <pre className="bg-slate-900 text-slate-300 p-6 rounded-2xl text-left text-[11px] font-mono overflow-x-auto h-64 shadow-inner leading-relaxed border border-slate-800 whitespace-pre-wrap">
              {repairSQL}
            </pre>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(repairSQL);
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
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-20">
      
      {/* 1. Protocol Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-4xl font-black text-fh-green tracking-tighter uppercase leading-none">Branch Management</h2>
          <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">Global Connectivity Protocol</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setEditingId(null); resetForm(); setIsModalOpen(true); }} className="px-6 md:px-10 py-3 md:py-5 bg-fh-green text-fh-gold rounded-xl md:rounded-[1.75rem] font-black uppercase text-[9px] md:text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all border-b-2 md:border-b-4 border-black/20">
            + Expand Network
          </button>
        </div>
      </div>

      {/* 2. Compact KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-1">
        <KPICard 
          title="Total Branches" 
          value={branchStats.total.value} 
          trend={branchStats.total.trend} 
          icon={<Map />} 
          status={branchStats.total.status}
          sparkline={[5, 8, 12, 10, 15, 12]}
          isLoading={isLoading}
        />
        <KPICard 
          title="Outreach Points" 
          value={branchStats.outreach.value} 
          trend={branchStats.outreach.trend} 
          icon={<Target />} 
          status={branchStats.outreach.status}
          sparkline={[20, 25, 22, 30, 28, 35]}
          isLoading={isLoading}
        />
        <KPICard 
          title="Service Impact" 
          value={branchStats.impact.value} 
          trend={branchStats.impact.trend} 
          icon={<Activity />} 
          status={branchStats.impact.status}
          sparkline={[80, 82, 78, 85, 88, 90]}
          isLoading={isLoading}
        />
        <KPICard 
          title="Monthly Growth" 
          value={branchStats.growth.value} 
          trend={branchStats.growth.trend} 
          icon={<ArrowUpRight />} 
          status={branchStats.growth.status}
          sparkline={[0, 1, 0, 2, 1, 2]}
          isLoading={isLoading}
        />
      </div>

      {/* 3. Search & Discovery */}
      <div className="relative group">
        <div className="absolute left-6 top-1/2 -translate-y-1/2">
          <Search className="w-5 h-5 text-slate-400 group-focus-within:text-fh-green transition-colors" />
        </div>
        <input 
          type="text" 
          placeholder="Locate Branch / Search coordinates..." 
          className="w-full pl-16 pr-8 py-5 md:py-6 bg-white border border-slate-200 rounded-2xl md:rounded-[2rem] font-black uppercase text-[10px] md:text-xs tracking-widest outline-none focus:ring-4 ring-fh-green/5 transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
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
                
                <div className="md:col-span-2 space-y-1.5 relative">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Location / Address *</label>
                  
                  {formData.gps_address ? (
                     <div className="w-full px-5 py-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                              <MapPin className="w-4 h-4" />
                           </div>
                           <div>
                             <p className="text-sm font-bold text-slate-800 line-clamp-1">{formData.location || 'Location Pinned'}</p>
                             <div className="flex items-center gap-2">
                                <p className="text-[10px] font-bold text-indigo-600 tracking-widest">{formData.gps_address}</p>
                                {formData.maps_url && (
                                   <a href={formData.maps_url} target="_blank" rel="noreferrer" className="text-[9px] text-blue-500 hover:underline">View Map</a>
                                )}
                             </div>
                           </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                           <button type="button" onClick={() => setShowMapPicker(true)} className="px-3 py-1.5 bg-white text-slate-600 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50">Edit</button>
                           <button type="button" onClick={() => setFormData(prev => ({ ...prev, location: '', gps_address: '', latitude: 0, longitude: 0, maps_url: '' }))} className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-100">Clear</button>
                        </div>
                     </div>
                   ) : (
                     <button 
                       type="button"
                       onClick={() => setShowMapPicker(true)}
                       className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center gap-3 text-left"
                     >
                       <MapPin className="w-5 h-5 text-indigo-400" />
                       Open Map Picker
                     </button>
                   )}
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
      <MapPickerModal 
        isOpen={showMapPicker} 
        onClose={() => setShowMapPicker(false)} 
        initialCoords={formData.latitude ? { lat: formData.latitude, lng: formData.longitude } : null}
        onConfirm={(locationData) => {
          setFormData(prev => ({
            ...prev,
            latitude: locationData.lat,
            longitude: locationData.lng,
            gps_address: locationData.gps,
            location: locationData.address || prev.location,
            maps_url: locationData.maps_url
          }));
          setShowMapPicker(false);
        }}
      />
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

export default BranchesView;
