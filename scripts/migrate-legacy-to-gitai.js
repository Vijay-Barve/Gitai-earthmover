#!/usr/bin/env node
/**
 * One-time: import Machine register Excel into Gitai.xlsx
 *
 * Usage:
 *   node scripts/migrate-legacy-to-gitai.js [path-to-register.xlsx] [machine-name]
 *
 * Default source: ../Downloads/Gitai_Earthmovers_income-expense-worksheet.xlsx
 */
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const projectRoot = path.join(__dirname, '..');
const LegacyMigrate = require(path.join(projectRoot, 'js/legacy-migrate.js'));

const defaultSource = path.join(require('os').homedir(), 'Downloads/Gitai_Earthmovers_income-expense-worksheet.xlsx');
const sourcePath = process.argv[2] || defaultSource;
const machineName = process.argv[3] || 'Machine 1';
const gitaiPath = path.join(projectRoot, 'Gitai.xlsx');

const SHEETS = [
  { name: 'Partners', key: 'partners', headers: ['ID', 'Date', 'PartnerName', 'TransactionType', 'Amount', 'Remarks'] },
  { name: 'Machines', key: 'machines', headers: ['ID', 'MachineName', 'PurchaseDate', 'PurchaseCost', 'LoanAmount', 'DownPayment', 'CurrentValue', 'Status'] },
  { name: 'Income', key: 'income', headers: ['ID', 'Date', 'Customer', 'Machine', 'Site', 'HoursWorked', 'BillAmount', 'ReceivedAmount', 'PendingAmount', 'Remarks'] },
  { name: 'Expenses', key: 'expenses', headers: ['ID', 'Date', 'ExpenseType', 'Machine', 'Amount', 'PaidBy', 'Remarks'] },
  { name: 'EMI', key: 'emi', headers: ['ID', 'Machine', 'DueDate', 'EMIAmount', 'PaidDate', 'BounceCharges', 'PenaltyCharges', 'TotalPaid', 'Status'] },
  { name: 'Loans', key: 'loans', headers: ['ID', 'Machine', 'LoanAmount', 'PrincipalPaid', 'InterestPaid', 'OutstandingLoan'] },
  { name: 'Assets', key: 'assets', headers: ['ID', 'AssetName', 'PurchaseValue', 'CurrentValue', 'Remarks'] },
  { name: 'Documents', key: 'documents', headers: ['ID', 'Category', 'ReferenceID', 'ReferenceModule', 'UploadDate', 'UploadedBy', 'FileName', 'DriveLink', 'Version', 'Date', 'DocumentType', 'GoogleDriveLink'] },
  { name: 'AuditLog', key: 'audit', headers: ['ID', 'Timestamp', 'User', 'Module', 'Action', 'RecordID', 'OldData', 'NewData', 'IPAddress', 'Remarks'] },
  { name: 'MonthLocks', key: 'monthlocks', headers: ['ID', 'Month', 'Year', 'LockedBy', 'LockedDate', 'Status', 'UnlockReason', 'UnlockedBy', 'UnlockedDate'] },
  { name: 'Users', key: 'users', headers: ['ID', 'Username', 'Password', 'Role', 'Name', 'Active'] },
  { name: 'Vendors', key: 'vendors', headers: ['ID', 'VendorName', 'VendorType', 'Contact', 'TotalPayable', 'Paid', 'Outstanding', 'Remarks'] },
  { name: 'VendorTransactions', key: 'vendortxns', headers: ['ID', 'Date', 'VendorID', 'VendorName', 'Amount', 'Type', 'ReferenceID', 'Remarks'] },
  { name: 'BankStatements', key: 'bankstatements', headers: ['ID', 'Date', 'Description', 'Debit', 'Credit', 'Balance', 'MatchedModule', 'MatchedRecordID', 'MatchStatus'] },
  { name: 'MachineUtilization', key: 'utilization', headers: ['ID', 'Month', 'Year', 'Machine', 'AvailableDays', 'WorkingDays', 'IdleDays'] },
  { name: 'DocumentVersions', key: 'documentversions', headers: ['ID', 'DocumentID', 'Version', 'UploadDate', 'UploadedBy', 'FileName', 'DriveLink'] },
  { name: 'Backups', key: 'backups', headers: ['ID', 'DateTime', 'Type', 'DriveLink', 'CreatedBy', 'Status', 'FileSize'] }
];

function defaultUsers() {
  return [
    { ID: 1, Username: 'admin', Password: 'admin123', Role: 'Admin', Name: 'Administrator', Active: true },
    { ID: 2, Username: 'accountant', Password: 'acc123', Role: 'Accountant', Name: 'Finance Team', Active: true },
    { ID: 3, Username: 'partner', Password: 'partner123', Role: 'Partner', Name: 'Rajesh Gitai', Active: true },
    { ID: 4, Username: 'viewer', Password: 'view123', Role: 'Viewer', Name: 'Auditor', Active: true }
  ];
}

function parseSheet(workbook, sheetDef) {
  const ws = workbook.Sheets[sheetDef.name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: '' })
    .filter(r => r.ID !== '' && r.ID !== null && r.ID !== undefined);
}

function loadGitaiStore() {
  if (!fs.existsSync(gitaiPath)) {
    const store = {};
    SHEETS.forEach(s => { store[s.key] = []; });
    store.users = defaultUsers();
    return store;
  }
  const wb = XLSX.readFile(gitaiPath, { cellDates: true });
  const store = {};
  SHEETS.forEach(s => { store[s.key] = parseSheet(wb, s); });
  if (!store.users.length) store.users = defaultUsers();
  return store;
}

function coerceCellValue(val) {
  if (val === true) return 'TRUE';
  if (val === false) return 'FALSE';
  return val ?? '';
}

function buildWorkbook(store) {
  const dateHeaders = new Set([
    'Date', 'PurchaseDate', 'DueDate', 'PaidDate', 'UploadDate',
    'LockedDate', 'UnlockedDate', 'DateTime'
  ]);
  const wb = XLSX.utils.book_new();
  SHEETS.forEach(sheetDef => {
    const rows = store[sheetDef.key] || [];
    const ws = {};
    sheetDef.headers.forEach((h, c) => {
      ws[XLSX.utils.encode_cell({ r: 0, c })] = { t: 's', v: h };
    });
    rows.forEach((row, ri) => {
      sheetDef.headers.forEach((h, c) => {
        const val = coerceCellValue(row[h]);
        const ref = XLSX.utils.encode_cell({ r: ri + 1, c });
        ws[ref] = dateHeaders.has(h)
          ? { t: 's', v: String(val) }
          : { t: 's', v: String(val) };
      });
    });
    ws['!ref'] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: Math.max(rows.length, 1), c: sheetDef.headers.length - 1 }
    });
    XLSX.utils.book_append_sheet(wb, ws, sheetDef.name);
  });
  return wb;
}

if (!fs.existsSync(sourcePath)) {
  console.error('Source file not found:', sourcePath);
  process.exit(1);
}

global.CONFIG = { LEGACY_MACHINE_NAME: machineName, BUSINESS_START_DATE: '2022-01-01' };
global.XLSX = XLSX;

const legacyWb = XLSX.readFile(sourcePath, { cellDates: true });
const store = loadGitaiStore();

// Replace existing rows for this machine (avoid duplicates on re-run)
store.income = (store.income || []).filter(r => r.Machine !== machineName);
store.expenses = (store.expenses || []).filter(r => r.Machine !== machineName);
store.machines = (store.machines || []).filter(m => m.MachineName !== machineName);

console.log('Source:', sourcePath);
console.log('Target:', gitaiPath);
console.log('Machine:', machineName);

const stats = LegacyMigrate.mergeIntoStore(store, legacyWb, {
  machineName,
  sourceLabel: path.basename(sourcePath)
});

const outWb = buildWorkbook(store);
XLSX.writeFile(outWb, gitaiPath);

console.log('\nMigration complete:');
console.log('  Income rows added:', stats.income);
console.log('  Expense rows added:', stats.expenses);
console.log('  Skipped rows:', stats.skipped);
console.log('  Total income in Gitai.xlsx:', store.income.length);
console.log('  Total expenses in Gitai.xlsx:', store.expenses.length);
console.log('\nClear browser cache: localStorage.removeItem("earthmovers-data-v1") then reload http://localhost:8080');
