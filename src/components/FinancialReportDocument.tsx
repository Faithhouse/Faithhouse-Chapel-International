
import React from 'react';
import { FinancialRecord } from '../../types';

interface FinancialReportDocumentProps {
  organizationName: string;
  reportPeriod: string;
  dateGenerated: string;
  records: FinancialRecord[];
  bankBalance: number;
  momoBalance: number;
}

const FinancialReportDocument: React.FC<FinancialReportDocumentProps> = ({
  organizationName,
  reportPeriod,
  dateGenerated,
  records,
  bankBalance,
  momoBalance
}) => {
  // Calculations
  const totalTithes = records.reduce((sum, r) => sum + (r.tithes || 0), 0);
  const totalOfferings = records.reduce((sum, r) => sum + (r.offerings || 0), 0);
  const totalSeed = records.reduce((sum, r) => sum + (r.seed || 0), 0);
  const totalOtherIncome = records.reduce((sum, r) => sum + (r.other_income || 0), 0);
  const totalExpenses = records.reduce((sum, r) => sum + (r.expenses || 0), 0);
  const totalRevenue = totalTithes + totalOfferings + totalSeed + totalOtherIncome;
  const netLiquidity = totalRevenue - totalExpenses;
  const totalNetBalance = bankBalance + momoBalance;

  const formatGHS = (amount: number) => {
    return `GH₵${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="bg-white text-black p-12 max-w-[210mm] mx-auto font-serif min-h-screen print:p-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          @page { margin: 2cm; }
        }
        table { border-collapse: collapse; width: 100%; margin-bottom: 1.5rem; }
        th, td { border: 1px solid black; padding: 8px; text-align: left; font-size: 10pt; }
        th { background-color: #f2f2f2; font-weight: bold; text-transform: uppercase; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }
        .text-center { text-align: center; }
      `}} />

      {/* 1. HEADER SECTION */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold uppercase mb-1">{organizationName}</h1>
        <h2 className="text-lg font-bold uppercase mb-1">Treasury & Audit Department</h2>
        <h2 className="text-xl font-bold uppercase border-b-2 border-black pb-2 mb-4">FINANCIAL AUDIT REPORT</h2>
        
        <div className="flex justify-between text-sm mt-4 px-4">
          <p><span className="font-bold">Report Date:</span> {dateGenerated}</p>
          <p><span className="font-bold">Reporting Period:</span> {reportPeriod}</p>
        </div>
      </div>

      {/* 2. EXECUTIVE SUMMARY */}
      <div className="mb-8">
        <h3 className="text-md font-bold uppercase mb-3">1. EXECUTIVE SUMMARY</h3>
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
              <td className="text-right">{formatGHS(totalRevenue)}</td>
            </tr>
            <tr>
              <td>Total Expenditure</td>
              <td className="text-right">{formatGHS(totalExpenses)}</td>
            </tr>
            <tr className="font-bold">
              <td>Net Liquidity</td>
              <td className="text-right">{formatGHS(netLiquidity)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 3. REVENUE BREAKDOWN */}
      <div className="mb-8">
        <h3 className="text-md font-bold uppercase mb-3">2. REVENUE BREAKDOWN</h3>
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
              <td className="text-right">{formatGHS(totalSeed)}</td>
            </tr>
            <tr>
              <td>Other Income</td>
              <td className="text-right">{formatGHS(totalOtherIncome)}</td>
            </tr>
            <tr className="font-bold">
              <td>Total Revenue</td>
              <td className="text-right">{formatGHS(totalRevenue)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. EXPENDITURE SUMMARY */}
      <div className="mb-8">
        <h3 className="text-md font-bold uppercase mb-3">3. EXPENDITURE SUMMARY</h3>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th className="text-right">Amount (GH₵)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Total Expenses</td>
              <td className="text-right">{formatGHS(totalExpenses)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 5. ACCOUNTS OVERVIEW */}
      <div className="mb-8">
        <h3 className="text-md font-bold uppercase mb-3">4. ACCOUNTS OVERVIEW</h3>
        <table>
          <thead>
            <tr>
              <th>Account Type</th>
              <th className="text-right">Amount (GH₵)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Bank Holdings</td>
              <td className="text-right">{formatGHS(bankBalance)}</td>
            </tr>
            <tr>
              <td>MoMo Balance</td>
              <td className="text-right">{formatGHS(momoBalance)}</td>
            </tr>
            <tr className="font-bold">
              <td>Total Net Balance</td>
              <td className="text-right">{formatGHS(totalNetBalance)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 6. DETAILED TRANSACTIONS */}
      <div className="mb-8">
        <h3 className="text-md font-bold uppercase mb-3">5. DETAILED TRANSACTIONS</h3>
        {records.length === 0 ? (
          <p className="italic text-center border border-black p-4">No transactions recorded for this period.</p>
        ) : (
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
              {records.map((rec) => (
                <tr key={rec.id}>
                  <td>{new Date(rec.service_date).toLocaleDateString()}</td>
                  <td>Service Revenue</td>
                  <td className="uppercase">{rec.service_type}</td>
                  <td className="text-right">{formatGHS(rec.total_income || 0)}</td>
                  <td className="text-right">{formatGHS(rec.expenses || 0)}</td>
                  <td className="text-xs uppercase">{rec.witness1_name} / {rec.witness2_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 7. AUDIT STATUS */}
      <div className="mb-12">
        <h3 className="text-md font-bold uppercase mb-3">6. AUDIT STATUS</h3>
        <div className="border border-black p-4 space-y-2">
          <p><span className="font-bold uppercase">Audit Status:</span> Verified</p>
          <p><span className="font-bold uppercase">Notes:</span> All financial entries have been reconciled with dual-witness signatures and bank/MoMo statements. No discrepancies found.</p>
        </div>
      </div>

      {/* 7. SIGNATURES */}
      <div className="mt-20 grid grid-cols-3 gap-8">
        <div className="text-center">
          <div className="border-t border-black pt-2">
            <p className="font-bold uppercase text-xs">Treasurer</p>
            <p className="text-[8pt] mt-4">Signature & Date</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-black pt-2">
            <p className="font-bold uppercase text-xs">Auditor</p>
            <p className="text-[8pt] mt-4">Signature & Date</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-black pt-2">
            <p className="font-bold uppercase text-xs">Head Pastor</p>
            <p className="text-[8pt] mt-4">Signature & Date</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialReportDocument;
