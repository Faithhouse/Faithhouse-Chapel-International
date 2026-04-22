import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import {
  Users, UserPlus, Search, ListFilter, MapPin, Phone, 
  Calendar, CheckCircle2, ChevronRight, X, AlertCircle, Clock,
  FileText, Activity, Save, RefreshCw, Trash2, ShieldCheck, Mail
} from 'lucide-react';

import { MapPickerModal } from '../components/MapPickerModal';

const VisitorsRegistryView = ({ setActiveItem, currentUser }: any) => {
  const [activeTab, setActiveTab] = useState<'Directory' | 'Log Visit' | 'Follow Up' | 'Reports'>('Directory');
  const [visitors, setVisitors] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isLogVisitModalOpen, setIsLogVisitModalOpen] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapPickerCoords, setMapPickerCoords] = useState<{lat: number, lng: number} | null>(null);
  const [selectedVisitor, setSelectedVisitor] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [tableError, setTableError] = useState<string | null>(null);

  const [regForm, setRegForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    home_address: '',
    gps_address: '',
    maps_url: '',
    latitude: 0 as number | null,
    longitude: 0 as number | null,
    date_of_first_visit: new Date().toISOString().split('T')[0],
    service_attended: '',
    heard_about_us: 'Friend/Family',
    referred_by_name: '',
    referred_by_contact: '',
    prayer_requests: '',
    membership_interest: 'Maybe',
    welcomed_by: '',
    needs_follow_up: false,
    follow_up_assigned_name: '',
    follow_up_due_date: ''
  });

  const [visitLogForm, setVisitLogForm] = useState({
    visitor_id: '',
    visit_date: new Date().toISOString().split('T')[0],
    service_attended: ''
  });

  const repairSQL = useCallback(async () => {
    try {
      const sql = `
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        CREATE TABLE IF NOT EXISTS visitors (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          visitor_id TEXT NOT NULL,
          full_name TEXT NOT NULL,
          phone TEXT NOT NULL,
          email TEXT,
          home_address TEXT,
          gps_address TEXT,
          maps_url TEXT,
          latitude DOUBLE PRECISION,
          longitude DOUBLE PRECISION,
          date_of_first_visit DATE NOT NULL,
          service_attended TEXT NOT NULL,
          heard_about_us TEXT NOT NULL,
          referred_by_name TEXT,
          referred_by_contact TEXT,
          prayer_requests TEXT,
          membership_interest TEXT DEFAULT 'Maybe',
          welcomed_by TEXT,
          needs_follow_up BOOLEAN DEFAULT false,
          follow_up_assigned_name TEXT,
          follow_up_due_date DATE,
          is_registered_member BOOLEAN DEFAULT false,
          visit_count INTEGER DEFAULT 1,
          last_visit_date DATE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
        );

        CREATE TABLE IF NOT EXISTS visitor_attendance (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          visitor_uuid UUID REFERENCES visitors(id) ON DELETE CASCADE,
          visit_date DATE NOT NULL,
          service_attended TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
        );

        ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
        ALTER TABLE visitor_attendance ENABLE ROW LEVEL SECURITY;

        -- Ensure columns exist if table was created previously
        DO $$ 
        BEGIN 
          BEGIN
            ALTER TABLE visitors ADD COLUMN gps_address TEXT;
          EXCEPTION WHEN duplicate_column THEN END;
          
          BEGIN
            ALTER TABLE visitors ADD COLUMN maps_url TEXT;
          EXCEPTION WHEN duplicate_column THEN END;
          
          BEGIN
            ALTER TABLE visitors ADD COLUMN latitude DOUBLE PRECISION;
          EXCEPTION WHEN duplicate_column THEN END;
          
          BEGIN
            ALTER TABLE visitors ADD COLUMN longitude DOUBLE PRECISION;
          EXCEPTION WHEN duplicate_column THEN END;
          
          BEGIN
            ALTER TABLE visitors ADD COLUMN referred_by_name TEXT;
          EXCEPTION WHEN duplicate_column THEN END;
          
          BEGIN
            ALTER TABLE visitors ADD COLUMN referred_by_contact TEXT;
          EXCEPTION WHEN duplicate_column THEN END;
        END $$;

        DROP POLICY IF EXISTS "Allow all auth on visitors" ON visitors;
        CREATE POLICY "Allow all auth on visitors" ON visitors FOR ALL TO authenticated USING (true) WITH CHECK (true);

        DROP POLICY IF EXISTS "Allow all auth on visitor_attendance" ON visitor_attendance;
        CREATE POLICY "Allow all auth on visitor_attendance" ON visitor_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);

        NOTIFY pgrst, 'reload schema';
      `;
      const { error } = await supabase.rpc('exec_sql', { sql_string: sql });
      if (error && !error.message?.includes('exec_sql')) {
        setTableError(`Failed: ${error.message}`);
      }
    } catch (e: any) {
      console.error(e);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: vData, error: vError } = await supabase.from('visitors').select('*').order('created_at', { ascending: false });
      if (vError && vError.code === '42P01') {
        await repairSQL();
      } else if (vError && vError.message?.includes('column')) {
        // Run repair for missing columns
        await repairSQL();
      }
      
      const { data: vData2 } = await supabase.from('visitors').select('*').order('created_at', { ascending: false });
      setVisitors(vData2 || []);

      const { data: aData } = await supabase.from('visitor_attendance').select('*').order('visit_date', { ascending: false });
      setAttendance(aData || []);

      const { data: eData } = await supabase.from('events').select('id, title, date').order('date', { ascending: false });
      setEvents(eData || []);

      const { data: lData } = await supabase.from('leadership').select('id, first_name, last_name, position');
      setLeaders(lData || []);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [repairSQL]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLocationConfirm = (data: { lat: number; lng: number; address: string; gps: string; maps_url: string }) => {
    setRegForm(prev => ({
      ...prev,
      latitude: data.lat,
      longitude: data.lng,
      home_address: data.address,
      gps_address: data.gps,
      maps_url: data.maps_url
    }));
    setMapPickerCoords({ lat: data.lat, lng: data.lng });
    setShowMapPicker(false);
    toast.success("Location pinned successfully!");
  };

  const handleRegisterVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.full_name || !regForm.phone) {
      toast.error('Name and Phone are required.');
      return;
    }
    
    setIsLoading(true);
    const newVisitorId = `VIS-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const { data: insertedVisitor, error } = await supabase.from('visitors').insert([{
        ...regForm,
        visitor_id: newVisitorId,
        last_visit_date: regForm.date_of_first_visit,
        visit_count: 1
      }]).select().single();

      if (error) throw error;

      // Log initial visit
      await supabase.from('visitor_attendance').insert([{
        visitor_uuid: insertedVisitor.id,
        visit_date: regForm.date_of_first_visit,
        service_attended: regForm.service_attended
      }]);

      toast.success('Visitor registered successfully');
      setRegForm({
        full_name: '', phone: '', email: '', home_address: '', gps_address: '', maps_url: '', latitude: 0, longitude: 0,
        date_of_first_visit: new Date().toISOString().split('T')[0],
        service_attended: 'Sunday Service', heard_about_us: 'Friend/Family', referred_by_name: '', referred_by_contact: '',
        prayer_requests: '', membership_interest: 'Maybe', welcomed_by: '',
        needs_follow_up: false, follow_up_assigned_name: '', follow_up_due_date: ''
      });
      setIsRegisterModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitLogForm.visitor_id) {
      toast.error("Please select a visitor");
      return;
    }

    try {
      const { error } = await supabase.from('visitor_attendance').insert([{
        visitor_uuid: visitLogForm.visitor_id,
        visit_date: visitLogForm.visit_date,
        service_attended: visitLogForm.service_attended
      }]);
      if (error) throw error;

      // Compute new values for visitors table based on locally known data (or we could fetch)
      const visitor = visitors.find(v => v.id === visitLogForm.visitor_id);
      if (visitor) {
        const newCount = visitor.visit_count + 1;
        // if visit_date is greater than last_visit_date, update last_visit_date
        const isNewer = new Date(visitLogForm.visit_date) > (new Date(visitor.last_visit_date || '1970-01-01'));
        
        await supabase.from('visitors').update({
          visit_count: newCount,
          last_visit_date: isNewer ? visitLogForm.visit_date : visitor.last_visit_date
        }).eq('id', visitLogForm.visitor_id);
      }

      toast.success('Visit logged successfully');
      setIsLogVisitModalOpen(false);
      setVisitLogForm({ ...visitLogForm, visitor_id: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleConvertToMember = async (visitor: any) => {
    if (!window.confirm(`Are you sure you want to convert ${visitor.full_name} to a registered member? This will clear their attendance history.`)) {
      return;
    }

    try {
      // 1. Delete their attendance records
      await supabase.from('visitor_attendance').delete().eq('visitor_uuid', visitor.id);
      
      // 2. Set is_registered_member to true in visitors table
      await supabase.from('visitors').update({
        is_registered_member: true,
        membership_interest: 'Yes',
        needs_follow_up: false
      }).eq('id', visitor.id);

      // 3. Add to members table
      const nameParts = visitor.full_name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      await supabase.from('members').insert([{
        first_name: firstName,
        last_name: lastName || 'N/A',
        phone: visitor.phone,
        email: visitor.email || '',
        location_area: visitor.home_address || '',
        status: 'New',
        date_joined: new Date().toISOString().split('T')[0],
        gender: 'Male', // Default, can be updated later
        marital_status: 'Single'
      }]);

      toast.success(`${visitor.full_name} is now marked as a registered member. Attendance history cleared, and they have been added to the church directory.`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Helper arrays for Dashboard / Reports
  const filteredVisitors = visitors.filter(v => 
    v.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    v.phone.includes(searchQuery) || 
    v.visitor_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeVisitors = visitors.filter(v => !v.is_registered_member);
  const followUps = activeVisitors.filter(v => v.needs_follow_up);
  const thirtyDaysNoReturn = activeVisitors.filter(v => {
    if (v.visit_count < 1) return false;
    const lastVisit = new Date(v.last_visit_date);
    const diffTime = Math.abs(new Date().getTime() - lastVisit.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 30;
  });

  return (
    <div className="flex-1 min-h-screen bg-slate-50/50 ml-0 lg:ml-64 transition-all duration-300 flex flex-col relative z-0">
      <div className="flex-1 p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-16 lg:mt-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Visitors Registry</h1>
              </div>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest max-w-md">
              Track and shepherd our guests towards full membership
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
             <button 
                onClick={() => setIsLogVisitModalOpen(true)}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-indigo-600 rounded-2xl text-xs font-black uppercase tracking-widest border border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm"
              >
                <Clock className="w-4 h-4" /> Log Return Visit
             </button>
             <button 
                onClick={() => setIsRegisterModalOpen(true)}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/20 transition-all active:scale-95"
              >
                <UserPlus className="w-4 h-4" /> Guest Intake
             </button>
          </div>
        </div>

        {/* Global Tabs */}
        <div className="bg-white p-2 rounded-[2rem] border border-slate-200/50 shadow-sm inline-flex overflow-x-auto w-full md:w-auto">
          {['Directory', 'Follow Up', 'Reports'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              {tab === 'Directory' && <Users className="w-3.5 h-3.5" />}
              {tab === 'Follow Up' && <Activity className="w-3.5 h-3.5" />}
              {tab === 'Reports' && <FileText className="w-3.5 h-3.5" />}
              {tab}
            </button>
          ))}
        </div>

        {/* Directory View */}
        {activeTab === 'Directory' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex flex-col md:flex-row gap-4">
               <div className="relative flex-1">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                 <input
                   type="text"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   placeholder="Search registry by name, phone or ID..."
                   className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all shadow-sm"
                 />
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                  <div className="col-span-full py-12 text-center text-slate-400">Loading guests...</div>
                ) : filteredVisitors.length > 0 ? (
                  filteredVisitors.map((v, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-lg hover:border-indigo-200 transition-all"
                    >
                      <div className="p-6 border-b border-slate-100/50">
                        <div className="flex justify-between items-start mb-4">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex justify-center items-center font-bold text-indigo-700">
                               {v.full_name[0]}
                             </div>
                             <div>
                               <h3 className="font-bold text-slate-900 leading-tight">{v.full_name}</h3>
                               <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{v.visitor_id}</p>
                             </div>
                           </div>
                           <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${v.is_registered_member ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                             {v.is_registered_member ? 'Member' : 'Guest'}
                           </span>
                        </div>

                        <div className="space-y-2 mt-4 text-xs font-medium text-slate-600">
                          <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> {v.phone}</div>
                          {v.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /> {v.email}</div>}
                          <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {v.home_address || 'No address'}</div>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-slate-50 flex items-center justify-between text-xs mt-auto">
                        <div className="font-bold text-slate-500 uppercase tracking-widest text-[9px]">
                          Visits: <span className="text-indigo-600 text-xs">{v.visit_count}</span>
                        </div>
                        <div className="font-bold text-slate-500 uppercase tracking-widest text-[9px]">
                          Last: <span className="text-slate-800">{new Date(v.last_visit_date).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {!v.is_registered_member && (
                        <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                             onClick={() => handleConvertToMember(v)}
                             className="text-[10px] flex items-center gap-1 font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700"
                           >
                             <ShieldCheck className="w-3 h-3" /> Mark as Member
                           </button>
                        </div>
                      )}
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">No visitors found</h3>
                  </div>
                )}
             </div>
          </div>
        )}

        {/* Follow Up Tab */}
        {activeTab === 'Follow Up' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Active Follow-ups</h3>
             </div>
             <div className="divide-y divide-slate-50">
               {followUps.length > 0 ? followUps.map((v, i) => (
                 <div key={i} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                       <AlertCircle className="w-6 h-6" />
                     </div>
                     <div>
                       <h4 className="font-bold text-slate-900">{v.full_name}</h4>
                       <p className="text-xs text-slate-500 mt-1">Assigned to: {v.follow_up_assigned_name || 'Unassigned'}</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-6">
                      <div className="text-right">
                         <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Due Date</p>
                         <p className="text-sm font-bold text-slate-800">{v.follow_up_due_date ? new Date(v.follow_up_due_date).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <button className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold shadow-sm hover:bg-slate-50">View Details</button>
                   </div>
                 </div>
               )) : (
                 <div className="py-12 text-center text-slate-400 text-sm italic">
                   No pending follow-ups.
                 </div>
               )}
             </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'Reports' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center">
                 <h4 className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2">Total Registry</h4>
                 <p className="text-4xl font-black text-indigo-600">{visitors.length}</p>
               </div>
               <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center border-emerald-100">
                 <h4 className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 mb-2">Converted to Members</h4>
                 <p className="text-4xl font-black text-emerald-600">{visitors.filter(v => v.is_registered_member).length}</p>
               </div>
               <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center border-amber-100">
                 <h4 className="text-[10px] uppercase font-bold tracking-widest text-amber-400 mb-2">30+ Days No Return</h4>
                 <p className="text-4xl font-black text-amber-600">{thirtyDaysNoReturn.length}</p>
               </div>
             </div>

             <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
               <h3 className="font-bold text-slate-800 mb-4">Guests Missing 30+ Days</h3>
               {thirtyDaysNoReturn.length > 0 ? (
                 <ul className="space-y-3">
                   {thirtyDaysNoReturn.map(v => (
                     <li key={v.id} className="text-sm font-medium text-slate-600 flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                       <span>{v.full_name} <br/><span className="text-[10px] text-slate-400">{v.phone}</span></span>
                       <span className="text-xs text-amber-600 font-bold">Last seen: {new Date(v.last_visit_date).toLocaleDateString()}</span>
                     </li>
                   ))}
                 </ul>
               ) : (
                 <p className="text-sm text-slate-400 italic">None currently.</p>
               )}
             </div>
          </div>
        )}
      </div>

      {/* Guest Intake Modal */}
      <AnimatePresence>
        {isRegisterModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
             >
               <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
                 <div>
                   <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Guest Intake Form</h2>
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Register a new visitor</p>
                 </div>
                 <button onClick={() => setIsRegisterModalOpen(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 shadow-sm border border-slate-200 transition-all">
                   <X className="w-5 h-5" />
                 </button>
               </div>
               
               <form onSubmit={handleRegisterVisitor} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Full Name *</label>
                     <input type="text" required value={regForm.full_name} onChange={e => setRegForm({...regForm, full_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none" />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Phone Number *</label>
                     <input type="tel" required value={regForm.phone} onChange={e => setRegForm({...regForm, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none" />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email Address (Optional)</label>
                     <input type="email" value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none" />
                   </div>
                   <div className="space-y-2 md:col-span-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Home Address (Optional)</label>
                     <div className="flex gap-2">
                       <input type="text" value={regForm.home_address} onChange={e => setRegForm({...regForm, home_address: e.target.value})} placeholder="Physical address..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none" />
                       <button type="button" onClick={() => setShowMapPicker(true)} className="shrink-0 px-4 py-3 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center gap-2">
                         <MapPin className="w-4 h-4" /> Pin Map
                       </button>
                     </div>
                     {regForm.latitude !== 0 && regForm.longitude !== 0 && regForm.latitude !== null && (
                       <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center justify-between mt-2">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                             <CheckCircle2 className="w-4 h-4" />
                           </div>
                           <div>
                             <p className="text-xs font-bold text-emerald-800">Location Pinned ✓</p>
                             <p className="text-[10px] font-black tracking-widest uppercase text-emerald-600/70">{regForm.gps_address}</p>
                           </div>
                         </div>
                         <div className="flex items-center gap-2">
                           <a href={regForm.maps_url} target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 underline">Preview &rarr;</a>
                           <button type="button" onClick={() => {
                             setRegForm(prev => ({...prev, latitude: null, longitude: null, maps_url: '', gps_address: ''}));
                             setMapPickerCoords(null);
                           }} className="w-6 h-6 flex items-center justify-center text-emerald-500 hover:text-rose-500 hover:bg-white rounded-full transition-colors ml-2">
                             <X className="w-3.5 h-3.5" />
                           </button>
                         </div>
                       </div>
                     )}
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Date of First Visit *</label>
                     <input type="date" required value={regForm.date_of_first_visit} onChange={e => setRegForm({...regForm, date_of_first_visit: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none" />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Service Attended *</label>
                     <select value={regForm.service_attended} onChange={e => setRegForm({...regForm, service_attended: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none">
                        <option value="">-- Select Event --</option>
                        {events.map(ev => <option key={ev.id} value={ev.title}>{ev.title}</option>)}
                        <option>Sunday Service</option>
                        <option>Mid-week Service</option>
                        <option>Special Event</option>
                     </select>
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Heard About Us Via *</label>
                     <select value={regForm.heard_about_us} onChange={e => setRegForm({...regForm, heard_about_us: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none">
                        <option>Friend/Family</option>
                        <option>Social Media</option>
                        <option>Flyer/Invitation</option>
                        <option>Walk-in</option>
                        <option>Other</option>
                     </select>
                   </div>
                   {['Friend/Family', 'Other'].includes(regForm.heard_about_us) && (
                     <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                       <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Referred By (Name)</label>
                         <input type="text" value={regForm.referred_by_name} onChange={e => setRegForm({...regForm, referred_by_name: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none" />
                       </div>
                       <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Referred By (Contact)</label>
                         <input type="text" value={regForm.referred_by_contact} onChange={e => setRegForm({...regForm, referred_by_contact: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none" />
                       </div>
                     </div>
                   )}
                   <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Interest in Membership *</label>
                     <select value={regForm.membership_interest} onChange={e => setRegForm({...regForm, membership_interest: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none">
                        <option>Maybe</option>
                        <option>Yes</option>
                        <option>No</option>
                     </select>
                   </div>
                 </div>

                 <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Prayer Requests (Optional)</label>
                   <textarea rows={3} value={regForm.prayer_requests} onChange={e => setRegForm({...regForm, prayer_requests: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none resize-none"></textarea>
                 </div>
                 
                 <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Welcomed By (Name/Team)</label>
                   <input type="text" value={regForm.welcomed_by} onChange={e => setRegForm({...regForm, welcomed_by: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none" />
                 </div>

                 {/* Follow UP Flag */}
                 <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl space-y-4">
                   <div className="flex items-center gap-3">
                     <input type="checkbox" id="needsFU" checked={regForm.needs_follow_up} onChange={e => setRegForm({...regForm, needs_follow_up: e.target.checked})} className="w-5 h-5 text-amber-600 border-amber-300 rounded focus:ring-amber-500" />
                     <label htmlFor="needsFU" className="text-sm font-bold text-amber-900">Flag for Follow-Up</label>
                   </div>
                   
                   <AnimatePresence>
                     {regForm.needs_follow_up && (
                       <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden pt-2">
                         <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase tracking-widest text-amber-700">Assign To (Leader)</label>
                           <select value={regForm.follow_up_assigned_name} onChange={e => setRegForm({...regForm, follow_up_assigned_name: e.target.value})} className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600 transition-all outline-none">
                             <option value="">-- Choose Leader --</option>
                             {leaders.map(l => <option key={l.id} value={`${l.first_name} ${l.last_name}`}>{l.first_name} {l.last_name} ({l.position})</option>)}
                           </select>
                         </div>
                         <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase tracking-widest text-amber-700">Due Date</label>
                           <input type="date" value={regForm.follow_up_due_date} onChange={e => setRegForm({...regForm, follow_up_due_date: e.target.value})} className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600 transition-all outline-none" />
                         </div>
                       </motion.div>
                     )}
                   </AnimatePresence>
                 </div>

                 <div className="pt-4 border-t border-slate-100 flex justify-end">
                   <button type="submit" disabled={isLoading} className="px-8 py-4 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 active:scale-95 transition-all w-full md:w-auto shadow-lg shadow-indigo-600/20">
                     {isLoading ? 'Saving...' : 'Save Visitor Profile'}
                   </button>
                 </div>
               </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Log Return Visit Modal */}
      <AnimatePresence>
        {isLogVisitModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
             >
               <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div>
                   <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Log Return Visit</h2>
                 </div>
                 <button onClick={() => setIsLogVisitModalOpen(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 shadow-sm border border-slate-200 transition-all">
                   <X className="w-5 h-5" />
                 </button>
               </div>
               
               <form onSubmit={handleLogVisit} className="p-6 md:p-8 space-y-6">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Select Visitor by Name/Phone</label>
                   <select 
                     required
                     value={visitLogForm.visitor_id} 
                     onChange={e => setVisitLogForm({...visitLogForm, visitor_id: e.target.value})} 
                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none"
                   >
                     <option value="">-- Choose Guest --</option>
                     {activeVisitors.map(v => (
                       <option key={v.id} value={v.id}>{v.full_name} ({v.phone})</option>
                     ))}
                   </select>
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Date of Visit *</label>
                   <input type="date" required value={visitLogForm.visit_date} onChange={e => setVisitLogForm({...visitLogForm, visit_date: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Service Attended *</label>
                   <select value={visitLogForm.service_attended} onChange={e => setVisitLogForm({...visitLogForm, service_attended: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none">
                      <option value="">-- Select Event --</option>
                      {events.map(ev => <option key={ev.id} value={ev.title}>{ev.title}</option>)}
                      <option>Sunday Service</option>
                      <option>Mid-week Service</option>
                      <option>Special Event</option>
                   </select>
                 </div>
                 <div className="pt-4 border-t border-slate-100 flex justify-end">
                   <button type="submit" disabled={isLoading} className="px-8 py-4 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 active:scale-95 transition-all w-full shadow-lg shadow-indigo-600/20">
                     Log Visit
                   </button>
                 </div>
               </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <MapPickerModal
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onConfirm={handleLocationConfirm}
        initialCoords={mapPickerCoords}
      />
    </div>
  );
};

export default VisitorsRegistryView;
