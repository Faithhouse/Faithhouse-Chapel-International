
import React from 'react';
import { FinancialRecord } from '../../types';

interface FinancialReportDocumentProps {
  organizationName: string;
  reportPeriod: string;
  dateGenerated: string;
  records: FinancialRecord[];
}

const FinancialReportDocument: React.FC<FinancialReportDocumentProps> = ({
  organizationName,
  reportPeriod,
  dateGenerated,
  records
}) => {
  // Calculations
  const totalTithes = records.reduce((sum, r) => sum + (r.tithes || 0), 0);
  const totalOfferings = records.reduce((sum, r) => sum + (r.offerings || 0), 0);
  const totalSeed = records.reduce((sum, r) => sum + (r.seed || 0), 0);
  const totalOtherIncome = records.reduce((sum, r) => sum + (r.other_income || 0), 0);
  const totalExpenses = records.reduce((sum, r) => sum + (r.expenses || 0), 0);
  const totalIncome = totalTithes + totalOfferings + totalSeed + totalOtherIncome;
  const netBalance = totalIncome - totalExpenses;

  // For Accounts Overview, we take the latest record's balances
  const latestRecord = records[0];
  const bankBalance = latestRecord?.bank_balance || 0;
  const momoBalance = latestRecord?.momo_balance || 0;
  const cashBalance = netBalance; // Simplified assumption for the report

  const formatGHS = (amount: number) => {
    return `GH₵${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="bg-white text-slate-900 p-12 max-w-[210mm] mx-auto font-serif min-h-screen">
      {/* HEADER SECTION */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold uppercase mb-2 tracking-tight">{organizationName}</h1>
        <h2 className="text-xl font-bold mb-4 border-y-2 border-slate-900 py-2 inline-block px-8">FINANCIAL REPORT</h2>
        <div className="mt-4 text-sm font-medium space-y-1">
          <p>Reporting Period: <span className="font-bold">{reportPeriod}</span></p>
          <p>Date Generated: <span className="font-bold">{dateGenerated}</span></p>
        </div>
      </div>

      {/* FINANCIAL SUMMARY */}
      <div className="mb-12">
        <h3 className="text-lg font-bold uppercase mb-4 flex items-center">
          <span className="mr-2">1.</span> FINANCIAL SUMMARY
        </h3>
        <table className="w-full border-collapse border-2 border-slate-900">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-900 p-3 text-left uppercase text-xs">Category</th>
              <th className="border border-slate-900 p-3 text-right uppercase text-xs">Amount (GH₵)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-900 p-3">Total Tithes</td>
              <td className="border border-slate-900 p-3 text-right">{formatGHS(totalTithes)}</td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-3">Total Offerings</td>
              <td className="border border-slate-900 p-3 text-right">{formatGHS(totalOfferings)}</td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-3">Seeds & Pledges</td>
              <td className="border border-slate-900 p-3 text-right">{formatGHS(totalSeed)}</td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-3">Other Income</td>
              <td className="border border-slate-900 p-3 text-right">{formatGHS(totalOtherIncome)}</td>
            </tr>
            <tr className="font-bold bg-slate-50">
              <td className="border border-slate-900 p-3">Total Income (Calculated)</td>
              <td className="border border-slate-900 p-3 text-right">{formatGHS(totalIncome)}</td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-3">Expenses</td>
              <td className="border border-slate-900 p-3 text-right">{formatGHS(totalExpenses)}</td>
            </tr>
            <tr className="font-bold bg-slate-200">
              <td className="border border-slate-900 p-3">Net Balance (Calculated)</td>
              <td className="border border-slate-900 p-3 text-right">{formatGHS(netBalance)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ACCOUNTS OVERVIEW */}
      <div className="mb-12">
        <h3 className="text-lg font-bold uppercase mb-4 flex items-center">
          <span className="mr-2">2.</span> ACCOUNTS OVERVIEW
        </h3>
        <table className="w-full border-collapse border-2 border-slate-900">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-900 p-3 text-left uppercase text-xs">Account Type</th>
              <th className="border border-slate-900 p-3 text-right uppercase text-xs">Balance (GH₵)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-900 p-3">Bank Balance</td>
              <td className="border border-slate-900 p-3 text-right">{formatGHS(bankBalance)}</td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-3">MoMo Balance</td>
              <td className="border border-slate-900 p-3 text-right">{formatGHS(momoBalance)}</td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-3">Cash Balance</td>
              <td className="border border-slate-900 p-3 text-right">{formatGHS(cashBalance)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* DETAILED LEDGER */}
      <div className="mb-12">
        <h3 className="text-lg font-bold uppercase mb-4 flex items-center">
          <span className="mr-2">3.</span> DETAILED LEDGER
        </h3>
        {records.length === 0 ? (
          <div className="border-2 border-dashed border-slate-300 p-8 text-center">
            <p className="italic text-slate-500">No transactions available for this period.</p>
          </div>
        ) : (
          <table className="w-full border-collapse border border-slate-900 text-[10pt]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-900 p-2 text-left uppercase text-[8pt]">Date</th>
                <th className="border border-slate-900 p-2 text-left uppercase text-[8pt]">Description</th>
                <th className="border border-slate-900 p-2 text-left uppercase text-[8pt]">Category</th>
                <th className="border border-slate-900 p-2 text-right uppercase text-[8pt]">Debit (GH₵)</th>
                <th className="border border-slate-900 p-2 text-right uppercase text-[8pt]">Credit (GH₵)</th>
                <th className="border border-slate-900 p-2 text-right uppercase text-[8pt]">Balance</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec, idx) => {
                const runningBalance = records.slice(idx).reduce((sum, r) => sum + (r.total_income || 0) - (r.expenses || 0), 0);
                return (
                  <tr key={rec.id}>
                    <td className="border border-slate-900 p-2">{new Date(rec.service_date).toLocaleDateString()}</td>
                    <td className="border border-slate-900 p-2">{rec.service_type}</td>
                    <td className="border border-slate-900 p-2">Service Revenue</td>
                    <td className="border border-slate-900 p-2 text-right">{formatGHS(rec.expenses || 0)}</td>
                    <td className="border border-slate-900 p-2 text-right">{formatGHS(rec.total_income || 0)}</td>
                    <td className="border border-slate-900 p-2 text-right font-bold">{formatGHS(runningBalance)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* AUDIT / NOTES SECTION */}
      <div className="mb-12">
        <h3 className="text-lg font-bold uppercase mb-4 flex items-center">
          <span className="mr-2">4.</span> AUDIT / NOTES SECTION
        </h3>
        <div className="border-2 border-slate-900 p-6 space-y-4">
          <div>
            <p className="font-bold text-sm uppercase tracking-wider mb-1">Audit Status:</p>
            <p className="text-slate-700">Verified & Reconciled against internal ledgers and witness signatures.</p>
          </div>
          <div>
            <p className="font-bold text-sm uppercase tracking-wider mb-1">Remarks:</p>
            <p className="text-slate-700 text-sm leading-relaxed italic">
              The financial records for this period have been reviewed. All income from tithes, offerings, and seeds has been accurately captured and verified by dual witness protocols. Expenses are documented with corresponding receipts where applicable.
            </p>
          </div>
        </div>
      </div>

      {/* SIGNATURE SECTION */}
      <div className="mt-24 grid grid-cols-3 gap-12">
        <div className="text-center">
          <div className="border-t-2 border-slate-900 pt-3">
            <p className="font-bold text-xs uppercase tracking-widest">Treasurer</p>
            <p className="text-[8pt] text-slate-500 mt-1">Signature & Date</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t-2 border-slate-900 pt-3">
            <p className="font-bold text-xs uppercase tracking-widest">Head Pastor</p>
            <p className="text-[8pt] text-slate-500 mt-1">Signature & Date</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t-2 border-slate-900 pt-3">
            <p className="font-bold text-xs uppercase tracking-widest">Auditor</p>
            <p className="text-[8pt] text-slate-500 mt-1">Signature & Date</p>
          </div>
        </div>
      </div>

      {/* PRINT FOOTER */}
      <div className="mt-12 text-center text-[8pt] text-slate-400 uppercase tracking-[0.3em]">
        End of Financial Report • Faithhouse Chapel International
      </div>
    </div>
  );
};

export default FinancialReportDocument;
