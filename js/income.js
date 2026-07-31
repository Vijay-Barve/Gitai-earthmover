/**
 * Gitai Earthmovers — Income Module
 */
const IncomeModule = (function () {
  function calcPending() {
    const bill = parseNum(document.getElementById('incomeBillAmount').value);
    const received = parseNum(document.getElementById('incomeReceivedAmount').value);
    document.getElementById('incomePendingAmount').value = Math.max(0, bill - received);
  }

  function isAssumedDate(r) {
    return /date assumed/i.test(String(r.Remarks || ''));
  }

  function customerLabel(r) {
    return typeof CustomerAliases !== 'undefined'
      ? CustomerAliases.canonicalize(r.Customer)
      : String(r.Customer || '');
  }

  function getFilteredData() {
    const from = document.getElementById('incomeFilterFrom')?.value;
    const to = document.getElementById('incomeFilterTo')?.value;
    const machine = document.getElementById('incomeFilterMachine')?.value;
    const customer = document.getElementById('incomeFilterCustomer')?.value?.toLowerCase();
    const q = (document.getElementById('incomeFilterSearch')?.value || '').trim().toLowerCase();

    return AppData.income.filter(r => {
      const d = String(r.Date || '');
      if (from && (!d || d < from)) return false;
      if (to && (!d || d > to)) return false;
      if (machine && r.Machine !== machine) return false;
      const cust = customerLabel(r);
      if (customer && !cust.toLowerCase().includes(customer) && !String(r.Customer || '').toLowerCase().includes(customer)) {
        return false;
      }
      if (q && !matchesSearch(q, [
        r.ID, cust, r.Customer, r.Machine, r.Site, r.HoursWorked,
        r.BillAmount, r.ReceivedAmount, r.PendingAmount, r.Remarks
      ], [r.Date])) return false;
      return true;
    }).sort((a, b) => {
      const da = String(a.Date || '');
      const db = String(b.Date || '');
      if (da !== db) return da < db ? -1 : 1;
      const aa = isAssumedDate(a) ? 1 : 0;
      const ab = isAssumedDate(b) ? 1 : 0;
      if (aa !== ab) return aa - ab;
      return (parseInt(a.ID, 10) || 0) - (parseInt(b.ID, 10) || 0);
    });
  }

  function init() {
    ['incomeBillAmount', 'incomeReceivedAmount'].forEach(id => {
      document.getElementById(id).addEventListener('input', calcPending);
    });

    ['incomeFilterFrom', 'incomeFilterTo', 'incomeFilterMachine', 'incomeFilterCustomer'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', render);
      document.getElementById(id)?.addEventListener('input', debounce(render, 300));
    });
    document.getElementById('incomeFilterSearch')?.addEventListener('input', debounce(render, 250));

    document.getElementById('incomeForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const id = document.getElementById('incomeId').value;
      const bill = parseNum(document.getElementById('incomeBillAmount').value);
      const received = parseNum(document.getElementById('incomeReceivedAmount').value);
      const dateVal = document.getElementById('incomeDate').value;
      if (!dateVal) {
        App.showAlert('Date is required for income records.', 'warning');
        return;
      }
      // Disabled selects are skipped by native submit; read explicitly while scoped
      const machineEl = document.getElementById('incomeMachine');
      if (machineEl.disabled) machineEl.disabled = false;
      const data = {
        Date: dateVal,
        Customer: typeof CustomerAliases !== 'undefined'
          ? CustomerAliases.canonicalize(document.getElementById('incomeCustomer').value.trim())
          : document.getElementById('incomeCustomer').value.trim(),
        Machine: machineEl.value,
        Site: document.getElementById('incomeSite').value,
        HoursWorked: document.getElementById('incomeHours').value === ''
          ? ''
          : parseNum(document.getElementById('incomeHours').value),
        BillAmount: bill,
        ReceivedAmount: received,
        PendingAmount: Math.max(0, bill - received),
        Remarks: document.getElementById('incomeRemarks').value
      };
      if (typeof MachineScope !== 'undefined' && MachineScope.getSelectedMachineName()) {
        machineEl.disabled = true;
      }

      const result = id
        ? await ApiClient.put('income', { ...data, ID: parseInt(id, 10) }, id)
        : await ApiClient.post('income', data);

      if (result.success) {
        bootstrap.Modal.getOrCreateInstance(document.getElementById('incomeModal')).hide();
        App.showAlert(id ? 'Income updated' : 'Income added');
        await App.loadData();
      } else {
        App.showAlert(result.error || 'Could not save income', 'danger');
      }
    });

    document.getElementById('incomeModal').addEventListener('show.bs.modal', (e) => {
      // Add button sets relatedTarget; edit() opens programmatically (no relatedTarget)
      if (e.relatedTarget) {
        document.getElementById('incomeForm').reset();
        document.getElementById('incomeId').value = '';
        document.getElementById('incomeDate').value = todayISO();
        const title = document.querySelector('#incomeModal .modal-title');
        if (title) title.textContent = 'Income Entry';
        App.populateMachineSelects?.();
      }
    });

    document.getElementById('incomeModal').addEventListener('hidden.bs.modal', () => {
      const title = document.querySelector('#incomeModal .modal-title');
      if (title) title.textContent = 'Income Entry';
    });
  }

  function render() {
    App.destroyDataTable('incomeTable');
    const data = getFilteredData();
    const summary = document.getElementById('incomeSummary');
    if (summary) {
      const total = data.reduce((s, r) => s + parseNum(r.BillAmount), 0);
      summary.textContent = `${data.length} records · Bill total ${formatCurrency(total)}`;
    }
    const tbody = document.querySelector('#incomeTable tbody');
    tbody.innerHTML = data.map(r => `
      <tr>
        <td>${r.ID}</td>
        <td>${formatDate(r.Date)}${isAssumedDate(r) ? ' <span class="badge text-bg-secondary" title="Date was missing in register; assigned to avoid clashing with real dates">assumed</span>' : ''}</td>
        <td>${customerLabel(r)}</td>
        <td>${r.Machine}</td>
        <td>${r.Site || '—'}</td>
        <td>${r.HoursWorked || '—'}</td>
        <td>${formatCurrency(r.BillAmount)}</td>
        <td>${formatCurrency(r.ReceivedAmount)}</td>
        <td class="${parseNum(r.PendingAmount) > 0 ? 'text-warning' : ''}">${formatCurrency(r.PendingAmount)}</td>
        <td>${r.Remarks || '—'}</td>
        <td>
          <button class="btn btn-sm btn-outline-accent action-btn" onclick="IncomeModule.edit(${r.ID})"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger action-btn" onclick="IncomeModule.remove(${r.ID})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');
    App.initDataTable('incomeTable');
  }

  function edit(id) {
    const r = AppData.income.find(x => x.ID == id)
      || AppData._all?.income?.find(x => x.ID == id);
    if (!r) {
      App.showAlert('Income record not found (id ' + id + '). Try Sync from Excel or refresh.', 'warning');
      return;
    }
    document.getElementById('incomeId').value = r.ID;
    document.getElementById('incomeDate').value = r.Date || '';
    document.getElementById('incomeCustomer').value =
      (typeof CustomerAliases !== 'undefined' ? CustomerAliases.canonicalize(r.Customer) : r.Customer) || '';
    document.getElementById('incomeMachine').value = r.Machine || '';
    document.getElementById('incomeSite').value = r.Site || '';
    document.getElementById('incomeHours').value =
      r.HoursWorked === 0 || r.HoursWorked === '0' ? 0 : (r.HoursWorked || '');
    document.getElementById('incomeBillAmount').value = r.BillAmount;
    document.getElementById('incomeReceivedAmount').value = r.ReceivedAmount;
    document.getElementById('incomePendingAmount').value = r.PendingAmount;
    document.getElementById('incomeRemarks').value = r.Remarks || '';
    calcPending();
    bootstrap.Modal.getOrCreateInstance(document.getElementById('incomeModal')).show();
  }

  async function remove(id) {
    if (!confirm('Delete this income entry?')) return;
    const result = await ApiClient.delete('income', id);
    if (result.success) {
      App.showAlert('Income deleted');
      await App.loadData();
    }
  }

  return { init, render, edit, remove };
})();
