/**
 * Gitai Earthmovers — Income Module
 */
const IncomeModule = (function () {
  function calcPending() {
    const bill = parseNum(document.getElementById('incomeBillAmount').value);
    const received = parseNum(document.getElementById('incomeReceivedAmount').value);
    document.getElementById('incomePendingAmount').value = Math.max(0, bill - received);
  }

  function getFilteredData() {
    const from = document.getElementById('incomeFilterFrom')?.value;
    const to = document.getElementById('incomeFilterTo')?.value;
    const machine = document.getElementById('incomeFilterMachine')?.value;
    const customer = document.getElementById('incomeFilterCustomer')?.value?.toLowerCase();

    return AppData.income.filter(r => {
      if (from && r.Date < from) return false;
      if (to && r.Date > to) return false;
      if (machine && r.Machine !== machine) return false;
      if (customer && !r.Customer.toLowerCase().includes(customer)) return false;
      return true;
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

    document.getElementById('incomeForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('incomeId').value;
      const bill = parseNum(document.getElementById('incomeBillAmount').value);
      const received = parseNum(document.getElementById('incomeReceivedAmount').value);
      const data = {
        Date: document.getElementById('incomeDate').value,
        Customer: document.getElementById('incomeCustomer').value.trim(),
        Machine: document.getElementById('incomeMachine').value,
        Site: document.getElementById('incomeSite').value,
        HoursWorked: parseNum(document.getElementById('incomeHours').value),
        BillAmount: bill,
        ReceivedAmount: received,
        PendingAmount: Math.max(0, bill - received),
        Remarks: document.getElementById('incomeRemarks').value
      };

      const result = id
        ? await ApiClient.put('income', { ...data, ID: parseInt(id) }, id)
        : await ApiClient.post('income', data);

      if (result.success) {
        bootstrap.Modal.getInstance(document.getElementById('incomeModal')).hide();
        App.showAlert(id ? 'Income updated' : 'Income added');
        await App.loadData();
      } else {
        App.showAlert(result.error, 'danger');
      }
    });

    document.getElementById('incomeModal').addEventListener('show.bs.modal', (e) => {
      if (e.relatedTarget && !document.getElementById('incomeId').value) {
        document.getElementById('incomeForm').reset();
        document.getElementById('incomeId').value = '';
        document.getElementById('incomeDate').value = todayISO();
      }
    });
  }

  function render() {
    App.destroyDataTable('incomeTable');
    const data = getFilteredData();
    const tbody = document.querySelector('#incomeTable tbody');
    tbody.innerHTML = data.map(r => `
      <tr>
        <td>${r.ID}</td>
        <td>${formatDate(r.Date)}</td>
        <td>${r.Customer}</td>
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
    const r = AppData.income.find(x => x.ID == id);
    if (!r) return;
    document.getElementById('incomeId').value = r.ID;
    document.getElementById('incomeDate').value = r.Date;
    document.getElementById('incomeCustomer').value = r.Customer;
    document.getElementById('incomeMachine').value = r.Machine;
    document.getElementById('incomeSite').value = r.Site || '';
    document.getElementById('incomeHours').value = r.HoursWorked || '';
    document.getElementById('incomeBillAmount').value = r.BillAmount;
    document.getElementById('incomeReceivedAmount').value = r.ReceivedAmount;
    document.getElementById('incomePendingAmount').value = r.PendingAmount;
    document.getElementById('incomeRemarks').value = r.Remarks || '';
    new bootstrap.Modal(document.getElementById('incomeModal')).show();
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
