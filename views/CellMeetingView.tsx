
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

interface CellReport {
  id: string;
  cell_id: string;
  cell_name: string;
  meeting_date: string;
  attendance_count: number;
  new_souls: number;
  testimony: string;
  offering_amount: number;
  created_at: string;
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
  const [reports, setReports] = useState<CellReport[]>([]);
  const [activeTab, setActiveTab] = useState<'directory' | 'reports'>('directory');
  const [error, setError] = useState<string | null>(null);
  
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
    fetchReports();
  }, []);

  useEffect(() => {
    const syncAttendance = async () => {
      if (reportForm.cell_id && reportForm.meeting_date) {
        try {
          const { count, error } = await supabase
            .from('cell_attendance')
            .select('*', { count: 'exact', head: true })
            .eq('cell_id', reportForm.cell_id)
            .eq('meeting_date', reportForm.meeting_date)
            .eq('status', 'Present');
          
          if (!error && count !== null) {
            setReportForm(prev => ({ ...prev, attendance_count: count }));
          } else if (error && error.code === 'PGRST205') {
            // Fallback to localStorage
            const localAttendance = localStorage.getItem('fh_cell_attendance');
            if (localAttendance) {
              const allAttendance = JSON.parse(localAttendance);
              const count = allAttendance.filter((a: any) => 
                a.cell_id === reportForm.cell_id && 
                a.meeting_date === reportForm.meeting_date && 
                a.status === 'Present'
              ).length;
              setReportForm(prev => ({ ...prev, attendance_count: count }));
            }
          }
        } catch (err) {
          console.error('Error syncing attendance:', err);
          // Fallback to localStorage on any error
          const localAttendance = localStorage.getItem('fh_cell_attendance');
          if (localAttendance) {
            const allAttendance = JSON.parse(localAttendance);
            const count = allAttendance.filter((a: any) => 
              a.cell_id === reportForm.cell_id && 
              a.meeting_date === reportForm.meeting_date && 
              a.status === 'Present'
            ).length;
            setReportForm(prev => ({ ...prev, attendance_count: count }));
          }
        }
      }
    };
    syncAttendance();
  }, [reportForm.cell_id, reportForm.meeting_date, isReportModalOpen]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase.from('members').select('*').eq('status', 'Active').order('first_name');
      if (error) throw error;
      if (data) setMembers(data);
    } catch (err: any) {
      console.error('Error fetching members:', err);
    }
  };

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase.from('cell_reports').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setReports(data);
    } catch (err: any) {
      console.error('Error fetching reports:', err);
      const errorMessage = err.message === 'Failed to fetch' || err.name === 'TypeError' 
        ? "Network Error: Unable to connect to the database. Please check your internet connection."
        : err.message || "An unexpected error occurred while fetching reports.";
      setError(errorMessage);
    }
  };

  const fetchCells = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from('cell_groups').select('*').order('name');
      
      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('Supabase table "cell_groups" not found. Falling back to localStorage.');
          const localData = localStorage.getItem('fh_cell_groups');
          if (localData) {
            setCells(JSON.parse(localData));
            return;
          }
        } else {
          throw error;
        }
      }
      
      if (data && data.length > 0) {
        setCells(data);
        localStorage.setItem('fh_cell_groups', JSON.stringify(data));
      } else {
        // Fallback to mock data ONLY if table is empty
        const mockCells: CellGroup[] = [
          { id: '1', name: 'Faith Cell Group', leader: 'David Ramson', location: 'Church Premises', meeting_time: 'Thursday 6:30 PM', member_ids: [], status: 'Active', growth: '+2' },
          { id: '2', name: 'Newlife football Academy', leader: 'Justice Amissah', location: 'Newlife football Academy Camp', meeting_time: 'Mon. 6:00 PM', member_ids: [], status: 'Active', growth: '+5' },
        ];
        // Try to seed the database if it's empty
        await supabase.from('cell_groups').insert(mockCells);
        setCells(mockCells);
        localStorage.setItem('fh_cell_groups', JSON.stringify(mockCells));
      }
    } catch (err: any) {
      console.error('Error fetching cells:', err);
      const errorMessage = err.message === 'Failed to fetch' || err.name === 'TypeError' 
        ? "Network Error: Unable to connect to the database. Please check your internet connection."
        : err.message || "An unexpected error occurred while fetching cells.";
      setError(errorMessage);

      const localData = localStorage.getItem('fh_cell_groups');
      if (localData) {
        setCells(JSON.parse(localData));
      } else {
        const mockCells: CellGroup[] = [
          { id: '1', name: 'Faith Cell Group', leader: 'David Ramson', location: 'Church Premises', meeting_time: 'Thursday 6:30 PM', member_ids: [], status: 'Active', growth: '+2' },
          { id: '2', name: 'Newlife football Academy', leader: 'Justice Amissah', location: 'Newlife football Academy Camp', meeting_time: 'Mon. 6:00 PM', member_ids: [], status: 'Active', growth: '+5' },
        ];
        setCells(mockCells);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCell = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const newCellData = {
      id: Math.random().toString(36).substr(2, 9),
      name: cellForm.name,
      leader: cellForm.leader,
      location: cellForm.location,
      meeting_time: cellForm.meeting_time,
      status: cellForm.status,
      member_ids: [],
      growth: '0'
    };

    try {
      const { data, error } = await supabase.from('cell_groups').insert([newCellData]).select();
      
      if (error && error.code !== 'PGRST205') throw error;
      
      const createdCell = data ? data[0] : newCellData;
      const updatedCells = [createdCell, ...cells];
      setCells(updatedCells);
      localStorage.setItem('fh_cell_groups', JSON.stringify(updatedCells));
      setIsNewCellModalOpen(false);
      setCellForm({ name: '', leader: '', location: '', meeting_time: '', status: 'Active' });
      alert('Cell Group established successfully!');
    } catch (err) {
      console.error('Error creating cell:', err);
      alert('Failed to establish cell group. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCell) return;
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('cell_groups')
        .update({ ...cellForm })
        .eq('id', selectedCell.id);
      
      if (error && error.code !== 'PGRST205') throw error;
      
      const updatedCells = cells.map(c => c.id === selectedCell.id ? { ...c, ...cellForm } : c);
      setCells(updatedCells);
      localStorage.setItem('fh_cell_groups', JSON.stringify(updatedCells));
      setIsEditCellModalOpen(false);
      setSelectedCell(null);
      alert('Cell Group updated successfully!');
    } catch (err) {
      console.error('Error updating cell:', err);
      alert('Failed to update cell group.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const cell = cells.find(c => c.id === reportForm.cell_id);
    const reportData = {
      ...reportForm,
      cell_name: cell?.name || 'Unknown Cell',
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase.from('cell_reports').insert([reportData]).select();
      if (error) throw error;
      
      if (data) {
        setReports([data[0], ...reports]);
        setIsReportModalOpen(false);
        setReportForm({ cell_id: '', meeting_date: new Date().toISOString().split('T')[0], attendance_count: 0, new_souls: 0, testimony: '', offering_amount: 0 });
        alert('Weekly report submitted successfully!');
      }
    } catch (err) {
      console.error('Error submitting report:', err);
      alert('Failed to submit report.');
    } finally {
      setIsLoading(false);
    }
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
    
    const attendanceData = attendanceRecords.map(record => ({
      cell_id: selectedCell?.id,
      meeting_date: attendanceDate,
      member_id: record.member_id,
      status: record.status,
      created_at: new Date().toISOString()
    }));

    try {
      const { error } = await supabase.from('cell_attendance').insert(attendanceData);
      
      // Always save to localStorage as a backup or if table is missing
      const localAttendance = localStorage.getItem('fh_cell_attendance');
      let allAttendance = localAttendance ? JSON.parse(localAttendance) : [];
      // Remove old records for this cell and date to avoid duplicates
      allAttendance = allAttendance.filter((a: any) => 
        !(a.cell_id === selectedCell?.id && a.meeting_date === attendanceDate)
      );
      allAttendance = [...allAttendance, ...attendanceData];
      localStorage.setItem('fh_cell_attendance', JSON.stringify(allAttendance));

      if (error && error.code !== 'PGRST205') throw error;
      
      setIsAttendanceSheetOpen(false);
      alert('Attendance sheet Updated successfully!');
    } catch (err) {
      console.error('Error saving attendance:', err);
      alert('Failed to save attendance.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCellMember = async (memberId: string) => {
    if (!selectedCell) return;
    
    const isMember = selectedCell.member_ids.includes(memberId);
    const newIds = isMember 
      ? selectedCell.member_ids.filter(id => id !== memberId)
      : [...selectedCell.member_ids, memberId];
    
    try {
      const { error } = await supabase
        .from('cell_groups')
        .update({ member_ids: newIds })
        .eq('id', selectedCell.id);
      
      if (error && error.code !== 'PGRST205') throw error;

      const updatedCells = cells.map(c => {
        if (c.id === selectedCell.id) {
          const updatedCell = { ...c, member_ids: newIds };
          setSelectedCell(updatedCell); // Update selected cell state too
          return updatedCell;
        }
        return c;
      });
      
      setCells(updatedCells);
      localStorage.setItem('fh_cell_groups', JSON.stringify(updatedCells));
    } catch (err) {
      console.error('Error toggling cell member:', err);
      alert('Failed to update member assignment.');
    }
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
      {error && (
        <div className="p-6 bg-rose-50 border-2 border-rose-100 rounded-[2rem] flex items-center gap-4 animate-in slide-in-from-top-4">
          <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-rose-900 uppercase tracking-tight">System Warning</h3>
            <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mt-0.5">{error}</p>
          </div>
          <button 
            onClick={() => fetchCells()}
            className="ml-auto px-6 py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-md"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* 1. Header Section */}
      <div className="flex flex-col items-center lg:flex-row lg:items-center justify-between gap-6 py-8 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm text-center lg:text-left">
        <div className="flex flex-col items-center lg:flex-row gap-6">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2.5rem] flex items-center justify-center shadow-xl border-4 border-white ring-1 ring-slate-100 transform hover:rotate-3 transition-transform">
            <MapPin className="w-10 h-10" />
          </div>
          <div>
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
          { label: 'Avg. Attendance', value: '0%', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Members', value: cells.reduce((acc, c) => acc + c.member_ids.length, 0).toString(), icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Growth Rate', value: '0%', icon: TrendingUp, color: 'text-fh-gold', bg: 'bg-fh-gold/10' },
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
        {/* 3. Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-4 p-1 bg-slate-50 rounded-2xl w-fit">
                <button 
                  onClick={() => setActiveTab('directory')}
                  className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'directory' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Cell Directory
                </button>
                <button 
                  onClick={() => setActiveTab('reports')}
                  className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'reports' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Submitted Reports
                </button>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder={activeTab === 'directory' ? "Search cells..." : "Search reports..."} 
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
              {activeTab === 'directory' ? (
                cells.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map((cell) => (
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
                          onClick={() => {
                            setReportForm(prev => ({ ...prev, cell_id: cell.id }));
                            setIsReportModalOpen(true);
                          }}
                          className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                          title="Submit Weekly Report"
                        >
                          <FileText className="w-5 h-5" />
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
                ))
              ) : (
                reports.filter(r => r.cell_name.toLowerCase().includes(searchTerm.toLowerCase())).length > 0 ? (
                  reports.filter(r => r.cell_name.toLowerCase().includes(searchTerm.toLowerCase())).map((report) => (
                    <div key={report.id} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-slate-200 transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-900">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-md font-black text-slate-800 uppercase tracking-tight">{report.cell_name}</h4>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Meeting Date: {report.meeting_date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">GHS {report.offering_amount.toFixed(2)}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Offering</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-4 bg-white rounded-2xl border border-slate-100">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Attendance</p>
                          <p className="text-lg font-black text-slate-900">{report.attendance_count}</p>
                        </div>
                        <div className="p-4 bg-white rounded-2xl border border-slate-100">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">New Souls</p>
                          <p className="text-lg font-black text-emerald-600">{report.new_souls}</p>
                        </div>
                      </div>
                      
                      {report.testimony && (
                        <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                          <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Testimony / Remarks</p>
                          <p className="text-xs font-medium text-slate-700 italic">"{report.testimony}"</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FileText className="w-10 h-10 text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">No reports submitted yet</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* 4. Sidebar Content */}
        <div className="space-y-6">
          <div className="bg-emerald-600 p-10 rounded-[3rem] text-white shadow-xl relative overflow-hidden">
             <Calendar className="absolute -right-4 -bottom-4 w-40 h-40 opacity-10 rotate-12" />
             <h4 className="text-3xl font-black mb-2 leading-tight">Cell Meeting Attendance</h4>
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
                  Save
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
