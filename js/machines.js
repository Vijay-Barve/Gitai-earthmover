/**
 * Gitai Earthmovers — Machines Module
 */
const MachinesModule = (function () {
  function getOutstandingForMachine(machineName) {
    const loan = AppData.loans.find(l => l.Machine === machineName);
    return loan ? parseNum(loan.OutstandingLoan) : 0;
  }

  function init() {
    document.getElementById('machineForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('machineId').value;
      const data = {
        MachineName: document.getElementById('machineName').value.trim(),
        PurchaseDate: document.getElementById('machinePurchaseDate').value,
        PurchaseCost: parseNum(document.getElementById('machinePurchaseCost').value),
        LoanAmount: parseNum(document.getElementById('machineLoanAmount').value),
        DownPayment: parseNum(document.getElementById('machineDownPayment').value),
        CurrentValue: parseNum(document.getElementById('machineCurrentValue').value),
        Status: document.getElementById('machineStatus').value
      };

      const result = id
        ? await ApiClient.put('machines', { ...data, ID: parseInt(id) }, id)
        : await ApiClient.post('machines', data);

      if (result.success) {
        bootstrap.Modal.getInstance(document.getElementById('machineModal')).hide();
        App.showAlert(id ? 'Machine updated' : 'Machine added');
        await App.loadData();
      } else {
        App.showAlert(result.error, 'danger');
      }
    });

    document.getElementById('machineModal').addEventListener('show.bs.modal', (e) => {
      if (e.relatedTarget && !document.getElementById('machineId').value) {
        document.getElementById('machineForm').reset();
        document.getElementById('machineId').value = '';
        document.getElementById('machineStatus').value = 'Active';
      }
    });
  }

  function render() {
    App.destroyDataTable('machinesTable');
    const tbody = document.querySelector('#machinesTable tbody');
    tbody.innerHTML = AppData.machines.map(r => {
      const outstanding = getOutstandingForMachine(r.MachineName);
      return `
        <tr>
          <td>${r.ID}</td>
          <td><strong>${r.MachineName}</strong></td>
          <td>${formatDate(r.PurchaseDate)}</td>
          <td>${formatCurrency(r.PurchaseCost)}</td>
          <td>${formatCurrency(r.LoanAmount)}</td>
          <td>${formatCurrency(r.DownPayment)}</td>
          <td>${formatCurrency(r.CurrentValue)}</td>
          <td>${formatCurrency(outstanding)}</td>
          <td><span class="badge ${r.Status === 'Active' ? 'bg-success' : r.Status === 'Sold' ? 'bg-secondary' : 'bg-warning text-dark'}">${r.Status}</span></td>
          <td>
            <button class="btn btn-sm btn-outline-accent action-btn" onclick="MachinesModule.edit(${r.ID})"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-danger action-btn" onclick="MachinesModule.remove(${r.ID})"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `;
    }).join('');
    App.initDataTable('machinesTable');
  }

  function edit(id) {
    const r = AppData.machines.find(x => x.ID == id);
    if (!r) return;
    document.getElementById('machineId').value = r.ID;
    document.getElementById('machineName').value = r.MachineName;
    document.getElementById('machinePurchaseDate').value = r.PurchaseDate;
    document.getElementById('machinePurchaseCost').value = r.PurchaseCost;
    document.getElementById('machineLoanAmount').value = r.LoanAmount;
    document.getElementById('machineDownPayment').value = r.DownPayment;
    document.getElementById('machineCurrentValue').value = r.CurrentValue;
    document.getElementById('machineStatus').value = r.Status;
    new bootstrap.Modal(document.getElementById('machineModal')).show();
  }

  async function remove(id) {
    if (!confirm('Delete this machine? Related records will remain but machine reference may be orphaned.')) return;
    const result = await ApiClient.delete('machines', id);
    if (result.success) {
      App.showAlert('Machine deleted');
      await App.loadData();
    }
  }

  return { init, render, edit, remove };
})();
