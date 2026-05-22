import React, { useState } from 'react';
import { 
  Send, Users, Mail, Phone, Bell, CheckSquare, 
  Clock, ShieldCheck, Volume2, Globe, AlertCircle, FileText
} from 'lucide-react';
import { LeadershipRank, LeadershipAnnouncement } from './types';
import { toast } from 'sonner';

interface LeadershipCommHubProps {
  announcements: LeadershipAnnouncement[];
  onSendAnnouncement: (announce: Omit<LeadershipAnnouncement, 'id' | 'sentAt'>) => Promise<void>;
  isDark: boolean;
}

export const LeadershipCommHub: React.FC<LeadershipCommHubProps> = ({
  announcements,
  onSendAnnouncement,
  isDark
}) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetGroup, setTargetGroup] = useState<string>('All Ranks');
  const [channelType, setChannelType] = useState<'Email' | 'WhatsApp' | 'SMS' | 'Notice'>('Email');
  const [isSending, setIsSending] = useState(false);

  const filterGroups = [
    'All Ranks',
    'Bishops & Reverends',
    'All Pastors',
    'All Ministry Heads',
    'Executives Only',
    'Branch Leaders Only',
    'Cell Leaders Only'
  ];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      toast.error("Please fill in both title and brief message contents");
      return;
    }

    setIsSending(true);
    
    // Animate broadcast transmission nicely
    setTimeout(async () => {
      try {
        await onSendAnnouncement({
          title,
          message: `[Channel: ${channelType}] ${message}`,
          targetGroup,
          sender: 'Bishop Office (Governance Council)'
        });
        toast.success(`Broadcast sent via ${channelType} to ${targetGroup}!`);
        setTitle('');
        setMessage('');
      } catch (err) {
        toast.error("Error sending message");
      } finally {
        setIsSending(false);
      }
    }, 1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Broadcast Constructor Form */}
      <div className={`lg:col-span-2 p-8 rounded-[2.5rem] border shadow-sm ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-105 text-slate-900'
      }`}>
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight">Governance Broadcast Center</h3>
            <p className="text-xs text-slate-400 mt-1">Designated for official decrees, meeting guidelines, and ordinations</p>
          </div>
          <span className="p-2.5 bg-fh-green/10 text-fh-green rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-fh-gold" /> Bishop Channel
          </span>
        </div>

        <form onSubmit={handleSend} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Target Audience SELECT */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Target Audience</label>
              <select
                value={targetGroup}
                onChange={(e) => setTargetGroup(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl px-5 py-4 text-xs font-bold outline-none cursor-pointer"
              >
                {filterGroups.map(grp => <option key={grp} value={grp}>{grp}</option>)}
              </select>
            </div>

            {/* Notification Media channel */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Transmission Channel</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'Email', icon: <Mail className="w-4 h-4" />, label: 'Email' },
                  { id: 'WhatsApp', icon: <Phone className="w-4 h-4 text-emerald-500" />, label: 'WhatsApp' },
                  { id: 'SMS', icon: <Volume2 className="w-4 h-4 text-blue-500" />, label: 'SMS' },
                  { id: 'Notice', icon: <Bell className="w-4 h-4 text-amber-500" />, label: 'In-App' }
                ].map(ch => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setChannelType(ch.id as any)}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                      channelType === ch.id 
                        ? 'border-fh-green bg-indigo-50/10 dark:bg-indigo-950/25 ring-2 ring-fh-gold/45 text-slate-950 dark:text-white' 
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {ch.icon}
                    <span className="text-[8px] font-bold uppercase">{ch.label}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Decree / Subject Title</label>
            <input
              type="text"
              placeholder="e.g. Mandatory Joint Council Presbytery Meeting: General Assembly Governance"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl px-5 py-4 text-xs font-bold outline-none shadow-inner"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Circular Message Body</label>
            <textarea
              placeholder="Dear Beloved Officers of Faithhouse Chapel, by ministerial appointment of the Bishop Office, you are requested to attend a critical strategy session on..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl p-5 text-xs font-medium outline-none shadow-inner min-h-[160px]"
            />
          </div>

          <button
            type="submit"
            disabled={isSending}
            className="w-full py-5 bg-fh-green text-fh-gold font-black uppercase text-xs tracking-widest rounded-2xl shadow-2xl transition-all border-b-4 border-black/30 hover:bg-slate-950 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isSending ? (
              <>
                <Clock className="w-4 h-4 animate-spin text-fh-gold" />
                <span>Transmitting Broadcast...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Broadcast Update to Leaders</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Communications Feed */}
      <div className={`p-8 rounded-[2.5rem] border shadow-sm ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-105 text-slate-900'
      }`}>
        <h3 className="text-sm font-black uppercase tracking-wider mb-6 flex items-center gap-1.5">
          <Globe className="w-4 h-4 text-fh-green animate-pulse" /> Announcement Logs
        </h3>

        <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
          {announcements.length > 0 ? announcements.map(anc => (
            <div key={anc.id} className={`p-4 rounded-xl border space-y-2 transition-all ${
              isDark ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-50 border-slate-105'
            }`}>
              <div className="flex justify-between items-start">
                <span className="text-[8px] font-black bg-fh-green/10 text-fh-green px-2 py-0.5 rounded uppercase">
                  To: {anc.targetGroup}
                </span>
                <span className="text-[8px] text-slate-400 font-bold">{anc.sentAt}</span>
              </div>
              <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white leading-snug">
                {anc.title}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                {anc.message}
              </p>
              <div className="text-[8px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                Authorized: {anc.sender}
              </div>
            </div>
          )) : (
            <div className="text-center py-12 italic text-slate-400 text-xs font-bold uppercase">
              No general broadcasts transmitted yet.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
