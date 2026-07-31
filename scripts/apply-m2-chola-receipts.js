#!/usr/bin/env node
/**
 * M2 Chola EMI schedule + payment receipts for X0CENDD00005335473
 * Due day: 25th monthly from 25-02-2023 (inst 1) … 25-01-2028 (inst 60)
 * Receipts + online portal payments applied (inst 9,13,15,20–22,33,35,37–42)
 * Status as of 29-07-2026
 */
const path = require('path');
const XLSX = require('xlsx');

const root = path.join(__dirname, '..');
const gitaiPath = path.join(root, 'Gitai.xlsx');
const M2 = 'M2-Mahindra earthmaster sx iv 2023';
const EMI = 52960;
const STATUS_DATE = '2026-07-29';

function toISO(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function addMonths(y, m, add) {
  const dt = new Date(Date.UTC(y, m - 1 + add, 1));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1 };
}

/** Build due dates: inst 1 = 25-02-2023 */
function dueFor(inst) {
  const { y, m } = addMonths(2023, 2, inst - 1);
  return toISO(y, m, 25);
}

function estimateAmort(principal, annualIrr, emi, monthsPaid) {
  const r = annualIrr / 100 / 12;
  let bal = principal;
  let principalPaid = 0;
  let interestPaid = 0;
  for (let i = 0; i < monthsPaid; i++) {
    const interest = bal * r;
    const prin = Math.min(emi - interest, bal);
    interestPaid += interest;
    principalPaid += prin;
    bal -= prin;
    if (bal < 0.01) {
      bal = 0;
      break;
    }
  }
  return {
    principalPaid: Math.round(principalPaid),
    interestPaid: Math.round(interestPaid),
    outstanding: Math.round(bal)
  };
}

/** Receipt + online portal updates (inst no → payment) */
const RECEIPTS = {
  9: {
    PaidDate: '2023-10-27',
    Status: 'Paid',
    BounceCharges: 0,
    PenaltyCharges: 0,
    TotalPaid: 52960,
    PaymentMode: 'Business',
    BusinessPaid: 52960,
    PartnerPaid: 0,
    PaidByPartner: '',
    Remarks: 'TXN6001829883 GB1027771346 Completed 27-10-2023'
  },
  13: {
    PaidDate: '2024-03-13',
    Status: 'Paid',
    BounceCharges: 2435,
    PenaltyCharges: 0,
    TotalPaid: 55395,
    PaymentMode: 'Business',
    BusinessPaid: 55395,
    PartnerPaid: 0,
    PaidByPartner: '',
    Remarks: 'TXN9370423910 GB0313715751 Completed 13-03-2024 (16 days late)'
  },
  15: {
    PaidDate: '2024-05-04',
    Status: 'Paid',
    BounceCharges: 1784,
    PenaltyCharges: 0,
    TotalPaid: 54744,
    PaymentMode: 'Business',
    BusinessPaid: 54744,
    PartnerPaid: 0,
    PaidByPartner: '',
    Remarks: 'TXN5488721941 GB0504674003 Completed 04-05-2024 (9 days late)'
  },
  20: {
    PaidDate: '2024-10-01',
    Status: 'Paid',
    BounceCharges: 1410,
    PenaltyCharges: 0,
    TotalPaid: 54370,
    PaymentMode: 'Business',
    BusinessPaid: 54370,
    PartnerPaid: 0,
    PaidByPartner: '',
    Remarks: 'TXN0238343463+0751869952 Failed then TXN0283719607 GB1001109723 Completed 01-10-2024'
  },
  21: {
    PaidDate: '2024-10-29',
    Status: 'Paid',
    BounceCharges: 1190,
    PenaltyCharges: 0,
    TotalPaid: 54150,
    PaymentMode: 'Business',
    BusinessPaid: 54150,
    PartnerPaid: 0,
    PaidByPartner: '',
    Remarks: 'TXN1622139229 fee ₹1,190 + TXN2201982477 GB1029581943 EMI ₹52,960 Completed 29-10-2024'
  },
  22: {
    PaidDate: '2024-12-01',
    Status: 'Paid',
    BounceCharges: 2425,
    PenaltyCharges: 0,
    TotalPaid: 55385,
    PaymentMode: 'Business',
    BusinessPaid: 55385,
    PartnerPaid: 0,
    PaidByPartner: '',
    Remarks: 'TXN6209488043 fee ₹953 19-11-2024; TXN7237943113 GB1201909869 ₹54,432 Completed 01-12-2024'
  },
  33: {
    PaidDate: '2025-10-27',
    Status: 'Paid',
    BounceCharges: 2141,
    PenaltyCharges: 0,
    TotalPaid: 55101,
    PaymentMode: 'Business',
    BusinessPaid: 55101,
    PartnerPaid: 0,
    PaidByPartner: '',
    Remarks: 'TXN7664605839 GB1027854800 Completed 27-10-2025 (2 days late)'
  },
  35: {
    PaidDate: '2025-12-25',
    Status: 'Paid',
    BounceCharges: 0,
    PenaltyCharges: 87,
    TotalPaid: 53047,
    PaymentMode: 'Business',
    BusinessPaid: 53047,
    PartnerPaid: 0,
    PaidByPartner: '',
    Remarks: 'ACH assumed on due date; TXN8142895954 GB1224269600 fee ₹87 Completed 24-12-2025'
  },
  37: {
    PaidDate: '2026-03-17',
    Status: 'Paid',
    BounceCharges: 0,
    PenaltyCharges: 0,
    TotalPaid: 52960,
    PaymentMode: 'Business',
    BusinessPaid: 52960,
    PartnerPaid: 0,
    PaidByPartner: '',
    Remarks: 'Z5291019/37-1 ACH BOUNCE 25-02; RZ5291019/37-1 CHEQUE BOUNCE 04-03; ON357904650+651 CLEAR 16–17-03-2026 (₹2,960+₹50,000)'
  },
  38: {
    PaidDate: '2026-03-28',
    Status: 'Paid',
    BounceCharges: 0,
    PenaltyCharges: 0,
    TotalPaid: 52960,
    PaymentMode: 'Business',
    BusinessPaid: 52960,
    PartnerPaid: 0,
    PaidByPartner: '',
    Remarks: 'Z5291019/38-1 ACH BOUNCE 25-03; ON357904679+680 CLEAR 28-03-2026 (₹3,960+₹49,000)'
  },
  39: {
    PaidDate: '2026-05-06',
    Status: 'Paid',
    BounceCharges: 0,
    PenaltyCharges: 0,
    TotalPaid: 52960,
    PaymentMode: 'Business',
    BusinessPaid: 52960,
    PartnerPaid: 0,
    PaidByPartner: '',
    Remarks: 'Z5291019/39-1 ACH BOUNCE 25-04; RZ5291019/39-1 CHEQUE BOUNCE 29-04; CVN001210289+190 CLEAR 06-05-2026 (₹50,000+₹2,960)'
  },
  40: {
    PaidDate: '2026-06-01',
    Status: 'Paid',
    BounceCharges: 6369,
    PenaltyCharges: 0,
    TotalPaid: 59329,
    PaymentMode: 'Business',
    BusinessPaid: 59329,
    PartnerPaid: 0,
    PaidByPartner: '',
    Remarks: 'Z5291019/40-1 ACH BOUNCE 25-05; RZ5291019/40-1 CHEQUE BOUNCE 29-05; TXN6193217924 GB0601296831 Completed 01-06-2026 ₹59,329'
  },
  41: {
    PaidDate: '2026-06-25',
    Status: 'Paid',
    BounceCharges: 0,
    PenaltyCharges: 0,
    TotalPaid: 52960,
    PaymentMode: 'Business',
    BusinessPaid: 52960,
    PartnerPaid: 0,
    PaidByPartner: '',
    Remarks: 'Z5291019/41-1 ACH CLEAR 25-06-2026'
  },
  42: {
    PaidDate: '',
    Status: 'Bounced',
    BounceCharges: 0,
    PenaltyCharges: 0,
    TotalPaid: 0,
    PaymentMode: 'Business',
    BusinessPaid: 0,
    PartnerPaid: 0,
    PaidByPartner: '',
    Remarks: 'Z5291019/42-1 ACH BOUNCE 25-07; RZ5291019/42-1 CHEQUE BOUNCE 29-07-2026 — overdue EMI ₹52,960'
  }
};

function writeSheet(wb, name, headers, data) {
  const ws = {};
  headers.forEach((h, c) => {
    ws[XLSX.utils.encode_cell({ r: 0, c })] = { t: 's', v: h };
  });
  data.forEach((row, ri) => {
    headers.forEach((h, c) => {
      ws[XLSX.utils.encode_cell({ r: ri + 1, c })] = { t: 's', v: String(row[h] ?? '') };
    });
  });
  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: Math.max(data.length, 1), c: headers.length - 1 }
  });
  wb.Sheets[name] = ws;
}

const EMI_H = [
  'ID', 'Machine', 'DueDate', 'EMIAmount', 'PaidDate', 'BounceCharges', 'PenaltyCharges',
  'TotalPaid', 'PaymentMode', 'BusinessPaid', 'PartnerPaid', 'PaidByPartner', 'Status', 'Remarks'
];

const existing = XLSX.utils.sheet_to_json(XLSX.readFile(gitaiPath).Sheets.EMI, { defval: '' });
const m1Emi = existing.filter(r => r.Machine !== M2);
const idBase = m1Emi.reduce((max, r) => Math.max(max, parseInt(r.ID, 10) || 0), 0);

const m2Rows = [];
for (let inst = 1; inst <= 60; inst++) {
  const due = dueFor(inst);
  const id = idBase + inst;
  const patch = RECEIPTS[inst];
  if (patch) {
    m2Rows.push({
      ID: id,
      Machine: M2,
      DueDate: due,
      EMIAmount: EMI,
      ...patch,
      Remarks: `Instl ${inst} | ${patch.Remarks}`
    });
    continue;
  }

  const paid = due < '2026-07-25'; // through inst 41; 42 handled above
  m2Rows.push({
    ID: id,
    Machine: M2,
    DueDate: due,
    EMIAmount: EMI,
    PaidDate: paid ? due : '',
    BounceCharges: 0,
    PenaltyCharges: 0,
    TotalPaid: paid ? EMI : 0,
    PaymentMode: 'Business',
    BusinessPaid: paid ? EMI : 0,
    PartnerPaid: 0,
    PaidByPartner: '',
    Status: paid ? 'Paid' : 'Pending',
    Remarks: paid
      ? `Instl ${inst} | Assumed on-time ACH until receipt history provided`
      : `Instl ${inst}`
  });
}

const wb = XLSX.readFile(gitaiPath, { cellDates: true });
const allEmi = [...m1Emi, ...m2Rows];
writeSheet(wb, 'EMI', EMI_H, allEmi);

const paidCount = m2Rows.filter(r => r.Status === 'Paid').length;
const pendingCount = m2Rows.filter(r => r.Status === 'Pending' || r.Status === 'Bounced').length;
const amort = estimateAmort(2436000, 11, EMI, paidCount);

const LOAN_H = [
  'ID', 'Machine', 'LoanAmount', 'PrincipalPaid', 'InterestPaid', 'OutstandingLoan',
  'AgreementNo', 'Lender', 'CustomerID', 'DisbursalDate', 'EMIAmount', 'TenureMonths',
  'BalanceTenure', 'IRR', 'InterestType', 'Applicant', 'CoApplicant', 'ProductType',
  'LoanStatus', 'OverdueAmount', 'DisbursalStatus', 'Frequency', 'Remarks'
];

const loans = XLSX.utils.sheet_to_json(wb.Sheets.Loans, { defval: '' }).map(l => {
  if (l.Machine !== M2) return l;
  return {
    ...l,
    PrincipalPaid: amort.principalPaid,
    InterestPaid: amort.interestPaid,
    OutstandingLoan: amort.outstanding,
    BalanceTenure: pendingCount,
    OverdueAmount: 54762,
    Remarks: `Receipts applied ${STATUS_DATE} | Inst 37–40 late after bounce | Inst 41 CLEAR | Inst 42 BOUNCE overdue | Est. principal after ${paidCount} paid EMIs`
  };
});
writeSheet(wb, 'Loans', LOAN_H, loans);
XLSX.writeFile(wb, gitaiPath);

console.log('M2 EMI + receipts applied');
console.log('  Schedule: 60 EMIs (due 25th from 2023-02-25)');
console.log('  Paid:', paidCount, '| Pending/Bounced:', pendingCount);
console.log('  Online/receipt updates: inst 9,13,15,20–22,33,35,37–42');
console.log('  Inst 37–40: paid late after ACH/cheque bounce');
console.log('  Inst 41: ACH CLEAR on time');
console.log('  Inst 42: ACH+Cheque BOUNCE — unpaid (matches overdue ₹52,960)');
console.log('  Est. outstanding:', amort.outstanding);
console.log('\nClear cache: localStorage.removeItem("earthmovers-data-v1")');
