#!/usr/bin/env node
/**
 * Import M2 income rows transcribed from Newmachine2.pdf (handwritten register)
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const root = path.join(__dirname, '..');
const gitaiPath = path.join(root, 'Gitai.xlsx');
const M2 = 'M2-Mahindra earthmaster sx iv 2023';
const tmp = path.join(root, 'tmp/m2-income-pdf');

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

const part1 = JSON.parse(fs.readFileSync(path.join(tmp, 'pages-01-12.json'), 'utf8'));
const part2 = JSON.parse(fs.readFileSync(path.join(tmp, 'pages-13-18.json'), 'utf8'));
const rows = [...part1, ...part2].filter(r => r.bill > 0 || r.received > 0);

const wb = XLSX.readFile(gitaiPath, { cellDates: true });
const INCOME_H = [
  'ID', 'Date', 'Customer', 'Machine', 'Site', 'HoursWorked',
  'BillAmount', 'ReceivedAmount', 'PendingAmount', 'Remarks'
];

let income = XLSX.utils.sheet_to_json(wb.Sheets.Income, { defval: '' });
// Remove previous import from this PDF if re-run
income = income.filter(r => !String(r.Remarks || '').includes('imported from Newmachine2.pdf'));

let nextId = income.reduce((m, r) => Math.max(m, parseInt(r.ID, 10) || 0), 0) + 1;

const imported = rows.map(r => {
  const bill = Number(r.bill) || 0;
  let received = r.received != null ? Number(r.received) : bill;
  let pending = r.pending != null ? Number(r.pending) : Math.max(0, bill - received);
  if (pending === 0 && bill > received) pending = bill - received;
  const id = nextId++;
  return {
    ID: id,
    Date: r.date,
    Customer: r.customer || r.customerMr || 'Unknown',
    Machine: M2,
    Site: '',
    HoursWorked: Number(r.hours) || 0,
    BillAmount: bill,
    ReceivedAmount: received,
    PendingAmount: pending,
    Remarks: [r.remarks, r.customerMr, `p${r.page}`, 'imported from Newmachine2.pdf']
      .filter(Boolean)
      .join(' | ')
  };
});

income = income.concat(imported);
writeSheet(wb, 'Income', INCOME_H, income);
XLSX.writeFile(wb, gitaiPath);

const billSum = imported.reduce((s, r) => s + Number(r.BillAmount), 0);
const recvSum = imported.reduce((s, r) => s + Number(r.ReceivedAmount), 0);
const pendSum = imported.reduce((s, r) => s + Number(r.PendingAmount), 0);

console.log('M2 income imported from Newmachine2.pdf');
console.log('  Rows:', imported.length);
console.log('  Bill total: ₹' + billSum.toLocaleString('en-IN'));
console.log('  Received: ₹' + recvSum.toLocaleString('en-IN'));
console.log('  Pending: ₹' + pendSum.toLocaleString('en-IN'));
console.log('  Machine:', M2);
console.log('\nSync from Excel in app, or: node scripts/split-machine-workbooks.js');
console.log('Clear cache: localStorage.removeItem("earthmovers-data-v1")');
