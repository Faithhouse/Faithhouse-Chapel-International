import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Member } from '../types';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, Cell
} from 'recharts';
import { 
  Music, Mic2, Play, FileText, Download, Plus, Trash2, 
  Users, Calendar, Activity, ListMusic, Headphones, Video
} from 'lucide-react';

interface MinistryModuleViewProps {
  ministryName: string;
  userProfile: UserProfile | null;
}

const MinistryModuleView: React.FC<MinistryModuleViewProps> = ({ ministryName, userProfile }) => {
  const [activeTab, setActiveTab] = useState<'Overview' | 'Personnel' | 'Operations' | 'Resources'>('Overview');
  const [ministryMembers, setMinistryMembers] = useState<Member[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  // Music Ministry Specific State
  const [performanceData] = useState([
    { name: 'Week 1', mastery: 65, attendance: 80 },
    { name: 'Week 2', mastery: 70, attendance: 85 },
    { name: 'Week 3', mastery: 85, attendance: 75 },
    { name: 'Week 4', mastery: 90, attendance: 95 },
  ]);

  const [songList, setSongList] = useState([
    { id: '1', title: 'Way Maker', artist: 'Sinach', status: 'Mastered', bpm: 68 },
    { id: '2', title: 'Gratitude', artist: 'Brandon Lake', status: 'In Progress', bpm: 74 },
    { id: '3', title: 'Agnus Dei', artist: 'Michael W. Smith', status: 'Mastered', bpm: 62 },
  ]);

  const [resources] = useState([
    { id: '1', title: 'Sunday Service Setlist', type: 'PDF', size: '1.2 MB', category: 'Sheet Music' },
    { id: '2', title: 'Way Maker (Vocal Stems)', type: 'MP3', size: '15 MB', category: 'Audio' },
    { id: '3', title: 'Microphone Handling 101', type: 'Video', size: '45 MB', category: 'Training' },
  ]);

  useEffect(() => {
    fetchPersonnel();
  }, [ministryName]);

  const fetchPersonnel = async () => {
    setIsLoading(true);
    try {
      // 1. Get members currently assigned to this specific ministry
      const { data: assigned, error: assignedErr } = await supabase
        .from('members')
        .select('*')
        .eq('ministry', ministryName)
        .order('first_name');
      
      if (assignedErr) throw assignedErr;
      setMinistryMembers(assigned || []);

      // 2. Get ALL members so we can pick from them in the "Add" modal
      const { data: available, error: availableErr } = await supabase
        .from('members')
        .select('*')
        .order('first_name');
      
      if (availableErr) throw availableErr;
      setAllMembers(available || []);
    } catch (err) {
      console.error('Personnel Sync Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) return;

    setIsSubmitting(true);
    try {
      // This updates the 'ministry' column for that specific member in Supabase
      const { error } = await supabase
        .from('members')
        .update({ ministry: ministryName })
        .eq('id', selectedMemberId);

      if (error) throw error;

      // Reset UI state
      setIsAddModalOpen(false);
      setSelectedMemberId('');
      setMemberSearchTerm('');
      
      // Refresh the list so the new member shows up immediately
      await fetchPersonnel();
      alert(`Successfully added to ${ministryName}`);
    } catch (err: any) {
      console.error('Member Assignment Error:', err);
      alert('Failed to provision member: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeMember = async (id: string, name: string) => {
    if (!confirm(`Revoke ministry assignment for ${name}?`)) return;
    
    setIsLoading(true);
    try {
      // Sets the ministry back to 'N/A' or empty
      const { error } = await supabase
        .from('members')
        .update({ ministry: 'N/A' })
        .eq('id', id);

      if (error) throw error;
      await fetchPersonnel();
    } catch (err: any) {
      console.error('Removal Error:', err);
      alert('Revoke failed: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter members for the search dropdown: 
  // 1. Don't show people already in THIS ministry.
  // 2. Filter by search text.
  const filteredAvailableMembers = allMembers.filter(m => 
    m.ministry !== ministryName && 
    (`${m.first_name} ${m.last_name}`).toLowerCase().includes(memberSearchTerm.toLowerCase())
  ).slice(0, 10); // Limit to top 10 for performance

  const getMinistryConfig = () => {
    // Ensuring every case returns a valid object to avoid "Missing Initializer" errors
    const base = {
       icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16',
       accent: 'text-slate-600',
       bg: 'bg-slate-50',
       opsLabel: 'Departmental Logistics',
       kpi1: 'Deployment', kpi1Val: 'Active',
       kpi2: 'Team Count', kpi2Val: ministryMembers.length.toString(),
       kpi3: 'Vitality Score', kpi3Val: '92%'
    };

    switch (ministryName) {
      case 'Media Ministry':
        return { ...base, icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', accent: 'text-cyan-500', bg: 'bg-cyan-50', opsLabel: 'Technical Asset Management', kpi1: 'Stream Uptime', kpi1Val: '99.8%' };
      case 'Music Ministry':
        return { ...base, icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3', accent: 'text-indigo-600', bg: 'bg-indigo-50', opsLabel: 'Ensemble Control', kpi1: 'Vocal Ensemble', kpi1Val: '32' };
      case 'Prayer Ministry':
        return { ...base, icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', accent: 'text-rose-600', bg: 'bg-rose-50', opsLabel: 'Intercession Registry', kpi1: 'Active Warriors', kpi1Val: '18' };
      case 'Ushering Ministry':
        return { ...base, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', accent: 'text-amber-600', bg: 'bg-amber-50', opsLabel: 'Hospitality Protocols', kpi1: 'Ushers on Duty', kpi1Val: '12' };
      case 'Evangelism':
        return { ...base, icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z', accent: 'text-emerald-600', bg: 'bg-emerald-50', opsLabel: 'Souls Tracking', kpi1: 'Fields Active', kpi1Val: '4' };
      case 'Children Ministry':
        return { ...base, icon: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', accent: 'text-orange-500', bg: 'bg-orange-50', opsLabel: 'Curriculum Oversight', kpi1: 'Educators', kpi1Val: '10' };
      default:
        return base;
    }
  };

  const cfg = getMinistryConfig();

  const renderMusicMinistryOverview = () => (
    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Performance Tracker</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Vocal Mastery & Team Attendance</p>
            </div>
            <Activity className="w-6 h-6 text-indigo-500" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', paddingTop: '20px' }} />
                <Line type="monotone" dataKey="mastery" stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} name="Song Mastery %" />
                <Line type="monotone" dataKey="attendance" stroke="#10b981" strokeWidth={4} dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} name="Attendance %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
            <Music className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 rotate-12" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">Next Rehearsal</p>
            <h4 className="text-2xl font-black mb-1">Thursday, 6:00 PM</h4>
            <p className="text-xs font-medium opacity-80">Main Sanctuary • Full Band</p>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <ListMusic className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Active Setlist</h4>
            </div>
            <div className="space-y-4">
              {songList.map(song => (
                <div key={song.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div>
                    <p className="text-xs font-black text-slate-800 uppercase leading-none mb-1">{song.title}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{song.artist}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${song.status === 'Mastered' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {song.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMusicMinistryOperations = () => (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
             <Calendar className="w-6 h-6 text-indigo-500" />
             <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Rehearsal Schedule</h3>
          </div>
          <div className="space-y-6">
            {[
              { day: 'Thursday', time: '6:00 PM', type: 'Full Rehearsal', location: 'Sanctuary' },
              { day: 'Saturday', time: '4:00 PM', type: 'Vocal Training', location: 'Music Room' },
              { day: 'Sunday', time: '7:30 AM', type: 'Sound Check', location: 'Sanctuary' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex flex-col items-center justify-center shadow-sm border border-slate-100">
                    <span className="text-[8px] font-black text-slate-400 uppercase">{item.day.slice(0, 3)}</span>
                    <span className="text-xs font-black text-slate-900">{item.time.split(' ')[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{item.type}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{item.location}</p>
                  </div>
                </div>
                <button className="p-2 text-slate-400 hover:text-indigo-600 transition-all"><Play className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
             <ListMusic className="w-6 h-6 text-emerald-500" />
             <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Song Repository</h3>
          </div>
          <div className="space-y-4">
            {songList.map(song => (
              <div key={song.id} className="flex items-center justify-between p-4 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-900 text-fh-gold rounded-xl flex items-center justify-center font-black text-xs">
                    {song.bpm}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{song.title}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{song.artist}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-900 hover:text-white transition-all"><FileText className="w-4 h-4" /></button>
                  <button className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-900 hover:text-white transition-all"><Mic2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            <button className="w-full py-4 mt-4 border-2 border-dashed border-slate-100 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-indigo-200 hover:text-indigo-500 transition-all">+ Add New Song</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMusicMinistryResources = () => (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {resources.map(res => (
          <div key={res.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                res.category === 'Sheet Music' ? 'bg-blue-50 text-blue-500' :
                res.category === 'Audio' ? 'bg-purple-50 text-purple-500' : 'bg-orange-50 text-orange-500'
              }`}>
                {res.category === 'Sheet Music' ? <FileText className="w-6 h-6" /> :
                 res.category === 'Audio' ? <Headphones className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </div>
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{res.type}</span>
            </div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-2 group-hover:text-indigo-600 transition-colors">{res.title}</h4>
            <div className="flex items-center justify-between mt-6">
              <span className="text-[10px] font-bold text-slate-400 uppercase">{res.size}</span>
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all">
                <Download className="w-3 h-3" />
                Get File
              </button>
            </div>
          </div>
        ))}
        <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-white hover:border-indigo-200 transition-all">
           <Plus className="w-8 h-8 text-slate-300 group-hover:text-indigo-500 mb-4" />
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-500">Upload Resource</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 pb-20">
      
      {/* 1. Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 py-4 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-6">
          <div className={`w-20 h-20 ${cfg.bg} ${cfg.accent} rounded-[2.5rem] flex items-center justify-center shadow-xl border-4 border-white ring-1 ring-slate-100 transform hover:rotate-3 transition-transform`}>
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={cfg.icon} /></svg>
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-fh-gold/10 rounded-full mb-1">
               <span className="w-1.5 h-1.5 rounded-full bg-fh-gold animate-pulse"></span>
               <span className="text-[10px] font-black text-fh-gold uppercase tracking-[0.2em]">Oversight Active</span>
            </div>
            <h2 className="text-4xl font-black text-fh-green tracking-tighter uppercase leading-none">{ministryName}</h2>
          </div>
        </div>

        <div className="flex bg-slate-50 p-1.5 rounded-[1.75rem] border border-slate-200">
            {(['Overview', 'Personnel', 'Operations', 'Resources'] as const).map((tab) => (
             <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab ? 'bg-fh-green text-fh-gold shadow-lg' : 'text-slate-400 hover:text-fh-green'}`}
             >
               {tab}
             </button>
            ))}
        </div>
      </div>

      {activeTab === 'Overview' && ministryName === 'Music Ministry' && renderMusicMinistryOverview()}
      {activeTab === 'Operations' && ministryName === 'Music Ministry' && renderMusicMinistryOperations()}
      {activeTab === 'Resources' && ministryName === 'Music Ministry' && renderMusicMinistryResources()}

      {activeTab === 'Overview' && ministryName !== 'Music Ministry' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in duration-500">
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{cfg.kpi1}</p>
              <h3 className="text-4xl font-black text-fh-green tracking-tighter">{cfg.kpi1Val}</h3>
           </div>
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{cfg.kpi2}</p>
              <h3 className="text-4xl font-black text-fh-green tracking-tighter">{cfg.kpi2Val}</h3>
           </div>
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{cfg.kpi3}</p>
              <h3 className="text-4xl font-black text-fh-green tracking-tighter">{cfg.kpi3Val}</h3>
           </div>
        </div>
      )}

      {activeTab === 'Operations' && ministryName !== 'Music Ministry' && (
        <div className="bg-white p-20 rounded-[4rem] border border-slate-100 shadow-sm text-center animate-in fade-in duration-500">
           <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-slate-300">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
           </div>
           <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">{cfg.opsLabel}</h3>
           <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Standard Operating Procedures Pending Documentation</p>
        </div>
      )}

      {activeTab === 'Resources' && ministryName !== 'Music Ministry' && (
        <div className="bg-white p-20 rounded-[4rem] border border-slate-100 shadow-sm text-center animate-in fade-in duration-500">
           <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-slate-300">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
           </div>
           <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Knowledge Base</h3>
           <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Departmental Assets & Training Materials Pending Upload</p>
        </div>
      )}

      {activeTab === 'Personnel' && (
        <div className="royal-card rounded-[3.5rem] bg-white overflow-hidden shadow-sm border border-slate-100 animate-in fade-in duration-500">
           <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30">
              <div>
                 <h3 className="text-2xl font-black text-fh-green uppercase tracking-tighter">Ministry Workforce</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Departmental Registry</p>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(true)} 
                className="px-10 py-4 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl active:scale-95 transition-all border-b-4 border-black/30 flex items-center gap-3"
              >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                 Provision Staff
              </button>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100">
                    <tr>
                       <th className="px-10 py-6">Staff Identity</th>
                       <th className="px-10 py-6">Relay Contact</th>
                       <th className="px-10 py-6 text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {isLoading ? (
                      <tr><td colSpan={3} className="px-10 py-20 text-center text-slate-300 font-black uppercase tracking-widest animate-pulse">Syncing...</td></tr>
                    ) : ministryMembers.length > 0 ? ministryMembers.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50 transition-all group">
                        <td className="px-10 py-6">
                           <div className="flex items-center gap-5">
                              <div className="w-12 h-12 bg-slate-900 text-fh-gold rounded-xl flex items-center justify-center font-black text-xs uppercase">
                                {m.first_name[0]}{m.last_name ? m.last_name[0] : ''}
                              </div>
                              <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{m.first_name} {m.last_name}</p>
                           </div>
                        </td>
                        <td className="px-10 py-6 text-[10px] font-bold text-slate-500 uppercase">{m.phone || 'NO PHONE'}</td>
                        <td className="px-10 py-6 text-right">
                           <button onClick={() => removeMember(m.id, m.first_name)} className="p-3 text-slate-300 hover:text-rose-500 transition-all">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                           </button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={3} className="px-10 py-32 text-center text-slate-300 uppercase tracking-widest italic opacity-50">Empty Department.</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* MODAL SECTION - ADD MEMBER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => !isSubmitting && setIsAddModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border-b-[12px] border-fh-gold">
            <div className="p-8 bg-slate-50 flex items-center justify-between border-b border-slate-100">
               <h3 className="text-2xl font-black text-fh-green uppercase tracking-tighter">Deploy Personnel</h3>
               <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-black"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <form onSubmit={handleAddMember} className="p-8 space-y-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Search Global Registry</label>
                 <input 
                    type="text" 
                    placeholder="Type name here..."
                    value={memberSearchTerm}
                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-fh-gold/20 transition-all"
                 />
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Select Identity</label>
                 <select 
                    required
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-fh-gold/20 transition-all appearance-none"
                 >
                    <option value="">{filteredAvailableMembers.length > 0 ? '-- Select a Member --' : 'No Results Found'}</option>
                    {filteredAvailableMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                    ))}
                 </select>
               </div>

               <button 
                 type="submit" 
                 disabled={isSubmitting || !selectedMemberId} 
                 className="w-full py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:translate-y-[-2px] active:translate-y-0 transition-all disabled:opacity-50"
               >
                 {isSubmitting ? 'Processing...' : `Confirm Deployment to ${ministryName}`}
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MinistryModuleView;