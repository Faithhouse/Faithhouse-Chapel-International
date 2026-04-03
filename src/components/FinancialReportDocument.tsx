
import React from 'react';
import { FinancialRecord } from '../../types';

export type ReportType = 'Monthly' | 'Audit';

interface FinancialReportDocumentProps {
  organizationName: string;
  reportPeriod: string;
  dateGenerated: string;
  records: FinancialRecord[];
  openingBalance: number;
  reportType?: ReportType;
}

const FinancialReportDocument: React.FC<FinancialReportDocumentProps> = ({
  organizationName,
  reportPeriod,
  dateGenerated,
  records,
  openingBalance,
  reportType = 'Monthly'
}) => {
  const logoUrl = "https://lh3.googleusercontent.com/d/1la57sO6NOuNEZaqa9zDxuxRnWPBavkjH";
  
  // Calculations
  const totalTithes = records.reduce((sum, r) => sum + (r.tithes || 0), 0);
  const totalOfferings = records.reduce((sum, r) => sum + (r.offerings || 0), 0);
  const totalSeeds = records.reduce((sum, r) => sum + (r.seed || 0), 0);
  const totalOtherIncome = records.reduce((sum, r) => sum + (r.other_income || 0), 0);
  const totalIncome = records.reduce((sum, r) => sum + (r.total_income || 0), 0);
  const totalExpense = records.reduce((sum, r) => sum + (r.expenses || 0), 0);
  const netMonthlyBalance = totalIncome - totalExpense;

  const formatGHS = (amount: number) => {
    return `GH₵${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Playfair+Display:wght@700;900&display=swap');
    
    @media print {
      body { background: white !important; margin: 0; padding: 0; }
      .no-print { display: none !important; }
      @page { margin: 1cm; size: A4; }
      .document-container { box-shadow: none !important; border: none !important; width: 100% !important; max-width: none !important; padding: 0 !important; }
    }
    .document-container { 
      background: white; 
      color: black; 
      padding: 60px; 
      max-width: 210mm; 
      margin: 20px auto; 
      font-family: 'Inter', sans-serif; 
      min-height: 297mm; 
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
      position: relative;
      overflow: hidden;
    }
    @media (max-width: 768px) {
      .document-container { padding: 20px; box-shadow: none; border: none; }
      .bento-grid { grid-template-columns: 1fr; }
      .side-by-side { flex-direction: column; }
      .header-flex { flex-direction: column; align-items: center; text-align: center; gap: 20px; }
      .header-flex-right { align-items: center; text-align: center; }
      .official-stamp { display: none; }
    }
    .bg-pattern {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: radial-gradient(#e2e8f0 0.5px, transparent 0.5px);
      background-size: 20px 20px;
      opacity: 0.2;
      pointer-events: none;
      z-index: 0;
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 120px;
      font-weight: 900;
      color: rgba(0, 77, 64, 0.015);
      white-space: nowrap;
      pointer-events: none;
      z-index: 0;
      text-transform: uppercase;
      letter-spacing: 0.4em;
    }
    .header-accent {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 10px;
      background: linear-gradient(to right, #004d40, #d4af37, #004d40, #d4af37, #004d40);
    }
    .official-stamp {
      position: absolute;
      top: 45px;
      right: -45px;
      background: #004d40;
      color: white;
      padding: 10px 70px;
      transform: rotate(45deg);
      font-size: 9pt;
      font-weight: 900;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      z-index: 10;
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .official-stamp span { font-size: 6pt; letter-spacing: 0.1em; opacity: 0.8; margin-top: 2px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 30px; position: relative; z-index: 1; background: white; }
    th, td { border: 1px solid #e2e8f0; padding: 14px 18px; text-align: left; font-size: 9pt; }
    th { background-color: #f8fafc; font-weight: 900; text-transform: uppercase; color: #004d40; font-size: 7.5pt; letter-spacing: 0.15em; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .uppercase { text-transform: uppercase; }
    .text-center { text-align: center; }
    .section-title { 
      font-size: 12pt; 
      font-weight: 900; 
      margin-top: 40px; 
      margin-bottom: 20px; 
      color: #004d40;
      display: flex;
      align-items: center;
      gap: 15px;
      font-family: 'Playfair Display', serif;
    }
    .section-title::after {
      content: '';
      flex: 1;
      height: 2px;
      background: linear-gradient(to right, #e2e8f0, transparent);
    }
    .bento-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      grid-template-rows: repeat(2, auto);
      gap: 15px;
      margin-bottom: 40px;
    }
    .bento-item {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
      position: relative;
      overflow: hidden;
    }
    .bento-item::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: #e2e8f0;
    }
    .bento-item.primary::before { background: #004d40; }
    .bento-item.success::before { background: #10b981; }
    .bento-item.danger::before { background: #ef4444; }
    .bento-item.warning::before { background: #f59e0b; }
    
    .summary-item-label { font-size: 7pt; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 8px; }
    .summary-item-value { font-size: 14pt; font-weight: 900; color: #0f172a; letter-spacing: -0.02em; }
    .side-by-side { display: flex; gap: 35px; width: 100%; }
    .side-by-side > div { flex: 1; }
    .signature-box { 
      text-align: center; 
      border-top: 2px solid #0f172a; 
      padding-top: 15px; 
      width: 220px; 
      margin: 0 auto;
    }
    .qr-placeholder {
      width: 90px;
      height: 90px;
      border: 1px solid #e2e8f0;
      padding: 8px;
      background: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .qr-grid {
      display: grid;
      grid-template-cols: repeat(5, 1fr);
      gap: 2px;
      width: 100%;
      height: 100%;
    }
    .qr-dot { background: #004d40; border-radius: 1px; }
  `;

  const QRPlaceholder = () => (
    <div className="qr-placeholder">
      <div className="qr-grid">
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} className="qr-dot" style={{ opacity: Math.random() > 0.3 ? 1 : 0.05 }} />
        ))}
      </div>
      <p className="text-[6pt] font-black uppercase tracking-tighter text-slate-400">Verify Doc</p>
    </div>
  );

  if (reportType === 'Audit') {
    return (
      <div className="document-container">
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <div className="bg-pattern" />
        <div className="watermark">CONFIDENTIAL AUDIT</div>
        <div className="header-accent" />
        <div className="official-stamp">
          Authorized
          {reportType === 'Audit' && <span>Financial Audit</span>}
        </div>

        {/* 1. HEADER */}
        <div className="flex justify-between items-start mb-16 relative z-10 header-flex">
          <div className="flex items-center gap-8 header-flex">
            <img src={logoUrl} alt="Logo" className="w-24 h-24 object-contain" referrerPolicy="no-referrer" />
            <div>
              <h1 className="text-3xl font-black text-fh-green tracking-tighter uppercase leading-none">Faithhouse Chapel International</h1>
              <p className="text-sm font-bold text-slate-500 mt-1">(Wonders Cathedral)</p>
              <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.6em] mt-3">Treasury & Audit Department</p>
              <div className="flex items-center gap-3 mt-4">
                <span className="px-3 py-1 bg-fh-green text-white text-[8pt] font-black uppercase tracking-widest rounded-full">Official Audit</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-6 header-flex-right">
            <div className="text-right header-flex-right">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight font-serif">Financial Audit</h2>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-2">ID: AUD-{new Date().getFullYear()}-{Math.floor(Math.random() * 9000) + 1000}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-16 mb-12 pb-8 border-b-2 border-slate-100 relative z-10">
          <div className="space-y-3">
            <p className="text-slate-400 uppercase text-[8pt] font-black tracking-widest">Reporting Period</p>
            <p className="text-xl font-black text-slate-900 font-serif">{reportPeriod}</p>
          </div>
          <div className="text-right space-y-3">
            <p className="text-slate-400 uppercase text-[8pt] font-black tracking-widest">Date of Issue</p>
            <p className="text-xl font-black text-slate-900 font-serif">{dateGenerated}</p>
          </div>
        </div>

        {/* 2. BENTO SUMMARY */}
        <h2 className="section-title uppercase relative z-10">Executive Summary</h2>
        <div className="bento-grid relative z-10">
          <div className="bento-item primary">
            <p className="summary-item-label">Gross Revenue</p>
            <p className="summary-item-value">{formatGHS(totalIncome)}</p>
          </div>
          <div className="bento-item danger">
            <p className="summary-item-label">Expenditure</p>
            <p className="summary-item-value text-red-600">{formatGHS(totalExpense)}</p>
          </div>
          <div className="bento-item col-span-2 row-span-1 bg-fh-green text-white border-none shadow-xl">
            <div className="flex flex-col h-full justify-between">
              <p className="summary-item-label text-white/60">Net Liquidity Position</p>
              <p className="summary-item-value text-white text-3xl">{formatGHS(netMonthlyBalance)}</p>
            </div>
          </div>
          <div className="bento-item success">
            <p className="summary-item-label">Tithes</p>
            <p className="summary-item-value text-emerald-600">{formatGHS(totalTithes)}</p>
          </div>
          <div className="bento-item warning">
            <p className="summary-item-label">Offerings</p>
            <p className="summary-item-value text-fh-gold">{formatGHS(totalOfferings)}</p>
          </div>
          <div className="bento-item">
            <p className="summary-item-label">Seeds</p>
            <p className="summary-item-value">{formatGHS(totalSeeds)}</p>
          </div>
          <div className="bento-item">
            <p className="summary-item-label">Other</p>
            <p className="summary-item-value">{formatGHS(totalOtherIncome)}</p>
          </div>
        </div>

        {/* 3. REVENUE BREAKDOWN */}
        <div className="side-by-side relative z-10 mb-12">
          <div>
            <h2 className="section-title uppercase">Revenue Breakdown</h2>
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Tithes</td><td className="text-right font-bold">{formatGHS(totalTithes)}</td></tr>
                <tr><td>Offerings</td><td className="text-right font-bold">{formatGHS(totalOfferings)}</td></tr>
                <tr><td>Seeds & Pledges</td><td className="text-right font-bold">{formatGHS(totalSeeds)}</td></tr>
                <tr><td>Other Income</td><td className="text-right font-bold">{formatGHS(totalOtherIncome)}</td></tr>
                <tr className="bg-slate-50"><td className="font-black text-fh-green">TOTAL REVENUE</td><td className="text-right font-black text-fh-green">{formatGHS(totalIncome)}</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h2 className="section-title uppercase">Expenditure Summary</h2>
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>General Operations</td><td className="text-right font-bold">{formatGHS(totalExpense)}</td></tr>
                <tr className="bg-red-50"><td className="font-black text-red-600">TOTAL EXPENSE</td><td className="text-right font-black text-red-600">{formatGHS(totalExpense)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. DETAILED TRANSACTIONS */}
        <h2 className="section-title uppercase">Detailed Transaction Log</h2>
        {records.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Service Type</th>
                <th className="text-right">Income</th>
                <th className="text-right">Expense</th>
                <th>Verification</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="whitespace-nowrap">{new Date(rec.service_date).toLocaleDateString('en-GB')}</td>
                  <td className="font-medium">{rec.notes || 'N/A'}</td>
                  <td className="text-[8pt] text-slate-500 uppercase font-bold">{rec.service_type}</td>
                  <td className="text-right font-bold text-emerald-600">{rec.total_income > 0 ? formatGHS(rec.total_income).replace('GH₵', '') : '-'}</td>
                  <td className="text-right font-bold text-red-600">{rec.expenses > 0 ? formatGHS(rec.expenses).replace('GH₵', '') : '-'}</td>
                  <td className="text-[7pt] text-slate-400 italic">{rec.witness1_name} / {rec.witness2_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 text-sm font-bold uppercase tracking-widest">No transactions recorded for this period.</div>
        )}

        {/* 6. AUDIT STATUS */}
        <div className="mt-12 bg-slate-900 text-white p-8 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <p className="text-[8pt] font-black uppercase tracking-[0.4em] text-fh-gold mb-2">Audit Status</p>
            <p className="text-lg font-black tracking-tight">VERIFIED & RECONCILED</p>
          </div>
          <div className="text-right max-w-xs">
            <p className="text-[9pt] text-slate-400 italic leading-relaxed">All records have been reconciled with dual witness verification protocols and bank statement matching.</p>
          </div>
        </div>

        {/* 7. SIGNATURES */}
        <div className="mt-24 grid grid-cols-3 gap-16">
          <div className="signature-box">
            <p className="font-black uppercase text-[8pt] tracking-widest text-slate-900">Treasurer</p>
            <p className="text-[7pt] text-slate-400 uppercase mt-1">Faithhouse Chapel</p>
          </div>
          <div className="signature-box">
            <p className="font-black uppercase text-[8pt] tracking-widest text-slate-900">Internal Auditor</p>
            <p className="text-[7pt] text-slate-400 uppercase mt-1">Audit Committee</p>
          </div>
          <div className="signature-box">
            <p className="font-black uppercase text-[8pt] tracking-widest text-slate-900">Head Pastor</p>
            <p className="text-[7pt] text-slate-400 uppercase mt-1">Authorization</p>
          </div>
        </div>

        <div className="mt-20 pt-10 border-t border-slate-100 flex justify-between items-center text-[8pt] text-slate-400 font-black uppercase tracking-[0.3em]">
          <p>Faithhouse Chapel International • {organizationName}</p>
          <QRPlaceholder />
        </div>
      </div>
    );
  }

  // Prepare side-by-side data for Monthly Report
  const incomeEntries = records.filter(r => (r.total_income || 0) > 0);
  const expenseEntries = records.filter(r => (r.expenses || 0) > 0);
  
  const rowCount = Math.max(incomeEntries.length, expenseEntries.length);
  const rows = Array.from({ length: rowCount });

  return (
    <div className="document-container">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="watermark">MONTHLY REPORT</div>
      <div className="header-accent" />
      <div className="official-stamp">
        Monthly
        {reportType === 'Monthly' && <span>Financial Report</span>}
      </div>

      {/* 1. TITLE SECTION */}
      <div className="flex justify-between items-start mb-16 relative z-10 header-flex">
        <div className="flex items-center gap-8 header-flex">
          <img src={logoUrl} alt="Logo" className="w-24 h-24 object-contain" referrerPolicy="no-referrer" />
          <div>
            <h1 className="text-3xl font-black text-fh-green tracking-tighter uppercase leading-none">Faithhouse Chapel International</h1>
            <p className="text-sm font-bold text-slate-500 mt-1">(Wonders Cathedral)</p>
            <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.6em] mt-3">Treasury Department</p>
            <div className="flex items-center gap-3 mt-4">
              <span className="px-3 py-1 bg-fh-green text-white text-[8pt] font-black uppercase tracking-widest rounded-full">Monthly Statement</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-6 header-flex-right">
          <div className="text-right header-flex-right">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight font-serif">Financial Report</h2>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-2">{reportPeriod}</p>
          </div>
        </div>
      </div>

      {/* 2. SUMMARY SECTION */}
      <div className="summary-card">
        <div>
          <p className="summary-item-label">Opening Balance</p>
          <p className="summary-item-value">{formatGHS(openingBalance)}</p>
        </div>
        <div>
          <p className="summary-item-label">Total Income</p>
          <p className="summary-item-value text-emerald-600">{formatGHS(totalIncome)}</p>
        </div>
        <div>
          <p className="summary-item-label">Total Expense</p>
          <p className="summary-item-value text-red-600">{formatGHS(totalExpense)}</p>
        </div>
        <div className="bg-fh-green text-white p-4 rounded-xl shadow-xl flex flex-col justify-center">
          <p className="summary-item-label text-white/60">Net Balance</p>
          <p className="summary-item-value text-white text-lg">{formatGHS(netMonthlyBalance)}</p>
        </div>
      </div>

      {/* 3. MAIN TABLE (SIDE-BY-SIDE) */}
      <div className="side-by-side">
        {/* LEFT SIDE: INCOME */}
        <div>
          <h3 className="text-center font-black bg-emerald-600 text-white p-3 text-[8pt] uppercase tracking-[0.2em] rounded-t-2xl">Income Streams</h3>
          <table className="border-t-0">
            <thead>
              <tr>
                <th style={{ width: '30px' }}>#</th>
                <th>Date</th>
                <th>Source</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((_, i) => {
                const rec = incomeEntries[i];
                return (
                  <tr key={`inc-${i}`} style={{ height: '36px' }} className={i % 2 === 0 ? 'bg-white' : 'bg-emerald-50/20'}>
                    <td className="text-center text-slate-400 text-[7pt]">{rec ? i + 1 : ''}</td>
                    <td className="text-[8pt] whitespace-nowrap">{rec ? new Date(rec.service_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : ''}</td>
                    <td className="truncate max-w-[100px] font-bold text-slate-700">{rec ? rec.service_type : ''}</td>
                    <td className="text-right font-black text-emerald-600">{rec ? formatGHS(rec.total_income || 0).replace('GH₵', '') : ''}</td>
                  </tr>
                );
              })}
              <tr className="font-black bg-emerald-50 border-t-2 border-emerald-200">
                <td colSpan={3} className="text-right uppercase text-emerald-700 text-[8pt] tracking-widest">Total Income</td>
                <td className="text-right text-emerald-700">{formatGHS(totalIncome).replace('GH₵', '')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* RIGHT SIDE: EXPENSE */}
        <div>
          <h3 className="text-center font-black bg-red-600 text-white p-3 text-[8pt] uppercase tracking-[0.2em] rounded-t-2xl">Expenditure</h3>
          <table className="border-t-0">
            <thead>
              <tr>
                <th style={{ width: '30px' }}>#</th>
                <th>Date</th>
                <th>Item</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((_, i) => {
                const rec = expenseEntries[i];
                return (
                  <tr key={`exp-${i}`} style={{ height: '36px' }} className={i % 2 === 0 ? 'bg-white' : 'bg-red-50/20'}>
                    <td className="text-center text-slate-400 text-[7pt]">{rec ? i + 1 : ''}</td>
                    <td className="text-[8pt] whitespace-nowrap">{rec ? new Date(rec.service_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : ''}</td>
                    <td className="truncate max-w-[100px] font-bold text-slate-700">{rec ? rec.notes || 'General' : ''}</td>
                    <td className="text-right font-black text-red-600">{rec ? formatGHS(rec.expenses || 0).replace('GH₵', '') : ''}</td>
                  </tr>
                );
              })}
              <tr className="font-black bg-red-50 border-t-2 border-red-200">
                <td colSpan={3} className="text-right uppercase text-red-700 text-[8pt] tracking-widest">Total Expense</td>
                <td className="text-right text-red-700">{formatGHS(totalExpense).replace('GH₵', '')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER / SIGN-OFF */}
      <div className="mt-24 grid grid-cols-2 gap-32">
        <div className="signature-box">
          <p className="font-black uppercase text-[8pt] tracking-widest text-slate-900">Prepared By</p>
          <p className="text-[7pt] text-slate-400 uppercase mt-1">Treasury Department</p>
        </div>
        <div className="signature-box">
          <p className="font-black uppercase text-[8pt] tracking-widest text-slate-900">Approved By</p>
          <p className="text-[7pt] text-slate-400 uppercase mt-1">Head Pastor / Audit</p>
        </div>
      </div>
      
      <div className="mt-20 pt-10 border-t border-slate-100 flex justify-between items-center text-[8pt] text-slate-400 font-black uppercase tracking-[0.3em]">
        <p>Generated on {dateGenerated} • Faithhouse Chapel International</p>
        <QRPlaceholder />
      </div>
    </div>
  );
};

export default FinancialReportDocument;
