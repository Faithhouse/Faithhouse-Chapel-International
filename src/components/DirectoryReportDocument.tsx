import React from 'react';

interface ContactRecord {
  id: string;
  type: 'Member' | 'Guest' | 'Visitor';
  name: string;
  phone: string;
  email: string;
  dateAdded: string;
  status: string;
}

interface DirectoryReportDocumentProps {
  organizationName: string;
  dateGenerated: string;
  contacts: any[];
  totalMembersCount: number;
  totalGuestsCount: number;
  filterType: 'all' | 'members' | 'guests';
}

const DirectoryReportDocument: React.FC<DirectoryReportDocumentProps> = ({
  organizationName,
  dateGenerated,
  contacts,
  totalMembersCount,
  totalGuestsCount,
  filterType,
}) => {
  const logoUrl = "https://lh3.googleusercontent.com/d/1la57sO6NOuNEZaqa9zDxuxRnWPBavkjH";

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&family=Playfair+Display:wght@700;900&display=swap');
    
    @media print {
      body { background: white !important; margin: 0; padding: 0; }
      .no-print { display: none !important; }
      @page { margin: 0; size: A4 portrait; }
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
      padding: 50mm 60px 40px 60px; 
      max-width: 210mm; 
      margin: 20px auto; 
      font-family: 'Inter', sans-serif; 
      min-height: 297mm; 
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
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
      border-bottom: 2px solid #0f172a;
      background: #fbfbfd;
      z-index: 10;
      padding: 40px 60px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .letterhead-logo {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .logo-img {
      width: 50px;
      height: 50px;
      object-fit: contain;
    }

    .church-title-head {
      font-family: 'Playfair Display', serif;
      font-weight: 900;
      font-size: 15pt;
      color: #0f172a;
      line-height: 1.1;
      text-transform: uppercase;
    }

    .church-sub-head {
      font-size: 7.5pt;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.2em;
      text-transform: uppercase;
    }
    
    .letterhead-info {
      text-align: right;
      color: #334155;
    }

    .letterhead-info p {
      margin: 0;
      font-size: 8pt;
      font-weight: 500;
    }

    .letterhead-info .bold-info {
      font-weight: 900;
      text-transform: uppercase;
      color: #475569;
      letter-spacing: 0.05em;
    }
    
    .official-seal {
      position: absolute;
      bottom: 40px;
      right: 40px;
      width: 110px;
      height: 110px;
      border: 4px double #475569;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 10px;
      opacity: 0.1;
      transform: rotate(-15deg);
      pointer-events: none;
    }
    
    .official-seal p {
      font-size: 7pt;
      font-weight: 900;
      text-transform: uppercase;
      line-height: 1.2;
      color: #0f172a;
    }
    
    .directory-title {
      font-family: 'Playfair Display', serif;
      font-size: 14pt;
      font-weight: 900;
      margin-top: 20px;
      margin-bottom: 5px;
      color: #0f172a;
      text-transform: uppercase;
    }

    .directory-desc {
      font-size: 8.5pt;
      color: #475569;
      margin-bottom: 25px;
    }

    table { border-collapse: collapse; width: 100%; margin-bottom: 30px; }
    th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; font-size: 8.5pt; }
    th { background-color: #f8fafc; font-weight: 900; text-transform: uppercase; color: #0f172a; font-size: 7.5pt; letter-spacing: 0.12em; }
    
    .bento-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    
    .bento-item {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 15px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.01);
      border-left: 4px solid #0f172a;
    }
    
    .summary-item-label { font-size: 6.5pt; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 5px; }
    .summary-item-value { font-size: 13pt; font-weight: 900; color: #0f172a; }

    .tag-member {
      background-color: #eff6ff;
      color: #1e40af;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 7pt;
      font-weight: 900;
      text-transform: uppercase;
      display: inline-block;
    }

    .tag-guest {
      background-color: #fef2f2;
      color: #991b1b;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 7pt;
      font-weight: 900;
      text-transform: uppercase;
      display: inline-block;
    }
  `;

  return (
    <div className="document-container">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      
      {/* Letterhead */}
      <div className="letterhead-border">
        <div className="letterhead-logo">
          <img src={logoUrl} referrerPolicy="no-referrer" alt="Seal" className="logo-img" />
          <div>
            <h1 className="church-title-head">{organizationName}</h1>
            <p className="church-sub-head">The Wonders Cathedral</p>
          </div>
        </div>
        <div className="letterhead-info">
          <p className="bold-info">Pastor Prince Monovis</p>
          <p>Founder & General Overseer</p>
        </div>
      </div>

      {/* Report Summary */}
      <div className="directory-title">
        {filterType === 'guests' ? 'visitors registry directory' : (filterType === 'members' ? 'members registry directory' : 'Registry Directory')}
      </div>

      <div style={{ marginBottom: '25px', fontSize: '10pt', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Total Registered Persons: <span style={{ color: '#0f172a', fontWeight: 900 }}>{contacts.length}</span>
      </div>

      {/* Main Table */}
      <table>
        <thead>
          <tr>
            <th style={{ width: '40px' }}>No.</th>
            <th>Full Name</th>
            <th style={{ width: '180px' }}>Contact</th>
            {filterType !== 'members' && (
              <th style={{ width: '180px' }}>Date Visited</th>
            )}
          </tr>
        </thead>
        <tbody>
          {contacts.map((c, index) => (
            <tr key={c.id || index}>
              <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#64748b' }}>{index + 1}</td>
              <td style={{ fontWeight: '700', color: '#0f172a' }}>{c.name}</td>
              <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#1e293b' }}>
                {c.phone ? c.phone : '---'}
              </td>
              {filterType !== 'members' && (
                <td style={{ fontSize: '8pt', color: '#475569', fontWeight: c.type === 'Guest' ? '700' : 'normal' }}>
                  {c.type === 'Guest' && c.dateAdded ? new Date(c.dateAdded).toLocaleDateString('en-GB') : '---'}
                </td>
              )}
            </tr>
          ))}
          {contacts.length === 0 && (
            <tr>
              <td colSpan={filterType !== 'members' ? 4 : 3} style={{ textAlign: 'center', fontStyle: 'italic', padding: '30px', color: '#94a3b8' }}>
                No contact records available to display.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Seal decoration */}
      <div className="official-seal">
        <p>Faithhouse Chapel Int'l<br/>Registry<br/></p>
      </div>
    </div>
  );
};

export default DirectoryReportDocument;
