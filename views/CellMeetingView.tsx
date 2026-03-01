
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, MapPin, Clock, Plus, Calendar, 
  ChevronRight, Search, Filter, Download,
  CheckCircle2, AlertCircle, TrendingUp,
  Layers, Activity, FileText, X, Save,
  UserPlus, Map, Info
} from 'lucide-react';
import { UserProfile, Member } from '../types';
import { supabase } from '../supabaseClient';

interface CellMeetingViewProps {
  userProfile: UserProfile | null;
}

interface CellGroup {
  id: string;
  name: string;
  leader: string;
  location: string;
  meeting_time: string;
  member_ids: string[];
  status: 'Active' | 'Warning' | 'New' | 'Inactive';
  growth: string;
}

interface CellAttendanceRecord {
  member_id: string;
  status: 'Present' | 'Absent' | 'Excused' | 'Unmarked';
}

const CellMeetingView: React.FC<CellMeetingViewProps> = ({ userProfile }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cells, setCells] = useState<CellGroup[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  
  // Modal States
  const [isNewCellModalOpen, setIsNewCellModalOpen] = useState(false);
  const [isEditCellModalOpen, setIsEditCellModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isAttendanceSheetOpen, setIsAttendanceSheetOpen] = useState(false);
  const [isManageMembersModalOpen, setIsManageMembersModalOpen] = useState(false);
  
  const [selectedCell, setSelectedCell] = useState<CellGroup | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<CellAttendanceRecord[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // Form States
  const [cellForm, setCellForm] = useState({
    name: '',
    leader: '',
    location: '',
    meeting_time: '',
    status: 'Active' as CellGroup['status']
  });

  const [reportForm, setReportForm] = useState({
    cell_id: '',
    meeting_date: new Date().toISOString().split('T')[0],
    attendance_count: 0,
    new_souls: 0,
    testimony: '',
    offering_amount: 0
  });

  const [attendanceForm, setAttendanceForm] = useState({
    cell_id: '',
    meeting_date: new Date().toISOString().split('T')[0],
    member_name: '',
    status: 'Present'
  });

  useEffect(() => {
    fetchCells();
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const { data } = await supabase.from('members').select('*').eq('status', 'Active').order('first_name');
    if (data) setMembers(data);
  };

  const fetchCells = async () => {
    setIsLoading(true);
    try {
      // Mock data for now as we don't want to crash if table doesn't exist
      // In a real app, we'd query Supabase: const { data } = await supabase.from('cell_groups').select('*')
      const mockCells: CellGroup[] = [
        { id: '1', name: 'Zion Cell', leader: 'Bro. Kofi Mensah', location: 'East Legon', meeting_time: 'Wed 6:30 PM', member_ids: [], status: 'Active', growth: '+2' },
        { id: '2', name: 'Grace Cell', leader: 'Sis. Ama Serwaa', location: 'Airport Residential', meeting_time: 'Tue 7:00 PM', member_ids: [], status: 'Active', growth: '+5' },
      ];
      setCells(mockCells);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCell = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      const newCell: CellGroup = {
        id: Math.random().toString(36).substr(2, 9),
        ...cellForm,
        member_ids: [],
        growth: '0'
      };
      setCells([newCell, ...cells]);
      setIsNewCellModalOpen(false);
      setCellForm({ name: '', leader: '', location: '', meeting_time: '', status: 'Active' });
      setIsLoading(false);
      alert('Cell Group established successfully!');
    }, 800);
  };

  const handleUpdateCell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCell) return;
    setIsLoading(true);
    setTimeout(() => {
      setCells(cells.map(c => c.id === selectedCell.id ? { ...c, ...cellForm } : c));
      setIsEditCellModalOpen(false);
      setSelectedCell(null);
      setIsLoading(false);
      alert('Cell Group updated successfully!');
    }, 800);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsReportModalOpen(false);
      setReportForm({ cell_id: '', meeting_date: new Date().toISOString().split('T')[0], attendance_count: 0, new_souls: 0, testimony: '', offering_amount: 0 });
      setIsLoading(false);
      alert('Weekly report submitted successfully!');
    }, 800);
  };

  const openAttendanceSheet = (cell: CellGroup) => {
    setSelectedCell(cell);
    
    // Initialize sheet with ONLY cell members as 'Unmarked'
    const cellMembers = members.filter(m => cell.member_ids.includes(m.id));
    const initialRecords: CellAttendanceRecord[] = cellMembers.map(m => ({
      member_id: m.id,
      status: 'Unmarked'
    }));
    setAttendanceRecords(initialRecords);
    setIsAttendanceSheetOpen(true);
  };

  const handleLogAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendanceForm.cell_id) return;
    
    const cell = cells.find(c => c.id === attendanceForm.cell_id);
    if (cell) {
      openAttendanceSheet(cell);
      setIsAttendanceModalOpen(false);
    }
  };

  const handleStatusChange = (memberId: string, status: CellAttendanceRecord['status']) => {
    setAttendanceRecords(prev => prev.map(r => 
      r.member_id === memberId ? { ...r, status: r.status === status ? 'Unmarked' : status } : r
    ));
  };

  const saveAttendanceSheet = async () => {
    setIsLoading(true);
    // In a real app, we'd save to cell_attendance table
    setTimeout(() => {
      setIsAttendanceSheetOpen(false);
      setIsLoading(false);
      alert('Attendance sheet synchronized successfully!');
    }, 1000);
  };

  const handleToggleCellMember = (memberId: string) => {
    if (!selectedCell) return;
    
    setCells(prev => prev.map(c => {
      if (c.id === selectedCell.id) {
        const isMember = c.member_ids.includes(memberId);
        const newIds = isMember 
          ? c.member_ids.filter(id => id !== memberId)
          : [...c.member_ids, memberId];
        
        const updatedCell = { ...c, member_ids: newIds };
        setSelectedCell(updatedCell); // Update selected cell state too
        return updatedCell;
      }
      return c;
    }));
  };

  const openManageMembers = (cell: CellGroup) => {
    setSelectedCell(cell);
    setIsManageMembersModalOpen(true);
  };

  const openEditModal = (cell: CellGroup) => {
    setSelectedCell(cell);
    setCellForm({
      name: cell.name,
      leader: cell.leader,
      location: cell.location,
      meeting_time: cell.meeting_time,
      status: cell.status
    });
    setIsEditCellModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 pb-20">
      {/* 1. Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 py-4 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2.5rem] flex items-center justify-center shadow-xl border-4 border-white ring-1 ring-slate-100 transform hover:rotate-3 transition-transform">
            <MapPin className="w-10 h-10" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full mb-1">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
               <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Live Network</span>
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Cell Groups</h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsNewCellModalOpen(true)}
            className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-3"
          >
            <Plus className="w-5 h-5" />
            Establish New Cell
          </button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Cells', value: cells.length.toString(), icon: Layers, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Avg. Attendance', value: '84%', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Members', value: cells.reduce((acc, c) => acc + c.member_ids.length, 0).toString(), icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Growth Rate', value: '+12%', icon: TrendingUp, color: 'text-fh-gold', bg: 'bg-fh-gold/10' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
            <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 3. Main Directory */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Cell Directory</h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search cells..." 
                    className="pl-10 pr-6 py-3 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all">
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {cells.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map((cell) => (
                <div key={cell.id} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-emerald-500/30 transition-all group flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm font-black text-emerald-600">
                      {cell.name.substring(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">{cell.name}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                          cell.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 
                          cell.status === 'Warning' ? 'bg-rose-100 text-rose-700' : 
                          cell.status === 'New' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {cell.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {cell.member_ids.length} Members</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {cell.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden md:block">
                      <p className="text-[10px] font-black text-slate-800 uppercase">{cell.leader}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{cell.meeting_time}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => openAttendanceSheet(cell)}
                        className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                        title="Register Attendance"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => openManageMembers(cell)}
                        className="p-4 bg-white text-slate-400 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                        title="Manage Members"
                      >
                        <UserPlus className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => openEditModal(cell)}
                        className="p-4 bg-white text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                        title="Modify Cell"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Sidebar Content */}
        <div className="space-y-6">
          <div className="bg-emerald-600 p-10 rounded-[3rem] text-white shadow-xl relative overflow-hidden">
             <Calendar className="absolute -right-4 -bottom-4 w-40 h-40 opacity-10 rotate-12" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">Next Joint Meeting</p>
             <h4 className="text-3xl font-black mb-2 leading-tight">Cell Leaders Summit 2026</h4>
             <p className="text-sm font-medium opacity-80 mb-8">March 15 • 5:00 PM • Youth Hall</p>
             <button 
               onClick={() => setIsAttendanceModalOpen(true)}
               className="w-full py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-emerald-600 transition-all"
             >
               Register Attendance
             </button>
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-8">Reporting Compliance</h4>
            <div className="space-y-8">
              {[
                { label: 'Weekly Reports', value: 95, color: 'bg-emerald-500' },
                { label: 'Attendance Logs', value: 82, color: 'bg-blue-500' },
                { label: 'Soul Winning', value: 64, color: 'bg-violet-500' },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-3">
                    <span className="text-slate-400">{item.label}</span>
                    <span className="text-slate-900">{item.value}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${item.value}%` }}
                      transition={{ duration: 1, delay: i * 0.2 }}
                      className={`h-full ${item.color}`} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={() => setIsReportModalOpen(true)}
            className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:translate-y-[-2px] active:translate-y-0 transition-all flex items-center justify-center gap-3"
          >
            <FileText className="w-5 h-5" />
            Submit Weekly Report
          </button>
        </div>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {/* Manage Members Modal */}
        {isManageMembersModalOpen && selectedCell && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setIsManageMembersModalOpen(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border-b-[12px] border-emerald-600"
            >
              <div className="p-8 bg-slate-50 flex items-center justify-between border-b border-slate-100">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Manage Cell Members</h3>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-1">{selectedCell.name} • {selectedCell.leader}</p>
                </div>
                <button onClick={() => setIsManageMembersModalOpen(false)} className="text-slate-400 hover:text-black transition-colors"><X className="w-6 h-6" /></button>
              </div>
              
              <div className="p-8">
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search all active members..." 
                    className="w-full pl-12 pr-6 py-4 bg-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                    value={memberSearchTerm}
                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                  />
                </div>

                <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                  {members.filter(m => `${m.first_name} ${m.last_name}`.toLowerCase().includes(memberSearchTerm.toLowerCase())).map(member => {
                    const isAssigned = selectedCell.member_ids.includes(member.id);
                    return (
                      <div key={member.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-emerald-500/20 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${isAssigned ? 'bg-emerald-600 text-white' : 'bg-white text-slate-400 shadow-sm'}`}>
                            {member.first_name[0]}{member.last_name ? member.last_name[0] : ''}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{member.first_name} {member.last_name}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{member.phone || 'No Phone'}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleToggleCellMember(member.id)}
                          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                            isAssigned 
                              ? 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white' 
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                          }`}
                        >
                          {isAssigned ? 'Remove' : 'Register'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                    {selectedCell.member_ids.length} Registered Members
                  </span>
                </div>
                <button 
                  onClick={() => setIsManageMembersModalOpen(false)}
                  className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl active:scale-95 transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Establish New Cell Modal */}
        {isNewCellModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setIsNewCellModalOpen(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border-b-[12px] border-emerald-500"
            >
              <div className="p-8 bg-slate-50 flex items-center justify-between border-b border-slate-100">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Establish Cell</h3>
                <button onClick={() => setIsNewCellModalOpen(false)} className="text-slate-400 hover:text-black"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleCreateCell} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Cell Name</label>
                  <input required type="text" value={cellForm.name} onChange={e => setCellForm({...cellForm, name: e.target.value})} className="w-full px-6 py-4 bg-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all" placeholder="e.g. Zion Cell" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Cell Leader</label>
                  <input required type="text" value={cellForm.leader} onChange={e => setCellForm({...cellForm, leader: e.target.value})} className="w-full px-6 py-4 bg-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all" placeholder="Leader Name" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Location</label>
                    <input required type="text" value={cellForm.location} onChange={e => setCellForm({...cellForm, location: e.target.value})} className="w-full px-6 py-4 bg-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all" placeholder="Area" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Meeting Time</label>
                    <input required type="text" value={cellForm.meeting_time} onChange={e => setCellForm({...cellForm, meeting_time: e.target.value})} className="w-full px-6 py-4 bg-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all" placeholder="e.g. Wed 6:30 PM" />
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:translate-y-[-2px] active:translate-y-0 transition-all disabled:opacity-50">
                  {isLoading ? 'Processing...' : 'Confirm Establishment'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Edit Cell Modal */}
        {isEditCellModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setIsEditCellModalOpen(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border-b-[12px] border-blue-500"
            >
              <div className="p-8 bg-slate-50 flex items-center justify-between border-b border-slate-100">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Modify Cell</h3>
                <button onClick={() => setIsEditCellModalOpen(false)} className="text-slate-400 hover:text-black"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleUpdateCell} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Cell Name</label>
                  <input required type="text" value={cellForm.name} onChange={e => setCellForm({...cellForm, name: e.target.value})} className="w-full px-6 py-4 bg-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/20 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Cell Leader</label>
                  <input required type="text" value={cellForm.leader} onChange={e => setCellForm({...cellForm, leader: e.target.value})} className="w-full px-6 py-4 bg-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/20 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Location</label>
                    <input required type="text" value={cellForm.location} onChange={e => setCellForm({...cellForm, location: e.target.value})} className="w-full px-6 py-4 bg-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/20 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Status</label>
                    <select value={cellForm.status} onChange={e => setCellForm({...cellForm, status: e.target.value as any})} className="w-full px-6 py-4 bg-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/20 transition-all appearance-none">
                      <option value="Active">Active</option>
                      <option value="Warning">Warning</option>
                      <option value="New">New</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:translate-y-[-2px] active:translate-y-0 transition-all disabled:opacity-50">
                  {isLoading ? 'Saving...' : 'Update Records'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Submit Report Modal */}
        {isReportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setIsReportModalOpen(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border-b-[12px] border-slate-900"
            >
              <div className="p-8 bg-slate-50 flex items-center justify-between border-b border-slate-100">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Weekly Report</h3>
                <button onClick={() => setIsReportModalOpen(false)} className="text-slate-400 hover:text-black"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleSubmitReport} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Select Cell</label>
                    <select required value={reportForm.cell_id} onChange={e => setReportForm({...reportForm, cell_id: e.target.value})} className="w-full px-6 py-4 bg-slate-100 rounded-2xl font-bold text-slate-800 outline-none appearance-none">
                      <option value="">-- Select --</option>
                      {cells.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Meeting Date</label>
                    <input required type="date" value={reportForm.meeting_date} onChange={e => setReportForm({...reportForm, meeting_date: e.target.value})} className="w-full px-6 py-4 bg-slate-100 rounded-2xl font-bold text-slate-800 outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Attendance</label>
                    <input required type="number" value={reportForm.attendance_count} onChange={e => setReportForm({...reportForm, attendance_count: parseInt(e.target.value) || 0})} className="w-full px-6 py-4 bg-slate-100 rounded-2xl font-bold text-slate-800 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">New Souls</label>
                    <input required type="number" value={reportForm.new_souls} onChange={e => setReportForm({...reportForm, new_souls: parseInt(e.target.value) || 0})} className="w-full px-6 py-4 bg-slate-100 rounded-2xl font-bold text-slate-800 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Offering (GHS)</label>
                    <input required type="number" step="0.01" value={reportForm.offering_amount} onChange={e => setReportForm({...reportForm, offering_amount: parseFloat(e.target.value) || 0})} className="w-full px-6 py-4 bg-slate-100 rounded-2xl font-bold text-slate-800 outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Testimony / Remarks</label>
                  <textarea value={reportForm.testimony} onChange={e => setReportForm({...reportForm, testimony: e.target.value})} className="w-full px-6 py-4 bg-slate-100 rounded-2xl font-bold text-slate-800 outline-none h-24 resize-none" placeholder="Share what happened..." />
                </div>
                <button type="submit" disabled={isLoading} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:translate-y-[-2px] active:translate-y-0 transition-all disabled:opacity-50">
                  {isLoading ? 'Submitting...' : 'Submit Report'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Register Attendance Modal */}
        {isAttendanceModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setIsAttendanceModalOpen(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border-b-[12px] border-emerald-600"
            >
              <div className="p-8 bg-slate-50 flex items-center justify-between border-b border-slate-100">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Log Attendance</h3>
                <button onClick={() => setIsAttendanceModalOpen(false)} className="text-slate-400 hover:text-black"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleLogAttendance} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Select Cell</label>
                  <select required value={attendanceForm.cell_id} onChange={e => setAttendanceForm({...attendanceForm, cell_id: e.target.value})} className="w-full px-6 py-4 bg-slate-100 rounded-2xl font-bold text-slate-800 outline-none appearance-none">
                    <option value="">-- Select Cell --</option>
                    {cells.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Meeting Date</label>
                  <input required type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="w-full px-6 py-4 bg-slate-100 rounded-2xl font-bold text-slate-800 outline-none" />
                </div>
                <button type="submit" disabled={isLoading} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:translate-y-[-2px] active:translate-y-0 transition-all disabled:opacity-50">
                  {isLoading ? 'Opening...' : 'Open Attendance Sheet'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
        {/* Attendance Sheet Modal (The "Access Sheet" model) */}
        {isAttendanceSheetOpen && (
          <div className="fixed inset-0 z-[120] flex flex-col bg-slate-50 animate-in fade-in duration-300">
            <div className="bg-white border-b border-slate-100 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setIsAttendanceSheetOpen(false)} 
                  className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                >
                  <ChevronRight className="w-6 h-6 rotate-180" />
                </button>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                    {selectedCell?.name} Attendance
                  </h3>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em] mt-1">
                    Meeting Date: {attendanceDate}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative hidden md:block">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Filter members..." 
                    className="pl-10 pr-6 py-3 bg-slate-50 rounded-xl text-xs font-bold outline-none w-64 border border-slate-100"
                    value={memberSearchTerm}
                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                  />
                </div>
                <button 
                  onClick={saveAttendanceSheet}
                  disabled={isLoading}
                  className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] shadow-xl active:scale-95 transition-all flex items-center gap-3"
                >
                  {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full" /> : <Save className="w-4 h-4" />}
                  Authorize Sync
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-10">
              <div className="max-w-5xl mx-auto bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100">
                    <tr>
                      <th className="px-10 py-6">Member Identity</th>
                      <th className="px-10 py-6 text-center">Status Toggle</th>
                      <th className="px-10 py-6 text-right hidden md:table-cell">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {members.filter(m => 
                      selectedCell?.member_ids.includes(m.id) && 
                      `${m.first_name} ${m.last_name}`.toLowerCase().includes(memberSearchTerm.toLowerCase())
                    ).length > 0 ? (
                      members.filter(m => 
                        selectedCell?.member_ids.includes(m.id) && 
                        `${m.first_name} ${m.last_name}`.toLowerCase().includes(memberSearchTerm.toLowerCase())
                      ).map(m => {
                        const record = attendanceRecords.find(r => r.member_id === m.id);
                        const s = record?.status || 'Unmarked';
                        return (
                          <tr key={m.id} className="hover:bg-slate-50/50 transition-all group">
                            <td className="px-10 py-6">
                              <div className="flex items-center gap-5">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs shadow-inner transition-colors ${
                                  s === 'Present' ? 'bg-emerald-500 text-white' : 
                                  s === 'Absent' ? 'bg-rose-500 text-white' :
                                  s === 'Excused' ? 'bg-violet-500 text-white' :
                                  'bg-slate-100 text-slate-400'
                                }`}>
                                  {m.first_name[0]}{m.last_name ? m.last_name[0] : ''}
                                </div>
                                <div>
                                  <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{m.first_name} {m.last_name}</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{m.gender || '---'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-10 py-6">
                              <div className="flex justify-center gap-2 bg-slate-50 p-2 rounded-2xl w-fit mx-auto border border-slate-100">
                                {(['Present', 'Absent', 'Excused'] as const).map(st => (
                                  <button 
                                    key={st} 
                                    onClick={() => handleStatusChange(m.id, st)} 
                                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                      s === st ? (
                                        st === 'Present' ? 'bg-emerald-500 text-white shadow-lg' : 
                                        st === 'Absent' ? 'bg-rose-500 text-white shadow-lg' : 
                                        'bg-violet-500 text-white shadow-lg'
                                      ) : 'text-slate-400 hover:bg-white'
                                    }`}
                                  >
                                    {st.charAt(0)}<span className="hidden lg:inline">{st.slice(1)}</span>
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="px-10 py-6 text-right hidden md:table-cell">
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.status || 'Member'}</span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-10 py-20 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                              <Users className="w-8 h-8" />
                            </div>
                            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">No registered members found for this cell</p>
                            <button 
                              onClick={() => { setIsAttendanceSheetOpen(false); setIsManageMembersModalOpen(true); }}
                              className="text-emerald-600 font-black uppercase text-[10px] tracking-widest hover:underline"
                            >
                              Register Members Now
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CellMeetingView;
