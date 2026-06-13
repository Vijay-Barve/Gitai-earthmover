/**
 * Gitai Earthmovers — Application Configuration
 *
 * NO SEPARATE BACKEND SERVER.
 * Your database is Google Sheets. The API is Google Apps Script (see google-apps-script/Code.gs).
 *
 * Two modes:
 *   USE_MOCK_DATA: true  → Demo data in browser (no Google account needed)
 *   USE_MOCK_DATA: false → Live data via Apps Script Web App URL below
 */
const CONFIG = {
  /**
   * Paste your Google Apps Script Web App URL here when connecting to Google Sheets.
   * Get it from: Spreadsheet → Extensions → Apps Script → Deploy → Web app
   * Example: 'https://script.google.com/macros/s/AKfycbz.../exec'
   */
  API_BASE_URL: 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL',

  /**
   * true  = Demo mode (sample data, no Google Sheets connection)
   * false = Production (requires API_BASE_URL + deployed Apps Script)
   */
  USE_MOCK_DATA: true,

  /** Application version */
  APP_VERSION: '2.0.0',

  /** Business start date for reports */
  BUSINESS_START_DATE: '2022-01-01',

  /** Currency symbol */
  CURRENCY: '₹',

  /** Expense types */
  EXPENSE_TYPES: [
    'Diesel',
    'Repair',
    'Maintenance',
    'Salary',
    'Insurance',
    'RTO',
    'Transport',
    'Misc'
  ],

  /** Partner transaction types */
  PARTNER_TRANSACTION_TYPES: ['Investment', 'Withdrawal'],

  /** EMI statuses */
  EMI_STATUSES: ['Pending', 'Paid', 'Bounced', 'Overdue'],

  /** Machine statuses */
  MACHINE_STATUSES: ['Active', 'Inactive', 'Sold'],

  /** Document categories */
  DOCUMENT_CATEGORIES: [
    'Diesel Bills',
    'Repair Bills',
    'EMI Receipts',
    'Insurance Policies',
    'RC Book',
    'Customer Invoices',
    'Vendor Bills',
    'Agreements',
    'Purchase Invoice',
    'Loan Agreement',
    'Other'
  ],

  /** Modules subject to month locking */
  LOCKABLE_MODULES: ['income', 'expenses', 'partners', 'emi'],

  /** API endpoints mapped to sheet modules */
  ENDPOINTS: {
    partners: 'partners',
    machines: 'machines',
    income: 'income',
    expenses: 'expenses',
    emi: 'emi',
    loans: 'loans',
    assets: 'assets',
    documents: 'documents',
    audit: 'audit',
    monthlocks: 'monthlocks',
    users: 'users',
    vendors: 'vendors',
    vendortxns: 'vendortxns',
    bankstatements: 'bankstatements',
    utilization: 'utilization',
    documentversions: 'documentversions',
    backups: 'backups'
  },

  /** DataTables default options */
  DATATABLE_OPTIONS: {
    pageLength: 25,
    responsive: true,
    order: [[0, 'desc']],
    language: {
      search: 'Search:',
      lengthMenu: 'Show _MENU_ entries',
      info: 'Showing _START_ to _END_ of _TOTAL_ entries',
      emptyTable: 'No records found',
      zeroRecords: 'No matching records found'
    }
  }
};

/**
 * Format number as Indian currency
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return CONFIG.CURRENCY + num.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

/**
 * Format date for display
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Format datetime for display
 * @param {string} dateStr
 * @returns {string}
 */
function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Get today's date as YYYY-MM-DD
 * @returns {string}
 */
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Parse numeric value safely
 * @param {*} val
 * @returns {number}
 */
function parseNum(val) {
  return parseFloat(val) || 0;
}

/**
 * Get month key from date string (YYYY-MM)
 * @param {string} dateStr
 * @returns {string}
 */
function getMonthKey(dateStr) {
  if (!dateStr) return '';
  return dateStr.substring(0, 7);
}

/**
 * Debounce utility
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
