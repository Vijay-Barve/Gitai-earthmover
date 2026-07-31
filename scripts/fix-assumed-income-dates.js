#!/usr/bin/env node
/**
 * Fix assumed income dates so they never share a calendar day with real dated rows.
 * Keeps undated-register rows in contiguous free blocks (page order preserved).
 */
const XLSX = require('xlsx');
const path = require('path');

const gitaiPath = path.join(__dirname, '..', 'Gitai.xlsx');
const M2 = 'M2';

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

function isAssumed(r) {
  return /date assumed/i.test(String(r.Remarks || ''));
}

function pageOf(r) {
  const m = String(r.Remarks || '').match(/\bp(\d+)\b/);
  return m ? parseInt(m[1], 10) : 0;
}

function isoAdd(iso, days) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function consecutiveFreeBefore(actualSet, anchor, need) {
  for (let shift = 0; shift < 500; shift++) {
    const end = isoAdd(anchor, -1 - shift);
    const days = [];
    let ok = true;
    for (let i = 0; i < need; i++) {
      const day = isoAdd(end, -(need - 1 - i));
      if (actualSet.has(day)) {
        ok = false;
        break;
      }
      days.push(day);
    }
    if (ok) return days;
  }
  throw new Error('No free block of ' + need + ' days before ' + anchor);
}

function consecutiveFreeAfter(actualSet, anchor, need) {
  for (let shift = 0; shift < 500; shift++) {
    const start = isoAdd(anchor, 1 + shift);
    const days = [];
    let ok = true;
    for (let i = 0; i < need; i++) {
      const day = isoAdd(start, i);
      if (actualSet.has(day)) {
        ok = false;
        break;
      }
      days.push(day);
    }
    if (ok) return days;
  }
  throw new Error('No free block of ' + need + ' days after ' + anchor);
}

function setAssumedDate(row, date, note) {
  row.Date = date;
  let rem = String(row.Remarks || '');
  rem = rem
    .replace(/\s*\|\s*date assumed[^|]*/gi, '')
    .replace(/^date assumed[^|]*\s*\|\s*/i, '')
    .trim()
    .replace(/^\|\s*/, '')
    .replace(/\s*\|\s*$/, '');
  row.Remarks = [rem, note].filter(Boolean).join(' | ');
}

const INCOME_H = [
  'ID', 'Date', 'Customer', 'Machine', 'Site', 'HoursWorked',
  'BillAmount', 'ReceivedAmount', 'PendingAmount', 'Remarks'
];

const wb = XLSX.readFile(gitaiPath, { cellDates: true });
let income = XLSX.utils.sheet_to_json(wb.Sheets.Income, { defval: '' });

const actualDates = new Set(
  income
    .filter(r => String(r.Machine).includes(M2) && !isAssumed(r) && r.Date)
    .map(r => String(r.Date))
);

// --- book3-2: undated pages 1-17 → free block before first dated page (2024-06-28)
const book32 = income.filter(r =>
  String(r.Remarks).includes('imported from Newmachinebook3-2.pdf') && isAssumed(r)
);
const pages32 = [...new Set(book32.map(pageOf))].filter(p => p > 0 && p < 18).sort((a, b) => a - b);
const block32 = consecutiveFreeBefore(actualDates, '2024-06-28', pages32.length);
pages32.forEach((p, i) => {
  const date = block32[i];
  book32.filter(r => pageOf(r) === p).forEach(r => {
    setAssumedDate(r, date, 'date assumed (free block, no clash with real dates)');
  });
  // reserve so later groups don't reuse
  actualDates.add(date);
});
console.log('book3-2 assumed pages', pages32[0], '-', pages32.at(-1), '→', block32[0], '→', block32.at(-1));

// --- book3-1 assumed by page groups
const book31 = income.filter(r =>
  String(r.Remarks).includes('imported from Newmachinebook3-1.pdf') && isAssumed(r)
);
const byPage31 = {};
book31.forEach(r => {
  const p = pageOf(r);
  (byPage31[p] ||= []).push(r);
});

// Early pages (4, 18, 19): place near their previous wrong dates but in free days
// Page 4 was near Apr 2024 → free block before 2024-04-16
if (byPage31[4]?.length) {
  const days = consecutiveFreeBefore(actualDates, '2024-04-16', 1);
  byPage31[4].forEach(r => setAssumedDate(r, days[0], 'date assumed (free block, no clash with real dates)'));
  actualDates.add(days[0]);
  console.log('book3-1 p4 →', days[0], 'n=', byPage31[4].length);
}

// Pages 18-19 were clashing on 2025-06-21 → free block before that
const earlyLate = [...(byPage31[18] || []), ...(byPage31[19] || [])];
if (earlyLate.length) {
  const need = 2; // one day per page group
  const days = consecutiveFreeBefore(actualDates, '2025-06-21', need);
  (byPage31[18] || []).forEach(r => setAssumedDate(r, days[0], 'date assumed (free block, no clash with real dates)'));
  (byPage31[19] || []).forEach(r => setAssumedDate(r, days[1] || days[0], 'date assumed (free block, no clash with real dates)'));
  days.forEach(d => actualDates.add(d));
  console.log('book3-1 p18-19 →', days.join(', '), 'n=', earlyLate.length);
}

// Pages 21-24: keep after 2025-11-26 in free consecutive days (one day per page)
const latePages = [21, 22, 23, 24].filter(p => byPage31[p]?.length);
if (latePages.length) {
  const days = consecutiveFreeAfter(actualDates, '2025-11-26', latePages.length);
  latePages.forEach((p, i) => {
    byPage31[p].forEach(r => setAssumedDate(r, days[i], 'date assumed (free block, no clash with real dates)'));
    actualDates.add(days[i]);
  });
  console.log('book3-1 p21-24 →', days[0], '→', days.at(-1));
}

// Sort date asc, machine, id; renumber
income.sort((a, b) => {
  const da = String(a.Date || '');
  const db = String(b.Date || '');
  if (da !== db) return da < db ? -1 : da > db ? 1 : 0;
  const ma = String(a.Machine).includes('M1') ? 1 : String(a.Machine).includes('M2') ? 2 : 9;
  const mb = String(b.Machine).includes('M1') ? 1 : String(b.Machine).includes('M2') ? 2 : 9;
  if (ma !== mb) return ma - mb;
  // actual before assumed on same day
  const aa = isAssumed(a) ? 1 : 0;
  const ab = isAssumed(b) ? 1 : 0;
  if (aa !== ab) return aa - ab;
  return (parseInt(a.ID, 10) || 0) - (parseInt(b.ID, 10) || 0);
});
income = income.map((r, i) => ({ ...r, ID: i + 1 }));

writeSheet(wb, 'Income', INCOME_H, income);
XLSX.writeFile(wb, gitaiPath);

// verify no collisions
const m2 = income.filter(r => String(r.Machine).includes('M2'));
const byDate = {};
for (const r of m2) {
  const d = String(r.Date);
  byDate[d] ||= { real: 0, assumed: 0 };
  if (isAssumed(r)) byDate[d].assumed++;
  else byDate[d].real++;
}
const collisions = Object.entries(byDate).filter(([, v]) => v.real && v.assumed);
console.log('\nAssumed rows:', m2.filter(isAssumed).length);
console.log('Real+assumed same-day collisions:', collisions.length);
if (collisions.length) collisions.slice(0, 10).forEach(c => console.log(c));
console.log('Done. Income rows:', income.length);
