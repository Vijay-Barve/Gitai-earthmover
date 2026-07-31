#!/usr/bin/env node
/**
 * Import M1 income + expenses from M1_book3_1.pdf (dual-page: L/top=expense, R/bottom=income)
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const root = path.join(__dirname, '..');
const gitaiPath = path.join(root, 'Gitai.xlsx');
const M1 = 'M1- Mahindra earthmaster sx iv 2022';
const tmp = path.join(root, 'tmp/m1-book3-1');
const TAG = 'imported from M1_book3_1.pdf';

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

function parseHours(work, hours) {
  if (hours != null && Number(hours) > 0) return Number(hours);
  if (!work) return 0;
  const s = String(work);
  let h = 0;
  const hm = s.match(/(\d+(?:\.\d+)?)\s*ता/);
  if (hm) h += Number(hm[1]);
  const mm = s.match(/(\d+)\s*मि/);
  if (mm) h += Number(mm[1]) / 60;
  return Math.round(h * 100) / 100;
}

function normalizeExpenseType(t) {
  const s = String(t || 'Misc');
  if (/diesel|disel|डिझेल/i.test(s)) return 'Diesel';
  if (/petrol|पेट्रोल/i.test(s)) return 'Misc';
  if (/salary|पगार|मजुरी/i.test(s)) return 'Salary';
  if (/maint|repair|दुरुस्ती|सर्विस/i.test(s)) return 'Maintenance';
  if (/rto/i.test(s)) return 'RTO';
  const allowed = ['Diesel', 'Misc', 'Maintenance', 'Salary', 'RTO'];
  return allowed.includes(s) ? s : 'Misc';
}

function sortByDate(rows, dateField) {
  rows.sort((a, b) => {
    const da = String(a[dateField] || '');
    const db = String(b[dateField] || '');
    if (da !== db) return da < db ? -1 : 1;
    const ma = String(a.Machine || '').includes('M1') ? 1 : String(a.Machine || '').includes('M2') ? 2 : 9;
    const mb = String(b.Machine || '').includes('M1') ? 1 : String(b.Machine || '').includes('M2') ? 2 : 9;
    if (ma !== mb) return ma - mb;
    return (parseInt(a.ID, 10) || 0) - (parseInt(b.ID, 10) || 0);
  });
  return rows.map((r, i) => ({ ...r, ID: i + 1 }));
}

const INCOME_H = [
  'ID', 'Date', 'Customer', 'Machine', 'Site', 'HoursWorked',
  'BillAmount', 'ReceivedAmount', 'PendingAmount', 'Remarks'
];
const EXPENSE_H = ['ID', 'Date', 'ExpenseType', 'Machine', 'Amount', 'PaidBy', 'Remarks'];

const incomeSrc = JSON.parse(fs.readFileSync(path.join(tmp, 'income-all.json'), 'utf8'));
const expenseSrc = JSON.parse(fs.readFileSync(path.join(tmp, 'expense-all.json'), 'utf8'));

const wb = XLSX.readFile(gitaiPath, { cellDates: true });
let income = XLSX.utils.sheet_to_json(wb.Sheets.Income, { defval: '' })
  .filter(r => !String(r.Remarks || '').includes(TAG));
let expenses = XLSX.utils.sheet_to_json(wb.Sheets.Expenses, { defval: '' })
  .filter(r => !String(r.Remarks || '').includes(TAG));

let nextIncId = income.reduce((m, r) => Math.max(m, parseInt(r.ID, 10) || 0), 0) + 1;
let nextExpId = expenses.reduce((m, r) => Math.max(m, parseInt(r.ID, 10) || 0), 0) + 1;

const importedInc = incomeSrc.map(r => {
  const bill = Number(r.bill) || 0;
  let received = r.received != null ? Number(r.received) : bill;
  let pending = r.pending != null ? Number(r.pending) : Math.max(0, bill - received);
  if (pending === 0 && bill > received) pending = bill - received;
  return {
    ID: nextIncId++,
    Date: r.date || '',
    Customer: r.customer || 'Unknown',
    Machine: M1,
    Site: '',
    HoursWorked: parseHours(r.work, r.hours),
    BillAmount: bill,
    ReceivedAmount: received,
    PendingAmount: pending,
    Remarks: [r.remarks, r.work, `p${r.page}`, TAG].filter(Boolean).join(' | ')
  };
});

const importedExp = expenseSrc.map(r => ({
  ID: nextExpId++,
  Date: r.date || '',
  ExpenseType: normalizeExpenseType(r.expenseType),
  Machine: M1,
  Amount: Number(r.amount) || 0,
  PaidBy: r.paidBy || '',
  Remarks: [r.description, r.remarks, `p${r.page}`, TAG].filter(Boolean).join(' | ')
}));

income = sortByDate(income.concat(importedInc), 'Date');
expenses = sortByDate(expenses.concat(importedExp), 'Date');

writeSheet(wb, 'Income', INCOME_H, income);
writeSheet(wb, 'Expenses', EXPENSE_H, expenses);
XLSX.writeFile(wb, gitaiPath);

const bill = importedInc.reduce((s, r) => s + Number(r.BillAmount), 0);
const recv = importedInc.reduce((s, r) => s + Number(r.ReceivedAmount), 0);
const pend = importedInc.reduce((s, r) => s + Number(r.PendingAmount), 0);
const expAmt = importedExp.reduce((s, r) => s + Number(r.Amount), 0);

console.log('M1 import from M1_book3_1.pdf');
console.log('  Income rows:', importedInc.length, '| bill ₹' + bill.toLocaleString('en-IN'),
  '| recv ₹' + recv.toLocaleString('en-IN'), '| pend ₹' + pend.toLocaleString('en-IN'));
console.log('  Expense rows:', importedExp.length, '| amount ₹' + expAmt.toLocaleString('en-IN'));
console.log('  Totals now — Income:', income.length, 'Expenses:', expenses.length);
