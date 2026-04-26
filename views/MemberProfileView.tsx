
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { Member, AttendanceRecord, FinancialRecord, VisitationRecord } from '../types';

interface MemberProfileViewProps {
  memberId: string;
  onBack: () => void;
  onEdit?: () => void;
}

const MemberProfileView: React.FC<MemberProfileViewProps> = ({ memberId, onBack, onEdit }) => {
  const [member, setMember] = useState<Member | null>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [finances, setFinances] = useState<any[]>([]);
  const [visitations, setVisitations] = useState<VisitationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMemberData();
  }, [memberId]);

  const fetchMemberData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Member Basic Info
      const { data: mData, error: mErr } = await supabase
        .from('members')
        .select('*, branches(*)')
        .eq('id', memberId)
        .single();
      if (mErr) throw mErr;
      setMember(mData);

      // 2. Fetch Recent Attendance
      const { data: aData } = await supabase
        .from('attendance_records')
        .select('*, attendance_events(*)')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
        .limit(5);
      setAttendance(aData || []);

      // 3. Fetch Recent Care/Visitation
      const { data: vData } = await supabase
        .from('visitation_records')
        .select('*')
        .eq('member_id', memberId)
        .order('visit_date', { ascending: false })
        .limit(5);
      setVisitations(vData || []);

      // 4. Fetch Financial Contributions (Tithes)
      const { data: tData } = await supabase
        .from('tithe_entries')
        .select('*')
        .eq('member_id', memberId)
        .order('payment_date', { ascending: false });
      setFinances(tData || []);

    } catch (err) {
      console.error("Profile Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-6">
        <div className="w-16 h-16 border-4 border-fh-green/10 border-t-fh-green rounded-full animate-spin" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Accessing Database...</p>
      </div>
    );
  }

  if (!member) return <div className="p-20 text-center">Profile not found.</div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {/* 1. Header Protocol */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="p-4 bg-white border border-slate-200 rounded-[1.5rem] shadow-sm hover:bg-slate-50 transition-all text-slate-400 hover:text-fh-green active:scale-90"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h2 className="text-3xl font-black text-fh-green tracking-tighter uppercase leading-none">Identity Profile</h2>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-2">Member ID: ...{member.id.slice(-8)}</p>
          </div>
        </div>
        <div className="flex gap-4">
           <button onClick={() => window.print()} className="px-8 py-4 bg-white border border-slate-200 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-sm hover:bg-slate-50 transition-all">Print Dossier</button>
           <button onClick={onEdit} className="px-8 py-4 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Edit Record</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Column: Core Identity */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-50 text-center">
            <div className="w-32 h-32 bg-slate-900 text-fh-gold rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-4xl font-black shadow-2xl border-4 border-white">
              {member.first_name[0]}{member.last_name ? member.last_name[0] : ''}
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">{member.first_name} {member.last_name}</h3>
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
              member.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
              member.status === 'Visitor' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-slate-50 text-slate-400 border-slate-200'
            }`}>
              {member.status} Tier
            </span>

            <div className="mt-10 pt-10 border-t border-slate-50 space-y-6 text-left">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Relay Contact</p>
                  <p className="text-sm font-bold text-slate-700">{member.phone || 'Not Linked'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">GPS Registry</p>
                  <p className="text-sm font-bold text-slate-700">{member.gps_address || 'Unmapped'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Branch</p>
                  <p className="text-sm font-bold text-slate-700">{member.branches?.name || 'Main Campus'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Follow-Up Status</p>
                  <p className={`text-sm font-bold ${
                    member.follow_up_status === 'Completed' ? 'text-emerald-600' :
                    member.follow_up_status === 'Visited' ? 'text-blue-600' :
                    member.follow_up_status === 'Contacted' ? 'text-purple-600' : 'text-rose-600'
                  }`}>{member.follow_up_status || 'Pending'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-fh-gold/10 blur-[50px] rounded-full"></div>
            <h4 className="text-[10px] font-black text-fh-gold uppercase tracking-[0.3em] mb-8">Emergency Protocols</h4>
            <div className="space-y-6">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Primary Contact</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">{member.emergency_contact_name || 'Not Specified'}</p>
                  {member.emergency_contact_relationship && (
                    <span className="text-[8px] font-black text-fh-gold uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded-md">{member.emergency_contact_relationship}</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Emergency Relay</p>
                <p className="text-sm font-bold text-fh-gold">{member.emergency_contact_phone || '---'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-50">
            <h4 className="text-[10px] font-black text-fh-green uppercase tracking-[0.3em] mb-8">Professional Dossier</h4>
            <div className="space-y-6">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Occupation</p>
                <p className="text-sm font-bold text-slate-700">{member.occupation || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Employment</p>
                <p className="text-sm font-bold text-slate-700">{member.place_of_work || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Education</p>
                <p className="text-sm font-bold text-slate-700">{member.educational_level || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Marital Registry</p>
                <p className="text-sm font-bold text-slate-700">{member.marital_status || 'Single'}</p>
              </div>
              <div className="pt-4 flex flex-wrap gap-2">
                {member.water_baptised && <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[8px] font-black uppercase border border-blue-100">Water Baptised</span>}
                {member.holy_ghost_baptised && <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[8px] font-black uppercase border border-amber-100">Holy Ghost Baptised</span>}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-50">
            <h4 className="text-[10px] font-black text-fh-green uppercase tracking-[0.3em] mb-8">Household Registry</h4>
            <div className="space-y-6">
              {member.marital_status === 'Married' && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Spouse</p>
                   <p className="text-sm font-bold text-slate-700">{member.spouse_name || 'Not Listed'}</p>
                   <p className="text-[10px] text-fh-green font-black mt-1">{member.spouse_phone || '---'}</p>
                </div>
              )}
              
              <div className="space-y-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Children ({member.children?.length || 0})</p>
                {(member.children || []).length > 0 ? member.children?.map((child, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{child.name}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(child.dob).toLocaleDateString()} • {child.gender}</p>
                    </div>
                    {child.phone && <span className="text-[9px] font-black text-fh-green">{child.phone}</span>}
                  </div>
                )) : (
                  <p className="text-[10px] text-slate-300 font-black uppercase italic">No children data</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Activity & History */}
        <div className="lg:col-span-8 space-y-10">
          
          {/* Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 px-1">
            <div className="bg-white p-3 md:p-6 rounded-2xl border border-slate-50 shadow-sm flex flex-col justify-between min-h-[90px] md:min-h-[110px]">
              <div>
                <p className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Service Loyalty</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <h3 className="text-base md:text-xl font-black text-slate-900 tracking-tighter">
                    {attendance.filter(a => a.status === 'Present').length}/5
                  </h3>
                  <span className="text-[8px] md:text-[10px] font-bold text-emerald-500 uppercase">Stable</span>
                </div>
              </div>
              <p className="text-[7px] md:text-[8px] text-slate-400 font-bold uppercase mt-2">Last 5 Sessions</p>
            </div>
            <div className="bg-white p-3 md:p-6 rounded-2xl border border-slate-50 shadow-sm flex flex-col justify-between min-h-[90px] md:min-h-[110px]">
              <div>
                <p className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Care Missions</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <h3 className="text-base md:text-xl font-black text-slate-900 tracking-tighter">{visitations.length}</h3>
                  <span className="text-[8px] md:text-[10px] font-bold text-blue-500 uppercase">Active</span>
                </div>
              </div>
              <p className="text-[7px] md:text-[8px] text-slate-400 font-bold uppercase mt-2">Total Visitations</p>
            </div>
            <div className="bg-white p-3 md:p-6 rounded-2xl border border-slate-50 shadow-sm flex flex-col justify-between min-h-[90px] md:min-h-[110px] col-span-2 lg:col-span-1">
              <div>
                <p className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Financial Loyalty</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <h3 className="text-base md:text-xl font-black text-fh-green tracking-tighter">
                    GHS {finances.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0).toLocaleString()}
                  </h3>
                  <span className="text-[8px] md:text-[10px] font-bold text-fh-gold uppercase">Giver</span>
                </div>
              </div>
              <p className="text-[7px] md:text-[8px] text-slate-400 font-bold uppercase mt-2">Total Tithes Recorded</p>
            </div>
          </div>

          {/* Attendance History */}
          <div className="bg-white rounded-[3rem] overflow-hidden border border-slate-50 shadow-sm">
            <div className="px-10 py-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendance Timeline</h4>
              <span className="text-[8px] font-black text-cms-blue uppercase tracking-widest">Recent Activity</span>
            </div>
            <div className="p-10">
              <div className="space-y-4">
                {attendance.length > 0 ? attendance.map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${a.status === 'Present' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                      <div>
                        <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{a.attendance_events?.event_name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(a.attendance_events?.event_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                      a.status === 'Present' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      {a.status}
                    </span>
                  </div>
                )) : (
                  <p className="text-center py-10 text-[10px] font-black text-slate-300 uppercase tracking-widest italic">No attendance records found</p>
                )}
              </div>
            </div>
          </div>

          {/* Care History */}
          <div className="bg-white rounded-[3rem] overflow-hidden border border-slate-50 shadow-sm">
            <div className="px-10 py-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financial Contributions</h4>
              <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Tithe History</span>
            </div>
            <div className="p-10">
              <div className="space-y-4">
                {finances.length > 0 ? finances.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-fh-green text-fh-gold rounded-xl flex items-center justify-center font-black text-[10px]">
                        GHS
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">GHS {f.amount.toLocaleString()}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(f.payment_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 bg-white border border-emerald-100 rounded-lg text-[8px] font-black text-emerald-600 uppercase tracking-widest">
                        {f.payment_method}
                      </span>
                      <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">{f.service_type}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-center py-10 text-[10px] font-black text-slate-300 uppercase tracking-widest italic">No financial records found</p>
                )}
              </div>
            </div>
          </div>

          {/* Care History */}
          <div className="bg-white rounded-[3rem] overflow-hidden border border-slate-50 shadow-sm">
            <div className="px-10 py-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pastoral Care Logs</h4>
              <span className="text-[8px] font-black text-cms-purple uppercase tracking-widest">Retention History</span>
            </div>
            <div className="p-10">
              <div className="space-y-6">
                {visitations.length > 0 ? visitations.map((v, i) => (
                  <div key={i} className="relative pl-8 border-l-2 border-slate-100 pb-6 last:pb-0">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 bg-white border-2 border-cms-purple rounded-full"></div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{v.category}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(v.visit_date).toLocaleDateString()}</p>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed italic">"{v.notes || 'No notes documented'}"</p>
                      <div className="flex gap-2">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[7px] font-black uppercase tracking-widest rounded">{v.status}</span>
                        <span className={`px-2 py-0.5 text-[7px] font-black uppercase tracking-widest rounded ${
                          v.priority === 'High' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'
                        }`}>{v.priority} Priority</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-center py-10 text-[10px] font-black text-slate-300 uppercase tracking-widest italic">No care records documented</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MemberProfileView;
