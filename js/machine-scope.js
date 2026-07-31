/**
 * Machine scope — topbar toggle between All / M1 / M2 dedicated views
 * Full company data stays in Gitai.xlsx; UI filters to one machine when selected.
 */
const MachineScope = (function () {
  const STORAGE_KEY = 'earthmovers-machine-scope';

  /** Partner rows have no Machine column — allocate by purchase-era dates */
  const PARTNER_PERIODS = {
    'M1- Mahindra earthmaster sx iv 2022': { from: '0000-01-01', until: '2023-01-14' },
    'M2-Mahindra earthmaster sx iv 2023': { from: '2023-01-14', until: '9999-12-31' }
  };

  let current = 'all';

  function shortLabel(machineName) {
    if (!machineName) return '';
    if (machineName.includes('M1')) return 'M1';
    if (machineName.includes('M2')) return 'M2';
    return machineName.slice(0, 12);
  }

  function getMachines() {
    return (AppData._all?.machines || AppData.machines || []).slice();
  }

  function getScope() {
    return current;
  }

  function isAll() {
    return current === 'all';
  }

  function getSelectedMachineName() {
    return current === 'all' ? '' : current;
  }

  function loadSaved() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'all' || !saved) {
        current = 'all';
        return;
      }
      const known = getMachines().some(m => m.MachineName === saved);
      current = known ? saved : 'all';
    } catch {
      current = 'all';
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, current);
  }

  function inPartnerPeriod(date, machineName) {
    const period = PARTNER_PERIODS[machineName];
    if (!period) return true;
    const d = String(date || '').slice(0, 10);
    return d >= period.from && d < period.until;
  }

  function filterDocuments(docs, machineName, full) {
    const machine = (full.machines || []).find(m => m.MachineName === machineName);
    const loan = (full.loans || []).find(l => l.Machine === machineName);
    const machineId = machine ? String(machine.ID) : '';
    const loanId = loan ? String(loan.ID) : '';
    const code = shortLabel(machineName).toLowerCase();

    return (docs || []).filter(d => {
      const module = String(d.ReferenceModule || '').toLowerCase();
      const ref = String(d.ReferenceID || '');
      if (module === 'machines' && machineId) return ref === machineId;
      if (module === 'loans' && loanId) return ref === loanId;
      const blob = [d.Category, d.FileName, d.DriveLink, d.DocumentType].join(' ').toLowerCase();
      return blob.includes(code) || blob.includes(machineName.toLowerCase());
    });
  }

  function filterForMachine(full, machineName) {
    if (!full || !machineName) return full ? { ...full } : full;

    const scoped = { ...full };
    scoped.machines = (full.machines || []).filter(m => m.MachineName === machineName);
    scoped.income = (full.income || []).filter(r => r.Machine === machineName);
    scoped.expenses = (full.expenses || []).filter(r => r.Machine === machineName);
    scoped.emi = (full.emi || []).filter(r => r.Machine === machineName);
    scoped.loans = (full.loans || []).filter(r => r.Machine === machineName);
    scoped.utilization = (full.utilization || []).filter(r => r.Machine === machineName);
    scoped.partners = (full.partners || []).filter(r => inPartnerPeriod(r.Date, machineName));
    scoped.documents = filterDocuments(full.documents, machineName, full);

    scoped.assets = full.assets || [];
    scoped.users = full.users || [];
    scoped.vendors = full.vendors || [];
    scoped.vendortxns = full.vendortxns || [];
    scoped.bankstatements = full.bankstatements || [];
    scoped.monthlocks = full.monthlocks || [];
    scoped.audit = full.audit || [];
    scoped.backups = full.backups || [];
    scoped.documentversions = full.documentversions || [];

    return scoped;
  }

  function applyFilter(full) {
    if (!full) return full;
    if (current === 'all') return { ...full };
    return filterForMachine(full, current);
  }

  function dedicatedFileName(machineName) {
    const code = shortLabel(machineName);
    const map = CONFIG.MACHINE_EXCEL_FILES || {};
    return map[code] || (`Gitai-${code}.xlsx`);
  }

  /**
   * Build download list: company master + one workbook per machine.
   * @returns {{ filename: string, store: object }[]}
   */
  function buildSaveExports(fullStore) {
    const exports = [
      { filename: CONFIG.EXCEL_FILE || 'Gitai.xlsx', store: fullStore, kind: 'master' }
    ];
    const machines = (fullStore.machines || []).slice();
    machines.forEach(m => {
      const name = m.MachineName;
      exports.push({
        filename: dedicatedFileName(name),
        store: filterForMachine(fullStore, name),
        kind: 'machine',
        machine: name
      });
    });
    return exports;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** Download master + dedicated machine files (staggered for browser allow) */
  async function downloadAllWorkbooks(fullStore) {
    const list = buildSaveExports(fullStore);
    for (let i = 0; i < list.length; i++) {
      ExcelStore.download(list[i].store, list[i].filename);
      if (i < list.length - 1) await sleep(450);
    }
    return list.map(x => x.filename);
  }

  function publishToAppData(full) {
    AppData._all = full;
    const scoped = applyFilter(full);
    Object.keys(CONFIG.ENDPOINTS).forEach(key => {
      AppData[key] = scoped[key] || [];
    });
    // ENDPOINTS values are the store keys
    Object.values(CONFIG.ENDPOINTS).forEach(key => {
      AppData[key] = scoped[key] || [];
    });
  }

  function updateToggleUI() {
    const root = document.getElementById('machineScopeToggle');
    if (!root) return;

    const machines = getMachines();
    const buttons = [
      { value: 'all', label: 'All', title: 'Company-wide (both machines)' },
      ...machines.map(m => ({
        value: m.MachineName,
        label: shortLabel(m.MachineName),
        title: m.MachineName
      }))
    ];

    root.innerHTML = buttons.map(b => `
      <button type="button"
        class="machine-scope-btn ${current === b.value ? 'active' : ''}"
        data-scope="${encodeURIComponent(b.value)}"
        title="${b.title}">${b.label}</button>
    `).join('');

    root.querySelectorAll('.machine-scope-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const value = decodeURIComponent(btn.dataset.scope);
        setScope(value);
      });
    });

    const label = document.getElementById('machineScopeLabel');
    if (label) {
      label.textContent = current === 'all'
        ? 'Company view'
        : shortLabel(current) + ' only';
    }
  }

  function setScope(value, options = {}) {
    const next = value || 'all';
    if (next !== 'all' && !getMachines().some(m => m.MachineName === next)) {
      current = 'all';
    } else {
      current = next;
    }
    save();

    if (AppData._all) {
      publishToAppData(AppData._all);
    }

    updateToggleUI();

    if (typeof App !== 'undefined') {
      App.populateMachineSelects?.();
      if (!options.silent) {
        App.renderCurrentSection?.();
        const name = current === 'all' ? 'All machines' : shortLabel(current);
        App.showAlert(`Switched to <strong>${name}</strong>`, 'info');
      }
    }
  }

  function init() {
    loadSaved();
    updateToggleUI();
  }

  return {
    init,
    getScope,
    isAll,
    getSelectedMachineName,
    shortLabel,
    publishToAppData,
    applyFilter,
    filterForMachine,
    dedicatedFileName,
    buildSaveExports,
    downloadAllWorkbooks,
    setScope,
    updateToggleUI,
    PARTNER_PERIODS
  };
})();
