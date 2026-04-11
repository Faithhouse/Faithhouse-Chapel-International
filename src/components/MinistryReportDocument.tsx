
import React from 'react';
import { MinistryReport } from '../../types';

interface MinistryReportDocumentProps {
  organizationName: string;
  reportPeriod: string;
  dateGenerated: string;
  report: MinistryReport;
}

const MinistryReportDocument: React.FC<MinistryReportDocumentProps> = ({
  organizationName,
  reportPeriod,
  dateGenerated,
  report
}) => {
  const logoUrl = "https://lh3.googleusercontent.com/d/1la57sO6NOuNEZaqa9zDxuxRnWPBavkjH";
  
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
      font-size: 100px;
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
    .bento-item.gold::before { background: #d4af37; }
    .bento-item.primary::before { background: #0ea5e9; }
    .bento-item.success::before { background: #10b981; }
    .bento-item.danger::before { background: #f43f5e; }
    
    .summary-item-label { font-size: 7pt; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 8px; }
    .summary-item-value { font-size: 14pt; font-weight: 900; color: #0f172a; letter-spacing: -0.02em; }
    
    .content-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      padding: 30px;
      margin-bottom: 30px;
      line-height: 1.6;
      font-size: 10pt;
      color: #334155;
    }
    
    .signature-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 60px;
      margin-top: 80px;
    }
    .signature-box { 
      text-align: center; 
      border-top: 2px solid #0f172a; 
      padding-top: 15px; 
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

  return (
    <div className="document-container">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="bg-pattern" />
      <div className="watermark">MINISTRY REPORT</div>
      <div className="header-accent" />
      <div className="official-stamp">
        {report.report_type}
      </div>

      {/* HEADER */}
      <div className="flex flex-col items-center mb-16 relative z-10 text-center">
        <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain mb-4" referrerPolicy="no-referrer" />
        <div>
          <h1 className="text-xl font-black text-fh-green tracking-tighter uppercase leading-none">{organizationName}</h1>
          <p className="text-sm font-bold text-slate-500 mt-1">(Wonders Cathedral)</p>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-4">ID: REP-{report.year}-{report.id.slice(0, 4).toUpperCase()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-16 mb-12 pb-8 border-b-2 border-slate-100 relative z-10">
        <div className="space-y-3">
          <p className="text-slate-400 uppercase text-[8pt] font-black tracking-widest">Ministry / Department</p>
          <p className="text-xl font-black text-slate-900 font-serif uppercase">{report.ministries?.name}</p>
        </div>
        <div className="text-right space-y-3">
          <p className="text-slate-400 uppercase text-[8pt] font-black tracking-widest">Reporting Period</p>
          <p className="text-xl font-black text-slate-900 font-serif">{report.period} {report.year}</p>
        </div>
      </div>

      {/* BENTO SUMMARY */}
      <h2 className="section-title uppercase relative z-10">Executive Metrics</h2>
      <div className="bento-grid relative z-10">
        <div className="bento-item gold">
          <p className="summary-item-label">Avg Attendance</p>
          <p className="summary-item-value">{report.attendance_summary?.average || 0}</p>
        </div>
        <div className="bento-item primary">
          <p className="summary-item-label">Peak Attendance</p>
          <p className="summary-item-value">{report.attendance_summary?.peak || 0}</p>
        </div>
        <div className="bento-item success">
          <p className="summary-item-label">Total Revenue</p>
          <p className="summary-item-value">{formatGHS(report.financial_summary?.income || 0)}</p>
        </div>
        <div className="bento-item danger">
          <p className="summary-item-label">Total Expenditure</p>
          <p className="summary-item-value">{formatGHS(report.financial_summary?.expenses || 0)}</p>
        </div>
      </div>

      {/* CONTENT SECTIONS */}
      <h2 className="section-title uppercase relative z-10">Key Achievements</h2>
      <div className="content-box relative z-10">
        {report.achievements || 'No achievements documented for this period.'}
      </div>

      <h2 className="section-title uppercase relative z-10">Operational Challenges</h2>
      <div className="content-box relative z-10">
        {report.challenges || 'No challenges documented for this period.'}
      </div>

      <h2 className="section-title uppercase relative z-10">Future Objectives</h2>
      <div className="content-box relative z-10">
        {report.goals_next_period || 'No future goals documented for this period.'}
      </div>

      {/* SIGNATURES */}
      <div className="signature-row">
        <div className="signature-box">
          <p className="font-black uppercase text-[8pt] tracking-widest text-slate-900">Ministry Leader</p>
          <p className="text-[7pt] text-slate-400 uppercase mt-1">Faithhouse Chapel</p>
        </div>
        <div className="signature-box">
          <p className="font-black uppercase text-[8pt] tracking-widest text-slate-900">General Overseer</p>
          <p className="text-[7pt] text-slate-400 uppercase mt-1">Authorization</p>
        </div>
      </div>

      <div className="mt-20 pt-10 border-t border-slate-100 flex justify-between items-center text-[8pt] text-slate-400 font-black uppercase tracking-[0.3em]">
        <p>Generated on {dateGenerated} • Faithhouse Chapel International</p>
        <QRPlaceholder />
      </div>
    </div>
  );
};

export default MinistryReportDocument;
