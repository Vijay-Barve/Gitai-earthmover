#!/usr/bin/env node
/**
 * Merge user's Gitai (1).xlsx (machines + partners) into project Gitai.xlsx
 * Preserves income, expenses, EMI, loans, documents from project file.
 */
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const projectRoot = path.join(__dirname, '..');
const targetPath = path.join(projectRoot, 'Gitai.xlsx');
const sourcePath = process.argv[2] || path.join(require('os').homedir(), 'Downloads/Gitai (1).xlsx');

const M1_NAME = 'M1- Mahindra earthmaster sx iv 2022';
const M2_NAME = 'M2-Mahindra earthmaster sx iv 2023';
const LEGACY_MACHINE = 'Machine 1';

const MACHINE_HEADERS = ['ID', 'MachineName', 'PurchaseDate', 'PurchaseCost', 'LoanAmount', 'DownPayment', 'CurrentValue', 'Status', 'Make', 'Model', 'RegistrationNo', 'EngineNo', 'ChassisNo', 'Remarks'];
const LOAN_HEADERS = ['ID', 'Machine', 'LoanAmount', 'PrincipalPaid', 'InterestPaid', 'OutstandingLoan', 'AgreementNo', 'Lender', 'CustomerID', 'DisbursalDate', 'EMIAmount', 'TenureMonths', 'BalanceTenure', 'IRR', 'InterestType', 'Applicant', 'CoApplicant', 'ProductType', 'LoanStatus', 'OverdueAmount', 'DisbursalStatus', 'Frequency', 'Remarks'];
const EMI_HEADERS = ['ID', 'Machine', 'DueDate', 'EMIAmount', 'PaidDate', 'BounceCharges', 'PenaltyCharges', 'TotalPaid', 'Status'];
const PARTNER_HEADERS = ['ID', 'Date', 'PartnerName', 'TransactionType', 'Amount', 'Remarks'];
const INCOME_HEADERS = ['ID', 'Date', 'Customer', 'Machine', 'Site', 'HoursWorked', 'BillAmount', 'ReceivedAmount', 'PendingAmount', 'Remarks'];
const EXPENSE_HEADERS = ['ID', 'Date', 'ExpenseType', 'Machine', 'Amount', 'PaidBy', 'Remarks'];

const M1_AGREEMENT = {
  PurchaseDate: '2022-01-27',
  Make: 'MAHINDRA BACKHOE LOADER',
  Model: 'EARTH MASTER SX IV 2022',
  RegistrationNo: 'MH-38-AD-0794',
  EngineNo: 'NMG5SGE0074',
  ChassisNo: 'MDZBS2EFCM6L50335',
  Remarks: 'RC/Invoice/Insurance on file. NOC pending. Tata Capital loan.'
};

const M2_DETAILS = {
  Make: 'MAHINDRA BACKHOE LOADER',
  Model: 'EARTH MASTER SX IV 2023',
  Remarks: 'Second machine — update registration when available.'
};

function sheetRows(wb, name) {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

function writeSheet(wb, name, headers, rows) {
  const dateHeaders = new Set(['Date', 'PurchaseDate', 'DisbursalDate', 'DueDate', 'PaidDate', 'UploadDate', 'DateTime']);
  const ws = {};
  headers.forEach((h, c) => { ws[XLSX.utils.encode_cell({ r: 0, c })] = { t: 's', v: h }; });
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
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rows.length, 1), c: headers.length - 1 } });
  wb.Sheets[name] = ws;
  if (!wb.SheetNames.includes(name)) wb.SheetNames.push(name);
}

function remapMachine(name) {
  if (name === LEGACY_MACHINE || name === 'Machine 1') return M1_NAME;
  return name;
}

if (!fs.existsSync(sourcePath)) {
  console.error('Source not found:', sourcePath);
  process.exit(1);
}
if (!fs.existsSync(targetPath)) {
  console.error('Target not found:', targetPath);
  process.exit(1);
}

const sourceWb = XLSX.readFile(sourcePath, { cellDates: true });
const targetWb = XLSX.readFile(targetPath, { cellDates: true });

const srcMachines = sheetRows(sourceWb, 'Machines');
const srcPartners = sheetRows(sourceWb, 'Partners');

const m1Src = srcMachines.find(m => String(m.MachineName).includes('M1')) || srcMachines[1];
const m2Src = srcMachines.find(m => String(m.MachineName).includes('M2')) || srcMachines[0];

const machines = [
  {
    ID: 1,
    MachineName: M1_NAME,
    PurchaseDate: M1_AGREEMENT.PurchaseDate,
    PurchaseCost: m1Src?.PurchaseCost || 2800000,
    LoanAmount: m1Src?.LoanAmount || 2500000,
    DownPayment: m1Src?.DownPayment || 300000,
    CurrentValue: m1Src?.CurrentValue || 1650000,
    Status: m1Src?.Status || 'Active',
    ...M1_AGREEMENT
  },
  {
    ID: 2,
    MachineName: M2_NAME,
    PurchaseDate: formatDate(m2Src?.PurchaseDate) || '2022-01-14',
    PurchaseCost: m2Src?.PurchaseCost || 2672000,
    LoanAmount: m2Src?.LoanAmount || 2222000,
    DownPayment: m2Src?.DownPayment || 450000,
    CurrentValue: m2Src?.CurrentValue || 0,
    Status: m2Src?.Status || 'Active',
    RegistrationNo: '',
    EngineNo: '',
    ChassisNo: '',
    ...M2_DETAILS
  }
];

function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    const pad = n => (n < 10 ? '0' + n : String(n));
    return `${val.getUTCFullYear()}-${pad(val.getUTCMonth() + 1)}-${pad(val.getUTCDate())}`;
  }
  const s = String(val);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : s;
}

const partners = srcPartners.map((p, i) => ({
  ID: i + 1,
  Date: formatDate(p.Date),
  PartnerName: p.PartnerName,
  TransactionType: p.TransactionType,
  Amount: p.Amount,
  Remarks: p.Remarks || ''
}));

let loans = sheetRows(targetWb, 'Loans');
if (loans.length) {
  loans = loans.map(l => ({ ...l, Machine: remapMachine(l.Machine) }));
} else {
  loans = [{
    ID: 1,
    Machine: M1_NAME,
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
    Remarks: 'Tata Capital — linked to M1'
  }];
}

if (!loans.find(l => l.Machine === M2_NAME)) {
  loans.push({
    ID: loans.length + 1,
    Machine: M2_NAME,
    LoanAmount: machines[1].LoanAmount,
    PrincipalPaid: 0,
    InterestPaid: 0,
    OutstandingLoan: machines[1].LoanAmount,
    AgreementNo: '',
    Lender: '',
    DisbursalDate: machines[1].PurchaseDate,
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
    Remarks: 'Update with lender details'
  });
}

const income = sheetRows(targetWb, 'Income').map((r, i) => ({
  ...r,
  ID: r.ID || i + 1,
  Machine: remapMachine(r.Machine)
}));

const expenses = sheetRows(targetWb, 'Expenses').map((r, i) => ({
  ...r,
  ID: r.ID || i + 1,
  Machine: remapMachine(r.Machine)
}));

const emi = sheetRows(targetWb, 'EMI').map((r, i) => ({
  ...r,
  ID: r.ID || i + 1,
  Machine: remapMachine(r.Machine)
}));

const documents = sheetRows(targetWb, 'Documents');

writeSheet(targetWb, 'Machines', MACHINE_HEADERS, machines);
writeSheet(targetWb, 'Partners', PARTNER_HEADERS, partners);
writeSheet(targetWb, 'Loans', LOAN_HEADERS, loans);
writeSheet(targetWb, 'Income', INCOME_HEADERS, income);
writeSheet(targetWb, 'Expenses', EXPENSE_HEADERS, expenses);
writeSheet(targetWb, 'EMI', EMI_HEADERS, emi);

XLSX.writeFile(targetWb, targetPath);

console.log('Merged', sourcePath, '→', targetPath);
console.log('Machines:', machines.map(m => m.MachineName).join(', '));
console.log('Partners:', partners.length);
console.log('Income:', income.length, '(remapped to', M1_NAME + ')');
console.log('Expenses:', expenses.length);
console.log('Loans:', loans.length);
console.log('EMI:', emi.length);
console.log('\nClear cache: localStorage.removeItem("earthmovers-data-v1")');
