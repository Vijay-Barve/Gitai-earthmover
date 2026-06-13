/**
 * Gitai Earthmovers — EMI Module
 */
const EmiModule = (function () {
  function populatePartnerSelect() {
    const el = document.getElementById('emiPaidByPartner');
    if (!el) return;
    const names = [...new Set((AppData.partners || []).map(p => p.PartnerName).filter(Boolean))].sort();
    el.innerHTML = '<option value="">— Select partner —</option>' +
      names.map(n => `<option value="${n}">${n}</option>`).join('');
  }

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
    syncSplitFields(total);
    return total;
  }

  function syncSplitFields(total) {
    const mode = document.getElementById('emiPaymentMode').value;
    const businessEl = document.getElementById('emiBusinessPaid');
    const partnerEl = document.getElementById('emiPartnerPaid');
    const partnerWrap = document.getElementById('emiPartnerFields');
    const partnerNameWrap = document.getElementById('emiPartnerNameField');
    const splitHint = document.getElementById('emiSplitHint');

    if (!businessEl || !partnerEl) return;

    const amounts = EmiPaymentHelper.amountsForMode(mode, total);
    if (mode === 'Business') {
      businessEl.value = amounts.business;
      partnerEl.value = 0;
      businessEl.readOnly = true;
      partnerEl.readOnly = true;
      partnerWrap?.classList.add('d-none');
      partnerNameWrap?.classList.add('d-none');
    } else if (mode === 'Partner') {
      businessEl.value = 0;
      partnerEl.value = amounts.partner;
      businessEl.readOnly = true;
      partnerEl.readOnly = true;
      partnerWrap?.classList.remove('d-none');
      partnerNameWrap?.classList.remove('d-none');
    } else {
      businessEl.readOnly = false;
      partnerEl.readOnly = false;
      partnerWrap?.classList.remove('d-none');
      partnerNameWrap?.classList.remove('d-none');
      if (parseNum(partnerEl.value) === 0 && parseNum(businessEl.value) === 0) {
        businessEl.value = total;
        partnerEl.value = 0;
      }
    }

    if (splitHint) {
      splitHint.textContent = mode === 'Split'
        ? 'Enter how much came from the machine account and how much the partner paid.'
        : '';
    }
  }

  function onPartnerAmountInput() {
    const total = parseNum(document.getElementById('emiTotalPaid').value);
    const partner = parseNum(document.getElementById('emiPartnerPaid').value);
    if (document.getElementById('emiPaymentMode').value === 'Split') {
      document.getElementById('emiBusinessPaid').value = Math.max(0, total - partner);
    }
  }

  function onBusinessAmountInput() {
    const total = parseNum(document.getElementById('emiTotalPaid').value);
    const business = parseNum(document.getElementById('emiBusinessPaid').value);
    if (document.getElementById('emiPaymentMode').value === 'Split') {
      document.getElementById('emiPartnerPaid').value = Math.max(0, total - business);
    }
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
      document.getElementById(id)?.addEventListener('input', autoDetectStatus);
      document.getElementById(id)?.addEventListener('change', autoDetectStatus);
    });

    document.getElementById('emiPaymentMode')?.addEventListener('change', () => calcTotalPaid());
    document.getElementById('emiPartnerPaid')?.addEventListener('input', onPartnerAmountInput);
    document.getElementById('emiBusinessPaid')?.addEventListener('input', onBusinessAmountInput);

    document.getElementById('emiForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const total = calcTotalPaid();
      const paymentMode = document.getElementById('emiPaymentMode').value;
      const businessPaid = parseNum(document.getElementById('emiBusinessPaid').value);
      const partnerPaid = parseNum(document.getElementById('emiPartnerPaid').value);
      const paidByPartner = document.getElementById('emiPaidByPartner').value.trim();

      const check = EmiPaymentHelper.validateSplit(businessPaid, partnerPaid, total, paidByPartner, paymentMode);
      if (!check.ok) {
        App.showAlert(check.message, 'warning');
        return;
      }

      const id = document.getElementById('emiId').value;
      const data = {
        Machine: document.getElementById('emiMachine').value,
        DueDate: document.getElementById('emiDueDate').value,
        EMIAmount: parseNum(document.getElementById('emiAmount').value),
        PaidDate: document.getElementById('emiPaidDate').value,
        BounceCharges: parseNum(document.getElementById('emiBounceCharges').value),
        PenaltyCharges: parseNum(document.getElementById('emiPenaltyCharges').value),
        TotalPaid: total,
        PaymentMode: paymentMode,
        BusinessPaid: businessPaid,
        PartnerPaid: partnerPaid,
        PaidByPartner: paidByPartner,
        Status: document.getElementById('emiStatus').value,
        Remarks: document.getElementById('emiRemarks').value.trim()
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
      populatePartnerSelect();
      if (e.relatedTarget && !document.getElementById('emiId').value) {
        document.getElementById('emiForm').reset();
        document.getElementById('emiId').value = '';
        document.getElementById('emiBounceCharges').value = 0;
        document.getElementById('emiPenaltyCharges').value = 0;
        document.getElementById('emiStatus').value = 'Pending';
        document.getElementById('emiPaymentMode').value = 'Business';
        document.getElementById('emiRemarks').value = '';
        calcTotalPaid();
      }
    });

    document.getElementById('emiMachine')?.addEventListener('change', () => {
      const machine = document.getElementById('emiMachine').value;
      const loan = AppData.loans.find(l => l.Machine === machine);
      if (loan?.EMIAmount && !document.getElementById('emiId').value) {
        document.getElementById('emiAmount').value = loan.EMIAmount;
        calcTotalPaid();
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
        <td class="small">${EmiPaymentHelper.paymentSummary(r)}</td>
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
    populatePartnerSelect();
    const norm = EmiPaymentHelper.normalize(r);
    document.getElementById('emiId').value = r.ID;
    document.getElementById('emiMachine').value = r.Machine;
    document.getElementById('emiDueDate').value = r.DueDate;
    document.getElementById('emiAmount').value = r.EMIAmount;
    document.getElementById('emiPaidDate').value = r.PaidDate || '';
    document.getElementById('emiBounceCharges').value = r.BounceCharges || 0;
    document.getElementById('emiPenaltyCharges').value = r.PenaltyCharges || 0;
    document.getElementById('emiTotalPaid').value = r.TotalPaid || 0;
    document.getElementById('emiPaymentMode').value = r.PaymentMode || norm.paymentMode;
    document.getElementById('emiBusinessPaid').value = norm.business;
    document.getElementById('emiPartnerPaid').value = norm.partner;
    document.getElementById('emiPaidByPartner').value = r.PaidByPartner || '';
    document.getElementById('emiStatus').value = r.Status;
    document.getElementById('emiRemarks').value = r.Remarks || '';
    syncSplitFields(norm.total);
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
