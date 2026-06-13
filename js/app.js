/**
 * Gitai Earthmovers — Main Application Controller
 */
const App = (function () {
  let currentSection = 'dashboard';
  const dataTables = {};

  function showLoading(show) {
    document.getElementById('loadingOverlay').classList.toggle('d-none', !show);
  }

  function showAlert(message, type = 'success') {
    const container = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    container.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
  }

  function initTheme() {
    const saved = localStorage.getItem('earthmovers-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);

    document.getElementById('themeToggle').addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('earthmovers-theme', next);
      updateThemeIcon(next);
      if (currentSection === 'dashboard') DashboardModule.render();
    });
  }

  function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
  }

  function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebarToggle');
    const close = document.getElementById('sidebarClose');

    toggle?.addEventListener('click', () => sidebar.classList.add('open'));
    close?.addEventListener('click', () => sidebar.classList.remove('open'));

    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        navigateTo(section);
        sidebar.classList.remove('open');
      });
    });

    document.body.addEventListener('click', (e) => {
      const link = e.target.closest('.nav-to-section[data-section]');
      if (!link) return;
      e.preventDefault();
      navigateTo(link.dataset.section);
    });
  }

  function navigateTo(section) {
    currentSection = section;

    document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
    document.getElementById('section-' + section)?.classList.add('active');

    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.section === section);
    });

    window.location.hash = section;
    renderSection(section);
  }

  function renderSection(section) {
    switch (section) {
      case 'dashboard': DashboardModule.render(); break;
      case 'partners': PartnersModule.render(); break;
      case 'machines': MachinesModule.render(); break;
      case 'income': IncomeModule.render(); break;
      case 'expenses': ExpensesModule.render(); break;
      case 'emi': EmiModule.render(); break;
      case 'loans': LoansModule.render(); break;
      case 'assets': AssetsModule.render(); break;
      case 'documents': DocumentsMgmtModule.render(); break;
      case 'reports': break;
      case 'dispute': ReportsModule.renderDisputeSection?.(); break;
      case 'audit': AuditTrailModule.render(); break;
      case 'monthlock': MonthLockModule.render(); break;
      case 'analytics': AnalyticsModule.render(); break;
      case 'receivables': ReceivablesModule.render(); break;
      case 'vendors': VendorsModule.render(); break;
      case 'cashflow': CashFlowModule.render(); break;
      case 'loan-dashboard': LoanDashboardModule.render(); break;
      case 'business-worth': BusinessWorthModule.render(); break;
      case 'bank-recon': BankReconModule.render(); break;
      case 'alerts': AlertCenter.render('alertsFullList'); break;
      case 'insights': InsightsModule.render(); break;
      case 'backup': BackupModule.render(); break;
      case 'partner-analysis':
        PartnerSettlementEngine.renderContributionCharts();
        ReportsModule.renderPartnerAnalysis();
        break;
    }
    AuthModule.applyNavPermissions();
  }

  function initHashRouting() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(hash);

    window.addEventListener('hashchange', () => {
      const h = window.location.hash.replace('#', '') || 'dashboard';
      if (h !== currentSection) navigateTo(h);
    });
  }

  function initGlobalSearch() {
    const input = document.getElementById('globalSearch');
    const results = document.getElementById('searchResults');

    const search = debounce(() => {
      const q = input.value.trim().toLowerCase();
      if (q.length < 2) {
        results.classList.add('d-none');
        return;
      }

      const matches = [];

      AppData.income.forEach(r => {
        const text = [r.Customer, r.Machine, r.Site, r.Remarks].join(' ').toLowerCase();
        if (text.includes(q)) matches.push({ module: 'Income', label: `${r.Customer} — ${formatCurrency(r.BillAmount)}`, section: 'income', id: r.ID });
      });

      AppData.expenses.forEach(r => {
        const text = [r.ExpenseType, r.Machine, r.PaidBy, r.Remarks].join(' ').toLowerCase();
        if (text.includes(q)) matches.push({ module: 'Expense', label: `${r.ExpenseType} — ${formatCurrency(r.Amount)}`, section: 'expenses', id: r.ID });
      });

      AppData.partners.forEach(r => {
        const text = [r.PartnerName, r.TransactionType, r.Remarks].join(' ').toLowerCase();
        if (text.includes(q)) matches.push({ module: 'Partner', label: `${r.PartnerName} — ${r.TransactionType}`, section: 'partners', id: r.ID });
      });

      AppData.emi.forEach(r => {
        const text = [r.Machine, r.Status].join(' ').toLowerCase();
        if (text.includes(q)) matches.push({ module: 'EMI', label: `${r.Machine} — ${r.Status}`, section: 'emi', id: r.ID });
      });

      AppData.machines.forEach(r => {
        const text = [r.MachineName, r.Status].join(' ').toLowerCase();
        if (text.includes(q)) matches.push({ module: 'Machine', label: r.MachineName, section: 'machines', id: r.ID });
      });

      if (matches.length === 0) {
        results.innerHTML = '<div class="dropdown-item text-muted">No results found</div>';
      } else {
        results.innerHTML = matches.slice(0, 15).map(m =>
          `<a class="dropdown-item" href="#${m.section}" data-section="${m.section}">
            <div class="search-module">${m.module}</div>${m.label}
          </a>`
        ).join('');
      }
      results.classList.remove('d-none');
    }, 250);

    input.addEventListener('input', search);

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !results.contains(e.target)) {
        results.classList.add('d-none');
      }
    });

    results.addEventListener('click', (e) => {
      const item = e.target.closest('[data-section]');
      if (item) {
        navigateTo(item.dataset.section);
        results.classList.add('d-none');
        input.value = '';
      }
    });
  }

  function initPartnerModalTriggers() {
    document.querySelectorAll('[data-bs-target="#partnerModal"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action) {
          document.getElementById('partnerType').value = action === 'investment' ? 'Investment' : 'Withdrawal';
        }
      });
    });
  }

  function initDataTable(tableId, options = {}) {
    if (dataTables[tableId]) {
      dataTables[tableId].destroy();
    }
    dataTables[tableId] = $('#' + tableId).DataTable({
      ...CONFIG.DATATABLE_OPTIONS,
      ...options
    });
    return dataTables[tableId];
  }

  function destroyDataTable(tableId) {
    if (dataTables[tableId]) {
      dataTables[tableId].destroy();
      delete dataTables[tableId];
    }
  }

  function updateConnectionBadge() {
    const el = document.getElementById('connectionBadge');
    if (!el) return;
    if (CONFIG.DATA_MODE === 'excel') {
      const inc = AppData.income?.length || 0;
      const exp = AppData.expenses?.length || 0;
      el.className = 'badge bg-primary connection-badge-btn';
      el.textContent = inc || exp ? `Gitai.xlsx · ${inc} inc / ${exp} exp` : 'Gitai.xlsx';
      el.title = inc || exp
        ? 'Loaded from Gitai.xlsx — use Save Excel to download changes'
        : 'No income/expense loaded — Backup → Reload Gitai.xlsx';
    } else if (CONFIG.USE_MOCK_DATA) {
      el.className = 'badge bg-info connection-badge-btn';
      el.textContent = 'Local';
      el.title = 'Local storage mode';
    } else {
      el.className = 'badge bg-success connection-badge-btn';
      el.textContent = 'Google Sheets';
      el.title = 'Connected to Google Sheets';
    }
  }

  function initExcelControls() {
    document.getElementById('btnSaveExcel')?.addEventListener('click', async () => {
      try {
        await ApiClient.saveToExcel();
        showAlert('Downloaded ' + CONFIG.EXCEL_FILE + ' — replace the file in your project folder');
      } catch (err) {
        showAlert(err.message, 'danger');
      }
    });

    document.getElementById('btnReloadExcel')?.addEventListener('click', async () => {
      if (!confirm('Reload from ' + CONFIG.EXCEL_FILE + '? Unsaved browser changes will be lost.')) return;
      localStorage.removeItem(CONFIG.LOCAL_STORAGE_KEY);
      await ApiClient.reloadFromExcel();
      await loadData();
      showAlert('Reloaded from ' + CONFIG.EXCEL_FILE);
    });

    document.getElementById('excelFileImport')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
        if (LegacyMigrate.isLegacyWorkbook(workbook)) {
          const stats = await ApiClient.mergeLegacyRegister(file);
          await loadData();
          showAlert(`Imported ${file.name}: ${stats.income} income, ${stats.expenses} expenses → ${stats.machineName}`);
        } else {
          const data = await ExcelStore.importFile(file);
          await ApiClient.importLocalData(data);
          await loadData();
          showAlert('Imported ' + file.name);
        }
      } catch (err) {
        showAlert('Import failed: ' + err.message, 'danger');
      }
      e.target.value = '';
    });

    document.getElementById('legacyRegisterImport')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const machineName = document.getElementById('legacyMachineName')?.value?.trim() || CONFIG.LEGACY_MACHINE_NAME;
      try {
        const stats = await ApiClient.mergeLegacyRegister(file, machineName);
        await loadData();
        showAlert(`Machine register imported: ${stats.income} income, ${stats.expenses} expenses → ${stats.machineName}`);
      } catch (err) {
        showAlert('Import failed: ' + err.message, 'danger');
      }
      e.target.value = '';
    });
  }

  function initConnectionSetup() {
    if (CONFIG.DATA_MODE === 'excel') return;
    const badge = document.getElementById('connectionBadge');
    const modalEl = document.getElementById('connectSheetsModal');
    if (!badge || !modalEl) return;

    const modal = new bootstrap.Modal(modalEl);
    const urlInput = document.getElementById('connectApiUrl');
    const errorEl = document.getElementById('connectError');

    badge.addEventListener('click', () => {
      errorEl.textContent = '';
      try {
        const stored = JSON.parse(localStorage.getItem('earthmovers-connection') || '{}');
        urlInput.value = stored.apiUrl || CONFIG.API_BASE_URL || '';
      } catch {
        urlInput.value = CONFIG.API_BASE_URL || '';
      }
      modal.show();
    });

    document.getElementById('connectSaveBtn')?.addEventListener('click', () => {
      const url = urlInput.value.trim();
      if (!url.includes('script.google.com') || !url.endsWith('/exec')) {
        errorEl.textContent = 'Enter a valid Apps Script Web App URL ending with /exec';
        return;
      }
      localStorage.setItem('earthmovers-connection', JSON.stringify({ apiUrl: url }));
      localStorage.removeItem('earthmovers-session');
      modal.hide();
      window.location.reload();
    });

    document.getElementById('connectUseDemoBtn')?.addEventListener('click', () => {
      localStorage.removeItem('earthmovers-connection');
      localStorage.removeItem('earthmovers-session');
      modal.hide();
      App.showAlert('Using local storage — data stays in this browser');
      window.location.reload();
    });
  }

  async function loadData() {
    showLoading(true);
    try {
      await AppData.refresh();
      populateMachineSelects();
      populateExpenseTypes();
      updateConnectionBadge();
      renderSection(currentSection);
      const inc = AppData.income.length;
      const exp = AppData.expenses.length;
      if (CONFIG.DATA_MODE === 'excel' && inc === 0 && exp === 0) {
        showAlert('No income/expense in Gitai.xlsx. Go to Backup → Reload Gitai.xlsx, or Import Machine Register.', 'warning');
      }
    } catch (err) {
      showAlert('Failed to load data: ' + err.message, 'danger');
    } finally {
      showLoading(false);
    }
  }

  function populateMachineSelects() {
    const selects = [
      'incomeMachine', 'expenseMachine', 'emiMachine', 'loanMachine',
      'incomeFilterMachine', 'expenseFilterMachine'
    ];
    const options = AppData.machines.map(m =>
      `<option value="${m.MachineName}">${m.MachineName}</option>`
    ).join('');

    selects.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const isFilter = id.includes('Filter');
      el.innerHTML = (isFilter ? '<option value="">All Machines</option>' : '') +
        (id === 'expenseMachine' ? '<option value="">General / N/A</option>' : '') +
        options;
    });
  }

  function populateExpenseTypes() {
    const el = document.getElementById('expenseType');
    const filterEl = document.getElementById('expenseFilterType');
    const opts = CONFIG.EXPENSE_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
    if (el) el.innerHTML = opts;
    if (filterEl) filterEl.innerHTML = '<option value="">All Types</option>' + opts;
  }

  /** Business calculations shared across modules */
  function getTotalRevenue() {
    return AppData.income.reduce((s, r) => s + parseNum(r.BillAmount), 0);
  }

  function getTotalExpenses() {
    return AppData.expenses.reduce((s, r) => s + parseNum(r.Amount), 0);
  }

  function getNetProfit() {
    return getTotalRevenue() - getTotalExpenses();
  }

  function getOutstandingLoans() {
    return AppData.loans.reduce((s, r) => s + parseNum(r.OutstandingLoan), 0);
  }

  function getTotalEmiPaid() {
    return AppData.emi.reduce((s, r) => s + parseNum(r.TotalPaid), 0);
  }

  function getTotalBounceCharges() {
    return AppData.emi.reduce((s, r) => s + parseNum(r.BounceCharges) + parseNum(r.PenaltyCharges), 0);
  }

  function getTotalPartnerInvestment() {
    return AppData.partners
      .filter(p => p.TransactionType === 'Investment')
      .reduce((s, r) => s + parseNum(r.Amount), 0);
  }

  function getTotalPartnerWithdrawals() {
    return AppData.partners
      .filter(p => p.TransactionType === 'Withdrawal')
      .reduce((s, r) => s + parseNum(r.Amount), 0);
  }

  function getCurrentAssetValue() {
    const machineValue = AppData.machines.reduce((s, r) => s + parseNum(r.CurrentValue), 0);
    const assetValue = AppData.assets.reduce((s, r) => s + parseNum(r.CurrentValue), 0);
    return machineValue + assetValue;
  }

  function getPartnerBalances() {
    return PartnerSettlementEngine.calculate().map(p => ({
      name: p.name,
      investments: p.capitalIntroduced + p.additionalCapital,
      withdrawals: p.withdrawals,
      profitShare: p.profitShare,
      balance: p.settlement,
      sharePercent: p.sharePercent,
      lossShare: p.lossShare,
      netCapital: p.netCapital
    }));
  }

  async function init() {
    if (typeof injectEnterpriseUI === 'function') await injectEnterpriseUI();

    await AuthModule.init();
    initTheme();
    initSidebar();
    initHashRouting();
    initGlobalSearch();
    initConnectionSetup();
    initExcelControls();
    initPartnerModalTriggers();

    document.getElementById('refreshData').addEventListener('click', loadData);

    MonthLockModule.init();
    PartnersModule.init();
    MachinesModule.init();
    IncomeModule.init();
    ExpensesModule.init();
    EmiModule.init();
    LoansModule.init();
    AssetsModule.init();
    DocumentsMgmtModule.init();
    VendorsModule.init();
    BankReconModule.init();
    BackupModule.init();

    if (AuthModule.getUser()) {
      await loadData();
      AuthModule.applyNavPermissions();
    }
  }

  return {
    init,
    navigateTo,
    showLoading,
    showAlert,
    initDataTable,
    destroyDataTable,
    getTotalRevenue,
    getTotalExpenses,
    getNetProfit,
    getOutstandingLoans,
    getTotalEmiPaid,
    getTotalBounceCharges,
    getTotalPartnerInvestment,
    getTotalPartnerWithdrawals,
    getCurrentAssetValue,
    getPartnerBalances,
    loadData
  };
})();

/** Loans Module */
const LoansModule = {
  readForm() {
    return {
      Machine: document.getElementById('loanMachine').value,
      LoanAmount: parseNum(document.getElementById('loanAmount').value),
      PrincipalPaid: parseNum(document.getElementById('loanPrincipalPaid').value),
      InterestPaid: parseNum(document.getElementById('loanInterestPaid').value),
      OutstandingLoan: parseNum(document.getElementById('loanOutstanding').value),
      AgreementNo: document.getElementById('loanAgreementNo').value.trim(),
      Lender: document.getElementById('loanLender').value.trim(),
      CustomerID: document.getElementById('loanCustomerId').value.trim(),
      DisbursalDate: document.getElementById('loanDisbursalDate').value,
      EMIAmount: parseNum(document.getElementById('loanEmiAmount').value),
      TenureMonths: parseInt(document.getElementById('loanTenure').value, 10) || 0,
      BalanceTenure: parseInt(document.getElementById('loanBalanceTenure').value, 10) || 0,
      IRR: parseNum(document.getElementById('loanIrr').value),
      InterestType: document.getElementById('loanInterestType').value,
      Applicant: document.getElementById('loanApplicant').value.trim(),
      CoApplicant: document.getElementById('loanCoApplicant').value.trim(),
      ProductType: document.getElementById('loanProductType').value.trim(),
      LoanStatus: document.getElementById('loanStatus').value,
      OverdueAmount: parseNum(document.getElementById('loanOverdue').value),
      DisbursalStatus: document.getElementById('loanDisbursalStatus').value,
      Frequency: document.getElementById('loanFrequency').value,
      Remarks: document.getElementById('loanRemarks').value.trim()
    };
  },

  fillForm(r) {
    document.getElementById('loanId').value = r.ID || '';
    document.getElementById('loanMachine').value = r.Machine || '';
    document.getElementById('loanAmount').value = r.LoanAmount || '';
    document.getElementById('loanPrincipalPaid').value = r.PrincipalPaid || '';
    document.getElementById('loanInterestPaid').value = r.InterestPaid || '';
    document.getElementById('loanOutstanding').value = r.OutstandingLoan || '';
    document.getElementById('loanAgreementNo').value = r.AgreementNo || '';
    document.getElementById('loanLender').value = r.Lender || '';
    document.getElementById('loanCustomerId').value = r.CustomerID || '';
    document.getElementById('loanDisbursalDate').value = r.DisbursalDate || '';
    document.getElementById('loanEmiAmount').value = r.EMIAmount || '';
    document.getElementById('loanTenure').value = r.TenureMonths || '';
    document.getElementById('loanBalanceTenure').value = r.BalanceTenure || '';
    document.getElementById('loanIrr').value = r.IRR || '';
    document.getElementById('loanInterestType').value = r.InterestType || 'Fixed';
    document.getElementById('loanApplicant').value = r.Applicant || '';
    document.getElementById('loanCoApplicant').value = r.CoApplicant || '';
    document.getElementById('loanProductType').value = r.ProductType || '';
    document.getElementById('loanStatus').value = r.LoanStatus || 'Active';
    document.getElementById('loanOverdue').value = r.OverdueAmount || 0;
    document.getElementById('loanDisbursalStatus').value = r.DisbursalStatus || '';
    document.getElementById('loanFrequency').value = r.Frequency || 'Monthly';
    document.getElementById('loanRemarks').value = r.Remarks || '';
  },

  init() {
    document.getElementById('loanForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('loanId').value;
      const data = this.readForm();

      const result = id
        ? await ApiClient.put('loans', { ...data, ID: parseInt(id) }, id)
        : await ApiClient.post('loans', data);

      if (result.success) {
        bootstrap.Modal.getInstance(document.getElementById('loanModal')).hide();
        App.showAlert(id ? 'Loan updated' : 'Loan added');
        await App.loadData();
      } else {
        App.showAlert(result.error, 'danger');
      }
    });

    document.getElementById('loanModal').addEventListener('show.bs.modal', (e) => {
      if (!e.relatedTarget) return;
      document.getElementById('loanForm').reset();
      document.getElementById('loanId').value = '';
      document.getElementById('loanInterestType').value = 'Fixed';
      document.getElementById('loanStatus').value = 'Active';
      document.getElementById('loanFrequency').value = 'Monthly';
    });
  },

  render() {
    App.destroyDataTable('loansTable');
    const tbody = document.querySelector('#loansTable tbody');
    tbody.innerHTML = AppData.loans.map(r => {
      const repaid = parseNum(r.LoanAmount) > 0
        ? (((parseNum(r.LoanAmount) - parseNum(r.OutstandingLoan)) / parseNum(r.LoanAmount)) * 100).toFixed(0)
        : 0;
      return `
      <tr>
        <td>${r.ID}</td>
        <td>
          <strong>${r.Machine}</strong>
          ${r.AgreementNo ? `<div class="small text-muted">${r.AgreementNo}</div>` : ''}
        </td>
        <td>${r.Lender || '—'}</td>
        <td>${formatCurrency(r.LoanAmount)}</td>
        <td>${formatCurrency(r.EMIAmount)}/mo</td>
        <td>${formatCurrency(r.OutstandingLoan)}<div class="small text-muted">${repaid}% repaid</div></td>
        <td><span class="badge bg-${r.LoanStatus === 'Active' ? 'success' : 'secondary'}">${r.LoanStatus || 'Active'}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-accent action-btn" onclick="LoansModule.edit(${r.ID})"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger action-btn" onclick="LoansModule.remove(${r.ID})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `;
    }).join('') || '<tr><td colspan="8" class="text-muted">No loans recorded</td></tr>';
    App.initDataTable('loansTable');
  },

  edit(id) {
    const r = AppData.loans.find(x => x.ID == id);
    if (!r) return;
    this.fillForm(r);
    new bootstrap.Modal(document.getElementById('loanModal')).show();
  },

  async remove(id) {
    if (!confirm('Delete this loan record?')) return;
    const result = await ApiClient.delete('loans', id);
    if (result.success) {
      App.showAlert('Loan deleted');
      await App.loadData();
    }
  }
};

/** Assets Module */
const AssetsModule = {
  init() {
    document.getElementById('assetForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('assetId').value;
      const data = {
        AssetName: document.getElementById('assetName').value,
        PurchaseValue: parseNum(document.getElementById('assetPurchaseValue').value),
        CurrentValue: parseNum(document.getElementById('assetCurrentValue').value),
        Remarks: document.getElementById('assetRemarks').value
      };
      const result = id ? await ApiClient.put('assets', { ...data, ID: parseInt(id) }, id) : await ApiClient.post('assets', data);
      if (result.success) {
        bootstrap.Modal.getInstance(document.getElementById('assetModal')).hide();
        App.showAlert(id ? 'Asset updated' : 'Asset added');
        await App.loadData();
      }
    });
    document.getElementById('assetModal').addEventListener('show.bs.modal', () => {
      document.getElementById('assetForm').reset();
      document.getElementById('assetId').value = '';
    });
  },

  render() {
    document.querySelector('#assetsTable tbody').innerHTML = AppData.assets.map(r => `
      <tr>
        <td>${r.ID}</td><td>${r.AssetName}</td>
        <td>${formatCurrency(r.PurchaseValue)}</td><td>${formatCurrency(r.CurrentValue)}</td>
        <td>${r.Remarks || '—'}</td>
        <td>
          <button class="btn btn-sm btn-outline-accent action-btn" onclick="AssetsModule.edit(${r.ID})"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger action-btn" onclick="AssetsModule.remove(${r.ID})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');
    App.initDataTable('assetsTable');
  },

  edit(id) {
    const r = AppData.assets.find(x => x.ID == id);
    if (!r) return;
    document.getElementById('assetId').value = r.ID;
    document.getElementById('assetName').value = r.AssetName;
    document.getElementById('assetPurchaseValue').value = r.PurchaseValue;
    document.getElementById('assetCurrentValue').value = r.CurrentValue;
    document.getElementById('assetRemarks').value = r.Remarks || '';
    new bootstrap.Modal(document.getElementById('assetModal')).show();
  },

  async remove(id) {
    if (!confirm('Delete this asset?')) return;
    await ApiClient.delete('assets', id);
    await App.loadData();
  }
};

/** Legacy DocumentsModule — delegates to enhanced module */
const DocumentsModule = {
  init: () => DocumentsMgmtModule.init(),
  render: () => DocumentsMgmtModule.render()
};

document.addEventListener('DOMContentLoaded', () => App.init());
