import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabaseClient';
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
  Calendar,
  MapPin,
  MoreVertical,
  ArrowRight,
  Printer,
  Download,
  ClipboardList,
  Activity
} from 'lucide-react';

interface Member {
  id: string;
  name: string;
  lastSeen: string;
  status: 'Active' | 'At Risk' | 'Missing' | 'First Timer';
  phone: string;
  assignedTo: string;
  department: string;
  zone: string;
  notes: string[];
  history: { type: 'Call' | 'Message' | 'Visit'; date: string; note: string }[];
}

const MOCK_MEMBERS: Member[] = [
  {
    id: '1',
    name: 'Oluwaseun Adewale',
    lastSeen: '2026-03-29',
    status: 'Active',
    phone: '+234 801 234 5678',
    assignedTo: 'Pastor Mike',
    department: 'Media',
    zone: 'Zone A',
    notes: ['Consistent attendee', 'Needs prayer for family'],
    history: [
      { type: 'Call', date: '2026-03-25', note: 'Checked in on health' },
      { type: 'Visit', date: '2026-03-10', note: 'Home visitation successful' }
    ]
  },
  {
    id: '2',
    name: 'Chioma Okoro',
    lastSeen: '2026-03-15',
    status: 'At Risk',
    phone: '+234 802 345 6789',
    assignedTo: 'Sis. Grace',
    department: 'Music',
    zone: 'Zone C',
    notes: ['Missed last 2 services', 'Work schedule conflict'],
    history: [
      { type: 'Message', date: '2026-03-20', note: 'Sent encouragement text' }
    ]
  },
  {
    id: '3',
    name: 'Kofi Mensah',
    lastSeen: '2026-02-28',
    status: 'Missing',
    phone: '+234 803 456 7890',
    assignedTo: 'Unassigned',
    department: 'None',
    zone: 'Zone B',
    notes: ['Relocated temporarily?', 'No response to calls'],
    history: []
  },
  {
    id: '4',
    name: 'Sarah Johnson',
    lastSeen: '2026-03-29',
    status: 'First Timer',
    phone: '+234 804 567 8901',
    assignedTo: 'Bro. David',
    department: 'None',
    zone: 'Zone A',
    notes: ['New in town', 'Interested in Youth Ministry'],
    history: [
      { type: 'Call', date: '2026-03-30', note: 'Welcome call completed' }
    ]
  },
  {
    id: '5',
    name: 'Ibrahim Musa',
    lastSeen: '2026-03-22',
    status: 'At Risk',
    phone: '+234 805 678 9012',
    assignedTo: 'Pastor Mike',
    department: 'Ushering',
    zone: 'Zone D',
    notes: ['Travelled for business'],
    history: []
  }
];

const SESSIONS = [
  { id: 'sun-miracle', name: 'Sunday Miracle Service', attendees: 250 },
  { id: 'midweek', name: 'Midweek Service', attendees: 180 },
  { id: 'prayer', name: 'Prayer Meeting', attendees: 90 },
];

import VisitationWhatsAppView from './VisitationWhatsAppView';
import FirstTimersView from './FirstTimersView';

const FollowUpVisitationView: React.FC = () => {
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'Overview' | 'Visitation' | 'Personnel' | 'Operations' | 'Resources'>('Overview');
  const [visitationSubTab, setVisitationSubTab] = useState<'Radar' | 'Registry' | 'WhatsApp' | 'FirstTimers'>('Radar');
  const [filter, setFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showInsights, setShowInsights] = useState(false);
  const [members, setMembers] = useState<Member[]>(MOCK_MEMBERS);
  const [sessions, setSessions] = useState<any[]>([]);
  const [visitationRecords, setVisitationRecords] = useState<any[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRecord, setNewRecord] = useState({
    member_id: '',
    category: 'First-time Visitor',
    priority: 'Medium',
    notes: '',
    visit_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch Members
        const { data: membersData } = await supabase.from('members').select('*');
        if (membersData) {
          const mappedMembers: Member[] = membersData.map(m => ({
            id: m.id,
            name: `${m.first_name} ${m.last_name || ''}`.trim(),
            lastSeen: m.last_seen || 'N/A',
            status: (m.status as any) || 'Active',
            phone: m.phone || 'N/A',
            assignedTo: 'Unassigned',
            department: m.ministry || 'None',
            zone: m.gps_address || 'N/A',
            notes: [],
            history: []
          }));
          setMembers(mappedMembers);
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

        // Fetch Personnel (Users with relevant roles)
        const { data: usersData } = await supabase
          .from('profiles')
          .select('*')
          .in('role', ['System Administrator', 'Head Pastor', 'Follow-up & Visitation', 'Evangelism Ministry']);
        setPersonnel(usersData || []);

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
      setIsAddModalOpen(false);
      // Refresh records
      const { data } = await supabase.from('visitation_records').select('*, members(*)').order('created_at', { ascending: false });
      setVisitationRecords(data || []);
    } catch (err) {
      console.error('Error adding record:', err);
    }
  };

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filter === 'All' || 
                           (filter === 'Absentees' && (m.status === 'Missing' || m.status === 'At Risk')) ||
                           (filter === 'First Timers' && m.status === 'First Timer') ||
                           (filter === 'At Risk' && m.status === 'At Risk') ||
                           (filter === 'Workers' && m.department !== 'None' && m.department !== 'N/A');
      const matchesDept = !departmentFilter || m.department === departmentFilter;
      const matchesZone = !zoneFilter || m.zone === zoneFilter;
      
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
    const depts = new Set(members.map(m => m.department).filter(d => d && d !== 'None' && d !== 'N/A'));
    return Array.from(depts).sort();
  }, [members]);

  const zones = useMemo(() => {
    const zs = new Set(members.map(m => m.zone).filter(z => z && z !== 'N/A'));
    return Array.from(zs).sort();
  }, [members]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'At Risk': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Missing': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'First Timer': return 'bg-blue-100 text-blue-700 border-blue-200';
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
              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                <Printer className="w-5 h-5" />
              </button>
              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                <Download className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {personnel.map((person, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 text-fh-gold flex items-center justify-center font-black text-lg">
                    {person.first_name?.[0]}{person.last_name?.[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{person.first_name} {person.last_name}</h3>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">{person.role}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-bold uppercase">Assigned Cases</span>
                    <span className="text-slate-900 font-black">12</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-bold uppercase">Completion Rate</span>
                    <span className="text-emerald-500 font-black">92%</span>
                  </div>
                </div>
                <button className="w-full mt-6 py-3 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-100 transition-all">
                  View Performance
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Operations' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Care Mission Logs</h3>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest border border-slate-200">Export CSV</button>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'Resources' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Outreach Templates</h3>
              <div className="space-y-4">
                {[
                  { title: 'First Timer Welcome', desc: 'Standard script for welcoming new visitors.' },
                  { title: 'Absence Inquiry', desc: 'Gentle follow-up for missed services.' },
                  { title: 'Hospital Visitation', desc: 'Guidelines and prayers for sick members.' },
                ].map((res, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-slate-900">{res.title}</h4>
                      <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                    </div>
                    <p className="text-xs text-slate-500">{res.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Pastoral Guidelines</h3>
              <div className="space-y-4">
                {[
                  { title: 'Ethics of Visitation', desc: 'Code of conduct for home visits.' },
                  { title: 'Reporting Protocol', desc: 'How to document sensitive interactions.' },
                ].map((res, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-slate-900">{res.title}</h4>
                      <FileText className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                    </div>
                    <p className="text-xs text-slate-500">{res.desc}</p>
                  </div>
                ))}
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
                { id: 'WhatsApp', label: 'WhatsApp Hub', icon: <MessageSquare className="w-4 h-4" /> },
                { id: 'FirstTimers', label: 'First Timers', icon: <Users className="w-4 h-4" /> }
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
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned To</th>
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
                                  {member.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{member.name}</p>
                                  <p className="text-xs text-slate-500">{member.department}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-slate-600 font-medium">{member.lastSeen}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(member.status)}`}>
                                {member.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-slate-600 font-mono">{member.phone}</p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                                  <Users className="w-3 h-3 text-slate-400" />
                                </div>
                                <p className="text-sm text-slate-600">{member.assignedTo}</p>
                              </div>
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
                    {selectedMember.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">{selectedMember.name}</h3>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(selectedMember.status)}`}>
                      {selectedMember.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Department</p>
                    <p className="text-sm font-bold text-slate-700">{selectedMember.department}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Zone</p>
                    <p className="text-sm font-bold text-slate-700">{selectedMember.zone}</p>
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
                    Interaction History
                  </h4>
                  <div className="space-y-3">
                    {selectedMember.history.length > 0 ? selectedMember.history.map((h, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                            {h.type === 'Call' && <Phone className="w-4 h-4 text-slate-500" />}
                            {h.type === 'Message' && <MessageSquare className="w-4 h-4 text-slate-500" />}
                            {h.type === 'Visit' && <MapPin className="w-4 h-4 text-slate-500" />}
                          </div>
                          {i !== selectedMember.history.length - 1 && <div className="w-0.5 h-full bg-slate-100 my-1" />}
                        </div>
                        <div className="pb-4">
                          <p className="text-xs font-bold text-slate-400 uppercase">{h.date}</p>
                          <p className="text-sm font-bold text-slate-700">{h.type}</p>
                          <p className="text-sm text-slate-500 mt-1">{h.note}</p>
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-slate-400 italic">No interaction history recorded.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Follow-up Notes
                  </h4>
                  <div className="space-y-2">
                    {selectedMember.notes.map((note, i) => (
                      <div key={i} className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                        <p className="text-sm text-indigo-900">{note}</p>
                      </div>
                    ))}
                    <button className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-bold text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all">
                      + Add New Note
                    </button>
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
                      <option key={m.id} value={m.id}>{m.name}</option>
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
                      <option>First-time Visitor</option>
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
    </div>
  );
};

export default FollowUpVisitationView;
