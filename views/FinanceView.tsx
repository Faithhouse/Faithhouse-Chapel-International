
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, FinancialRecord } from '../types';

interface FinanceViewProps {
  userProfile: UserProfile | null;
}

const FinanceView: React.FC<FinanceViewProps> = ({ userProfile }) => {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [tableMissing, setTableMissing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    setTableMissing(false);
    try {
      const { data, error } = await supabase
        .from('financial_records')
        .select('*')
        .order('service_date', { ascending: false });
      
      if (error) {
        if (error.code === '42P01' || error.message.includes('not found') || error.code === 'PGRST205' || error.message.includes('schema cache') || error.message.includes('Could not find')) {
          setTableMissing(true);
        } else {
          throw error;
        }
      } else {
        setRecords(data || []);
      }
    } catch (err) {
      console.error('Vault Access Error:', err);
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
      return alert("Security Protocol: Dual witness signatures are mandatory for vault entry.");
    }
    setIsPinModalOpen(true);
  };

  const handleAuthorizedSubmit = async () => {
    if (accessKey !== '2024') return alert("Authorization Revoked: Invalid Master Access Key.");
    
    setIsSubmitting(true);
    try {
      const totalIn = (formData.tithes || 0) + (formData.offerings || 0) + (formData.seed || 0) + (formData.other_income || 0);
      const payload = {
        ...formData,
        total_income: totalIn,
        status: 'Posted'
      };

      const { error } = await supabase.from('financial_records').insert([payload]);
      if (error) throw error;
      
      alert("Vault Entry Successful: Service revenue has been permanently posted.");
      setIsModalOpen(false);
      setIsPinModalOpen(false);
      setAccessKey('');
      fetchInitialData();
    } catch (err: any) {
      if (err.message?.includes('schema cache') || err.message?.includes('not found') || err.message?.includes('Could not find')) {
        setTableMissing(true);
        setIsPinModalOpen(false);
        setIsModalOpen(false);
      } else {
        alert(`Vault Sync Failure: ${err.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatGHS = (val: number) => new Intl.NumberFormat('en-GH', { 
    style: 'currency', 
    currency: 'GHS',
    maximumFractionDigits: 0 
  }).format(val);

  const sum = (key: keyof FinancialRecord) => records.reduce((a, r) => a + (Number(r[key]) || 0), 0);
  const totalRevenue = sum('tithes') + sum('offerings') + sum('seed') + sum('other_income');
  const netBalance = totalRevenue - sum('expenses');

  if (tableMissing) {
    const repairSQL = `-- MASTER FINANCIAL RECORDS REPAIR SCRIPT
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

ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all actions for staff" ON public.financial_records FOR ALL USING (true) WITH CHECK (true);`;

    return (
      <div className="max-w-4xl mx-auto py-12 px-4 animate-in zoom-in-95 duration-500">
        <div className="bg-white border-2 border-fh-gold/20 p-12 rounded-[4rem] shadow-2xl text-center">
          <div className="w-24 h-24 bg-fh-gold/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-fh-gold shadow-inner">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h2 className="text-3xl font-black text-fh-green tracking-tighter uppercase mb-4">Financial Records Missing</h2>
          <p className="text-slate-500 mb-10 font-medium max-w-lg mx-auto leading-relaxed uppercase text-[10px] tracking-widest">
            The fiscal repository has not been initialized. Run the Master SQL Script in your Supabase Editor to continue.
          </p>
          <pre className="bg-slate-900 text-fh-gold p-8 rounded-[2rem] text-[10px] font-mono text-left h-48 overflow-y-auto mb-10 shadow-inner border border-fh-gold/10 leading-relaxed scrollbar-hide">
            {repairSQL}
          </pre>
          <button onClick={fetchInitialData} className="px-16 py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-xs tracking-[0.4em] shadow-2xl active:scale-95 transition-all border-b-4 border-black">
            Authorize Database Sync
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      
      {/* 1. Header Protocol */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-2 no-print">
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-fh-green tracking-tighter uppercase leading-none">Treasury</h2>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">Authorized Entries Only</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => window.print()} className="px-8 py-5 bg-white border border-slate-200 rounded-[1.75rem] font-black uppercase text-[10px] tracking-widest flex items-center gap-3 hover:bg-slate-50 transition-all shadow-sm active:scale-95">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print Audit
          </button>
          <button onClick={() => setIsModalOpen(true)} className="px-10 py-5 bg-fh-green text-fh-gold rounded-[1.75rem] font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl active:scale-95 transition-all border-b-4 border-black/30">
            + Provision Entry
          </button>
        </div>
      </div>

      {/* 2. Visual KPI Matrix (Matches Dashboard Colors) */}
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

      {/* 3. Transaction Matrix */}
      <div className="cms-card cms-card-emerald bg-white rounded-[3.5rem] overflow-hidden border-none shadow-sm">
        <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
           <h3 className="text-sm font-black text-fh-green uppercase tracking-widest leading-none">Vault Ledger Repository</h3>
           <span className="px-5 py-1.5 bg-white border border-slate-200 rounded-full text-[9px] font-black text-fh-green uppercase shadow-sm">Verified Audit Trail Active</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100">
              <tr><th className="px-10 py-6">Timeline / Service</th><th className="px-10 py-6">Revenue Matrix</th><th className="px-10 py-6">Security Verification</th><th className="px-10 py-6 text-right">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={4} className="px-10 py-24 text-center animate-pulse text-slate-300 font-black uppercase tracking-[0.5em]">Synchronizing Vault...</td></tr>
              ) : records.length > 0 ? (
                records.map(rec => (
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
                      <span className="px-4 py-1.5 bg-emerald-50 text-cms-emerald text-[8px] font-black uppercase tracking-[0.2em] rounded-lg border border-emerald-100">Vaulted</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} className="px-10 py-32 text-center text-slate-300 italic text-[10px] font-black uppercase tracking-[0.5em]">The Ledger is empty</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                    <h3 className="text-3xl font-black text-fh-green uppercase leading-none tracking-tighter">Financial Statement</h3>
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
                   <label className="text-[9px] font-black text-fh-green uppercase tracking-widest px-4">Tithes (GHS)</label>
                   <input type="number" name="tithes" value={formData.tithes} onChange={handleInputChange} className="w-full px-6 py-4 bg-fh-green/5 border border-fh-green/20 rounded-2xl font-black text-fh-green" />
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
                 Finalize Vault Inbound
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
             <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-4">Vault Authorization</h4>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em] mb-12">Authorized Master Key Required for Sync</p>
             
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
                      {isSubmitting ? <div className="w-4 h-4 border-2 border-white/50 border-t-white animate-spin rounded-full" /> : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>Authorize Sync</>}
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
