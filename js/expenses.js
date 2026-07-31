/**
 * Gitai Earthmovers — Expenses Module
 */
const ExpensesModule = (function () {
  function getFilteredData() {
    const from = document.getElementById('expenseFilterFrom')?.value;
    const to = document.getElementById('expenseFilterTo')?.value;
    const machine = document.getElementById('expenseFilterMachine')?.value;
    const type = document.getElementById('expenseFilterType')?.value;
    const q = (document.getElementById('expenseFilterSearch')?.value || '').trim().toLowerCase();

    return AppData.expenses.filter(r => {
      if (from && r.Date < from) return false;
      if (to && r.Date > to) return false;
      if (machine && r.Machine !== machine) return false;
      if (type && r.ExpenseType !== type) return false;
      if (q && !matchesSearch(q, [
        r.ID, r.ExpenseType, r.Machine, r.Amount, r.PaidBy, r.Remarks
      ], [r.Date])) return false;
      return true;
    });
  }

  function init() {
    ['expenseFilterFrom', 'expenseFilterTo', 'expenseFilterMachine', 'expenseFilterType'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', render);
    });
    document.getElementById('expenseFilterSearch')?.addEventListener('input', debounce(render, 250));

    document.getElementById('expenseForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const id = document.getElementById('expenseId').value;
      const machineEl = document.getElementById('expenseMachine');
      if (machineEl.disabled) machineEl.disabled = false;
      const data = {
        Date: document.getElementById('expenseDate').value,
        ExpenseType: document.getElementById('expenseType').value,
        Machine: machineEl.value,
        Amount: parseNum(document.getElementById('expenseAmount').value),
        PaidBy: document.getElementById('expensePaidBy').value,
        Remarks: document.getElementById('expenseRemarks').value
      };
      if (typeof MachineScope !== 'undefined' && MachineScope.getSelectedMachineName()) {
        machineEl.disabled = true;
      }

      const result = id
        ? await ApiClient.put('expenses', { ...data, ID: parseInt(id, 10) }, id)
        : await ApiClient.post('expenses', data);

      if (result.success) {
        bootstrap.Modal.getOrCreateInstance(document.getElementById('expenseModal')).hide();
        App.showAlert(id ? 'Expense updated' : 'Expense added');
        await App.loadData();
      } else {
        App.showAlert(result.error || 'Could not save expense', 'danger');
      }
    });

    document.getElementById('expenseModal').addEventListener('show.bs.modal', (e) => {
      if (e.relatedTarget) {
        document.getElementById('expenseForm').reset();
        document.getElementById('expenseId').value = '';
        document.getElementById('expenseDate').value = todayISO();
        App.populateMachineSelects?.();
      }
    });
  }

  function render() {
    App.destroyDataTable('expensesTable');
    const data = getFilteredData();
    const summary = document.getElementById('expenseSummary');
    if (summary) {
      const total = data.reduce((s, r) => s + parseNum(r.Amount), 0);
      summary.textContent = `${data.length} records · Total ${formatCurrency(total)}`;
    }
    const tbody = document.querySelector('#expensesTable tbody');
    tbody.innerHTML = data.map(r => `
      <tr>
        <td>${r.ID}</td>
        <td>${formatDate(r.Date)}</td>
        <td><span class="badge badge-accent">${r.ExpenseType}</span></td>
        <td>${r.Machine || 'General'}</td>
        <td>${formatCurrency(r.Amount)}</td>
        <td>${r.PaidBy || '—'}</td>
        <td>${r.Remarks || '—'}</td>
        <td>
          <button class="btn btn-sm btn-outline-accent action-btn" onclick="ExpensesModule.edit(${r.ID})"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger action-btn" onclick="ExpensesModule.remove(${r.ID})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');
    App.initDataTable('expensesTable');
  }

  function edit(id) {
    const r = AppData.expenses.find(x => x.ID == id)
      || AppData._all?.expenses?.find(x => x.ID == id);
    if (!r) {
      App.showAlert('Expense record not found (id ' + id + '). Try Sync from Excel or refresh.', 'warning');
      return;
    }
    document.getElementById('expenseId').value = r.ID;
    document.getElementById('expenseDate').value = r.Date || '';
    const typeEl = document.getElementById('expenseType');
    if (r.ExpenseType && ![...typeEl.options].some(o => o.value === r.ExpenseType)) {
      typeEl.add(new Option(r.ExpenseType, r.ExpenseType));
    }
    typeEl.value = r.ExpenseType || '';
    document.getElementById('expenseMachine').value = r.Machine || '';
    document.getElementById('expenseAmount').value = r.Amount;
    document.getElementById('expensePaidBy').value = r.PaidBy || '';
    document.getElementById('expenseRemarks').value = r.Remarks || '';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('expenseModal')).show();
  }

  async function remove(id) {
    if (!confirm('Delete this expense?')) return;
    const result = await ApiClient.delete('expenses', id);
    if (result.success) {
      App.showAlert('Expense deleted');
      await App.loadData();
    }
  }

  return { init, render, edit, remove };
})();
