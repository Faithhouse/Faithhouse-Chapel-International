import React, { useState } from 'react';
import { 
  GitFork, ChevronDown, ChevronUp, User, Users, MapPin, 
  ArrowUp, ArrowDown, Award, Briefcase, Plus, Search, CheckCircle2
} from 'lucide-react';
import { Leader, LeadershipRank } from './types';
import { toast } from 'sonner';

interface LeadershipTreeProps {
  leaders: Leader[];
  onUpdateSupervisor: (leaderId: string, supervisorId: string | undefined) => Promise<void>;
  isDark: boolean;
}

export const LeadershipTree: React.FC<LeadershipTreeProps> = ({ 
  leaders, 
  onUpdateSupervisor,
  isDark 
}) => {
  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [isUpdateSupervisorOpen, setIsUpdateSupervisorOpen] = useState(false);
  const [supervisorSearchTerm, setSupervisorSearchTerm] = useState('');

  // unique branches
  const branches = ['All', ...Array.from(new Set(leaders.map(l => l.branch || 'Main Branch').filter(Boolean)))];

  // Filtering leaders by selected branch
  const filteredLeaders = selectedBranch === 'All' 
    ? leaders 
    : leaders.filter(l => (l.branch || 'Main Branch') === selectedBranch);

  const selectedLeader = leaders.find(l => l.id === selectedLeaderId);

  // Hierarchy levels
  const hierarchyRanks: { rank: LeadershipRank; label: string; icon: string; description: string }[] = [
    { rank: 'Bishop', label: 'Bishop Level', icon: '👑', description: 'Apostolic Oversight' },
    { rank: 'Reverend', label: 'Reverend Level', icon: '✨', description: 'Senior Pastoral Councils' },
    { rank: 'Pastor', label: 'Pastoral Staff', icon: '📖', description: 'Spiritual Branch Shepherds' },
    { rank: 'Ministry Head', label: 'Ministry Presidents', icon: '⚓', description: 'Departmental Leadership' },
    { rank: 'Deputy Ministry Head', label: 'Deputy Directors', icon: '🛡️', description: 'Auxiliary Oversight' },
    { rank: 'Executive', label: 'Executive Board', icon: '📜', description: 'Core Administration' },
    { rank: 'Branch Leader', label: 'Branch Elder / Deacon', icon: '🌿', description: 'Parish Governance' },
    { rank: 'Cell Leader', label: 'Cell Group Leader', icon: '🏡', description: 'Small Group Ministries' }
  ];

  // Calculate reporting chain (Upwards hierarchy)
  const getReportingChain = (leader: Leader): Leader[] => {
    const chain: Leader[] = [];
    let current = leader;
    const visited = new Set<string>(); // prevent infinite loops
    
    while (current && current.reports_to_id && !visited.has(current.id)) {
      visited.add(current.id);
      const supervisor = leaders.find(l => l.id === current.reports_to_id);
      if (supervisor) {
        chain.push(supervisor);
        current = supervisor;
      } else {
        break;
      }
    }
    return chain;
  };

  // Calculate direct reports (Downwards hierarchy)
  const getDirectReports = (leaderId: string): Leader[] => {
    return leaders.filter(l => l.reports_to_id === leaderId);
  };

  // Filter possible supervisors (cannot report to self or a circular path)
  const getEligibleSupervisors = (currentLeader: Leader): Leader[] => {
    const chain = getReportingChain(currentLeader);
    const chainIds = new Set(chain.map(c => c.id));
    return leaders.filter(l => 
      l.id !== currentLeader.id && 
      !chainIds.has(l.id) && 
      l.category !== 'Cell Leader' // Cell leaders cannot supervise higher ranks
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Visual Hierarchy Diagram / Grid */}
      <div className="lg:col-span-2 space-y-6">
        {/* Branch Filter Banner */}
        <div className={`p-6 rounded-[2rem] border shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between ${
          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
        }`}>
          <div>
            <h3 className="text-md font-black uppercase tracking-tight">Multi-Branch Structure Explorer</h3>
            <p className="text-xs text-slate-400 mt-1">Select a parish/branch to visualize local structural lines</p>
          </div>
          <div className="flex gap-2 flex-wrap bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800">
            {branches.map(br => (
              <button
                key={br}
                onClick={() => setSelectedBranch(br)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  selectedBranch === br 
                    ? 'bg-fh-green text-fh-gold shadow-md' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                {br}
              </button>
            ))}
          </div>
        </div>

        {/* Tree Levels */}
        <div className="space-y-4">
          {hierarchyRanks.map((tier, idx) => {
            const levelLeaders = filteredLeaders.filter(l => l.category === tier.rank);
            return (
              <div key={tier.rank} className="relative">
                {/* Visual Connector Line between Levels */}
                {idx !== hierarchyRanks.length - 1 && (
                  <div className="absolute left-8 top-16 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800 z-0" />
                )}

                <div className={`p-6 rounded-[2rem] border shadow-sm relative z-10 transition-all ${
                  isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
                }`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{tier.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black uppercase tracking-widest">{tier.label}</h4>
                          <span className="px-2.5 py-0.5 text-[8px] font-black bg-fh-green/10 text-fh-green rounded-full">
                            Rank {idx + 1}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{tier.description}</p>
                      </div>
                    </div>
                    <span className="bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                      {levelLeaders.length} Active Officers
                    </span>
                  </div>

                  {levelLeaders.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {levelLeaders.map(leader => (
                        <button
                          key={leader.id}
                          onClick={() => {
                            setSelectedLeaderId(leader.id);
                            setIsUpdateSupervisorOpen(false);
                          }}
                          className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between gap-2 group ${
                            selectedLeaderId === leader.id
                              ? 'border-fh-gold bg-indigo-50/20 dark:bg-indigo-950/25 ring-2 ring-fh-gold/45'
                              : isDark
                                ? 'bg-slate-950/45 border-slate-850 hover:border-slate-700'
                                : 'bg-slate-50 border-slate-105 hover:bg-white hover:border-slate-200 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-3 w-52 truncate">
                            {leader.image_url ? (
                              <img src={leader.image_url} alt="" className="w-9 h-9 rounded-lg object-cover border border-slate-200 shadow-inner" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-slate-950 text-fh-gold font-black flex items-center justify-center text-xs">
                                {leader.first_name[0]}{leader.last_name[0]}
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-black uppercase tracking-wider truncate">
                                {leader.first_name} {leader.last_name}
                              </p>
                              <p className="text-[9px] font-semibold text-slate-400 max-w-40 truncate">
                                {leader.position}
                              </p>
                            </div>
                          </div>
                          
                          {/* Indicator if has immediate supervisor */}
                          {leader.reports_to_id ? (
                            <span className="text-[8px] text-emerald-500 font-extrabold uppercase bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded">
                              Connected
                            </span>
                          ) : idx === 0 ? (
                            <span className="text-[8px] text-purple-500 font-extrabold uppercase bg-purple-50 dark:bg-purple-950/30 px-2 py-0.5 rounded">
                              Apostle
                            </span>
                          ) : (
                            <span className="text-[8px] text-amber-500 font-extrabold uppercase bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded">
                              Standalone
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-[10px] font-black uppercase tracking-wider text-slate-300 dark:text-slate-650 italic">
                      No leaders appointed at this hierarchy tier yet.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reporting Inspector Sidebar */}
      <div>
        {selectedLeader ? (
          <div className={`p-8 rounded-[2.5rem] border shadow-sm sticky top-6 space-y-6 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
          }`}>
            {/* Header profile info */}
            <div className="text-center pb-6 border-b border-slate-100 dark:border-slate-800 relative">
              <button 
                onClick={() => setSelectedLeaderId(null)}
                className="absolute top-0 right-0 p-2 text-slate-400 hover:text-slate-600 text-xs font-black uppercase"
              >
                Close
              </button>
              
              <div className="w-20 h-20 rounded-[2rem] bg-slate-950 text-fh-gold flex items-center justify-center font-black text-2xl mx-auto mb-4 border-b-4 border-fh-gold/25 shadow-xl">
                {selectedLeader.first_name[0]}{selectedLeader.last_name[0]}
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight">{selectedLeader.first_name} {selectedLeader.last_name}</h3>
              <p className="text-[10px] font-semibold text-fh-green uppercase mt-1 tracking-widest">{selectedLeader.position}</p>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-2 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full w-fit mx-auto">
                {selectedLeader.category} Rank
              </p>
            </div>

            {/* Upward Line of Command Inspector */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <ArrowUp className="w-3 h-3 text-indigo-500" />
                Line of Authority Upwards
              </h4>
              
              <div className="space-y-2 pl-2">
                {/* Visual trace of authority */}
                {getReportingChain(selectedLeader).length > 0 ? (
                  getReportingChain(selectedLeader).map((supervisor, i) => (
                    <div key={supervisor.id} className="flex gap-3 items-center">
                      <div className="flex flex-col items-center">
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                        {i !== getReportingChain(selectedLeader).length - 1 && (
                          <div className="w-0.5 bg-indigo-200 dark:bg-indigo-900 h-6" />
                        )}
                      </div>
                      <div className="flex-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 text-xs font-bold flex items-center justify-between">
                        <div className="truncate w-36">
                          <p className="uppercase text-slate-800 dark:text-slate-200 truncate">{supervisor.first_name} {supervisor.last_name}</p>
                          <p className="text-[9px] text-slate-400 font-semibold truncate">{supervisor.position}</p>
                        </div>
                        <span className="text-[8px] font-black uppercase text-indigo-500">{supervisor.category}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl text-center italic text-slate-400 text-xs">
                    Reports to no supervisors. Bishop level or standalone apostolate.
                  </div>
                )}
              </div>
              
              {/* Button to recheck / alter supervisor mappings */}
              <button
                onClick={() => setIsUpdateSupervisorOpen(!isUpdateSupervisorOpen)}
                className="w-full mt-3 py-2.5 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-950/50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-200 dark:border-slate-800"
              >
                {isUpdateSupervisorOpen ? 'Cancel Assignment' : 'Reassign Immediate Supervisor'}
              </button>

              {/* Collapsed supervisor search override */}
              {isUpdateSupervisorOpen && (
                <div className="mt-4 p-4 border border-dashed border-indigo-200 dark:border-slate-800 bg-indigo-50/10 rounded-2xl space-y-3">
                  <p className="text-[9px] font-black text-indigo-600 uppercase tracking-wide">Assign Immediate reporting line supervisor</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search leader..."
                      value={supervisorSearchTerm}
                      onChange={(e) => setSupervisorSearchTerm(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-bold outline-none"
                    />
                  </div>
                  
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {/* Filtered potential supervisors */}
                    <button
                      onClick={async () => {
                        await onUpdateSupervisor(selectedLeader.id, undefined);
                        setIsUpdateSupervisorOpen(false);
                      }}
                      className="w-full p-2 hover:bg-rose-50 hover:text-rose-600 text-rose-500 text-[9px] font-black uppercase text-left rounded-lg transition-colors border border-dashed border-rose-250 mb-2"
                    >
                      Remove Parent Link (Make Standalone)
                    </button>
                    
                    {getEligibleSupervisors(selectedLeader)
                      .filter(l => `${l.first_name} ${l.last_name}`.toLowerCase().includes(supervisorSearchTerm.toLowerCase()))
                      .slice(0, 5)
                      .map(opt => (
                        <button
                          key={opt.id}
                          onClick={async () => {
                            await onUpdateSupervisor(selectedLeader.id, opt.id);
                            setIsUpdateSupervisorOpen(false);
                            toast.success(`Supervisor updated to ${opt.first_name} ${opt.last_name}`);
                          }}
                          className="w-full p-2 text-xs font-bold text-slate-700 hover:bg-slate-150 dark:text-slate-300 dark:hover:bg-slate-905 rounded-lg text-left transition-colors flex justify-between items-center"
                        >
                          <span>{opt.first_name} {opt.last_name}</span>
                          <span className="text-[8px] font-black uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{opt.category}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Downward Line of Subordinates */}
            <div className="space-y-3 pt-4 border-t border-slate-105 dark:border-slate-800">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <ArrowDown className="w-3 h-3 text-emerald-500" />
                Direct Reports Downwards ({getDirectReports(selectedLeader.id).length})
              </h4>
              
              <div className="space-y-2">
                {getDirectReports(selectedLeader.id).length > 0 ? (
                  getDirectReports(selectedLeader.id).map(report => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedLeaderId(report.id)}
                      className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/40 dark:hover:bg-slate-900 text-left text-xs font-bold flex justify-between items-center border border-slate-100 dark:border-slate-805 transition-colors group"
                    >
                      <div className="truncate">
                        <p className="text-slate-800 dark:text-slate-200 group-hover:text-fh-green transition-colors truncate">{report.first_name} {report.last_name}</p>
                        <p className="text-[9px] text-slate-400 font-semibold truncate">{report.position}</p>
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded ml-2">
                        {report.category}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl text-center italic text-slate-400 text-xs">
                    No immediate direct reporting lines mapped.
                  </div>
                )}
              </div>
            </div>

            {/* Admin notes overview snippet */}
            {selectedLeader.notes && (
              <div className="p-4 bg-slate-100/40 dark:bg-slate-950/30 rounded-2xl border border-slate-200 dark:border-slate-800">
                <p className="text-[9px] font-black uppercase text-slate-400 mb-2">Administrative remarks</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 italic">"{selectedLeader.notes}"</p>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-205 dark:border-slate-800 text-slate-400 min-h-[400px]">
            <GitFork className="w-12 h-12 text-slate-300 dark:text-slate-650 mb-3 rotate-180 animate-pulse" />
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Structure Inspector</h4>
            <p className="text-xs text-slate-400 mt-2 max-w-xs font-medium">Select any active leader in the visual tier nodes to view their command flow, immediate supervisors, and direct reports.</p>
          </div>
        )}
      </div>

    </div>
  );
};
