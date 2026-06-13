/**
 * Gitai Earthmovers — Excel file storage (Gitai.xlsx)
 * Uses SheetJS (XLSX) loaded from CDN in index.html
 */
const ExcelStore = (function () {
  /** Excel tab name → app store key + column headers */
  const SHEETS = [
    { name: 'Partners', key: 'partners', headers: ['ID', 'Date', 'PartnerName', 'TransactionType', 'Amount', 'Remarks'] },
    { name: 'Machines', key: 'machines', headers: ['ID', 'MachineName', 'PurchaseDate', 'PurchaseCost', 'LoanAmount', 'DownPayment', 'CurrentValue', 'Status', 'Make', 'Model', 'RegistrationNo', 'EngineNo', 'ChassisNo', 'Remarks'] },
    { name: 'Income', key: 'income', headers: ['ID', 'Date', 'Customer', 'Machine', 'Site', 'HoursWorked', 'BillAmount', 'ReceivedAmount', 'PendingAmount', 'Remarks'] },
    { name: 'Expenses', key: 'expenses', headers: ['ID', 'Date', 'ExpenseType', 'Machine', 'Amount', 'PaidBy', 'Remarks'] },
    { name: 'EMI', key: 'emi', headers: ['ID', 'Machine', 'DueDate', 'EMIAmount', 'PaidDate', 'BounceCharges', 'PenaltyCharges', 'TotalPaid', 'PaymentMode', 'BusinessPaid', 'PartnerPaid', 'PaidByPartner', 'Status', 'Remarks'] },
    { name: 'Loans', key: 'loans', headers: ['ID', 'Machine', 'LoanAmount', 'PrincipalPaid', 'InterestPaid', 'OutstandingLoan', 'AgreementNo', 'Lender', 'CustomerID', 'DisbursalDate', 'EMIAmount', 'TenureMonths', 'BalanceTenure', 'IRR', 'InterestType', 'Applicant', 'CoApplicant', 'ProductType', 'LoanStatus', 'OverdueAmount', 'DisbursalStatus', 'Frequency', 'Remarks'] },
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

  function emptyStore() {
    const store = {};
    SHEETS.forEach(s => { store[s.key] = []; });
    store.users = defaultUsers();
    return store;
  }

  function formatDateField(val) {
    if (!val) return '';
    if (val instanceof Date && !isNaN(val.getTime())) {
      const pad = n => (n < 10 ? '0' + n : String(n));
      return `${val.getUTCFullYear()}-${pad(val.getUTCMonth() + 1)}-${pad(val.getUTCDate())}`;
    }
    const str = String(val);
    const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : str;
  }

  function normalizeRow(row, headers) {
    const obj = {};
    const dateFields = new Set([
      'Date', 'PurchaseDate', 'DueDate', 'PaidDate', 'UploadDate', 'DisbursalDate',
      'LockedDate', 'UnlockedDate', 'DateTime'
    ]);
    const numericFields = new Set([
      'Amount', 'BillAmount', 'ReceivedAmount', 'PendingAmount', 'HoursWorked',
      'PurchaseCost', 'LoanAmount', 'DownPayment', 'CurrentValue', 'EMIAmount',
      'PrincipalPaid', 'InterestPaid', 'OutstandingLoan', 'BounceCharges',
      'PenaltyCharges', 'TotalPaid', 'BusinessPaid', 'PartnerPaid', 'IRR', 'TenureMonths', 'BalanceTenure',
      'OverdueAmount', 'PurchaseValue', 'TotalPayable', 'Paid', 'Outstanding',
      'Debit', 'Credit', 'Balance', 'FileSize', 'Version', 'ReferenceID', 'DocumentID',
      'Month', 'Year', 'AvailableDays', 'WorkingDays', 'IdleDays'
    ]);

    headers.forEach(h => {
      let val = row[h];
      if (val === undefined || val === null) val = '';
      if (h === 'ID' && val !== '') val = parseInt(val, 10) || val;
      if (dateFields.has(h)) val = formatDateField(val);
      else if (numericFields.has(h) && val !== '') val = parseFloat(String(val).replace(/,/g, '')) || 0;
      if (h === 'Active') {
        val = val === true || val === 'TRUE' || val === 'true' || val === 1 || val === '1';
      }
      obj[h] = val;
    });
    return obj;
  }

  function parseSheet(workbook, sheetDef) {
    const ws = workbook.Sheets[sheetDef.name];
    if (!ws) return [];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    return rows
      .filter(r => r.ID !== '' && r.ID !== null && r.ID !== undefined)
      .map(r => normalizeRow(r, sheetDef.headers));
  }

  async function load(url) {
    if (typeof XLSX === 'undefined') {
      throw new Error('SheetJS (XLSX) not loaded');
    }
    const fetchUrl = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error('Could not load ' + url + ' — use http://localhost:8080');
    }
    const buffer = await response.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

    const store = emptyStore();
    SHEETS.forEach(sheetDef => {
      const rows = parseSheet(workbook, sheetDef);
      if (rows.length > 0 || sheetDef.key !== 'users') {
        store[sheetDef.key] = rows;
      }
    });
    if (!store.users.length) store.users = defaultUsers();
    store._version = CONFIG.DATA_SNAPSHOT_VERSION;
    store._loadedFrom = url;
    store._loadedAt = new Date().toISOString();
    return store;
  }

  function coerceCellValue(val) {
    if (val === true) return 'TRUE';
    if (val === false) return 'FALSE';
    return val ?? '';
  }

  function buildWorkbook(store) {
    const workbook = XLSX.utils.book_new();
    const dateHeaders = new Set([
      'Date', 'PurchaseDate', 'DueDate', 'PaidDate', 'UploadDate',
      'LockedDate', 'UnlockedDate', 'DateTime'
    ]);

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
          if (dateHeaders.has(h)) {
            ws[ref] = { t: 's', v: String(val) };
          } else if (typeof val === 'number' && h !== 'ID') {
            ws[ref] = { t: 'n', v: val };
          } else {
            ws[ref] = { t: 's', v: String(val) };
          }
        });
      });
      ws['!ref'] = XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: Math.max(rows.length, 1), c: sheetDef.headers.length - 1 }
      });
      XLSX.utils.book_append_sheet(workbook, ws, sheetDef.name);
    });
    return workbook;
  }

  function download(store, filename) {
    if (typeof XLSX === 'undefined') {
      throw new Error('SheetJS (XLSX) not loaded');
    }
    XLSX.writeFile(buildWorkbook(store), filename || CONFIG.EXCEL_FILE);
  }

  async function importFile(file) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

    if (typeof LegacyMigrate !== 'undefined' && LegacyMigrate.isLegacyWorkbook(workbook)) {
      const store = emptyStore();
      const stats = LegacyMigrate.mergeIntoStore(store, workbook, {
        sourceLabel: file.name
      });
      store._legacyImportStats = stats;
      return store;
    }

    const store = emptyStore();
    SHEETS.forEach(sheetDef => {
      store[sheetDef.key] = parseSheet(workbook, sheetDef);
    });
    if (!store.users.length) store.users = defaultUsers();
    return store;
  }

  async function importLegacyRegister(file, machineName) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    if (!LegacyMigrate.isLegacyWorkbook(workbook)) {
      throw new Error('Not a machine register file (Register tab with Income/Expense columns expected).');
    }
    return { workbook, machineName: machineName || CONFIG.LEGACY_MACHINE_NAME };
  }

  return { load, download, importFile, importLegacyRegister, emptyStore, SHEETS };
})();
