#!/usr/bin/env node
/**
 * Apply confirmed machine mapping:
 *   M1 = 2022 Earth Master — Tata loan ₹22.22L, income register, EMIs
 *   M2 = 2023 machine — ₹25L loan (details TBD)
 */
const path = require('path');
const XLSX = require('xlsx');

const M1 = 'M1- Mahindra earthmaster sx iv 2022';
const M2 = 'M2-Mahindra earthmaster sx iv 2023';
const OLD_NAMES = ['Machine 1', 'M2-Mahindra earthmaster sx iv 2023', 'M1- Mahindra earthmaster sx iv 2022'];

const file = path.join(__dirname, '..', 'Gitai.xlsx');
const wb = XLSX.readFile(file, { cellDates: true });

function rows(name) {
  return XLSX.utils.sheet_to_json(wb.Sheets[name] || {}, { defval: '' });
}

function write(name, headers, data) {
  const dateH = new Set(['Date', 'PurchaseDate', 'DisbursalDate', 'DueDate', 'PaidDate', 'UploadDate', 'DateTime']);
  const ws = {};
  headers.forEach((h, c) => { ws[XLSX.utils.encode_cell({ r: 0, c })] = { t: 's', v: h }; });
  data.forEach((row, ri) => {
    headers.forEach((h, c) => {
      const val = row[h];
      const ref = XLSX.utils.encode_cell({ r: ri + 1, c });
      if (val === true) ws[ref] = { t: 's', v: 'TRUE' };
      else if (val === false) ws[ref] = { t: 's', v: 'FALSE' };
      else if (dateH.has(h)) ws[ref] = { t: 's', v: String(val ?? '') };
      else ws[ref] = { t: 's', v: String(val ?? '') };
    });
  });
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(data.length, 1), c: headers.length - 1 } });
  wb.Sheets[name] = ws;
}

function remapMachine(name) {
  if (!name || name === 'Machine 1') return M1;
  if (name === M2 || name === M1) return name;
  return name;
}

const machines = [
  {
    ID: 1,
    MachineName: M1,
    PurchaseDate: '2022-01-27',
    PurchaseCost: 2672000,
    LoanAmount: 2222000,
    DownPayment: 450000,
    CurrentValue: 1650000,
    Status: 'Active',
    Make: 'MAHINDRA BACKHOE LOADER',
    Model: 'EARTH MASTER SX IV 2022',
    RegistrationNo: 'MH-38-AD-0794',
    EngineNo: 'NMG5SGE0074',
    ChassisNo: 'MDZBS2EFCM6L50335',
    Remarks: 'Tata Capital X0CENDD00004530947. RC/Invoice/Insurance Yes. NOC pending.'
  },
  {
    ID: 2,
    MachineName: M2,
    PurchaseDate: '2023-01-14',
    PurchaseCost: 2800000,
    LoanAmount: 2500000,
    DownPayment: 300000,
    CurrentValue: 0,
    Status: 'Active',
    Make: 'MAHINDRA BACKHOE LOADER',
    Model: 'EARTH MASTER SX IV 2023',
    RegistrationNo: '',
    EngineNo: '',
    ChassisNo: '',
    Remarks: 'Add RC, engine/chassis and lender details when available.'
  }
];

const loans = [
  {
    ID: 1,
    Machine: M1,
    LoanAmount: 2222000,
    PrincipalPaid: 1850312,
    InterestPaid: 666436,
    OutstandingLoan: 371688,
    AgreementNo: 'X0CENDD00004530947',
    Lender: 'Tata Capital',
    CustomerID: '8993419',
    DisbursalDate: '2022-01-27',
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
    Remarks: 'Insurance: PA ₹5854, Life ₹22000 | Charges: Processing ₹14443, Docs ₹2200'
  },
  {
    ID: 2,
    Machine: M2,
    LoanAmount: 2500000,
    PrincipalPaid: 0,
    InterestPaid: 0,
    OutstandingLoan: 2500000,
    AgreementNo: '',
    Lender: '',
    CustomerID: '',
    DisbursalDate: '2023-01-14',
    EMIAmount: 0,
    TenureMonths: 0,
    BalanceTenure: 0,
    IRR: 0,
    InterestType: 'Fixed',
    Applicant: '',
    CoApplicant: '',
    ProductType: 'CONSTRUCTION EQUIPMENT',
    LoanStatus: 'Active',
    OverdueAmount: 0,
    DisbursalStatus: '',
    Frequency: 'Monthly',
    Remarks: '2023 machine — add lender & EMI when available'
  }
];

const income = rows('Income').map((r, i) => ({
  ...r,
  ID: r.ID || i + 1,
  Machine: M1
}));

const expenses = rows('Expenses').map((r, i) => ({
  ...r,
  ID: r.ID || i + 1,
  Machine: M1
}));

const emi = rows('EMI').map((r, i) => ({
  ...r,
  ID: r.ID || i + 1,
  Machine: M1
}));

const documents = rows('Documents').map(d => ({
  ...d,
  ReferenceModule: 'loans',
  ReferenceID: 1,
  FileName: d.FileName || 'Machine1-Loan-Agreement.pdf',
  DriveLink: d.DriveLink || 'documents/Machine1-Loan-Agreement.pdf'
}));

const MACHINE_H = ['ID', 'MachineName', 'PurchaseDate', 'PurchaseCost', 'LoanAmount', 'DownPayment', 'CurrentValue', 'Status', 'Make', 'Model', 'RegistrationNo', 'EngineNo', 'ChassisNo', 'Remarks'];
const LOAN_H = ['ID', 'Machine', 'LoanAmount', 'PrincipalPaid', 'InterestPaid', 'OutstandingLoan', 'AgreementNo', 'Lender', 'CustomerID', 'DisbursalDate', 'EMIAmount', 'TenureMonths', 'BalanceTenure', 'IRR', 'InterestType', 'Applicant', 'CoApplicant', 'ProductType', 'LoanStatus', 'OverdueAmount', 'DisbursalStatus', 'Frequency', 'Remarks'];
const INCOME_H = ['ID', 'Date', 'Customer', 'Machine', 'Site', 'HoursWorked', 'BillAmount', 'ReceivedAmount', 'PendingAmount', 'Remarks'];
const EXPENSE_H = ['ID', 'Date', 'ExpenseType', 'Machine', 'Amount', 'PaidBy', 'Remarks'];
const EMI_H = ['ID', 'Machine', 'DueDate', 'EMIAmount', 'PaidDate', 'BounceCharges', 'PenaltyCharges', 'TotalPaid', 'Status'];
const DOC_H = ['ID', 'Category', 'ReferenceID', 'ReferenceModule', 'UploadDate', 'UploadedBy', 'FileName', 'DriveLink', 'Version', 'Date', 'DocumentType', 'GoogleDriveLink'];

write('Machines', MACHINE_H, machines);
write('Loans', LOAN_H, loans);
write('Income', INCOME_H, income);
write('Expenses', EXPENSE_H, expenses);
write('EMI', EMI_H, emi);
if (documents.length) write('Documents', DOC_H, documents);

XLSX.writeFile(wb, file);

console.log('Confirmed mapping applied:');
console.log('  M1:', M1, '— Tata ₹22.22L,', income.length, 'income,', expenses.length, 'expenses,', emi.length, 'EMIs');
console.log('  M2:', M2, '— ₹25L loan stub (add lender later)');
console.log('\nBump cache: localStorage.removeItem("earthmovers-data-v1") then reload');
