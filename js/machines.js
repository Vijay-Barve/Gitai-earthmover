/**
 * Gitai Earthmovers — Machines Module
 */
const MachinesModule = (function () {
  function getOutstandingForMachine(machineName) {
    const loan = AppData.loans.find(l => l.Machine === machineName);
    return loan ? parseNum(loan.OutstandingLoan) : 0;
  }

  function getLoanForMachine(machineName) {
    return AppData.loans.find(l => l.Machine === machineName);
  }

  function machineFields() {
    return [
      'machineName', 'machinePurchaseDate', 'machinePurchaseCost', 'machineLoanAmount',
      'machineDownPayment', 'machineCurrentValue', 'machineStatus', 'machineMake',
      'machineModel', 'machineRegistrationNo', 'machineEngineNo', 'machineChassisNo', 'machineRemarks'
    ];
  }

  function readForm() {
    return {
      MachineName: document.getElementById('machineName').value.trim(),
      PurchaseDate: document.getElementById('machinePurchaseDate').value,
      PurchaseCost: parseNum(document.getElementById('machinePurchaseCost').value),
      LoanAmount: parseNum(document.getElementById('machineLoanAmount').value),
      DownPayment: parseNum(document.getElementById('machineDownPayment').value),
      CurrentValue: parseNum(document.getElementById('machineCurrentValue').value),
      Status: document.getElementById('machineStatus').value,
      Make: document.getElementById('machineMake').value.trim(),
      Model: document.getElementById('machineModel').value.trim(),
      RegistrationNo: document.getElementById('machineRegistrationNo').value.trim(),
      EngineNo: document.getElementById('machineEngineNo').value.trim(),
      ChassisNo: document.getElementById('machineChassisNo').value.trim(),
      Remarks: document.getElementById('machineRemarks').value.trim()
    };
  }

  function fillForm(r) {
    document.getElementById('machineId').value = r.ID || '';
    document.getElementById('machineName').value = r.MachineName || '';
    document.getElementById('machinePurchaseDate').value = r.PurchaseDate || '';
    document.getElementById('machinePurchaseCost').value = r.PurchaseCost || '';
    document.getElementById('machineLoanAmount').value = r.LoanAmount || '';
    document.getElementById('machineDownPayment').value = r.DownPayment || '';
    document.getElementById('machineCurrentValue').value = r.CurrentValue || '';
    document.getElementById('machineStatus').value = r.Status || 'Active';
    document.getElementById('machineMake').value = r.Make || '';
    document.getElementById('machineModel').value = r.Model || '';
    document.getElementById('machineRegistrationNo').value = r.RegistrationNo || '';
    document.getElementById('machineEngineNo').value = r.EngineNo || '';
    document.getElementById('machineChassisNo').value = r.ChassisNo || '';
    document.getElementById('machineRemarks').value = r.Remarks || '';
  }

  function renderDetailCards() {
    const el = document.getElementById('machineDetailCards');
    if (!el) return;

    if (!AppData.machines.length) {
      el.innerHTML = '';
      return;
    }

    el.innerHTML = AppData.machines.map(m => {
      const loan = getLoanForMachine(m.MachineName);
      const emiPaid = AppData.emi.filter(e => e.Machine === m.MachineName && e.Status === 'Paid').length;
      const emiPending = AppData.emi.filter(e => e.Machine === m.MachineName && e.Status !== 'Paid').length;
      const income = AppData.income.filter(i => i.Machine === m.MachineName).reduce((s, i) => s + parseNum(i.BillAmount), 0);
      const expenses = AppData.expenses.filter(e => e.Machine === m.MachineName).reduce((s, e) => s + parseNum(e.Amount), 0);

      return `
        <div class="col-xl-6">
          <div class="card machine-detail-card h-100">
            <div class="card-header d-flex justify-content-between align-items-start gap-2">
              <div>
                <h5 class="mb-1">${m.MachineName}</h5>
                <div class="text-muted small">${[m.Make, m.Model].filter(Boolean).join(' ') || 'Equipment'}</div>
              </div>
              <span class="badge ${m.Status === 'Active' ? 'bg-success' : 'bg-secondary'}">${m.Status}</span>
            </div>
            <div class="card-body">
              <div class="detail-grid mb-3">
                <div><span class="detail-label">Registration</span><strong>${m.RegistrationNo || '—'}</strong></div>
                <div><span class="detail-label">Purchase Date</span><strong>${formatDate(m.PurchaseDate)}</strong></div>
                <div><span class="detail-label">Engine No.</span><strong>${m.EngineNo || '—'}</strong></div>
                <div><span class="detail-label">Chassis No.</span><strong>${m.ChassisNo || '—'}</strong></div>
                <div><span class="detail-label">Purchase Cost</span><strong>${formatCurrency(m.PurchaseCost)}</strong></div>
                <div><span class="detail-label">Current Value</span><strong>${formatCurrency(m.CurrentValue)}</strong></div>
              </div>
              ${loan ? `
                <div class="loan-summary-box">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <strong><i class="bi bi-bank"></i> ${loan.Lender || 'Loan'}</strong>
                    <span class="badge bg-${loan.LoanStatus === 'Active' ? 'primary' : 'secondary'}">${loan.LoanStatus || 'Active'}</span>
                  </div>
                  <div class="detail-grid">
                    <div><span class="detail-label">Agreement</span><strong class="small">${loan.AgreementNo || '—'}</strong></div>
                    <div><span class="detail-label">EMI</span><strong>${formatCurrency(loan.EMIAmount)}/mo</strong></div>
                    <div><span class="detail-label">Outstanding</span><strong class="text-danger">${formatCurrency(loan.OutstandingLoan)}</strong></div>
                    <div><span class="detail-label">Tenure</span><strong>${loan.BalanceTenure || '—'} mo left / ${loan.TenureMonths || '—'} total</strong></div>
                    <div><span class="detail-label">IRR</span><strong>${loan.IRR ? loan.IRR + '% ' + (loan.InterestType || '') : '—'}</strong></div>
                    <div><span class="detail-label">Overdue</span><strong class="${parseNum(loan.OverdueAmount) > 0 ? 'text-warning' : ''}">${formatCurrency(loan.OverdueAmount || 0)}</strong></div>
                  </div>
                  <div class="small text-muted mt-2">${loan.Applicant || ''}${loan.CoApplicant ? ' & ' + loan.CoApplicant : ''}</div>
                </div>
              ` : '<p class="text-muted small mb-0">No loan linked — add under Loans.</p>'}
              <div class="row g-2 mt-3 pt-3 border-top machine-stats-row">
                <div class="col-4 text-center"><div class="small text-muted">Income</div><strong class="text-success">${formatCurrency(income)}</strong></div>
                <div class="col-4 text-center"><div class="small text-muted">Expenses</div><strong class="text-danger">${formatCurrency(expenses)}</strong></div>
                <div class="col-4 text-center"><div class="small text-muted">EMI</div><strong>${emiPaid} paid / ${emiPending} left</strong></div>
              </div>
            </div>
            <div class="card-footer d-flex gap-2">
              <button class="btn btn-sm btn-outline-accent" onclick="MachinesModule.edit(${m.ID})"><i class="bi bi-pencil"></i> Edit</button>
              <button class="btn btn-sm btn-outline-secondary" onclick="MachinesModule.viewLoan('${m.MachineName.replace(/'/g, "\\'")}')"><i class="bi bi-bank"></i> Loan</button>
              <button class="btn btn-sm btn-outline-secondary" onclick="App.navigateTo('emi')"><i class="bi bi-calendar-check"></i> EMIs</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function init() {
    document.getElementById('machineForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('machineId').value;
      const data = readForm();

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
    renderDetailCards();
    App.destroyDataTable('machinesTable');
    const tbody = document.querySelector('#machinesTable tbody');
    tbody.innerHTML = AppData.machines.map(r => {
      const loan = getLoanForMachine(r.MachineName);
      const outstanding = getOutstandingForMachine(r.MachineName);
      const subtitle = [r.Make, r.Model, r.RegistrationNo].filter(Boolean).join(' · ');
      return `
        <tr>
          <td>${r.ID}</td>
          <td>
            <strong>${r.MachineName}</strong>
            ${subtitle ? `<div class="small text-muted">${subtitle}</div>` : ''}
          </td>
          <td>${formatDate(r.PurchaseDate)}</td>
          <td>${formatCurrency(r.PurchaseCost)}</td>
          <td>${formatCurrency(r.LoanAmount)}</td>
          <td>${formatCurrency(r.DownPayment)}</td>
          <td>${formatCurrency(r.CurrentValue)}</td>
          <td>${formatCurrency(outstanding)}${loan?.EMIAmount ? `<div class="small text-muted">EMI ${formatCurrency(loan.EMIAmount)}</div>` : ''}</td>
          <td><span class="badge ${r.Status === 'Active' ? 'bg-success' : r.Status === 'Sold' ? 'bg-secondary' : 'bg-warning text-dark'}">${r.Status}</span></td>
          <td>
            <button class="btn btn-sm btn-outline-accent action-btn" onclick="MachinesModule.edit(${r.ID})" title="Edit"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-danger action-btn" onclick="MachinesModule.remove(${r.ID})" title="Delete"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `;
    }).join('');
    App.initDataTable('machinesTable');
  }

  function edit(id) {
    const r = AppData.machines.find(x => x.ID == id);
    if (!r) return;
    fillForm(r);
    new bootstrap.Modal(document.getElementById('machineModal')).show();
  }

  function viewLoan(machineName) {
    const loan = getLoanForMachine(machineName);
    if (loan && typeof LoansModule !== 'undefined') {
      LoansModule.edit(loan.ID);
    } else {
      App.navigateTo('loans');
    }
  }

  async function remove(id) {
    if (!confirm('Delete this machine? Related records will remain but machine reference may be orphaned.')) return;
    const result = await ApiClient.delete('machines', id);
    if (result.success) {
      App.showAlert('Machine deleted');
      await App.loadData();
    }
  }

  return { init, render, edit, remove, viewLoan };
})();
