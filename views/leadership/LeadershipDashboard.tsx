import React from 'react';
import { 
  Users, Award, Shield, Activity, Calendar, 
  ArrowUpRight, AlertCircle, FileText, CheckCircle
} from 'lucide-react';
import { Leader, LeadershipAuditLog } from './types';

interface LeadershipDashboardProps {
  leaders: Leader[];
  auditLogs: LeadershipAuditLog[];
  isDark: boolean;
}

export const LeadershipDashboard: React.FC<LeadershipDashboardProps> = ({ 
  leaders, 
  auditLogs, 
  isDark 
}) => {
  // Compute analytics
  const totalLeaders = leaders.length;
  const activeLeaders = leaders.filter(l => l.status === 'Active').length;
  const onLeaveLeaders = leaders.filter(l => l.status === 'On Leave').length;
  
  // Rank statistics
  const rankCount = (rank: string) => leaders.filter(l => l.category === rank).length;
  
  const ranksList = [
    { rank: 'Bishop', color: 'bg-fh-green text-fh-gold', label: 'Bishops' },
    { rank: 'Reverend', color: 'bg-[#98621E] text-white', label: 'Reverends' },
    { rank: 'Pastor', color: 'bg-emerald-800 text-white', label: 'Pastors' },
    { rank: 'Ministry Head', color: 'bg-[#09420B] text-white', label: 'Ministry Heads' },
    { rank: 'Deputy Ministry Head', color: 'bg-amber-600 text-white', label: 'Deputies' },
    { rank: 'Executive', color: 'bg-[#CC923E] text-white', label: 'Executives' },
    { rank: 'Branch Leader', color: 'bg-teal-700 text-white', label: 'Branch Leaders' },
    { rank: 'Cell Leader', color: 'bg-slate-500 text-white', label: 'Cell Leaders' },
  ];

  // Recently appointed or promoted leaders
  const recentChanges = leaders
    .flatMap(l => (l.leadership_history || []).map(h => ({ ...h, leaderName: `${l.first_name} ${l.last_name}`, currentRole: l.position })))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Group by branch
  const branchCounts: Record<string, number> = {};
  leaders.forEach(l => {
    const br = l.branch || 'Main Branch';
    branchCounts[br] = (branchCounts[br] || 0) + 1;
  });

  const branchSummary = Object.entries(branchCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`p-8 rounded-3xl border shadow-sm transition-all ${
          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
        }`}>
          <div className="flex justify-between items-start mb-4">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
              Total Ranks
            </span>
            <div className="p-3 bg-fh-green/10 text-fh-green dark:bg-fh-green/20 dark:text-fh-gold rounded-2xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black">{totalLeaders}</span>
            <span className="text-xs text-emerald-500 font-bold">Ordained & Appointed</span>
          </div>
          <div className="mt-4 text-xs text-slate-400">
            Across {Object.keys(branchCounts).length} church branches
          </div>
        </div>

        <div className={`p-8 rounded-3xl border shadow-sm transition-all ${
          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
        }`}>
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Active Duty
            </span>
            <div className="p-3 bg-fh-green/20 text-fh-green rounded-2xl">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black">{activeLeaders}</span>
            <span className="text-xs text-emerald-500 font-bold">
              {totalLeaders > 0 ? Math.round((activeLeaders / totalLeaders) * 100) : 0}% active
            </span>
          </div>
          <div className="mt-4 text-xs text-slate-400">
            Fostering church expansion with dedication
          </div>
        </div>

        <div className={`p-8 rounded-3xl border shadow-sm transition-all ${
          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
        }`}>
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              On Sabbatical
            </span>
            <div className="p-3 bg-fh-gold/20 text-fh-gold rounded-2xl">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black">{onLeaveLeaders}</span>
            <span className="text-xs text-amber-500 font-bold">Pending return</span>
          </div>
          <div className="mt-4 text-xs text-slate-400">
            Leaders undergoing renewal or transition
          </div>
        </div>

        <div className={`p-8 rounded-3xl border shadow-sm transition-all ${
          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
        }`}>
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Governance Status
            </span>
            <div className="p-3 bg-fh-green/10 text-fh-green rounded-2xl">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black uppercase text-fh-gold">Secure</span>
            <span className="text-xs text-emerald-500 font-bold">Validated</span>
          </div>
          <div className="mt-6 text-xs text-slate-400">
            Bishop level approval active
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tier Distribution Breakdown */}
        <div className={`lg:col-span-2 p-8 rounded-[2.5rem] border shadow-sm ${
          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
        }`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black uppercase tracking-tight">Hierarchy Tier Distribution</h3>
            <span className="text-xs font-bold text-slate-400 uppercase">Pentecostal Structure</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ranksList.map(r => {
              const count = rankCount(r.rank);
              const percentage = totalLeaders > 0 ? (count / totalLeaders) * 100 : 0;
              return (
                <div key={r.rank} className={`p-4 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-950/45 border-slate-850' : 'bg-slate-50 border-slate-100 shadow-inner'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${r.color.split(' ')[0]}`} />
                    <span className="text-[10px] font-bold text-slate-400 uppercase truncate">{r.label}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black">{count}</span>
                    <span className="text-[9px] font-semibold text-slate-400">{Math.round(percentage)}%</span>
                  </div>
                  <div className="mt-3 w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full ${r.color.split(' ')[0]}`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Branch Leadership Concentration</h4>
            <div className="space-y-4">
              {branchSummary.length > 0 ? branchSummary.map(([br, count]) => {
                const branchPercentage = totalLeaders > 0 ? (count / totalLeaders) * 100 : 0;
                return (
                  <div key={br} className="flex items-center justify-between gap-4">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-32 truncate">{br}</span>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-fh-green h-full rounded-full" style={{ width: `${branchPercentage}%` }} />
                    </div>
                    <span className="text-xs font-black w-8 text-right">{count}</span>
                  </div>
                );
              }) : (
                <div className="text-center font-bold text-xs text-slate-400 py-4 italic">No branch data recorded.</div>
              )}
            </div>
          </div>
        </div>

        {/* Audit Trials Summary */}
        <div className={`p-8 rounded-[2.5rem] border shadow-sm ${
          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
        }`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-500 animate-pulse" />
              Security Audit Trails
            </h3>
            <span className="text-[9px] font-black uppercase bg-rose-50 text-rose-600 dark:bg-rose-950/30 px-2.5 py-1 rounded-full">
              Live Feed
            </span>
          </div>

          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {auditLogs.length > 0 ? auditLogs.map(log => (
              <div key={log.id} className={`p-4 rounded-xl border text-xs leading-relaxed transition-all ${
                isDark ? 'bg-slate-950/45 border-slate-850' : 'bg-slate-50 border-slate-100'
              }`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-fh-green uppercase text-[9px] tracking-wider">{log.actor}</span>
                  <span className="text-slate-400 text-[8px] font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 font-medium">
                  {log.action} <span className="font-bold text-slate-900 dark:text-white">{log.target}</span>
                </p>
                <div className="mt-2 text-[8px] font-black uppercase tracking-wider text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md w-fit">
                  {log.rank} ACCESS VALIDATED
                </div>
              </div>
            )) : (
              <div className="text-center py-10 italic text-slate-300 dark:text-slate-600 font-bold uppercase text-xs">
                No security actions recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline Stream of Promotions & Appointments */}
      <div className={`p-8 rounded-[2.5rem] border shadow-sm ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
      }`}>
        <h3 className="text-lg font-black uppercase tracking-tight mb-6">Ordination & Registry Activity Stream</h3>
        <div className="space-y-6">
          {recentChanges.length > 0 ? recentChanges.map((change, idx) => (
            <div key={change.id || idx} className="flex gap-4 items-start relative group">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-fh-green text-fh-gold flex items-center justify-center font-black text-xs shadow-md">
                  {idx + 1}
                </div>
                {idx !== recentChanges.length - 1 && (
                  <div className="w-0.5 bg-slate-200 dark:bg-slate-800 h-12 mt-2" />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    {change.leaderName}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">{change.date}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                    change.action === 'Appointment' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' :
                    change.action === 'Promotion' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30' :
                    change.action === 'Transfer' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {change.action}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {change.details}
                  </span>
                </div>
                <div className="mt-2 text-[9px] text-slate-400 italic">
                  Handled by Administrator: {change.performed_by}
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-8 italic text-slate-300 dark:text-slate-600 font-bold uppercase text-xs">
              No recent registry events logged. Apply promotions or new appointments in the Registry tab to populate this timeline!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
