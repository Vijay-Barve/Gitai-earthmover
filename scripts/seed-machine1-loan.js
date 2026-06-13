#!/usr/bin/env node
/**
 * Seed Machine 1 — Mahindra Earth Master SX loan & EMI schedule into Gitai.xlsx
 */
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const projectRoot = path.join(__dirname, '..');
const gitaiPath = path.join(projectRoot, 'Gitai.xlsx');
const pdfSource = process.argv[2] || path.join(require('os').homedir(), 'Downloads/03ee6a97-12cb-42a4-b857-49c71dc20918.pdf');
const pdfDest = path.join(projectRoot, 'documents/Machine1-Loan-Agreement.pdf');

const MACHINE_NAME = 'M1- Mahindra earthmaster sx iv 2022';
const LOAN = {
  AgreementNo: 'X0CENDD00004530947',
  Lender: 'Tata Capital',
  CustomerID: '8993419',
  DisbursalDate: '2022-01-27',
  AmountFinanced: 2222000,
  TotalDisbursal: 2155621,
  EMIAmount: 48399,
  TenureMonths: 60,
  BalanceTenure: 8,
  IRR: 11.08,
  InterestType: 'Fixed',
  Applicant: 'MS. BALIRAM DATTRAO BARVE',
  CoApplicant: 'RATNAMALA DATTARAO BARVE',
  ProductType: 'CONSTRUCTION EQUIPMENT',
  LoanStatus: 'Active',
  OverdueAmount: 158,
  DisbursalStatus: 'Fully Disbursed',
  Frequency: 'Monthly',
  StatusDate: '2026-06-13',
  Insurance: { personalAccident: 5854, life: 22000 },
  Charges: { processing: 14443, document: 2200 }
};

const MACHINE = {
  MachineName: MACHINE_NAME,
  PurchaseDate: '2022-01-27',
  PurchaseCost: 2222000,
  LoanAmount: 2222000,
  DownPayment: 66379,
  CurrentValue: 1650000,
  Status: 'Active',
  Make: 'MAHINDRA BACKHOE LOADER',
  Model: 'EARTH MASTER SX',
  RegistrationNo: 'MH-38-AD-0794',
  EngineNo: 'NMG5SGE0074',
  ChassisNo: 'MDZBS2EFCM6L50335',
  Remarks: 'RC/Invoice/Insurance on file. NOC pending.'
};

function addMonths(isoDate, months) {
  const d = new Date(isoDate + 'T12:00:00');
  d.setMonth(d.getMonth() + months);
  const pad = n => (n < 10 ? '0' + n : String(n));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function amortize(principal, annualIrr, emi, monthsPaid) {
  const r = annualIrr / 12 / 100;
  let balance = principal;
  let totalInterest = 0;
  let totalPrincipal = 0;
  for (let i = 0; i < monthsPaid; i++) {
    const interest = balance * r;
    const principalPart = Math.min(emi - interest, balance);
    totalInterest += interest;
    totalPrincipal += principalPart;
    balance -= principalPart;
  }
  return {
    outstanding: Math.max(0, Math.round(balance)),
    principalPaid: Math.round(totalPrincipal),
    interestPaid: Math.round(totalInterest)
  };
}

function loadWorkbook() {
  return XLSX.readFile(gitaiPath, { cellDates: true });
}

function sheetToRows(wb, name) {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

function writeWorkbook(wb) {
  XLSX.writeFile(wb, gitaiPath);
}

function updateSheet(wb, name, headers, rows) {
  const dateHeaders = new Set(['Date', 'PurchaseDate', 'DisbursalDate', 'DueDate', 'PaidDate', 'UploadDate', 'DateTime']);
  const ws = {};
  headers.forEach((h, c) => {
    ws[XLSX.utils.encode_cell({ r: 0, c })] = { t: 's', v: h };
  });
  rows.forEach((row, ri) => {
    headers.forEach((h, c) => {
      const val = row[h];
      const ref = XLSX.utils.encode_cell({ r: ri + 1, c });
      if (val === true) ws[ref] = { t: 's', v: 'TRUE' };
      else if (val === false) ws[ref] = { t: 's', v: 'FALSE' };
      else if (dateHeaders.has(h)) ws[ref] = { t: 's', v: String(val ?? '') };
      else ws[ref] = { t: 's', v: String(val ?? '') };
    });
  });
  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: Math.max(rows.length, 1), c: headers.length - 1 }
  });
  wb.Sheets[name] = ws;
  if (!wb.SheetNames.includes(name)) wb.SheetNames.push(name);
}

const machineHeaders = ['ID', 'MachineName', 'PurchaseDate', 'PurchaseCost', 'LoanAmount', 'DownPayment', 'CurrentValue', 'Status', 'Make', 'Model', 'RegistrationNo', 'EngineNo', 'ChassisNo', 'Remarks'];
const loanHeaders = ['ID', 'Machine', 'LoanAmount', 'PrincipalPaid', 'InterestPaid', 'OutstandingLoan', 'AgreementNo', 'Lender', 'CustomerID', 'DisbursalDate', 'EMIAmount', 'TenureMonths', 'BalanceTenure', 'IRR', 'InterestType', 'Applicant', 'CoApplicant', 'ProductType', 'LoanStatus', 'OverdueAmount', 'DisbursalStatus', 'Frequency', 'Remarks'];
const emiHeaders = ['ID', 'Machine', 'DueDate', 'EMIAmount', 'PaidDate', 'BounceCharges', 'PenaltyCharges', 'TotalPaid', 'Status'];
const docHeaders = ['ID', 'Category', 'ReferenceID', 'ReferenceModule', 'UploadDate', 'UploadedBy', 'FileName', 'DriveLink', 'Version', 'Date', 'DocumentType', 'GoogleDriveLink'];

const wb = loadWorkbook();
const machines = sheetToRows(wb, 'Machines').filter(r => r.MachineName !== MACHINE_NAME);
machines.unshift({ ID: 1, ...MACHINE });

const paidCount = LOAN.TenureMonths - LOAN.BalanceTenure;
const { outstanding, principalPaid, interestPaid } = amortize(
  LOAN.AmountFinanced, LOAN.IRR, LOAN.EMIAmount, paidCount
);

const loanRemarks = [
  `Status as of ${LOAN.StatusDate}`,
  `Insurance: PA ₹${LOAN.Insurance.personalAccident}, Life ₹${LOAN.Insurance.life}`,
  `Charges: Processing ₹${LOAN.Charges.processing}, Docs ₹${LOAN.Charges.document}`,
  'RC/Invoice/Insurance: Yes. NOC: No'
].join(' | ');

const loans = [{
  ID: 1,
  Machine: MACHINE_NAME,
  LoanAmount: LOAN.AmountFinanced,
  PrincipalPaid: principalPaid,
  InterestPaid: interestPaid,
  OutstandingLoan: outstanding,
  AgreementNo: LOAN.AgreementNo,
  Lender: LOAN.Lender,
  CustomerID: LOAN.CustomerID,
  DisbursalDate: LOAN.DisbursalDate,
  EMIAmount: LOAN.EMIAmount,
  TenureMonths: LOAN.TenureMonths,
  BalanceTenure: LOAN.BalanceTenure,
  IRR: LOAN.IRR,
  InterestType: LOAN.InterestType,
  Applicant: LOAN.Applicant,
  CoApplicant: LOAN.CoApplicant,
  ProductType: LOAN.ProductType,
  LoanStatus: LOAN.LoanStatus,
  OverdueAmount: LOAN.OverdueAmount,
  DisbursalStatus: LOAN.DisbursalStatus,
  Frequency: LOAN.Frequency,
  Remarks: loanRemarks
}];

const emiRows = [];
for (let i = 1; i <= LOAN.TenureMonths; i++) {
  const dueDate = addMonths(LOAN.DisbursalDate, i);
  const isPaid = i <= paidCount;
  emiRows.push({
    ID: i,
    Machine: MACHINE_NAME,
    DueDate: dueDate,
    EMIAmount: LOAN.EMIAmount,
    PaidDate: isPaid ? dueDate : '',
    BounceCharges: 0,
    PenaltyCharges: 0,
    TotalPaid: isPaid ? LOAN.EMIAmount : 0,
    Status: isPaid ? 'Paid' : (dueDate < LOAN.StatusDate ? 'Overdue' : 'Pending')
  });
}

let documents = sheetToRows(wb, 'Documents').filter(d => d.FileName !== 'Machine1-Loan-Agreement.pdf');
if (fs.existsSync(pdfSource)) {
  fs.mkdirSync(path.dirname(pdfDest), { recursive: true });
  fs.copyFileSync(pdfSource, pdfDest);
  documents.unshift({
    ID: 1,
    Category: 'Loan Agreement',
    ReferenceID: 1,
    ReferenceModule: 'loans',
    UploadDate: LOAN.DisbursalDate,
    UploadedBy: 'Admin',
    FileName: 'Machine1-Loan-Agreement.pdf',
    DriveLink: 'documents/Machine1-Loan-Agreement.pdf',
    Version: 1,
    Date: LOAN.DisbursalDate,
    DocumentType: 'Loan Agreement',
    GoogleDriveLink: ''
  });
  console.log('Copied PDF to', pdfDest);
} else {
  console.warn('PDF not found at', pdfSource);
}

updateSheet(wb, 'Machines', machineHeaders, machines);
updateSheet(wb, 'Loans', loanHeaders, loans);
updateSheet(wb, 'EMI', emiHeaders, emiRows);
updateSheet(wb, 'Documents', docHeaders, documents);
writeWorkbook(wb);

console.log('\nMachine 1 seeded successfully');
console.log('  Machine:', MACHINE.Make, MACHINE.Model, MACHINE.RegistrationNo);
console.log('  Loan:', LOAN.AgreementNo, formatINR(LOAN.AmountFinanced));
console.log('  EMI:', formatINR(LOAN.EMIAmount), '/ month ×', LOAN.TenureMonths);
console.log('  Paid:', paidCount, '| Remaining:', LOAN.BalanceTenure);
console.log('  Outstanding (calc):', formatINR(outstanding));
console.log('  Principal paid:', formatINR(principalPaid), '| Interest paid:', formatINR(interestPaid));
console.log('  EMI records:', emiRows.length);
console.log('\nClear cache: localStorage.removeItem("earthmovers-data-v1")');

function formatINR(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}
