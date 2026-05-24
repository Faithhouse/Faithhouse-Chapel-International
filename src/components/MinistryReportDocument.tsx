
import React from 'react';
import { Ministry } from '../../types';

interface MinistryReportDocumentProps {
  ministries?: Ministry[];
  organizationName?: string;
  reportPeriod?: string;
  dateGenerated?: string;
  report?: any;
}

export const MinistryReportDocument: React.FC<MinistryReportDocumentProps> = ({ 
  ministries,
  organizationName,
  reportPeriod,
  dateGenerated,
  report
}) => {
  if (report) {
    // Render the detailed single report (expected by MinistryReportsView)
    return (
      <div className="bg-white p-12 max-w-4xl mx-auto shadow-2xl border border-slate-200">
        <div className="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-8">
           <div>
             <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">{organizationName || 'Faithhouse Chapel'}</h1>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Ministry Performance Audit</p>
           </div>
           <div className="text-right">
             <p className="text-[10px] font-black text-slate-900 uppercase">Period: {reportPeriod}</p>
             <p className="text-[10px] font-medium text-slate-400">Generated: {dateGenerated}</p>
           </div>
        </div>

        <div className="space-y-12">
          <section>
            <h2 className="text-xs font-black uppercase tracking-widest text-fh-gold mb-4">I. Executive Summary</h2>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <p className="text-sm font-medium text-slate-700 leading-relaxed italic">"{report.achievements || 'No achievement summary provided for this period.'}"</p>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-black uppercase tracking-widest text-fh-gold mb-4">II. Operational Challenges</h2>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <p className="text-sm font-medium text-slate-700 leading-relaxed italic">"{report.challenges || 'No challenges documented.'}"</p>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-black uppercase tracking-widest text-fh-gold mb-4">III. Strategic Goals</h2>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <p className="text-sm font-medium text-slate-700 leading-relaxed italic">"{report.goals_next_period || 'No future goals specified.'}"</p>
            </div>
          </section>
        </div>
        
        <div className="mt-24 pt-12 border-t border-slate-100 flex justify-between">
           <div className="text-center">
             <div className="w-48 h-px bg-slate-900 mb-2"></div>
             <p className="text-[8px] font-black uppercase">Technical Officer Signature</p>
           </div>
           <div className="text-center">
             <div className="w-48 h-px bg-slate-900 mb-2"></div>
             <p className="text-[8px] font-black uppercase">Ministry Lead Endorsement</p>
           </div>
        </div>
      </div>
    );
  }

  // Fallback to the original list view (expected by MinistriesView)
  const allMinistries = ministries || [];
  const activeMinistries = allMinistries.filter(m => m.status === 'Active');
  const inactiveMinistries = allMinistries.filter(m => m.status === 'Inactive');

  return (
    <div className="bg-white p-8 md:p-16 max-w-5xl mx-auto font-serif text-slate-900 border border-slate-200 shadow-xl print:shadow-none print:border-none print:p-0">
      {/* Letterhead */}
      <div className="flex flex-col items-center text-center mb-12 border-b-4 border-fh-green pb-8">
        <div className="w-16 h-16 mb-4">
          <img src="https://lh3.googleusercontent.com/d/1la57sO6NOuNEZaqa9zDxuxRnWPBavkjH" alt="Church Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-4xl font-black text-fh-green uppercase tracking-tighter leading-none mb-2">Faithhouse Chapel International</h1>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4">Excellence in Ministry • Global Impact</p>
        <div className="flex justify-center gap-6 text-[9px] font-black uppercase tracking-widest text-slate-500">
          <span>Headquarters: Accra, Ghana</span>
          <span>•</span>
          <span>Contact: governance@faithhouse.church</span>
        </div>
      </div>

      {/* Official Seal Impression (Decorative) */}
      <div className="absolute top-40 right-20 opacity-5 pointer-events-none rotate-12">
        <div className="w-40 h-40 border-8 border-fh-green rounded-full flex items-center justify-center p-4">
           <div className="w-full h-full border-2 border-fh-green border-dashed rounded-full flex items-center justify-center">
              <span className="text-[10px] font-black text-fh-green uppercase text-center leading-none">Faithhouse<br/>Official<br/>Record</span>
           </div>
        </div>
      </div>

      <div className="text-center mb-12">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Organizational Structure Report</h2>
        <div className="w-12 h-1 bg-fh-gold mx-auto mb-4"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Report Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Executive Summary Cards */}
      <div className="grid grid-cols-3 gap-6 mb-12">
        {[
          { label: 'Total Ministries', value: allMinistries.length, sub: 'Departments provisioned' },
          { label: 'Active Status', value: activeMinistries.length, sub: 'Currently Operational' },
          { label: 'System Health', value: 'Optimal', sub: 'Oversight Verified' }
        ].map((stat, i) => (
          <div key={i} className="p-6 bg-slate-50 border border-slate-100 rounded-2xl text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{stat.label}</p>
            <p className="text-3xl font-black text-fh-green mb-1">{stat.value}</p>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter opacity-60">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="space-y-10">
        <section>
          <div className="flex items-center gap-4 mb-6 border-b border-slate-200 pb-2">
             <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center text-[10px] font-black">01</div>
             <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Operational Ledger</h3>
          </div>
          
          <div className="overflow-hidden border border-slate-200 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-fh-gold text-[9px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4">Ministry Name</th>
                  <th className="px-6 py-4">Lead Officer</th>
                  <th className="px-6 py-4">Deputy</th>
                  <th className="px-6 py-4">Schedule</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allMinistries.map((min, i) => (
                  <tr key={i} className={`text-[10px] font-medium text-slate-700 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="px-6 py-4 font-black uppercase text-slate-900">{min.name}</td>
                    <td className="px-6 py-4">{min.lead ? `${min.lead.first_name} ${min.lead.last_name}` : (min.leader_name || '---')}</td>
                    <td className="px-6 py-4">{min.deputy ? `${min.deputy.first_name} ${min.deputy.last_name}` : '---'}</td>
                    <td className="px-6 py-4 font-mono text-[9px]">{min.meeting_schedule || 'As Directed'}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${min.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {min.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12 text-center py-12 border-t-2 border-dashed border-slate-200">
           <p className="text-[10px] font-black italic text-slate-400 max-w-lg mx-auto leading-relaxed mb-16">
             "This document serves as an official confirmation of the governance structure within Faithhouse Chapel International. All data contained herein has been synchronized with the master registry."
           </p>
           
           <div className="grid grid-cols-2 gap-20 px-12">
              <div className="space-y-4">
                 <div className="h-px bg-slate-300 w-full mx-auto"></div>
                 <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Head of Operations</p>
              </div>
              <div className="space-y-4">
                 <div className="h-px bg-slate-300 w-full mx-auto"></div>
                 <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Council of Overseers</p>
              </div>
           </div>
        </section>
      </div>

      <footer className="mt-12 text-[8px] font-black text-slate-300 uppercase text-center tracking-[0.5em] pt-8">
        Faithhouse System Archive • Confidential Repository Entry
      </footer>
    </div>
  );
};
