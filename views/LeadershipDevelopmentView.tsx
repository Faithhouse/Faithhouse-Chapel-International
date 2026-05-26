import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { 
  UserProfile, Ministry, MinistryMember, MinistryAttendance, 
  MinisterialAppraisal, LeadershipPipeline, Member 
} from '../types';
import { toast } from 'sonner';
import { 
  Award, Users, Star, Search, Plus, GraduationCap, 
  Layout, Bell, HelpCircle, Save, X, RefreshCw, Sun, Moon, 
  Terminal, ShieldCheck, Mail, Briefcase, Activity, Play, Settings,
  Trash2, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Imports from our modular leadership sub-views
import { Leader, LeadershipRank, LeadershipAuditLog, LeadershipAnnouncement, LeadershipHistoryItem } from './leadership/types';
import { LeadershipDashboard } from './leadership/LeadershipDashboard';
import { LeadershipTree } from './leadership/LeadershipTree';
import { LeadershipRegistry } from './leadership/LeadershipRegistry';
import { LeadershipCommHub } from './leadership/LeadershipCommHub';
import { LeadershipModals } from './leadership/LeadershipModals';
import { LeadershipReports } from './leadership/LeadershipReports';

interface LeadershipDevelopmentViewProps {
  currentUser: UserProfile | null;
}

const LeadershipDevelopmentView: React.FC<LeadershipDevelopmentViewProps> = ({ currentUser }) => {
  // Tabs: Dashboard | Registry | Tree | Communications | Pipeline | Reports
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Registry' | 'Tree' | 'Communications' | 'Pipeline' | 'Reports'>('Dashboard');
  
  // Localized Light Mode / Dark Mode toggle
  const [isDark, setIsDark] = useState<boolean>(false); // default to clean light mode (white)

  // States
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [pipeline, setPipeline] = useState<LeadershipPipeline[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);

  // Ministries management states
  const [ministryItems, setMinistryItems] = useState<Ministry[]>([]);
  const [ministryMembers, setMinistryMembers] = useState<MinistryMember[]>([]);
  const [ministryAttendance, setMinistryAttendance] = useState<MinistryAttendance[]>([]);
  const [selectedMinistryId, setSelectedMinistryId] = useState<string | null>(null);

  // Logs and announcements local reactive state
  const [auditLogs, setAuditLogs] = useState<LeadershipAuditLog[]>([]);
  const [announcements, setAnnouncements] = useState<LeadershipAnnouncement[]>([]);

  // Modals toggles
  const [isLeaderModalOpen, setIsLeaderModalOpen] = useState(false);
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);
  const [isMinistryModalOpen, setIsMinistryModalOpen] = useState(false);
  const [isMinistryMemberModalOpen, setIsMinistryMemberModalOpen] = useState(false);

  const [editingLeader, setEditingLeader] = useState<Partial<Leader> | null>(null);

  const [pipelineForm, setPipelineForm] = useState({
    member_id: '',
    current_level: 'Discipleship',
    progress_percentage: 10,
    notes: '',
    status: 'Active'
  });

  const [ministryForm, setMinistryForm] = useState<Partial<Ministry>>({
    name: '',
    ministry: '',
    leader_id: '',
    deputy_id: '',
    description: '',
    meeting_day: 'Sunday',
    status: 'Active',
    color: '#10b981'
  });

  const [ministryMemberForm, setMinistryMemberForm] = useState({
    member_id: '',
    role: 'Ministry Worker',
    status: 'Active' as const
  });

  // Reference SQL String for Manual Query Tool or Diagnostic reference
  const manualMigrationSQL = `
    -- Execute this migration script inside your Supabase SQL Editor to configure columns and tables
    -- Path: /supabase/migrations/20260522000000_leadership_fixes.sql
    
    ALTER TABLE public.leadership DROP CONSTRAINT IF EXISTS leadership_category_check;
    
    ALTER TABLE public.leadership ADD COLUMN IF NOT EXISTS reports_to_id UUID;
    ALTER TABLE public.leadership ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Main Branch';
    ALTER TABLE public.leadership ADD COLUMN IF NOT EXISTS appointment_date DATE DEFAULT CURRENT_DATE;
    ALTER TABLE public.leadership ADD COLUMN IF NOT EXISTS ordination_date DATE;
    ALTER TABLE public.leadership ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
    ALTER TABLE public.leadership ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE public.leadership ADD COLUMN IF NOT EXISTS leadership_history JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.leadership ADD COLUMN IF NOT EXISTS ministry TEXT;
    ALTER TABLE public.leadership ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE public.leadership ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE public.leadership ADD COLUMN IF NOT EXISTS image_url TEXT;
  `;

  // Helper to log audit trails inside Supabase DB with verbose error logging
  const logAuditTrail = async (action: string, target: string, rank: string) => {
    const actorName = currentUser?.full_name || 'Bishop Administrator';
    const newLog: Omit<LeadershipAuditLog, 'id' | 'timestamp'> = {
      actor: actorName,
      action,
      target,
      rank
    };

    console.log("Supabase Audit Log - Attempting to persist:", JSON.stringify(newLog, null, 2));

    try {
      const { data, error } = await supabase.from('leadership_audit_logs').insert([newLog]).select();
      if (error) {
        console.error("Supabase Audit Log DB Error Object:", error);
        throw error;
      }
      if (data && data[0]) {
        console.log("Supabase Audit Log - Successfully persisted:", data[0]);
        setAuditLogs(prev => [data[0], ...prev]);
      }
    } catch (err: any) {
      console.error("Audit log persistence failed. Error context details:", err);
      // Local runtime list log fallback for session tracking
      const tempLog: LeadershipAuditLog = {
        id: Math.random().toString(),
        timestamp: new Date().toISOString(),
        actor: actorName,
        action,
        target,
        rank
      };
      setAuditLogs(prev => [tempLog, ...prev]);
    }
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    let hasTableMissingError = false;

    // 1. Fetch main leaders table
    try {
      const { data: leadData, error: lError } = await supabase
        .from('leadership')
        .select('*')
        .order('category');

      if (lError) {
        if (lError.code === '42P01' || lError.code === 'PGRST205' || lError.message?.includes('column')) {
          hasTableMissingError = true;
        } else {
          throw lError;
        }
      }

      let parsedLeaders: Leader[] = [];
      if (leadData && leadData.length > 0) {
        parsedLeaders = leadData.map((l: any) => ({
          id: l.id,
          first_name: l.first_name,
          last_name: l.last_name,
          position: l.position || 'Church Assistant',
          category: (l.category || 'Cell Leader') as LeadershipRank,
          ministry: l.ministry || l.department || 'General Council',
          email: l.email || '',
          phone: l.phone || '',
          image_url: l.image_url || null,
          reports_to_id: l.reports_to_id || null,
          branch: l.branch || 'Main Headquarters Branch',
          appointment_date: l.appointment_date || l.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          ordination_date: l.ordination_date || null,
          status: (l.status || 'Active') as any,
          notes: l.notes || '',
          leadership_history: Array.isArray(l.leadership_history) ? l.leadership_history : []
        }));
      } else {
        parsedLeaders = [];
      }
      setLeaders(parsedLeaders);
    } catch (err: any) {
      console.warn("Error loading leaders table:", err);
      setLeaders([]);
    }

    // 2. Fetch leadership pipeline
    try {
      const { data: pipeData, error: pipeError } = await supabase
        .from('leadership_pipeline')
        .select('*, members(*), mentor:mentor_id(full_name)')
        .order('updated_at', { ascending: false });
      
      if (pipeError) {
        if (pipeError.code === '42P01') hasTableMissingError = true;
        else throw pipeError;
      } else {
        setPipeline(pipeData || []);
      }
    } catch (err) {
      console.warn("Pipeline table missing or read failed:", err);
    }

    // 3. Fetch members (used for validation and selecting new leaders)
    try {
      const { data: memData } = await supabase
        .from('members')
        .select('*')
        .order('first_name');
      setMembers(memData || []);
    } catch (err) {
      console.warn("Members table read failed:", err);
    }

    // 4. Fetch ministries
    try {
      const { data: minData } = await supabase
        .from('ministries')
        .select('*, lead:leader_id(first_name, last_name, position), deputy:deputy_id(first_name, last_name, position)')
        .order('name');
      setMinistryItems(minData || []);
    } catch (err) {
      console.warn("Ministries table read failed:", err);
    }

    // 5. Fetch ministry members
    try {
      const { data: minMems } = await supabase.from('ministry_members').select('*');
      setMinistryMembers(minMems || []);
    } catch (err) {
      console.warn("Ministry members table read failed:", err);
    }

    // 6. Fetch ministry attendance
    try {
      const { data: minAtt } = await supabase.from('ministry_attendance').select('*').order('session_date', { ascending: false });
      setMinistryAttendance(minAtt || []);
    } catch (err) {
      console.warn("Ministry attendance table read failed:", err);
    }

    // 7. Fetch audit logs
    try {
      const { data: auditData, error: auditError } = await supabase
        .from('leadership_audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20);

      if (auditError) {
        if (auditError.code === '42P01') hasTableMissingError = true;
        else throw auditError;
      } else if (auditData) {
        setAuditLogs(auditData);
      }
    } catch (err) {
      console.warn("Audit logs table read failed:", err);
    }

    // 8. Fetch Announcements
    try {
      const { data: announcData, error: announcError } = await supabase
        .from('leadership_announcements')
        .select('*')
        .order('sent_at', { ascending: false });

      if (announcError) {
        if (announcError.code === '42P01') hasTableMissingError = true;
        else throw announcError;
      } else if (announcData) {
        setAnnouncements(announcData.map((a: any) => ({
          id: a.id,
          title: a.title,
          message: a.message,
          targetGroup: a.target_group,
          sentAt: new Date(a.sent_at).toLocaleDateString(),
          sender: a.sender
        })));
      }
    } catch (err) {
      console.warn("Announcements table read failed:", err);
    }

    if (hasTableMissingError) {
      setTableMissing(true);
    } else {
      setTableMissing(false);
    }
    setIsLoading(false);
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Appointment or Modify Save Handler
  const handleLeaderSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    
    // Construct database payload
    const payload = {
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      position: formData.get('position') as string,
      category: formData.get('category') as any,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      ministry: formData.get('ministry') as string,
      branch: formData.get('branch') as string,
      appointment_date: formData.get('appointment_date') as string,
      ordination_date: (formData.get('ordination_date') as string) || null,
      status: formData.get('status') as any,
      reports_to_id: (formData.get('reports_to_id') as string) || null,
      notes: formData.get('notes') as string,
      image_url: (formData.get('image_url') as string) || null
    };

    console.log("Supabase Leader Pre-Save Validate Payload:", JSON.stringify(payload, null, 2));

    try {
      if (editingLeader?.id) {
        // Appending to leadership history log
        const oldLeader = leaders.find(l => l.id === editingLeader.id);
        const updatedHistory = [...(oldLeader?.leadership_history || [])];
        if (oldLeader?.position !== payload.position || oldLeader?.category !== payload.category) {
          updatedHistory.push({
            id: Math.random().toString(),
            date: new Date().toISOString().split('T')[0],
            action: 'Promotion',
            details: `Authority title updated from [${oldLeader?.category} - ${oldLeader?.position}] to [${payload.category} - ${payload.position}]`,
            performed_by: currentUser?.full_name || 'Bishop Council'
          });
        }

        const { error } = await supabase
          .from('leadership')
          .update({ ...payload, leadership_history: updatedHistory })
          .eq('id', editingLeader.id);

        if (error) {
          console.error("Supabase Modify Error Object Detail:", error);
          throw error;
        }
        
        toast.success("Leader record modified successfully");
        await logAuditTrail("Modified Leadership Record for", `${payload.first_name} ${payload.last_name}`, "Full Admin Access");
      } else {
        // Creating first historical entry
        const seedHistory: LeadershipHistoryItem[] = [
          {
            id: Math.random().toString(),
            date: payload.appointment_date,
            action: 'Appointment',
            details: `Initially Appointed to duty as [${payload.category} - ${payload.position}] over ${payload.branch}`,
            performed_by: currentUser?.full_name || 'Bishop Council'
          }
        ];

        const { error } = await supabase
          .from('leadership')
          .insert([{ ...payload, leadership_history: seedHistory }]);

        if (error) {
          console.error("Supabase Save Error Object Detail:", error);
          throw error;
        }
        
        toast.success("New ministerial officer appointed successfully!");
        await logAuditTrail("Appointed & Ordained New Officer", `${payload.first_name} ${payload.last_name}`, "Bishop Council Access");
      }

      setIsLeaderModalOpen(false);
      setEditingLeader(null);
      fetchData();
    } catch (err: any) {
      console.error("Critical Supabase Persistence Save Error:", err);
      toast.error(`Database Save Error: ${err.message || JSON.stringify(err)}. Persistence failed.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLeader = async (id: string) => {
    if (!window.confirm("Verify: Are you sure you want to retire or delete this officer? This action will remove their nodes from the hierarchical authority structure!")) return;
    try {
      const targetOfficer = leaders.find(l => l.id === id);
      console.log("Supabase Delete Leader - ID and payload check before deletion:", id, targetOfficer);
      
      // Clean up direct subordinates pointing to this leader first to avoid foreign key violations
      await supabase.from('leadership').update({ reports_to_id: null }).eq('reports_to_id', id);
      
      const { error } = await supabase.from('leadership').delete().eq('id', id);
      if (error) {
        console.error("Supabase Delete Error Object Detail:", error);
        throw error;
      }
      toast.success("Officer record removed from active registry");
      await logAuditTrail("Removed / Deleted Officer", `${targetOfficer?.first_name} ${targetOfficer?.last_name}`, "Super-User");
      
      fetchData();
    } catch (err: any) {
      console.error("Critical Supabase Delete Error:", err);
      toast.error(`Database Delete Error: ${err.message || JSON.stringify(err)}. Deletion cancelled.`);
    }
  };

  // Promotion Executor Handlers
  const handlePromoteLeader = async (id: string, newRank: LeadershipRank, actionDetails: string) => {
    const leaderToPromote = leaders.find(l => l.id === id);
    if (!leaderToPromote) return;

    const oldRank = leaderToPromote.category;
    const oldTitle = leaderToPromote.position;

    const historyItem: LeadershipHistoryItem = {
      id: Math.random().toString(),
      date: new Date().toISOString().split('T')[0],
      action: 'Promotion',
      details: `PROMOTED from rank: [${oldRank} - ${oldTitle}] to rank [${newRank} - ${newRank} Minister]. Remarks: ${actionDetails}`,
      performed_by: currentUser?.full_name || 'Bishop Council Administration'
    };

    const updatedHistory = [...(leaderToPromote.leadership_history || []), historyItem];

    console.log("Supabase Promote Action parameters:", id, newRank, historyItem);

    try {
      const { error } = await supabase
          .from('leadership')
          .update({ 
            category: newRank,
            position: `${newRank} of Secretariat`,
            leadership_history: updatedHistory
          })
          .eq('id', id);

      if (error) {
        console.error("Supabase Promote Error Object Detail:", error);
        throw error;
      }
      
      toast.success(`Officer promoted to ${newRank}!`);
      await logAuditTrail("Promoted Church Officer", `${leaderToPromote.first_name} ${leaderToPromote.last_name} to ${newRank}`, "Bishop Governance");
      fetchData();
    } catch (err: any) {
      console.error("Critical Supabase Promotion Error:", err);
      toast.error(`Database Promote Error: ${err.message || JSON.stringify(err)}`);
    }
  };

  // Branch Transfer Executor Handlers
  const handleTransferBranch = async (id: string, newBranch: string, actionDetails: string) => {
    const leaderToTransfer = leaders.find(l => l.id === id);
    if (!leaderToTransfer) return;

    const oldBranch = leaderToTransfer.branch || 'Main Branch';

    const historyItem: LeadershipHistoryItem = {
      id: Math.random().toString(),
      date: new Date().toISOString().split('T')[0],
      action: 'Transfer',
      details: `TRANSFERRED oversight branch from [${oldBranch}] to [${newBranch}]. Reason/Remarks: ${actionDetails}`,
      performed_by: currentUser?.full_name || 'Bishop Council Administration'
    };

    const updatedHistory = [...(leaderToTransfer.leadership_history || []), historyItem];

    console.log("Supabase Transfer oversight parameters:", id, newBranch, historyItem);

    try {
      const { error } = await supabase
          .from('leadership')
          .update({
            branch: newBranch,
            leadership_history: updatedHistory
          })
          .eq('id', id);

      if (error) {
        console.error("Supabase Transfer Error Object Detail:", error);
        throw error;
      }
      toast.success(`Oversight branch successfully transferred to ${newBranch}`);
      await logAuditTrail("Transferred Oversight Branch for", `${leaderToTransfer.first_name} ${leaderToTransfer.last_name}`, "Bishop Office Council");
      fetchData();
    } catch (err: any) {
      console.error("Critical Supabase Transfer Error:", err);
      toast.error(`Database Transfer Error: ${err.message || JSON.stringify(err)}`);
    }
  };

  // Immediate Reporting line re-assignment right within Hierarchy Tree
  const handleUpdateSupervisor = async (leaderId: string, supervisorId: string | undefined) => {
    console.log("Supabase supervisor update:", leaderId, supervisorId);
    try {
      const { error } = await supabase
          .from('leadership')
          .update({ reports_to_id: supervisorId || null })
          .eq('id', leaderId);

      if (error) {
        console.error("Supabase Supervisor Update Error Object Detail:", error);
        throw error;
      }
      toast.success("Immediate reporting structures reassigned successfully");
      fetchData();
    } catch (err: any) {
      console.error("Critical Supabase Supervisor Update Error:", err);
      toast.error(`Database Supervisor Error: ${err.message || JSON.stringify(err)}`);
    }
  };

  // Reset / Delete All Leaders for Fresh Cycle Handler
  const handleClearAllLeaders = async () => {
    if (!window.confirm("CRITICAL RESET WARNING: This will permanently delete ALL active leader appointments to start a brand new ecclesiastical cycle! Are you absolutely sure of this action?")) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('leadership').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        console.error("Supabase Clear All Leaders Error Object Detail:", error);
        throw error;
      }
      toast.success("All leader appointments deleted successfully.");
      await logAuditTrail("Cleared All Appointed Leaders", "Global Registry Reset", "Bishop Super Access");
      setLeaders([]);
    } catch (err: any) {
      console.error("Critical Supabase Clear Error:", err);
      toast.error(`Database Clean Error: ${err.message || JSON.stringify(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pipeline Form Submit Hook
  const handlePipelineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    console.log("Supabase Pipeline insert check:", JSON.stringify(pipelineForm, null, 2));
    try {
      const { error } = await supabase.from('leadership_pipeline').insert([pipelineForm]);
      if (error) {
        console.error("Supabase Pipeline insertion error:", error);
        throw error;
      }
      toast.success("Candidate added to training pipeline!");
      setIsPipelineModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error("Critical Supabase Pipeline Submit Error:", err);
      toast.error(`Pipeline Database Insert Error: ${err.message || JSON.stringify(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action broadcast helper for targeted subgroups
  const handleSendAnnouncement = async (announce: Omit<LeadershipAnnouncement, 'id' | 'sentAt'>) => {
    console.log("Supabase Announcement insert parameters:", announce);
    try {
      const { data, error } = await supabase
        .from('leadership_announcements')
        .insert([{
          title: announce.title,
          message: announce.message,
          target_group: announce.targetGroup,
          sender: announce.sender
        }])
        .select();

      if (error) {
        console.error("Supabase Announcement Insertion Error:", error);
        throw error;
      }
      if (data && data[0]) {
        toast.success("Circular message broadcasted successfully!");
        setAnnouncements(prev => [{
          id: data[0].id,
          title: data[0].title,
          message: data[0].message,
          targetGroup: data[0].target_group,
          sentAt: new Date(data[0].sent_at).toLocaleDateString(),
          sender: data[0].sender
        }, ...prev]);
      }
    } catch (err: any) {
      console.error("Critical Supabase Announcement Send Error:", err);
      toast.error(`Database Announcement Error: ${err.message || JSON.stringify(err)}`);
    }
  };

  const handlePipelineMove = async (id: string, newLevel: string) => {
    console.log("Supabase Pipeline transition update:", id, newLevel);
    try {
      const { error } = await supabase.from('leadership_pipeline').update({ current_level: newLevel, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) {
        console.error("Supabase Pipeline Transition Error Object Detail:", error);
        throw error;
      }
      toast.success(`Candidate advanced to ${newLevel}`);
      fetchData();
    } catch (err: any) {
      console.error("Critical Supabase Pipeline Move Error:", err);
      toast.error(`Database Candidate Advanced Error: ${err.message || JSON.stringify(err)}`);
    }
  };

  // Table missing fallback screen rendering containing strict manual execution instructions
  if (tableMissing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-rose-100 dark:border-rose-900/30">
          <ShieldCheck className="w-10 h-10 animate-wiggle" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-2">Leadership Administration DB Setup Needed</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8 font-medium">Please execute the migrations script inside your Supabase SQL Editor. The file location is <code>/supabase/migrations/20260522000000_leadership_fixes.sql</code>.</p>
        <div className="w-full max-w-2xl bg-slate-900 dark:bg-slate-900 shadow-2xl rounded-2xl p-6 mb-8 text-left overflow-x-auto border border-slate-850">
          <pre className="text-fh-gold text-[10px] font-mono leading-relaxed">{manualMigrationSQL}</pre>
        </div>
        <div className="flex flex-wrap gap-4 justify-center">
          <button 
            onClick={() => { navigator.clipboard.writeText(manualMigrationSQL); toast.success("SQL Script Copied!"); }}
            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all border-b-4 border-emerald-800 flex items-center gap-2"
          >
            Copy SQL Script
          </button>
          <button 
            onClick={fetchData}
            title="Reload registry"
            className="px-8 py-4 bg-slate-800 hover:bg-slate-900 text-fh-gold rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all border-b-4 border-black/30"
          >
            Reload From Supabase
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-8 pb-20 animate-in fade-in duration-500 p-6 min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Visual Title Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-40 border-b border-slate-200 dark:border-slate-850 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Leadership Registry</h2>
            <span className="p-1 px-3 bg-fh-green text-fh-gold text-[8px] font-black uppercase rounded-full shadow border border-black/10">Governance Hub</span>
          </div>
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] flex items-center gap-2">
            <GraduationCap className="w-3.5 h-3.5 text-fh-gold" />
            Ecclessiastical Council & Pipeline oversight
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap gap-3 items-center">
          
          {/* Selective Modals Launchers */}
          <button
            onClick={() => { setEditingLeader(null); setIsLeaderModalOpen(true); }}
            className="px-5 py-3.5 bg-fh-green hover:bg-slate-950 dark:hover:bg-slate-950 text-fh-gold rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-b-4 border-black/30 flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4" /> Appoint Leader
          </button>

          {/* Go to Members Link Button */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'Members' }))}
            className="px-5 py-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-200 dark:border-slate-800/80 flex items-center gap-2 shadow-sm"
          >
            <Users className="w-4 h-4 text-fh-green" /> Go to Members Directory ➜
          </button>

          {/* Localized Dark Mode Toggle Button */}
          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-3.5 rounded-2xl shadow-md border transition-all ${
              isDark 
                ? 'bg-slate-900 border-slate-800 text-amber-400 hover:text-amber-300' 
                : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
            }`}
          >
            {isDark ? <Sun className="w-5 h-5 animate-spin-slow" /> : <Moon className="w-5 h-5" />}
          </button>

          <button
            onClick={fetchData}
            title="Reload registry"
            className={`p-3.5 rounded-2xl border ${
              isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-850' : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-fh-green' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap gap-2 pb-2 overflow-x-auto border-b border-slate-100 dark:border-slate-900 select-none scrollbar-hide">
        {[
          { tabId: 'Dashboard', label: 'Dashboard Board', count: null },
          { tabId: 'Registry', label: 'Leader Registry', count: leaders.length },
          { tabId: 'Tree', label: 'Hierarchy Chart', count: null },
          { tabId: 'Communications', label: 'Circular message broadcaster', count: announcements.length },
          { tabId: 'Pipeline', label: 'School of Ministry', count: pipeline.length },
          { tabId: 'Reports', label: 'Report Generation', count: null }
        ].map(tb => (
          <button
            key={tb.tabId}
            onClick={() => setActiveTab(tb.tabId as any)}
            className={`px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${
              activeTab === tb.tabId 
                ? 'bg-fh-green text-fh-gold shadow-md' 
                : `text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900`
            }`}
          >
            <span className="flex items-center gap-2">
              {tb.label}
              {tb.count !== null && (
                <span className="ml-1 px-1.5 py-0.5 rounded-md text-[8px] bg-fh-gold text-fh-green font-black">{tb.count}</span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Primary views selection switcher */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <RefreshCw className="w-10 h-10 animate-spin text-fh-green" />
          <p className="font-bold text-xs uppercase tracking-widest text-slate-400">Loading Ecclesial registry datasets...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {activeTab === 'Dashboard' && (
              <LeadershipDashboard 
                leaders={leaders}
                auditLogs={auditLogs}
                isDark={isDark}
              />
            )}

            {activeTab === 'Registry' && (
              <LeadershipRegistry
                leaders={leaders}
                onOpenAppointModal={(leader) => {
                  setEditingLeader(leader || null);
                  setIsLeaderModalOpen(true);
                }}
                onDeleteLeader={handleDeleteLeader}
                onPromoteLeader={handlePromoteLeader}
                onTransferBranch={handleTransferBranch}
                isDark={isDark}
              />
            )}

            {activeTab === 'Tree' && (
              <LeadershipTree
                leaders={leaders}
                onUpdateSupervisor={handleUpdateSupervisor}
                isDark={isDark}
              />
            )}

            {activeTab === 'Communications' && (
              <LeadershipCommHub
                announcements={announcements}
                onSendAnnouncement={handleSendAnnouncement}
                isDark={isDark}
              />
            )}

            {activeTab === 'Reports' && (
              <LeadershipReports
                leaders={leaders}
                pipeline={pipeline}
                isDark={isDark}
              />
            )}

            {activeTab === 'Pipeline' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-105 dark:border-slate-800 shadow-sm">
                  <div>
                    <h3 className="text-md font-black uppercase tracking-tight">School of Ministry Registry</h3>
                    <p className="text-xs text-slate-400 mt-1">Preparing candidates and students for future ecclesial ordination</p>
                  </div>
                  <button 
                    onClick={() => {
                      setPipelineForm({
                        member_id: '',
                        current_level: 'Discipleship',
                        progress_percentage: 20,
                        notes: '',
                        status: 'Active'
                      });
                      setIsPipelineModalOpen(true);
                    }}
                    className="px-5 py-3 bg-fh-green text-fh-gold rounded-xl text-[9px] font-black uppercase tracking-widest shadow animate-pulse"
                  >
                    Enroll Candidate
                  </button>
                </div>

                <div className="flex gap-6 overflow-x-auto pb-4 snap-x">
                  {['Discipleship', 'Leadership School', 'Minister in Training', 'Ministry Lead'].map((lvl, lidx) => {
                    const listForLvl = pipeline.filter(p => p.current_level === lvl);
                    return (
                      <div key={lvl} className="min-w-[320px] max-w-[320px] bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] p-5 flex flex-col snap-center border border-slate-200/50 dark:border-slate-850">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-705 dark:text-slate-300">{lvl}</span>
                          <span className="bg-slate-200 dark:bg-slate-800 text-slate-500 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full">{listForLvl.length}</span>
                        </div>

                        <div className="space-y-4 flex-1 overflow-y-auto max-h-[380px] scrollbar-hide">
                          {listForLvl.length > 0 ? listForLvl.map(cp => (
                            <div key={cp.id} className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-840 rounded-2xl shadow-sm relative space-y-3">
                              <h4 className="font-black uppercase text-xs">
                                {(() => {
                                  const m = cp.members ? (Array.isArray(cp.members) ? cp.members[0] : cp.members) : null;
                                  return m ? `${m.first_name || ''} ${m.last_name || ''}`.trim() : 'Unknown Member';
                                })()}
                              </h4>
                              <div className="w-full bg-slate-150 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-fh-green h-full" style={{ width: `${cp.progress_percentage}%` }} />
                              </div>
                              <div className="flex justify-between select-none text-[8px] font-black uppercase text-slate-400 border-t border-slate-100 dark:border-slate-900 pt-2.5">
                                <button disabled={lidx === 0} onClick={() => handlePipelineMove(cp.id, ['Discipleship', 'Leadership School', 'Minister in Training', 'Ministry Lead'][lidx - 1])} className="hover:text-fh-green disabled:opacity-30">◄ Move back</button>
                                <span>{cp.progress_percentage}% Done</span>
                                <button disabled={lidx === 3} onClick={() => handlePipelineMove(cp.id, ['Discipleship', 'Leadership School', 'Minister in Training', 'Ministry Lead'][lidx + 1])} className="hover:text-fh-green disabled:opacity-30">Promote ►</button>
                              </div>
                            </div>
                          )) : (
                            <div className="text-center py-10 font-black text-[9px] uppercase tracking-wider text-slate-350 italic">No candidates en route</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Global Modals container */}
      <LeadershipModals
        isLeaderModalOpen={isLeaderModalOpen}
        onCloseLeaderModal={() => { setIsLeaderModalOpen(false); setEditingLeader(null); }}
        editingLeader={editingLeader}
        leadersList={leaders}
        onLeaderSave={handleLeaderSave}
        
        isAppraisalModalOpen={false}
        onCloseAppraisalModal={() => {}}
        appraisalForm={{} as any}
        setAppraisalForm={() => {}}
        onAppraisalSubmit={async (e) => e.preventDefault()}

        isPipelineModalOpen={isPipelineModalOpen}
        onClosePipelineModal={() => setIsPipelineModalOpen(false)}
        pipelineForm={pipelineForm}
        setPipelineForm={setPipelineForm}
        onPipelineSubmit={handlePipelineSubmit}
        members={members}

        isSubmitting={isSubmitting}
        isDark={isDark}
      />

    </div>
  );
};

export default LeadershipDevelopmentView;
