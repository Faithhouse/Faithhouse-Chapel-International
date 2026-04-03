
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '../supabaseClient';
import { UserProfile, FinancialRecord, Member, TitheRecord } from '../types';
import { 
  Users, 
  Plus, 
  Search, 
  Calendar as CalendarIcon, 
  DollarSign, 
  CreditCard, 
  Smartphone, 
  Hash, 
  FileText, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  Filter, 
  Printer, 
  X, 
  Lock,
  TrendingUp,
  BarChart as BarChartIcon,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import FinancialReportDocument from '../src/components/FinancialReportDocument';

interface FinanceViewProps {
  userProfile: UserProfile | null;
}

const FinanceView: React.FC<FinanceViewProps> = ({ userProfile }) => {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [titheRecords, setTitheRecords] = useState<TitheRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeTab, setActiveTab] = useState<'Statements' | 'Tithers'>('Statements');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportDropdownOpen, setIsReportDropdownOpen] = useState(false);
  const [isTitheModalOpen, setIsTitheModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [tableMissing, setTableMissing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [financialTrends, setFinancialTrends] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('All Months');
  const [isEditingRecord, setIsEditingRecord] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [isDeleteRecordConfirmOpen, setIsDeleteRecordConfirmOpen] = useState(false);
  const [isEditingTithe, setIsEditingTithe] = useState(false);
  const [editingTitheId, setEditingTitheId] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [titheToDelete, setTitheToDelete] = useState<string | null>(null);
  const [missingTables, setMissingTables] = useState<string[]>([]);
  const [lastError, setLastError] = useState('');

  const [formData, setFormData] = useState<Partial<FinancialRecord>>({
    service_date: new Date().toISOString().split('T')[0],
    service_type: 'Prophetic Word Service',
    tithes: 0,
    offerings: 0,
    seed: 0,
    expenses: 0,
    other_income: 0,
    bank_balance: 0,
    momo_balance: 0,
    witness1_name: '',
    witness2_name: '',
    notes: '',
    status: 'Posted'
  });

  const [titheFormData, setTitheFormData] = useState<Partial<TitheRecord>>({
    member_id: '',
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    service_type: 'Prophetic Word Service',
    notes: ''
  });

  useEffect(() => {
    fetchInitialData();

    const channel = supabase
      .channel('finance-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_records' }, () => fetchInitialData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tithe_entries' }, () => fetchInitialData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      const serviceTithes = titheRecords
        .filter(t => t.payment_date === formData.service_date && t.service_type === formData.service_type)
        .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
      
      if (serviceTithes > 0) {
        setFormData(p => ({ ...p, tithes: serviceTithes }));
      }
    }
  }, [formData.service_date, formData.service_type, titheRecords, isModalOpen]);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<'Monthly' | 'Audit'>('Monthly');

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    titheRecords.forEach(t => {
      const date = new Date(t.payment_date);
      months.add(date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }));
    });
    records.forEach(r => {
      const date = new Date(r.service_date);
      months.add(date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }));
    });
    return ['All Months', ...Array.from(months).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateB.getTime() - dateA.getTime();
    })];
  }, [titheRecords, records]);

  const processedRecords = useMemo(() => {
    const base = records.map(rec => {
      const serviceTithes = titheRecords
        .filter(t => t.payment_date === rec.service_date && t.service_type === rec.service_type)
        .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
      
      const tithes = serviceTithes > 0 ? serviceTithes : (Number(rec.tithes) || 0);
      const total_income = tithes + (Number(rec.offerings) || 0) + (Number(rec.seed) || 0) + (Number(rec.other_income) || 0);
      
      return { ...rec, tithes, total_income };
    });

    if (selectedMonth === 'All Months') return base;

    return base.filter(r => {
      const recMonth = new Date(r.service_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      return recMonth === selectedMonth;
    });
  }, [records, titheRecords, selectedMonth]);

  const sum = (key: keyof FinancialRecord) => processedRecords.reduce((a, r) => a + (Number(r[key]) || 0), 0);
  const totalRevenue = sum('tithes') + sum('offerings') + sum('seed') + sum('other_income');
  const netBalance = totalRevenue - sum('expenses');

  const filteredTithes = useMemo(() => {
    return titheRecords.filter(t => {
      const memberName = t.members 
        ? `${t.members.first_name} ${t.members.last_name}`.toLowerCase() 
        : `member id: ${t.member_id}`.toLowerCase();
      
      const matchesSearch = memberName.includes(searchTerm.toLowerCase());
      
      if (selectedMonth === 'All Months') return matchesSearch;
      
      const titheMonth = new Date(t.payment_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      return matchesSearch && titheMonth === selectedMonth;
    });
  }, [titheRecords, searchTerm, selectedMonth]);

  const groupedTithes = useMemo(() => {
    return filteredTithes.reduce((acc, tithe) => {
      const date = new Date(tithe.payment_date);
      const monthYear = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      if (!acc[monthYear]) {
        acc[monthYear] = [];
      }
      acc[monthYear].push(tithe);
      return acc;
    }, {} as Record<string, TitheRecord[]>);
  }, [filteredTithes]);

  const openingBalance = useMemo(() => {
    if (selectedMonth === 'All Months') return 0;
    
    try {
      const [monthName, yearStr] = selectedMonth.split(' ');
      const monthIndex = new Date(`${monthName} 1, ${yearStr}`).getMonth();
      const year = parseInt(yearStr);
      const startDate = new Date(year, monthIndex, 1);
      
      return records
        .filter(r => new Date(r.service_date) < startDate)
        .reduce((acc, rec) => {
          const serviceTithes = titheRecords
            .filter(t => t.payment_date === rec.service_date && t.service_type === rec.service_type)
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
          
          const tithes = serviceTithes > 0 ? serviceTithes : (Number(rec.tithes) || 0);
          const income = tithes + (Number(rec.offerings) || 0) + (Number(rec.seed) || 0) + (Number(rec.other_income) || 0);
          return acc + income - (Number(rec.expenses) || 0);
        }, 0);
    } catch (e) {
      return 0;
    }
  }, [records, titheRecords, selectedMonth]);

  const [tableStatus, setTableStatus] = useState<Record<string, boolean>>({
    members: false,
    financial_records: false
  });

  const fetchInitialData = async () => {
    setIsLoading(true);
    setLastError('');
    let currentMissing: string[] = [];
    let errorLog: string[] = [];
    let status = { members: false, financial_records: false };
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      // 1. Check Financial Records
      const { error: finErr } = await supabase.from('financial_records').select('id').limit(1);
      if (!finErr) status.financial_records = true;
      else if (finErr.code === '42P01' || finErr.code === 'PGRST205') currentMissing.push('financial_records');
      else errorLog.push(`financial_records: ${finErr.message}`);

      // 2. Check Members
      const { error: memErr } = await supabase.from('members').select('id').limit(1);
      if (!memErr) status.members = true;
      else if (memErr.code === '42P01' || memErr.code === 'PGRST205') currentMissing.push('members');
      else errorLog.push(`members: ${memErr.message}`);

      setTableStatus(status);
      const isMissing = !status.members || !status.financial_records;
      setTableMissing(isMissing);
      setMissingTables(currentMissing);

      if (isMissing) {
        setLastError(errorLog.length > 0 ? errorLog.join(' | ') : 'Some tables are still missing from the schema cache.');
        return;
      }

      // Fetch full data if everything is okay
      const [finRes, memRes, titheRes] = await Promise.all([
        supabase.from('financial_records').select('*').order('service_date', { ascending: false }),
        supabase.from('members').select('*').order('first_name'),
        supabase.from('tithe_entries').select('*, members(*)').order('payment_date', { ascending: false })
      ]);

      if (finRes.error) {
        console.error('Financial Records Fetch Error:', finRes.error);
        errorLog.push(`financial_records: ${finRes.error.message}`);
      }
      
      if (titheRes.error) {
        console.error('Tithe Records Fetch Error:', titheRes.error);
        if (titheRes.error.code === '42P01' || titheRes.error.code === 'PGRST205') currentMissing.push('tithe_entries');
        else errorLog.push(`tithe_entries: ${titheRes.error.message}`);
      }

      if (memRes.error) {
        console.error('Members Fetch Error:', memRes.error);
        errorLog.push(`members: ${memRes.error.message}`);
      }

      setRecords(finRes.data || []);
      setMembers(memRes.data || []);
      setTitheRecords(titheRes.data || []);
      
      // Calculate Financial Trends
      if (finRes.data && finRes.data.length > 0) {
        const finData = [...finRes.data].reverse().slice(-6).map(f => ({
          name: new Date(f.service_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          tithes: Number(f.tithes || 0),
          offerings: Number(f.offerings || 0),
          total: Number(f.tithes || 0) + Number(f.offerings || 0) + Number(f.seed || 0) + Number(f.other_income || 0)
        }));
        setFinancialTrends(finData);
      }
      
      if (errorLog.length > 0) {
        setLastError(errorLog.join(' | '));
      } else {
        setLastError('');
      }

    } catch (err: any) {
      console.error('Database Access Error:', err);
      if (err.message === 'Failed to fetch' || err.message?.includes('TypeError: Failed to fetch')) {
        setLastError("Network Error: Unable to connect to the database. Please check your internet connection.");
      } else {
        setLastError(err.message || 'An unexpected database error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const isNum = ['tithes', 'offerings', 'seed', 'expenses', 'other_income', 'bank_balance', 'momo_balance'].includes(name);
    setFormData(p => ({ ...p, [name]: isNum ? parseFloat(value) || 0 : value }));
  };

  const initiatePosting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.witness1_name?.trim() || !formData.witness2_name?.trim()) {
      return toast.error("Security Protocol: Dual witness signatures are mandatory for posting.");
    }
    setIsPinModalOpen(true);
  };

  const handleEditRecord = (record: FinancialRecord) => {
    setFormData({
      service_date: record.service_date,
      service_type: record.service_type,
      tithes: record.tithes,
      offerings: record.offerings,
      seed: record.seed,
      expenses: record.expenses,
      other_income: record.other_income,
      bank_balance: record.bank_balance,
      momo_balance: record.momo_balance,
      witness1_name: record.witness1_name,
      witness2_name: record.witness2_name,
      notes: record.notes,
      status: record.status
    });
    setEditingRecordId(record.id);
    setIsEditingRecord(true);
    setIsModalOpen(true);
  };

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('financial_records').delete().eq('id', recordToDelete);
      if (error) throw error;
      toast.success('Financial record deleted successfully');
      setIsDeleteRecordConfirmOpen(false);
      setRecordToDelete(null);
      fetchInitialData();
    } catch (error: any) {
      toast.error(`Failed to delete record: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuthorizedSubmit = async () => {
    if (accessKey !== '2024') return toast.error("Authorization Revoked: Invalid Master Access Key.");
    
    setIsSubmitting(true);
    try {
      const totalIn = (formData.tithes || 0) + (formData.offerings || 0) + (formData.seed || 0) + (formData.other_income || 0);
      const payload = {
        ...formData,
        total_income: totalIn,
        status: 'Posted'
      };

      if (isEditingRecord && editingRecordId) {
        const { error } = await supabase.from('financial_records').update(payload).eq('id', editingRecordId);
        if (error) throw error;
        toast.success("Update Successful: Financial record has been updated.");
      } else {
        const { error } = await supabase.from('financial_records').insert([payload]);
        if (error) throw error;
        toast.success("Posting Successful: Service revenue has been recorded.");
      }
      
      setIsModalOpen(false);
      setIsPinModalOpen(false);
      setAccessKey('');
      setIsEditingRecord(false);
      setEditingRecordId(null);
      fetchInitialData();
    } catch (err: any) {
      if (err.message?.includes('schema cache') || err.message?.includes('not found') || err.message?.includes('Could not find')) {
        setTableMissing(true);
        setIsPinModalOpen(false);
        setIsModalOpen(false);
      } else {
        toast.error(`Database Sync Failure: ${err.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTitheSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titheFormData.member_id || !titheFormData.amount) return toast.error("Please fill all required fields.");
    
    setIsSubmitting(true);
    try {
      const payload = {
        ...titheFormData,
        recorded_by: userProfile?.id || 'system',
      };

      if (isEditingTithe && editingTitheId) {
        const { error } = await supabase.from('tithe_entries').update(payload).eq('id', editingTitheId);
        if (error) throw error;
        toast.success('Tithe record updated successfully');
      } else {
        const { error } = await supabase.from('tithe_entries').insert([payload]);
        if (error) throw error;
        toast.success('Tithe record finalized successfully');
      }
      
      setIsTitheModalOpen(false);
      setIsEditingTithe(false);
      setEditingTitheId(null);
      setTitheFormData({
        member_id: '',
        amount: 0,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'Cash',
        service_type: 'Prophetic Word Service',
        notes: ''
      });
      fetchInitialData();
    } catch (error: any) {
      toast.error(`Database Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTithe = (tithe: TitheRecord) => {
    setTitheFormData({
      member_id: tithe.member_id,
      amount: tithe.amount,
      payment_date: tithe.payment_date,
      payment_method: tithe.payment_method,
      service_type: tithe.service_type,
      notes: tithe.notes || ''
    });
    setEditingTitheId(tithe.id);
    setIsEditingTithe(true);
    setIsTitheModalOpen(true);
  };

  const handleDeleteTithe = async () => {
    if (!titheToDelete) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('tithe_entries').delete().eq('id', titheToDelete);
      if (error) throw error;
      toast.success('Tithe record deleted successfully');
      setIsDeleteConfirmOpen(false);
      setTitheToDelete(null);
      fetchInitialData();
    } catch (error: any) {
      toast.error(`Database Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatGHS = (val: number) => new Intl.NumberFormat('en-GH', { 
    style: 'currency', 
    currency: 'GHS',
    maximumFractionDigits: 0 
  }).format(val);

  if (tableMissing || (lastError && lastError.includes('PGRST200'))) {
    const repairSQL = `-- MASTER FINANCIAL RECORDS REPAIR SCRIPT
-- 1. Ensure members table exists
CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  gender TEXT DEFAULT 'Male',
  dob DATE,
  date_joined DATE,
  status TEXT DEFAULT 'Active',
  ministry TEXT DEFAULT 'N/A',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Ensure financial_records table exists
CREATE TABLE IF NOT EXISTS public.financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_date DATE NOT NULL,
  service_type TEXT NOT NULL,
  tithes NUMERIC DEFAULT 0,
  offerings NUMERIC DEFAULT 0,
  seed NUMERIC DEFAULT 0,
  expenses NUMERIC DEFAULT 0,
  other_income NUMERIC DEFAULT 0,
  total_income NUMERIC DEFAULT 0,
  bank_balance NUMERIC DEFAULT 0,
  momo_balance NUMERIC DEFAULT 0,
  witness1_name TEXT NOT NULL,
  witness2_name TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'Posted',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Ensure tithe_entries table exists
CREATE TABLE IF NOT EXISTS public.tithe_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL,
  service_type TEXT,
  recorded_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. CRITICAL: Fix missing relationship (PGRST200 Error Fix)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_member') THEN
    ALTER TABLE public.tithe_entries 
    ADD CONSTRAINT fk_member 
    FOREIGN KEY (member_id) REFERENCES public.members(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Enable RLS and Policies
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all actions for staff" ON public.financial_records;
CREATE POLICY "Allow all actions for staff" ON public.financial_records FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.tithe_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all actions for staff" ON public.tithe_entries;
CREATE POLICY "Allow all actions for staff" ON public.tithe_entries FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all actions for staff" ON public.members;
CREATE POLICY "Allow all actions for staff" ON public.members FOR ALL USING (true) WITH CHECK (true);

-- 6. FORCE SCHEMA CACHE RELOAD
NOTIFY pgrst, 'reload schema';`;

    return (
      <div className="max-w-4xl mx-auto py-12 px-4 animate-in zoom-in-95 duration-500">
        <div className="bg-white border-2 border-fh-gold/20 p-12 rounded-[4rem] shadow-2xl text-center">
          <div className="w-24 h-24 bg-fh-gold/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-fh-gold shadow-inner">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h2 className="text-3xl font-black text-fh-green tracking-tighter uppercase mb-4">
            {lastError && lastError.includes('PGRST200') ? 'Database Relationship Error' : 'Financial Records Missing'}
          </h2>
          
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-md mx-auto">
            {Object.entries(tableStatus).map(([name, exists]) => (
              <div key={name} className={`p-4 rounded-2xl border-2 transition-all ${exists ? 'border-fh-green/20 bg-fh-green/5' : 'border-rose-100 bg-rose-50'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 ${exists ? 'bg-fh-green text-fh-gold' : 'bg-rose-500 text-white'}`}>
                  {exists ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  )}
                </div>
                <p className={`text-[8px] font-black uppercase tracking-tighter ${exists ? 'text-fh-green' : 'text-rose-500'}`}>{name.replace('_', ' ')}</p>
              </div>
            ))}
          </div>

          <div className="mb-8 space-y-2">
            {lastError && (
              <div className="mt-4 p-4 bg-rose-50 rounded-xl border border-rose-100">
                <p className="text-rose-600 text-[10px] font-black uppercase tracking-widest mb-2">Technical Diagnosis</p>
                <p className="text-rose-400 text-[8px] font-mono max-w-md mx-auto break-all">
                  {lastError.includes('PGRST200') 
                    ? "The database relationship between 'tithe_entries' and 'members' is missing. This prevents fetching member names with their tithes."
                    : `Error: ${lastError}`}
                </p>
              </div>
            )}
          </div>
          <p className="text-slate-400 mb-10 font-bold max-w-lg mx-auto leading-relaxed uppercase text-[9px] tracking-[0.2em]">
            Run the SQL Script below in your Supabase SQL Editor to fix the database relationship and reload the schema cache.
          </p>
          <div className="relative group mb-10">
            <pre className="bg-slate-900 text-fh-gold p-8 rounded-[2rem] text-[10px] font-mono text-left h-48 overflow-y-auto shadow-inner border border-fh-gold/10 leading-relaxed scrollbar-hide">
              {repairSQL}
            </pre>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(repairSQL);
                toast.success("SQL Script copied to clipboard!");
              }}
              className="absolute top-4 right-4 bg-fh-gold text-fh-green px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-lg"
            >
              Copy Script
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={fetchInitialData} className="px-10 py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-xs tracking-[0.4em] shadow-2xl active:scale-95 transition-all border-b-4 border-black">
              Retry Database Sync
            </button>
            <button onClick={() => window.location.reload()} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-[0.4em] hover:bg-slate-200 transition-all">
              Hard Refresh App
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isPrintMode) {
    return (
      <div className="bg-white min-h-screen">
        <div className="fixed top-4 right-4 flex gap-2 no-print z-[200]">
          <button 
            onClick={() => window.print()} 
            className="flex items-center gap-2 px-6 py-3 bg-fh-green text-fh-gold rounded-xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:scale-105 transition-all"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
          <button 
            onClick={() => setIsPrintMode(false)} 
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:scale-105 transition-all"
          >
            <X className="w-4 h-4" />
            Exit Report
          </button>
        </div>
        <FinancialReportDocument 
          organizationName="Faithhouse Chapel International (Wonders Cathedral)"
          reportPeriod={selectedMonth === 'All Months' ? 'Full Year 2024' : selectedMonth}
          dateGenerated={new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          records={processedRecords}
          openingBalance={openingBalance}
          reportType={selectedReportType}
        />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      
      {/* 1. Header Protocol */}
      <div className="grid grid-cols-1 lg:grid-cols-3 items-center gap-6 py-4 no-print">
        {/* Left: Filters */}
        <div className="flex items-center gap-4 order-2 lg:order-1">
          <div className="relative flex-1 lg:flex-none">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select 
              className="w-full lg:w-auto pl-12 pr-10 py-4 bg-white border border-slate-200 rounded-[1.75rem] font-black uppercase text-[10px] tracking-widest outline-none focus:ring-2 ring-fh-green/20 transition-all shadow-sm"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {availableMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: Heading */}
        <div className="text-center order-1 lg:order-2">
          <h2 className="text-3xl font-black text-fh-green tracking-tighter uppercase leading-none">Church Finance Overview</h2>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-2">Authorized Entries Only</p>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-end gap-4 order-3">
          {/* Dropdown Menu for Reports */}
          <div className="relative">
            <button 
              onClick={() => setIsReportDropdownOpen(!isReportDropdownOpen)}
              className="px-8 py-5 bg-white border border-slate-200 rounded-[1.75rem] font-black uppercase text-[10px] tracking-widest flex items-center gap-3 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              <FileText className="w-5 h-5 text-fh-gold" />
              Reports
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isReportDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isReportDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-[100]" onClick={() => setIsReportDropdownOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-64 bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-3 z-[110] overflow-hidden"
                  >
                    <button 
                      onClick={() => {
                        setIsReportModalOpen(true);
                        setIsReportDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50 rounded-2xl transition-all text-left group"
                    >
                      <div className="w-10 h-10 bg-fh-gold/10 rounded-xl flex items-center justify-center group-hover:bg-fh-gold/20 transition-colors">
                        <FileText className="w-5 h-5 text-fh-gold" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Generate Report</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Audit & Statements</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => {
                        window.print();
                        setIsReportDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50 rounded-2xl transition-all text-left group"
                    >
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                        <Printer className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Print Audit</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Hard Copy Version</p>
                      </div>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <button onClick={() => {
            if (activeTab === 'Statements') {
              setFormData({
                service_date: new Date().toISOString().split('T')[0],
                service_type: 'Prophetic Word Service',
                tithes: 0,
                offerings: 0,
                seed: 0,
                expenses: 0,
                other_income: 0,
                bank_balance: 0,
                momo_balance: 0,
                witness1_name: '',
                witness2_name: '',
                notes: '',
                status: 'Posted'
              });
              setIsEditingRecord(false);
              setEditingRecordId(null);
              setIsModalOpen(true);
            } else {
              setIsEditingTithe(false);
              setEditingTitheId(null);
              setTitheFormData({
                member_id: '',
                amount: 0,
                payment_date: new Date().toISOString().split('T')[0],
                payment_method: 'Cash',
                service_type: 'Prophetic Word Service',
                notes: ''
              });
              setIsTitheModalOpen(true);
            }
          }} className="px-10 py-5 bg-fh-green text-fh-gold rounded-[1.75rem] font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl active:scale-95 transition-all border-b-4 border-black/30">
            {activeTab === 'Statements' ? '+ Provision Entry' : '+ Record Tithe'}
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-slate-100 p-1 rounded-2xl w-fit no-print">
        <button 
          onClick={() => setActiveTab('Statements')}
          className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'Statements' ? 'bg-white text-fh-green shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Financial Statements
        </button>
        <button 
          onClick={() => setActiveTab('Tithers')}
          className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'Tithers' ? 'bg-white text-fh-green shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Tithers Registry
        </button>
      </div>

      {activeTab === 'Statements' ? (
        <>
          {/* 2. Visual KPI Summary (Matches Dashboard Colors) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Row 1: Income (Solid bold colors like Dashboard) */}
        <div className="bg-cms-blue rounded-xl shadow-md p-6 text-white flex items-center justify-between group overflow-hidden relative">
          <div className="relative z-10">
            <h2 className="text-3xl font-black">{formatGHS(sum('tithes'))}</h2>
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-80 mt-1">Total Tithes</p>
          </div>
          <svg className="w-12 h-12 text-white opacity-20 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
        </div>

        <div className="bg-cms-purple rounded-xl shadow-md p-6 text-white flex items-center justify-between group overflow-hidden relative">
          <div className="relative z-10">
            <h2 className="text-3xl font-black">{formatGHS(sum('offerings'))}</h2>
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-80 mt-1">Total Offerings</p>
          </div>
          <svg className="w-12 h-12 text-white opacity-20 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.39 2.1-1.39 1.47 0 2.01.73 2.06 1.6h1.72c-.05-1.56-1.05-2.55-2.57-2.93V4h-2.34v2.71c-1.51.32-2.72 1.28-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.38 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.89 2.97V20h2.34v-2.71c1.52-.29 2.72-1.16 2.72-2.75 0-2.21-1.91-2.97-3.68-3.4z"/></svg>
        </div>

        <div className="bg-cms-emerald rounded-xl shadow-md p-6 text-white flex items-center justify-between group overflow-hidden relative">
          <div className="relative z-10">
            <h2 className="text-3xl font-black">{formatGHS(sum('seed'))}</h2>
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-80 mt-1">Seeds & Pledges</p>
          </div>
          <svg className="w-12 h-12 text-white opacity-20 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
        </div>

        <div className="bg-slate-700 rounded-xl shadow-md p-6 text-white flex items-center justify-between group overflow-hidden relative">
          <div className="relative z-10">
            <h2 className="text-3xl font-black">{formatGHS(sum('other_income'))}</h2>
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-80 mt-1">Other Income</p>
          </div>
          <svg className="w-12 h-12 text-white opacity-20 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        </div>

        {/* Row 2: Balances & Outbound */}
        <div className="bg-cms-rose rounded-xl shadow-md p-6 text-white flex items-center justify-between group overflow-hidden relative">
          <div className="relative z-10">
            <h2 className="text-3xl font-black">{formatGHS(sum('expenses'))}</h2>
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-80 mt-1">Expenses</p>
          </div>
          <svg className="w-12 h-12 text-white opacity-20 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg>
        </div>

        <div className="bg-cms-blue rounded-xl shadow-md p-6 text-white flex items-center justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rotate-45 translate-x-1/2 -translate-y-1/2"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-black">{formatGHS(sum('bank_balance'))}</h2>
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-80 mt-1">Bank Holdings</p>
          </div>
          <svg className="w-12 h-12 text-white opacity-20 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z"/></svg>
        </div>

        <div className="bg-cms-emerald rounded-xl shadow-md p-6 text-white flex items-center justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rotate-45 translate-x-1/2 -translate-y-1/2"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-black">{formatGHS(sum('momo_balance'))}</h2>
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-80 mt-1">MoMo Balance</p>
          </div>
          <svg className="w-12 h-12 text-white opacity-20 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
        </div>

        <div className="bg-slate-900 rounded-xl shadow-md p-6 text-fh-gold flex items-center justify-between group overflow-hidden relative border border-white/10">
          <div className="relative z-10">
            <h2 className="text-3xl font-black">{formatGHS(netBalance)}</h2>
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-60 mt-1">Total Net Balance</p>
          </div>
          <svg className="w-12 h-12 text-fh-gold opacity-20 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-1.13 2.4-1.61 0-.97-.69-1.61-2.57-2.06-2.14-.51-3.92-1.25-3.92-3.5 0-1.85 1.5-3.18 3.27-3.56V4h2.67v1.86c1.47.31 2.67 1.3 2.82 2.83h-1.96c-.09-.85-.68-1.5-2.22-1.5-1.54 0-2.03.74-2.03 1.48 0 .82.66 1.34 2.53 1.77 2.13.5 3.96 1.25 3.96 3.65 0 2.11-1.58 3.25-3.41 3.59z"/></svg>
        </div>
      </div>

      {/* Income Trends Chart */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/50 shadow-sm relative overflow-hidden group no-print">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <DollarSign className="w-32 h-32 text-fh-green" />
        </div>
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Analytics</h3>
            <p className="text-xl font-black text-slate-900 tracking-tighter mt-1">Income Trends (Last 6 Services)</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-fh-green"></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Tithes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-fh-gold"></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Offerings</span>
            </div>
          </div>
        </div>
        <div className="h-[300px] w-full relative z-10">
          {financialTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialTrends} id="finance-income-bar">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: '700'}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: '700'}}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                <Bar dataKey="tithes" name="Tithes" fill="#20c997" radius={[4, 4, 0, 0]} />
                <Bar dataKey="offerings" name="Offerings" fill="#ffd700" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Insufficient Data for Analysis</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Transaction History */}
      <div className="cms-card cms-card-emerald bg-white rounded-[3.5rem] overflow-hidden border-none shadow-sm">
          <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
             <h3 className="text-sm font-black text-fh-green uppercase tracking-widest leading-none">Financial Statements Repository</h3>
             <span className="px-5 py-1.5 bg-white border border-slate-200 rounded-full text-[9px] font-black text-fh-green uppercase shadow-sm">Verified Audit Trail Active</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100">
                <tr>
                  <th className="px-10 py-6">Timeline / Service</th>
                  <th className="px-10 py-6">Revenue Summary</th>
                  <th className="px-10 py-6">Security Verification</th>
                  <th className="px-10 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  <tr><td colSpan={4} className="px-10 py-24 text-center animate-pulse text-slate-300 font-black uppercase tracking-[0.5em]">Synchronizing Database...</td></tr>
                ) : processedRecords.length > 0 ? (
                  processedRecords.map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-50 transition-all group text-xs">
                      <td className="px-10 py-6">
                        <p className="font-black text-slate-800 uppercase tracking-tight mb-1">{new Date(rec.service_date).toLocaleDateString()}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{rec.service_type}</p>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-tight">
                           <p className="text-fh-green">Inbound: {formatGHS(rec.total_income)}</p>
                           <p className="text-rose-500">Expense: {formatGHS(rec.expenses || 0)}</p>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex flex-col gap-1">
                           <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Witness 1: {rec.witness1_name}</p>
                           <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Witness 2: {rec.witness2_name}</p>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <button 
                            onClick={() => handleEditRecord(rec)}
                            className="p-2 text-slate-400 hover:text-fh-gold transition-colors"
                            title="Edit Record"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setRecordToDelete(rec.id);
                              setIsDeleteRecordConfirmOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <span className="px-4 py-1.5 bg-emerald-50 text-cms-emerald text-[8px] font-black uppercase tracking-[0.2em] rounded-lg border border-emerald-100 ml-2">Recorded</span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} className="px-10 py-32 text-center text-slate-300 italic text-[10px] font-black uppercase tracking-[0.5em]">The Statements Repository is empty</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    ) : (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search tithers by name..." 
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-fh-green/20 transition-all text-sm font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-12">
            {selectedMonth !== 'All Months' ? (
              <div className="cms-card bg-white rounded-[3.5rem] overflow-hidden border-none shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                   <div className="space-y-1">
                     <h3 className="text-sm font-black text-fh-green uppercase tracking-widest leading-none">Tithe Reference Session</h3>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedMonth}</p>
                   </div>
                   <div className="flex items-center gap-4">
                     <span className="px-5 py-1.5 bg-white border border-slate-200 rounded-full text-[9px] font-black text-fh-green uppercase shadow-sm flex items-center gap-2">
                       <CheckCircle2 className="w-3 h-3 text-fh-gold" />
                       Official Record
                     </span>
                   </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100">
                      <tr>
                        <th className="px-10 py-6">Member Name</th>
                        <th className="px-10 py-6">Payment Date</th>
                        <th className="px-10 py-6">Amount</th>
                        <th className="px-10 py-6">Method</th>
                        <th className="px-10 py-6">Service</th>
                        <th className="px-10 py-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredTithes.length > 0 ? filteredTithes.map(tithe => (
                        <tr key={tithe.id} className="hover:bg-slate-50 transition-all group text-xs">
                          <td className="px-10 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                <Users className="w-4 h-4 text-slate-400" />
                              </div>
                              <p className="font-black text-slate-800 uppercase tracking-tight">
                                {tithe.members ? `${tithe.members.first_name} ${tithe.members.last_name}` : `Member ID: ${tithe.member_id.substring(0, 8)}...`}
                              </p>
                            </div>
                          </td>
                          <td className="px-10 py-6">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {new Date(tithe.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                          </td>
                          <td className="px-10 py-6">
                            <p className="text-sm font-black text-fh-green">{formatGHS(tithe.amount)}</p>
                          </td>
                          <td className="px-10 py-6">
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[8px] font-black uppercase rounded-lg border border-slate-200">
                              {tithe.payment_method}
                            </span>
                          </td>
                          <td className="px-10 py-6">
                            <p className="text-[10px] font-black text-slate-600 uppercase">{tithe.service_type}</p>
                          </td>
                          <td className="px-10 py-6 text-right">
                            <div className="flex justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEditTithe(tithe)} className="p-2 text-slate-400 hover:text-fh-gold transition-colors"><Edit3 className="w-4 h-4" /></button>
                              <button onClick={() => { setTitheToDelete(tithe.id); setIsDeleteConfirmOpen(true); }} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={6} className="px-10 py-20 text-center text-slate-300 font-black uppercase tracking-[0.5em] text-[10px]">
                            No records found for this period
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : Object.keys(groupedTithes).length > 0 ? Object.entries(groupedTithes).map(([month, tithes]) => (
              <div key={month} className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="h-px flex-1 bg-slate-100"></div>
                  <div className="px-6 py-2 bg-slate-50 rounded-full border border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] whitespace-nowrap">{month}</h3>
                  </div>
                  <div className="h-px flex-1 bg-slate-100"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tithes.map(tithe => (
                    <div key={tithe.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-start justify-between mb-6">
                        <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center group-hover:bg-violet-600 transition-all">
                          <Users className="w-6 h-6 text-violet-600 group-hover:text-white" />
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase rounded-lg border border-emerald-100">
                            {tithe.payment_method}
                          </span>
                          <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleEditTithe(tithe)}
                              className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-fh-gold hover:text-white transition-all active:scale-90"
                              title="Edit Record"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => {
                                setTitheToDelete(tithe.id);
                                setIsDeleteConfirmOpen(true);
                              }}
                              className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-rose-500 hover:text-white transition-all active:scale-90"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-1">
                        {tithe.members ? `${tithe.members.first_name} ${tithe.members.last_name}` : `Member ID: ${tithe.member_id.substring(0, 8)}...`}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                        {new Date(tithe.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Amount Paid</p>
                          <p className="text-xl font-black text-fh-green">{formatGHS(tithe.amount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Service</p>
                          <p className="text-[10px] font-black text-slate-700 uppercase">{tithe.service_type}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )) : (
              <div className="py-20 text-center bg-white rounded-[3.5rem] border border-slate-100">
                <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                  <Hash className="w-10 h-10 text-slate-200" />
                </div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">
                  {lastError && lastError.includes('tithe_entries') ? 'Database Sync Error' : 'No Tithe Records Found'}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest max-w-xs mx-auto">
                  {lastError && lastError.includes('tithe_entries') 
                    ? `We encountered an error fetching tithe data: ${lastError.split('|').find(e => e.includes('tithe_entries'))?.split(':')[1]?.trim() || lastError}`
                    : 'Start recording tithes to see them here.'}
                </p>
                {lastError && (
                  <button 
                    onClick={fetchInitialData}
                    className="mt-6 px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                  >
                    Retry Connection
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tithe Recording Modal */}
      {isTitheModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-fh-green p-10 text-fh-gold flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">{isEditingTithe ? 'Edit Tithe' : 'Record Tithe'}</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{isEditingTithe ? 'Modify Existing Entry' : 'Individual Member Contribution'}</p>
              </div>
              <button onClick={() => { setIsTitheModalOpen(false); setIsEditingTithe(false); setEditingTitheId(null); }} className="p-3 bg-black/20 rounded-2xl hover:bg-black/40 transition-all">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleTitheSubmit} className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Member</label>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Search member..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-fh-green/20 transition-all text-[10px] font-bold uppercase"
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select 
                        required
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-fh-green/20 transition-all text-xs font-black uppercase"
                        value={titheFormData.member_id}
                        onChange={(e) => setTitheFormData(p => ({ ...p, member_id: e.target.value }))}
                      >
                        <option value="">Choose Member...</option>
                        {members
                          .filter(m => m.status === 'Active' && `${m.first_name} ${m.last_name}`.toLowerCase().includes(memberSearch.toLowerCase()))
                          .map(m => (
                            <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                          ))
                        }
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (GHS)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="number" 
                      required
                      step="0.01"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-fh-green/20 transition-all text-xs font-black"
                      placeholder="0.00"
                      value={titheFormData.amount || ''}
                      onChange={(e) => setTitheFormData(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Date</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="date" 
                      required
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-fh-green/20 transition-all text-xs font-black"
                      value={titheFormData.payment_date}
                      onChange={(e) => setTitheFormData(p => ({ ...p, payment_date: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Method</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select 
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-fh-green/20 transition-all text-xs font-black uppercase"
                      value={titheFormData.payment_method}
                      onChange={(e) => setTitheFormData(p => ({ ...p, payment_method: e.target.value as any }))}
                    >
                      <option>Cash</option>
                      <option>Bank Transfer</option>
                      <option>MoMo</option>
                      <option>Cheque</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service Type</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-fh-green/20 transition-all text-xs font-black uppercase"
                    value={titheFormData.service_type}
                    onChange={(e) => setTitheFormData(p => ({ ...p, service_type: e.target.value }))}
                  >
                    <option>Prophetic Word Service</option>
                    <option>Help from above service</option>
                    <option>Special services</option>
                    <option>Conferences</option>
                  </select>
                </div>
              </div>

              <div className="pt-6">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-5 bg-fh-green text-fh-gold rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl border-b-4 border-black/20 hover:translate-y-0.5 transition-all flex items-center justify-center gap-3"
                >
                  {isSubmitting ? 'Processing Transaction...' : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      {isEditingTithe ? 'Update Tithe Record' : 'Finalize Tithe Entry'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODALS: PROVISION ENTRY FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-fh-green-dark/95 backdrop-blur-md animate-in fade-in" onClick={() => !isPinModalOpen && setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-3xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border-b-[16px] border-fh-gold">
            <div className="p-12 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
               <div className="flex items-center gap-6">
                 <div className="w-16 h-16 bg-fh-green text-fh-gold rounded-[2rem] flex items-center justify-center shadow-xl">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 </div>
                 <div>
                    <h3 className="text-3xl font-black text-fh-green uppercase leading-none tracking-tighter">
                      {isEditingRecord ? 'Edit Statement' : 'Financial Statement'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-2">Always make sure the data is correct</p>
                 </div>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-5 hover:bg-slate-100 rounded-full transition-all text-slate-400 active:scale-90"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <form onSubmit={initiatePosting} className="p-12 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Service Date</label>
                   <input required type="date" name="service_date" value={formData.service_date} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-800" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Service Type</label>
                   <select name="service_type" value={formData.service_type} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-800 appearance-none">
                      <option>Prophetic Word Service</option>
                      <option>Help from above service</option>
                      <option>Special services</option>
                      <option>Conferences - Exploits</option>
                      <option>Women Conference</option>
                   </select>
                 </div>

                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-fh-green uppercase tracking-widest px-4">
                      Tithes (GHS) {titheRecords.filter(t => t.payment_date === formData.service_date && t.service_type === formData.service_type).length > 0 && "(From Registry)"}
                    </label>
                   <input 
                      type="number" 
                      name="tithes" 
                      value={formData.tithes} 
                      onChange={handleInputChange} 
                      readOnly={titheRecords.filter(t => t.payment_date === formData.service_date && t.service_type === formData.service_type).length > 0}
                      className={`w-full px-6 py-4 border rounded-2xl font-black text-fh-green ${
                        titheRecords.filter(t => t.payment_date === formData.service_date && t.service_type === formData.service_type).length > 0 
                        ? 'bg-fh-green/10 border-fh-green/30 cursor-not-allowed' 
                        : 'bg-fh-green/5 border-fh-green/20'
                      }`} 
                    />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest px-4">Offerings (GHS)</label>
                   <input type="number" name="offerings" value={formData.offerings} onChange={handleInputChange} className="w-full px-6 py-4 bg-indigo-50 border border-indigo-100 rounded-2xl font-black text-indigo-600" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-fh-gold uppercase tracking-widest px-4">Seed (GHS)</label>
                   <input type="number" name="seed" value={formData.seed} onChange={handleInputChange} className="w-full px-6 py-4 bg-fh-gold/5 border border-fh-gold/20 rounded-2xl font-black text-fh-gold" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-4">Other Income (GHS)</label>
                   <input type="number" name="other_income" value={formData.other_income} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-100 border border-slate-200 rounded-2xl font-black text-slate-600" />
                 </div>
                 
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-rose-500 uppercase tracking-widest px-4">Expenses (GHS)</label>
                   <input type="number" name="expenses" value={formData.expenses} onChange={handleInputChange} className="w-full px-6 py-4 bg-rose-50 border border-rose-100 rounded-2xl font-black text-rose-500" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest px-4">Bank Balance (GHS)</label>
                   <input type="number" name="bank_balance" value={formData.bank_balance} onChange={handleInputChange} className="w-full px-6 py-4 bg-indigo-50 border border-indigo-100 rounded-2xl font-black text-indigo-600" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest px-4">MoMo Balance (GHS)</label>
                   <input type="number" name="momo_balance" value={formData.momo_balance} onChange={handleInputChange} className="w-full px-6 py-4 bg-emerald-50 border border-emerald-100 rounded-2xl font-black text-emerald-600" />
                 </div>

                 <div className="lg:col-span-3 py-6 border-t border-slate-50 mt-4">
                    <div className="bg-slate-900 rounded-3xl p-8 mb-8 flex items-center justify-between">
                       <div>
                          <p className="text-[10px] font-black text-fh-gold/60 uppercase tracking-widest mb-1">Live Total Revenue</p>
                          <h4 className="text-3xl font-black text-fh-gold">
                             {formatGHS((formData.tithes || 0) + (formData.offerings || 0) + (formData.seed || 0) + (formData.other_income || 0))}
                          </h4>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] font-black text-fh-gold/60 uppercase tracking-widest mb-1">Net Service Balance</p>
                          <h4 className="text-xl font-black text-white">
                             {formatGHS(((formData.tithes || 0) + (formData.offerings || 0) + (formData.seed || 0) + (formData.other_income || 0)) - (formData.expenses || 0))}
                          </h4>
                       </div>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-6 text-center">Dual Verification Protocol</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Primary Witness Signature</label>
                         <input required name="witness1_name" value={formData.witness1_name} onChange={handleInputChange} placeholder="e.g. Deaconess Sarah" className="w-full px-7 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner outline-none" />
                       </div>
                       <div className="space-y-2">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Secondary Witness Signature</label>
                         <input required name="witness2_name" value={formData.witness2_name} onChange={handleInputChange} placeholder="e.g. Elder Mensah" className="w-full px-7 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 shadow-inner outline-none" />
                       </div>
                    </div>
                 </div>
              </div>

              <button type="submit" className="w-full py-6 bg-fh-green text-fh-gold rounded-[2.5rem] font-black uppercase text-xs tracking-[0.4em] shadow-2xl active:scale-95 transition-all border-b-4 border-black/30">
                 {isEditingRecord ? 'Update Statement' : 'Finalize Record Entry'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODALS: DUAL PIN AUTHORIZATION */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl animate-in fade-in" />
          <div className="relative bg-white w-full max-w-lg rounded-[4rem] shadow-2xl p-16 text-center border-b-[12px] border-fh-gold animate-in zoom-in-95">
             <div className="w-24 h-24 bg-fh-gold/10 text-fh-gold rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-inner border border-fh-gold/20">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
             </div>
             <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-4">Confirm Posting</h4>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em] mb-12">Authorized Access Key Required for Sync</p>
             
             <div className="space-y-6">
                <input 
                  type="password" 
                  value={accessKey} 
                  onChange={(e) => setAccessKey(e.target.value)} 
                  placeholder="MASTER_KEY" 
                  className="w-full px-8 py-6 bg-slate-50 border border-slate-200 rounded-[2rem] font-black text-center text-xl tracking-[0.5em] shadow-inner outline-none focus:ring-8 focus:ring-fh-gold/5 focus:border-fh-gold transition-all" 
                />
                <div className="flex gap-4">
                   <button onClick={() => { setIsPinModalOpen(false); setAccessKey(''); }} className="flex-1 py-5 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Abort</button>
                   <button onClick={handleAuthorizedSubmit} disabled={isSubmitting} className="flex-[2] py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                      {isSubmitting ? <div className="w-4 h-4 border-2 border-white/50 border-t-white animate-spin rounded-full" /> : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>Authorize Save</>}
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* 6. MODALS: FINANCIAL REPORT */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md animate-in fade-in" onClick={() => setIsReportModalOpen(false)} />
          <div className="relative bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-10 border-b border-slate-50 flex items-center justify-between no-print">
              <div className="flex items-center gap-6">
                <h3 className="text-2xl font-black text-fh-green uppercase tracking-tighter">Report Center</h3>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setSelectedReportType('Monthly')}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedReportType === 'Monthly' ? 'bg-white text-fh-green shadow-sm' : 'text-slate-400'}`}
                  >
                    Monthly Report
                  </button>
                  <button 
                    onClick={() => setSelectedReportType('Audit')}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedReportType === 'Audit' ? 'bg-white text-fh-green shadow-sm' : 'text-slate-400'}`}
                  >
                    Audit Report
                  </button>
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsPrintMode(true)} 
                  className="px-6 py-3 bg-fh-green text-fh-gold rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Generate {selectedReportType} Document
                </button>
                <button onClick={() => window.print()} className="px-6 py-3 bg-slate-900 text-fh-gold rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">Print Summary</button>
                <button onClick={() => setIsReportModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-full transition-all text-slate-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            </div>
            
            <div className="p-12 overflow-y-auto print:p-0">
              <div className="text-center mb-12">
                <h1 className="text-4xl font-black text-fh-green uppercase tracking-tighter mb-2">Faithhouse Chapel International</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Treasury & Audit Department • Financial Summary</p>
                <p className="text-xs font-bold text-slate-500 mt-4">Report Generated: {new Date().toLocaleString()}</p>
              </div>

              <div className="grid grid-cols-3 gap-8 mb-12">
                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Gross Revenue</p>
                  <h2 className="text-3xl font-black text-fh-green">{formatGHS(totalRevenue)}</h2>
                </div>
                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Expenditure</p>
                  <h2 className="text-3xl font-black text-rose-500">{formatGHS(sum('expenses'))}</h2>
                </div>
                <div className="p-8 bg-slate-900 rounded-3xl text-center">
                  <p className="text-[10px] font-black text-fh-gold/60 uppercase tracking-widest mb-2">Net Liquidity</p>
                  <h2 className="text-3xl font-black text-fh-gold">{formatGHS(netBalance)}</h2>
                </div>
              </div>

              <div className="space-y-8">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-2">Revenue Breakdown</h4>
                <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Tithes</span>
                    <span className="text-xs font-black text-slate-900">{formatGHS(sum('tithes'))}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Offerings</span>
                    <span className="text-xs font-black text-slate-900">{formatGHS(sum('offerings'))}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Seeds & Pledges</span>
                    <span className="text-xs font-black text-slate-900">{formatGHS(sum('seed'))}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Other Income</span>
                    <span className="text-xs font-black text-slate-900">{formatGHS(sum('other_income'))}</span>
                  </div>
                </div>

                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-2 mt-12">Recent Transactions</h4>
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                      <th className="py-4">Date</th>
                      <th className="py-4">Service</th>
                      <th className="py-4">Income</th>
                      <th className="py-4">Expense</th>
                      <th className="py-4 text-right">Witnesses</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {processedRecords.slice(0, 10).map(rec => (
                      <tr key={rec.id} className="text-[10px] font-bold text-slate-700">
                        <td className="py-4">{new Date(rec.service_date).toLocaleDateString()}</td>
                        <td className="py-4 uppercase">{rec.service_type}</td>
                        <td className="py-4 text-fh-green">{formatGHS(rec.total_income)}</td>
                        <td className="py-4 text-rose-500">{formatGHS(rec.expenses || 0)}</td>
                        <td className="py-4 text-right text-[8px] uppercase">{rec.witness1_name} / {rec.witness2_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-20 pt-10 border-t-2 border-dashed border-slate-200 grid grid-cols-2 gap-20 text-center">
                <div className="space-y-12">
                  <div className="h-px bg-slate-300 w-48 mx-auto"></div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Head of Treasury Signature</p>
                </div>
                <div className="space-y-12">
                  <div className="h-px bg-slate-300 w-48 mx-auto"></div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Auditor General Signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 text-center">
              <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10 text-rose-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">Confirm Deletion</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed mb-8">
                Are you sure you want to permanently remove this tithe record? This action is irreversible and will affect the financial statements.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    setIsDeleteConfirmOpen(false);
                    setTitheToDelete(null);
                  }}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteTithe}
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Deleting...' : 'Delete Record'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteRecordConfirmOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 text-center">
              <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10 text-rose-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">Confirm Deletion</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed mb-8">
                Are you sure you want to permanently remove this financial statement? This action is irreversible and will affect the global balance.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    setIsDeleteRecordConfirmOpen(false);
                    setRecordToDelete(null);
                  }}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteRecord}
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-rose-50 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Deleting...' : 'Delete Statement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceView;
