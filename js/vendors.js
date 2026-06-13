/**
 * Gitai Earthmovers — Vendor Management
 */
const VendorsModule = (function () {
  const VENDOR_TYPES = ['Diesel Supplier', 'Mechanic', 'Repair Vendor', 'Transport Vendor', 'Other'];

  function init() {
    document.getElementById('vendorForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!AuthModule.can('vendors', 'create')) return;

      const id = document.getElementById('vendorId').value;
      const data = {
        VendorName: document.getElementById('vendorName').value.trim(),
        VendorType: document.getElementById('vendorType').value,
        Contact: document.getElementById('vendorContact').value,
        TotalPayable: parseNum(document.getElementById('vendorPayable').value),
        Paid: parseNum(document.getElementById('vendorPaid').value),
        Outstanding: parseNum(document.getElementById('vendorPayable').value) - parseNum(document.getElementById('vendorPaid').value),
        Remarks: document.getElementById('vendorRemarks').value
      };

      const result = id ? await ApiClient.put('vendors', { ...data, ID: parseInt(id) }, id) : await ApiClient.post('vendors', data);
      if (result.success) {
        bootstrap.Modal.getInstance(document.getElementById('vendorModal')).hide();
        App.showAlert(id ? 'Vendor updated' : 'Vendor added');
        await App.loadData();
      }
    });

    document.getElementById('vendorPayable')?.addEventListener('input', updateOutstanding);
    document.getElementById('vendorPaid')?.addEventListener('input', updateOutstanding);

    document.getElementById('vendorModal')?.addEventListener('show.bs.modal', () => {
      document.getElementById('vendorForm')?.reset();
      document.getElementById('vendorId').value = '';
      const typeEl = document.getElementById('vendorType');
      if (typeEl) typeEl.innerHTML = VENDOR_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
    });

    document.getElementById('vendorTxnForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        Date: document.getElementById('vendorTxnDate').value || todayISO(),
        VendorID: document.getElementById('vendorTxnVendor').value,
        VendorName: document.getElementById('vendorTxnVendor').selectedOptions[0]?.text || '',
        Amount: parseNum(document.getElementById('vendorTxnAmount').value),
        Type: document.getElementById('vendorTxnType').value,
        ReferenceID: document.getElementById('vendorTxnRef')?.value || '',
        Remarks: ''
      };
      await ApiClient.post('vendortxns', data);
      App.showAlert('Transaction recorded');
      e.target.reset();
      await App.loadData();
    });
  }

  function updateOutstanding() {
    const payable = parseNum(document.getElementById('vendorPayable').value);
    const paid = parseNum(document.getElementById('vendorPaid').value);
    const el = document.getElementById('vendorOutstanding');
    if (el) el.value = payable - paid;
  }

  function getTotalVendorOutstanding() {
    return (AppData.vendors || []).reduce((s, v) => s + parseNum(v.Outstanding), 0);
  }

  function render() {
    const vendors = AppData.vendors || [];
    const txns = AppData.vendortxns || [];

    document.getElementById('vendorSummaryCards').innerHTML = `
      <div class="col-md-4"><div class="card stat-card"><div class="card-body"><div class="stat-label">Total Payable</div><div class="stat-value">${formatCurrency(vendors.reduce((s, v) => s + parseNum(v.TotalPayable), 0))}</div></div></div></div>
      <div class="col-md-4"><div class="card stat-card"><div class="card-body"><div class="stat-label">Total Paid</div><div class="stat-value">${formatCurrency(vendors.reduce((s, v) => s + parseNum(v.Paid), 0))}</div></div></div></div>
      <div class="col-md-4"><div class="card stat-card"><div class="card-body"><div class="stat-label">Outstanding</div><div class="stat-value text-danger">${formatCurrency(getTotalVendorOutstanding())}</div></div></div></div>
    `;

    App.destroyDataTable('vendorsTable');
    document.querySelector('#vendorsTable tbody').innerHTML = vendors.map(v => `
      <tr>
        <td>${v.ID}</td><td><strong>${v.VendorName}</strong></td><td>${v.VendorType}</td>
        <td>${v.Contact || '—'}</td><td>${formatCurrency(v.TotalPayable)}</td>
        <td>${formatCurrency(v.Paid)}</td><td class="text-danger">${formatCurrency(v.Outstanding)}</td>
        <td>
          <button class="btn btn-sm btn-outline-accent action-btn" onclick="VendorsModule.edit(${v.ID})"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger action-btn" onclick="VendorsModule.remove(${v.ID})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');
    App.initDataTable('vendorsTable');

    document.querySelector('#vendorTxnTable tbody').innerHTML = txns.map(t => `
      <tr>
        <td>${t.ID}</td><td>${formatDate(t.Date)}</td><td>${t.VendorName}</td>
        <td><span class="badge ${t.Type === 'Payment' ? 'bg-success' : 'bg-warning text-dark'}">${t.Type}</span></td>
        <td>${formatCurrency(t.Amount)}</td><td>${t.ReferenceID || '—'}</td><td>${t.Remarks || '—'}</td>
      </tr>
    `).join('');

    const sel = document.getElementById('vendorTxnVendor');
    if (sel) sel.innerHTML = vendors.map(v => `<option value="${v.ID}">${v.VendorName}</option>`).join('');
  }

  function edit(id) {
    const v = (AppData.vendors || []).find(x => x.ID == id);
    if (!v) return;
    document.getElementById('vendorId').value = v.ID;
    document.getElementById('vendorName').value = v.VendorName;
    document.getElementById('vendorType').value = v.VendorType;
    document.getElementById('vendorContact').value = v.Contact || '';
    document.getElementById('vendorPayable').value = v.TotalPayable;
    document.getElementById('vendorPaid').value = v.Paid;
    document.getElementById('vendorOutstanding').value = v.Outstanding;
    document.getElementById('vendorRemarks').value = v.Remarks || '';
    new bootstrap.Modal(document.getElementById('vendorModal')).show();
  }

  async function remove(id) {
    if (!confirm('Delete vendor?')) return;
    await ApiClient.delete('vendors', id);
    await App.loadData();
  }

  return { init, render, edit, remove, getTotalVendorOutstanding, VENDOR_TYPES };
})();
