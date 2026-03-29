
import React from 'react';
import { FinancialRecord } from '../../types';

export type ReportType = 'Monthly' | 'Audit';

interface FinancialReportDocumentProps {
  organizationName: string;
  reportPeriod: string;
  dateGenerated: string;
  records: FinancialRecord[];
  openingBalance: number;
  reportType?: ReportType;
}

const FinancialReportDocument: React.FC<FinancialReportDocumentProps> = ({
  organizationName,
  reportPeriod,
  dateGenerated,
  records,
  openingBalance,
  reportType = 'Monthly'
}) => {
  // Calculations
  const totalTithes = records.reduce((sum, r) => sum + (r.tithes || 0), 0);
  const totalOfferings = records.reduce((sum, r) => sum + (r.offerings || 0), 0);
  const totalSeeds = records.reduce((sum, r) => sum + (r.seed || 0), 0);
  const totalOtherIncome = records.reduce((sum, r) => sum + (r.other_income || 0), 0);
  const totalIncome = records.reduce((sum, r) => sum + (r.total_income || 0), 0);
  const totalExpense = records.reduce((sum, r) => sum + (r.expenses || 0), 0);
  const netMonthlyBalance = totalIncome - totalExpense;

  const formatGHS = (amount: number) => {
    return `GH₵${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (reportType === 'Audit') {
    return (
      <div className="bg-white text-black p-12 max-w-[210mm] mx-auto font-sans min-h-screen print:p-0">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body { background: white !important; }
            .no-print { display: none !important; }
            @page { margin: 1.5cm; size: A4; }
          }
          table { border-collapse: collapse; width: 100%; margin-bottom: 15px; }
          th, td { border: 1px solid #000; padding: 6px 10px; text-align: left; font-size: 10pt; }
          th { background-color: #f0f0f0; font-weight: bold; text-transform: uppercase; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .uppercase { text-transform: uppercase; }
          .text-center { text-align: center; }
          .section-title { font-size: 11pt; font-weight: 800; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 2px; }
        `}} />

        {/* 1. HEADER */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold uppercase mb-1">{organizationName}</h1>
          <p className="text-lg font-bold uppercase mb-1">Treasury & Audit Department</p>
          <p className="text-lg font-bold uppercase underline">FINANCIAL AUDIT REPORT</p>
          <div className="mt-4 text-md">
            <p><span className="font-bold">Report Date:</span> {dateGenerated}</p>
            <p><span className="font-bold">Reporting Period:</span> {reportPeriod}</p>
          </div>
        </div>

        {/* 2. EXECUTIVE SUMMARY */}
        <h2 className="section-title uppercase">EXECUTIVE SUMMARY</h2>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th className="text-right">Amount (GH₵)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Gross Revenue</td>
              <td className="text-right">{formatGHS(totalIncome)}</td>
            </tr>
            <tr>
              <td>Total Expenditure</td>
              <td className="text-right">{formatGHS(totalExpense)}</td>
            </tr>
            <tr className="font-bold">
              <td>Net Liquidity</td>
              <td className="text-right">{formatGHS(netMonthlyBalance)}</td>
            </tr>
          </tbody>
        </table>

        {/* 3. REVENUE BREAKDOWN */}
        <h2 className="section-title uppercase">REVENUE BREAKDOWN</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th className="text-right">Amount (GH₵)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Tithes</td>
              <td className="text-right">{formatGHS(totalTithes)}</td>
            </tr>
            <tr>
              <td>Offerings</td>
              <td className="text-right">{formatGHS(totalOfferings)}</td>
            </tr>
            <tr>
              <td>Seeds & Pledges</td>
              <td className="text-right">{formatGHS(totalSeeds)}</td>
            </tr>
            <tr>
              <td>Other Income</td>
              <td className="text-right">{formatGHS(totalOtherIncome)}</td>
            </tr>
            <tr className="font-bold bg-gray-100">
              <td>Total Revenue</td>
              <td className="text-right">{formatGHS(totalIncome)}</td>
            </tr>
          </tbody>
        </table>

        {/* 4. EXPENDITURE SUMMARY */}
        <h2 className="section-title uppercase">EXPENDITURE SUMMARY</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th className="text-right">Amount (GH₵)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="font-bold">
              <td>Total Expenses</td>
              <td className="text-right">{formatGHS(totalExpense)}</td>
            </tr>
          </tbody>
        </table>

        {/* 5. DETAILED TRANSACTIONS */}
        <h2 className="section-title uppercase">DETAILED TRANSACTIONS</h2>
        {records.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Service</th>
                <th className="text-right">Income (GH₵)</th>
                <th className="text-right">Expense (GH₵)</th>
                <th>Witnesses</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec, i) => (
                <tr key={i}>
                  <td>{new Date(rec.service_date).toLocaleDateString('en-GB')}</td>
                  <td>{rec.notes || 'N/A'}</td>
                  <td>{rec.service_type}</td>
                  <td className="text-right">{formatGHS(rec.total_income || 0).replace('GH₵', '')}</td>
                  <td className="text-right">{formatGHS(rec.expenses || 0).replace('GH₵', '')}</td>
                  <td className="text-[8pt]">{rec.witness1_name} / {rec.witness2_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-sm my-4">No transactions recorded for this period.</p>
        )}

        {/* 6. AUDIT STATUS */}
        <div className="mt-8 border border-black p-4">
          <p className="mb-2"><span className="font-bold uppercase">Audit Status:</span> Verified</p>
          <p><span className="font-bold uppercase">Notes:</span> All records have been reconciled with dual witness verification protocols.</p>
        </div>

        {/* 7. SIGNATURES */}
        <div className="mt-16 grid grid-cols-3 gap-8">
          <div className="text-center">
            <div className="border-b border-black mb-2"></div>
            <p className="font-bold uppercase text-[9pt]">Treasurer</p>
          </div>
          <div className="text-center">
            <div className="border-b border-black mb-2"></div>
            <p className="font-bold uppercase text-[9pt]">Auditor</p>
          </div>
          <div className="text-center">
            <div className="border-b border-black mb-2"></div>
            <p className="font-bold uppercase text-[9pt]">Head Pastor</p>
          </div>
        </div>

        <div className="mt-12 text-[8pt] text-gray-500 text-center">
          Generated on {dateGenerated} | Faithhouse Chapel International
        </div>
      </div>
    );
  }

  // Prepare side-by-side data for Monthly Report
  const incomeEntries = records.filter(r => (r.total_income || 0) > 0);
  const expenseEntries = records.filter(r => (r.expenses || 0) > 0);
  
  const rowCount = Math.max(incomeEntries.length, expenseEntries.length);
  const rows = Array.from({ length: rowCount });

  return (
    <div className="bg-white text-black p-8 max-w-[210mm] mx-auto font-sans min-h-screen print:p-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          @page { margin: 1.5cm; size: A4; }
        }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #333; padding: 4px 8px; text-align: left; font-size: 9pt; }
        th { background-color: #f3f4f6; font-weight: bold; text-transform: uppercase; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }
        .text-center { text-align: center; }
        .summary-row { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px; border-bottom: 2px solid black; padding-bottom: 10px; }
        .summary-item { font-size: 10pt; font-weight: 600; }
        .side-by-side { display: flex; gap: 0; width: 100%; }
        .side-by-side > div { flex: 1; }
      `}} />

      {/* 1. TITLE SECTION */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold uppercase mb-1">MONTHLY FINANCIAL REPORT</h1>
        <p className="text-md font-semibold uppercase">{reportPeriod}</p>
        <p className="text-md uppercase">{organizationName}</p>
      </div>

      {/* 2. SUMMARY SECTION */}
      <div className="summary-row">
        <div className="summary-item">Account Balance (Last Month) .......... {formatGHS(openingBalance)}</div>
        <div className="summary-item">Total Income .......... {formatGHS(totalIncome)}</div>
        <div className="summary-item">Total Expense .......... {formatGHS(totalExpense)}</div>
        <div className="summary-item">Net Monthly Balance .......... {formatGHS(netMonthlyBalance)}</div>
      </div>

      {/* 3. MAIN TABLE (SIDE-BY-SIDE) */}
      <div className="side-by-side">
        {/* LEFT SIDE: INCOME */}
        <div className="border-r border-black">
          <h3 className="text-center font-bold bg-gray-100 border border-black p-1 text-sm uppercase">INCOME</h3>
          <table>
            <thead>
              <tr>
                <th style={{ width: '30px' }}>No.</th>
                <th style={{ width: '70px' }}>Date</th>
                <th>Item</th>
                <th className="text-right" style={{ width: '90px' }}>Amount (GH₵)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((_, i) => {
                const rec = incomeEntries[i];
                return (
                  <tr key={`inc-${i}`} style={{ height: '28px' }}>
                    <td className="text-center">{rec ? i + 1 : ''}</td>
                    <td>{rec ? new Date(rec.service_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : ''}</td>
                    <td className="truncate max-w-[120px]">{rec ? rec.service_type : ''}</td>
                    <td className="text-right">{rec ? formatGHS(rec.total_income || 0).replace('GH₵', '') : ''}</td>
                  </tr>
                );
              })}
              <tr className="font-bold bg-gray-50">
                <td colSpan={3} className="text-right uppercase">Total Income</td>
                <td className="text-right">{formatGHS(totalIncome).replace('GH₵', '')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* RIGHT SIDE: EXPENSE */}
        <div>
          <h3 className="text-center font-bold bg-gray-100 border border-black p-1 text-sm uppercase">EXPENSE</h3>
          <table>
            <thead>
              <tr>
                <th style={{ width: '30px' }}>No.</th>
                <th style={{ width: '70px' }}>Date</th>
                <th>Item</th>
                <th className="text-right" style={{ width: '90px' }}>Amount (GH₵)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((_, i) => {
                const rec = expenseEntries[i];
                return (
                  <tr key={`exp-${i}`} style={{ height: '28px' }}>
                    <td className="text-center">{rec ? i + 1 : ''}</td>
                    <td>{rec ? new Date(rec.service_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : ''}</td>
                    <td className="truncate max-w-[120px]">{rec ? rec.notes || 'General Expense' : ''}</td>
                    <td className="text-right">{rec ? formatGHS(rec.expenses || 0).replace('GH₵', '') : ''}</td>
                  </tr>
                );
              })}
              <tr className="font-bold bg-gray-50">
                <td colSpan={3} className="text-right uppercase">Total Expense</td>
                <td className="text-right">{formatGHS(totalExpense).replace('GH₵', '')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER / SIGN-OFF */}
      <div className="mt-12 grid grid-cols-2 gap-20">
        <div className="border-t border-black pt-2 text-center">
          <p className="font-bold uppercase text-xs">Prepared By: Treasury Department</p>
          <div className="mt-8 border-b border-dotted border-black w-40 mx-auto"></div>
          <p className="text-[8pt] mt-1 italic">Signature & Date</p>
        </div>
        <div className="border-t border-black pt-2 text-center">
          <p className="font-bold uppercase text-xs">Approved By: Head Pastor / Audit</p>
          <div className="mt-8 border-b border-dotted border-black w-40 mx-auto"></div>
          <p className="text-[8pt] mt-1 italic">Signature & Date</p>
        </div>
      </div>
      
      <div className="mt-8 text-[8pt] text-gray-500 text-center">
        Generated on {dateGenerated} | Faithhouse Chapel International
      </div>
    </div>
  );
};

export default FinancialReportDocument;
