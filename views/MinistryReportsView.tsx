
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Ministry, UserProfile } from '../types';
import { toast } from 'sonner';
import { 
  FileText, Plus, Search, Filter, Download, Printer, 
  ChevronRight, Calendar, Activity, TrendingUp, 
  AlertCircle, CheckCircle2, Clock, Save, Trash2, Edit3, X,
  BarChart3, PieChart, Layers, Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MinistryReportDocument from '../src/components/MinistryReportDocument';

interface MinistryReport {
  id: string;
  ministry_id: string;
  report_type: 'Quarterly' | 'Mid-year' | 'Annual';
  year: number;
  period: string;
  achievements: string;
  challenges: string;
  goals_next_period: string;
  financial_summary: any;
  attendance_summary: any;
  other_metrics: any;
  status: 'Draft' | 'Submitted' | 'Approved';
  created_at: string;
  ministries?: { name: string };
}

interface MinistryReportsViewProps {
  currentUser: UserProfile | null;
  ministryId?: string;
}

const MinistryReportsView: React.FC<MinistryReportsViewProps> = ({ currentUser, ministryId }) => {
  const [reports, setReports] = useState<MinistryReport[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  const [formData, setFormData] = useState({
    ministry_id: '',
    report_type: 'Quarterly' as 'Quarterly' | 'Mid-year' | 'Annual',
    year: new Date().getFullYear(),
    period: 'Q1',
    achievements: '',
    challenges: '',
    goals_next_period: '',
    financial_summary: { income: 0, expenses: 0, balance: 0 },
    attendance_summary: { average: 0, peak: 0, growth: 0 },
    other_metrics: {},
    status: 'Draft' as 'Draft' | 'Submitted' | 'Approved'
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingReport, setViewingReport] = useState<MinistryReport | null>(null);

  const repairSQL = `
    CREATE TABLE IF NOT EXISTS public.ministry_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ministry_id UUID REFERENCES public.ministries(id) ON DELETE CASCADE,
      report_type TEXT NOT NULL,
      year INTEGER NOT NULL,
      period TEXT NOT NULL,
      achievements TEXT,
      challenges TEXT,
      goals_next_period TEXT,
      financial_summary JSONB DEFAULT '{}',
      attendance_summary JSONB DEFAULT '{}',
      other_metrics JSONB DEFAULT '{}',
      status TEXT DEFAULT 'Draft',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      created_by UUID REFERENCES public.profiles(id)
    );

    ALTER TABLE public.ministry_reports ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow all for authenticated users on ministry_reports" ON public.ministry_reports;
    CREATE POLICY "Allow all for authenticated users on ministry_reports" ON public.ministry_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

    NOTIFY pgrst, 'reload schema';
  `;

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: mData } = await supabase.from('ministries').select('*').order('name');
      setMinistries(mData || []);

      let query = supabase
        .from('ministry_reports')
        .select('*, ministries(name)')
        .order('created_at', { ascending: false });

      if (ministryId) {
        query = query.eq('ministry_id', ministryId);
      }

      const { data: rData, error: rError } = await query;

      if (rError) {
        if (rError.code === '42P01' || rError.code === 'PGRST205') setTableMissing(true);
        else throw rError;
      } else {
        setReports(rData || []);
        setTableMissing(false);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (ministryId) {
      setFormData(prev => ({ ...prev, ministry_id: ministryId }));
    }
  }, [ministryId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent as keyof typeof prev] as any, [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ministry_id) {
      toast.error("Please select a ministry");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        created_by: currentUser?.id,
        updated_at: new Date().toISOString()
      };

      let error;
      if (editingId) {
        const result = await supabase.from('ministry_reports').update(payload).eq('id', editingId);
        error = result.error;
      } else {
        const result = await supabase.from('ministry_reports').insert([payload]);
        error = result.error;
      }

      if (error) throw error;

      toast.success(editingId ? "Report updated" : "Report submitted");
      setIsModalOpen(false);
      setEditingId(null);
      fetchInitialData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;
    try {
      const { error } = await supabase.from('ministry_reports').delete().eq('id', id);
      if (error) throw error;
      toast.success("Report deleted");
      fetchInitialData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesSearch = r.ministries?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         r.period.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || r.report_type === filterType;
    return matchesSearch && matchesType;
  });

  if (tableMissing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-rose-100">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Reporting System Offline</h2>
        <p className="text-slate-500 max-w-md mb-8 font-medium">The ministry reports table hasn't been initialized yet. Run the repair script to enable this feature.</p>
        <div className="w-full max-w-2xl bg-slate-900 rounded-2xl p-6 mb-8 text-left overflow-x-auto">
          <pre className="text-fh-gold text-[10px] font-mono leading-relaxed">{repairSQL}</pre>
        </div>
        <button 
          onClick={() => { navigator.clipboard.writeText(repairSQL); toast.success("SQL Copied!"); }}
          className="px-8 py-4 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all"
        >
          Copy Repair Script
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Ministry Reports</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] flex items-center gap-2">
            <Activity className="w-3 h-3 text-fh-gold" />
            Performance & Accountability Hub
          </p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({
              ministry_id: '',
              report_type: 'Quarterly',
              year: new Date().getFullYear(),
              period: 'Q1',
              achievements: '',
              challenges: '',
              goals_next_period: '',
              financial_summary: { income: 0, expenses: 0, balance: 0 },
              attendance_summary: { average: 0, peak: 0, growth: 0 },
              other_metrics: {},
              status: 'Draft'
            });
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-3 px-8 py-4 bg-slate-900 text-fh-gold rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all border-b-4 border-black/30"
        >
          <Plus className="w-5 h-5" />
          New Report
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Reports', value: reports.length, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Annual Reports', value: reports.filter(r => r.report_type === 'Annual').length, icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Mid-Year', value: reports.filter(r => r.report_type === 'Mid-year').length, icon: Briefcase, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Pending Drafts', value: reports.filter(r => r.status === 'Draft').length, icon: Clock, color: 'text-slate-400', bg: 'bg-slate-50' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center shadow-inner`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <h4 className="text-2xl font-black text-slate-900">{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
          <input 
            type="text" 
            placeholder="Search by ministry or period..." 
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-fh-gold transition-all text-sm font-bold text-slate-800 shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select 
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest outline-none focus:border-fh-gold transition-all"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Mid-year">Mid-Year</option>
            <option value="Annual">Annual</option>
          </select>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 text-center text-slate-300 font-black uppercase tracking-[0.4em] animate-pulse">Syncing Reports...</div>
        ) : filteredReports.length > 0 ? filteredReports.map((report) => (
          <div key={report.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden flex flex-col border-b-4 hover:border-fh-gold">
            <div className="p-8 flex-1">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-slate-50 text-fh-green rounded-2xl flex items-center justify-center font-black text-lg border border-slate-100 shadow-inner">
                  {report.ministries?.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm ${
                    report.report_type === 'Annual' ? 'bg-indigo-50 text-indigo-600' : 
                    report.report_type === 'Mid-year' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {report.report_type}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                    report.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                  }`}>
                    {report.status}
                  </span>
                </div>
              </div>

              <h3 className="text-xl font-black text-slate-900 mb-1 uppercase tracking-tight">{report.ministries?.name}</h3>
              <p className="text-[10px] font-black text-fh-gold uppercase tracking-[0.2em] mb-4">{report.period} {report.year}</p>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 text-slate-500">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <p className="text-xs font-bold line-clamp-1">{report.achievements || 'No achievements recorded.'}</p>
                </div>
                <div className="flex items-center gap-3 text-slate-500">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <p className="text-xs font-bold line-clamp-1">{report.challenges || 'No challenges recorded.'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                <div className="bg-slate-50/50 p-3 rounded-2xl text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Attendance</p>
                  <p className="text-sm font-black text-slate-800">{report.attendance_summary?.average || 0}</p>
                </div>
                <div className="bg-slate-50/50 p-3 rounded-2xl text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Financials</p>
                  <p className="text-sm font-black text-slate-800">GH₵{report.financial_summary?.income || 0}</p>
                </div>
              </div>
            </div>

            <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setEditingId(report.id);
                    setFormData({
                      ministry_id: report.ministry_id,
                      report_type: report.report_type,
                      year: report.year,
                      period: report.period,
                      achievements: report.achievements,
                      challenges: report.challenges,
                      goals_next_period: report.goals_next_period,
                      financial_summary: report.financial_summary || { income: 0, expenses: 0, balance: 0 },
                      attendance_summary: report.attendance_summary || { average: 0, peak: 0, growth: 0 },
                      other_metrics: report.other_metrics || {},
                      status: report.status
                    });
                    setIsModalOpen(true);
                  }}
                  className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-fh-green transition-all shadow-sm active:scale-90"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(report.id)}
                  className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-500 transition-all shadow-sm active:scale-90"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <button 
                onClick={() => setViewingReport(report)}
                className="flex items-center gap-2 text-[10px] font-black text-fh-green uppercase tracking-widest hover:underline"
              >
                View Full Report
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-slate-100 shadow-inner italic text-slate-300 font-black uppercase tracking-widest text-xs">No reports submitted yet.</div>
        )}
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" 
              onClick={() => !isSubmitting && setIsModalOpen(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-b-[12px] border-fh-gold"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-fh-green text-fh-gold rounded-2xl flex items-center justify-center shadow-lg">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">{editingId ? 'Modify Report' : 'New Ministry Report'}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance & Accountability Documentation</p>
                  </div>
                </div>
                <button disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-10 overflow-y-auto space-y-8 scrollbar-hide">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Select Ministry *</label>
                    <select 
                      name="ministry_id" 
                      value={formData.ministry_id} 
                      onChange={handleInputChange} 
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-bold text-slate-800 shadow-inner"
                      required
                    >
                      <option value="">Choose Ministry...</option>
                      {ministries.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Report Type *</label>
                    <select 
                      name="report_type" 
                      value={formData.report_type} 
                      onChange={handleInputChange} 
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-bold text-slate-800 shadow-inner"
                      required
                    >
                      <option value="Quarterly">Quarterly</option>
                      <option value="Mid-year">Mid-Year</option>
                      <option value="Annual">Annual</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Period *</label>
                    <select 
                      name="period" 
                      value={formData.period} 
                      onChange={handleInputChange} 
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-bold text-slate-800 shadow-inner"
                      required
                    >
                      {formData.report_type === 'Quarterly' && (
                        <>
                          <option value="Q1">Q1 (Jan - Mar)</option>
                          <option value="Q2">Q2 (Apr - Jun)</option>
                          <option value="Q3">Q3 (Jul - Sep)</option>
                          <option value="Q4">Q4 (Oct - Dec)</option>
                        </>
                      )}
                      {formData.report_type === 'Mid-year' && (
                        <>
                          <option value="H1">H1 (Jan - Jun)</option>
                          <option value="H2">H2 (Jul - Dec)</option>
                        </>
                      )}
                      {formData.report_type === 'Annual' && (
                        <option value="Full Year">Full Year</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Key Achievements</label>
                    <textarea 
                      name="achievements" 
                      value={formData.achievements} 
                      onChange={handleInputChange} 
                      rows={4} 
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-bold text-slate-800 shadow-inner resize-none"
                      placeholder="What were the highlights of this period?"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Challenges Encountered</label>
                    <textarea 
                      name="challenges" 
                      value={formData.challenges} 
                      onChange={handleInputChange} 
                      rows={4} 
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-bold text-slate-800 shadow-inner resize-none"
                      placeholder="What obstacles did the ministry face?"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Goals for Next Period</label>
                    <textarea 
                      name="goals_next_period" 
                      value={formData.goals_next_period} 
                      onChange={handleInputChange} 
                      rows={4} 
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-fh-gold/5 font-bold text-slate-800 shadow-inner resize-none"
                      placeholder="What are the objectives for the coming months?"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-6">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-500" />
                      Attendance Summary
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Avg Attendance</label>
                        <input type="number" name="attendance_summary.average" value={formData.attendance_summary.average} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Peak Attendance</label>
                        <input type="number" name="attendance_summary.peak" value={formData.attendance_summary.peak} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm" />
                      </div>
                    </div>
                  </div>

                  <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-6">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      Financial Summary (GH₵)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Income</label>
                        <input type="number" name="financial_summary.income" value={formData.financial_summary.income} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Expenses</label>
                        <input type="number" name="financial_summary.expenses" value={formData.financial_summary.expenses} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="px-12 py-4 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all border-b-4 border-black/30"
                  >
                    {isSubmitting ? 'Processing...' : (editingId ? 'Update Report' : 'Submit Report')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Viewer Modal */}
      <AnimatePresence>
        {viewingReport && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl" 
              onClick={() => setViewingReport(null)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-5xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border-b-[20px] border-fh-gold"
            >
              <div className="p-10 border-b border-slate-100 flex items-center justify-between no-print bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-900 text-fh-gold rounded-[1.5rem] flex items-center justify-center shadow-xl">
                    <Printer className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Report Document Viewer</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Official Ministry Documentation</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => window.print()} className="px-8 py-4 bg-slate-900 text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center gap-3">
                    <Printer className="w-4 h-4" />
                    Print Document
                  </button>
                  <button onClick={() => setViewingReport(null)} className="p-4 hover:bg-slate-200 rounded-full transition-all text-slate-400">
                    <X className="w-7 h-7" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto print:overflow-visible scrollbar-hide">
                <MinistryReportDocument 
                  organizationName="Faithhouse Chapel International"
                  reportPeriod={`${viewingReport.period} ${viewingReport.year}`}
                  dateGenerated={new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                  report={viewingReport}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MinistryReportsView;
