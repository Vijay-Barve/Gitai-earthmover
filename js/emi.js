/**
 * Gitai Earthmovers — EMI Module
 */
const EmiModule = (function () {
  function calcTotalPaid() {
    const emi = parseNum(document.getElementById('emiAmount').value);
    const bounce = parseNum(document.getElementById('emiBounceCharges').value);
    const penalty = parseNum(document.getElementById('emiPenaltyCharges').value);
    const status = document.getElementById('emiStatus').value;
    const paidDate = document.getElementById('emiPaidDate').value;

    let total = 0;
    if (status === 'Paid' || paidDate) {
      total = emi + bounce + penalty;
    } else if (status === 'Bounced') {
      total = bounce + penalty;
    }
    document.getElementById('emiTotalPaid').value = total;
  }

  function autoDetectStatus() {
    const dueDate = document.getElementById('emiDueDate').value;
    const paidDate = document.getElementById('emiPaidDate').value;
    const statusEl = document.getElementById('emiStatus');
    const bounce = parseNum(document.getElementById('emiBounceCharges').value);

    if (bounce > 0 && !paidDate) {
      statusEl.value = 'Bounced';
    } else if (paidDate) {
      statusEl.value = 'Paid';
    } else if (dueDate && dueDate < todayISO()) {
      statusEl.value = 'Overdue';
    }
    calcTotalPaid();
  }

  function init() {
    ['emiAmount', 'emiBounceCharges', 'emiPenaltyCharges', 'emiPaidDate', 'emiDueDate', 'emiStatus'].forEach(id => {
      document.getElementById(id).addEventListener('input', autoDetectStatus);
      document.getElementById(id).addEventListener('change', autoDetectStatus);
    });

    document.getElementById('emiForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      calcTotalPaid();
      const id = document.getElementById('emiId').value;
      const data = {
        Machine: document.getElementById('emiMachine').value,
        DueDate: document.getElementById('emiDueDate').value,
        EMIAmount: parseNum(document.getElementById('emiAmount').value),
        PaidDate: document.getElementById('emiPaidDate').value,
        BounceCharges: parseNum(document.getElementById('emiBounceCharges').value),
        PenaltyCharges: parseNum(document.getElementById('emiPenaltyCharges').value),
        TotalPaid: parseNum(document.getElementById('emiTotalPaid').value),
        Status: document.getElementById('emiStatus').value
      };

      const result = id
        ? await ApiClient.put('emi', { ...data, ID: parseInt(id) }, id)
        : await ApiClient.post('emi', data);

      if (result.success) {
        bootstrap.Modal.getInstance(document.getElementById('emiModal')).hide();
        App.showAlert(id ? 'EMI updated' : 'EMI added');
        await App.loadData();
      } else {
        App.showAlert(result.error, 'danger');
      }
    });

    document.getElementById('emiModal').addEventListener('show.bs.modal', (e) => {
      if (e.relatedTarget && !document.getElementById('emiId').value) {
        document.getElementById('emiForm').reset();
        document.getElementById('emiId').value = '';
        document.getElementById('emiBounceCharges').value = 0;
        document.getElementById('emiPenaltyCharges').value = 0;
        document.getElementById('emiStatus').value = 'Pending';
      }
    });
  }

  function statusClass(status) {
    const map = { Paid: 'status-paid', Pending: 'status-pending', Overdue: 'status-overdue', Bounced: 'status-bounced' };
    return map[status] || '';
  }

  function render() {
    App.destroyDataTable('emiTable');
    const tbody = document.querySelector('#emiTable tbody');
    tbody.innerHTML = AppData.emi.map(r => `
      <tr>
        <td>${r.ID}</td>
        <td>${r.Machine}</td>
        <td>${formatDate(r.DueDate)}</td>
        <td>${formatCurrency(r.EMIAmount)}</td>
        <td>${r.PaidDate ? formatDate(r.PaidDate) : '—'}</td>
        <td>${formatCurrency(r.BounceCharges)}</td>
        <td>${formatCurrency(r.PenaltyCharges)}</td>
        <td>${formatCurrency(r.TotalPaid)}</td>
        <td class="${statusClass(r.Status)}"><strong>${r.Status}</strong></td>
        <td>
          <button class="btn btn-sm btn-outline-accent action-btn" onclick="EmiModule.edit(${r.ID})"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger action-btn" onclick="EmiModule.remove(${r.ID})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');
    App.initDataTable('emiTable');
  }

  function edit(id) {
    const r = AppData.emi.find(x => x.ID == id);
    if (!r) return;
    document.getElementById('emiId').value = r.ID;
    document.getElementById('emiMachine').value = r.Machine;
    document.getElementById('emiDueDate').value = r.DueDate;
    document.getElementById('emiAmount').value = r.EMIAmount;
    document.getElementById('emiPaidDate').value = r.PaidDate || '';
    document.getElementById('emiBounceCharges').value = r.BounceCharges || 0;
    document.getElementById('emiPenaltyCharges').value = r.PenaltyCharges || 0;
    document.getElementById('emiTotalPaid').value = r.TotalPaid || 0;
    document.getElementById('emiStatus').value = r.Status;
    new bootstrap.Modal(document.getElementById('emiModal')).show();
  }

  async function remove(id) {
    if (!confirm('Delete this EMI record?')) return;
    const result = await ApiClient.delete('emi', id);
    if (result.success) {
      App.showAlert('EMI deleted');
      await App.loadData();
    }
  }

  return { init, render, edit, remove };
})();
