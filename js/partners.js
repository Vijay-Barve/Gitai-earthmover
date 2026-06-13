/**
 * Gitai Earthmovers — Partners Module
 */
const PartnersModule = (function () {
  function init() {
    document.getElementById('partnerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('partnerId').value;
      const data = {
        Date: document.getElementById('partnerDate').value,
        PartnerName: document.getElementById('partnerName').value.trim(),
        TransactionType: document.getElementById('partnerType').value,
        Amount: parseNum(document.getElementById('partnerAmount').value),
        Remarks: document.getElementById('partnerRemarks').value
      };

      const result = id
        ? await ApiClient.put('partners', { ...data, ID: parseInt(id) }, id)
        : await ApiClient.post('partners', data);

      if (result.success) {
        bootstrap.Modal.getInstance(document.getElementById('partnerModal')).hide();
        App.showAlert(id ? 'Partner record updated' : 'Partner transaction added');
        await App.loadData();
      } else {
        App.showAlert(result.error, 'danger');
      }
    });

    document.getElementById('partnerModal').addEventListener('show.bs.modal', (e) => {
      if (e.relatedTarget && !document.getElementById('partnerId').value) {
        document.getElementById('partnerForm').reset();
        document.getElementById('partnerId').value = '';
        document.getElementById('partnerDate').value = todayISO();
      }
    });
  }

  function renderSummaryCards() {
    const balances = App.getPartnerBalances();
    document.getElementById('partnerSummaryCards').innerHTML = balances.map(p => `
      <div class="col-md-4 col-lg-3">
        <div class="card partner-balance-card h-100">
          <div class="card-body">
            <div class="name">${p.name}</div>
            <div class="balance">${formatCurrency(p.balance)}</div>
            <div class="details mt-2">
              Inv: ${formatCurrency(p.investments)} | Wdl: ${formatCurrency(p.withdrawals)}<br>
              EMI paid: ${formatCurrency(p.emiPaidByPartner || 0)} | Profit (${p.sharePercent}%): ${formatCurrency(p.profitShare)}
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  function renderTable() {
    App.destroyDataTable('partnersTable');
    const tbody = document.querySelector('#partnersTable tbody');
    tbody.innerHTML = AppData.partners.map(r => `
      <tr>
        <td>${r.ID}</td>
        <td>${formatDate(r.Date)}</td>
        <td>${r.PartnerName}</td>
        <td><span class="badge ${r.TransactionType === 'Investment' ? 'bg-success' : 'bg-warning text-dark'}">${r.TransactionType}</span></td>
        <td>${formatCurrency(r.Amount)}</td>
        <td>${r.Remarks || '—'}</td>
        <td>
          <button class="btn btn-sm btn-outline-accent action-btn" onclick="PartnersModule.edit(${r.ID})"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger action-btn" onclick="PartnersModule.remove(${r.ID})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');
    App.initDataTable('partnersTable');
  }

  function render() {
    renderSummaryCards();
    renderTable();
  }

  function edit(id) {
    const r = AppData.partners.find(x => x.ID == id);
    if (!r) return;
    document.getElementById('partnerId').value = r.ID;
    document.getElementById('partnerDate').value = r.Date;
    document.getElementById('partnerName').value = r.PartnerName;
    document.getElementById('partnerType').value = r.TransactionType;
    document.getElementById('partnerAmount').value = r.Amount;
    document.getElementById('partnerRemarks').value = r.Remarks || '';
    new bootstrap.Modal(document.getElementById('partnerModal')).show();
  }

  async function remove(id) {
    if (!confirm('Delete this partner transaction?')) return;
    const result = await ApiClient.delete('partners', id);
    if (result.success) {
      App.showAlert('Record deleted');
      await App.loadData();
    }
  }

  return { init, render, edit, remove };
})();
