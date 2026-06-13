#!/usr/bin/env node
/**
 * Apply Cholamandalam payment receipts for M1 agreement X0CENDD00004530947
 * Updates EMI rows 48–53 with actual paid dates, bounce/penalty, and receipt refs.
 */
const path = require('path');
const XLSX = require('xlsx');

const M1 = 'M1- Mahindra earthmaster sx iv 2022';
const AGREEMENT = 'X0CENDD00004530947';
const root = path.join(__dirname, '..');
const gitaiPath = path.join(root, 'Gitai.xlsx');

/** instlNo → receipt-driven update */
const RECEIPT_UPDATES = {
  48: {
    PaidDate: '2025-12-28',
    Status: 'Paid',
    BounceCharges: 0,
    PenaltyCharges: 0,
    TotalPaid: 48399,
    Remarks: 'P:42564 I:5835 | Z97477458/48-1 ACH CLEAR 28-12-2025'
  },
  49: {
    PaidDate: '2026-01-28',
    Status: 'Paid',
    BounceCharges: 0,
    PenaltyCharges: 0,
    TotalPaid: 48399,
    Remarks: 'P:42957 I:5442 | Z97477458/49-1 ACH CLEAR 28-01-2026'
  },
  50: {
    PaidDate: '2026-02-28',
    Status: 'Paid',
    BounceCharges: 0,
    PenaltyCharges: 0,
    TotalPaid: 48399,
    Remarks: 'P:43354 I:5045 | Z97477458/50-1 ACH CLEAR 28-02-2026'
  },
  51: {
    PaidDate: '2026-04-08',
    Status: 'Paid',
    BounceCharges: 0,
    PenaltyCharges: 2029,
    TotalPaid: 50428,
    Remarks: 'P:43754 I:4645 | Z97477458/51-1 ACH BOUNCE 28-03-2026; RZ97477458/51-1 CHEQUE BOUNCE 04-04-2026; ON357904706+707 CLEAR 08-04-2026 (₹48,399); ON357904710 penalty ₹2,029 10-04-2026'
  },
  52: {
    PaidDate: '2026-05-01',
    Status: 'Paid',
    BounceCharges: 736,
    PenaltyCharges: 0,
    TotalPaid: 49135,
    Remarks: 'P:44158 I:4241 | Z97477458/52-1 ACH BOUNCE 28-04-2026; GB0501140671 NETBANKING CLEAR 01-05-2026'
  },
  53: {
    PaidDate: '2026-06-02',
    Status: 'Paid',
    BounceCharges: 816,
    PenaltyCharges: 0,
    TotalPaid: 49215,
    Remarks: 'P:44566 I:3833 | Z97477458/53-1 ACH BOUNCE 28-05-2026; GB0601768889 NETBANKING CLEAR 02-06-2026'
  }
};

function writeSheet(wb, name, headers, data) {
  const ws = {};
  headers.forEach((h, c) => { ws[XLSX.utils.encode_cell({ r: 0, c })] = { t: 's', v: h }; });
  data.forEach((row, ri) => {
    headers.forEach((h, c) => {
      ws[XLSX.utils.encode_cell({ r: ri + 1, c })] = { t: 's', v: String(row[h] ?? '') };
    });
  });
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(data.length, 1), c: headers.length - 1 } });
  wb.Sheets[name] = ws;
}

const wb = XLSX.readFile(gitaiPath, { cellDates: true });
const EMI_H = ['ID', 'Machine', 'DueDate', 'EMIAmount', 'PaidDate', 'BounceCharges', 'PenaltyCharges', 'TotalPaid', 'Status', 'Remarks'];
const emiRows = XLSX.utils.sheet_to_json(wb.Sheets.EMI, { defval: '' });

let updated = 0;
const emiOut = emiRows.map(row => {
  const id = parseInt(row.ID, 10);
  const patch = RECEIPT_UPDATES[id];
  if (!patch || row.Machine !== M1) return row;
  updated++;
  return { ...row, ...patch, EMIAmount: row.EMIAmount || 48399 };
});

writeSheet(wb, 'EMI', EMI_H, emiOut);

const paidCount = emiOut.filter(e => e.Machine === M1 && e.Status === 'Paid').length;
const pendingCount = emiOut.filter(e => e.Machine === M1 && e.Status === 'Pending').length;

const LOAN_H = ['ID', 'Machine', 'LoanAmount', 'PrincipalPaid', 'InterestPaid', 'OutstandingLoan', 'AgreementNo', 'Lender', 'CustomerID', 'DisbursalDate', 'EMIAmount', 'TenureMonths', 'BalanceTenure', 'IRR', 'InterestType', 'Applicant', 'CoApplicant', 'ProductType', 'LoanStatus', 'OverdueAmount', 'DisbursalStatus', 'Frequency', 'Remarks'];
const loans = XLSX.utils.sheet_to_json(wb.Sheets.Loans, { defval: '' }).map(l => {
  if (l.Machine !== M1) return l;
  return {
    ...l,
    AgreementNo: AGREEMENT,
    BalanceTenure: pendingCount,
    OverdueAmount: 158,
    Remarks: 'Chola receipts applied 13/06/2026 | Inst 51–53 paid late after ACH bounce | Inst 54 due 28-06-2026'
  };
});
writeSheet(wb, 'Loans', LOAN_H, loans);

XLSX.writeFile(wb, gitaiPath);

console.log('M1 Chola receipt data applied to Gitai.xlsx');
console.log('  Agreement:', AGREEMENT);
console.log('  EMI rows updated:', updated, '(inst 48–53)');
console.log('  Paid:', paidCount, '| Pending:', pendingCount);
console.log('\nSummary:');
console.log('  Inst 48–50: on-time ACH CLEAR');
console.log('  Inst 51: 2 bounces → paid 08-04-2026 + ₹2,029 penalty');
console.log('  Inst 52: ACH bounce → paid 01-05-2026 (+₹736 bounce charge)');
console.log('  Inst 53: ACH bounce → paid 02-06-2026 (+₹816 bounce charge)');
console.log('  Inst 54: still Pending (due 28-06-2026)');
console.log('\nClear cache: localStorage.removeItem("earthmovers-data-v1")');
