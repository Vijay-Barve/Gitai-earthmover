/**
 * Gitai Earthmovers — API Client
 * Excel mode: Gitai.xlsx + browser cache (no Google Sheets, no CORS)
 */
const ApiClient = (function () {
  let store = null;
  let readyPromise = null;

  function persist(options) {
    if (!CONFIG.USE_LOCAL_STORAGE || !store) return;
    const opts = options || {};
    if (opts.markSaved) {
      store._sessionDirty = false;
      store._lastSavedAt = new Date().toISOString();
    } else if (opts.markDirty === true) {
      store._sessionDirty = true;
    } else if (opts.markDirty !== false && store._sessionDirty === undefined) {
      store._sessionDirty = false;
    }
    store._version = CONFIG.DATA_SNAPSHOT_VERSION;
    store._lastModified = new Date().toISOString();
    try {
      localStorage.setItem(CONFIG.LOCAL_STORAGE_KEY, JSON.stringify(store));
      if (typeof StandaloneModule !== 'undefined') {
        StandaloneModule.updateSaveStatus();
      }
    } catch (err) {
      console.error('Failed to persist data:', err);
    }
  }

  async function ensureReady() {
    if (store) return store;
    if (!readyPromise) {
      readyPromise = loadStore();
    }
    return readyPromise;
  }

  function migrateStoreSchema(s) {
    if (!s) return s;
    (s.emi || []).forEach(row => {
      if (row.PaymentMode === undefined || row.PaymentMode === '') {
        const partner = parseFloat(row.PartnerPaid) || 0;
        const business = parseFloat(row.BusinessPaid) || 0;
        if (partner > 0 && business > 0) row.PaymentMode = 'Split';
        else if (partner > 0) row.PaymentMode = 'Partner';
        else row.PaymentMode = 'Business';
      }
      if (row.BusinessPaid === undefined || row.BusinessPaid === '') {
        const total = parseFloat(row.TotalPaid) || 0;
        const partner = parseFloat(row.PartnerPaid) || 0;
        row.BusinessPaid = total > 0 && (row.Status === 'Paid' || row.PaidDate) ? Math.max(0, total - partner) : 0;
      }
      if (row.PartnerPaid === undefined || row.PartnerPaid === '') row.PartnerPaid = 0;
      if (row.PaidByPartner === undefined) row.PaidByPartner = '';
    });
    return s;
  }

  async function loadStore() {
    let fromExcel = null;
    if (CONFIG.DATA_MODE === 'excel') {
      try {
        fromExcel = await ExcelStore.load(CONFIG.EXCEL_FILE);
      } catch (err) {
        console.warn('Excel load failed:', err.message);
      }
    }

    let cached = null;
    if (CONFIG.USE_LOCAL_STORAGE) {
      try {
        const raw = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEY);
        if (raw) cached = JSON.parse(raw);
      } catch (err) {
        console.warn('Cache invalid:', err);
      }
    }

    /** Keep unsaved browser edits even after DATA_SNAPSHOT_VERSION bumps */
    const useCachedSession = cached && cached._sessionDirty === true;

    if (useCachedSession) {
      store = migrateStoreSchema(cached);
      if (cached._version !== CONFIG.DATA_SNAPSHOT_VERSION) {
        console.info('Restored unsaved session (schema v' + cached._version + ' → v' + CONFIG.DATA_SNAPSHOT_VERSION + ')');
      }
    } else if (fromExcel) {
      store = migrateStoreSchema(fromExcel);
      store._sessionDirty = false;
    } else if (cached) {
      store = migrateStoreSchema(cached);
    } else {
      store = ExcelStore.emptyStore();
      store._sessionDirty = false;
    }

    store._version = CONFIG.DATA_SNAPSHOT_VERSION;
    persist({ markDirty: store._sessionDirty === true });
    return store;
  }

  function resetStore() {
    store = null;
    readyPromise = null;
    localStorage.removeItem(CONFIG.LOCAL_STORAGE_KEY);
  }

  function getNextId(module) {
    const items = store[module] || [];
    if (!items.length) return 1;
    return Math.max(...items.map(i => parseInt(i.ID, 10) || 0)) + 1;
  }

  function logAudit(action, module, recordId, oldVal, newVal) {
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
      Remarks: ''
    });
  }

  function checkMonthLock(endpoint, method, data, existingRecord) {
    if (!CONFIG.LOCKABLE_MODULES.includes(endpoint) || method === 'GET') return null;
    if (typeof MonthLockModule === 'undefined') return null;
    const check = MonthLockModule.validateMutation(endpoint, data, existingRecord);
    return check.allowed ? null : check.error;
  }

  async function request(endpoint, method = 'GET', data = null, id = null) {
    await ensureReady();
    const key = endpoint.toLowerCase();

    if (key === 'audit' && method !== 'GET') {
      return { success: false, error: 'Audit logs are immutable' };
    }

    const collection = store[key];
    if (!collection) {
      return { success: false, error: 'Unknown endpoint: ' + endpoint };
    }

    let result;
    switch (method) {
      case 'GET':
        if (id) {
          const item = collection.find(r => String(r.ID) === String(id));
          result = item ? { success: true, data: item } : { success: false, error: 'Not found' };
        } else {
          result = { success: true, data: [...collection] };
        }
        break;

      case 'POST': {
        const lockErr = checkMonthLock(key, method, data);
        if (lockErr) return { success: false, error: lockErr };
        const newId = getNextId(key);
        const record = { ...data, ID: newId };
        collection.push(record);
        if (key !== 'audit') logAudit('CREATE', key, newId, '', JSON.stringify(record));
        result = { success: true, data: record };
        break;
      }

      case 'PUT': {
        const idx = collection.findIndex(r => String(r.ID) === String(id || data.ID));
        if (idx === -1) return { success: false, error: 'Not found' };
        const oldRecord = { ...collection[idx] };
        const lockErr = checkMonthLock(key, method, data, oldRecord);
        if (lockErr) return { success: false, error: lockErr };
        collection[idx] = { ...collection[idx], ...data, ID: oldRecord.ID };
        if (key !== 'audit') logAudit('UPDATE', key, oldRecord.ID, JSON.stringify(oldRecord), JSON.stringify(collection[idx]));
        result = { success: true, data: collection[idx] };
        break;
      }

      case 'DELETE': {
        const delIdx = collection.findIndex(r => String(r.ID) === String(id));
        if (delIdx === -1) return { success: false, error: 'Not found' };
        const deleted = collection[delIdx];
        const lockErr = checkMonthLock(key, method, {}, deleted);
        if (lockErr) return { success: false, error: lockErr };
        collection.splice(delIdx, 1);
        if (key !== 'audit') logAudit('DELETE', key, deleted.ID, JSON.stringify(deleted), '');
        result = { success: true, data: deleted };
        break;
      }

      default:
        result = { success: false, error: 'Unsupported method' };
    }

    if (result.success && method !== 'GET') {
      persist({ markDirty: true });
    }
    return result;
  }

  async function importLocalData(data) {
    resetStore();
    store = ExcelStore.emptyStore();
    Object.keys(store).forEach(key => {
      if (Array.isArray(data[key])) store[key] = data[key];
    });
    persist({ markDirty: true });
    return store;
  }

  async function mergeLegacyRegister(file, machineName) {
    await ensureReady();
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    if (!LegacyMigrate.isLegacyWorkbook(workbook)) {
      throw new Error('Not a machine register file.');
    }
    const stats = LegacyMigrate.mergeIntoStore(store, workbook, {
      machineName: machineName || CONFIG.LEGACY_MACHINE_NAME,
      sourceLabel: file.name
    });
    persist({ markDirty: true });
    return stats;
  }

  async function reloadFromExcel() {
    resetStore();
    localStorage.removeItem(CONFIG.LOCAL_STORAGE_KEY);
    return ensureReady();
  }

  async function saveToExcel(filename) {
    await ensureReady();
    ExcelStore.download(store, filename || CONFIG.EXCEL_FILE);
    persist({ markSaved: true });
    return { success: true };
  }

  function isDirty() {
    return !!(store && store._sessionDirty);
  }

  function getMeta() {
    return {
      sessionDirty: !!(store && store._sessionDirty),
      lastSavedAt: store?._lastSavedAt || null,
      lastModified: store?._lastModified || null,
      loadedFrom: store?._loadedFrom || CONFIG.EXCEL_FILE
    };
  }

  return {
    get: (endpoint, id) => request(endpoint, 'GET', null, id),
    post: (endpoint, data) => request(endpoint, 'POST', data),
    put: (endpoint, data, id) => request(endpoint, 'PUT', data, id || data?.ID),
    delete: (endpoint, id) => request(endpoint, 'DELETE', null, id),
    action: async () => ({ success: false, error: 'Use saveToExcel() in Excel mode' }),
    ensureReady,
    importLocalData,
    mergeLegacyRegister,
    reloadFromExcel,
    saveToExcel,
    resetStore,
    isDirty,
    getMeta,
    _getMockStore: () => store,

    getConnectionMode() {
      if (CONFIG.DATA_MODE === 'excel') return 'excel';
      return 'local';
    },

    async fetchAll() {
      await ensureReady();
      const endpoints = Object.values(CONFIG.ENDPOINTS);
      const data = {};
      endpoints.forEach(ep => {
        data[ep] = [...(store[ep] || [])];
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
