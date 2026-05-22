import React, { useState } from 'react';
import { X, Award, Save, Clock, Star, UserPlus, Briefcase, HelpCircle, Users } from 'lucide-react';
import { Leader, LeadershipRank } from './types';
import { toast } from 'sonner';

interface LeadershipModalsProps {
  isLeaderModalOpen: boolean;
  onCloseLeaderModal: () => void;
  editingLeader: Partial<Leader> | null;
  leadersList: Leader[];
  onLeaderSave: (e: React.FormEvent) => Promise<void>;
  
  // Appraisals (Safe dummy hooks to maintain view compatibility)
  isAppraisalModalOpen?: boolean;
  onCloseAppraisalModal?: () => void;
  appraisalForm?: any;
  setAppraisalForm?: (form: any) => void;
  onAppraisalSubmit?: (e: React.FormEvent) => Promise<void>;
  
  // Pipeline
  isPipelineModalOpen: boolean;
  onClosePipelineModal: () => void;
  pipelineForm: any;
  setPipelineForm: (form: any) => void;
  onPipelineSubmit: (e: React.FormEvent) => Promise<void>;
  members: any[];
  
  isSubmitting: boolean;
  isDark: boolean;
}

export const LeadershipModals: React.FC<LeadershipModalsProps> = ({
  isLeaderModalOpen,
  onCloseLeaderModal,
  editingLeader,
  leadersList,
  onLeaderSave,
  
  isAppraisalModalOpen = false,
  onCloseAppraisalModal = () => {},
  appraisalForm,
  setAppraisalForm,
  onAppraisalSubmit,

  isPipelineModalOpen,
  onClosePipelineModal,
  pipelineForm,
  setPipelineForm,
  onPipelineSubmit,
  members,

  isSubmitting,
  isDark
}) => {
  const ranks: LeadershipRank[] = [
    'Bishop', 'Reverend', 'Pastor', 'Ministry Head', 
    'Deputy Ministry Head', 'Executive', 'Branch Leader', 'Cell Leader'
  ];

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  React.useEffect(() => {
    if (isLeaderModalOpen) {
      setFirstName(editingLeader?.first_name || '');
      setLastName(editingLeader?.last_name || '');
      setEmail(editingLeader?.email || '');
      setPhone(editingLeader?.phone || '');
    }
  }, [editingLeader, isLeaderModalOpen]);

  return (
    <>
      {/* Appointment & Leader edit modal */}
      {isLeaderModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onCloseLeaderModal} />
          <div className={`relative w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden border-b-[16px] border-fh-gold ${
            isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
          }`}>
            <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/30">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-fh-green text-fh-gold rounded-2xl flex items-center justify-center shadow-lg">
                  <Award className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">{editingLeader?.id ? 'Edit Leader Status' : 'Appoint New Leader'}</h3>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Ministerial & Leadership Registry</p>
                </div>
              </div>
              <button onClick={onCloseLeaderModal} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={onLeaderSave} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto w-full">
              {!editingLeader?.id && (
                <div className="bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100/30 p-5 rounded-2xl space-y-3.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-fh-green dark:text-fh-gold uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-fh-green" /> Select & Pre-fill From Church Members Directory
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        onCloseLeaderModal();
                        window.dispatchEvent(new CustomEvent('navigate', { detail: 'Members' }));
                      }}
                      className="text-[9px] font-bold text-fh-green hover:underline flex items-center gap-1 uppercase tracking-wide"
                    >
                      Open Members Module ➜
                    </button>
                  </div>
                  <select
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (!selectedId) return;
                      const member = members.find(m => m.id === selectedId);
                      if (member) {
                        setFirstName(member.first_name || '');
                        setLastName(member.last_name || '');
                        setEmail(member.email || '');
                        setPhone(member.phone || '');
                        toast.success(`Prefilled ${member.first_name} ${member.last_name}`);
                      }
                    }}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="">Select a member to auto-populate form...</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.first_name} {m.last_name} ({m.phone || 'No Phone'})
                      </option>
                    ))}
                  </select>
                  <p className="text-[8.5px] text-slate-400 font-semibold font-sans">
                    Leaders are selected from the Church Members directory. Selecting a member above will fetch and populate their records instantaneously.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">First Name *</label>
                  <input name="first_name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-5 py-3 text-xs font-bold outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Last Name *</label>
                  <input name="last_name" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-5 py-3 text-xs font-bold outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Hierarchy Rank Level *</label>
                  <select name="category" defaultValue={editingLeader?.category || 'Cell Leader'} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-5 py-3 text-xs font-bold outline-none" required>
                    {ranks.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Church Title / Role *</label>
                  <input name="position" defaultValue={editingLeader?.position} placeholder="e.g. Presiding Elder, General Overseer" required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-5 py-3 text-xs font-bold outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Email</label>
                  <input name="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-5 py-3 text-xs font-bold outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Phone</label>
                  <input name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-5 py-3 text-xs font-bold outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Assign Sector Ministry</label>
                  <input name="ministry" defaultValue={editingLeader?.ministry} placeholder="e.g. Prayer Ministry, Youth Ministry" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-5 py-3 text-xs font-bold outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Oversight Branch *</label>
                  <input name="branch" defaultValue={editingLeader?.branch || 'Main Branch'} placeholder="e.g. Accra City Chapel" required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-5 py-3 text-xs font-bold outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Appointment Date</label>
                  <input name="appointment_date" type="date" defaultValue={editingLeader?.appointment_date || new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-5 py-3 text-xs font-bold outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Ordination Date (Optional)</label>
                  <input name="ordination_date" type="date" defaultValue={editingLeader?.ordination_date || ''} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-5 py-3 text-xs font-bold outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Status Duty</label>
                  <select name="status" defaultValue={editingLeader?.status || 'Active'} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-5 py-3 text-xs font-bold outline-none">
                    <option value="Active">Active Duty</option>
                    <option value="On Leave">On Leave / Sabbatical</option>
                    <option value="Retired">Retired / Emeritus</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Reports To Supervisor</label>
                  <select name="reports_to_id" defaultValue={editingLeader?.reports_to_id || ''} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-5 py-3 text-xs font-bold outline-none select-none">
                    <option value="">Apostle (None)</option>
                    {leadersList
                      .filter(l => l.id !== editingLeader?.id && l.category !== 'Cell Leader')
                      .map(l => (
                        <option key={l.id} value={l.id}>
                          [{l.category}] {l.first_name} {l.last_name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Administrative Remarks / Notes</label>
                <textarea name="notes" defaultValue={editingLeader?.notes || ''} placeholder="Add administrative details or background remarks regarding this leader's calling..." className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-4 text-xs font-medium outline-none min-h-[90px]" />
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                <button type="button" onClick={onCloseLeaderModal} className="flex-1 py-4.5 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] bg-fh-green text-fh-gold py-4.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl border-b-4 border-black/30 flex items-center justify-center gap-2">
                  {isSubmitting ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{editingLeader?.id ? 'Update Record' : 'Confirm Appointment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Leadership pipeline modal */}
      {isPipelineModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClosePipelineModal} />
          <div className={`relative w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border-b-[12px] border-fh-gold ${
            isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
          }`}>
            <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-fh-green text-fh-gold rounded-xl flex items-center justify-center shadow-md"><UserPlus className="w-6 h-6" /></div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Nurture Future Leaders</h3>
                  <p className="text-[9px] text-slate-405 uppercase font-medium mt-1">Leadership Pipeline Academy</p>
                </div>
              </div>
              <button onClick={onClosePipelineModal} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={onPipelineSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Select Candidate Member *</label>
                <select value={pipelineForm.member_id} onChange={(e) => setPipelineForm({...pipelineForm, member_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-850 rounded-xl outline-none text-xs font-bold" required>
                  <option value="">Select Candidate...</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Pipeline Entry Level *</label>
                  <select value={pipelineForm.current_level} onChange={(e) => setPipelineForm({...pipelineForm, current_level: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-850 rounded-xl outline-none text-xs font-black">
                    <option value="Discipleship">Discipleship level</option>
                    <option value="Leadership School">School of Ministry</option>
                    <option value="Minister in Training">Ministerial Ordination track</option>
                    <option value="Ministry Lead">Executive Leadership tier</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Progression Completion (%)</label>
                  <input type="number" min="0" max="100" value={pipelineForm.progress_percentage} onChange={(e) => setPipelineForm({...pipelineForm, progress_percentage: parseInt(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-850 rounded-xl outline-none text-xs font-bold" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Mentor Evaluation Remarks</label>
                <textarea value={pipelineForm.notes} onChange={(e) => setPipelineForm({...pipelineForm, notes: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-medium outline-none min-h-[100px]" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="submit" disabled={isSubmitting} className="px-8 py-3 bg-fh-green text-fh-gold rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2">
                  {isSubmitting ? <Clock className="w-4 h-4 animate-spin text-fh-gold" /> : <Save className="w-4 h-4" />}
                  Add to Pipeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
