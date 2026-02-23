
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { VisitationRecord, Member, UserProfile, AttendanceEvent } from '../types';

import VisitationWhatsAppView from './VisitationWhatsAppView';
import FirstTimersView from './FirstTimersView';

interface VisitationViewProps { userProfile: UserProfile | null; }

const VisitationView: React.FC<VisitationViewProps> = ({ userProfile }) => {
  const [activeTab, setActiveTab] = useState<'Registry' | 'AbsenteeRadar' | 'WhatsAppHub' | 'FirstTimers'>('AbsenteeRadar');
  const [records, setRecords] = useState<VisitationRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [attendanceEvents, setAttendanceEvents] = useState<AttendanceEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [absentees, setAbsentees] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Selection & Bulk State (Radar)
  const [selectedAbsentees, setSelectedAbsentees] = useState<string[]>([]);
  
  // Selection & Bulk State (Registry)
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  
  // Unified Wizard State
  const [isBroadcastWizardOpen, setIsBroadcastWizardOpen] = useState(false);
  const [broadcastIndex, setBroadcastIndex] = useState(0);
  const [broadcastMode, setBroadcastMode] = useState<'Radar' | 'Registry'>('Radar');
  const [templateType, setTemplateType] = useState('Standard Check-in');
  const [customMessage, setCustomMessage] = useState('');
  
  const [outreachMember, setOutreachMember] = useState<any>(null);
  const [whatsappMessage, setWhatsappMessage] = useState('');

  // Form State for New Case
  const [formData, setFormData] = useState({
    member_id: '',
    category: 'First-time Visitor' as VisitationRecord['category'],
    priority: 'Medium' as VisitationRecord['priority'],
    visit_date: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'Pending' as VisitationRecord['status']
  });

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const { data: mData } = await supabase.from('members').select('*').order('first_name');
      const { data: aEvents } = await supabase.from('attendance_events').select('*').order('event_date', { ascending: false });
      setMembers(mData || []); 
      setAttendanceEvents(aEvents || []);
      
      if (aEvents?.length && !selectedEventId) { 
        setSelectedEventId(aEvents[0].id); 
        fetchAbsentees(aEvents[0].id); 
      }
      
      const { data: vData } = await supabase
        .from('visitation_records')
        .select('*, members(*)')
        .order('created_at', { ascending: false });
      setRecords(vData || []);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const fetchAbsentees = async (eventId: string) => {
    if (!eventId) return;
    setSelectedAbsentees([]); 
    try {
      const { data } = await supabase
        .from('attendance_records')
        .select('*, members(*)')
        .eq('attendance_event_id', eventId)
        .in('status', ['Absent', 'Pending']);
      setAbsentees(data || []);
    } catch (err) { 
      console.error(err); 
    }
  };

  // Selection Logic
  const toggleSelectRadar = (id: string) => setSelectedAbsentees(prev => prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]);
  const toggleSelectAllRadar = () => setSelectedAbsentees(selectedAbsentees.length === absentees.length ? [] : absentees.map(a => a.members.id));
  
  const toggleSelectRecord = (id: string) => setSelectedRecordIds(prev => prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]);
  const toggleSelectAllRecords = () => setSelectedRecordIds(selectedRecordIds.length === records.length ? [] : records.map(r => r.id));

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.member_id) return alert("Select a congregant to continue.");
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('visitation_records').insert([formData]);
      if (error) throw error;
      alert("New Care Case Logged.");
      setIsModalOpen(false);
      setFormData({ member_id: '', category: 'First-time Visitor', priority: 'Medium', visit_date: new Date().toISOString().split('T')[0], notes: '', status: 'Pending' });
      fetchInitialData();
    } catch (err: any) {
      alert(`Provision Failure: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Template Logic
  const applyTemplate = (type: string, member: any) => {
    const name = member?.first_name || '[Name]';
    switch (type) {
      case 'Healing Prayer':
        return `Shalom ${name}! 🕊️ We are lifting you up in prayer for total healing and strength. The Lord is your shepherd. God bless you!`;
      case 'New Convert':
        return `Greetings ${name}! 🕊️ We are so happy for your decision to follow Christ. We are here to support your journey. See you soon at Faithhouse!`;
      case 'Service Missed':
        return `Shalom ${name}! 🕊️ We missed you at our recent service. We pray you are well and hope to see you in our next gathering!`;
      case 'Announcement':
        return `Greetings ${name}! 🕊️ Special announcement from Faithhouse Chapel: [Details]. We look forward to seeing you!`;
      default:
        return `Shalom ${name}! 🕊️ Just checking in to see how you are doing. Faithhouse Chapel is praying for your week. God bless you richly!`;
    }
  };

  const startBroadcast = (mode: 'Radar' | 'Registry') => {
    const targetCount = mode === 'Radar' ? selectedAbsentees.length : selectedRecordIds.length;
    if (targetCount === 0) return;
    setBroadcastMode(mode);
    setBroadcastIndex(0);
    setTemplateType('Standard Check-in');
    setIsBroadcastWizardOpen(true);
  };

  const getBroadcastMember = () => {
    if (broadcastMode === 'Radar') {
      const memberId = selectedAbsentees[broadcastIndex];
      return absentees.find(a => a.members.id === memberId)?.members;
    } else {
      const recordId = selectedRecordIds[broadcastIndex];
      return records.find(r => r.id === recordId)?.members;
    }
  };

  const executeBroadcastStep = () => {
    const member = getBroadcastMember();
    if (!member?.phone) {
      alert("Relay Error: No valid phone linked to this profile. Skipping...");
      advanceBroadcast();
      return;
    }
    const cleanPhone = member.phone.replace(/\D/g, '');
    const msg = applyTemplate(templateType, member);
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    advanceBroadcast();
  };

  const advanceBroadcast = () => {
    const targetCount = broadcastMode === 'Radar' ? selectedAbsentees.length : selectedRecordIds.length;
    if (broadcastIndex < targetCount - 1) {
      setBroadcastIndex(prev => prev + 1);
    } else {
      setIsBroadcastWizardOpen(false);
      setSelectedAbsentees([]);
      setSelectedRecordIds([]);
      alert("Broadcast Outreach Protocol Completed Successfully.");
    }
  };

  const handleWhatsAppOutreach = (member: any) => {
    if (!member) return; 
    setOutreachMember(member);
    setWhatsappMessage(applyTemplate('Standard Check-in', member));
    setIsWhatsAppModalOpen(true);
  };

  const executeWhatsAppRedirect = () => {
    if (!outreachMember?.phone) return alert("Relay Error: No phone number.");
    const cleanPhone = outreachMember.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`, '_blank');
    setIsWhatsAppModalOpen(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      
      {/* 1. Header Protocol */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-fh-green tracking-tighter uppercase leading-none">
            {activeTab === 'WhatsAppHub' ? 'Visitation WhatsApp Hub' : 
             activeTab === 'FirstTimers' ? 'First Timers & Visitors' : 'Pastoral Care & Outreach'}
          </h2>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">
            {activeTab === 'WhatsAppHub' ? 'Specialized Care & Follow-up Center' : 
             activeTab === 'FirstTimers' ? 'Guest Intake & Reception' : 'Retention & Follow-up'}
          </p>
        </div>
        <div className="flex bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm overflow-x-auto scrollbar-hide">
          <button onClick={() => setActiveTab('AbsenteeRadar')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'AbsenteeRadar' ? 'bg-cms-blue text-white shadow-xl' : 'text-slate-400 hover:text-cms-blue'}`}>Detection Radar</button>
          <button onClick={() => setActiveTab('Registry')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'Registry' ? 'bg-cms-blue text-white shadow-xl' : 'text-slate-400 hover:text-cms-blue'}`}>Care Registry</button>
          <button onClick={() => setActiveTab('FirstTimers')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'FirstTimers' ? 'bg-cms-blue text-white shadow-xl' : 'text-slate-400 hover:text-cms-blue'}`}>First Timers</button>
          <button onClick={() => setActiveTab('WhatsAppHub')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'WhatsAppHub' ? 'bg-cms-blue text-white shadow-xl' : 'text-slate-400 hover:text-cms-blue'}`}>WhatsApp Hub</button>
        </div>
      </div>

      {activeTab === 'AbsenteeRadar' ? (
        <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
          <div className="cms-card cms-card-rose bg-slate-950 p-10 rounded-[3rem] relative overflow-hidden group border-none shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cms-rose/5 blur-[100px] rounded-full"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
              <div className="space-y-2">
                 <p className="text-2xl font-black text-white uppercase tracking-tight leading-none">Target Service</p>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Select an active session to verify branch retention.</p>
              </div>
              <div className="flex-1 max-w-lg flex items-center gap-4">
                <select value={selectedEventId} onChange={(e) => { setSelectedEventId(e.target.value); fetchAbsentees(e.target.value); }} className="flex-1 px-8 py-5 bg-white/5 border border-white/10 rounded-[1.75rem] font-black text-xs uppercase tracking-widest text-fh-gold outline-none focus:ring-4 focus:ring-cms-rose/20 transition-all cursor-pointer">
                  <option value="" className="bg-slate-900">Choose Deployment Target...</option>
                  {attendanceEvents.map(ev => (<option key={ev.id} value={ev.id} className="bg-slate-900">{new Date(ev.event_date).toLocaleDateString()} - {ev.event_name}</option>))}
                </select>
                {absentees.length > 0 && (
                  <button onClick={toggleSelectAllRadar} className="px-6 py-5 bg-white/10 border border-white/10 rounded-[1.5rem] text-[9px] font-black text-white uppercase tracking-widest hover:bg-white/20 transition-all">
                    {selectedAbsentees.length === absentees.length ? 'Clear' : 'Select All'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="px-4 py-2 bg-rose-50 rounded-xl border border-rose-100 flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-cms-rose animate-ping"></div>
                   <span className="text-[10px] font-black text-cms-rose uppercase tracking-widest">{absentees.length} Absentees Detected</span>
                </div>
                {selectedAbsentees.length > 0 && (
                   <div className="px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3 animate-in zoom-in-95">
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{selectedAbsentees.length} Selected for Broadcast</span>
                   </div>
                )}
             </div>
             <div className="flex items-center gap-4">
                {selectedAbsentees.length > 0 && (
                   <button 
                      onClick={() => {
                         const numbers = selectedAbsentees.map(id => absentees.find(a => a.id === id)?.phone).filter(Boolean).join(', ');
                         navigator.clipboard.writeText(numbers);
                         alert('Phone numbers copied to clipboard.');
                      }}
                      className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-200 transition-all animate-in zoom-in-95"
                   >
                      Copy Numbers
                   </button>
                )}
                {selectedAbsentees.length > 0 && (
                  <button onClick={() => startBroadcast('Radar')} className="px-10 py-5 bg-emerald-500 text-white rounded-[1.75rem] font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl shadow-emerald-200 active:scale-95 transition-all flex items-center gap-3 animate-in slide-in-from-right-4">
                     <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                     Start Broadcast ({selectedAbsentees.length})
                  </button>
                )}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {absentees.length > 0 ? absentees.map(abs => {
              const isSelected = selectedAbsentees.includes(abs.members.id);
              return (
                <div 
                  key={abs.id} 
                  onClick={() => toggleSelectRadar(abs.members.id)}
                  className={`cms-card cms-card-rose bg-white rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl transition-all group overflow-hidden border-b-[8px] duration-500 cursor-pointer relative ${isSelected ? 'border-emerald-400 ring-4 ring-emerald-500/10' : 'border-slate-50 hover:border-cms-rose'}`}
                >
                  {isSelected && (
                    <div className="absolute top-6 right-6 w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg animate-in zoom-in-50">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}
                  <div className="flex items-center gap-6 mb-8">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-slate-900 text-fh-gold flex items-center justify-center font-black text-xs border border-white/10 shadow-lg group-hover:scale-110 transition-transform">
                      {abs.members?.first_name?.[0]}{abs.members?.last_name?.[0]}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-black text-slate-900 text-sm uppercase tracking-tight truncate">{abs.members?.first_name} {abs.members?.last_name}</p>
                      <p className="text-[9px] text-cms-rose font-black uppercase tracking-[0.3em] mt-1.5">Absent Note</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleWhatsAppOutreach(abs.members); }} 
                    className="w-full py-4 bg-emerald-500/10 text-emerald-600 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] hover:bg-emerald-500 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    Direct Outreach
                  </button>
                </div>
              );
            }) : (
              <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                <p className="text-slate-300 font-black uppercase tracking-[0.5em] italic">Radar scanning... No recent absentees detected</p>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'Registry' ? (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          {selectedRecordIds.length > 0 && (
            <div className="flex justify-end animate-in fade-in slide-in-from-top-2">
               <button onClick={() => startBroadcast('Registry')} className="px-10 py-5 bg-emerald-500 text-white rounded-[1.75rem] font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl shadow-emerald-200 active:scale-95 transition-all flex items-center gap-3">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 448 512"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.6-30.6-37.9-3.2-5.5-.3-8.5 2.5-11.2 2.5-2.5 5.5-6.5 8.3-9.7 2.8-3.3 3.7-5.6 5.6-9.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.3 5.7 23.6 9.2 31.7 11.7 13.3 4.2 25.5 3.6 35.1 2.2 10.7-1.5 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
                  Relay Protocol ({selectedRecordIds.length})
               </button>
            </div>
          )}

          <div className="cms-card cms-card-blue bg-white rounded-[3rem] overflow-hidden">
            <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <input 
                  type="checkbox" 
                  checked={selectedRecordIds.length === records.length && records.length > 0} 
                  onChange={toggleSelectAllRecords}
                  className="w-6 h-6 rounded-lg border-2 border-slate-200 text-cms-blue focus:ring-cms-blue cursor-pointer"
                />
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Master Care Ledger</h3>
              </div>
              <button onClick={() => setIsModalOpen(true)} className="px-8 py-4 bg-fh-green text-fh-gold rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-900 transition-all">+ New Case</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100">
                  <tr>
                    <th className="px-10 py-6">Identity</th>
                    <th className="px-10 py-6">Mission Type</th>
                    <th className="px-10 py-6">Status</th>
                    <th className="px-10 py-6 text-right">Relay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {records.length > 0 ? records.map(rec => {
                    const isSel = selectedRecordIds.includes(rec.id);
                    return (
                      <tr key={rec.id} className={`hover:bg-slate-50 transition-all group ${isSel ? 'bg-blue-50/30' : ''}`}>
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-4">
                            <input 
                              type="checkbox" 
                              checked={isSel} 
                              onChange={() => toggleSelectRecord(rec.id)}
                              className="w-5 h-5 rounded-md border-2 border-slate-200 text-cms-blue focus:ring-cms-blue cursor-pointer"
                            />
                            <div>
                              <p className="font-black text-slate-800 uppercase tracking-tight text-sm">{rec.members?.first_name} {rec.members?.last_name}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Priority: {rec.priority}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">{rec.category}</td>
                        <td className="px-10 py-6">
                           <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] border ${rec.status === 'Completed' ? 'bg-emerald-50 text-cms-emerald border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{rec.status}</span>
                        </td>
                        <td className="px-10 py-6 text-right">
                           <button onClick={() => handleWhatsAppOutreach(rec.members)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-90">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 448 512"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.6-30.6-37.9-3.2-5.5-.3-8.5 2.5-11.2 2.5-2.5 5.5-6.5 8.3-9.7 2.8-3.3 3.7-5.6 5.6-9.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.3 5.7 23.6 9.2 31.7 11.7 13.3 4.2 25.5 3.6 35.1 2.2 10.7-1.5 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
                           </button>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={4} className="px-10 py-32 text-center text-slate-300 font-black uppercase tracking-widest italic">No care records documented in registry</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'WhatsAppHub' ? (
        <div className="animate-in slide-in-from-right-4 duration-500">
          <VisitationWhatsAppView userProfile={userProfile} />
        </div>
      ) : (
        <div className="animate-in slide-in-from-right-4 duration-500">
          <FirstTimersView userProfile={userProfile} />
        </div>
      )}

      {/* UNIFIED BROADCAST WIZARD MODAL */}
      {isBroadcastWizardOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-2xl animate-in fade-in" onClick={() => setIsBroadcastWizardOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden border-b-[16px] border-emerald-500 animate-in zoom-in-95">
             <div className="p-12">
                <div className="flex items-center justify-between mb-10">
                   <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center shadow-xl">
                         <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                      </div>
                      <div>
                         <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Relay Hub</h4>
                         <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.4em] mt-2">Pastoral Outreach Deployment</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{broadcastIndex + 1} of {broadcastMode === 'Radar' ? selectedAbsentees.length : selectedRecordIds.length}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Transmission Queue</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                   <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Mission Protocol</p>
                      {(['Standard Check-in', 'Healing Prayer', 'New Convert', 'Service Missed', 'Announcement'] as const).map(t => (
                        <button key={t} onClick={() => setTemplateType(t)} className={`w-full py-4 px-6 rounded-2xl text-[9px] font-black uppercase tracking-widest text-left border transition-all ${templateType === t ? 'bg-fh-green text-fh-gold border-fh-green shadow-lg' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                           {t}
                        </button>
                      ))}
                   </div>
                   <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Drafted Message</p>
                      <div className="w-full p-6 bg-slate-50 border border-slate-200 rounded-3xl font-bold text-xs text-slate-600 shadow-inner italic leading-relaxed min-h-[160px]">
                         "{applyTemplate(templateType, getBroadcastMember())}"
                      </div>
                   </div>
                </div>

                <div className="bg-slate-950 p-10 rounded-[3rem] border border-white/5 mb-10 flex items-center gap-8 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
                   <div className="w-20 h-20 bg-fh-gold rounded-2xl flex items-center justify-center font-black text-fh-green text-lg shadow-xl shadow-fh-gold/10">
                      {getBroadcastMember()?.first_name?.[0]}{getBroadcastMember()?.last_name?.[0]}
                   </div>
                   <div>
                      <p className="text-xl font-black text-white uppercase tracking-tight leading-none mb-2">{getBroadcastMember()?.first_name} {getBroadcastMember()?.last_name}</p>
                      <p className="text-[10px] text-fh-gold font-bold uppercase tracking-widest">{getBroadcastMember()?.phone || 'No Phone Relay'}</p>
                   </div>
                </div>

                <div className="flex gap-4">
                   <button onClick={() => setIsBroadcastWizardOpen(false)} className="flex-1 py-6 bg-slate-100 text-slate-400 rounded-3xl font-black uppercase text-[11px] tracking-widest hover:bg-slate-200 transition-all">Terminate</button>
                   <button onClick={executeBroadcastStep} className="flex-[2] py-6 bg-emerald-500 text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-[0.4em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4">
                      Dispatch & Next
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* MODAL: NEW CARE CASE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-fh-green-dark/95 backdrop-blur-md animate-in fade-in" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border-b-[16px] border-fh-gold">
            <div className="p-12 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
               <div className="flex items-center gap-6">
                 <div className="w-16 h-16 bg-fh-green text-fh-gold rounded-[2rem] flex items-center justify-center shadow-xl">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                 </div>
                 <div>
                    <h3 className="text-3xl font-black text-fh-green uppercase leading-none tracking-tighter">Start Care</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-2">New Pastoral Visitation Entry</p>
                 </div>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-5 hover:bg-slate-100 rounded-full transition-all text-slate-400 active:scale-90"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <form onSubmit={handleCreateCase} className="p-12 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Congregant *</label>
                  <select required value={formData.member_id} onChange={e => setFormData({...formData, member_id: e.target.value})} className="w-full px-7 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800 outline-none transition-all">
                    <option value="">Choose Member...</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Deployment Date</label>
                  <input type="date" value={formData.visit_date} onChange={e => setFormData({...formData, visit_date: e.target.value})} className="w-full px-7 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Mission Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} className="w-full px-7 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800">
                    <option>First-time Visitor</option>
                    <option>Sick/Hospital</option>
                    <option>Bereaved</option>
                    <option>New Convert</option>
                    <option>Inactive/Backslidden</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Priority</label>
                  <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as any})} className="w-full px-7 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-slate-800">
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Pastoral Notes</label>
                  <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={3} className="w-full px-7 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-bold text-slate-700 resize-none" placeholder="Enter objective or background..."></textarea>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-fh-green text-fh-gold rounded-[2.5rem] font-black uppercase text-xs tracking-[0.4em] shadow-2xl active:scale-95 transition-all border-b-4 border-black/30 flex items-center justify-center gap-3">
                 {isSubmitting ? <div className="w-5 h-5 border-2 border-fh-gold/50 border-t-fh-gold animate-spin rounded-full" /> : "Authorize Care Mission"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: WHATSAPP INDIVIDUAL RELAY CONFIRMATION */}
      {isWhatsAppModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl animate-in fade-in" onClick={() => setIsWhatsAppModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[4rem] shadow-2xl p-16 text-center border-b-[12px] border-emerald-500 animate-in zoom-in-95">
             <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-inner border border-emerald-100">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 448 512"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.6-30.6-37.9-3.2-5.5-.3-8.5 2.5-11.2 2.5-2.5 5.5-6.5 8.3-9.7 2.8-3.3 3.7-5.6 5.6-9.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.3 5.7 23.6 9.2 31.7 11.7 13.3 4.2 25.5 3.6 35.1 2.2 10.7-1.5 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
             </div>
             <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-4">Direct Relay</h4>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em] mb-12">Authorized Outreach Link Generation</p>
             
             <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 mb-10 text-left">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Draft Message:</p>
                <p className="text-xs font-bold text-slate-600 leading-relaxed italic">"{whatsappMessage}"</p>
             </div>

             <div className="flex gap-4">
                <button onClick={() => setIsWhatsAppModalOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                <button onClick={executeWhatsAppRedirect} className="flex-[2] py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                   Authorize Outreach
                </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default VisitationView;
