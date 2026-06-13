/**
 * Gitai Earthmovers — Google Apps Script REST API
 *
 * Deploy as Web App with:
 *   Execute as: Me
 *   Who has access: Anyone (or Anyone with Google account)
 *
 * Spreadsheet must contain sheets: Partners, Machines, Income, Expenses, EMI, Loans, Assets, Documents, AuditLog
 */

const SPREADSHEET_ID = '1RsNG4F2B70OV5jo1WndqN77j3lvx9Snp6kMEnPWctR8';
const BACKUP_FOLDER_ID = 'YOUR_BACKUP_DRIVE_FOLDER_ID';
const DOCUMENTS_FOLDER_ID = 'YOUR_DOCUMENTS_DRIVE_FOLDER_ID';

/** Name of your existing income/expense tab (auto-detected if blank) */
const LEGACY_REGISTER_SHEET = '';

const SHEET_CONFIG = {
  partners: { sheet: 'Partners', headers: ['ID', 'Date', 'PartnerName', 'TransactionType', 'Amount', 'Remarks'] },
  machines: { sheet: 'Machines', headers: ['ID', 'MachineName', 'PurchaseDate', 'PurchaseCost', 'LoanAmount', 'DownPayment', 'CurrentValue', 'Status'] },
  income: { sheet: 'Income', headers: ['ID', 'Date', 'Customer', 'Machine', 'Site', 'HoursWorked', 'BillAmount', 'ReceivedAmount', 'PendingAmount', 'Remarks'] },
  expenses: { sheet: 'Expenses', headers: ['ID', 'Date', 'ExpenseType', 'Machine', 'Amount', 'PaidBy', 'Remarks'] },
  emi: { sheet: 'EMI', headers: ['ID', 'Machine', 'DueDate', 'EMIAmount', 'PaidDate', 'BounceCharges', 'PenaltyCharges', 'TotalPaid', 'Status'] },
  loans: { sheet: 'Loans', headers: ['ID', 'Machine', 'LoanAmount', 'PrincipalPaid', 'InterestPaid', 'OutstandingLoan'] },
  assets: { sheet: 'Assets', headers: ['ID', 'AssetName', 'PurchaseValue', 'CurrentValue', 'Remarks'] },
  documents: { sheet: 'Documents', headers: ['ID', 'Category', 'ReferenceID', 'ReferenceModule', 'UploadDate', 'UploadedBy', 'FileName', 'DriveLink', 'Version', 'Date', 'DocumentType', 'GoogleDriveLink'] },
  audit: { sheet: 'AuditLog', headers: ['ID', 'Timestamp', 'User', 'Module', 'Action', 'RecordID', 'OldData', 'NewData', 'IPAddress', 'Remarks'] },
  monthlocks: { sheet: 'MonthLocks', headers: ['ID', 'Month', 'Year', 'LockedBy', 'LockedDate', 'Status', 'UnlockReason', 'UnlockedBy', 'UnlockedDate'] },
  users: { sheet: 'Users', headers: ['ID', 'Username', 'Password', 'Role', 'Name', 'Active'] },
  vendors: { sheet: 'Vendors', headers: ['ID', 'VendorName', 'VendorType', 'Contact', 'TotalPayable', 'Paid', 'Outstanding', 'Remarks'] },
  vendortxns: { sheet: 'VendorTransactions', headers: ['ID', 'Date', 'VendorID', 'VendorName', 'Amount', 'Type', 'ReferenceID', 'Remarks'] },
  bankstatements: { sheet: 'BankStatements', headers: ['ID', 'Date', 'Description', 'Debit', 'Credit', 'Balance', 'MatchedModule', 'MatchedRecordID', 'MatchStatus'] },
  utilization: { sheet: 'MachineUtilization', headers: ['ID', 'Month', 'Year', 'Machine', 'AvailableDays', 'WorkingDays', 'IdleDays'] },
  documentversions: { sheet: 'DocumentVersions', headers: ['ID', 'DocumentID', 'Version', 'UploadDate', 'UploadedBy', 'FileName', 'DriveLink'] },
  backups: { sheet: 'Backups', headers: ['ID', 'DateTime', 'Type', 'DriveLink', 'CreatedBy', 'Status', 'FileSize'] }
};

const LOCKABLE_ENDPOINTS = ['income', 'expenses', 'partners', 'emi'];
const DATE_FIELDS = { income: 'Date', expenses: 'Date', partners: 'Date', emi: 'DueDate' };

// ─── HTTP Handlers ───────────────────────────────────────────────────────────

function doGet(e) {
  try {
    return wrapJsonpResponse(handleRequest(e, 'GET'), e);
  } catch (err) {
    return wrapJsonpResponse(createJsonResponse({ success: false, error: err.message || String(err) }), e);
  }
}

function doPost(e) {
  let method = 'POST';
  try {
    if (e.postData && e.postData.contents) {
      const body = JSON.parse(e.postData.contents);
      if (body.method) method = body.method.toUpperCase();
    }
  } catch (err) {
    // fall through with POST
  }
  if (e.parameter && e.parameter.method) {
    method = e.parameter.method.toUpperCase();
  }
  return handleRequest(e, method);
}

function doOptions() {
  return createJsonResponse({ success: true });
}

// ─── Request Router ──────────────────────────────────────────────────────────

function handleRequest(e, method) {
  try {
    const params = e.parameter || {};

    // Mutations via GET query params — required for browser CORS with Apps Script Web Apps
    if (params.method) {
      method = String(params.method).toUpperCase();
    }

    let endpoint = (params.endpoint || '').toLowerCase();
    let id = params.id || null;
    let bodyData = {};

    if (params.data) {
      try {
        bodyData = JSON.parse(params.data);
      } catch (parseErr) {
        return createJsonResponse({ success: false, error: 'Invalid JSON in data parameter' });
      }
    }

    if (e.postData && e.postData.contents) {
      try {
        const raw = e.postData.contents;
        let body;
        if (e.postData.type === 'application/x-www-form-urlencoded') {
          const parsed = {};
          raw.split('&').forEach(function (pair) {
            const kv = pair.split('=');
            parsed[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' '));
          });
          body = parsed.payload ? JSON.parse(parsed.payload) : parsed;
        } else {
          body = JSON.parse(raw);
        }
        if (!params.data) {
          bodyData = body.data || body;
        }
        if (body.id) id = body.id;
        if (body.endpoint) endpoint = body.endpoint.toLowerCase();
        if (body.method) method = String(body.method).toUpperCase();
        if (body.action) params.action = body.action;
      } catch (parseErr) {
        return createJsonResponse({ success: false, error: 'Invalid request body' });
      }
    }

    if (endpoint === 'action') {
      return createJsonResponse(handleAction(bodyData, params.action || bodyData.action));
    }

    if (!endpoint || !SHEET_CONFIG[endpoint]) {
      return createJsonResponse({ success: false, error: 'Invalid endpoint. Use: ' + Object.keys(SHEET_CONFIG).join(', ') });
    }

    // Audit logs are read-only via API
    if (endpoint === 'audit' && method !== 'GET') {
      return createJsonResponse({ success: false, error: 'Audit logs are immutable' });
    }

    let result;
    switch (method) {
      case 'GET':
        result = id ? getRecord(endpoint, id) : getAllRecords(endpoint);
        break;
      case 'POST':
        result = createRecord(endpoint, bodyData);
        break;
      case 'PUT':
        result = updateRecord(endpoint, id || bodyData.ID, bodyData);
        break;
      case 'DELETE':
        result = deleteRecord(endpoint, id);
        break;
      default:
        return createJsonResponse({ success: false, error: 'Unsupported method: ' + method });
    }

    return createJsonResponse(result);
  } catch (err) {
    return createJsonResponse({ success: false, error: err.message || String(err) });
  }
}

// ─── CRUD Operations ─────────────────────────────────────────────────────────

function getSpreadsheet() {
  // Prefer the spreadsheet this script is bound to (Extensions → Apps Script from your sheet)
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;

  var id = (SPREADSHEET_ID || '').trim();
  if (id && id !== 'YOUR_SPREADSHEET_ID_HERE') {
    return SpreadsheetApp.openById(id);
  }
  throw new Error(
    'Cannot open spreadsheet. Open your Gitai sheet → Extensions → Apps Script, paste Code.gs, Save, then run again.'
  );
}

/**
 * Run from Apps Script editor to verify spreadsheet access before using the Web App.
 */
function testSpreadsheetConnection() {
  var ss = getSpreadsheet();
  Logger.log('OK — connected to: ' + ss.getName());
  Logger.log('Spreadsheet ID: ' + ss.getId());
  Logger.log('Sheet tabs: ' + ss.getSheets().map(function (s) { return s.getName(); }).join(', '));
}

function getSheet(endpoint) {
  const config = SHEET_CONFIG[endpoint];
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(config.sheet);
  if (!sheet) {
    sheet = ss.insertSheet(config.sheet);
    sheet.appendRow(config.headers);
    sheet.getRange(1, 1, 1, config.headers.length).setFontWeight('bold').setBackground('#f5c518');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function rowsToObjects(sheet, headers) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const fileHeaders = data[0].map(String);
  return data.slice(1)
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => {
      const obj = {};
      headers.forEach(h => {
        const idx = fileHeaders.indexOf(h);
        obj[h] = idx >= 0 ? row[idx] : '';
      });
      return obj;
    });
}

function getAllRecords(endpoint) {
  const config = SHEET_CONFIG[endpoint];
  const sheet = getSheet(endpoint);
  const records = rowsToObjects(sheet, config.headers);
  return { success: true, data: records };
}

function getRecord(endpoint, id) {
  const all = getAllRecords(endpoint);
  const record = all.data.find(r => String(r.ID) === String(id));
  if (!record) return { success: false, error: 'Record not found' };
  return { success: true, data: record };
}

function getNextId(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return 1;
  let maxId = 0;
  for (let i = 1; i < data.length; i++) {
    const id = parseInt(data[i][0], 10);
    if (!isNaN(id) && id > maxId) maxId = id;
  }
  return maxId + 1;
}

function createRecord(endpoint, data) {
  const lockCheck = validateMonthLock(endpoint, data, null, 'POST');
  if (!lockCheck.allowed) return lockCheck;

  const config = SHEET_CONFIG[endpoint];
  const sheet = getSheet(endpoint);
  const newId = getNextId(sheet);
  const record = {};
  config.headers.forEach(h => {
    if (h === 'ID') {
      record[h] = newId;
    } else {
      record[h] = data[h] !== undefined ? data[h] : '';
    }
  });

  const row = config.headers.map(h => record[h]);
  sheet.appendRow(row);

  if (endpoint !== 'audit') {
    logAudit('CREATE', endpoint, newId, '', JSON.stringify(record), data._user || 'System', '');
  }

  return { success: true, data: record };
}

function updateRecord(endpoint, id, data) {
  const config = SHEET_CONFIG[endpoint];
  const sheet = getSheet(endpoint);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0].map(String);

  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][0]) === String(id)) {
      const oldRecord = {};
      headers.forEach((h, idx) => { oldRecord[h] = allData[i][idx]; });

      const lockCheck = validateMonthLock(endpoint, data, oldRecord, 'PUT');
      if (!lockCheck.allowed) return lockCheck;

      headers.forEach((h, idx) => {
        if (h === 'ID') return;
        if (data[h] !== undefined) {
          sheet.getRange(i + 1, idx + 1).setValue(data[h]);
          allData[i][idx] = data[h];
        }
      });

      const newRecord = {};
      headers.forEach((h, idx) => { newRecord[h] = allData[i][idx]; });

      if (endpoint !== 'audit') {
        logAudit('UPDATE', endpoint, id, JSON.stringify(oldRecord), JSON.stringify(newRecord), data._user || 'System', '');
      }

      return { success: true, data: newRecord };
    }
  }
  return { success: false, error: 'Record not found' };
}

function deleteRecord(endpoint, id) {
  if (!id) return { success: false, error: 'ID required for delete' };

  const sheet = getSheet(endpoint);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0].map(String);

  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][0]) === String(id)) {
      const deleted = {};
      headers.forEach((h, idx) => { deleted[h] = allData[i][idx]; });

      const lockCheck = validateMonthLock(endpoint, {}, deleted, 'DELETE');
      if (!lockCheck.allowed) return lockCheck;

      sheet.deleteRow(i + 1);

      if (endpoint !== 'audit') {
        logAudit('DELETE', endpoint, id, JSON.stringify(deleted), '', 'System', '');
      }

      return { success: true, data: deleted };
    }
  }
  return { success: false, error: 'Record not found' };
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

function logAudit(action, module, recordId, oldValue, newValue, user, remarks) {
  try {
    createRecord('audit', {
      Timestamp: new Date().toISOString(),
      User: user || 'System',
      Module: module,
      Action: action,
      RecordID: recordId,
      OldData: String(oldValue).substring(0, 5000),
      NewData: String(newValue).substring(0, 5000),
      IPAddress: 'server-side',
      Remarks: remarks || ''
    });
  } catch (err) {
    Logger.log('Audit log failed: ' + err.message);
  }
}

// ─── Month Locking ───────────────────────────────────────────────────────────

function isMonthLocked(year, month) {
  const locks = getAllRecords('monthlocks').data;
  return locks.some(function(m) {
    return parseInt(m.Year, 10) === parseInt(year, 10) &&
      parseInt(m.Month, 10) === parseInt(month, 10) &&
      (m.Status === 'Locked' || !m.UnlockedDate);
  });
}

function validateMonthLock(endpoint, data, existingRecord, method) {
  if (LOCKABLE_ENDPOINTS.indexOf(endpoint) === -1) return { allowed: true };

  var dateField = DATE_FIELDS[endpoint];
  if (!dateField) return { allowed: true };

  var dates = [];
  if (data && data[dateField]) dates.push(data[dateField]);
  if (existingRecord && existingRecord[dateField]) dates.push(existingRecord[dateField]);

  for (var i = 0; i < dates.length; i++) {
    var d = new Date(dates[i]);
    if (!isNaN(d.getTime()) && isMonthLocked(d.getFullYear(), d.getMonth() + 1)) {
      return {
        allowed: false,
        success: false,
        error: 'Accounting period locked for ' + d.toLocaleString('en-IN', { month: 'long', year: 'numeric' }) + '. Contact Admin.'
      };
    }
  }
  return { allowed: true };
}

// ─── Special Actions ─────────────────────────────────────────────────────────

function handleAction(data, action) {
  switch (action) {
    case 'backup':
      return createBackup(data);
    case 'uploadDocument':
      return uploadDocumentToDrive(data);
    default:
      return { success: false, error: 'Unknown action: ' + action };
  }
}

function createBackup(data) {
  var ss = getSpreadsheet();
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
  var copyName = ss.getName() + '_Backup_' + timestamp;
  var copy = ss.copy(copyName);

  var link = copy.getUrl();
  if (BACKUP_FOLDER_ID && BACKUP_FOLDER_ID !== 'YOUR_BACKUP_DRIVE_FOLDER_ID') {
    try {
      var file = DriveApp.getFileById(copy.getId());
      DriveApp.getFolderById(BACKUP_FOLDER_ID).addFile(file);
      DriveApp.getRootFolder().removeFile(file);
    } catch (e) {
      Logger.log('Backup folder move failed: ' + e.message);
    }
  }

  var backupRecord = createRecord('backups', {
    DateTime: new Date().toISOString(),
    Type: 'Google Sheet Copy',
    DriveLink: link,
    CreatedBy: data.createdBy || 'System',
    Status: 'Completed',
    FileSize: ''
  });

  return { success: true, data: { DriveLink: link, backup: backupRecord.data } };
}

function uploadDocumentToDrive(data) {
  if (!data.base64 || !data.fileName) {
    return { success: false, error: 'base64 and fileName required' };
  }
  var blob = Utilities.newBlob(Utilities.base64Decode(data.base64), data.mimeType || 'application/pdf', data.fileName);
  var folder = DOCUMENTS_FOLDER_ID && DOCUMENTS_FOLDER_ID !== 'YOUR_DOCUMENTS_DRIVE_FOLDER_ID'
    ? DriveApp.getFolderById(DOCUMENTS_FOLDER_ID)
    : DriveApp.getRootFolder();
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { success: true, data: { DriveLink: file.getUrl(), FileId: file.getId() } };
}

// ─── Utilities ───────────────────────────────────────────────────────────────

/** JSONP wrapper — bypasses browser CORS when calling from localhost */
function wrapJsonpResponse(textOutput, e) {
  var callback = e && e.parameter && e.parameter.callback;
  if (callback && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + '(' + textOutput.getContent() + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return textOutput;
}

function createJsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Run once from Apps Script editor to initialize all sheets with headers
 */
function initializeSpreadsheet() {
  Object.keys(SHEET_CONFIG).forEach(endpoint => getSheet(endpoint));
  seedDefaultUsers();
  Logger.log('All sheets initialized successfully.');
}

/**
 * Run once to populate sample data for testing
 */
function insertSampleData() {
  initializeSpreadsheet();

  const samples = {
    partners: [
      { Date: '2022-01-15', PartnerName: 'Rajesh Gitai', TransactionType: 'Investment', Amount: 1500000, Remarks: 'Initial capital' },
      { Date: '2022-01-15', PartnerName: 'Vijay Barve', TransactionType: 'Investment', Amount: 1000000, Remarks: 'Initial capital' }
    ],
    machines: [
      { MachineName: 'JCB 3DX Super', PurchaseDate: '2022-02-01', PurchaseCost: 2800000, LoanAmount: 2000000, DownPayment: 800000, CurrentValue: 2200000, Status: 'Active' }
    ],
    income: [
      { Date: '2024-01-05', Customer: 'L&T Construction', Machine: 'JCB 3DX Super', Site: 'Pune Highway', HoursWorked: 160, BillAmount: 320000, ReceivedAmount: 320000, PendingAmount: 0, Remarks: 'January billing' }
    ],
    expenses: [
      { Date: '2024-01-02', ExpenseType: 'Diesel', Machine: 'JCB 3DX Super', Amount: 45000, PaidBy: 'Cash', Remarks: 'Monthly diesel' }
    ],
    emi: [
      { Machine: 'JCB 3DX Super', DueDate: '2024-01-05', EMIAmount: 52000, PaidDate: '2024-01-05', BounceCharges: 0, PenaltyCharges: 0, TotalPaid: 52000, Status: 'Paid' }
    ],
    loans: [
      { Machine: 'JCB 3DX Super', LoanAmount: 2000000, PrincipalPaid: 624000, InterestPaid: 156000, OutstandingLoan: 1220000 }
    ],
    assets: [
      { AssetName: 'Office Container', PurchaseValue: 150000, CurrentValue: 120000, Remarks: 'Site office' }
    ],
    documents: [
      { Date: '2022-02-01', DocumentType: 'Purchase Invoice', FileName: 'JCB_3DX_Invoice.pdf', GoogleDriveLink: 'https://drive.google.com/file/d/example' }
    ]
  };

  Object.keys(samples).forEach(endpoint => {
    samples[endpoint].forEach(record => createRecord(endpoint, record));
  });

  Logger.log('Sample data inserted.');
}

/**
 * Test all API endpoints — run from Apps Script editor
 */
function testApiEndpoints() {
  const endpoints = ['partners', 'machines', 'income', 'expenses', 'emi', 'loans', 'assets', 'documents', 'audit'];
  endpoints.forEach(ep => {
    const result = getAllRecords(ep);
    Logger.log(ep + ': ' + result.data.length + ' records');
  });
}

// ─── Legacy sheet migration (Gitai income-expense worksheet) ─────────────────

const LEGACY_INCOME_CATEGORIES = ['work hrs', 'work hours', 'trip', 'gutta', 'us trolly'];
const LEGACY_EXPENSE_MAP = {
  'diesel': 'Diesel',
  'petrol': 'Diesel',
  'operator': 'Salary',
  'servicing': 'Maintenance',
  'grease': 'Maintenance',
  'grease pump': 'Maintenance',
  'washing': 'Maintenance',
  'coolent water': 'Maintenance',
  'coolent': 'Maintenance',
  'other': 'Misc',
  'redium': 'Misc',
  'visiting cards': 'Misc',
  'loan file': 'Misc',
  'maintenance': 'Maintenance',
  'repair': 'Repair',
  'insurance': 'Insurance',
  'rto': 'RTO',
  'transport': 'Transport'
};

function seedDefaultUsers() {
  const sheet = getSheet('users');
  if (sheet.getLastRow() > 1) return;
  sheet.appendRow([1, 'admin', 'admin123', 'Admin', 'Administrator', true]);
  Logger.log('Default admin user created (admin / admin123).');
}

function findLegacyRegisterSheet() {
  if (LEGACY_REGISTER_SHEET) {
    const named = getSpreadsheet().getSheetByName(LEGACY_REGISTER_SHEET);
    if (named) return named;
  }

  const ss = getSpreadsheet();
  const reserved = Object.values(SHEET_CONFIG).map(c => c.sheet);
  for (let i = 0; i < ss.getSheets().length; i++) {
    const sheet = ss.getSheets()[i];
    if (reserved.indexOf(sheet.getName()) >= 0) continue;
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) {
      return String(h).toLowerCase().trim();
    });
    if (headers.some(function (h) { return h.indexOf('income money in') >= 0; })) {
      return sheet;
    }
  }
  throw new Error('Legacy register sheet not found. Set LEGACY_REGISTER_SHEET to your tab name (e.g. Register).');
}

function parseLegacyAmount(value) {
  if (value === '' || value === null || value === undefined) return 0;
  const str = String(value).replace(/,/g, '').replace(/[()]/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.abs(num);
}

function parseLegacyDate(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  const str = String(value).trim();
  const parts = str.split(/[\/\-]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    if (month > 12) {
      const tmp = day; day = month; month = tmp;
    }
    const pad = function (n) { return n < 10 ? '0' + n : String(n); };
    return year + '-' + pad(month) + '-' + pad(day);
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return str;
}

function normalizeLegacyCategory(category, description) {
  const cat = String(category || '').trim().toLowerCase();
  if (cat) return cat;
  return String(description || '').trim().toLowerCase();
}

function mapLegacyExpenseType(category, description) {
  const key = normalizeLegacyCategory(category, description);
  if (LEGACY_EXPENSE_MAP[key]) return LEGACY_EXPENSE_MAP[key];
  if (LEGACY_INCOME_CATEGORIES.indexOf(key) >= 0) return '';
  if (key) return 'Misc';
  return 'Misc';
}

function isLegacyIncomeRow(category, description, incomeAmt) {
  const key = normalizeLegacyCategory(category, description);
  if (LEGACY_INCOME_CATEGORIES.indexOf(key) >= 0) return true;
  if (incomeAmt <= 0) return false;
  if (LEGACY_EXPENSE_MAP[key]) return false;
  if (key && LEGACY_INCOME_CATEGORIES.indexOf(key) < 0 && LEGACY_EXPENSE_MAP[key] === undefined) {
    const desc = String(description || '').trim();
    if (desc && !LEGACY_EXPENSE_MAP[desc.toLowerCase()]) return true;
  }
  return false;
}

function isLegacyExpenseRow(category, description, expenseAmt, incomeAmt) {
  const key = normalizeLegacyCategory(category, description);
  if (LEGACY_EXPENSE_MAP[key]) return true;
  if (LEGACY_INCOME_CATEGORIES.indexOf(key) >= 0) return false;
  if (expenseAmt > 0 && incomeAmt <= 0) return true;
  if (!category && LEGACY_EXPENSE_MAP[String(description || '').toLowerCase()]) return true;
  return false;
}

function getLegacyColumnMap(headers) {
  const map = {};
  headers.forEach(function (h, idx) {
    const key = String(h).toLowerCase().trim();
    if (key === 'date') map.date = idx;
    if (key.indexOf('description') >= 0) map.description = idx;
    if (key === 'category') map.category = idx;
    if (key.indexOf('income money in') >= 0) map.income = idx;
    if (key.indexOf('expense money out') >= 0) map.expense = idx;
    if (key.indexOf('pending balance') >= 0) map.pending = idx;
  });
  return map;
}

/**
 * ONE-TIME: Import your existing Register / income-expense tab into Income + Expenses sheets.
 * Your original tab is NOT deleted — it stays as archive.
 *
 * Run order:
 *   1. initializeSpreadsheet
 *   2. migrateLegacyIncomeExpense
 */
function migrateLegacyIncomeExpense() {
  initializeSpreadsheet();

  const legacySheet = findLegacyRegisterSheet();
  Logger.log('Migrating from sheet: ' + legacySheet.getName());

  const data = legacySheet.getDataRange().getValues();
  if (data.length <= 1) {
    Logger.log('No data rows in legacy sheet.');
    return;
  }

  const col = getLegacyColumnMap(data[0].map(String));
  if (col.date === undefined) throw new Error('Date column not found in legacy sheet.');

  const defaultMachine = 'JCB / Earthmover';
  let incomeCount = 0;
  let expenseCount = 0;
  let skipped = 0;

  const incomeSheet = getSheet('income');
  const expenseSheet = getSheet('expenses');

  if (incomeSheet.getLastRow() <= 1) incomeSheet.appendRow(SHEET_CONFIG.income.headers);
  if (expenseSheet.getLastRow() <= 1) expenseSheet.appendRow(SHEET_CONFIG.expenses.headers);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row.some(function (cell) { return cell !== '' && cell !== null; })) continue;

    const date = parseLegacyDate(row[col.date]);
    const description = col.description !== undefined ? String(row[col.description] || '').trim() : '';
    const category = col.category !== undefined ? String(row[col.category] || '').trim() : '';
    const incomeAmt = col.income !== undefined ? parseLegacyAmount(row[col.income]) : 0;
    const expenseAmt = col.expense !== undefined ? parseLegacyAmount(row[col.expense]) : 0;
    const pending = col.pending !== undefined ? parseLegacyAmount(row[col.pending]) : 0;

    if (!date) { skipped++; continue; }

    if (isLegacyIncomeRow(category, description, incomeAmt)) {
      const bill = incomeAmt || expenseAmt;
      if (bill <= 0) { skipped++; continue; }
      const received = pending > 0 ? Math.max(bill - pending, 0) : bill;
      createRecord('income', {
        Date: date,
        Customer: description || 'Customer',
        Machine: defaultMachine,
        Site: category || '',
        HoursWorked: '',
        BillAmount: bill,
        ReceivedAmount: received,
        PendingAmount: pending || Math.max(bill - received, 0),
        Remarks: 'Imported from ' + legacySheet.getName()
      });
      incomeCount++;
      continue;
    }

    if (isLegacyExpenseRow(category, description, expenseAmt, incomeAmt)) {
      const amount = expenseAmt || incomeAmt;
      if (amount <= 0) { skipped++; continue; }
      createRecord('expenses', {
        Date: date,
        ExpenseType: mapLegacyExpenseType(category, description),
        Machine: defaultMachine,
        Amount: amount,
        PaidBy: 'Cash',
        Remarks: [description, category].filter(Boolean).join(' — ') + ' (imported)'
      });
      expenseCount++;
      continue;
    }

    if (incomeAmt > 0) {
      createRecord('income', {
        Date: date,
        Customer: description || 'Customer',
        Machine: defaultMachine,
        Site: category || '',
        HoursWorked: '',
        BillAmount: incomeAmt,
        ReceivedAmount: incomeAmt,
        PendingAmount: 0,
        Remarks: 'Imported (fallback) from ' + legacySheet.getName()
      });
      incomeCount++;
    } else if (expenseAmt > 0) {
      createRecord('expenses', {
        Date: date,
        ExpenseType: mapLegacyExpenseType(category, description),
        Machine: defaultMachine,
        Amount: expenseAmt,
        PaidBy: 'Cash',
        Remarks: [description, category].filter(function (x) { return x; }).join(' — ') + ' (imported)'
      });
      expenseCount++;
    } else {
      skipped++;
    }
  }

  Logger.log('Migration complete. Income: ' + incomeCount + ', Expenses: ' + expenseCount + ', Skipped: ' + skipped);
}
