import React, { useState, useRef } from 'react';
import { 
  FileText, Printer, Download, Filter, Eye, Award, 
  MapPin, CheckCircle, ChevronRight, Hash, GraduationCap, Calendar
} from 'lucide-react';
import { Leader } from './types';
import { toast } from 'sonner';

interface LeadershipReportsProps {
  leaders: Leader[];
  pipeline: any[];
  isDark: boolean;
}

export const LeadershipReports: React.FC<LeadershipReportsProps> = ({
  leaders,
  pipeline,
  isDark
}) => {
  const [reportTitle, setReportTitle] = useState('Core Leadership Report');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedRank, setSelectedRank] = useState('All');
  const [includePipeline, setIncludePipeline] = useState(true);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(true);

  const reportRef = useRef<HTMLDivElement>(null);

  // Filter leaders based on selections
  const reportLeaders = leaders.filter(l => {
    const matchesBranch = selectedBranch === 'All' || (l.branch || 'Main Branch') === selectedBranch;
    const matchesRank = selectedRank === 'All' || l.category === selectedRank;
    return matchesBranch && matchesRank;
  });

  // Unique lists for filtering
  const branches = ['All', ...Array.from(new Set(leaders.map(l => l.branch || 'Main Branch').filter(Boolean)))];
  const ranks = ['All', 'Bishop', 'Reverend', 'Pastor', 'Ministry Head', 'Deputy Ministry Head', 'Executive', 'Branch Leader', 'Cell Leader'];

  const handlePrint = () => {
    const printContent = reportRef.current?.innerHTML;
    const originalContent = document.body.innerHTML;
    
    // Create an elegant printable container in a new context or window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${reportTitle}</title>
            <style>
              body {
                font-family: 'Inter', system-ui, sans-serif;
                color: #0b0f19;
                padding: 40px;
                line-height: 1.5;
              }
              .letterhead-container {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 4px double #09420B;
                padding-bottom: 20px;
                margin-bottom: 30px;
                gap: 15px;
              }
              .letterhead-logo {
                display: flex;
                align-items: center;
                gap: 15px;
              }
              .logo-img {
                width: 60px;
                height: 60px;
                object-fit: contain;
              }
              .church-title-head {
                font-family: 'Inter', sans-serif;
                font-weight: 900;
                font-size: 16px;
                color: #09420B;
                margin: 0;
                text-transform: uppercase;
              }
              .church-sub-head {
                font-size: 10px;
                font-weight: 700;
                color: #64748b;
                margin: 2px 0 0;
                letter-spacing: 0.15em;
                text-transform: uppercase;
              }
              .letterhead-info {
                text-align: right;
              }
              .letterhead-info p {
                margin: 0;
                font-size: 11px;
                font-weight: 500;
              }
              .letterhead-info .bold-info {
                font-weight: 950;
                text-transform: uppercase;
                color: #0b0f19;
              }
              .title-banner {
                text-align: center;
                margin-top: 15px;
                margin-bottom: 25px;
                padding: 15px;
                background-color: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
              }
              .title-banner h2 {
                margin: 0;
                font-size: 18px;
                font-weight: 900;
                color: #09420B;
                text-transform: uppercase;
              }
              .title-banner p {
                margin: 5px 0 0;
                font-size: 9px;
                color: #64748b;
                text-transform: uppercase;
                font-weight: bold;
              }
              .meta-grid {
                display: grid;
                grid-template-cols: repeat(4, 1fr);
                gap: 15px;
                margin-bottom: 30px;
              }
              .meta-card {
                border: 1px solid #e2e8f0;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
              }
              .meta-value {
                font-size: 22px;
                font-weight: 800;
                color: #09420B;
              }
              .meta-label {
                font-size: 10px;
                text-transform: uppercase;
                color: #64748b;
                letter-spacing: 1px;
                margin-top: 5px;
              }
              h3 {
                color: #09420B;
                border-bottom: 1.5px solid #CC923E;
                padding-bottom: 6px;
                font-size: 16px;
                text-transform: uppercase;
                margin-top: 30px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 25px;
                font-size: 12px;
              }
              th {
                background-color: #f8fafc;
                border-bottom: 2px solid #09420B;
                color: #09420B;
                text-align: left;
                padding: 10px;
                font-weight: 700;
                text-transform: uppercase;
              }
              td {
                padding: 10px;
                border-bottom: 1px solid #f1f5f9;
              }
              .pipeline-grid {
                display: grid;
                grid-template-cols: repeat(2, 1fr);
                gap: 15px;
              }
              .pipeline-card {
                border: 1.5px solid #f1f5f9;
                border-radius: 8px;
                padding: 12px;
                background-color: #fafbfc;
              }
              .footer {
                margin-top: 60px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
                text-align: center;
                font-size: 10px;
                color: #94a3b8;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              @media print {
                body { padding: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            ${printContent}
            <div class="footer">
              Faithhouse Chapel Ecclesial Registry System &bull; Generated on ${new Date().toLocaleDateString()}
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      toast.success("Print system triggered successfully!");
    } else {
      toast.error("Popup blocked! Access print layout directly from the preview sheet.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Report Customization Panel */}
      <div className={`p-8 rounded-[2.5rem] border shadow-sm ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
      }`}>
        <div className="flex justify-between items-center pb-4 border-b border-rose-50/5 dark:border-slate-800 mb-6">
          <div>
            <h3 className="text-md font-black uppercase tracking-tight">Report Generator</h3>
            <p className="text-xs text-slate-400 mt-1">Configure and produce beautiful, formal reports for leadership assembly presentation</p>
          </div>
          <FileText className="w-6 h-6 text-fh-gold animate-bounce" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Report Heading Title</label>
            <input 
              type="text" 
              value={reportTitle} 
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-3 text-xs font-bold outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Filter by Branch</label>
            <select 
              value={selectedBranch} 
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-3 text-xs font-bold outline-none cursor-pointer"
            >
              {branches.map(br => <option key={br} value={br}>{br}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Filter by Leadership Rank</label>
            <select 
              value={selectedRank} 
              onChange={(e) => setSelectedRank(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-3 text-xs font-bold outline-none cursor-pointer"
            >
              {ranks.map(r => <option key={r} value={r}>{r === 'All' ? 'All Ranks' : `${r} Level`}</option>)}
            </select>
          </div>

          <div className="flex flex-col justify-end space-y-3 pb-1">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold">
              <input 
                type="checkbox" 
                checked={includePipeline} 
                onChange={() => setIncludePipeline(!includePipeline)}
                className="rounded text-fh-green focus:ring-0 w-4 h-4 bg-slate-200 dark:bg-slate-800 border-none" 
              />
              <span>Include School of Ministry Registry</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold">
              <input 
                type="checkbox" 
                checked={includeHistory} 
                onChange={() => setIncludeHistory(!includeHistory)}
                className="rounded text-fh-green focus:ring-0 w-4 h-4 bg-slate-200 dark:bg-slate-800 border-none" 
              />
              <span>Include Historical Logs</span>
            </label>
          </div>

        </div>

        {/* Global actions */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-4">
          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="px-5 py-3 text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl font-black uppercase tracking-widest transition-colors flex items-center gap-2 shadow"
          >
            <Eye className="w-4 h-4" />
            <span>{isPreviewMode ? 'Switch to Full-Page Print' : 'Switch to Dashboard Mode'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-6 py-3.5 text-[10px] bg-fh-green text-fh-gold hover:bg-slate-950 rounded-xl font-black uppercase tracking-widest transition-colors flex items-center gap-2 shadow-xl border-b-4 border-black/30 animate-pulse"
          >
            <Printer className="w-4 h-4" />
            <span>Produce Presentation Print</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet View container */}
      <div 
        ref={reportRef} 
        className={`p-10 rounded-[2.5rem] border shadow-md ${
          isPreviewMode 
            ? isDark 
              ? 'bg-slate-900 border-slate-800 text-white' 
              : 'bg-white border-slate-100 text-slate-900'
            : 'bg-white text-slate-950 border border-slate-300 mx-auto max-w-[800px] shadow-2xl'
        }`}
      >
        {/* Printable/Preview Header */}
        <div className="letterhead-container justify-between items-center pb-6 mb-6 border-b-4 border-double border-fh-green gap-4 flex flex-col sm:flex-row">
          <div className="letterhead-logo flex items-center gap-4">
            <img 
              src="https://lh3.googleusercontent.com/d/1la57sO6NOuNEZaqa9zDxuxRnWPBavkjH" 
              referrerPolicy="no-referrer" 
              alt="FHCI Seal" 
              className="logo-img w-16 h-16 object-contain" 
            />
            <div className="text-left">
              <h1 className="church-title-head text-lg font-black text-fh-green uppercase tracking-wide">Faithhouse Chapel International</h1>
              <p className="church-sub-head text-[8px] font-bold text-slate-400 uppercase tracking-widest">The Wonders Cathedral</p>
            </div>
          </div>
          <div className="letterhead-info sm:text-right text-center space-y-0.5">
            <p className="bold-info text-xs font-black uppercase text-slate-800 dark:text-slate-100">Pastor Prince Monovis</p>
            <p className="text-[9px] text-slate-405 uppercase font-medium">Founder & General Overseer</p>
          </div>
        </div>

        {/* Report Title Banner */}
        <div className="title-banner text-center mb-8 bg-slate-50 dark:bg-slate-950/45 p-6 rounded-2xl border border-slate-200/40">
          <h2 className="text-xl font-black text-fh-green uppercase tracking-normal">{reportTitle}</h2>
          <p className="text-[9px] text-slate-405 font-bold uppercase tracking-wider mt-1.5">
            Scope: {selectedBranch === 'All' ? 'All Global Branches' : selectedBranch} &bull; Rank Tier: {selectedRank === 'All' ? 'All Roles Hierarchy' : selectedRank}
          </p>
          <p className="text-[9px] text-slate-404 italic mt-0.5">Generated dynamically on {new Date().toLocaleDateString()}</p>
        </div>

        {/* Dynamic Aggregated Metrics Card Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 text-center select-none">
          <div className="p-4 border border-slate-200/55 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
            <span className="text-2xl font-black text-fh-green">{reportLeaders.length}</span>
            <p className="text-[8px] font-black text-slate-400 uppercase mt-1 tracking-wider">Registered Officers</p>
          </div>
          <div className="p-4 border border-slate-200/55 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
            <span className="text-2xl font-black text-fh-green">
              {reportLeaders.filter(l => l.status === 'Active').length}
            </span>
            <p className="text-[8px] font-black text-slate-400 uppercase mt-1 tracking-wider">On Active Duty</p>
          </div>
          <div className="p-4 border border-slate-200/55 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
            <span className="text-2xl font-black text-fh-green">
              {Array.from(new Set(reportLeaders.map(l => l.branch || 'Main Branch'))).length}
            </span>
            <p className="text-[8px] font-black text-slate-400 uppercase mt-1 tracking-wider">Designated Missions</p>
          </div>
          <div className="p-4 border border-slate-200/55 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
            <span className="text-2xl font-black text-fh-green">{pipeline.length}</span>
            <p className="text-[8px] font-black text-slate-400 uppercase mt-1 tracking-wider">Students Under Training</p>
          </div>
        </div>

        {/* Directory details */}
        <div className="space-y-8">
          <div>
            <h3 className="text-sm font-black text-fh-green uppercase tracking-wide border-b-2 border-fh-gold pb-1.5 mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-fh-gold" />
              I. Ecclesial Leader Directory
            </h3>

            {reportLeaders.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b-2 border-fh-green text-fh-green">
                    <th className="p-3">Leader / Officer</th>
                    <th className="p-3">Rank Class</th>
                    <th className="p-3">Assigned Title / Ministry</th>
                    <th className="p-3">Branch Oversight</th>
                    <th className="p-3 text-right">Appointed Date</th>
                  </tr>
                </thead>
                <tbody>
                  {reportLeaders.map(l => (
                    <tr key={l.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/10 transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-slate-800 dark:text-slate-100">{l.first_name} {l.last_name}</p>
                        <p className="text-[10px] text-slate-400">{l.email || 'No email register'}</p>
                      </td>
                      <td className="p-3">
                        <span className="p-1 px-2.5 bg-fh-green/10 text-fh-green rounded-md text-[9px] font-black uppercase">
                          {l.category}
                        </span>
                      </td>
                      <td className="p-3">
                        <p className="font-semibold">{l.position}</p>
                        <p className="text-[10px] text-slate-400 italic">Dept: {l.ministry || 'General Oversight'}</p>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-fh-gold" />
                          <span>{l.branch || 'Headquarters'}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono text-[10px]">{l.appointment_date || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-10 bg-slate-50/30 dark:bg-slate-950/25 rounded-2xl border border-dashed border-slate-200 text-slate-400 italic font-medium">
                No active appointed leaders matching selected parameters. Select "All Roles" or launch fresh appointments.
              </div>
            )}
          </div>

          {/* Include school of ministry registry */}
          {includePipeline && (
            <div>
              <h3 className="text-sm font-black text-fh-green uppercase tracking-wide border-b-2 border-fh-gold pb-1.5 mb-4 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-fh-gold" />
                II. School of Ministry Registry
              </h3>

              {pipeline.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pipeline.map(cp => (
                    <div key={cp.id} className="p-4 rounded-xl border border-slate-200/50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/30 flex justify-between items-center text-xs">
                      <div>
                        <h4 className="font-bold uppercase text-slate-800 dark:text-slate-200">
                          {(() => {
                            const m = cp.members ? (Array.isArray(cp.members) ? cp.members[0] : cp.members) : null;
                            return m ? `${m.first_name || ''} ${m.last_name || ''}`.trim() : 'Unknown Member';
                          })()}
                        </h4>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Level: <strong className="text-fh-green">{cp.current_level}</strong></p>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-1 bg-fh-green/10 text-fh-green font-black rounded-lg text-[10px]">{cp.progress_percentage}% Course Done</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-400 italic bg-slate-50/30 dark:bg-slate-950/25 rounded-2xl">
                  No ministry candidate training profiles recorded currently.
                </div>
              )}
            </div>
          )}

          {/* Historical trace logs included */}
          {includeHistory && (
            <div>
              <h3 className="text-sm font-black text-fh-green uppercase tracking-wide border-b-2 border-fh-gold pb-1.5 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-fh-gold" />
                III. Historical Appointments & Promotion Audit trail
              </h3>

              <div className="space-y-3">
                {leaders.flatMap(l => (l.leadership_history || []).map(h => ({ ...h, leaderName: `${l.first_name} ${l.last_name}` })))
                  .sort((a,b) => b.date.localeCompare(a.date))
                  .slice(0, 10).map((hist, i) => (
                    <div key={i} className="p-3 bg-slate-50/20 dark:bg-slate-950/25 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] leading-relaxed">
                      <div className="flex justify-between font-black text-[9px] uppercase text-slate-400 mb-1">
                        <span>{hist.leaderName}</span>
                        <span>{hist.date}</span>
                      </div>
                      <p className="font-bold text-slate-700 dark:text-slate-200">{hist.action} Event &bull; <span className="font-normal text-slate-500 italic">{hist.details}</span></p>
                    </div>
                  ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
