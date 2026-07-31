#!/usr/bin/env node
/**
 * Apply M2 Cholamandalam loan + RC details from portal / M2loan.pdf
 * Agreement: X0CENDD00005335473 · status date 29-07-2026
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const root = path.join(__dirname, '..');
const gitaiPath = path.join(root, 'Gitai.xlsx');
const pdfSource = process.argv[2] || path.join(require('os').homedir(), 'Desktop/M2loan.pdf');
const pdfDest = path.join(root, 'documents/M2-Chola-Loan-Agreement.pdf');

const M2 = 'M2-Mahindra earthmaster sx iv 2023';
const AGREEMENT = 'X0CENDD00005335473';
const LENDER = 'Cholamandalam Investment and Finance';
const STATUS_DATE = '2026-07-29';
const AMOUNT_FINANCED = 2436000;
const EMI = 52960;
const TENURE = 60;
const BALANCE_TENURE = 18;
const PAID_MONTHS = TENURE - BALANCE_TENURE;
const IRR = 11;

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

const amort = estimateAmort(AMOUNT_FINANCED, IRR, EMI, PAID_MONTHS);
const chargesNote = [
  'PAC ₹3,226',
  'Life insurance ₹36,000',
  'Processing ₹12,200',
  'Sourcing ₹2,200',
  'Total disbursal ₹23,62,792',
  `Status ${STATUS_DATE}: overdue EMI ₹52,960 + other ₹1,802 = ₹54,762`,
  'PDD: Insurance/Invoice/RC Yes · NOC No'
].join(' | ');

const wb = XLSX.readFile(gitaiPath, { cellDates: true });

const MACHINE_H = [
  'ID', 'MachineName', 'PurchaseDate', 'PurchaseCost', 'LoanAmount', 'DownPayment',
  'CurrentValue', 'Status', 'Make', 'Model', 'RegistrationNo', 'EngineNo', 'ChassisNo', 'Remarks'
];
const machines = XLSX.utils.sheet_to_json(wb.Sheets.Machines, { defval: '' }).map(m => {
  if (m.MachineName !== M2) return m;
  const purchaseCost = parseFloat(m.PurchaseCost) || 2800000;
  return {
    ...m,
    PurchaseDate: '2023-01-14',
    PurchaseCost: purchaseCost,
    LoanAmount: AMOUNT_FINANCED,
    DownPayment: Math.max(0, purchaseCost - AMOUNT_FINANCED),
    Status: 'Active',
    Make: 'MAHINDRA BACKHOE LOADER',
    Model: 'EARTH MASTER SX',
    RegistrationNo: 'MH-38-AD-4046',
    EngineNo: 'NNH5SGE0071',
    ChassisNo: 'MDZBS2EFAP6A49798',
    Remarks: `Chola ${AGREEMENT}. RC MH-38-AD-4046. ${chargesNote}`
  };
});
writeSheet(wb, 'Machines', MACHINE_H, machines);

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
    LoanAmount: AMOUNT_FINANCED,
    PrincipalPaid: amort.principalPaid,
    InterestPaid: amort.interestPaid,
    OutstandingLoan: amort.outstanding,
    AgreementNo: AGREEMENT,
    Lender: LENDER,
    CustomerID: '10957920',
    DisbursalDate: '2023-01-21',
    EMIAmount: EMI,
    TenureMonths: TENURE,
    BalanceTenure: BALANCE_TENURE,
    IRR: IRR,
    InterestType: 'Fixed',
    Applicant: 'MS. GAJANAN VITTHAL BARVE',
    CoApplicant: 'SHRADHA GAJANAN BARVE',
    ProductType: 'CONSTRUCTION EQUIPMENT',
    LoanStatus: 'Active',
    OverdueAmount: 54762,
    DisbursalStatus: 'Fully Disbursed',
    Frequency: 'Monthly',
    Remarks: chargesNote + ' | Principal/interest paid estimated from 11% IRR until EMI schedule import'
  };
});
writeSheet(wb, 'Loans', LOAN_H, loans);

const DOC_H = [
  'ID', 'Category', 'ReferenceID', 'ReferenceModule', 'UploadDate', 'UploadedBy',
  'FileName', 'DriveLink', 'Version', 'Date', 'DocumentType', 'GoogleDriveLink'
];
let docs = XLSX.utils.sheet_to_json(wb.Sheets.Documents || {}, { defval: '' });
docs = docs.filter(d => d.FileName !== 'M2-Chola-Loan-Agreement.pdf');
const nextId = docs.reduce((max, d) => Math.max(max, parseInt(d.ID, 10) || 0), 0) + 1;
docs.push({
  ID: nextId,
  Category: 'Loan Agreement',
  ReferenceID: 2,
  ReferenceModule: 'loans',
  UploadDate: STATUS_DATE,
  UploadedBy: 'Admin',
  FileName: 'M2-Chola-Loan-Agreement.pdf',
  DriveLink: 'documents/M2-Chola-Loan-Agreement.pdf',
  Version: 1,
  Date: '2023-01-21',
  DocumentType: 'Loan Agreement',
  GoogleDriveLink: ''
});
writeSheet(wb, 'Documents', DOC_H, docs);

XLSX.writeFile(wb, gitaiPath);

if (fs.existsSync(pdfSource)) {
  fs.mkdirSync(path.dirname(pdfDest), { recursive: true });
  fs.copyFileSync(pdfSource, pdfDest);
  console.log('PDF copied →', pdfDest);
} else {
  console.warn('PDF not found:', pdfSource);
}

console.log('M2 loan applied');
console.log('  Agreement:', AGREEMENT);
console.log('  Amount financed:', AMOUNT_FINANCED);
console.log('  EMI:', EMI, '| Balance tenure:', BALANCE_TENURE);
console.log('  Estimated outstanding:', amort.outstanding);
console.log('  Overdue (as of', STATUS_DATE + '):', 54762);
console.log('  RC: MH-38-AD-4046 | Engine: NNH5SGE0071');
console.log('\nClear cache: localStorage.removeItem("earthmovers-data-v1")');
console.log('Regenerate machine files: node scripts/split-machine-workbooks.js');
