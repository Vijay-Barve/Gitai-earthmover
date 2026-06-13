#!/usr/bin/env node
/** Add BusinessPaid, PartnerPaid, PaidByPartner, PaymentMode to EMI sheet */
const path = require('path');
const XLSX = require('xlsx');

const root = path.join(__dirname, '..');
const gitaiPath = path.join(root, 'Gitai.xlsx');
const EMI_H = [
  'ID', 'Machine', 'DueDate', 'EMIAmount', 'PaidDate', 'BounceCharges', 'PenaltyCharges',
  'TotalPaid', 'PaymentMode', 'BusinessPaid', 'PartnerPaid', 'PaidByPartner', 'Status', 'Remarks'
];

function writeSheet(wb, name, headers, data) {
  const ws = {};
  headers.forEach((h, c) => { ws[XLSX.utils.encode_cell({ r: 0, c })] = { t: 's', v: h }; });
  data.forEach((row, ri) => {
    headers.forEach((h, c) => {
      ws[XLSX.utils.encode_cell({ r: ri + 1, c })] = { t: 's', v: String(row[h] ?? '') };
    });
  });
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(data.length, 1), c: headers.length - 1 } });
  wb.Sheets[name] = ws;
}

const wb = XLSX.readFile(gitaiPath, { cellDates: true });
const rows = XLSX.utils.sheet_to_json(wb.Sheets.EMI, { defval: '' });

const out = rows.map(row => {
  const total = parseFloat(row.TotalPaid) || 0;
  const paid = row.Status === 'Paid' || row.PaidDate;
  const hasPartner = String(row.PartnerPaid || '').trim() !== '' && parseFloat(row.PartnerPaid) > 0;
  const business = parseFloat(row.BusinessPaid) || (paid && !hasPartner ? total : 0);
  const partner = parseFloat(row.PartnerPaid) || 0;
  let mode = row.PaymentMode || '';
  if (!mode) {
    if (partner > 0 && business > 0) mode = 'Split';
    else if (partner > 0) mode = 'Partner';
    else if (paid && total > 0) mode = 'Business';
    else mode = 'Business';
  }
  return {
    ...row,
    PaymentMode: mode,
    BusinessPaid: business,
    PartnerPaid: partner,
    PaidByPartner: row.PaidByPartner || ''
  };
});

writeSheet(wb, 'EMI', EMI_H, out);
XLSX.writeFile(wb, gitaiPath);
console.log('EMI split columns migrated:', out.length, 'rows');
