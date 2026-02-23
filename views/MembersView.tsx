
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Member, Branch, UserProfile } from '../types';

interface MembersViewProps {
  userProfile: UserProfile | null;
  onSelectMember?: (id: string) => void;
}

const MembersView: React.FC<MembersViewProps> = ({ userProfile, onSelectMember }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taggingId, setTaggingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);

  // Custom Messaging UI (Bypass Sandbox Blocks)
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  // Bulk Messaging State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMessengerOpen, setIsMessengerOpen] = useState(false);
  const [messengerIndex, setMessengerIndex] = useState(0);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [templateType, setTemplateType] = useState('Custom');

  // Import Wizard State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<'File' | 'Paste'>('File');
  const [rawImportData, setRawImportData] = useState('');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [skipHeader, setSkipHeader] = useState(false);

  // Duplicate Resolution State
  const [isDeDupModalOpen, setIsDeDupModalOpen] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<Member[][]>([]);
  const [isPurging, setIsPurging] = useState(false);
  const [showDeleteFinalConfirm, setShowDeleteFinalConfirm] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    gender: 'Male',
    phone: '',
    email: '',
    gps_address: '',
    dob: '',
    date_joined: new Date().toISOString().split('T')[0],
    branch_id: '',
    ministry: 'N/A',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    notify_birthday: true,
    notify_events: true,
    status: 'Active' as Member['status']
  });

  useEffect(() => {
    fetchInitialData();
  }, [statusFilter, searchTerm]);

  const showNotify = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchInitialData = async () => {
    setIsLoading(true);
    setTableMissing(false);
    try {
      const { data: branchData } = await supabase
        .from('branches')
        .select('*')
        .order('name');

      const loadedBranches = branchData || [];
      setBranches(loadedBranches);

      let query = supabase
        .from('members')
        .select('*, branches(*)')
        .order('first_name', { ascending: true });

      if (statusFilter !== 'All') {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm) {
        query = query.or(
          `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,gps_address.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        if (error.code === '42P01' || error.message.includes('not found') || error.code === 'PGRST205' || error.message.includes('schema cache') || error.message.includes('Could not find')) {
          setTableMissing(true);
        } else {
          throw error;
        }
      } else {
        setTableMissing(null);
        setMembers(data || []);
      }
    } catch (err) {
      console.error("Registry Sync Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (tableMissing) {
    const repairSQL = `-- MASTER REGISTRY DATABASE REPAIR SCRIPT
-- Ensure branches table exists first
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  pastor_in_charge TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create members table
CREATE TABLE IF NOT EXISTS public.members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  gender TEXT DEFAULT 'Male',
  dob DATE,
  date_joined DATE,
  branch_id UUID REFERENCES public.branches(id),
  status TEXT DEFAULT 'Active',
  ministry TEXT DEFAULT 'N/A',
  gps_address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notify_birthday BOOLEAN DEFAULT true,
  notify_events BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for staff" ON public.branches;
CREATE POLICY "Allow all for staff" ON public.branches FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for staff" ON public.members;
CREATE POLICY "Allow all for staff" ON public.members FOR ALL USING (true) WITH CHECK (true);`;

    return (
      <div className="max-w-4xl mx-auto py-12 px-4 animate-in zoom-in-95 duration-500">
        <div className="royal-card p-12 md:p-16 rounded-[4rem] bg-white text-center border-2 border-rose-100 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 inset-x-0 h-2 bg-rose-500"></div>
          <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-inner">
             <svg className="w-12 h-12 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase mb-4 tracking-tighter">Membership Registry Inaccessible</h2>
          <p className="text-slate-500 mb-10 font-medium max-w-lg mx-auto leading-relaxed">
            The congregant database is missing. Run the restoration script to establish connectivity.
          </p>
          <pre className="bg-slate-900 text-fh-gold-pale p-8 rounded-[2rem] text-[10px] font-mono text-left h-48 overflow-y-auto mb-10 shadow-inner leading-relaxed border border-fh-gold/10 scrollbar-hide">
            {repairSQL}
          </pre>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => { navigator.clipboard.writeText(repairSQL); alert('SQL Script copied.'); }} className="px-10 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Copy Script</button>
            <button onClick={fetchInitialData} className="px-16 py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all border-b-4 border-black">Verify Restoration</button>
          </div>
        </div>
      </div>
    );
  }

  // --- DUPLICATE RESOLUTION LOGIC ---

  const findRegistryDuplicates = () => {
    const groups: Record<string, Member[]> = {};
    members.forEach(m => {
      const fName = m.first_name.trim().toLowerCase();
      const lName = (m.last_name || '').trim().toLowerCase();
      const key = `${fName}_${lName}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });

    const identified = Object.values(groups).filter(group => group.length > 1);
    setDuplicateGroups(identified);
    setShowDeleteFinalConfirm(false);
    setIsDeDupModalOpen(true);
  };

  const handleMasterDelete = async () => {
    setIsPurging(true);
    try {
      const idsToDelete: string[] = [];
      duplicateGroups.forEach(group => {
        // Sort by created_at descending (keep the newest)
        const sorted = [...group].sort((a, b) => {
          const dateA = a.created_at || '';
          const dateB = b.created_at || '';
          return dateB.localeCompare(dateA);
        });
        
        // Keep the newest (index 0), collect others for deletion
        const redundant = sorted.slice(1).map(m => m.id);
        idsToDelete.push(...redundant);
      });

      if (idsToDelete.length > 0) {
        const { error } = await supabase.from('members').delete().in('id', idsToDelete);
        if (error) {
          if (error.code === '23503') {
            throw new Error("Integrity Violation: Some redundant profiles are linked to attendance or financial logs and cannot be deleted until merged.");
          }
          throw error;
        }
      }

      showNotify(`Success: ${idsToDelete.length} records deleted.`);
      setIsDeDupModalOpen(false);
      await fetchInitialData();
    } catch (err: any) {
      showNotify(`Delete Failure: ${err.message}`, 'error');
    } finally {
      setIsPurging(false);
      setShowDeleteFinalConfirm(false);
    }
  };

  const scrubImportBuffer = () => {
    const seen = new Set();
    const unique = parsedData.filter(item => {
      const key = `${item.first_name.trim().toLowerCase()}_${item.last_name.trim().toLowerCase()}`;
      const isDuplicate = seen.has(key);
      seen.add(key);
      return !isDuplicate;
    });
    const removedCount = parsedData.length - unique.length;
    setParsedData(unique);
    showNotify(`Buffer Scoped: ${removedCount} duplicates removed.`);
  };

  // --- IMPORT LOGIC ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      processRawData(text);
    };
    reader.readAsText(file);
  };

  const processRawData = (text: string) => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(line => line !== '');
    if (lines.length < 1) return;
    const dataLines = skipHeader ? lines.slice(1) : lines;
    const firstLine = lines[0];
    let delimiter = '';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(',')) delimiter = ',';

    const results = dataLines.map(line => {
      let firstName = '';
      let lastName = '';
      let phone = '';
      let email = '';
      let gender = 'Male';

      if (delimiter) {
        const parts = line.split(delimiter).map(p => p.trim());
        firstName = parts[0] || '';
        lastName = parts[1] || '';
        phone = parts[2] || '';
        email = parts[3] || '';
        gender = parts[4] || 'Male';
      } else {
        const nameParts = line.split(/\s+/);
        if (nameParts.length > 1) {
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' ');
        } else {
          firstName = nameParts[0] || '';
          lastName = '';
        }
      }

      return {
        first_name: firstName,
        last_name: lastName || 'Member',
        phone: phone || null,
        email: email || null,
        gender: gender || 'Male',
        branch_id: branches[0]?.id || null,
        status: 'Active'
      };
    });
    setParsedData(results);
  };

  const handleBulkCommit = async () => {
    if (parsedData.length === 0) return;
    const defaultBranchId = branches[0]?.id;
    if (!defaultBranchId) return showNotify("Branch Context Error: No operational branches detected.", "error");

    setIsImporting(true);
    try {
      const validData = parsedData
        .filter(d => d.first_name && d.first_name.length > 0)
        .map(d => ({ ...d, branch_id: d.branch_id || defaultBranchId }));

      const { error } = await supabase.from('members').insert(validData);
      if (error) throw error;

      showNotify(`Relay Success: ${validData.length} congregants added.`);
      setIsImportModalOpen(false);
      setParsedData([]);
      setRawImportData('');
      await fetchInitialData();
    } catch (err: any) {
      showNotify(`Commit Error: ${err.message}`, "error");
    } finally {
      setIsImporting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const resetForm = (status: Member['status'] = 'Active') => {
    setEditingId(null);
    setFormData({
      first_name: '', last_name: '', gender: 'Male', phone: '', email: '', gps_address: '', dob: '',
      date_joined: new Date().toISOString().split('T')[0], branch_id: branches[0]?.id || '', ministry: 'N/A',
      emergency_contact_name: '', emergency_contact_phone: '', notify_birthday: true, notify_events: true, status
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.branch_id) return showNotify('Branch assignment is mandatory.', 'error');
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        email: formData.email.trim() || null,
        dob: formData.dob || null,
        date_joined: formData.date_joined || null,
        gps_address: formData.gps_address.trim() || null,
      };

      let error;
      if (editingId) {
        const result = await supabase.from('members').update(payload).eq('id', editingId);
        error = result.error;
      } else {
        const result = await supabase.from('members').insert([payload]);
        error = result.error;
      }

      if (error) throw error;
      showNotify(editingId ? "Profile Updated." : "Registration Successful.");
      setIsModalOpen(false);
      resetForm();
      fetchInitialData();
    } catch (err: any) {
      if (err.message?.includes('schema cache') || err.message?.includes('not found') || err.message?.includes('Could not find')) {
        setTableMissing(true);
      } else {
        showNotify(err.message, 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openVisitorIntake = () => {
    resetForm('Visitor');
    setIsModalOpen(true);
  };

  const handleWhatsAppOutreach = (phone: string | undefined, firstName: string) => {
    if (!phone) return showNotify("Relay Error: No phone number associated.", 'error');
    const cleanPhone = phone.replace(/\D/g, '');
    const msg = `Shalom ${firstName}! 🕊️ Greetings from Faithhouse Chapel International. Checking in and praying for you!`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === members.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(members.map(m => m.id));
    }
  };

  const applyTemplate = (type: string) => {
    setTemplateType(type);
    const m = getMessengerMember();
    const firstName = m?.first_name || '[Name]';
    switch (type) {
      case 'Service Reminder':
        setBroadcastMessage(`Shalom ${firstName}! 🕊️ Tomorrow at 9 AM. Join us for service at Faithhouse!`);
        break;
      case 'Announcement':
        setBroadcastMessage(`Greetings ${firstName}! 🕊️ Official Update from Faithhouse Chapel: [Details].`);
        break;
      default:
        setBroadcastMessage('');
    }
  };

  const getMessengerMember = () => {
    const id = selectedIds[messengerIndex];
    return members.find(m => m.id === id);
  };

  const dispatchCurrentAndNext = () => {
    // Correcting the function name from getBroadcastMember to getMessengerMember
    const member = getMessengerMember();
    if (!member?.phone) {
      showNotify(`Skipping ${member?.first_name || 'Member'} - Contact Missing.`, 'error');
      advanceMessenger();
      return;
    }
    const cleanPhone = member.phone.replace(/\D/g, '');
    let finalMsg = broadcastMessage;
    finalMsg = finalMsg.replace(/Shalom (.*?)!/, `Shalom ${member.first_name}!`);
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(finalMsg)}`, '_blank');
    advanceMessenger();
  };

  const advanceMessenger = () => {
    if (messengerIndex < selectedIds.length - 1) {
      setMessengerIndex(prev => prev + 1);
    } else {
      setIsMessengerOpen(false);
      setSelectedIds([]);
      setMessengerIndex(0);
      showNotify("Outreach Complete.");
    }
  };

  const quickGeoTag = (memberId: string) => {
    if (!navigator.geolocation) return showNotify("Geo-relay blocked.", 'error');
    setTaggingId(memberId);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        try {
          const { error } = await supabase.from('members').update({ gps_address: coords }).eq('id', memberId);
          if (error) throw error;
          fetchInitialData();
          showNotify("Coordinate Synced.");
        } catch (err: any) {
          showNotify(err.message, 'error');
        } finally {
          setTaggingId(null);
        }
      },
      () => {
        showNotify("Access Denied.", 'error');
        setTaggingId(null);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20 relative">
      
      {/* GLOBAL OVERLAY NOTIFICATION */}
      {notification && (
        <div className={`fixed top-10 right-10 z-[300] px-8 py-5 rounded-[2rem] shadow-2xl animate-in slide-in-from-right-10 flex items-center gap-4 border-b-4 border-black/20 ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
           <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d={notification.type === 'success' ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'} /></svg>
           </div>
           <p className="text-[11px] font-black uppercase tracking-widest">{notification.msg}</p>
        </div>
      )}

      {/* Module Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-1 text-center md:text-left">
          <h2 className="text-4xl font-black text-fh-green tracking-tighter uppercase leading-none">Membership Registry</h2>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-2">Global Identity • Branch Distribution Active</p>
        </div>
        <div className="flex flex-wrap justify-center md:justify-end gap-4">
           <button onClick={findRegistryDuplicates} className="px-6 py-5 bg-white border border-slate-200 text-rose-500 rounded-[1.75rem] font-black uppercase text-[10px] tracking-widest shadow-sm hover:bg-rose-50 active:scale-95 transition-all flex items-center gap-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Resolve Conflicts
           </button>
           <button onClick={() => setIsImportModalOpen(true)} className="px-6 py-5 bg-white border border-slate-200 text-slate-600 rounded-[1.75rem] font-black uppercase text-[10px] tracking-widest shadow-sm hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-3">
              <svg className="w-4 h-4 text-fh-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Bulk Import
           </button>
           {selectedIds.length > 0 && (
             <button onClick={() => { setMessengerIndex(0); setTemplateType('Service Reminder'); applyTemplate('Service Reminder'); setIsMessengerOpen(true); }} className="px-8 py-5 bg-emerald-500 text-white rounded-[1.75rem] font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl active:scale-95 transition-all border-b-4 border-black/30 flex items-center gap-3">
               <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 448 512"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.6-30.6-37.9-3.2-5.5-.3-8.5 2.5-11.2 2.5-2.5 5.5-6.5 8.3-9.7 2.8-3.3 3.7-5.6 5.6-9.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.3 5.7 23.6 9.2 31.7 11.7 13.3 4.2 25.5 3.6 35.1 2.2 10.7-1.5 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
               Broadcast ({selectedIds.length})
             </button>
           )}
           <button onClick={openVisitorIntake} className="px-8 py-5 bg-cms-purple text-white rounded-[1.75rem] font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl active:scale-95 transition-all border-b-4 border-black/30">
            + Visitor Intake
          </button>
          <button onClick={() => { resetForm('Active'); setIsModalOpen(true); }} className="px-10 py-5 bg-fh-green text-fh-gold rounded-[1.75rem] font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl active:scale-95 transition-all border-b-4 border-black/30">
            + Register Member
          </button>
        </div>
      </div>

      {/* Unified Search & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative group">
          <svg className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Search Identity or GPS Registry..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-6 py-6 bg-white border border-slate-100 rounded-[2rem] font-black text-xs uppercase tracking-tight focus:ring-8 focus:ring-fh-gold/5 focus:border-fh-gold outline-none transition-all shadow-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-8 py-6 bg-white border border-slate-100 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] outline-none transition-all shadow-sm cursor-pointer hover:bg-slate-50 appearance-none text-slate-800"
        >
          <option value="All">All Membership Tiers</option>
          <option>Active</option>
          <option>Visitor</option>
          <option>Probation</option>
          <option>Inactive</option>
        </select>
      </div>

      {/* Registry Ledger */}
      <div className="cms-card cms-card-blue bg-white rounded-[3.5rem] overflow-hidden border-none shadow-sm">
        <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
           <div className="flex items-center gap-6">
             <input 
               type="checkbox" 
               checked={selectedIds.length === members.length && members.length > 0} 
               onChange={toggleSelectAll}
               className="w-6 h-6 rounded-lg border-2 border-slate-200 text-fh-green focus:ring-fh-green cursor-pointer"
             />
             <h3 className="text-sm font-black text-fh-green uppercase tracking-widest leading-none">Member Data Repository</h3>
           </div>
           <span className="px-5 py-1.5 bg-white border border-slate-200 rounded-full text-[9px] font-black text-fh-green uppercase shadow-sm">{members.length} Logged</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100">
              <tr>
                <th className="px-10 py-6">Select</th>
                <th className="px-10 py-6">Identity Profile</th>
                <th className="px-10 py-6">Relay Contact</th>
                <th className="px-10 py-6">GPS / Location</th>
                <th className="px-10 py-6">Tier</th>
                <th className="px-10 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={6} className="px-10 py-32 text-center animate-pulse text-slate-300 font-black uppercase tracking-[0.5em]">Synchronizing Registry...</td></tr>
              ) : members.length > 0 ? (
                members.map(m => (
                  <tr key={m.id} className={`hover:bg-slate-50/50 transition-all group text-xs ${selectedIds.includes(m.id) ? 'bg-emerald-50/30' : ''}`}>
                    <td className="px-10 py-6">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(m.id)} 
                        onChange={() => toggleSelect(m.id)}
                        className="w-5 h-5 rounded-md border-2 border-slate-200 text-fh-green focus:ring-fh-green cursor-pointer"
                      />
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-slate-900 text-fh-gold rounded-[1.5rem] flex items-center justify-center font-black text-xs border border-white/10 shadow-lg group-hover:scale-110 transition-transform">
                          {m.first_name[0]}{(m.last_name || '')[0]}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 uppercase leading-none mb-2 tracking-tight">{m.first_name} {m.last_name}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{m.gender} • {m.branches?.name || 'Main Campus'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-black text-slate-700 mb-1">{m.phone || '---'}</p>
                          <p className="text-[10px] font-bold text-slate-400 lowercase">{m.email || 'no-relay'}</p>
                        </div>
                        {m.phone && (
                          <button onClick={() => handleWhatsAppOutreach(m.phone, m.first_name)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 448 512"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.6-30.6-37.9-3.2-5.5-.3-8.5 2.5-11.2 2.5-2.5 5.5-6.5 8.3-9.7 2.8-3.3 3.7-5.6 5.6-9.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.3 5.7 23.6 9.2 31.7 11.7 13.3 4.2 25.5 3.6 35.1 2.2 10.7-1.5 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-10 py-6">
                       {m.gps_address ? (
                         <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-cms-blue text-[9px] font-black uppercase tracking-widest rounded-lg border border-blue-100">{m.gps_address}</span>
                       ) : (
                         <button onClick={() => quickGeoTag(m.id)} className="px-3 py-2 bg-slate-100 text-slate-400 text-[8px] font-black uppercase tracking-widest rounded-lg border border-slate-200 hover:bg-cms-blue hover:text-white transition-all">Tag Location</button>
                       )}
                    </td>
                    <td className="px-10 py-6">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                        m.status === 'Active' ? 'bg-emerald-50 text-cms-emerald border-emerald-100' :
                        m.status === 'Visitor' ? 'bg-purple-50 text-cms-purple border-purple-100' : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right">
                       <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => onSelectMember?.(m.id)}
                            className="p-3 bg-slate-100 hover:bg-slate-900 text-slate-500 hover:text-fh-gold rounded-xl shadow-sm"
                            title="View Profile"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                          <button onClick={() => { 
                            setEditingId(m.id); 
                            setFormData({
                              first_name: m.first_name,
                              last_name: m.last_name || '',
                              gender: m.gender || 'Male',
                              phone: m.phone || '',
                              email: m.email || '',
                              gps_address: m.gps_address || '',
                              dob: m.dob || '',
                              date_joined: m.date_joined || '',
                              branch_id: m.branch_id || '',
                              ministry: m.ministry || 'N/A',
                              emergency_contact_name: m.emergency_contact_name || '',
                              emergency_contact_phone: m.emergency_contact_phone || '',
                              notify_birthday: m.notify_birthday ?? true,
                              notify_events: m.notify_events ?? true,
                              status: m.status
                            }); 
                            setIsModalOpen(true); 
                          }} className="p-3 bg-slate-100 hover:bg-slate-900 text-slate-500 hover:text-fh-gold rounded-xl shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                       </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="px-10 py-40 text-center text-slate-300 italic text-[10px] font-black uppercase tracking-[0.5em]">The Registry is blank.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MESSENGER MODAL */}
      {isMessengerOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-2xl animate-in fade-in" onClick={() => setIsMessengerOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden border-b-[16px] border-emerald-500 animate-in zoom-in-95">
             <div className="p-12">
                <div className="flex items-center justify-between mb-10">
                   <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center shadow-xl">
                         <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                      </div>
                      <div>
                         <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Messenger Hub</h4>
                         <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.4em] mt-2">Bulk Outreach Deployment</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{messengerIndex + 1} of {selectedIds.length}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Queue Progress</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                   <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Select Template</p>
                      {['Service Reminder', 'Announcement'].map(t => (
                        <button key={t} onClick={() => applyTemplate(t)} className={`w-full py-4 px-6 rounded-2xl text-[9px] font-black uppercase tracking-widest text-left border transition-all ${templateType === t ? 'bg-fh-green text-fh-gold border-fh-green shadow-lg' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                           {t}
                        </button>
                      ))}
                   </div>
                   <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Message Preview</p>
                      <textarea 
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        className="w-full h-40 p-6 bg-slate-50 border border-slate-200 rounded-3xl font-bold text-xs text-slate-600 shadow-inner resize-none outline-none"
                      />
                   </div>
                </div>

                <div className="bg-slate-950 p-10 rounded-[3rem] border border-white/5 mb-10 flex items-center gap-8 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
                   <div className="w-20 h-20 bg-fh-gold rounded-2xl flex items-center justify-center font-black text-fh-green text-lg shadow-xl shadow-fh-gold/10">
                      {getMessengerMember()?.first_name?.[0]}{getMessengerMember()?.last_name?.[0]}
                   </div>
                   <div>
                      <p className="text-xl font-black text-white uppercase tracking-tight leading-none mb-2">{getMessengerMember()?.first_name} {getMessengerMember()?.last_name}</p>
                      <p className="text-[10px] text-fh-gold font-bold uppercase tracking-widest">{getMessengerMember()?.phone || 'No Phone Number'}</p>
                   </div>
                </div>

                <div className="flex gap-4">
                   <button onClick={() => setIsMessengerOpen(false)} className="flex-1 py-6 bg-slate-100 text-slate-400 rounded-3xl font-black uppercase text-[11px] tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                   <button onClick={dispatchCurrentAndNext} className="flex-[2] py-6 bg-emerald-500 text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-[0.4em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4">
                      Dispatch & Next
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* REGISTRY DE-DUPLICATION OVERLAY MODAL */}
      {isDeDupModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-3xl animate-in fade-in" onClick={() => !isPurging && setIsDeDupModalOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden border-b-[16px] border-rose-500 animate-in zoom-in-95">
             <div className="p-12">
                <div className="flex items-center gap-6 mb-10">
                   <div className="w-16 h-16 bg-rose-500 text-white rounded-[2rem] flex items-center justify-center shadow-xl">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                   </div>
                   <div>
                      <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Maintenance Engine</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em] mt-2">Conflict Identification & Master Delete</p>
                   </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-[3rem] p-8 mb-10 max-h-[400px] overflow-y-auto shadow-inner">
                   {!showDeleteFinalConfirm ? (
                     duplicateGroups.length > 0 ? (
                       <div className="space-y-6">
                         <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-4 text-center">Protocol has identified {duplicateGroups.length} redundant clusters.</p>
                         {duplicateGroups.map((group, idx) => (
                           <div key={idx} className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
                              <div className="flex items-center justify-between mb-4">
                                 <p className="text-sm font-black text-slate-800 uppercase">{group[0].first_name} {group[0].last_name}</p>
                                 <span className="px-3 py-1 bg-rose-50 text-rose-500 rounded-lg text-[9px] font-black uppercase tracking-widest">{group.length} Instances</span>
                              </div>
                              <div className="space-y-2 opacity-60">
                                 {group.map(m => (
                                   <div key={m.id} className="flex justify-between text-[10px] font-bold text-slate-400 uppercase border-t border-slate-50 pt-2">
                                      <span>ID: ...{m.id.slice(-6)}</span>
                                      <span>Entry: {m.created_at?.split('T')[0] || 'N/A'}</span>
                                   </div>
                                 ))}
                              </div>
                           </div>
                         ))}
                       </div>
                     ) : (
                       <div className="py-20 text-center opacity-30">
                          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          <p className="text-[10px] font-black uppercase tracking-widest">Registry Healthy. No duplicates.</p>
                       </div>
                     )
                   ) : (
                     <div className="py-10 text-center space-y-6 animate-in zoom-in-95">
                        <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                           <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h5 className="text-xl font-black text-rose-600 uppercase tracking-tight">Security Warning</h5>
                        <p className="text-sm font-bold text-slate-500 uppercase leading-relaxed max-w-xs mx-auto">This will PERMANENTLY remove all redundant profiles and only keep the single newest record for each name. DATA IS NOT RECOVERABLE.</p>
                     </div>
                   )}
                </div>

                <div className="flex gap-4">
                   {!showDeleteFinalConfirm ? (
                      <>
                        <button onClick={() => setIsDeDupModalOpen(false)} className="flex-1 py-6 bg-slate-100 text-slate-400 rounded-3xl font-black uppercase text-[11px] tracking-widest hover:bg-slate-200 transition-all">Dismiss</button>
                        {duplicateGroups.length > 0 && (
                          <button onClick={() => setShowDeleteFinalConfirm(true)} className="flex-[2] py-6 bg-rose-500 text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-[0.4em] shadow-2xl active:scale-95 transition-all border-b-4 border-black/30">
                             Authorize Master Delete
                          </button>
                        )}
                      </>
                   ) : (
                      <>
                        <button onClick={() => setShowDeleteFinalConfirm(false)} className="flex-1 py-6 bg-slate-100 text-slate-400 rounded-3xl font-black uppercase text-[11px] tracking-widest hover:bg-slate-200 transition-all">Abort Action</button>
                        <button onClick={handleMasterDelete} disabled={isPurging} className="flex-[2] py-6 bg-rose-600 text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-[0.4em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 border-b-4 border-black/30">
                           {isPurging ? <div className="w-5 h-5 border-2 border-white/50 border-t-white animate-spin rounded-full"></div> : 'Confirm Permanent Purge'}
                        </button>
                      </>
                   )}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* IMPORT WIZARD MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-2xl animate-in fade-in" onClick={() => !isImporting && setIsImportModalOpen(false)} />
          <div className="relative bg-white w-full max-w-5xl rounded-[4rem] shadow-2xl overflow-hidden border-b-[16px] border-fh-gold animate-in zoom-in-95">
             <div className="p-12">
                <div className="flex items-center justify-between mb-10">
                   <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-fh-green text-fh-gold rounded-[2rem] flex items-center justify-center shadow-xl">
                         <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      </div>
                      <div>
                         <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Import Deployment</h4>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em] mt-2">Provision Identities from External Arrays</p>
                      </div>
                   </div>
                   <button onClick={() => setIsImportModalOpen(false)} className="p-4 hover:bg-slate-100 rounded-full text-slate-300 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                   <div className="space-y-6">
                      <div className="flex bg-slate-50 p-2 rounded-2xl border border-slate-100">
                        <button onClick={() => setImportMode('File')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${importMode === 'File' ? 'bg-white text-fh-green shadow-md' : 'text-slate-400'}`}>File Relay</button>
                        <button onClick={() => setImportMode('Paste')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${importMode === 'Paste' ? 'bg-white text-fh-green shadow-md' : 'text-slate-400'}`}>Smart Paste</button>
                      </div>

                      {importMode === 'File' ? (
                        <div className="p-10 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-center space-y-4 hover:border-fh-gold transition-all group">
                           <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                           </div>
                           <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csv-upload" />
                           <label htmlFor="csv-upload" className="block px-6 py-3 bg-slate-900 text-fh-gold rounded-xl text-[9px] font-black uppercase tracking-widest cursor-pointer hover:bg-black transition-all">Select Local CSV</label>
                        </div>
                      ) : (
                        <div className="space-y-4">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Identity Buffer</p>
                           <textarea 
                             value={rawImportData}
                             onChange={(e) => { setRawImportData(e.target.value); processRawData(e.target.value); }}
                             placeholder="Full Names..."
                             className="w-full h-48 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] font-bold text-xs shadow-inner focus:ring-8 focus:ring-fh-gold/5 outline-none transition-all resize-none"
                           />
                        </div>
                      )}

                      <div className="flex items-center justify-between px-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                         <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Skip Header Row?</span>
                         <button onClick={() => { setSkipHeader(!skipHeader); if(rawImportData) processRawData(rawImportData); }} className={`w-12 h-6 rounded-full relative ${skipHeader ? 'bg-fh-green' : 'bg-slate-300'}`}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${skipHeader ? 'translate-x-6' : ''}`} /></button>
                      </div>
                      
                      <div className="bg-fh-green/5 p-6 rounded-[2rem] border border-fh-green/10">
                         <p className="text-[9px] text-slate-500 leading-relaxed font-bold uppercase tracking-tighter">Engine automatically splits identities. Cleanse buffer before commit.</p>
                      </div>
                   </div>

                   <div className="lg:col-span-2 space-y-6">
                      <div className="flex items-center justify-between px-4">
                         <h5 className="text-xs font-black text-slate-900 uppercase tracking-widest">Provisioning Preview</h5>
                         <div className="flex gap-4">
                            <button onClick={scrubImportBuffer} className="px-4 py-2 bg-rose-50 text-rose-500 rounded-lg text-[8px] font-black uppercase tracking-widest border border-rose-100">Cleanse Cluster Duplicates</button>
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{parsedData.length} Identified Members</span>
                         </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 rounded-[3rem] overflow-hidden max-h-[400px] overflow-y-auto shadow-inner">
                         <table className="w-full text-left">
                            <thead className="bg-white/50 border-b border-slate-100 sticky top-0">
                               <tr>
                                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Identity Name</th>
                                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Site Context</th>
                                  <th className="px-6 py-4 text-right"></th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                               {parsedData.length > 0 ? parsedData.map((row, idx) => (
                                 <tr key={idx} className="group hover:bg-white transition-all">
                                    <td className="px-6 py-4">
                                       <p className="text-xs font-black uppercase text-slate-800">{row.first_name} {row.last_name}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                       <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[8px] font-black uppercase text-slate-400">{branches.find(b => b.id === (row.branch_id || branches[0]?.id))?.name || 'Main Campus'}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                       <button onClick={() => setParsedData(prev => prev.filter((_, i) => i !== idx))} className="p-2 text-slate-200 hover:text-rose-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                    </td>
                                 </tr>
                               )) : (
                                 <tr><td colSpan={3} className="px-6 py-32 text-center text-slate-300 italic font-black uppercase tracking-[0.4em] text-[10px]">Buffer Null.</td></tr>
                               )}
                            </tbody>
                         </table>
                      </div>

                      <div className="flex gap-4">
                         <button onClick={() => { setParsedData([]); setRawImportData(''); }} className="flex-1 py-6 bg-slate-100 text-slate-400 rounded-3xl font-black uppercase text-[11px] tracking-widest active:scale-95">Purge Buffer</button>
                         <button onClick={handleBulkCommit} disabled={isImporting || parsedData.length === 0} className="flex-[2] py-6 bg-fh-green text-fh-gold rounded-[2.5rem] font-black uppercase text-[11px] tracking-[0.4em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 border-b-4 border-black/30 disabled:opacity-50">
                            {isImporting ? <div className="w-5 h-5 border-2 border-white/50 border-t-white animate-spin rounded-full"></div> : 'Start Registry Sync'}
                         </button>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* REGISTRATION FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-fh-green-dark/95 backdrop-blur-md animate-in fade-in" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border-b-[16px] border-fh-gold">
            <div className="p-12 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
               <div className="flex items-center gap-6">
                 <div className="w-16 h-16 bg-fh-green text-fh-gold rounded-[2rem] flex items-center justify-center shadow-xl">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                 </div>
                 <div>
                    <h3 className="text-3xl font-black text-fh-green uppercase leading-none tracking-tighter">{formData.status} Onboarding</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-2">Relational Registry Entry</p>
                 </div>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-5 hover:bg-slate-100 rounded-full text-slate-400 active:scale-90"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <form onSubmit={handleSubmit} className="p-12 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">First Name *</label><input required name="first_name" value={formData.first_name} onChange={handleInputChange} className="w-full px-7 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner" /></div>
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Last Name *</label><input required name="last_name" value={formData.last_name} onChange={handleInputChange} className="w-full px-7 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner" /></div>
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Gender</label><select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full px-7 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner"><option>Male</option><option>Female</option></select></div>
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Phone Relay</label><input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-7 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner" /></div>
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Email Entry</label><input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-7 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner" /></div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Branch Site *</label>
                   <select required name="branch_id" value={formData.branch_id} onChange={handleInputChange} className="w-full px-7 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner">
                      <option value="">Select Target...</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                   </select>
                 </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-fh-green text-fh-gold rounded-[2.5rem] font-black uppercase text-xs tracking-[0.4em] shadow-2xl active:scale-95 transition-all border-b-4 border-black/30">
                 {isSubmitting ? <div className="w-5 h-5 border-2 border-fh-gold/50 border-t-fh-gold animate-spin rounded-full" /> : 'Authorize Identity Commit'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default MembersView;
