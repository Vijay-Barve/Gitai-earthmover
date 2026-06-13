/**
 * Gitai Earthmovers — Legacy income/expense register → Income + Expenses
 * Source format: Register tab (Date, Description, Category, Income Money IN, Expense Money OUT, …)
 */
const LegacyMigrate = (function () {
  const INCOME_CATEGORIES = ['work hrs', 'work hours', 'trip', 'gutta', 'us trolly'];
  const EXPENSE_MAP = {
    diesel: 'Diesel',
    petrol: 'Diesel',
    operator: 'Salary',
    servicing: 'Maintenance',
    grease: 'Maintenance',
    'grease pump': 'Maintenance',
    washing: 'Maintenance',
    'coolent water': 'Maintenance',
    coolent: 'Maintenance',
    other: 'Misc',
    redium: 'Misc',
    'visiting cards': 'Misc',
    'loan file': 'Misc',
    maintenance: 'Maintenance',
    repair: 'Repair',
    insurance: 'Insurance',
    rto: 'RTO',
    transport: 'Transport'
  };

  function parseAmount(value) {
    if (value === '' || value === null || value === undefined) return 0;
    const num = parseFloat(String(value).replace(/,/g, '').replace(/[()]/g, '').trim());
    return isNaN(num) ? 0 : Math.abs(num);
  }

  function parseDate(value) {
    if (!value) return '';
    if (value instanceof Date && !isNaN(value.getTime())) {
      const pad = n => (n < 10 ? '0' + n : String(n));
      return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
    }
    const str = String(value).trim();
    if (!str) return '';
    const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const parts = str.split(/[\/\-]/);
    if (parts.length === 3) {
      let day = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      if (month > 12) {
        const tmp = day; day = month; month = tmp;
      }
      const pad = n => (n < 10 ? '0' + n : String(n));
      return `${year}-${pad(month)}-${pad(day)}`;
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return '';
  }

  function normalizeCategory(category, description) {
    const cat = String(category || '').trim().toLowerCase();
    if (cat) return cat;
    return String(description || '').trim().toLowerCase();
  }

  function mapExpenseType(category, description) {
    const key = normalizeCategory(category, description);
    if (EXPENSE_MAP[key]) return EXPENSE_MAP[key];
    return 'Misc';
  }

  function isIncomeRow(category, description, incomeAmt) {
    const key = normalizeCategory(category, description);
    if (INCOME_CATEGORIES.indexOf(key) >= 0) return true;
    if (incomeAmt <= 0) return false;
    if (EXPENSE_MAP[key]) return false;
    if (key && INCOME_CATEGORIES.indexOf(key) < 0 && !EXPENSE_MAP[key]) {
      const desc = String(description || '').trim();
      if (desc && !EXPENSE_MAP[desc.toLowerCase()]) return true;
    }
    return false;
  }

  function isExpenseRow(category, description, expenseAmt, incomeAmt) {
    const key = normalizeCategory(category, description);
    if (EXPENSE_MAP[key]) return true;
    if (INCOME_CATEGORIES.indexOf(key) >= 0) return false;
    if (expenseAmt > 0 && incomeAmt <= 0) return true;
    if (!category && EXPENSE_MAP[String(description || '').toLowerCase()]) return true;
    return false;
  }

  function getColumnMap(headers) {
    const map = {};
    headers.forEach((h, idx) => {
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

  function nextId(items) {
    if (!items.length) return 1;
    return Math.max(...items.map(i => parseInt(i.ID, 10) || 0)) + 1;
  }

  function ensureMachine(store, machineName) {
    const name = machineName || CONFIG.LEGACY_MACHINE_NAME || 'Machine 1';
    const exists = (store.machines || []).some(m => m.MachineName === name);
    if (exists) return name;
    store.machines = store.machines || [];
    store.machines.push({
      ID: nextId(store.machines),
      MachineName: name,
      PurchaseDate: CONFIG.BUSINESS_START_DATE || '2022-01-01',
      PurchaseCost: '',
      LoanAmount: '',
      DownPayment: '',
      CurrentValue: '',
      Status: 'Active'
    });
    return name;
  }

  function findRegisterSheet(workbook) {
    if (!workbook || !workbook.SheetNames) return null;
    const reserved = (typeof ExcelStore !== 'undefined' ? ExcelStore.SHEETS : [])
      .map(s => s.name);
    for (const name of workbook.SheetNames) {
      if (name === 'Register') return name;
    }
    for (const name of workbook.SheetNames) {
      if (reserved.indexOf(name) >= 0) continue;
      const ws = workbook.Sheets[name];
      const rows = typeof XLSX !== 'undefined'
        ? XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        : [];
      if (!rows.length) continue;
      const headers = rows[0].map(String);
      if (headers.some(h => h.toLowerCase().indexOf('income money in') >= 0)) {
        return name;
      }
    }
    return null;
  }

  function isLegacyWorkbook(workbook) {
    return !!findRegisterSheet(workbook);
  }

  function rowsFromWorkbook(workbook, sheetName) {
    const name = sheetName || findRegisterSheet(workbook);
    if (!name) throw new Error('Legacy Register sheet not found (Date, Income Money IN columns).');
    const ws = workbook.Sheets[name];
    return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  }

  function migrateRegisterRows(dataRows, options) {
    const machineName = options?.machineName || CONFIG.LEGACY_MACHINE_NAME || 'Machine 1';
    const sourceLabel = options?.sourceLabel || 'Register';
    const startIncomeId = options?.startIncomeId || 1;
    const startExpenseId = options?.startExpenseId || 1;

    if (!dataRows || dataRows.length <= 1) {
      return { income: [], expenses: [], stats: { income: 0, expenses: 0, skipped: 0 } };
    }

    const col = getColumnMap(dataRows[0].map(String));
    if (col.date === undefined) {
      throw new Error('Date column not found in legacy register.');
    }

    const income = [];
    const expenses = [];
    let incomeId = startIncomeId;
    let expenseId = startExpenseId;
    let skipped = 0;

    for (let i = 1; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row.some(cell => cell !== '' && cell !== null)) continue;

      const date = parseDate(row[col.date]);
      const description = col.description !== undefined ? String(row[col.description] || '').trim() : '';
      const category = col.category !== undefined ? String(row[col.category] || '').trim() : '';
      const incomeAmt = col.income !== undefined ? parseAmount(row[col.income]) : 0;
      const expenseAmt = col.expense !== undefined ? parseAmount(row[col.expense]) : 0;
      const pending = col.pending !== undefined ? parseAmount(row[col.pending]) : 0;

      if (!date) { skipped++; continue; }

      if (isIncomeRow(category, description, incomeAmt)) {
        const bill = incomeAmt || expenseAmt;
        if (bill <= 0) { skipped++; continue; }
        const received = pending > 0 ? Math.max(bill - pending, 0) : bill;
        income.push({
          ID: incomeId++,
          Date: date,
          Customer: description || 'Customer',
          Machine: machineName,
          Site: category || '',
          HoursWorked: '',
          BillAmount: bill,
          ReceivedAmount: received,
          PendingAmount: pending || Math.max(bill - received, 0),
          Remarks: `Imported from ${sourceLabel}`
        });
        continue;
      }

      if (isExpenseRow(category, description, expenseAmt, incomeAmt)) {
        const amount = expenseAmt || incomeAmt;
        if (amount <= 0) { skipped++; continue; }
        expenses.push({
          ID: expenseId++,
          Date: date,
          ExpenseType: mapExpenseType(category, description),
          Machine: machineName,
          Amount: amount,
          PaidBy: 'Cash',
          Remarks: [description, category].filter(Boolean).join(' — ') + ` (imported from ${sourceLabel})`
        });
        continue;
      }

      if (incomeAmt > 0) {
        income.push({
          ID: incomeId++,
          Date: date,
          Customer: description || 'Customer',
          Machine: machineName,
          Site: category || '',
          HoursWorked: '',
          BillAmount: incomeAmt,
          ReceivedAmount: incomeAmt,
          PendingAmount: 0,
          Remarks: `Imported (fallback) from ${sourceLabel}`
        });
      } else if (expenseAmt > 0) {
        expenses.push({
          ID: expenseId++,
          Date: date,
          ExpenseType: mapExpenseType(category, description),
          Machine: machineName,
          Amount: expenseAmt,
          PaidBy: 'Cash',
          Remarks: [description, category].filter(Boolean).join(' — ') + ` (imported from ${sourceLabel})`
        });
      } else {
        skipped++;
      }
    }

    return {
      income,
      expenses,
      stats: { income: income.length, expenses: expenses.length, skipped }
    };
  }

  function mergeIntoStore(store, workbook, options) {
    const sheetName = findRegisterSheet(workbook);
    const rows = rowsFromWorkbook(workbook, sheetName);
    const machineName = ensureMachine(store, options?.machineName);
    const sourceLabel = options?.sourceLabel || sheetName || 'Register';

    const result = migrateRegisterRows(rows, {
      machineName,
      sourceLabel,
      startIncomeId: nextId(store.income || []),
      startExpenseId: nextId(store.expenses || [])
    });

    store.income = [...(store.income || []), ...result.income];
    store.expenses = [...(store.expenses || []), ...result.expenses];
    return { ...result.stats, machineName, sheetName };
  }

  return {
    migrateRegisterRows,
    mergeIntoStore,
    isLegacyWorkbook,
    findRegisterSheet,
    ensureMachine
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LegacyMigrate;
}
