/**
 * Gitai Earthmovers — Application Configuration
 * Standalone mode: Gitai.xlsx in project folder (local Excel database)
 */
const CONFIG = {
  DATA_MODE: 'excel',
  STANDALONE: true,
  EXCEL_FILE: 'Gitai.xlsx',
  /** Dedicated per-machine workbooks (downloaded with Save Excel) */
  MACHINE_EXCEL_FILES: {
    M1: 'Gitai-M1.xlsx',
    M2: 'Gitai-M2.xlsx'
  },
  LEGACY_MACHINE_NAME: 'M1- Mahindra earthmaster sx iv 2022',

  USE_LOCAL_STORAGE: true,
  LOCAL_STORAGE_KEY: 'earthmovers-data-v1',
  DATA_SNAPSHOT_VERSION: '30',

  EMI_PAYMENT_MODES: ['Business', 'Partner', 'Split'],

  /**
   * Profit/loss split among partners.
   * 'equal' = same % for every partner (funding amounts may differ)
   * 'capital' = proportional to investment (legacy)
   */
  PARTNER_SHARE_MODE: 'equal',

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
  const iso = String(dateStr).slice(0, 10);
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${m[3]} ${months[parseInt(m[2], 10) - 1]} ${m[1]}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Searchable date forms: ISO + DD/MM/YYYY + "15 Jan 2022" + month/year, etc. */
function dateSearchText(dateStr) {
  if (!dateStr) return '';
  const iso = String(dateStr).slice(0, 10);
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso.toLowerCase();
  const [, y, mo, d] = m;
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const mon = months[parseInt(mo, 10) - 1] || '';
  const dNum = String(parseInt(d, 10));
  const moNum = String(parseInt(mo, 10));
  return [
    iso,
    `${d}/${mo}/${y}`, `${d}-${mo}-${y}`, `${d}.${mo}.${y}`,
    `${dNum}/${moNum}/${y}`, `${dNum}-${moNum}-${y}`,
    `${d} ${mon} ${y}`, `${dNum} ${mon} ${y}`,
    `${mon} ${y}`, `${mo}/${y}`, `${mo}-${y}`, y
  ].join(' ').toLowerCase();
}

/** True if query matches any field, including date-friendly typing (15/01/2022, 15 Jan 2022). */
function matchesSearch(query, fields, dateFields) {
  const q = String(query || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!q) return true;
  const hay = [
    ...(fields || []),
    ...(dateFields || []).map(dateSearchText)
  ].join(' ').toLowerCase();
  if (hay.includes(q)) return true;

  // Normalize typed dates: 15/1/22 → pad and expand
  const dmY = q.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmY) {
    let day = dmY[1].padStart(2, '0');
    let month = dmY[2].padStart(2, '0');
    let year = dmY[3].length === 2 ? `20${dmY[3]}` : dmY[3];
    const iso = `${year}-${month}-${day}`;
    if (hay.includes(iso) || hay.includes(`${day}/${month}/${year}`)) return true;
  }
  return false;
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
