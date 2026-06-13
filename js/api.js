/**
 * Gitai Earthmovers — API Client & Mock Data Store
 */
const ApiClient = (function () {
  let mockStore = null;

  function initMockStore() {
    if (mockStore) return mockStore;

    mockStore = {
      partners: [
        { ID: 1, Date: '2022-01-15', PartnerName: 'Rajesh Gitai', TransactionType: 'Investment', Amount: 1500000, Remarks: 'Initial capital' },
        { ID: 2, Date: '2022-01-15', PartnerName: 'Vijay Barve', TransactionType: 'Investment', Amount: 1000000, Remarks: 'Initial capital' },
        { ID: 3, Date: '2023-06-01', PartnerName: 'Rajesh Gitai', TransactionType: 'Withdrawal', Amount: 200000, Remarks: 'Personal withdrawal' },
        { ID: 4, Date: '2024-03-10', PartnerName: 'Vijay Barve', TransactionType: 'Investment', Amount: 500000, Remarks: 'Additional investment' }
      ],
      machines: [
        { ID: 1, MachineName: 'JCB 3DX Super', PurchaseDate: '2022-02-01', PurchaseCost: 2800000, LoanAmount: 2000000, DownPayment: 800000, CurrentValue: 2200000, Status: 'Active' },
        { ID: 2, MachineName: 'Tata Hitachi EX 70', PurchaseDate: '2022-08-15', PurchaseCost: 4500000, LoanAmount: 3500000, DownPayment: 1000000, CurrentValue: 3800000, Status: 'Active' },
        { ID: 3, MachineName: 'Hyundai R80', PurchaseDate: '2023-04-01', PurchaseCost: 3200000, LoanAmount: 2500000, DownPayment: 700000, CurrentValue: 2900000, Status: 'Active' }
      ],
      income: [
        { ID: 1, Date: '2024-01-05', Customer: 'L&T Construction', Machine: 'JCB 3DX Super', Site: 'Pune Highway', HoursWorked: 160, BillAmount: 320000, ReceivedAmount: 320000, PendingAmount: 0, Remarks: 'January billing' },
        { ID: 2, Date: '2024-01-12', Customer: 'Shapoorji Pallonji', Machine: 'Tata Hitachi EX 70', Site: 'Mumbai Metro', HoursWorked: 200, BillAmount: 600000, ReceivedAmount: 500000, PendingAmount: 100000, Remarks: 'Partial payment received' },
        { ID: 3, Date: '2024-02-03', Customer: 'Godrej Properties', Machine: 'Hyundai R80', Site: 'Thane', HoursWorked: 180, BillAmount: 450000, ReceivedAmount: 450000, PendingAmount: 0, Remarks: '' },
        { ID: 4, Date: '2024-03-15', Customer: 'L&T Construction', Machine: 'JCB 3DX Super', Site: 'Pune Highway', HoursWorked: 150, BillAmount: 300000, ReceivedAmount: 250000, PendingAmount: 50000, Remarks: 'Pending balance' },
        { ID: 5, Date: '2024-04-01', Customer: 'HCC Ltd', Machine: 'Tata Hitachi EX 70', Site: 'Navi Mumbai', HoursWorked: 220, BillAmount: 660000, ReceivedAmount: 660000, PendingAmount: 0, Remarks: '' }
      ],
      expenses: [
        { ID: 1, Date: '2024-01-02', ExpenseType: 'Diesel', Machine: 'JCB 3DX Super', Amount: 45000, PaidBy: 'Cash', Remarks: 'Monthly diesel' },
        { ID: 2, Date: '2024-01-05', ExpenseType: 'Salary', Machine: '', Amount: 85000, PaidBy: 'Bank', Remarks: 'Operator salaries' },
        { ID: 3, Date: '2024-01-10', ExpenseType: 'Repair', Machine: 'Tata Hitachi EX 70', Amount: 32000, PaidBy: 'Cash', Remarks: 'Hydraulic repair' },
        { ID: 4, Date: '2024-02-01', ExpenseType: 'Insurance', Machine: 'JCB 3DX Super', Amount: 18000, PaidBy: 'Bank', Remarks: 'Annual insurance' },
        { ID: 5, Date: '2024-02-15', ExpenseType: 'Maintenance', Machine: 'Hyundai R80', Amount: 12000, PaidBy: 'Cash', Remarks: 'Scheduled service' },
        { ID: 6, Date: '2024-03-01', ExpenseType: 'Diesel', Machine: 'Tata Hitachi EX 70', Amount: 62000, PaidBy: 'Cash', Remarks: '' },
        { ID: 7, Date: '2024-03-20', ExpenseType: 'RTO', Machine: 'Hyundai R80', Amount: 8500, PaidBy: 'Bank', Remarks: 'Road tax renewal' }
      ],
      emi: [
        { ID: 1, Machine: 'JCB 3DX Super', DueDate: '2024-01-05', EMIAmount: 52000, PaidDate: '2024-01-05', BounceCharges: 0, PenaltyCharges: 0, TotalPaid: 52000, Status: 'Paid' },
        { ID: 2, Machine: 'Tata Hitachi EX 70', DueDate: '2024-01-10', EMIAmount: 78000, PaidDate: '2024-01-12', BounceCharges: 500, PenaltyCharges: 200, TotalPaid: 78700, Status: 'Paid' },
        { ID: 3, Machine: 'Hyundai R80', DueDate: '2024-02-05', EMIAmount: 65000, PaidDate: '', BounceCharges: 500, PenaltyCharges: 1500, TotalPaid: 67000, Status: 'Bounced' },
        { ID: 4, Machine: 'JCB 3DX Super', DueDate: '2024-03-05', EMIAmount: 52000, PaidDate: '', BounceCharges: 0, PenaltyCharges: 0, TotalPaid: 0, Status: 'Overdue' },
        { ID: 5, Machine: 'Tata Hitachi EX 70', DueDate: '2024-04-10', EMIAmount: 78000, PaidDate: '2024-04-10', BounceCharges: 0, PenaltyCharges: 0, TotalPaid: 78000, Status: 'Paid' }
      ],
      loans: [
        { ID: 1, Machine: 'JCB 3DX Super', LoanAmount: 2000000, PrincipalPaid: 624000, InterestPaid: 156000, OutstandingLoan: 1220000 },
        { ID: 2, Machine: 'Tata Hitachi EX 70', LoanAmount: 3500000, PrincipalPaid: 936000, InterestPaid: 234000, OutstandingLoan: 2330000 },
        { ID: 3, Machine: 'Hyundai R80', LoanAmount: 2500000, PrincipalPaid: 390000, InterestPaid: 98000, OutstandingLoan: 2012000 }
      ],
      assets: [
        { ID: 1, AssetName: 'Office Container', PurchaseValue: 150000, CurrentValue: 120000, Remarks: 'Site office' },
        { ID: 2, AssetName: 'Diesel Generator 15KVA', PurchaseValue: 85000, CurrentValue: 65000, Remarks: 'Backup power' }
      ],
      documents: [
        { ID: 1, Category: 'Purchase Invoice', ReferenceID: 1, ReferenceModule: 'machines', UploadDate: '2022-02-01', UploadedBy: 'Admin', FileName: 'JCB_3DX_Invoice.pdf', DriveLink: 'https://drive.google.com/file/d/example1', Version: 1, Date: '2022-02-01', DocumentType: 'Purchase Invoice', GoogleDriveLink: 'https://drive.google.com/file/d/example1' },
        { ID: 2, Category: 'Loan Agreement', ReferenceID: 1, ReferenceModule: 'loans', UploadDate: '2022-08-15', UploadedBy: 'Admin', FileName: 'Tata_Hitachi_Loan.pdf', DriveLink: 'https://drive.google.com/file/d/example2', Version: 1, Date: '2022-08-15', DocumentType: 'Loan Agreement', GoogleDriveLink: 'https://drive.google.com/file/d/example2' }
      ],
      audit: [
        { ID: 1, Timestamp: '2024-04-15T10:30:00', User: 'Administrator', Module: 'Income', Action: 'CREATE', RecordID: 5, OldData: '', NewData: '{"Customer":"HCC Ltd","BillAmount":660000}', IPAddress: 'client-side', Remarks: '' },
        { ID: 2, Timestamp: '2024-04-10T14:00:00', User: 'Finance Team', Module: 'EMI', Action: 'UPDATE', RecordID: 5, OldData: '{"Status":"Pending"}', NewData: '{"Status":"Paid"}', IPAddress: 'client-side', Remarks: '' }
      ],
      monthlocks: [
        { ID: 1, Month: 1, Year: 2024, LockedBy: 'Administrator', LockedDate: '2024-02-05T09:00:00', Status: 'Locked', UnlockReason: '', UnlockedBy: '', UnlockedDate: '' }
      ],
      users: [
        { ID: 1, Username: 'admin', Password: 'admin123', Role: 'Admin', Name: 'Administrator', Active: true },
        { ID: 2, Username: 'accountant', Password: 'acc123', Role: 'Accountant', Name: 'Finance Team', Active: true },
        { ID: 3, Username: 'partner', Password: 'partner123', Role: 'Partner', Name: 'Rajesh Gitai', Active: true },
        { ID: 4, Username: 'viewer', Password: 'view123', Role: 'Viewer', Name: 'Auditor', Active: true }
      ],
      vendors: [
        { ID: 1, VendorName: 'HP Petrol Pump', VendorType: 'Diesel Supplier', Contact: '9876543210', TotalPayable: 250000, Paid: 205000, Outstanding: 45000, Remarks: 'Monthly diesel' },
        { ID: 2, VendorName: 'Sharma Hydraulics', VendorType: 'Repair Vendor', Contact: '9876543211', TotalPayable: 85000, Paid: 53000, Outstanding: 32000, Remarks: '' },
        { ID: 3, VendorName: 'City Transport', VendorType: 'Transport Vendor', Contact: '9876543212', TotalPayable: 40000, Paid: 40000, Outstanding: 0, Remarks: '' }
      ],
      vendortxns: [
        { ID: 1, Date: '2024-01-02', VendorID: 1, VendorName: 'HP Petrol Pump', Amount: 45000, Type: 'Payable', ReferenceID: 'EXP-1', Remarks: 'Diesel Jan' },
        { ID: 2, Date: '2024-01-15', VendorID: 1, VendorName: 'HP Petrol Pump', Amount: 45000, Type: 'Payment', ReferenceID: 'CHQ-101', Remarks: '' }
      ],
      bankstatements: [
        { ID: 1, Date: '2024-01-05', Description: 'L&T Construction Payment', Debit: 0, Credit: 320000, Balance: 520000, MatchedModule: 'Income', MatchedRecordID: 1, MatchStatus: 'Matched' },
        { ID: 2, Date: '2024-01-08', Description: 'Unknown Transfer', Debit: 0, Credit: 15000, Balance: 535000, MatchedModule: '', MatchedRecordID: '', MatchStatus: 'Unmatched' }
      ],
      utilization: [
        { ID: 1, Month: 1, Year: 2024, Machine: 'JCB 3DX Super', AvailableDays: 31, WorkingDays: 20, IdleDays: 11 },
        { ID: 2, Month: 1, Year: 2024, Machine: 'Tata Hitachi EX 70', AvailableDays: 31, WorkingDays: 25, IdleDays: 6 },
        { ID: 3, Month: 1, Year: 2024, Machine: 'Hyundai R80', AvailableDays: 31, WorkingDays: 12, IdleDays: 19 }
      ],
      documentversions: [],
      backups: []
    };

    return mockStore;
  }

  function getNextId(module) {
    const store = initMockStore();
    const items = store[module] || [];
    if (items.length === 0) return 1;
    return Math.max(...items.map(i => parseInt(i.ID, 10) || 0)) + 1;
  }

  function logAudit(action, module, recordId, oldVal, newVal, remarks) {
    const store = initMockStore();
    const user = typeof AuthModule !== 'undefined' ? AuthModule.getUser() : null;
    store.audit.unshift({
      ID: getNextId('audit'),
      Timestamp: new Date().toISOString(),
      User: user?.Name || user?.Username || 'System',
      Module: module,
      Action: action,
      RecordID: recordId,
      OldData: String(oldVal || ''),
      NewData: String(newVal || ''),
      IPAddress: 'client-side',
      Remarks: remarks || ''
    });
  }

  function getRecordDate(endpoint, record) {
    const fields = { income: 'Date', expenses: 'Date', partners: 'Date', emi: 'DueDate' };
    return record?.[fields[endpoint]];
  }

  function checkMonthLock(endpoint, method, data, existingRecord) {
    if (!CONFIG.LOCKABLE_MODULES.includes(endpoint)) return null;
    if (method === 'GET') return null;
    if (typeof MonthLockModule === 'undefined') return null;

    const check = MonthLockModule.validateMutation(endpoint, data, existingRecord);
    return check.allowed ? null : check.error;
  }

  async function mockRequest(endpoint, method, data, id) {
    await new Promise(r => setTimeout(r, 150));
    const store = initMockStore();
    const key = endpoint.toLowerCase();

    // Block audit mutations
    if (key === 'audit' && method !== 'GET') {
      return { success: false, error: 'Audit logs are immutable' };
    }

    const collection = store[key];

    if (!collection) {
      return { success: false, error: 'Unknown endpoint: ' + endpoint };
    }

    switch (method) {
      case 'GET':
        if (id) {
          const item = collection.find(r => String(r.ID) === String(id));
          return item ? { success: true, data: item } : { success: false, error: 'Not found' };
        }
        return { success: true, data: [...collection] };

      case 'POST': {
        const lockErr = checkMonthLock(key, method, data);
        if (lockErr) return { success: false, error: lockErr };

        const newId = getNextId(key);
        const record = { ...data, ID: newId };
        collection.push(record);
        if (key !== 'audit') {
          logAudit('CREATE', key, newId, '', JSON.stringify(record));
        }
        return { success: true, data: record };
      }

      case 'PUT': {
        const idx = collection.findIndex(r => String(r.ID) === String(id || data.ID));
        if (idx === -1) return { success: false, error: 'Not found' };
        const oldRecord = { ...collection[idx] };
        const lockErr = checkMonthLock(key, method, data, oldRecord);
        if (lockErr) return { success: false, error: lockErr };

        collection[idx] = { ...collection[idx], ...data, ID: oldRecord.ID };
        if (key !== 'audit') {
          logAudit('UPDATE', key, oldRecord.ID, JSON.stringify(oldRecord), JSON.stringify(collection[idx]));
        }
        return { success: true, data: collection[idx] };
      }

      case 'DELETE': {
        const delIdx = collection.findIndex(r => String(r.ID) === String(id));
        if (delIdx === -1) return { success: false, error: 'Not found' };
        const deleted = collection[delIdx];
        const lockErr = checkMonthLock(key, method, {}, deleted);
        if (lockErr) return { success: false, error: lockErr };

        collection.splice(delIdx, 1);
        if (key !== 'audit') {
          logAudit('DELETE', key, deleted.ID, JSON.stringify(deleted), '');
        }
        return { success: true, data: deleted };
      }

      default:
        return { success: false, error: 'Unsupported method' };
    }
  }

  async function liveRequest(endpoint, method, data, id) {
    const url = new URL(CONFIG.API_BASE_URL);
    url.searchParams.set('endpoint', endpoint);
    url.searchParams.set('method', method);
    if (id) url.searchParams.set('id', id);

    const options = {
      method: method === 'GET' ? 'GET' : 'POST',
      redirect: 'follow'
    };

    if (method !== 'GET') {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify({
        method,
        data: data || {},
        id: id || null
      });
    }

    const response = await fetch(url.toString(), options);
    if (!response.ok) {
      throw new Error('API request failed: ' + response.status);
    }
    return response.json();
  }

  async function request(endpoint, method = 'GET', data = null, id = null) {
    try {
      if (CONFIG.USE_MOCK_DATA) {
        return await mockRequest(endpoint, method, data, id);
      }
      return await liveRequest(endpoint, method, data, id);
    } catch (err) {
      console.error('API Error:', err);
      return { success: false, error: err.message || 'Request failed' };
    }
  }

  async function action(actionName, payload) {
    if (CONFIG.USE_MOCK_DATA) {
      if (actionName === 'backup') {
        return { success: true, data: { DriveLink: 'local-backup', Type: payload.type } };
      }
      return { success: false, error: 'Action not supported in mock mode: ' + actionName };
    }
    const url = new URL(CONFIG.API_BASE_URL);
    url.searchParams.set('endpoint', 'action');
    url.searchParams.set('action', actionName);
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return response.json();
  }

  return {
    get: (endpoint, id) => request(endpoint, 'GET', null, id),
    post: (endpoint, data) => request(endpoint, 'POST', data),
    put: (endpoint, data, id) => request(endpoint, 'PUT', data, id || data?.ID),
    delete: (endpoint, id) => request(endpoint, 'DELETE', null, id),
    action,
    _getMockStore: initMockStore,

    /** Returns 'mock' | 'google-sheets' */
    getConnectionMode() {
      return CONFIG.USE_MOCK_DATA ? 'mock' : 'google-sheets';
    },

    /** Fetch all core datasets in parallel */
    async fetchAll() {
      const endpoints = Object.values(CONFIG.ENDPOINTS);
      const results = await Promise.all(endpoints.map(ep => this.get(ep)));
      const data = {};
      endpoints.forEach((ep, i) => {
        data[ep] = results[i].success ? results[i].data : [];
      });
      return data;
    }
  };
})();

/** Global application data cache */
const AppData = {
  partners: [],
  machines: [],
  income: [],
  expenses: [],
  emi: [],
  loans: [],
  assets: [],
  documents: [],
  audit: [],
  monthlocks: [],
  users: [],
  vendors: [],
  vendortxns: [],
  bankstatements: [],
  utilization: [],
  documentversions: [],
  backups: [],

  async refresh() {
    const data = await ApiClient.fetchAll();
    Object.assign(this, data);
    return this;
  }
};
