#!/usr/bin/env node
/**
 * Import M1 EMI repayment schedule from Cholamandalam PDF
 * Source: 03ee6a97-12cb-42a4-b857-49c71dc20918.pdf
 */
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const M1 = 'M1- Mahindra earthmaster sx iv 2022';
const AGREEMENT = 'X0CENDD00004530947';
const LENDER = 'Cholamandalam Investment and Finance';
const STATUS_DATE = '2026-06-13'; // schedule date on PDF
const EMI_AMOUNT = 48399;

const root = path.join(__dirname, '..');
const gitaiPath = path.join(root, 'Gitai.xlsx');
const pdfSource = process.argv[2] || path.join(require('os').homedir(), 'Downloads/03ee6a97-12cb-42a4-b857-49c71dc20918.pdf');
const pdfDest = path.join(root, 'documents/M1-Chola-EMI-Schedule.pdf');

/** [instlNo, dueDate DD-MM-YYYY, instlAmount, principal, interest] */
const SCHEDULE = [
  [1, '28-02-2022', 48399, 27885, 20514],
  [2, '28-03-2022', 48399, 28142, 20257],
  [3, '28-04-2022', 48399, 28402, 19997],
  [4, '28-05-2022', 48399, 28664, 19735],
  [5, '28-06-2022', 48399, 28929, 19470],
  [6, '28-07-2022', 48399, 29196, 19203],
  [7, '28-08-2022', 48399, 29466, 18933],
  [8, '28-09-2022', 48399, 29738, 18661],
  [9, '28-10-2022', 48399, 30012, 18387],
  [10, '28-11-2022', 48399, 30289, 18110],
  [11, '28-12-2022', 48399, 30569, 17830],
  [12, '28-01-2023', 48399, 30851, 17548],
  [13, '28-02-2023', 48399, 31136, 17263],
  [14, '28-03-2023', 48399, 31423, 16976],
  [15, '28-04-2023', 48399, 31713, 16686],
  [16, '28-05-2023', 48399, 32006, 16393],
  [17, '28-06-2023', 48399, 32302, 16097],
  [18, '18-07-2023', 683.81, 683.81, 0],
  [19, '28-07-2023', 48399, 32602, 15797],
  [20, '28-08-2023', 48399, 32907, 15492],
  [21, '28-09-2023', 48399, 33211, 15188],
  [22, '28-10-2023', 48399, 33518, 14881],
  [23, '28-11-2023', 48399, 33827, 14572],
  [24, '28-12-2023', 48399, 34139, 14260],
  [25, '28-01-2024', 48399, 34455, 13944],
  [26, '28-02-2024', 48399, 34773, 13626],
  [27, '28-03-2024', 48399, 35094, 13305],
  [28, '28-04-2024', 48399, 35418, 12981],
  [29, '28-05-2024', 48399, 35745, 12654],
  [30, '28-06-2024', 48399, 36075, 12324],
  [31, '28-07-2024', 48399, 36408, 11991],
  [32, '28-08-2024', 48399, 36744, 11655],
  [33, '28-09-2024', 48399, 37083, 11316],
  [34, '28-10-2024', 48399, 37426, 10973],
  [35, '28-11-2024', 48399, 37771, 10628],
  [36, '28-12-2024', 48399, 38120, 10279],
  [37, '28-01-2025', 48399, 38472, 9927],
  [38, '28-02-2025', 48399, 38827, 9572],
  [39, '28-03-2025', 48399, 39185, 9214],
  [40, '28-04-2025', 48399, 39547, 8852],
  [41, '28-05-2025', 48399, 39912, 8487],
  [42, '28-06-2025', 48399, 40281, 8118],
  [43, '28-07-2025', 48399, 40653, 7746],
  [44, '28-08-2025', 48399, 41028, 7371],
  [45, '28-09-2025', 48399, 41407, 6992],
  [46, '28-10-2025', 48399, 41789, 6610],
  [47, '28-11-2025', 48399, 42175, 6224],
  [48, '28-12-2025', 48399, 42564, 5835],
  [49, '28-01-2026', 48399, 42957, 5442],
  [50, '28-02-2026', 48399, 43354, 5045],
  [51, '28-03-2026', 48399, 43754, 4645],
  [52, '28-04-2026', 48399, 44158, 4241],
  [53, '28-05-2026', 48399, 44566, 3833],
  [54, '28-06-2026', 48399, 44977, 3422],
  [55, '28-07-2026', 48399, 45392, 3007],
  [56, '28-08-2026', 48399, 45811, 2588],
  [57, '28-09-2026', 48399, 46234, 2165],
  [58, '28-10-2026', 48399, 46661, 1738],
  [59, '28-11-2026', 48399, 47092, 1307],
  [60, '28-12-2026', 48399, 47527, 872],
  [61, '28-01-2027', 47387, 46954.19, 432.81]
];

function toISO(ddmmyyyy) {
  const [d, m, y] = ddmmyyyy.split('-').map(Number);
  const pad = n => (n < 10 ? '0' + n : String(n));
  return `${y}-${pad(m)}-${pad(d)}`;
}

function writeSheet(wb, name, headers, data) {
  const dateH = new Set(['Date', 'DueDate', 'PaidDate', 'DisbursalDate', 'PurchaseDate']);
  const ws = {};
  headers.forEach((h, c) => { ws[XLSX.utils.encode_cell({ r: 0, c })] = { t: 's', v: h }; });
  data.forEach((row, ri) => {
    headers.forEach((h, c) => {
      const val = row[h];
      const ref = XLSX.utils.encode_cell({ r: ri + 1, c });
      ws[ref] = dateH.has(h) ? { t: 's', v: String(val ?? '') } : { t: 's', v: String(val ?? '') };
    });
  });
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(data.length, 1), c: headers.length - 1 } });
  wb.Sheets[name] = ws;
}

const emiRows = SCHEDULE.map(([no, due, amount, principal, interest]) => {
  const dueISO = toISO(due);
  const isPaid = dueISO < STATUS_DATE;
  return {
    ID: no,
    Machine: M1,
    DueDate: dueISO,
    EMIAmount: Math.round(amount * 100) / 100,
    PaidDate: isPaid ? dueISO : '',
    BounceCharges: 0,
    PenaltyCharges: 0,
    TotalPaid: isPaid ? Math.round(amount * 100) / 100 : 0,
    Status: isPaid ? 'Paid' : 'Pending',
    Remarks: `P:${Math.round(principal)} I:${Math.round(interest)}`
  };
});

const paidRows = emiRows.filter(e => e.Status === 'Paid');
const principalPaid = paidRows.reduce((s, e) => {
  const m = e.Remarks.match(/P:(\d+)/);
  return s + (m ? parseInt(m[1], 10) : 0);
}, 0);
const interestPaid = paidRows.reduce((s, e) => {
  const m = e.Remarks.match(/I:(\d+)/);
  return s + (m ? parseInt(m[1], 10) : 0);
}, 0);
const outstanding = 370648.19; // closing principal after instl 53 per PDF
const balanceTenure = emiRows.filter(e => e.Status === 'Pending').length;

const wb = XLSX.readFile(gitaiPath, { cellDates: true });

const EMI_H = ['ID', 'Machine', 'DueDate', 'EMIAmount', 'PaidDate', 'BounceCharges', 'PenaltyCharges', 'TotalPaid', 'Status', 'Remarks'];
writeSheet(wb, 'EMI', EMI_H, emiRows);

const loans = XLSX.utils.sheet_to_json(wb.Sheets.Loans, { defval: '' }).map(l => {
  if (l.Machine !== M1) return l;
  return {
    ...l,
    Lender: LENDER,
    AgreementNo: AGREEMENT,
    LoanAmount: 2222000,
    EMIAmount: EMI_AMOUNT,
    TenureMonths: 60,
    BalanceTenure: balanceTenure,
    IRR: 11.07877,
    PrincipalPaid: Math.round(principalPaid),
    InterestPaid: Math.round(interestPaid),
    OutstandingLoan: Math.round(outstanding),
    DisbursalDate: '2022-01-27',
    Remarks: 'Asset cost ₹31,29,698 | Chola repayment schedule 13/06/2026 | Instl 18 partial ₹683.81'
  };
});

const LOAN_H = ['ID', 'Machine', 'LoanAmount', 'PrincipalPaid', 'InterestPaid', 'OutstandingLoan', 'AgreementNo', 'Lender', 'CustomerID', 'DisbursalDate', 'EMIAmount', 'TenureMonths', 'BalanceTenure', 'IRR', 'InterestType', 'Applicant', 'CoApplicant', 'ProductType', 'LoanStatus', 'OverdueAmount', 'DisbursalStatus', 'Frequency', 'Remarks'];
writeSheet(wb, 'Loans', LOAN_H, loans);

const machines = XLSX.utils.sheet_to_json(wb.Sheets.Machines, { defval: '' }).map(m => {
  if (m.MachineName !== M1) return m;
  return {
    ...m,
    PurchaseCost: 3129698,
    LoanAmount: 2222000,
    Remarks: 'Cholamandalam ' + AGREEMENT + '. RC MH-38-AD-0794. Asset cost ₹31,29,698.'
  };
});

const MACHINE_H = ['ID', 'MachineName', 'PurchaseDate', 'PurchaseCost', 'LoanAmount', 'DownPayment', 'CurrentValue', 'Status', 'Make', 'Model', 'RegistrationNo', 'EngineNo', 'ChassisNo', 'Remarks'];
writeSheet(wb, 'Machines', MACHINE_H, machines);

let docs = XLSX.utils.sheet_to_json(wb.Sheets.Documents || {}, { defval: '' });
docs = docs.filter(d => d.FileName !== 'M1-Chola-EMI-Schedule.pdf');
docs.push({
  ID: docs.length + 1,
  Category: 'EMI Schedule',
  ReferenceID: 1,
  ReferenceModule: 'loans',
  UploadDate: STATUS_DATE,
  UploadedBy: 'Admin',
  FileName: 'M1-Chola-EMI-Schedule.pdf',
  DriveLink: 'documents/M1-Chola-EMI-Schedule.pdf',
  Version: 1,
  Date: STATUS_DATE,
  DocumentType: 'Repayment Schedule',
  GoogleDriveLink: ''
});

const DOC_H = ['ID', 'Category', 'ReferenceID', 'ReferenceModule', 'UploadDate', 'UploadedBy', 'FileName', 'DriveLink', 'Version', 'Date', 'DocumentType', 'GoogleDriveLink'];
writeSheet(wb, 'Documents', DOC_H, docs);

XLSX.writeFile(wb, gitaiPath);

if (fs.existsSync(pdfSource)) {
  fs.mkdirSync(path.dirname(pdfDest), { recursive: true });
  fs.copyFileSync(pdfSource, pdfDest);
}

console.log('M1 EMI schedule imported from Cholamandalam PDF');
console.log('  Installments:', emiRows.length, '(53 paid,', balanceTenure, 'pending)');
console.log('  Lender:', LENDER);
console.log('  Outstanding principal:', outstanding);
console.log('  Principal paid:', Math.round(principalPaid), '| Interest paid:', Math.round(interestPaid));
console.log('  PDF copied to documents/M1-Chola-EMI-Schedule.pdf');
console.log('\nClear cache: localStorage.removeItem("earthmovers-data-v1")');
