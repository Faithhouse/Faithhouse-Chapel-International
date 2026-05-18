
import React from 'react';

interface VisitorReportDocumentProps {
  organizationName: string;
  reportPeriod: string;
  dateGenerated: string;
  visitors: any[];
  attendance: any[];
}

const VisitorReportDocument: React.FC<VisitorReportDocumentProps> = ({
  organizationName,
  reportPeriod,
  dateGenerated,
  visitors,
  attendance
}) => {
  const logoUrl = "https://lh3.googleusercontent.com/d/1la57sO6NOuNEZaqa9zDxuxRnWPBavkjH";
  
  // Calculations
  const activeVisitors = visitors.filter(v => !v.is_registered_member);
  const convertedMembers = visitors.filter(v => v.is_registered_member);
  const totalVisits = attendance.length;
  const conversionRate = visitors.length > 0 ? (convertedMembers.length / visitors.length * 100).toFixed(1) : '0';

  // Interest breakdown
  const interestStats = activeVisitors.reduce((acc, v) => {
    const interest = v.membership_interest || 'Maybe';
    acc[interest] = (acc[interest] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
      padding: 50mm 60px 60px 60px; 
      max-width: 210mm; 
      margin: 20px auto; 
      font-family: 'Inter', sans-serif; 
      min-height: 297mm; 
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
      position: relative;
      overflow: hidden;
    }
    .letterhead-border {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 40mm;
      border-bottom: 2px solid #6366f1;
      background: #fcfcfd;
      z-index: 10;
      padding: 40px 60px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .letterhead-logo {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .letterhead-info {
      text-align: right;
      color: #312e81;
    }
    .official-seal {
      position: absolute;
      bottom: 60px;
      right: 60px;
      width: 120px;
      height: 120px;
      border: 4px double #6366f1;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 10px;
      opacity: 0.15;
      transform: rotate(-15deg);
      pointer-events: none;
    }
    .official-seal p {
      font-size: 8pt;
      font-weight: 900;
      text-transform: uppercase;
      line-height: 1.2;
      color: #6366f1;
    }
    @media print {
      body { background: white !important; margin: 0; padding: 0; }
      .no-print { display: none !important; }
      @page { margin: 0; size: A4; }
      .document-container { 
        box-shadow: none !important; 
        border: none !important; 
        width: 100% !important; 
        max-width: none !important; 
        padding: 45mm 20mm 20mm 20mm !important;
        margin: 0 !important;
      }
      .letterhead-border {
        position: fixed;
        padding: 10mm 20mm !important;
      }
    }
    table { border-collapse: collapse; width: 100%; margin-bottom: 30px; }
    th, td { border: 1px solid #e2e8f0; padding: 12px 15px; text-align: left; font-size: 9pt; }
    th { background-color: #f8fafc; font-weight: 900; text-transform: uppercase; color: #4338ca; font-size: 7.5pt; letter-spacing: 0.15em; }
    .text-right { text-align: right; }
    .section-title { 
      font-size: 12pt; 
      font-weight: 900; 
      margin-top: 40px; 
      margin-bottom: 20px; 
      color: #4338ca;
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
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
      border-left: 4px solid #6366f1;
    }
    .summary-item-label { font-size: 7pt; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 8px; }
    .summary-item-value { font-size: 14pt; font-weight: 900; color: #0f172a; }
    .signature-box { 
      text-align: center; 
      border-top: 2px solid #0f172a; 
      padding-top: 15px; 
      width: 220px; 
      margin: 0 auto;
    }
  `;

  const Letterhead = () => (
    <div className="letterhead-border">
      <div className="letterhead-logo">
        <img src={logoUrl} alt="FHCI Logo" className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
        <div>
          <h2 className="text-xl font-black tracking-tighter text-[#4338ca] uppercase leading-none">Faithhouse Chapel</h2>
          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">International (Wonders Cathedral)</p>
        </div>
      </div>
      <div className="letterhead-info">
        <p className="text-[8pt] font-black uppercase tracking-widest">Visitors & Evangelism</p>
        <p className="text-[7pt] font-medium opacity-70">P.O. Box DS 1234, Dansoman - Accra</p>
        <p className="text-[7pt] font-medium opacity-70">+233 24 000 0000 | visitors@faithhousechapel.org</p>
      </div>
    </div>
  );

  return (
    <div className="document-container">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <Letterhead />
      <div className="official-seal">
         <p>Evangelism<br/>Registry<br/>Verified</p>
      </div>

      {/* HEADER */}
      <div className="flex justify-between items-end mb-12 relative z-10 pt-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter font-serif uppercase">Visitors & Guest Report</h1>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-3">Statistical Summary</p>
        </div>
        <div className="text-right">
          <span className="px-5 py-2 bg-[#6366f1] text-white text-[10pt] font-black uppercase tracking-[0.2em] rounded-lg">Official Registry</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-16 mb-12 pb-8 border-b-2 border-slate-100">
        <div className="space-y-4">
          <p className="text-slate-400 uppercase text-[8pt] font-black tracking-widest bg-slate-50 px-3 py-1 inline-block rounded">Reporting Period</p>
          <p className="text-2xl font-black text-slate-900 font-serif leading-tight">{reportPeriod}</p>
        </div>
        <div className="text-right space-y-4">
          <p className="text-slate-400 uppercase text-[8pt] font-black tracking-widest bg-slate-50 px-3 py-1 inline-block rounded">Generation Date</p>
          <p className="text-2xl font-black text-slate-900 font-serif leading-tight">{dateGenerated}</p>
        </div>
      </div>

      {/* EXECUTIVE SUMMARY */}
      <h2 className="section-title uppercase">Executive Summary</h2>
      <div className="bento-grid">
        <div className="bento-item">
          <p className="summary-item-label">Total guests</p>
          <p className="summary-item-value">{visitors.length}</p>
        </div>
        <div className="bento-item" style={{ borderLeftColor: '#10b981' }}>
          <p className="summary-item-label">Converted Members</p>
          <p className="summary-item-value">{convertedMembers.length}</p>
        </div>
        <div className="bento-item" style={{ borderLeftColor: '#f59e0b' }}>
          <p className="summary-item-label">Conversion Rate</p>
          <p className="summary-item-value">{conversionRate}%</p>
        </div>
        <div className="bento-item">
          <p className="summary-item-label">Total Guest Visits</p>
          <p className="summary-item-value">{totalVisits}</p>
        </div>
      </div>

      {/* INTEREST ANALYSIS */}
      <h2 className="section-title uppercase">Membership Interest Analysis</h2>
      <div className="grid grid-cols-3 gap-6 mb-12">
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
          <p className="text-[8pt] font-black text-emerald-600 uppercase tracking-widest mb-1">High Interest (Yes)</p>
          <p className="text-2xl font-black text-emerald-900">{interestStats['Yes'] || 0}</p>
        </div>
        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
          <p className="text-[8pt] font-black text-indigo-600 uppercase tracking-widest mb-1">Undecided (Maybe)</p>
          <p className="text-2xl font-black text-indigo-900">{interestStats['Maybe'] || 0}</p>
        </div>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <p className="text-[8pt] font-black text-slate-600 uppercase tracking-widest mb-1">Low Interest (No)</p>
          <p className="text-2xl font-black text-slate-900">{interestStats['No'] || 0}</p>
        </div>
      </div>

      {/* RECENT GUEST LOG */}
      <h2 className="section-title uppercase">Recent Guest Intake</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Guest Name</th>
            <th>Phone</th>
            <th>First Service</th>
            <th>Welcomed By</th>
            <th>Interest</th>
          </tr>
        </thead>
        <tbody>
          {visitors.slice(0, 15).map((v, i) => (
            <tr key={i}>
              <td>{new Date(v.date_of_first_visit).toLocaleDateString('en-GB')}</td>
              <td className="font-bold">{v.full_name}</td>
              <td className="text-[8pt]">{v.phone}</td>
              <td className="text-[8pt]">{v.service_attended}</td>
              <td className="text-[8pt]">{v.welcomed_by || '---'}</td>
              <td className="text-right">
                <span className={`text-[7pt] font-black uppercase px-2 py-1 rounded ${
                  v.membership_interest === 'Yes' ? 'bg-emerald-100 text-emerald-700' :
                  v.membership_interest === 'No' ? 'bg-slate-100 text-slate-700' :
                  'bg-indigo-100 text-indigo-700'
                }`}>
                  {v.membership_interest}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* PRAYER REQUESTS & NEEDS */}
      <h2 className="section-title uppercase">Guest Prayer Requests & Needs</h2>
      <div className="space-y-4 mb-12">
        {visitors.filter(v => v.prayer_requests).slice(0, 5).map((v, i) => (
          <div key={i} className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-start mb-2">
              <p className="font-black text-slate-900 text-xs uppercase">{v.full_name}</p>
              <p className="text-[8pt] text-slate-400 font-bold">{new Date(v.date_of_first_visit).toLocaleDateString()}</p>
            </div>
            <p className="text-sm text-slate-600 italic">"{v.prayer_requests}"</p>
          </div>
        ))}
      </div>

      {/* SIGNATURES */}
      <div className="mt-24 grid grid-cols-2 gap-32">
        <div className="signature-box">
          <p className="font-black uppercase text-[8pt] tracking-widest text-slate-900">Prepared By</p>
          <p className="text-[7pt] text-slate-400 uppercase mt-1">Visitors Department Header</p>
        </div>
        <div className="signature-box">
          <p className="font-black uppercase text-[8pt] tracking-widest text-slate-900">Approved By</p>
          <p className="text-[7pt] text-slate-400 uppercase mt-1">Evangelism Director / Pastor</p>
        </div>
      </div>

      <div className="mt-20 pt-10 border-t border-slate-100 text-[8pt] text-slate-400 font-black uppercase tracking-[0.3em] text-center">
        Faithhouse Chapel International • Wonders Cathedral • Visitors Registry Report
      </div>
    </div>
  );
};

export default VisitorReportDocument;
