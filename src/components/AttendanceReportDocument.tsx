
import React from 'react';
import { AttendanceEvent, Branch } from '../../types';

interface AttendanceReportDocumentProps {
  organizationName: string;
  reportType: string;
  reportPeriod: string;
  dateGenerated: string;
  events: AttendanceEvent[];
  branches: Branch[];
}

const AttendanceReportDocument: React.FC<AttendanceReportDocumentProps> = ({
  organizationName,
  reportType,
  reportPeriod,
  dateGenerated,
  events,
  branches
}) => {
  const logoUrl = "https://lh3.googleusercontent.com/d/1la57sO6NOuNEZaqa9zDxuxRnWPBavkjH";
  
  // Calculations
  const totalAttendance = events.reduce((sum, e) => sum + (e.total_attendance || 0), 0);
  const avgAttendance = events.length > 0 ? Math.round(totalAttendance / events.length) : 0;
  
  // Greatest attendance by service type
  const typeStats = events.reduce((acc, e) => {
    if (!acc[e.event_type]) {
      acc[e.event_type] = { count: 0, total: 0 };
    }
    acc[e.event_type].count++;
    acc[e.event_type].total += (e.total_attendance || 0);
    return acc;
  }, {} as Record<string, { count: number, total: number }>);

  const sortedTypes = Object.entries(typeStats)
    .map(([type, stats]: [string, any]) => ({ type, avg: Math.round(stats.total / stats.count), total: stats.total }))
    .sort((a, b) => b.avg - a.avg);

  // Demographic breakdown
  const totalMen = events.reduce((sum, e) => sum + (e.men_count || 0), 0);
  const totalWomen = events.reduce((sum, e) => sum + (e.women_count || 0), 0);
  const totalChildren = events.reduce((sum, e) => sum + (e.children_count || 0), 0);

  // Growth & Trends (Drop participations)
  const sortedEvents = [...events].sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  const trends = sortedEvents.map((e, i) => {
    if (i === 0) return { ...e, change: 0 };
    const prev = sortedEvents[i - 1];
    const change = (e.total_attendance || 0) - (prev.total_attendance || 0);
    return { ...e, change };
  });

  const drops = trends.filter(t => t.change < 0).sort((a, b) => a.change - b.change);

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
    }
    table { border-collapse: collapse; width: 100%; margin-bottom: 30px; }
    th, td { border: 1px solid #e2e8f0; padding: 12px 15px; text-align: left; font-size: 9pt; }
    th { background-color: #f8fafc; font-weight: 900; text-transform: uppercase; color: #004d40; font-size: 7.5pt; letter-spacing: 0.15em; }
    .text-right { text-align: right; }
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
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
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

  return (
    <div className="document-container">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="header-accent" />
      <div className="official-stamp">Official Report</div>

      {/* HEADER */}
      <div className="flex flex-col items-center text-center mb-16">
        <img src={logoUrl} alt="Logo" className="w-24 h-24 object-contain mb-6" referrerPolicy="no-referrer" />
        <div>
          <h1 className="text-2xl font-black text-fh-green tracking-tighter uppercase leading-none mb-2">{organizationName}</h1>
          <p className="text-sm font-bold text-slate-500 mb-4">(Wonders Cathedral)</p>
          <div className="inline-block px-6 py-2 bg-fh-green text-white text-[10pt] font-black uppercase tracking-[0.3em] rounded-full">
            {reportType} Attendance Report
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-16 mb-12 pb-8 border-b-2 border-slate-100">
        <div className="space-y-3">
          <p className="text-slate-400 uppercase text-[8pt] font-black tracking-widest">Reporting Period</p>
          <p className="text-xl font-black text-slate-900 font-serif">{reportPeriod}</p>
        </div>
        <div className="text-right space-y-3">
          <p className="text-slate-400 uppercase text-[8pt] font-black tracking-widest">Date Generated</p>
          <p className="text-xl font-black text-slate-900 font-serif">{dateGenerated}</p>
        </div>
      </div>

      {/* EXECUTIVE SUMMARY */}
      <h2 className="section-title uppercase">Executive Summary</h2>
      <div className="bento-grid">
        <div className="bento-item">
          <p className="summary-item-label">Total Attendance</p>
          <p className="summary-item-value">{totalAttendance.toLocaleString()}</p>
        </div>
        <div className="bento-item">
          <p className="summary-item-label">Avg. per Service</p>
          <p className="summary-item-value">{avgAttendance.toLocaleString()}</p>
        </div>
        <div className="bento-item">
          <p className="summary-item-label">Total Services</p>
          <p className="summary-item-value">{events.length}</p>
        </div>
        <div className="bento-item">
          <p className="summary-item-label">Peak Attendance</p>
          <p className="summary-item-value">{Math.max(...events.map(e => e.total_attendance || 0), 0).toLocaleString()}</p>
        </div>
      </div>

      {/* DEMOGRAPHICS */}
      <h2 className="section-title uppercase">Demographic Breakdown</h2>
      <div className="bento-grid">
        <div className="bento-item">
          <p className="summary-item-label">Total Men</p>
          <p className="summary-item-value text-blue-600">{totalMen.toLocaleString()}</p>
        </div>
        <div className="bento-item">
          <p className="summary-item-label">Total Women</p>
          <p className="summary-item-value text-pink-600">{totalWomen.toLocaleString()}</p>
        </div>
        <div className="bento-item">
          <p className="summary-item-label">Total Children</p>
          <p className="summary-item-value text-emerald-600">{totalChildren.toLocaleString()}</p>
        </div>
        <div className="bento-item">
          <p className="summary-item-label">Gender Ratio (M:W)</p>
          <p className="summary-item-value text-slate-600">
            {totalWomen > 0 ? (totalMen / totalWomen).toFixed(2) : 'N/A'}
          </p>
        </div>
      </div>

      {/* PERFORMANCE BY SERVICE TYPE */}
      <h2 className="section-title uppercase">Performance by Service Type</h2>
      <table>
        <thead>
          <tr>
            <th>Service Type</th>
            <th className="text-right">Frequency</th>
            <th className="text-right">Total Attendance</th>
            <th className="text-right">Average Attendance</th>
          </tr>
        </thead>
        <tbody>
          {sortedTypes.map((stat, i) => (
            <tr key={i}>
              <td className="font-bold">{stat.type}</td>
              <td className="text-right">{typeStats[stat.type].count}</td>
              <td className="text-right">{stat.total.toLocaleString()}</td>
              <td className="text-right font-black text-fh-green">{stat.avg.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ATTENDANCE DROP ANALYSIS */}
      {drops.length > 0 && (
        <>
          <h2 className="section-title uppercase">Attendance Drop Analysis</h2>
          <p className="text-[8pt] text-slate-500 mb-4 italic">Identifying services with significant attendance decreases compared to the previous session.</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Service Name</th>
                <th className="text-right">Prev. Attendance</th>
                <th className="text-right">Current Attendance</th>
                <th className="text-right">Drop Count</th>
                <th className="text-right">% Decrease</th>
              </tr>
            </thead>
            <tbody>
              {drops.slice(0, 5).map((d, i) => {
                const prevAttendance = (d.total_attendance || 0) - d.change;
                const percentDrop = prevAttendance > 0 ? Math.round((Math.abs(d.change) / prevAttendance) * 100) : 0;
                return (
                  <tr key={i} className="bg-red-50/30">
                    <td>{new Date(d.event_date).toLocaleDateString('en-GB')}</td>
                    <td className="font-bold">{d.event_name}</td>
                    <td className="text-right">{prevAttendance}</td>
                    <td className="text-right">{d.total_attendance}</td>
                    <td className="text-right font-black text-red-600">-{Math.abs(d.change)}</td>
                    <td className="text-right font-black text-red-600">{percentDrop}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {/* SERVICE LOG */}
      <h2 className="section-title uppercase">Detailed Service Log</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Service Name</th>
            <th>Type</th>
            <th className="text-right">Men</th>
            <th className="text-right">Women</th>
            <th className="text-right">Children</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e, i) => (
            <tr key={i}>
              <td>{new Date(e.event_date).toLocaleDateString('en-GB')}</td>
              <td className="font-bold">{e.event_name}</td>
              <td className="text-[7pt] uppercase font-black text-slate-400">{e.event_type}</td>
              <td className="text-right">{e.men_count || 0}</td>
              <td className="text-right">{e.women_count || 0}</td>
              <td className="text-right">{e.children_count || 0}</td>
              <td className="text-right font-black">{e.total_attendance || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* SIGNATURES */}
      <div className="mt-24 grid grid-cols-2 gap-32">
        <div className="signature-box">
          <p className="font-black uppercase text-[8pt] tracking-widest text-slate-900">Prepared By</p>
          <p className="text-[7pt] text-slate-400 uppercase mt-1">Attendance Department</p>
        </div>
        <div className="signature-box">
          <p className="font-black uppercase text-[8pt] tracking-widest text-slate-900">Approved By</p>
          <p className="text-[7pt] text-slate-400 uppercase mt-1">General Overseer / Admin</p>
        </div>
      </div>

      <div className="mt-20 pt-10 border-t border-slate-100 text-[8pt] text-slate-400 font-black uppercase tracking-[0.3em] text-center">
        Faithhouse Chapel International • Wonders Cathedral • {reportType} Attendance Report
      </div>
    </div>
  );
};

export default AttendanceReportDocument;
