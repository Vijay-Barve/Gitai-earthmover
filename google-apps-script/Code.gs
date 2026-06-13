/**
 * Gitai Earthmovers — Google Apps Script REST API
 *
 * Deploy as Web App with:
 *   Execute as: Me
 *   Who has access: Anyone (or Anyone with Google account)
 *
 * Spreadsheet must contain sheets: Partners, Machines, Income, Expenses, EMI, Loans, Assets, Documents, AuditLog
 */

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
const BACKUP_FOLDER_ID = 'YOUR_BACKUP_DRIVE_FOLDER_ID';
const DOCUMENTS_FOLDER_ID = 'YOUR_DOCUMENTS_DRIVE_FOLDER_ID';

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
  return handleRequest(e, 'GET');
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
    let endpoint = (params.endpoint || '').toLowerCase();
    let id = params.id || null;
    let bodyData = {};

    if (e.postData && e.postData.contents) {
      try {
        const body = JSON.parse(e.postData.contents);
        bodyData = body.data || body;
        if (body.id) id = body.id;
        if (body.endpoint) endpoint = body.endpoint.toLowerCase();
        if (body.action) params.action = body.action;
      } catch (parseErr) {
        return createJsonResponse({ success: false, error: 'Invalid JSON body' });
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
  return SpreadsheetApp.openById(SPREADSHEET_ID);
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
