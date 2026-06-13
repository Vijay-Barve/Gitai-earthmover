#!/usr/bin/env node
/**
 * Re-import income/expense register into Gitai.xlsx (fixes missing data)
 */
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const root = path.join(__dirname, '..');
const gitaiPath = path.join(root, 'Gitai.xlsx');
const registerPath = process.argv[2] || path.join(require('os').homedir(), 'Downloads/Gitai_Earthmovers_income-expense-worksheet.xlsx');
const MACHINE = 'M1- Mahindra earthmaster sx iv 2022';

global.CONFIG = { LEGACY_MACHINE_NAME: MACHINE, BUSINESS_START_DATE: '2022-01-01' };
global.XLSX = XLSX;
const LegacyMigrate = require(path.join(root, 'js/legacy-migrate.js'));

function rows(wb, name) {
  const ws = wb.Sheets[name];
  return ws ? XLSX.utils.sheet_to_json(ws, { defval: '' }) : [];
}

function writeSheet(wb, name, headers, data) {
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

if (!fs.existsSync(registerPath)) {
  console.error('Register file not found:', registerPath);
  process.exit(1);
}

const wb = XLSX.readFile(gitaiPath, { cellDates: true });
const regWb = XLSX.readFile(registerPath, { cellDates: true });

const store = {
  income: [],
  expenses: [],
  machines: rows(wb, 'Machines'),
  partners: rows(wb, 'Partners'),
  loans: rows(wb, 'Loans'),
  emi: rows(wb, 'EMI')
};

const stats = LegacyMigrate.mergeIntoStore(store, regWb, {
  machineName: MACHINE,
  sourceLabel: path.basename(registerPath)
});

const INCOME_H = ['ID', 'Date', 'Customer', 'Machine', 'Site', 'HoursWorked', 'BillAmount', 'ReceivedAmount', 'PendingAmount', 'Remarks'];
const EXPENSE_H = ['ID', 'Date', 'ExpenseType', 'Machine', 'Amount', 'PaidBy', 'Remarks'];

writeSheet(wb, 'Income', INCOME_H, store.income);
writeSheet(wb, 'Expenses', EXPENSE_H, store.expenses);

XLSX.writeFile(wb, gitaiPath);

console.log('Re-imported from', registerPath);
console.log('Income:', stats.income, '| Expenses:', stats.expenses, '| Skipped:', stats.skipped);
console.log('Machine:', MACHINE);
console.log('Total in Gitai.xlsx — income:', store.income.length, 'expenses:', store.expenses.length);
