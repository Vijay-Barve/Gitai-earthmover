#!/usr/bin/env node
/**
 * Import M2 income from Newmachinevook2.pdf, Newmachinebook3-1.pdf, Newmachinebook3-2.pdf
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const root = path.join(__dirname, '..');
const gitaiPath = path.join(root, 'Gitai.xlsx');
const M2 = 'M2-Mahindra earthmaster sx iv 2023';
const batch = path.join(root, 'tmp/m2-income-batch2');

const SOURCES = [
  {
    dir: 'book2',
    tag: 'imported from Newmachinevook2.pdf',
    file: 'Newmachinevook2.pdf'
  },
  {
    dir: 'book3-1',
    tag: 'imported from Newmachinebook3-1.pdf',
    file: 'Newmachinebook3-1.pdf'
  },
  {
    dir: 'book3-2',
    tag: 'imported from Newmachinebook3-2.pdf',
    file: 'Newmachinebook3-2.pdf'
  }
];

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

function parseHours(work) {
  if (!work) return 0;
  const s = String(work);
  let h = 0;
  const hm = s.match(/(\d+(?:\.\d+)?)\s*ता/);
  if (hm) h += Number(hm[1]);
  const mm = s.match(/(\d+)\s*मि/);
  if (mm) h += Number(mm[1]) / 60;
  if (!hm && /(\d+(?:\.\d+)?)\s*hr/i.test(s)) {
    h += Number(RegExp.$1);
  }
  return Math.round(h * 100) / 100;
}

const INCOME_H = [
  'ID', 'Date', 'Customer', 'Machine', 'Site', 'HoursWorked',
  'BillAmount', 'ReceivedAmount', 'PendingAmount', 'Remarks'
];

const tags = SOURCES.map(s => s.tag);
const wb = XLSX.readFile(gitaiPath, { cellDates: true });
let income = XLSX.utils.sheet_to_json(wb.Sheets.Income, { defval: '' });
income = income.filter(r => !tags.some(t => String(r.Remarks || '').includes(t)));

let nextId = income.reduce((m, r) => Math.max(m, parseInt(r.ID, 10) || 0), 0) + 1;
const allImported = [];

for (const src of SOURCES) {
  const rows = JSON.parse(
    fs.readFileSync(path.join(batch, src.dir, 'entries.json'), 'utf8')
  ).filter(r => (Number(r.bill) || 0) > 0 || (Number(r.received) || 0) > 0);

  const imported = rows.map(r => {
    const bill = Number(r.bill) || 0;
    let received = r.received != null ? Number(r.received) : bill;
    let pending = r.pending != null ? Number(r.pending) : Math.max(0, bill - received);
    if (pending === 0 && bill > received) pending = bill - received;
    const date = r.date && r.date !== 'null' ? String(r.date) : '';
    const work = r.work || '';
    const id = nextId++;
    return {
      ID: id,
      Date: date,
      Customer: r.customer || 'Unknown',
      Machine: M2,
      Site: '',
      HoursWorked: parseHours(work),
      BillAmount: bill,
      ReceivedAmount: received,
      PendingAmount: pending,
      Remarks: [r.remarks, work, date ? '' : 'date missing in register', `p${r.page}`, src.tag]
        .filter(Boolean)
        .join(' | ')
    };
  });

  const billSum = imported.reduce((s, r) => s + Number(r.BillAmount), 0);
  const recvSum = imported.reduce((s, r) => s + Number(r.ReceivedAmount), 0);
  const pendSum = imported.reduce((s, r) => s + Number(r.PendingAmount), 0);
  console.log(`${src.file}: ${imported.length} rows | bill ₹${billSum.toLocaleString('en-IN')} | recv ₹${recvSum.toLocaleString('en-IN')} | pend ₹${pendSum.toLocaleString('en-IN')}`);
  allImported.push(...imported);
}

income = income.concat(allImported);
writeSheet(wb, 'Income', INCOME_H, income);
XLSX.writeFile(wb, gitaiPath);

const billSum = allImported.reduce((s, r) => s + Number(r.BillAmount), 0);
const recvSum = allImported.reduce((s, r) => s + Number(r.ReceivedAmount), 0);
const pendSum = allImported.reduce((s, r) => s + Number(r.PendingAmount), 0);
const undated = allImported.filter(r => !r.Date).length;

console.log('\nBatch2 M2 income import complete');
console.log('  Rows:', allImported.length);
console.log('  Undated:', undated);
console.log('  Bill total: ₹' + billSum.toLocaleString('en-IN'));
console.log('  Received: ₹' + recvSum.toLocaleString('en-IN'));
console.log('  Pending: ₹' + pendSum.toLocaleString('en-IN'));
console.log('  Machine:', M2);
console.log('\nNext: node scripts/split-machine-workbooks.js');
console.log('Then Sync from Excel (or clear earthmovers-data-v1)');
