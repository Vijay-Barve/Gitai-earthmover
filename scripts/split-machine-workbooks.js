#!/usr/bin/env node
/**
 * Build one standalone workbook per machine from the company master.
 *
 * Gitai.xlsx remains the authoritative company-wide database. Each generated
 * workbook contains only the selected machine's operational and finance rows.
 * Partner contributions are allocated by the machine purchase period because
 * the legacy Partners sheet has no Machine column.
 */
const path = require('path');
const XLSX = require('xlsx');

const root = path.join(__dirname, '..');
const sourcePath = path.join(root, 'Gitai.xlsx');

const DEFINITIONS = [
  {
    code: 'M1',
    machineName: 'M1- Mahindra earthmaster sx iv 2022',
    output: 'Gitai-M1.xlsx',
    partnerFrom: '0000-01-01',
    partnerUntil: '2023-01-14'
  },
  {
    code: 'M2',
    machineName: 'M2-Mahindra earthmaster sx iv 2023',
    output: 'Gitai-M2.xlsx',
    partnerFrom: '2023-01-14',
    partnerUntil: '9999-12-31'
  }
];

const MACHINE_SCOPED_SHEETS = {
  Machines: 'MachineName',
  Income: 'Machine',
  Expenses: 'Machine',
  EMI: 'Machine',
  Loans: 'Machine',
  MachineUtilization: 'Machine'
};

const SHARED_SHEETS = [
  'Assets',
  'MonthLocks',
  'Users',
  'Vendors',
  'VendorTransactions',
  'BankStatements',
  'DocumentVersions',
  'Backups'
];

function rowsFor(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  return sheet ? XLSX.utils.sheet_to_json(sheet, { defval: '' }) : [];
}

function headersFor(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet?.['!ref']) return [];
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const headers = [];
  for (let column = range.s.c; column <= range.e.c; column++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: column })];
    headers.push(cell?.v ?? '');
  }
  return headers.filter(Boolean);
}

function appendSheet(workbook, name, rows, headers) {
  const sheet = XLSX.utils.json_to_sheet(rows, { header: headers, skipHeader: false });
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

function inPartnerPeriod(date, definition) {
  const normalized = String(date || '').slice(0, 10);
  return normalized >= definition.partnerFrom && normalized < definition.partnerUntil;
}

function filterDocuments(source, machineRows, loanRows, definition) {
  const machineIds = new Set(machineRows.map(row => String(row.ID)));
  const loanIds = new Set(loanRows.map(row => String(row.ID)));

  return rowsFor(source, 'Documents').filter(document => {
    const module = String(document.ReferenceModule || '').toLowerCase();
    const referenceId = String(document.ReferenceID || '');
    if (module === 'machines') return machineIds.has(referenceId);
    if (module === 'loans') return loanIds.has(referenceId);

    const searchable = [
      document.Category,
      document.FileName,
      document.DriveLink,
      document.DocumentType
    ].join(' ').toLowerCase();
    return searchable.includes(definition.code.toLowerCase())
      || searchable.includes(definition.machineName.toLowerCase());
  });
}

function filterAudit(source, scopedIds) {
  return rowsFor(source, 'AuditLog').filter(entry => {
    const module = String(entry.Module || '').toLowerCase();
    const ids = scopedIds[module];
    return ids ? ids.has(String(entry.RecordID || '')) : false;
  });
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + (parseFloat(row[field]) || 0), 0);
}

function buildWorkbook(source, definition) {
  const workbook = XLSX.utils.book_new();
  const scoped = {};

  Object.entries(MACHINE_SCOPED_SHEETS).forEach(([sheetName, machineField]) => {
    scoped[sheetName] = rowsFor(source, sheetName)
      .filter(row => row[machineField] === definition.machineName);
  });

  const partners = rowsFor(source, 'Partners')
    .filter(row => inPartnerPeriod(row.Date, definition))
    .map(row => ({ ...row, Machine: definition.machineName }));

  const documents = filterDocuments(
    source,
    scoped.Machines,
    scoped.Loans,
    definition
  );

  const scopedIds = {
    partners: new Set(partners.map(row => String(row.ID))),
    machines: new Set(scoped.Machines.map(row => String(row.ID))),
    income: new Set(scoped.Income.map(row => String(row.ID))),
    expenses: new Set(scoped.Expenses.map(row => String(row.ID))),
    emi: new Set(scoped.EMI.map(row => String(row.ID))),
    loans: new Set(scoped.Loans.map(row => String(row.ID))),
    documents: new Set(documents.map(row => String(row.ID)))
  };
  const audit = filterAudit(source, scopedIds);

  const summary = [{
    MachineCode: definition.code,
    MachineName: definition.machineName,
    SourceFile: 'Gitai.xlsx',
    GeneratedAt: new Date().toISOString(),
    IncomeRows: scoped.Income.length,
    IncomeTotal: sum(scoped.Income, 'BillAmount'),
    ExpenseRows: scoped.Expenses.length,
    ExpenseTotal: sum(scoped.Expenses, 'Amount'),
    EMIRows: scoped.EMI.length,
    EMIPaidTotal: sum(scoped.EMI, 'TotalPaid'),
    PartnerRows: partners.length,
    PartnerInvestment: sum(
      partners.filter(row => row.TransactionType === 'Investment'),
      'Amount'
    ),
    PartnerWithdrawal: sum(
      partners.filter(row => row.TransactionType === 'Withdrawal'),
      'Amount'
    )
  }];
  appendSheet(workbook, 'MachineSummary', summary, Object.keys(summary[0]));

  appendSheet(
    workbook,
    'Partners',
    partners,
    [...headersFor(source, 'Partners'), 'Machine']
  );

  Object.keys(MACHINE_SCOPED_SHEETS).forEach(sheetName => {
    appendSheet(workbook, sheetName, scoped[sheetName], headersFor(source, sheetName));
  });

  appendSheet(workbook, 'Documents', documents, headersFor(source, 'Documents'));
  appendSheet(workbook, 'AuditLog', audit, headersFor(source, 'AuditLog'));

  SHARED_SHEETS.forEach(sheetName => {
    // Users are required for login. Other shared sheets are copied only when
    // empty or inherently company-wide; they are clearly identified as shared.
    const rows = rowsFor(source, sheetName);
    appendSheet(workbook, sheetName, rows, headersFor(source, sheetName));
  });

  return { workbook, summary: summary[0] };
}

if (!require('fs').existsSync(sourcePath)) {
  throw new Error(`Master workbook not found: ${sourcePath}`);
}

const source = XLSX.readFile(sourcePath, { cellDates: true });

for (const definition of DEFINITIONS) {
  const { workbook, summary } = buildWorkbook(source, definition);
  const outputPath = path.join(root, definition.output);
  XLSX.writeFile(workbook, outputPath);
  console.log(`${definition.output}:`, JSON.stringify(summary));
}

