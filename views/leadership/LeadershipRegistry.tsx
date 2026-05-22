import React, { useState } from 'react';
import { 
  Search, CheckSquare, Briefcase, Mail, Phone, Calendar, 
  MapPin, Award, ArrowUp, ChevronRight, Layout, Edit, Trash2, 
  Filter, CheckSquare as CheckSquareIcon, Plus, X, List, AlertTriangle, 
  ArrowRight, ShieldAlert, BadgeCheck
} from 'lucide-react';
import { Leader, LeadershipRank, LeadershipHistoryItem } from './types';
import { toast } from 'sonner';

interface LeadershipRegistryProps {
  leaders: Leader[];
  onOpenAppointModal: (leader?: Leader) => void;
  onDeleteLeader: (id: string) => Promise<void>;
  onPromoteLeader: (id: string, newRank: LeadershipRank, actionDetails: string) => Promise<void>;
  onTransferBranch: (id: string, newBranch: string, actionDetails: string) => Promise<void>;
  isDark: boolean;
}

export const LeadershipRegistry: React.FC<LeadershipRegistryProps> = ({
  leaders,
  onOpenAppointModal,
  onDeleteLeader,
  onPromoteLeader,
  onTransferBranch,
  isDark
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);
  
  // Selection states (for bulk assignment / export)
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedLeaderIds, setSelectedLeaderIds] = useState<string[]>([]);
  
  // Action Panels
  const [activeActionTab, setActiveActionTab] = useState<'details' | 'promote' | 'transfer' | 'history'>('details');
  const [promotionRank, setPromotionRank] = useState<LeadershipRank>('Pastor');
  const [promotionDetails, setPromotionDetails] = useState('');
  const [transferBranchName, setTransferBranchName] = useState('');
  const [transferDetails, setTransferDetails] = useState('');

  const rawRanks: LeadershipRank[] = [
    'Bishop', 'Reverend', 'Pastor', 'Ministry Head', 
    'Deputy Ministry Head', 'Executive', 'Branch Leader', 'Cell Leader'
  ];

  const filteredLeaders = leaders.filter(leader => {
    const fullName = `${leader.first_name || ''} ${leader.last_name || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
                          (leader.position || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (leader.ministry || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeCategory === 'All') return matchesSearch;
    return matchesSearch && leader.category === activeCategory;
  });

  const selectedLeader = leaders.find(l => l.id === selectedLeaderId);

  // Toggle selection
  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLeaderIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Compile CSV
  const handleExportCSV = () => {
    const listToExport = selectedLeaderIds.length > 0 
      ? leaders.filter(l => selectedLeaderIds.includes(l.id))
      : filteredLeaders;

    if (listToExport.length === 0) {
      toast.error("No leaders available to export");
      return;
    }

    const headers = ["First Name", "Last Name", "Rank", "Title", "Ministry", "Email", "Phone", "Branch", "Status", "Appointment Date"];
    const rows = listToExport.map(l => [
      l.first_name,
      l.last_name,
      l.category,
      l.position,
      l.ministry || 'General',
      l.email || '',
      l.phone || '',
      l.branch || 'Main Branch',
      l.status || 'Active',
      l.appointment_date || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Faithhouse_Church_Leaders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${listToExport.length} leaders as CSV`);
  };

  const handlePromoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaderId || !promotionDetails) {
      toast.error("Please add administrative remarks");
      return;
    }
    try {
      await onPromoteLeader(selectedLeaderId, promotionRank, promotionDetails);
      setPromotionDetails('');
      setActiveActionTab('history');
    } catch (err) {}
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaderId || !transferBranchName || !transferDetails) {
      toast.error("Please fill in branch details and remarks");
      return;
    }
    try {
      await onTransferBranch(selectedLeaderId, transferBranchName, transferDetails);
      setTransferBranchName('');
      setTransferDetails('');
      setActiveActionTab('history');
    } catch (err) {}
  };

  return (
    <div className="space-y-6">
      {/* Search and category filters */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-center bg-slate-100/40 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800">
        <div className="flex flex-wrap gap-1.5 justify-center">
          {['All', ...rawRanks].map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                activeCategory === cat 
                  ? 'bg-fh-green text-fh-gold shadow-md' 
                  : `text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300`
              }`}
            >
              {cat === 'All' ? 'All Roles' : `${cat}s`}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center w-full xl:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name, dept..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-3 w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-xs font-bold outline-none shadow-sm focus:ring-2 focus:ring-fh-green/20"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                setSelectedLeaderIds([]);
              }}
              className={`flex-1 sm:flex-none p-3 rounded-2xl font-black uppercase text-[10px] tracking-widest border transition-all flex items-center justify-center gap-2 ${
                isSelectMode 
                  ? 'bg-indigo-600 border-indigo-600 text-white' 
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'
              }`}
            >
              <CheckSquare className="w-5 h-5 animate-pulse" />
              <span>{isSelectMode ? 'Selecting' : 'Bulk Select'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex-1 sm:flex-none p-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Grid listing and Profile preview side panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-10">
        
        {/* Registry Leaders Grid */}
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 select-none">
          {filteredLeaders.length > 0 ? filteredLeaders.map(leader => (
            <div
              key={leader.id}
              onClick={() => {
                setSelectedLeaderId(leader.id);
                setActiveActionTab('details');
              }}
              className={`rounded-[2rem] p-6 border shadow-sm relative overflow-hidden group cursor-pointer transition-all ${
                selectedLeaderId === leader.id
                  ? 'border-fh-gold ring-2 ring-fh-gold/45 bg-indigo-50/10 dark:bg-slate-900/60'
                  : isDark
                    ? 'bg-slate-900 border-slate-850 hover:bg-slate-850'
                    : 'bg-white border-slate-105 hover:shadow-lg hover:-translate-y-1'
              }`}
            >
              {/* Checkbox overlay for select mode */}
              {isSelectMode && (
                <div 
                  onClick={(e) => handleToggleSelect(leader.id, e)}
                  className={`absolute top-5 right-5 w-6 h-6 rounded-lg border-2 z-15 flex items-center justify-center transition-all ${
                    selectedLeaderIds.includes(leader.id)
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950'
                  }`}
                >
                  {selectedLeaderIds.includes(leader.id) && <CheckSquare className="w-4 h-4" />}
                </div>
              )}

              <div className="flex gap-4 items-start relative z-10">
                {leader.image_url ? (
                  <img src={leader.image_url} alt="" className="w-16 h-16 rounded-2xl object-cover border shadow-sm" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-slate-950 text-fh-gold font-black flex items-center justify-center text-xl shadow-md border-b-2 border-fh-gold/20">
                    {leader.first_name[0]}{leader.last_name[0]}
                  </div>
                )}

                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                      leader.category === 'Bishop' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20' :
                      leader.category === 'Reverend' ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/20' :
                      leader.category === 'Pastor' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20' :
                      'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20'
                    }`}>
                      {leader.category}
                    </span>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                      leader.status === 'Active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {leader.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">
                    {leader.first_name} {leader.last_name}
                  </h4>
                  <p className="text-[10px] font-extrabold text-fh-green uppercase tracking-wide truncate">
                    {leader.position}
                  </p>
                </div>
              </div>

              {/* Quick details */}
              <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-between items-center text-[10px] font-medium text-slate-400">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate max-w-28">{leader.branch || 'Main Branch'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span className="truncate max-w-28">{leader.ministry || 'General'}</span>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-205 dark:border-slate-800 text-center text-slate-400">
              <ShieldAlert className="w-12 h-12 mx-auto mb-3 animate-pulse text-amber-500" />
              <p className="text-xs font-black uppercase tracking-wider">No church leaders found matching criteria</p>
            </div>
          )}
        </div>

        {/* Selected Leader dossiers or details */}
        <div>
          {selectedLeader ? (
            <div className={`p-8 rounded-[2.5rem] border shadow-sm sticky top-6 space-y-6 ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
            }`}>
              
              {/* Profile card summary */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-950 text-fh-gold flex items-center justify-center font-black text-lg">
                    {selectedLeader.first_name[0]}{selectedLeader.last_name[0]}
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight truncate max-w-32">{selectedLeader.first_name} {selectedLeader.last_name}</h3>
                    <p className="text-[8px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-indigo-600">{selectedLeader.category}</p>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => onOpenAppointModal(selectedLeader)}
                    className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-500"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteLeader(selectedLeader.id)}
                    className="p-2 border border-rose-205 rounded-xl hover:bg-rose-50 hover:text-rose-600 text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Profile actions Navigation tabs */}
              <div className="flex border-b border-slate-100 dark:border-slate-800 justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                <button
                  onClick={() => setActiveActionTab('details')}
                  className={`pb-2 transition-all ${activeActionTab === 'details' ? 'border-b-2 border-fh-gold text-slate-900 dark:text-white' : ''}`}
                >
                  Dossier
                </button>
                <button
                  onClick={() => setActiveActionTab('promote')}
                  className={`pb-2 transition-all ${activeActionTab === 'promote' ? 'border-b-2 border-fh-gold text-slate-900 dark:text-white' : ''}`}
                >
                  Promote
                </button>
                <button
                  onClick={() => setActiveActionTab('transfer')}
                  className={`pb-2 transition-all ${activeActionTab === 'transfer' ? 'border-b-2 border-fh-gold text-slate-900 dark:text-white' : ''}`}
                >
                  Transfer
                </button>
                <button
                  onClick={() => setActiveActionTab('history')}
                  className={`pb-2 transition-all ${activeActionTab === 'history' ? 'border-b-2 border-fh-gold text-slate-900 dark:text-white' : ''}`}
                >
                  History
                </button>
              </div>

              {/* Render dynamic tabs within detail side panels */}
              {activeActionTab === 'details' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-105 dark:border-slate-850">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Appointment Date</p>
                      <p className="font-bold">{selectedLeader.appointment_date || 'N/A'}</p>
                    </div>
                    <div className="space-y-1 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-105 dark:border-slate-850">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ordination Date</p>
                      <p className="font-bold">{selectedLeader.ordination_date || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 text-xs">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{selectedLeader.email || 'No email registered'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{selectedLeader.phone || 'No phone registered'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-600 dark:text-slate-300">Oversight Branch: <strong className="text-slate-900 dark:text-white">{selectedLeader.branch || 'Main Branch'}</strong></span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-600 dark:text-slate-300">Sector Ministry: <strong className="text-slate-900 dark:text-white">{selectedLeader.ministry || 'General Oversight'}</strong></span>
                    </div>
                  </div>

                  {selectedLeader.notes && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-1">
                      <p className="text-[8px] font-black uppercase text-slate-400">Administrative Remarks</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 italic">"{selectedLeader.notes}"</p>
                    </div>
                  )}
                </div>
              ) : activeActionTab === 'promote' ? (
                <form onSubmit={handlePromoteSubmit} className="space-y-4">
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-[10px] text-amber-700 dark:text-amber-400 rounded-2xl leading-relaxed flex items-start gap-2 border border-amber-200">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Promotions upgrade the standard hierarchy rank. This overrides their authority bracket. Make sure the Bishop approved.</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Promote / Demote To Rank</label>
                    <select
                      value={promotionRank}
                      onChange={(e) => setPromotionRank(e.target.value as LeadershipRank)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                    >
                      {rawRanks.map(rank => <option key={rank} value={rank}>{rank}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Administrative promotion details</label>
                    <textarea
                      placeholder="e.g. Appointed as Regional Overseer for Central Belt due to exceptional growth"
                      value={promotionDetails}
                      onChange={(e) => setPromotionDetails(e.target.value)}
                      required
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-4 text-xs font-medium outline-none min-h-[100px]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-md"
                  >
                    Confirm Authority Promotion
                  </button>
                </form>
              ) : activeActionTab === 'transfer' ? (
                <form onSubmit={handleTransferSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Transfer to Branch</label>
                    <input
                      type="text"
                      placeholder="e.g. Accra City Chapel, Kumasi Sanctuary"
                      value={transferBranchName}
                      onChange={(e) => setTransferBranchName(e.target.value)}
                      required
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Transfer action details</label>
                    <textarea
                      placeholder="e.g. Transferred for pastoral support duties starting June 1st"
                      value={transferDetails}
                      onChange={(e) => setTransferDetails(e.target.value)}
                      required
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-4 text-xs font-medium outline-none min-h-[120px]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-md"
                  >
                    Authorize Branch Transfer
                  </button>
                </form>
              ) : (
                <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                  {selectedLeader.leadership_history && selectedLeader.leadership_history.length > 0 ? (
                    selectedLeader.leadership_history.map((log: LeadershipHistoryItem) => (
                      <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-105 rounded-xl space-y-1 text-xs">
                        <div className="flex justify-between items-center text-[8px] font-black uppercase">
                          <span className={`${
                            log.action === 'Promotion' ? 'text-indigo-600' :
                            log.action === 'Transfer' ? 'text-emerald-500' : 'text-slate-400'
                          }`}>{log.action}</span>
                          <span>{log.date}</span>
                        </div>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">{log.details}</p>
                        <p className="text-[8px] italic text-slate-400">By: {log.performed_by}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 italic text-slate-400 text-xs">
                      No historical logs recorded. New events populated during Promotions, Demotions, or Branch Transfers appear here.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-205 dark:border-slate-800 text-slate-400 min-h-[300px]">
              <Layout className="w-12 h-12 text-slate-300 dark:text-slate-650 mb-3 rotate-6" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Registry Inspector</p>
              <p className="text-xs text-slate-400 mt-2 max-w-xs font-medium">Click on any leader card to open their personnel file, execute safe promotions, transfer branches, or check history logs.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
