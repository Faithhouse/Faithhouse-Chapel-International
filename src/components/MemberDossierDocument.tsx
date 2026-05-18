
import React from 'react';
import { Member, VisitationRecord } from '../../types';

interface MemberDossierDocumentProps {
  member: Member;
  attendance: any[];
  finances: any[];
  visitations: VisitationRecord[];
  dateGenerated: string;
}

const MemberDossierDocument: React.FC<MemberDossierDocumentProps> = ({
  member,
  attendance,
  finances,
  visitations,
  dateGenerated
}) => {
  const logoUrl = "https://lh3.googleusercontent.com/d/1la57sO6NOuNEZaqa9zDxuxRnWPBavkjH";

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Playfair+Display:wght@700;900&display=swap');
    
    @media print {
      body { background: white !important; margin: 0; padding: 0; }
      .no-print { display: none !important; }
      @page { margin: 0; size: A4; }
      .document-container { 
        box-shadow: none !important; 
        border: none !important; 
        width: 100% !important; 
        max-width: none !important; 
        padding: 45mm 20mm 20mm 20mm !important;
        margin: 0 !important;
      }
      .letterhead-border {
        position: fixed;
        padding: 10mm 20mm !important;
      }
    }
    .document-container { 
      background: white; 
      color: black; 
      padding: 50mm 60px 60px 60px; 
      max-width: 210mm; 
      margin: 20px auto; 
      font-family: 'Inter', sans-serif; 
      min-height: 297mm; 
      border: 1px solid #e2e8f0;
      position: relative;
      overflow: hidden;
    }
    .letterhead-border {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 40mm;
      border-bottom: 2px solid #004d40;
      background: #fdfdfd;
      z-index: 10;
      padding: 40px 60px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .letterhead-info { text-align: right; color: #004d40; }
    
    .official-seal {
      position: absolute;
      bottom: 60px;
      right: 60px;
      width: 120px;
      height: 120px;
      border: 4px double #004d40;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 10px;
      opacity: 0.15;
      transform: rotate(-15deg);
      pointer-events: none;
    }
    .official-seal p {
      font-size: 8pt;
      font-weight: 900;
      text-transform: uppercase;
      line-height: 1;
      color: #004d40;
    }
    
    .section-title { 
      font-size: 11pt; 
      font-weight: 900; 
      margin-top: 35px; 
      margin-bottom: 20px; 
      color: #004d40;
      display: flex;
      align-items: center;
      gap: 15px;
      font-family: 'Playfair Display', serif;
      text-transform: uppercase;
    }
    .section-title::after {
      content: '';
      flex: 1;
      height: 1.5px;
      background: linear-gradient(to right, #e2e8f0, transparent);
    }
    
    .data-grid { display: grid; grid-template-cols: repeat(2, 1fr); gap: 20px 40px; }
    .data-item { margin-bottom: 5px; }
    .data-label { font-size: 7.5pt; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 0.1em; display: block; margin-bottom: 3px; }
    .data-value { font-size: 10pt; font-weight: 700; color: #0f172a; }
    
    table { border-collapse: collapse; width: 100%; margin-bottom: 30px; }
    th, td { border: 1px solid #e2e8f0; padding: 10px 14px; text-align: left; font-size: 8.5pt; }
    th { background-color: #f8fafc; font-weight: 900; text-transform: uppercase; color: #004d40; font-size: 7pt; letter-spacing: 0.1em; }
    
    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 7pt;
      font-weight: 900;
      text-transform: uppercase;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
    }
  `;

  return (
    <div className="document-container">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="letterhead-border">
        <div className="flex items-center gap-5">
          <img src={logoUrl} alt="Logo" className="w-14 h-14 object-contain" referrerPolicy="no-referrer" />
          <div>
            <h2 className="text-xl font-black tracking-tighter text-[#004d40] uppercase leading-none">Faithhouse Chapel</h2>
            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Statistical & Registry Dept.</p>
          </div>
        </div>
        <div className="letterhead-info">
          <p className="text-[8pt] font-black uppercase tracking-widest leading-none">Church Registry Dossier</p>
          <p className="text-[7pt] font-medium opacity-70 mt-1">Ref: {member.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <div className="official-seal">
        <p>Church<br/>Registry<br/>OFFICIAL<br/>{new Date().getFullYear()}</p>
      </div>

      {/* HEADER STATEMENT */}
      <div className="mb-12 relative z-10 pt-6">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter font-serif uppercase">Member Dossier</h1>
        <p className="text-[9pt] text-slate-400 font-black uppercase tracking-[0.3em] mt-3">Identity Confidential Record</p>
      </div>

      {/* BASIC IDENTITY */}
      <h2 className="section-title">I. Personal Identification</h2>
      <div className="data-grid mb-10">
        <div className="data-item">
          <span className="data-label">Full Legal Name</span>
          <span className="data-value">{member.first_name} {member.last_name}</span>
        </div>
        <div className="data-item">
          <span className="data-label">Identity ID</span>
          <span className="data-value">FH-{member.id.slice(-8).toUpperCase()}</span>
        </div>
        <div className="data-item">
          <span className="data-label">Gender</span>
          <span className="data-value">{member.gender || 'Not Recorded'}</span>
        </div>
        <div className="data-item">
          <span className="data-label">Date of Birth</span>
          <span className="data-value">{member.dob ? new Date(member.dob).toLocaleDateString() : 'N/A'}</span>
        </div>
        <div className="data-item">
          <span className="data-label">Hometown</span>
          <span className="data-value">{member.hometown || 'N/A'}</span>
        </div>
        <div className="data-item">
          <span className="data-label">Registry Phone</span>
          <span className="data-value">{member.phone || 'N/A'}</span>
        </div>
      </div>

      {/* ECCLESIASTICAL STATUS */}
      <h2 className="section-title">II. Ecclesiastical Status</h2>
      <div className="data-grid mb-10">
        <div className="data-item">
          <span className="data-label">Membership Tier</span>
          <span className="data-value status-badge">{member.status} Member</span>
        </div>
        <div className="data-item">
          <span className="data-label">Assigned Branch</span>
          <span className="data-value">{member.branches?.name || 'Main Campus'}</span>
        </div>
        <div className="data-item">
          <span className="data-label">Water Baptism</span>
          <span className="data-value">{member.water_baptised ? 'CERTIFIED' : 'PENDING'}</span>
        </div>
        <div className="data-item">
          <span className="data-label">Holy Ghost Baptism</span>
          <span className="data-value">{member.holy_ghost_baptised ? 'CONFIRMED' : 'PENDING'}</span>
        </div>
        <div className="data-item">
          <span className="data-label">Admission Date</span>
          <span className="data-value">{member.created_at ? new Date(member.created_at).toLocaleDateString() : '---'}</span>
        </div>
        <div className="data-item">
          <span className="data-label">Current Ministry</span>
          <span className="data-value">{member.ministry || 'N/A'}</span>
        </div>
      </div>

      {/* HOUSEHOLD & PROFESSIONAL */}
      <h2 className="section-title">III. Household & Professional Registry</h2>
      <div className="data-grid mb-10">
        <div className="data-item">
          <span className="data-label">Marital Status</span>
          <span className="data-value">{member.marital_status || 'Single'}</span>
        </div>
        <div className="data-item">
          <span className="data-label">Spouse Name</span>
          <span className="data-value">{member.spouse_name || 'N/A'}</span>
        </div>
        <div className="data-item">
          <span className="data-label">Professional Occupation</span>
          <span className="data-value">{member.occupation || 'N/A'}</span>
        </div>
        <div className="data-item">
          <span className="data-label">Educational Level</span>
          <span className="data-value">{member.educational_level || 'N/A'}</span>
        </div>
        <div className="data-item col-span-2">
          <span className="data-label">Home Digital Address (GPS)</span>
          <span className="data-value">{member.gps_address || 'Unmapped Location'}</span>
        </div>
      </div>

      {/* SUMMARY TABLES */}
      <h2 className="section-title">IV. Recent Spiritual Engagement Summary</h2>
      <div className="mb-8">
        <p className="text-[7pt] font-black uppercase text-slate-400 mb-2">Recent Attendance Sessions</p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Service Name</th>
              <th>Status</th>
              <th>Registry Signature</th>
            </tr>
          </thead>
          <tbody>
            {(attendance.slice(0, 3) || []).map((a, i) => (
              <tr key={i}>
                <td>{new Date(a.attendance_events?.event_date).toLocaleDateString()}</td>
                <td>{a.attendance_events?.event_name}</td>
                <td>{a.status}</td>
                <td className="italic text-[7pt] opacity-30">Church Record System Auto-Signed</td>
              </tr>
            ))}
            {attendance.length === 0 && (
              <tr><td colSpan={4} className="text-center italic opacity-40">No attendance data extracted</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* EMERGENCY PROTOCOL */}
      <div className="mt-12 bg-slate-900 text-white p-8 rounded-2xl relative">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-fh-gold">Emergency Contact Protocol</h3>
          <span className="bg-rose-600 text-white text-[7px] font-black uppercase px-2 py-1 rounded">Priority Relay</span>
        </div>
        <div className="grid grid-cols-2 gap-12">
          <div>
            <p className="text-[7pt] font-black text-slate-500 uppercase tracking-widest mb-1">Dossier Name</p>
            <p className="text-sm font-bold">{member.emergency_contact_name || 'NOT SPECIFIED'}</p>
          </div>
          <div>
            <p className="text-[7pt] font-black text-slate-500 uppercase tracking-widest mb-1">Direct Secure Line</p>
            <p className="text-sm font-bold text-fh-gold">{member.emergency_contact_phone || '---'}</p>
          </div>
        </div>
      </div>

      {/* FINAL AUTH */}
      <div className="mt-24 grid grid-cols-2 gap-24">
        <div className="text-center pt-4 border-t-2 border-slate-900">
          <p className="text-[8pt] font-black uppercase tracking-widest">General Secretary</p>
          <p className="text-[7pt] text-slate-400 uppercase mt-1">Faithhouse Chapel Registry</p>
        </div>
        <div className="text-center pt-4 border-t-2 border-slate-900">
          <p className="text-[8pt] font-black uppercase tracking-widest">Head Pastor</p>
          <p className="text-[7pt] text-slate-400 uppercase mt-1">Ecclesiastical Authorization</p>
        </div>
      </div>

      <div className="mt-20 pt-8 border-t border-slate-100 flex justify-between items-center text-[7pt] text-slate-400 font-black uppercase tracking-[0.2em]">
        <p>Record Valid as of {dateGenerated} • Faithhouse Chapel International</p>
        <p>Page 01/01</p>
      </div>
    </div>
  );
};

export default MemberDossierDocument;
