import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import { Member, UserProfile } from '../types';
import { 
  Users, 
  UserCheck, 
  UserMinus, 
  Clock, 
  Search, 
  Filter, 
  Phone, 
  MessageSquare, 
  UserPlus, 
  FileText, 
  ChevronRight, 
  AlertCircle, 
  Sparkles,
  X,
  Plus,
  Edit3,
  Trash2,
  Calendar,
  MapPin,
  MoreVertical,
  ArrowRight,
  Printer,
  Download,
  ClipboardList,
  Activity
} from 'lucide-react';

// Local interface for UI state mapping if needed, but we'll use the imported Member type
// interface Member { ... }

interface FollowUpVisitationViewProps {
  setActiveItem?: (item: string) => void;
  currentUser: UserProfile | null;
}

const FollowUpVisitationView: React.FC<FollowUpVisitationViewProps> = ({ setActiveItem, currentUser }) => {
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'Overview' | 'Visitation' | 'Personnel' | 'Operations' | 'Resources'>('Overview');
  const [visitationSubTab, setVisitationSubTab] = useState<'Radar' | 'Registry' | 'WhatsApp'>('Radar');
  const [filter, setFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showInsights, setShowInsights] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [visitationRecords, setVisitationRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [editingPersonnel, setEditingPersonnel] = useState<any>(null);
  const [editingResource, setEditingResource] = useState<any>(null);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  
  const fetchPersonnel = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('visitation_personnel')
        .select(`
          *,
          members:member_id (id, first_name, last_name, email, phone)
        `);
      if (error) throw error;
      setPersonnel(data || []);
    } catch (error: any) {
      console.error('Error fetching personnel:', error);
      if (error.code === 'PGRST205' || error.message?.includes('not found')) {
        setTableError("Personnel table missing");
      }
    }
  }, []);

  const fetchResources = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('visitation_resources')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('not found')) {
          setTableError("Resources table missing");
        }
        throw error;
      }

      if (!data || data.length === 0) {
        // Seed default resources if empty
        const defaults = [
          { title: 'Absentee Follow-up Guide', category: 'Guideline', description: 'Best practices for reaching out to members who missed service.' },
          { title: 'Home Visitation Guidelines', category: 'Guideline', description: 'Best practices and safety protocols for home visits.' },
          { title: 'Follow-up Email Template', category: 'Template', description: 'Professional email template for Monday morning follow-ups.' },
          { title: 'Bereavement Support Guide', category: 'Guideline', description: 'Compassionate approach for visiting bereaved families.' },
          { title: 'Hospital Visitation Protocol', category: 'Guideline', description: 'Safety and etiquette for hospital ministry visits.' }
        ];
        await supabase.from('visitation_resources').insert(defaults);
        const { data: refreshed } = await supabase.from('visitation_resources').select('*');
        setResources(refreshed || []);
      } else {
        setResources(data);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  }, []);
  
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [regForm, setRegForm] = useState({
    first_name: '', last_name: '', phone: '', location_area: '', landmark: '', 
    marital_status: 'Single', invited_by: '', visitor_type: 'First-time', 
    prayer_request: '', date_joined: new Date().toISOString().split('T')[0], 
    status: 'Visitor'
  });

  const [newRecord, setNewRecord] = useState({
    member_id: '',
    category: 'Sick/Hospital',
    priority: 'Medium',
    notes: '',
    visit_date: new Date().toISOString().split('T')[0]
  });

  const fetchAllUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('is_active', true);
      if (error) throw error;
      setAllUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, []);

  useEffect(() => {
    fetchPersonnel();
    fetchResources();
    fetchAllUsers();
  }, [fetchPersonnel, fetchResources, fetchAllUsers]);

  // Database Repair/Setup
  const repairSQL = useCallback(async () => {
    try {
      setIsLoading(true);
      setTableError(null);
      
      const sql = `
        -- Enable UUID extension
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        -- Visitation Personnel Table Migration/Setup
        DO $$ 
        BEGIN 
          -- 1. Create table if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visitation_personnel') THEN
            CREATE TABLE visitation_personnel (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              member_id UUID REFERENCES members(id) ON DELETE CASCADE,
              role TEXT NOT NULL,
              status TEXT DEFAULT 'Active',
              assigned_cases INTEGER DEFAULT 0,
              completion_rate INTEGER DEFAULT 0,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
            );
          ELSE
            -- 2. If table exists, ensure member_id column exists
            ALTER TABLE visitation_personnel ADD COLUMN IF NOT EXISTS member_id UUID;

            -- 3. Ensure foreign key constraint exists
            IF NOT EXISTS (
                SELECT 1 
                FROM information_schema.table_constraints tc 
                JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_name = 'visitation_personnel' 
                AND kcu.column_name = 'member_id'
                AND tc.constraint_type = 'FOREIGN KEY'
            ) THEN
                ALTER TABLE visitation_personnel 
                ADD CONSTRAINT visitation_personnel_member_id_fkey 
                FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;
            END IF;

            -- 4. Drop old user_id column if it exists
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitation_personnel' AND column_name='user_id') THEN
              ALTER TABLE visitation_personnel DROP COLUMN user_id;
            END IF;
          END IF;
        END $$;

        -- Visitation Resources Table
        CREATE TABLE IF NOT EXISTS visitation_resources (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title TEXT NOT NULL,
          description TEXT,
          category TEXT NOT NULL, -- 'Template', 'Guideline', 'Script'
          content TEXT, -- Built-in document content
          file_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
        );

        -- Add content column if not exists
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitation_resources' AND column_name='content') THEN
            ALTER TABLE visitation_resources ADD COLUMN content TEXT;
          END IF;
        END $$;

        -- Seed default resources if empty
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM visitation_resources LIMIT 1) THEN
            INSERT INTO visitation_resources (title, description, category, content) VALUES
            ('Absentee Follow-up Guide', 'A warm greeting script for following up with members who missed church services.', 'Script', '# Absentee Follow-up Guide\n\n**Greeting:** "Hello [Member Name], my name is [Your Name] from Faithhouse Chapel International. We missed you at our service this past Sunday!"\n\n**Purpose:** "I''m just calling to check on you and see if everything is okay, and if there''s anything the church can pray with you about."\n\n**Closing:** "We look forward to seeing you at our next service! God bless you."'),
            ('Sick Visit Guidelines', 'Best practices and spiritual guidance for visiting the sick.', 'Guideline', '# Sick Visit Guidelines\n\n1. **Preparation:** Pray before you go. Ask the Holy Spirit for wisdom and compassion.\n2. **Duration:** Keep visits short (15-20 minutes) unless requested otherwise.\n3. **Spiritual Care:** Read a comforting Psalm (e.g., Psalm 23, Psalm 103) and offer a brief, faith-filled prayer.\n4. **Sensitivity:** Be mindful of the patient''s energy levels and medical needs.'),
            ('Follow-up Call Log Template', 'A template for recording details of follow-up phone calls.', 'Template', '# Follow-up Call Log\n\n- **Date:** [Date]\n- **Member Name:** [Name]\n- **Caller:** [Your Name]\n- **Response:** [Positive/Neutral/No Answer]\n- **Prayer Requests:** [Details]\n- **Action Items:** [e.g., Send to Pastor, Invite to Cell Group]'),
            ('New Convert Discipleship Plan', 'A 4-week plan for nurturing new converts.', 'Guideline', '# New Convert Discipleship Plan\n\n**Week 1:** The Assurance of Salvation (John 3:16, 1 John 5:11-13)\n**Week 2:** The Importance of Prayer and Word (Matthew 6:9-13, Psalm 119:105)\n**Week 3:** Understanding the Holy Spirit (Acts 1:8, Galatians 5:22-23)\n**Week 4:** The Power of Fellowship and Service (Hebrews 10:24-25)');
          END IF;
        END $$;

        -- Visitation Records Table
        CREATE TABLE IF NOT EXISTS visitation_records (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          member_id UUID REFERENCES members(id) ON DELETE CASCADE,
          category TEXT NOT NULL,
          priority TEXT DEFAULT 'Medium',
          status TEXT DEFAULT 'Pending',
          visit_date DATE NOT NULL,
          notes TEXT,
          outcome TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
        );

        -- Enable RLS
        ALTER TABLE visitation_personnel ENABLE ROW LEVEL SECURITY;
        ALTER TABLE visitation_resources ENABLE ROW LEVEL SECURITY;
        ALTER TABLE visitation_records ENABLE ROW LEVEL SECURITY;

        -- Create policies
        DROP POLICY IF EXISTS "Allow all for authenticated users on visitation_personnel" ON visitation_personnel;
        CREATE POLICY "Allow all for authenticated users on visitation_personnel" ON visitation_personnel FOR ALL TO authenticated USING (true) WITH CHECK (true);

        DROP POLICY IF EXISTS "Allow all for authenticated users on visitation_resources" ON visitation_resources;
        CREATE POLICY "Allow all for authenticated users on visitation_resources" ON visitation_resources FOR ALL TO authenticated USING (true) WITH CHECK (true);

        DROP POLICY IF EXISTS "Allow all for authenticated users on visitation_records" ON visitation_records;
        CREATE POLICY "Allow all for authenticated users on visitation_records" ON visitation_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

        -- Ensure visitation_records has priority and outcome if not present
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitation_records' AND column_name='priority') THEN
            ALTER TABLE visitation_records ADD COLUMN priority TEXT DEFAULT 'Medium';
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitation_records' AND column_name='outcome') THEN
            ALTER TABLE visitation_records ADD COLUMN outcome TEXT;
          END IF;
        END $$;

        -- FORCE SCHEMA CACHE RELOAD
        NOTIFY pgrst, 'reload schema';
      `;

      const { error } = await supabase.rpc('exec_sql', { sql_string: sql });
      
      if (error) {
        console.error('RPC exec_sql failed:', error);
        if (error.message?.includes('exec_sql') || error.code === 'PGRST202') {
          setTableError(`The database helper function 'exec_sql' is missing. You must create it in the Supabase SQL Editor before auto-restoration can work.`);
        } else {
          setTableError(`Restoration failed: ${error.message}. You may need to run the SQL manually in the Supabase dashboard.`);
        }
        return;
      }

      toast.success("Database systems verified");
      fetchPersonnel();
      fetchResources();
    } catch (e: any) {
      console.error('Database setup error:', e);
      setTableError(`System error: ${e.message}. Please ensure the 'exec_sql' function is enabled in Supabase.`);
    } finally {
      setIsLoading(false);
    }
  }, [fetchPersonnel, fetchResources]);

  useEffect(() => {
    repairSQL();
  }, [repairSQL]);

  const [newPersonnel, setNewPersonnel] = useState({
    member_id: '',
    role: 'Visitation Team',
    status: 'Active'
  });

  const [newResource, setNewResource] = useState({
    title: '',
    description: '',
    category: 'Template',
    content: '',
    file_url: ''
  });

  const handleAddPersonnel = async () => {
    // Role-based access check
    const allowedRoles = ['system_admin', 'admin', 'pastor', 'general_overseer'];
    if (!currentUser || !allowedRoles.includes(currentUser.role)) {
      toast.error('You do not have permission to manage personnel');
      return;
    }

    try {
      if (editingPersonnel) {
        const { error } = await supabase
          .from('visitation_personnel')
          .update({
            role: newPersonnel.role,
            status: newPersonnel.status
          })
          .eq('id', editingPersonnel.id);
        if (error) throw error;
        toast.success('Personnel updated successfully');
      } else {
        const { error } = await supabase
          .from('visitation_personnel')
          .insert([newPersonnel]);
        if (error) throw error;
        toast.success('Personnel added successfully');
      }
      setIsPersonnelModalOpen(false);
      setEditingPersonnel(null);
      setNewPersonnel({ member_id: '', role: 'Visitation Team', status: 'Active' });
      fetchPersonnel();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeletePersonnel = async (id: string) => {
    // Role-based access check
    const allowedRoles = ['system_admin', 'admin', 'pastor', 'general_overseer'];
    if (!currentUser || !allowedRoles.includes(currentUser.role)) {
      toast.error('You do not have permission to remove personnel');
      return;
    }

    if (!confirm('Are you sure you want to remove this person from the visitation team?')) return;
    try {
      const { error } = await supabase
        .from('visitation_personnel')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Personnel removed');
      fetchPersonnel();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAddResource = async () => {
    try {
      if (editingResource) {
        const { error } = await supabase
          .from('visitation_resources')
          .update(newResource)
          .eq('id', editingResource.id);
        if (error) throw error;
        toast.success('Resource updated successfully');
      } else {
        const { error } = await supabase
          .from('visitation_resources')
          .insert([newResource]);
        if (error) throw error;
        toast.success('Resource added successfully');
      }
      setIsResourceModalOpen(false);
      setEditingResource(null);
      setNewResource({ title: '', description: '', category: 'Template', content: '', file_url: '' });
      fetchResources();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    try {
      const { error } = await supabase
        .from('visitation_resources')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Resource deleted');
      fetchResources();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleRegisterVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.from('members').insert([{
        ...regForm,
        // Ensure email/gender aren't sent if they were removed from form
      }]);
      if (error) throw error;
      toast.success('Visitor registered successfully');
      setIsRegisterModalOpen(false);
      setRegForm({
        first_name: '', last_name: '', phone: '', location_area: '', landmark: '', 
        marital_status: 'Single', invited_by: '', visitor_type: 'First-time', 
        prayer_request: '', date_joined: new Date().toISOString().split('T')[0], 
        status: 'Visitor'
      });
      // Refresh members
      const { data: membersData } = await supabase.from('members').select('*');
      setMembers(membersData as Member[]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (visitationRecords.length === 0) {
      toast.error("No records to export");
      return;
    }

    const headers = ['Mission ID', 'Member', 'Category', 'Status', 'Date', 'Notes'];
    const rows = visitationRecords.map(r => [
      r.id,
      `${r.members?.first_name} ${r.members?.last_name}`,
      r.category,
      r.status,
      new Date(r.visit_date).toLocaleDateString(),
      r.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `visitation_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Report exported as CSV");
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch Members
        const { data: membersData } = await supabase.from('members').select('*');
        if (membersData) {
          setMembers(membersData as Member[]);
        }

        // Fetch Sessions (Attendance Events)
        const { data: eventsData } = await supabase
          .from('attendance_events')
          .select('*')
          .order('event_date', { ascending: false });
        setSessions(eventsData || []);

        // Fetch Visitation Records
        const { data: recordsData } = await supabase
          .from('visitation_records')
          .select('*, members(*)')
          .order('created_at', { ascending: false });
        setVisitationRecords(recordsData || []);

      } catch (err) {
        console.error('Error fetching visitation data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('visitation_records').insert([newRecord]);
      if (error) throw error;
      toast.success('Visitation record created successfully');
      setIsAddModalOpen(false);
      // Refresh records
      const { data } = await supabase.from('visitation_records').select('*, members(*)').order('created_at', { ascending: false });
      setVisitationRecords(data || []);
    } catch (err: any) {
      console.error('Error adding record:', err);
      toast.error(err.message || 'Failed to add record');
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      const { error } = await supabase.from('visitation_records').delete().eq('id', id);
      if (error) throw error;
      toast.success('Record deleted');
      const { data } = await supabase.from('visitation_records').select('*, members(*)').order('created_at', { ascending: false });
      setVisitationRecords(data || []);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const fullName = `${m.first_name} ${m.last_name || ''}`.toLowerCase();
      const matchesSearch = fullName.includes(searchTerm.toLowerCase());
      const matchesFilter = filter === 'All' || 
                           (filter === 'Absentees' && (m.status === 'Inactive' || m.status === 'Probation')) ||
                           (filter === 'First Timers' && m.status === 'Visitor') ||
                           (filter === 'At Risk' && m.status === 'Probation') ||
                           (filter === 'Workers' && m.ministry !== 'None' && m.ministry !== 'N/A');
      const matchesDept = !departmentFilter || m.ministry === departmentFilter;
      const matchesZone = !zoneFilter || m.gps_address === zoneFilter;
      
      return matchesSearch && matchesFilter && matchesDept && matchesZone;
    });
  }, [members, searchTerm, filter, departmentFilter, zoneFilter]);

  const [absentees, setAbsentees] = useState<any[]>([]);
  const [isRadarLoading, setIsRadarLoading] = useState(false);

  useEffect(() => {
    if (selectedSession) {
      fetchAbsentees(selectedSession);
    }
  }, [selectedSession]);

  const fetchAbsentees = async (eventId: string) => {
    setIsRadarLoading(true);
    try {
      const { data } = await supabase
        .from('attendance_records')
        .select('*, members(*)')
        .eq('attendance_event_id', eventId)
        .in('status', ['Absent', 'Unmarked']);
      setAbsentees(data || []);
    } catch (err) {
      console.error('Radar Sync Error:', err);
    } finally {
      setIsRadarLoading(false);
    }
  };

  const departments = useMemo(() => {
    const depts = new Set(members.map(m => m.ministry).filter(d => d && d !== 'None' && d !== 'N/A'));
    return Array.from(depts).sort();
  }, [members]);

  const zones = useMemo(() => {
    const zs = new Set(members.map(m => m.gps_address).filter(z => z && z !== 'N/A'));
    return Array.from(zs).sort();
  }, [members]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Inactive': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Probation': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'Visitor': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12">
      {/* Header Section */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Follow-Up & Visitation</h1>
              <p className="text-slate-500 text-sm font-medium">Pastoral Care & Outreach Dashboard</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveItem?.('Follow-Up Map')}
                className="bg-fh-green text-fh-gold px-4 py-2 rounded-lg text-sm font-semibold hover:bg-fh-green-dark transition-all shadow-sm flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                View Follow-Up Map
              </button>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add New Record
              </button>
            </div>
          </div>

          <nav className="flex gap-8">
            {['Overview', 'Visitation', 'Personnel', 'Operations', 'Resources'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`pb-4 text-sm font-semibold transition-all relative ${
                  activeTab === tab ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
                  />
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {tableError && (
          <div className="bg-rose-50 border-2 border-rose-100 rounded-[2rem] p-8 text-center space-y-6 animate-in zoom-in-95 duration-500">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Database Synchronization Error</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                {tableError}
              </p>
            </div>
            
            <div className="flex flex-col items-center gap-4">
              <button 
                onClick={repairSQL}
                disabled={isLoading}
                className="px-8 py-3 bg-fh-green text-fh-gold rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg hover:scale-105 transition-all disabled:opacity-50"
              >
                {isLoading ? 'Attempting Restoration...' : 'Attempt Auto-Restoration'}
              </button>

              {(tableError.includes('Restoration failed') || tableError.includes('exec_sql')) && (
                <div className="w-full max-w-2xl bg-white p-6 rounded-2xl border border-rose-200 text-left space-y-4">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Manual Fix Required</p>
                  
                  {tableError.includes('exec_sql') ? (
                    <>
                      <p className="text-xs text-slate-500">
                        The system needs a helper function to manage tables. Please run this SQL first in your <b>Supabase SQL Editor</b>:
                      </p>
                      <pre className="bg-slate-900 text-fh-gold p-4 rounded-xl text-[10px] overflow-x-auto font-mono">
{`-- 1. Create the exec_sql helper function
CREATE OR REPLACE FUNCTION exec_sql(sql_string text)
RETURNS void AS $$
BEGIN
  EXECUTE sql_string;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`}
                      </pre>
                      <button 
                        onClick={() => {
                          const sql = `CREATE OR REPLACE FUNCTION exec_sql(sql_string text)\nRETURNS void AS $$\nBEGIN\n  EXECUTE sql_string;\nEND;\n$$ LANGUAGE plpgsql SECURITY DEFINER;`;
                          navigator.clipboard.writeText(sql);
                          toast.success('Helper SQL copied');
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        Copy Helper SQL
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-slate-500">
                        If auto-restoration fails, please copy the SQL below and run it in your <b>Supabase SQL Editor</b>:
                      </p>
                      <pre className="bg-slate-900 text-fh-gold p-4 rounded-xl text-[10px] overflow-x-auto font-mono max-h-48">
{`-- Run this in Supabase SQL Editor
-- 1. Ensure the tables exist with RLS policies
DO $$ 
BEGIN 
  -- Visitation Personnel
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visitation_personnel') THEN
    CREATE TABLE visitation_personnel (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      member_id UUID REFERENCES members(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      status TEXT DEFAULT 'Active',
      assigned_cases INTEGER DEFAULT 0,
      completion_rate INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
    );
  ELSE
    ALTER TABLE visitation_personnel ADD COLUMN IF NOT EXISTS member_id UUID;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitation_personnel' AND column_name='user_id') THEN
      ALTER TABLE visitation_personnel DROP COLUMN user_id;
    END IF;
  END IF;

  -- Visitation Records
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visitation_records') THEN
    CREATE TABLE visitation_records (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      member_id UUID REFERENCES members(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      priority TEXT DEFAULT 'Medium',
      status TEXT DEFAULT 'Pending',
      visit_date DATE NOT NULL,
      notes TEXT,
      outcome TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
    );
  END IF;

  -- Visitation Resources
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visitation_resources') THEN
    CREATE TABLE visitation_resources (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      content TEXT,
      file_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
    );
  ELSE
    ALTER TABLE visitation_resources ADD COLUMN IF NOT EXISTS content TEXT;
  END IF;

  -- Enable RLS
  ALTER TABLE visitation_personnel ENABLE ROW LEVEL SECURITY;
  ALTER TABLE visitation_resources ENABLE ROW LEVEL SECURITY;
  ALTER TABLE visitation_records ENABLE ROW LEVEL SECURITY;

  -- Create Policies
  DROP POLICY IF EXISTS "Allow all for authenticated users on visitation_personnel" ON visitation_personnel;
  CREATE POLICY "Allow all for authenticated users on visitation_personnel" ON visitation_personnel FOR ALL TO authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow all for authenticated users on visitation_resources" ON visitation_resources;
  CREATE POLICY "Allow all for authenticated users on visitation_resources" ON visitation_resources FOR ALL TO authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow all for authenticated users on visitation_records" ON visitation_records;
  CREATE POLICY "Allow all for authenticated users on visitation_records" ON visitation_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

END $$;`}
                      </pre>
                      <button 
                        onClick={() => {
                          const sql = `-- Run this in Supabase SQL Editor\nDO $$ \nBEGIN \n  -- Visitation Personnel\n  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visitation_personnel') THEN\n    CREATE TABLE visitation_personnel (\n      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n      member_id UUID REFERENCES members(id) ON DELETE CASCADE,\n      role TEXT NOT NULL,\n      status TEXT DEFAULT 'Active', \n      assigned_cases INTEGER DEFAULT 0,\n      completion_rate INTEGER DEFAULT 0,\n      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())\n    );\n  ELSE\n    ALTER TABLE visitation_personnel ADD COLUMN IF NOT EXISTS member_id UUID;\n    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitation_personnel' AND column_name='user_id') THEN\n      ALTER TABLE visitation_personnel DROP COLUMN user_id;\n    END IF;\n  END IF;\n\n  -- Visitation Records\n  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visitation_records') THEN\n    CREATE TABLE visitation_records (\n      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n      member_id UUID REFERENCES members(id) ON DELETE CASCADE,\n      category TEXT NOT NULL,\n      priority TEXT DEFAULT 'Medium',\n      status TEXT DEFAULT 'Pending',\n      visit_date DATE NOT NULL,\n      notes TEXT,\n      outcome TEXT,\n      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())\n    );\n  END IF;\n\n  -- Visitation Resources\n  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visitation_resources') THEN\n    CREATE TABLE visitation_resources (\n      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n      title TEXT NOT NULL,\n      description TEXT,\n      category TEXT NOT NULL,\n      file_url TEXT,\n      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())\n    );\n  END IF;\n\n  -- Enable RLS\n  ALTER TABLE visitation_personnel ENABLE ROW LEVEL SECURITY;\n  ALTER TABLE visitation_resources ENABLE ROW LEVEL SECURITY;\n  ALTER TABLE visitation_records ENABLE ROW LEVEL SECURITY;\n\n  -- Create Policies\n  DROP POLICY IF EXISTS "Allow all for authenticated users on visitation_personnel" ON visitation_personnel;\n  CREATE POLICY "Allow all for authenticated users on visitation_personnel" ON visitation_personnel FOR ALL TO authenticated USING (true) WITH CHECK (true);\n\n  DROP POLICY IF EXISTS "Allow all for authenticated users on visitation_resources" ON visitation_resources;\n  CREATE POLICY "Allow all for authenticated users on visitation_resources" ON visitation_resources FOR ALL TO authenticated USING (true) WITH CHECK (true);\n\n  DROP POLICY IF EXISTS "Allow all for authenticated users on visitation_records" ON visitation_records;\n  CREATE POLICY "Allow all for authenticated users on visitation_records" ON visitation_records FOR ALL TO authenticated USING (true) WITH CHECK (true);\n\nEND $$;`;
                          navigator.clipboard.writeText(sql);
                          toast.success('SQL copied to clipboard');
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        Copy SQL Script
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Retention Health</h3>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black text-slate-900">78%</span>
                  <span className="text-emerald-500 text-sm font-bold mb-1">+5% vs last month</span>
                </div>
                <div className="mt-6 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full w-[78%]" />
                </div>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">First Timer Conversion</h3>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black text-slate-900">42%</span>
                  <span className="text-amber-500 text-sm font-bold mb-1">-2% vs last month</span>
                </div>
                <div className="mt-6 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full w-[42%]" />
                </div>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Avg. Response Time</h3>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black text-slate-900">1.2d</span>
                  <span className="text-emerald-500 text-sm font-bold mb-1">Faster by 4h</span>
                </div>
                <div className="mt-6 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[90%]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Care Activities</h3>
              <div className="space-y-4">
                {visitationRecords.slice(0, 5).map((record, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                        {record.members?.first_name?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{record.members?.first_name} {record.members?.last_name}</p>
                        <p className="text-xs text-slate-500">{record.category} • {new Date(record.visit_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                      record.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {record.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Personnel' && (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
            <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30">
              <div>
                <h3 className="text-2xl font-black text-fh-green uppercase tracking-tighter">Visitation Workforce</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Departmental Registry</p>
              </div>
              <button 
                onClick={() => {
                  setEditingPersonnel(null);
                  setNewPersonnel({ member_id: '', role: 'Visitation Team', status: 'Active' });
                  setIsPersonnelModalOpen(true);
                }}
                className="px-10 py-4 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl active:scale-95 transition-all border-b-4 border-black/30 flex items-center gap-3"
              >
                <Plus className="w-5 h-5" />
                Provision Staff
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100">
                  <tr>
                    <th className="px-10 py-6">Staff Identity</th>
                    <th className="px-10 py-6">Role & Status</th>
                    <th className="px-10 py-6">Relay Contact</th>
                    <th className="px-10 py-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {personnel.length > 0 ? personnel.map((person) => (
                    <tr key={person.id} className="hover:bg-slate-50 transition-all group">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-slate-900 text-fh-gold rounded-xl flex items-center justify-center font-black text-xs uppercase">
                            {person.members?.first_name?.[0]}{person.members?.last_name?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{person.members?.first_name} {person.members?.last_name}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{person.members?.email || 'NO EMAIL'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-tight">{person.role}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          person.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {person.status}
                        </span>
                      </td>
                      <td className="px-10 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {person.members?.phone || 'NO PHONE'}
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => {
                              setEditingPersonnel(person);
                              setNewPersonnel({ member_id: person.member_id, role: person.role, status: person.status });
                              setIsPersonnelModalOpen(true);
                            }}
                            className="p-2.5 text-slate-400 hover:text-fh-green hover:bg-slate-50 rounded-xl transition-all"
                          >
                            <Edit3 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleDeletePersonnel(person.id)}
                            className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-slate-50 rounded-xl transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-10 py-32 text-center text-slate-300 uppercase tracking-widest italic opacity-50">Empty Department.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'Operations' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Care Mission Logs</h3>
              <div className="flex gap-2">
                <button 
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest border border-slate-200 hover:bg-slate-100 transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                  <tr>
                    <th className="px-8 py-6">Mission ID</th>
                    <th className="px-8 py-6">Target</th>
                    <th className="px-8 py-6">Category</th>
                    <th className="px-8 py-6">Status</th>
                    <th className="px-8 py-6">Date</th>
                    <th className="px-8 py-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {visitationRecords.map((record, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-all">
                      <td className="px-8 py-6 text-xs font-mono text-slate-400">#{record.id.slice(0, 8)}</td>
                      <td className="px-8 py-6">
                        <p className="text-sm font-bold text-slate-900">{record.members?.first_name} {record.members?.last_name}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{record.category}</span>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          record.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-sm text-slate-500">{new Date(record.visit_date).toLocaleDateString()}</td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => handleDeleteRecord(record.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'Resources' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">Visitation Resources</h3>
              <button 
                onClick={() => {
                  setEditingResource(null);
                  setNewResource({ title: '', description: '', category: 'Template', content: '', file_url: '' });
                  setIsResourceModalOpen(true);
                }}
                className="bg-slate-900 text-fh-gold px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
              >
                <ClipboardList className="w-4 h-4" />
                Add Resource
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Outreach Templates & Scripts</h3>
                <div className="space-y-4">
                  {resources.filter(r => r.category === 'Template' || r.category === 'Script').map((res, i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all relative">
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingResource(res);
                            setNewResource({ title: res.title, description: res.description, category: res.category, content: res.content || '', file_url: res.file_url || '' });
                            setIsResourceModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-600"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => handleDeleteResource(res.id)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-slate-900">{res.title}</h4>
                        <div className="flex items-center gap-2">
                          {res.content && (
                            <button 
                              onClick={() => setSelectedResource(res)}
                              className="p-1.5 bg-white text-indigo-600 rounded-lg border border-slate-200 hover:bg-indigo-50 transition-all"
                              title="Read Document"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                          {res.file_url && (
                            <a href={res.file_url} target="_blank" rel="noreferrer" className="p-1.5 bg-white text-slate-400 rounded-lg border border-slate-200 hover:text-indigo-600 transition-all">
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">{res.description}</p>
                    </div>
                  ))}
                  {resources.filter(r => r.category === 'Template' || r.category === 'Script').length === 0 && (
                    <p className="text-xs text-slate-400 italic">No templates added yet.</p>
                  )}
                </div>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Pastoral Guidelines</h3>
                <div className="space-y-4">
                  {resources.filter(r => r.category === 'Guideline').map((res, i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all relative">
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingResource(res);
                            setNewResource({ title: res.title, description: res.description, category: res.category, content: res.content || '', file_url: res.file_url || '' });
                            setIsResourceModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-600"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => handleDeleteResource(res.id)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-slate-900">{res.title}</h4>
                        <div className="flex items-center gap-2">
                          {res.content && (
                            <button 
                              onClick={() => setSelectedResource(res)}
                              className="p-1.5 bg-white text-indigo-600 rounded-lg border border-slate-200 hover:bg-indigo-50 transition-all"
                              title="Read Document"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                          {res.file_url && (
                            <a href={res.file_url} target="_blank" rel="noreferrer" className="p-1.5 bg-white text-slate-400 rounded-lg border border-slate-200 hover:text-indigo-600 transition-all">
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">{res.description}</p>
                    </div>
                  ))}
                  {resources.filter(r => r.category === 'Guideline').length === 0 && (
                    <p className="text-xs text-slate-400 italic">No guidelines added yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Visitation' && (
          <div className="space-y-8">
            {/* Sub-Tabs Navigation */}
            <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm w-fit">
              {[
                { id: 'Radar', label: 'Detection Radar', icon: <Activity className="w-4 h-4" /> },
                { id: 'Registry', label: 'Care Registry', icon: <ClipboardList className="w-4 h-4" /> },
                { id: 'WhatsApp', label: 'WhatsApp Hub', icon: <MessageSquare className="w-4 h-4" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setVisitationSubTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    visitationSubTab === tab.id 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {visitationSubTab === 'Radar' && (
              <div className="space-y-6">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Absence Detection Radar</h3>
                  <p className="text-sm text-slate-500 mb-6">Members who have missed recent services and may need follow-up.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {members.filter(m => m.status === 'Inactive' || m.status === 'Probation').slice(0, 6).map((member, i) => (
                      <div key={i} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                            {member.first_name?.[0]}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">{member.first_name} {member.last_name}</h4>
                            <p className="text-xs text-slate-500">Last seen: {member.date_joined || 'Unknown'}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setNewRecord({
                              ...newRecord,
                              member_id: member.id,
                              category: 'Inactive/Backslidden',
                              priority: 'High'
                            });
                            setIsAddModalOpen(true);
                          }}
                          className="p-2 bg-white text-slate-400 hover:text-indigo-600 rounded-xl shadow-sm"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {members.filter(m => m.status === 'Inactive' || m.status === 'Probation').length === 0 && (
                      <div className="col-span-full py-12 text-center text-slate-400 italic">
                        No members currently flagged by radar.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {visitationSubTab === 'Registry' && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Visitation Registry</h3>
                  <button 
                    onClick={handlePrintReport}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest border border-slate-200 hover:bg-slate-100 transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    Print Report
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                      <tr>
                        <th className="px-8 py-6">Member</th>
                        <th className="px-8 py-6">Category</th>
                        <th className="px-8 py-6">Priority</th>
                        <th className="px-8 py-6">Status</th>
                        <th className="px-8 py-6">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {visitationRecords.map((record, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-all">
                          <td className="px-8 py-6">
                            <p className="text-sm font-bold text-slate-900">{record.members?.first_name} {record.members?.last_name}</p>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{record.category}</span>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`text-[10px] font-bold uppercase ${
                              record.priority === 'High' ? 'text-rose-600' : 
                              record.priority === 'Medium' ? 'text-amber-600' : 'text-slate-400'
                            }`}>
                              {record.priority}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              record.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-sm text-slate-500">{new Date(record.visit_date).toLocaleDateString()}</td>
                        </tr>
                      ))}
                      {visitationRecords.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-8 py-12 text-center text-slate-400 italic">No visitation records found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {visitationSubTab === 'WhatsApp' && (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm text-center space-y-6">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <MessageSquare className="w-10 h-10" />
                </div>
                <div className="max-w-md mx-auto">
                  <h3 className="text-xl font-bold text-slate-900">WhatsApp Follow-up Hub</h3>
                  <p className="text-slate-500 text-sm mt-2">Send automated or manual follow-up messages to members directly through our WhatsApp integration.</p>
                </div>
                <button 
                  onClick={() => setActiveItem?.('WhatsApp Hub')}
                  className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                >
                  Open WhatsApp Hub
                </button>
              </div>
            )}

          </div>
        )}
        {false && activeTab === 'Visitation' && (
          <>
            {/* Session Selector & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1 space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Service Session</label>
                <div className="relative">
                  <select
                    value={selectedSession}
                    onChange={(e) => setSelectedSession(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Choose a session...</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{s.event_name} ({new Date(s.event_date).toLocaleDateString()})</option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90" />
                </div>
              </div>

              <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Members', value: members.length.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Present Today', value: '842', icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Absentees', value: '398', icon: UserMinus, color: 'text-rose-600', bg: 'bg-rose-50' },
                  { label: 'Pending Follow-ups', value: visitationRecords.filter(r => r.status === 'Pending').length.toString(), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className={`${stat.bg} ${stat.color} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-tight">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {!selectedSession ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl py-20 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                  <Calendar className="w-10 h-10 text-slate-300" />
                </div>
                <div className="max-w-xs">
                  <h3 className="text-lg font-bold text-slate-900">No session selected</h3>
                  <p className="text-slate-500 text-sm">Select a service to view attendance insights and manage follow-ups.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Alert Banner */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-4">
                    <div className="bg-amber-100 p-2 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-900">12 members have not been contacted in 7 days</p>
                      <button className="text-xs font-semibold text-amber-700 hover:underline mt-1 flex items-center gap-1">
                        View list <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-start gap-4">
                    <div className="bg-rose-100 p-2 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-rose-900">5 first-timers have no follow-up assigned</p>
                      <button className="text-xs font-semibold text-rose-700 hover:underline mt-1 flex items-center gap-1">
                        Assign now <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Filter System */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    {['All', 'Absentees', 'First Timers', 'At Risk', 'Workers'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                          filter === f 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                            : 'text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <select 
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      >
                        <option value="">All Departments</option>
                        {departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                      <select 
                        value={zoneFilter}
                        onChange={(e) => setZoneFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      >
                        <option value="">All Zones</option>
                        {zones.map(zone => (
                          <option key={zone} value={zone}>{zone}</option>
                        ))}
                      </select>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search name..."
                        className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full lg:w-48"
                      />
                    </div>
                    <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200">
                      <Filter className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Main Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200">
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Last Seen</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredMembers.map((member) => (
                          <tr 
                            key={member.id} 
                            onClick={() => setSelectedMember(member)}
                            className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                  {member.first_name[0]}{member.last_name?.[0]}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{member.first_name} {member.last_name}</p>
                                  <p className="text-xs text-slate-500">{member.ministry}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-slate-600 font-medium">{member.last_seen || 'N/A'}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(member.status)}`}>
                                {member.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-slate-600 font-mono">{member.phone}</p>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                                <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Call">
                                  <Phone className="w-4 h-4" />
                                </button>
                                <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="WhatsApp">
                                  <MessageSquare className="w-4 h-4" />
                                </button>
                                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Add Notes">
                                  <FileText className="w-4 h-4" />
                                </button>
                                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* AI Insights Section */}
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-200">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-4 max-w-2xl">
                      <div className="flex items-center gap-2 bg-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-md">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">AI Powered Insights</span>
                      </div>
                      <h2 className="text-3xl font-bold tracking-tight">Optimize Your Outreach Strategy</h2>
                      <p className="text-indigo-100 text-lg leading-relaxed">
                        Our AI analyzes attendance patterns to identify members at risk of dropping out and suggests personalized follow-up actions.
                      </p>
                      <button 
                        onClick={() => setShowInsights(!showInsights)}
                        className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-lg"
                      >
                        {showInsights ? 'Hide Insights' : 'Generate Follow-Up Insights'}
                      </button>
                    </div>
                    <div className="hidden lg:block">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                          <p className="text-2xl font-bold">85%</p>
                          <p className="text-xs text-indigo-200 font-medium">Retention Rate</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                          <p className="text-2xl font-bold">+12%</p>
                          <p className="text-xs text-indigo-200 font-medium">Monthly Growth</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {showInsights && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-8 pt-8 border-t border-white/20 grid grid-cols-1 md:grid-cols-3 gap-6"
                      >
                        {[
                          { title: 'At Risk Alert', desc: '3 members from Music Dept have missed 3 consecutive weeks.', icon: AlertCircle },
                          { title: 'First Timer Trend', desc: 'Retention of first-timers increased by 15% after immediate calls.', icon: Sparkles },
                          { title: 'Outreach Suggestion', desc: 'Schedule a visitation for Zone B members this Saturday.', icon: MapPin },
                        ].map((insight, i) => (
                          <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/10">
                            <div className="flex items-center gap-3 mb-2">
                              <insight.icon className="w-4 h-4 text-indigo-300" />
                              <h4 className="font-bold text-sm">{insight.title}</h4>
                            </div>
                            <p className="text-sm text-indigo-100 leading-relaxed">{insight.desc}</p>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Member Detail Side Panel */}
      <AnimatePresence>
        {selectedMember && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMember(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6 space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">Member Details</h2>
                  <button 
                    onClick={() => setSelectedMember(null)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-24 h-24 rounded-3xl bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-indigo-200">
                    {selectedMember.first_name[0]}{selectedMember.last_name?.[0]}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">{selectedMember.first_name} {selectedMember.last_name}</h3>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(selectedMember.status)}`}>
                      {selectedMember.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Ministry</p>
                    <p className="text-sm font-bold text-slate-700">{selectedMember.ministry || 'None'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Address</p>
                    <p className="text-sm font-bold text-slate-700">{selectedMember.gps_address || 'N/A'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-indigo-600" />
                    Contact Information
                  </h4>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                    <p className="text-sm font-mono font-medium text-slate-600">{selectedMember.phone}</p>
                    <div className="flex gap-2">
                      <button className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors">
                        <Phone className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    Follow-up Status
                  </h4>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4">
                    <p className="text-sm text-slate-600 font-medium">Status: {selectedMember.follow_up_status || 'Not Started'}</p>
                    <p className="text-xs text-slate-400 mt-1">Last seen: {selectedMember.last_seen || 'N/A'}</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                    Assign Follow-up Task
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add New Record Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">New Care Record</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleAddRecord} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Member</label>
                  <select
                    required
                    value={newRecord.member_id}
                    onChange={e => setNewRecord({...newRecord, member_id: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="">Select Member...</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Category</label>
                    <select
                      value={newRecord.category}
                      onChange={e => setNewRecord({...newRecord, category: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    >
                      <option>Sick/Hospital</option>
                      <option>Bereaved</option>
                      <option>New Convert</option>
                      <option>Inactive/Backslidden</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Priority</label>
                    <select
                      value={newRecord.priority}
                      onChange={e => setNewRecord({...newRecord, priority: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    >
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Visit Date</label>
                  <input
                    type="date"
                    value={newRecord.visit_date}
                    onChange={e => setNewRecord({...newRecord, visit_date: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Notes</label>
                  <textarea
                    value={newRecord.notes}
                    onChange={e => setNewRecord({...newRecord, notes: e.target.value})}
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                    placeholder="Enter care notes..."
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                >
                  Create Record
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Personnel Modal */}
      <AnimatePresence>
        {isPersonnelModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPersonnelModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">{editingPersonnel ? 'Edit Personnel' : 'Add Personnel'}</h3>
                <button onClick={() => setIsPersonnelModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Select Member</label>
                  <select
                    disabled={!!editingPersonnel}
                    value={newPersonnel.member_id}
                    onChange={e => setNewPersonnel({...newPersonnel, member_id: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="">Choose a member...</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.status})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Role in Team</label>
                  <select
                    value={newPersonnel.role}
                    onChange={e => setNewPersonnel({...newPersonnel, role: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option>Head of Visitation</option>
                    <option>Follow-up Coordinator</option>
                    <option>Visitation Team</option>
                    <option>Zone Leader</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Status</label>
                  <select
                    value={newPersonnel.status}
                    onChange={e => setNewPersonnel({...newPersonnel, status: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                    <option>On Leave</option>
                  </select>
                </div>
                <button
                  onClick={handleAddPersonnel}
                  className="w-full py-4 bg-slate-900 text-fh-gold rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-slate-800 transition-all active:scale-95"
                >
                  {editingPersonnel ? 'Update Personnel' : 'Add to Team'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Resource Reader Modal */}
      <AnimatePresence>
        {selectedResource && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedResource(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-1 block">{selectedResource.category}</span>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{selectedResource.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {selectedResource.file_url && (
                    <a 
                      href={selectedResource.file_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-3 bg-white text-slate-600 rounded-2xl border border-slate-200 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center gap-2 text-xs font-bold"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  )}
                  <button onClick={() => setSelectedResource(null)} className="p-3 bg-white hover:bg-slate-100 rounded-2xl border border-slate-200 transition-all">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>
              <div className="p-10 overflow-y-auto prose prose-slate max-w-none prose-headings:text-slate-900 prose-headings:font-black prose-p:text-slate-600 prose-strong:text-slate-900 prose-li:text-slate-600">
                <div className="markdown-body">
                  <Markdown>{selectedResource.content || '*No content available for this document.*'}</Markdown>
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button 
                  onClick={() => setSelectedResource(null)}
                  className="px-8 py-3 bg-slate-900 text-fh-gold rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-slate-800 transition-all active:scale-95"
                >
                  Close Reader
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Resource Modal */}
      <AnimatePresence>
        {isResourceModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsResourceModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">{editingResource ? 'Edit Resource' : 'Add Resource'}</h3>
                <button onClick={() => setIsResourceModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Title</label>
                  <input
                    type="text"
                    value={newResource.title}
                    onChange={e => setNewResource({...newResource, title: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="e.g. First Timer Script"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Category</label>
                  <select
                    value={newResource.category}
                    onChange={e => setNewResource({...newResource, category: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option>Template</option>
                    <option>Script</option>
                    <option>Guideline</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Description</label>
                  <textarea
                    value={newResource.description}
                    onChange={e => setNewResource({...newResource, description: e.target.value})}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                    placeholder="Brief description of the resource..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Document Content (Markdown supported)</label>
                  <textarea
                    value={newResource.content}
                    onChange={e => setNewResource({...newResource, content: e.target.value})}
                    rows={8}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                    placeholder="# Document Title\n\nWrite your content here..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">External File URL (Optional)</label>
                  <input
                    type="text"
                    value={newResource.file_url}
                    onChange={e => setNewResource({...newResource, file_url: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="https://..."
                  />
                </div>
                <button
                  onClick={handleAddResource}
                  className="w-full py-4 bg-slate-900 text-fh-gold rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-slate-800 transition-all active:scale-95"
                >
                  {editingResource ? 'Update Resource' : 'Save Resource'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FollowUpVisitationView;
