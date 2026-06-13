/**
 * Gitai Earthmovers — Application Configuration
 *
 * DATA_MODE: 'excel' → Gitai.xlsx in project folder (recommended, no Google)
 */
const CONFIG = {
  /** 'excel' = Gitai.xlsx | 'google' = Google Sheets (optional) */
  DATA_MODE: 'excel',

  /** Excel database file (served from project root) */
  EXCEL_FILE: 'Gitai.xlsx',

  /** Default machine name when importing legacy register workbooks */
  LEGACY_MACHINE_NAME: 'M1- Mahindra earthmaster sx iv 2022',

  /** Cache data in browser between sessions */
  USE_LOCAL_STORAGE: true,
  LOCAL_STORAGE_KEY: 'earthmovers-data-v1',

  /** Bump when Excel schema/data changes — invalidates stale empty browser cache */
  DATA_SNAPSHOT_VERSION: '5',

  /** Always use local API (no network) for excel mode */
  USE_MOCK_DATA: true,

  /** Google Sheets — only if DATA_MODE is 'google' */
  API_BASE_URL: '',

  APP_VERSION: '2.0.0',
  BUSINESS_START_DATE: '2022-01-01',
  CURRENCY: '₹',

  EXPENSE_TYPES: ['Diesel', 'Repair', 'Maintenance', 'Salary', 'Insurance', 'RTO', 'Transport', 'Misc'],
  PARTNER_TRANSACTION_TYPES: ['Investment', 'Withdrawal'],
  EMI_STATUSES: ['Pending', 'Paid', 'Bounced', 'Overdue'],
  MACHINE_STATUSES: ['Active', 'Inactive', 'Sold'],
  DOCUMENT_CATEGORIES: [
    'Diesel Bills', 'Repair Bills', 'EMI Receipts', 'Insurance Policies', 'RC Book',
    'Customer Invoices', 'Vendor Bills', 'Agreements', 'Purchase Invoice', 'Loan Agreement', 'Other'
  ],
  LOCKABLE_MODULES: ['income', 'expenses', 'partners', 'emi'],

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

function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return CONFIG.CURRENCY + num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function parseNum(val) {
  return parseFloat(val) || 0;
}

function getMonthKey(dateStr) {
  if (!dateStr) return '';
  return dateStr.substring(0, 7);
}

function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
