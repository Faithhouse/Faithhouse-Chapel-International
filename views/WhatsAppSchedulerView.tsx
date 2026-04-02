
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  UserProfile, 
  ScheduledMessage, 
  Branch, 
  Member, 
  AttendanceEvent,
  WhatsAppConfig 
} from '../types';
import { toast } from 'sonner';
import { 
  MessageSquare, 
  Send, 
  Link2, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  MoreVertical, 
  Eye, 
  Edit2, 
  XCircle, 
  RefreshCw, 
  Copy,
  Sparkles,
  Users,
  Calendar,
  Image as ImageIcon,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  Zap,
  Info
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { format } from 'date-fns';
import { GoogleGenAI } from "@google/genai";

interface WhatsAppSchedulerViewProps {
  userProfile: UserProfile | null;
}

const WhatsAppSchedulerView: React.FC<WhatsAppSchedulerViewProps> = ({ userProfile }) => {
  const [activeTab, setActiveTab] = useState<'Ledger' | 'Direct' | 'Gateway'>('Ledger');
  const [schedules, setSchedules] = useState<ScheduledMessage[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [attendanceEvents, setAttendanceEvents] = useState<AttendanceEvent[]>([]);
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [automations, setAutomations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<any>(null);
  const [tableMissing, setTableMissing] = useState(false);
  const [dispatchStep, setDispatchStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');
  const [directMessage, setDirectMessage] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [gatewayForm, setGatewayForm] = useState<Partial<WhatsAppConfig>>({
    provider: 'Meta Official API',
    sender_number: '',
    api_url: '',
    access_token: ''
  });

  // Dispatch Form State
  const [dispatchForm, setDispatchForm] = useState({
    title: '',
    message: '',
    target_group: 'All' as ScheduledMessage['target_group'],
    message_type: 'Text' as ScheduledMessage['message_type'],
    scheduled_for: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    media_url: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setTableMissing(false);
    try {
      const [sRes, mRes, bRes, eRes, cRes, aRes] = await Promise.all([
        supabase.from('whatsapp_schedules').select('*').order('created_at', { ascending: false }),
        supabase.from('members').select('*').order('first_name'),
        supabase.from('branches').select('*').order('name'),
        supabase.from('attendance_events').select('*').order('event_date', { ascending: false }),
        supabase.from('whatsapp_config').select('*').single(),
        supabase.from('whatsapp_automations').select('*').order('type')
      ]);

      if (aRes.error && (aRes.error.code === '42P01' || aRes.error.code === 'PGRST205')) {
        setTableMissing(true);
      }

      setSchedules(sRes.data || []);
      setMembers(mRes.data || []);
      setBranches(bRes.data || []);
      setAttendanceEvents(eRes.data || []);
      setAutomations(aRes.data || []);
      
      if (cRes.data) {
        setConfig(cRes.data);
        setGatewayForm({
          provider: cRes.data.provider,
          sender_number: cRes.data.sender_number,
          api_url: cRes.data.api_url,
          access_token: cRes.data.access_token
        });
      }
    } catch (error) {
      console.error('Error fetching WhatsApp data:', error);
      toast.error('Failed to sync with communication gateway');
    } finally {
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = schedules.length;
    const sent = schedules.reduce((acc, s) => acc + (s.sent_count || 0), 0);
    const delivered = schedules.reduce((acc, s) => acc + (s.delivered_count || 0), 0);
    const read = schedules.reduce((acc, s) => acc + (s.read_count || 0), 0);
    const failed = schedules.reduce((acc, s) => acc + (s.failed_count || 0), 0);
    
    const readRate = sent > 0 ? Math.round((read / sent) * 100) : 0;

    return { total, sent, delivered, read, failed, readRate };
  }, [schedules]);

  const nextScheduled = useMemo(() => {
    return schedules
      .filter(s => s.status === 'Scheduled' || s.status === 'Pending')
      .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())[0];
  }, [schedules]);

  const handleBulkDispatch = async () => {
    if (!dispatchForm.title || !dispatchForm.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase.from('whatsapp_schedules').insert([{
        ...dispatchForm,
        status: 'Scheduled',
        created_by: userProfile?.id,
        sent_count: 0,
        delivered_count: 0,
        read_count: 0,
        failed_count: 0
      }]);

      if (error) throw error;

      toast.success('Broadcast scheduled successfully');
      setIsDispatchModalOpen(false);
      setDispatchStep(1);
      setDispatchForm({
        title: '',
        message: '',
        target_group: 'All',
        message_type: 'Text',
        scheduled_for: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        media_url: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error scheduling broadcast:', error);
      toast.error('Failed to schedule broadcast');
    }
  };

  const generateAIMessage = async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a warm, professional WhatsApp message for a church audience. 
      Context: ${dispatchForm.title || 'General Announcement'}. 
      Target: ${dispatchForm.target_group}. 
      Tone: Encouraging and clear. 
      Include placeholders like {{Name}} where appropriate.`
    });

    toast.promise(model, {
      loading: 'AI is crafting your message...',
      success: (res) => {
        setDispatchForm(prev => ({ ...prev, message: res.text || '' }));
        return 'Message generated!';
      },
      error: 'Failed to generate message'
    });
  };

  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => 
      s.title.toLowerCase().includes(ledgerSearchQuery.toLowerCase()) ||
      s.message.toLowerCase().includes(ledgerSearchQuery.toLowerCase())
    );
  }, [schedules, ledgerSearchQuery]);

  const filteredMembers = useMemo(() => {
    return members.filter(m => 
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone?.includes(searchQuery)
    );
  }, [members, searchQuery]);

  const handleGatewayUpdate = async () => {
    try {
      const { error } = await supabase
        .from('whatsapp_config')
        .upsert([{
          ...gatewayForm,
          status: 'Connected',
          updated_at: new Date().toISOString()
        }]);

      if (error) throw error;
      toast.success('Gateway configuration updated');
      fetchData();
    } catch (error) {
      console.error('Error updating gateway:', error);
      toast.error('Failed to update gateway configuration');
    }
  };

  const handleUpdateAutomation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAutomation) return;

    try {
      const { error } = await supabase
        .from('whatsapp_automations')
        .update({
          is_active: selectedAutomation.is_active,
          message_template: selectedAutomation.message_template,
          trigger_delay_days: selectedAutomation.trigger_delay_days,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAutomation.id);

      if (error) throw error;

      toast.success(`${selectedAutomation.title} updated successfully`);
      setIsAutomationModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error updating automation:', error);
      toast.error('Failed to update automation');
    }
  };

  const chartData = [
    { name: 'Sent', value: stats.sent, color: '#10b981' },
    { name: 'Delivered', value: stats.delivered, color: '#3b82f6' },
    { name: 'Read', value: stats.read, color: '#8b5cf6' },
    { name: 'Failed', value: stats.failed, color: '#ef4444' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (tableMissing) {
    const repairSQL = `-- WHATSAPP AUTOMATIONS SCHEMA REPAIR
CREATE TABLE IF NOT EXISTS public.whatsapp_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  message_template TEXT NOT NULL,
  trigger_delay_days INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seed initial data if empty
INSERT INTO public.whatsapp_automations (type, title, description, message_template, trigger_delay_days)
VALUES 
('first_timer', 'First Timer Welcome', 'Automated outreach for new visitors', 'Shalom {{Name}}! 🕊️ It was a blessing having you at our service. We hope to see you again soon!', 1),
('absentee', 'Absentee Follow-up', 'Pastoral care for missed services', 'Shalom {{Name}}! 🕊️ We missed you at our recent service. We hope all is well. God bless you!', 3),
('birthday', 'Birthday Messages', 'Member engagement for birthdays', 'Happy Birthday {{Name}}! 🎂 May God continue to bless and keep you in this new year of your life!', 0),
('engagement', 'Member Engagement', 'General engagement and announcements', 'Shalom {{Name}}! 🕊️ Just checking in to see how your week is going. Stay blessed!', 7)
ON CONFLICT (type) DO NOTHING;

ALTER TABLE public.whatsapp_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON public.whatsapp_automations FOR ALL USING (true) WITH CHECK (true);`;

    return (
      <div className="max-w-4xl mx-auto py-12 px-4 animate-in zoom-in-95">
        <div className="bg-white p-12 rounded-[4rem] shadow-2xl text-center border-b-[16px] border-emerald-500">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
             <Zap className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Automation Engine Reset</h2>
          <p className="text-slate-500 mb-10 text-[11px] font-bold uppercase tracking-widest max-w-lg mx-auto">The WhatsApp automation system is not ready. Run the script to authorize.</p>
          <pre className="bg-slate-950 text-emerald-400 p-8 rounded-[2rem] text-[10px] font-mono text-left h-48 overflow-y-auto mb-10 shadow-2xl border border-white/5 scrollbar-hide">{repairSQL}</pre>
          <button onClick={fetchData} className="px-16 py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl border-b-4 border-black active:scale-95">Verify Protocols</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">WhatsApp Broadcast Hub</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">Official Communication Gateway</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
            {(['Ledger', 'Direct', 'Gateway'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab 
                    ? 'bg-white text-emerald-600 shadow-md' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab === 'Ledger' ? 'Dispatch Ledger' : tab === 'Direct' ? 'Direct Relay' : 'Gateway Link'}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setIsDispatchModalOpen(true)}
            className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-3"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Bulk Dispatch
          </button>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-50 rounded-2xl text-amber-500 group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Relay Queue</span>
          </div>
          <h3 className="text-4xl font-black text-slate-900 tracking-tighter mb-1">
            {schedules.filter(s => s.status === 'Queued' || s.status === 'Pending').length}
          </h3>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Messages waiting to be sent</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-2xl transition-transform group-hover:scale-110 ${config?.status === 'Connected' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
              <Link2 className="w-6 h-6" />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${config?.status === 'Connected' ? 'text-emerald-500' : 'text-rose-500'}`}>
              Gateway Status
            </span>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
              {config?.status || 'Unlinked'}
            </h3>
            {config?.status !== 'Connected' && (
              <button 
                onClick={() => setActiveTab('Gateway')}
                className="px-3 py-1 bg-rose-500 text-white text-[8px] font-black rounded-lg uppercase tracking-widest hover:bg-rose-600"
              >
                Reconnect
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Meta Official API</p>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full translate-x-1/2 -translate-y-1/2" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/5 rounded-2xl text-emerald-400 group-hover:rotate-12 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Next Activity</span>
            </div>
            <h3 className="text-xl font-black text-white tracking-tight leading-tight mb-1 truncate">
              {nextScheduled?.title || 'No Pending Relay'}
            </h3>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              {nextScheduled ? format(new Date(nextScheduled.scheduled_for), "MMM dd, hh:mm a") : 'System Idle'}
            </p>
          </div>
        </div>
      </div>

      {/* Alert System */}
      {config?.status !== 'Connected' && (
        <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl flex items-center justify-between animate-in slide-in-from-top-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-500 text-white rounded-2xl">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-rose-900 uppercase tracking-tight">WhatsApp Gateway is not connected</h4>
              <p className="text-xs text-rose-700 font-medium">Messages cannot be delivered until the gateway is authorized.</p>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('Gateway')}
            className="px-6 py-3 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all"
          >
            Connect Now
          </button>
        </div>
      )}

      {/* Main Content Tabs */}
      {activeTab === 'Ledger' && (
        <div className="space-y-8">
          {/* Analytics Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-500" />
                  Delivery Analytics
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-black text-slate-400 uppercase">Sent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-[9px] font-black text-slate-400 uppercase">Delivered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-violet-500" />
                    <span className="text-[9px] font-black text-slate-400 uppercase">Read</span>
                  </div>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart id="whatsapp-metrics-bar" data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} 
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Read Rate</h3>
                <div className="relative flex items-center justify-center h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Read', value: stats.readRate },
                          { name: 'Unread', value: 100 - stats.readRate }
                        ]}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#f1f5f9" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-slate-900">{stats.readRate}%</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Engagement</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Total Sent</span>
                  <span className="text-xs font-black text-slate-900">{stats.sent}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Transmission Ledger */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Transmission Ledger</h3>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="text" 
                    placeholder="Search campaigns..." 
                    value={ledgerSearchQuery}
                    onChange={(e) => setLedgerSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all w-64"
                  />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-5">Campaign / Message</th>
                    <th className="px-8 py-5">Audience</th>
                    <th className="px-8 py-5">Type</th>
                    <th className="px-8 py-5">Scheduled</th>
                    <th className="px-8 py-5">Status</th>
                    <th className="px-8 py-5">Stats (S/D/R)</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredSchedules.length > 0 ? filteredSchedules.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{s.title}</p>
                          <p className="text-[10px] text-slate-500 font-medium line-clamp-1 italic">"{s.message}"</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-600 uppercase tracking-widest">
                          {s.target_group}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          {s.message_type === 'Image' ? <ImageIcon className="w-3 h-3 text-blue-500" /> : <MessageSquare className="w-3 h-3 text-emerald-500" />}
                          <span className="text-[10px] font-black text-slate-700 uppercase">{s.message_type}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-black text-slate-900 uppercase">{format(new Date(s.scheduled_for), "MMM dd, yyyy")}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">{format(new Date(s.scheduled_for), "hh:mm a")}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                          s.status === 'Sent' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          s.status === 'Scheduled' || s.status === 'Queued' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          s.status === 'Failed' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          'bg-slate-50 text-slate-400 border-slate-100'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-slate-900">{s.sent_count || 0}</span>
                            <span className="text-[7px] font-black text-slate-400 uppercase">S</span>
                          </div>
                          <div className="w-px h-4 bg-slate-100" />
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-slate-900">{s.delivered_count || 0}</span>
                            <span className="text-[7px] font-black text-slate-400 uppercase">D</span>
                          </div>
                          <div className="w-px h-4 bg-slate-100" />
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-slate-900">{s.read_count || 0}</span>
                            <span className="text-[7px] font-black text-slate-400 uppercase">R</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 hover:bg-white hover:shadow-md rounded-lg text-slate-400 hover:text-emerald-500 transition-all" title="View Details"><Eye className="w-4 h-4" /></button>
                          <button className="p-2 hover:bg-white hover:shadow-md rounded-lg text-slate-400 hover:text-blue-500 transition-all" title="Edit"><Edit2 className="w-4 h-4" /></button>
                          <button className="p-2 hover:bg-white hover:shadow-md rounded-lg text-slate-400 hover:text-amber-500 transition-all" title="Duplicate"><Copy className="w-4 h-4" /></button>
                          <button className="p-2 hover:bg-white hover:shadow-md rounded-lg text-slate-400 hover:text-rose-500 transition-all" title="Cancel"><XCircle className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="px-8 py-32 text-center">
                        <div className="flex flex-col items-center gap-4 opacity-40">
                          <MessageSquare className="w-12 h-12 text-slate-300" />
                          <div className="space-y-1">
                            <p className="text-sm font-black text-slate-900 uppercase tracking-widest">No broadcasts yet</p>
                            <p className="text-xs text-slate-500 font-medium">Click 'Bulk Dispatch' to send your first message.</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Automation Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {automations.map((automation) => (
              <div key={automation.id} className={`bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:border-${automation.type === 'first_timer' ? 'emerald' : automation.type === 'absentee' ? 'blue' : automation.type === 'birthday' ? 'rose' : 'violet'}-500 transition-all`}>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`p-3 rounded-2xl group-hover:rotate-12 transition-transform ${
                    automation.type === 'first_timer' ? 'bg-emerald-50 text-emerald-500' : 
                    automation.type === 'absentee' ? 'bg-blue-50 text-blue-500' : 
                    automation.type === 'birthday' ? 'bg-rose-50 text-rose-500' : 
                    'bg-violet-50 text-violet-500'
                  }`}>
                    {automation.type === 'first_timer' ? <Zap className="w-6 h-6" /> : 
                     automation.type === 'absentee' ? <Users className="w-6 h-6" /> : 
                     automation.type === 'birthday' ? <Sparkles className="w-6 h-6" /> : 
                     <MessageSquare className="w-6 h-6" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{automation.title}</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{automation.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                    automation.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {automation.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button 
                    onClick={() => {
                      setSelectedAutomation(automation);
                      setIsAutomationModalOpen(true);
                    }}
                    className={`text-[10px] font-black uppercase tracking-widest hover:underline ${
                      automation.type === 'first_timer' ? 'text-emerald-500' : 
                      automation.type === 'absentee' ? 'text-blue-500' : 
                      automation.type === 'birthday' ? 'text-rose-500' : 
                      'text-violet-500'
                    }`}
                  >
                    Configure
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Direct' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Member Directory</h3>
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input 
                  type="text" 
                  placeholder="Search members..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-bold uppercase outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all"
                />
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
                {filteredMembers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (selectedMembers.includes(m.id)) {
                        setSelectedMembers(prev => prev.filter(id => id !== m.id));
                      } else {
                        setSelectedMembers(prev => [...prev, m.id]);
                      }
                    }}
                    className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                      selectedMembers.includes(m.id) 
                        ? 'bg-emerald-50 border-emerald-200' 
                        : 'bg-white border-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-900 text-fh-gold rounded-xl flex items-center justify-center font-black text-[10px]">
                        {m.first_name[0]}{m.last_name[0]}
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-black text-slate-800 uppercase">{m.first_name} {m.last_name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{m.phone || 'No Phone'}</p>
                      </div>
                    </div>
                    {selectedMembers.includes(m.id) && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Direct Relay Console</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    {selectedMembers.length} Recipients Selected
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedMembers([])}
                  className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                >
                  Clear Selection
                </button>
              </div>

              <div className="flex-1 space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Message Content</label>
                  <textarea 
                    rows={8}
                    value={directMessage}
                    onChange={(e) => setDirectMessage(e.target.value)}
                    placeholder="Type your message here..."
                    className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] font-medium text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all resize-none"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <button className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center gap-3">
                    <Send className="w-4 h-4" />
                    Send Instant Message
                  </button>
                  <button 
                    onClick={generateAIMessage}
                    className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-3"
                  >
                    <Sparkles className="w-4 h-4 text-fh-gold" />
                    AI Suggest
                  </button>
                </div>
              </div>

              <div className="mt-8 p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-start gap-4">
                <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-[9px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest">
                  Direct relay messages are sent instantly through the official gateway. 
                  Personalization tags like {"{{Name}}"} will be automatically replaced for each recipient.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Gateway' && (
        <div className="max-w-3xl mx-auto animate-in slide-in-from-right-4 duration-500">
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden border-b-[16px] border-fh-gold">
            <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex items-center gap-6">
              <div className="p-4 bg-slate-900 text-fh-gold rounded-2xl shadow-xl">
                <Link2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Gateway Configuration</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Meta Official API Integration</p>
              </div>
            </div>
            
            <div className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">API Provider</label>
                  <select 
                    value={gatewayForm.provider}
                    onChange={(e) => setGatewayForm(prev => ({ ...prev, provider: e.target.value }))}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-800 outline-none"
                  >
                    <option>Meta Official API</option>
                    <option>Twilio</option>
                    <option>Wati</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Sender Phone ID</label>
                  <input 
                    type="text"
                    value={gatewayForm.sender_number}
                    onChange={(e) => setGatewayForm(prev => ({ ...prev, sender_number: e.target.value }))}
                    placeholder="e.g. 1092837465"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">API Endpoint URL</label>
                <input 
                  type="text"
                  value={gatewayForm.api_url}
                  onChange={(e) => setGatewayForm(prev => ({ ...prev, api_url: e.target.value }))}
                  placeholder="https://graph.facebook.com/v17.0/..."
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-800 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Access Token</label>
                <input 
                  type="password"
                  value={gatewayForm.access_token}
                  onChange={(e) => setGatewayForm(prev => ({ ...prev, access_token: e.target.value }))}
                  placeholder="••••••••••••••••••••••••"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-800 outline-none"
                />
              </div>

              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-start gap-4">
                <Zap className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-emerald-700 font-bold leading-relaxed uppercase tracking-widest">
                  Your connection is currently {config?.status || 'Unlinked'}. 
                  Ensure your Meta Business App has the "whatsapp_business_messaging" permission enabled.
                </p>
              </div>

              <button 
                onClick={handleGatewayUpdate}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl hover:bg-slate-800 active:scale-95 transition-all border-b-4 border-black"
              >
                Authorize & Link Gateway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Dispatch Modal */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setIsDispatchModalOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500 text-white rounded-2xl">
                  <Plus className="w-6 h-6 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Bulk Dispatch Flow</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Step {dispatchStep} of 4</p>
                </div>
              </div>
              <button onClick={() => setIsDispatchModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                <XCircle className="w-6 h-6 text-slate-300" />
              </button>
            </div>

            <div className="p-10">
              {dispatchStep === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4">Step 1: Select Audience</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {(['All Members', 'First Timers', 'Absentees', 'Children Ministry', 'Teens Ministry', 'Custom Selection'] as const).map((group) => (
                      <button
                        key={group}
                        onClick={() => setDispatchForm(prev => ({ ...prev, target_group: group as any }))}
                        className={`p-6 rounded-3xl border-2 text-left transition-all ${
                          dispatchForm.target_group === group 
                            ? 'bg-emerald-50 border-emerald-500' 
                            : 'bg-white border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <Users className={`w-6 h-6 mb-3 ${dispatchForm.target_group === group ? 'text-emerald-500' : 'text-slate-300'}`} />
                        <p className={`text-[10px] font-black uppercase tracking-widest ${dispatchForm.target_group === group ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {group}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {dispatchStep === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Step 2: Compose Message</h4>
                    <button 
                      onClick={generateAIMessage}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-[9px] font-black rounded-xl uppercase tracking-widest hover:bg-slate-800"
                    >
                      <Sparkles className="w-3 h-3 text-fh-gold" />
                      Generate Message
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Campaign Title</label>
                      <input 
                        type="text"
                        value={dispatchForm.title}
                        onChange={e => setDispatchForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g. Sunday Service Reminder"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-800 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Message Body</label>
                      <textarea 
                        rows={6}
                        value={dispatchForm.message}
                        onChange={e => setDispatchForm(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="Hello {{Name}}, we look forward to seeing you..."
                        className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] font-medium text-slate-700 outline-none resize-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Media URL (Optional)</label>
                      <input 
                        type="text"
                        value={dispatchForm.media_url}
                        onChange={e => setDispatchForm(prev => ({ ...prev, media_url: e.target.value }))}
                        placeholder="https://example.com/flyer.jpg"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-800 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {dispatchStep === 3 && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4">Step 3: Schedule</h4>
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setDispatchForm(prev => ({ ...prev, scheduled_for: format(new Date(), "yyyy-MM-dd'T'HH:mm") }))}
                        className="flex-1 p-6 bg-emerald-50 border-2 border-emerald-500 rounded-3xl text-left"
                      >
                        <Zap className="w-6 h-6 text-emerald-500 mb-3" />
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Send Now</p>
                      </button>
                      <button className="flex-1 p-6 bg-white border-2 border-slate-100 rounded-3xl text-left hover:border-slate-200">
                        <Clock className="w-6 h-6 text-slate-300 mb-3" />
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Schedule Later</p>
                      </button>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Dispatch Time</label>
                      <input 
                        type="datetime-local"
                        value={dispatchForm.scheduled_for}
                        onChange={e => setDispatchForm(prev => ({ ...prev, scheduled_for: e.target.value }))}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-800 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {dispatchStep === 4 && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4">Step 4: Preview & Confirm</h4>
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Campaign</span>
                      <span className="text-xs font-black text-slate-900 uppercase">{dispatchForm.title}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audience</span>
                      <span className="text-xs font-black text-emerald-600 uppercase">{dispatchForm.target_group}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scheduled</span>
                      <span className="text-xs font-black text-slate-900 uppercase">{format(new Date(dispatchForm.scheduled_for), "MMM dd, hh:mm a")}</span>
                    </div>
                    <div className="pt-4 border-t border-slate-200">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Message Preview</span>
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative">
                        <div className="absolute -left-2 top-4 w-4 h-4 bg-white border-l border-t border-slate-200 rotate-[-45deg]" />
                        <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{dispatchForm.message}</p>
                        {dispatchForm.media_url && (
                          <div className="mt-4 p-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                            <ImageIcon className="w-4 h-4 text-blue-500" />
                            <span className="text-[8px] font-black text-slate-400 uppercase truncate">{dispatchForm.media_url}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
              <button 
                disabled={dispatchStep === 1}
                onClick={() => setDispatchStep(prev => prev - 1)}
                className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <div className="flex items-center gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${dispatchStep === i + 1 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                ))}
              </div>
              {dispatchStep < 4 ? (
                <button 
                  onClick={() => setDispatchStep(prev => prev + 1)}
                  className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-600"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  onClick={handleBulkDispatch}
                  className="px-8 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 active:scale-95 transition-all"
                >
                  Confirm & Dispatch
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Automation Configuration Modal */}
      {isAutomationModalOpen && selectedAutomation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md animate-in fade-in" onClick={() => setIsAutomationModalOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border-b-[16px] border-emerald-500">
             <div className="p-12 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
               <div className="flex items-center gap-6">
                 <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-xl ${
                    selectedAutomation.type === 'first_timer' ? 'bg-emerald-500 text-white' : 
                    selectedAutomation.type === 'absentee' ? 'bg-blue-500 text-white' : 
                    selectedAutomation.type === 'birthday' ? 'bg-rose-500 text-white' : 
                    'bg-violet-500 text-white'
                 }`}>
                    {selectedAutomation.type === 'first_timer' ? <Zap className="w-8 h-8" /> : 
                     selectedAutomation.type === 'absentee' ? <Users className="w-8 h-8" /> : 
                     selectedAutomation.type === 'birthday' ? <Sparkles className="w-8 h-8" /> : 
                     <MessageSquare className="w-8 h-8" />}
                 </div>
                 <div>
                    <h3 className="text-3xl font-black text-slate-900 uppercase leading-none tracking-tighter">{selectedAutomation.title}</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-2">Automation Configuration</p>
                 </div>
               </div>
               <button onClick={() => setIsAutomationModalOpen(false)} className="p-5 hover:bg-slate-100 rounded-full transition-all text-slate-400 active:scale-90"><XCircle className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleUpdateAutomation} className="p-12 space-y-8">
               <div className="flex items-center justify-between bg-slate-50 p-6 rounded-3xl border border-slate-100">
                 <div>
                   <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Automation Status</h4>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Enable or disable this trigger</p>
                 </div>
                 <button 
                   type="button"
                   onClick={() => setSelectedAutomation({ ...selectedAutomation, is_active: !selectedAutomation.is_active })}
                   className={`w-16 h-8 rounded-full transition-all relative ${selectedAutomation.is_active ? 'bg-emerald-500' : 'bg-slate-200'}`}
                 >
                   <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${selectedAutomation.is_active ? 'left-9' : 'left-1'}`} />
                 </button>
               </div>

               <div className="space-y-2">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Trigger Delay (Days)</label>
                 <div className="flex items-center gap-4">
                   <input 
                     type="number" 
                     min="0"
                     value={selectedAutomation.trigger_delay_days}
                     onChange={(e) => setSelectedAutomation({ ...selectedAutomation, trigger_delay_days: parseInt(e.target.value) })}
                     className="w-32 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-800 outline-none"
                   />
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Days after trigger event</p>
                 </div>
               </div>

               <div className="space-y-2">
                 <div className="flex items-center justify-between px-4">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Message Template</label>
                   <button 
                    type="button"
                    onClick={async () => {
                      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
                      const model = await ai.models.generateContent({
                        model: "gemini-3-flash-preview",
                        contents: `Generate a warm, professional church WhatsApp message for: ${selectedAutomation.title}. 
                        Context: ${selectedAutomation.description}. 
                        Tone: Encouraging. 
                        Include placeholders like {{Name}}.`
                      });

                      toast.promise(Promise.resolve(model), {
                        loading: 'AI is drafting your template...',
                        success: (res) => {
                          setSelectedAutomation({ ...selectedAutomation, message_template: res.text || '' });
                          return 'Template generated!';
                        },
                        error: 'Failed to generate template'
                      });
                    }}
                    className="text-[9px] font-black text-emerald-500 uppercase tracking-widest hover:underline flex items-center gap-1"
                   >
                     <Sparkles className="w-3 h-3" />
                     AI Rewrite
                   </button>
                 </div>
                 <textarea 
                   rows={5}
                   value={selectedAutomation.message_template}
                   onChange={(e) => setSelectedAutomation({ ...selectedAutomation, message_template: e.target.value })}
                   placeholder="Draft your automated message..."
                   className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] font-medium text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all resize-none"
                 />
                 <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.2em] px-4">Use {"{{Name}}"} to personalize messages automatically.</p>
               </div>

               <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl hover:bg-slate-800 active:scale-95 transition-all border-b-4 border-black">
                 Save Configuration
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppSchedulerView;
