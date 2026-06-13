#!/usr/bin/env node
/**
 * Apply Cholamandalam payment data for M1 agreement X0CENDD00004530947
 * Sources: ACH receipt history + Online Transaction History (portal)
 */
const path = require('path');
const XLSX = require('xlsx');

const M1 = 'M1- Mahindra earthmaster sx iv 2022';
const AGREEMENT = 'X0CENDD00004530947';
const EMI_BASE = 48399;
const root = path.join(__dirname, '..');
const gitaiPath = path.join(root, 'Gitai.xlsx');

/** instlNo → payment update (preserves P:/I: prefix via merge) */
const PAYMENT_UPDATES = {
  25: {
    PaidDate: '2024-01-29',
    Status: 'Paid',
    BounceCharges: 0,
    PenaltyCharges: 0,
    TotalPaid: 48399,
    TxnNote: 'TXN7388832616 GB0129989356 Completed 29-01-2024'
  },
  26: {
    PaidDate: '2024-02-28',
    Status: 'Paid',
    BounceCharges: 0,
    PenaltyCharges: 0,
    TotalPaid: 48399,
    TxnNote: 'TXN5863354926 Failed then TXN5906895034 GB0228746203 Completed 28-02-2024'
  },
  28: {
    PenaltyCharges: 1620,
    TotalPaid: 50019,
    TxnNote: 'TXN4828640519 GB0504159679 penalty ₹1,620 Completed 04-05-2024'
  },
  31: {
    PaidDate: '2024-07-31',
    Status: 'Paid',
    BounceCharges: 895,
    PenaltyCharges: 0,
    TotalPaid: 49294,
    TxnNote: 'TXN3578603114 GB0731619886 Completed 31-07-2024; TXN4289021146 fee ₹119 02-08-2024'
  },
  33: {
    PaidDate: '2024-10-11',
    Status: 'Paid',
    BounceCharges: 1552,
    PenaltyCharges: 0,
    TotalPaid: 49951,
    TxnNote: 'TXN8333159583 GB1011464183 Completed 11-10-2024 (13 days late)'
  },
  34: {
    PaidDate: '2024-10-29',
    Status: 'Paid',
    BounceCharges: 736,
    PenaltyCharges: 0,
    TotalPaid: 49135,
    TxnNote: 'TXN8787846197+8829566659 Failed then TXN8973323525 GB1029353789 Completed 29-10-2024'
  },
  36: {
    PaidDate: '2025-01-07',
    Status: 'Paid',
    BounceCharges: 2068,
    PenaltyCharges: 0,
    TotalPaid: 50467,
    TxnNote: 'TXN7560144060 Failed then TXN7703512396 GB0107818951 Completed 07-01-2025 (inst due 28-12-2024)'
  },
  37: {
    PaidDate: '2025-01-28',
    Status: 'Paid',
    BounceCharges: 500,
    PenaltyCharges: 0,
    TotalPaid: 48899,
    TxnNote: 'TXN5292297051 Failed then TXN5541168306 GB0128660234 Completed 28-01-2025'
  },
  46: {
    PaidDate: '2025-10-31',
    Status: 'Paid',
    BounceCharges: 3660,
    PenaltyCharges: 0,
    TotalPaid: 52059,
    TxnNote: 'TXN6783731773 GB1031780222 Completed 31-10-2025 (3 days late)'
  },
  48: {
    PaidDate: '2025-12-28',
    Status: 'Paid',
    BounceCharges: 0,
    PenaltyCharges: 0,
    TotalPaid: 48399,
    TxnNote: 'Z97477458/48-1 ACH CLEAR 28-12-2025'
  },
  49: {
    PaidDate: '2026-01-28',
    Status: 'Paid',
    BounceCharges: 0,
    PenaltyCharges: 0,
    TotalPaid: 48399,
    TxnNote: 'Z97477458/49-1 ACH CLEAR 28-01-2026'
  },
  50: {
    PaidDate: '2026-02-28',
    Status: 'Paid',
    BounceCharges: 0,
    PenaltyCharges: 0,
    TotalPaid: 48399,
    TxnNote: 'Z97477458/50-1 ACH CLEAR 28-02-2026'
  },
  51: {
    PaidDate: '2026-04-08',
    Status: 'Paid',
    BounceCharges: 0,
    PenaltyCharges: 2029,
    TotalPaid: 50428,
    TxnNote: 'Z97477458/51-1 ACH BOUNCE 28-03; RZ97477458/51-1 CHEQUE BOUNCE 04-04; ON357904706+707 CLEAR 08-04; ON357904710 penalty ₹2,029 10-04'
  },
  52: {
    PaidDate: '2026-05-01',
    Status: 'Paid',
    BounceCharges: 736,
    PenaltyCharges: 0,
    TotalPaid: 49135,
    TxnNote: 'Z97477458/52-1 ACH BOUNCE 28-04; TXN0202348420 GB0501140671 Completed 01-05-2026'
  },
  53: {
    PaidDate: '2026-06-01',
    Status: 'Paid',
    BounceCharges: 816,
    PenaltyCharges: 0,
    TotalPaid: 49215,
    TxnNote: 'Z97477458/53-1 ACH BOUNCE 28-05; TXN5744964581 GB0601768889 Completed 01-06-2026 2:50 PM'
  }
};

function piPrefix(remarks) {
  const m = String(remarks || '').match(/^(P:\d+ I:\d+)/);
  return m ? m[1] : '';
}

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
  const patch = PAYMENT_UPDATES[id];
  if (!patch || row.Machine !== M1) return row;
  updated++;
  const prefix = piPrefix(row.Remarks);
  const { TxnNote, ...fields } = patch;
  const remarks = [prefix, TxnNote].filter(Boolean).join(' | ');
  return {
    ...row,
    ...fields,
    EMIAmount: parseFloat(row.EMIAmount) || EMI_BASE,
    Remarks: remarks
  };
});

writeSheet(wb, 'EMI', EMI_H, emiOut);

const paidCount = emiOut.filter(e => e.Machine === M1 && e.Status === 'Paid').length;
const pendingCount = emiOut.filter(e => e.Machine === M1 && e.Status === 'Pending').length;
const totalBouncePenalty = emiOut
  .filter(e => e.Machine === M1)
  .reduce((s, e) => s + parseFloat(e.BounceCharges || 0) + parseFloat(e.PenaltyCharges || 0), 0);

const LOAN_H = ['ID', 'Machine', 'LoanAmount', 'PrincipalPaid', 'InterestPaid', 'OutstandingLoan', 'AgreementNo', 'Lender', 'CustomerID', 'DisbursalDate', 'EMIAmount', 'TenureMonths', 'BalanceTenure', 'IRR', 'InterestType', 'Applicant', 'CoApplicant', 'ProductType', 'LoanStatus', 'OverdueAmount', 'DisbursalStatus', 'Frequency', 'Remarks'];
const loans = XLSX.utils.sheet_to_json(wb.Sheets.Loans, { defval: '' }).map(l => {
  if (l.Machine !== M1) return l;
  return {
    ...l,
    AgreementNo: AGREEMENT,
    BalanceTenure: pendingCount,
    OverdueAmount: 158,
    Remarks: `Chola payments synced 13/06/2026 | ${paidCount} EMIs paid | bounce/penalty logged ₹${Math.round(totalBouncePenalty).toLocaleString('en-IN')} | Inst 54 due 28-06-2026`
  };
});
writeSheet(wb, 'Loans', LOAN_H, loans);

XLSX.writeFile(wb, gitaiPath);

console.log('M1 Chola payment history applied to Gitai.xlsx');
console.log('  Agreement:', AGREEMENT);
console.log('  EMI rows updated:', updated);
console.log('  Paid:', paidCount, '| Pending:', pendingCount);
console.log('  Total bounce/penalty recorded: ₹' + Math.round(totalBouncePenalty).toLocaleString('en-IN'));
console.log('\nOnline txn updates:');
console.log('  Inst 25–26, 28, 31, 33–34, 36–37, 46, 48–53');
console.log('\nClear cache: localStorage.removeItem("earthmovers-data-v1")');
