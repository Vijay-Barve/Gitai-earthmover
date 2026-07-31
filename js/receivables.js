/**
 * Gitai Earthmovers — Customer Receivable Management
 * Totals come from Income: Pending = max(0, Bill − Received).
 * Same customer under different casing is merged; Marathi vs English names stay separate.
 */
const ReceivablesModule = (function () {
  function billOf(i) {
    return parseNum(i.BillAmount);
  }

  function receivedOf(i) {
    return parseNum(i.ReceivedAmount);
  }

  /** Always derive pending from bill/received — do not trust stale PendingAmount */
  function pendingOf(i) {
    return Math.max(0, billOf(i) - receivedOf(i));
  }

  function customerKey(name) {
    return String(name || '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase() || '(no customer name)';
  }

  function displayName(name) {
    const n = String(name || '').trim().replace(/\s+/g, ' ');
    return n || '(No customer name)';
  }

  function daysSince(dateStr) {
    if (!dateStr) return 0;
    const iso = String(dateStr).slice(0, 10);
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const d = m
      ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0)
      : new Date(dateStr);
    if (isNaN(d.getTime())) return 0;
    const now = new Date();
    return Math.max(0, Math.floor((now - d) / (1000 * 60 * 60 * 24)));
  }

  function ageingBucket(days) {
    if (days <= 30) return '0-30';
    if (days <= 60) return '31-60';
    if (days <= 90) return '61-90';
    return '90+';
  }

  function ageingColor(bucket) {
    if (bucket === '0-30') return 'text-success';
    if (bucket === '31-60') return 'text-warning';
    return 'text-danger';
  }

  function buildCustomerLedger() {
    const customers = {};

    AppData.income.forEach(i => {
      const key = customerKey(i.Customer);
      const label = displayName(i.Customer);
      if (!customers[key]) {
        customers[key] = {
          key,
          customer: label,
          invoiced: 0,
          received: 0,
          pending: 0,
          invoices: [],
          nameCounts: {}
        };
      }
      const row = customers[key];
      row.nameCounts[label] = (row.nameCounts[label] || 0) + 1;
      const bill = billOf(i);
      const received = receivedOf(i);
      const pending = pendingOf(i);
      row.invoiced += bill;
      row.received += received;
      row.pending += pending;
      if (pending > 0) {
        row.invoices.push({
          id: i.ID,
          date: i.Date,
          machine: i.Machine || '',
          bill,
          received,
          amount: pending,
          age: daysSince(i.Date),
          remarks: i.Remarks || ''
        });
      }
    });

    return Object.values(customers).map(c => {
      const bestName = Object.entries(c.nameCounts).sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0];
      if (bestName) c.customer = bestName[0];
      delete c.nameCounts;
      c.invoices.sort((a, b) => String(a.date).localeCompare(String(b.date)));
      return c;
    }).sort((a, b) => b.pending - a.pending || a.customer.localeCompare(b.customer, 'en'));
  }

  function buildAgeingReport() {
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    AppData.income.forEach(i => {
      const pending = pendingOf(i);
      if (pending <= 0) return;
      buckets[ageingBucket(daysSince(i.Date))] += pending;
    });
    return buckets;
  }

  function getFilterMode() {
    return document.getElementById('receivablesFilter')?.value || 'outstanding';
  }

  function render() {
    const ledger = buildCustomerLedger();
    const ageing = buildAgeingReport();
    const mode = getFilterMode();
    const visible = mode === 'all' ? ledger : ledger.filter(c => c.pending > 0);
    const topOutstanding = ledger.filter(c => c.pending > 0).slice(0, 5);
    const totalPending = ledger.reduce((s, c) => s + c.pending, 0);
    const totalInvoiced = ledger.reduce((s, c) => s + c.invoiced, 0);
    const totalReceived = ledger.reduce((s, c) => s + c.received, 0);
    const openInvoices = ledger.reduce((s, c) => s + c.invoices.length, 0);

    const summary = document.getElementById('receivablesSummary');
    if (summary) {
      summary.innerHTML = `
        <div class="col-md-3"><div class="card stat-card"><div class="card-body text-center">
          <div class="stat-label">Total Invoiced</div>
          <div class="stat-value">${formatCurrency(totalInvoiced)}</div>
        </div></div></div>
        <div class="col-md-3"><div class="card stat-card"><div class="card-body text-center">
          <div class="stat-label">Total Received</div>
          <div class="stat-value text-success">${formatCurrency(totalReceived)}</div>
        </div></div></div>
        <div class="col-md-3"><div class="card stat-card"><div class="card-body text-center">
          <div class="stat-label">Total Receivable</div>
          <div class="stat-value text-danger">${formatCurrency(totalPending)}</div>
        </div></div></div>
        <div class="col-md-3"><div class="card stat-card"><div class="card-body text-center">
          <div class="stat-label">Open invoices</div>
          <div class="stat-value">${openInvoices}</div>
        </div></div></div>`;
    }

    const note = document.getElementById('receivablesNote');
    if (note) {
      note.textContent = 'Pending = Bill − Received from Income entries. Same name with different spelling (English vs Marathi) is listed separately. Use machine scope (All / M1 / M2) to filter.';
    }

    document.getElementById('ageingCards').innerHTML = Object.entries(ageing).map(([bucket, amt]) => `
      <div class="col-md-3">
        <div class="card stat-card">
          <div class="card-body text-center">
            <div class="stat-label">${bucket} Days</div>
            <div class="stat-value ${ageingColor(bucket)}">${formatCurrency(amt)}</div>
          </div>
        </div>
      </div>
    `).join('');

    document.getElementById('topOutstanding').innerHTML = topOutstanding.length
      ? topOutstanding.map(c => {
          const maxAge = Math.max(...c.invoices.map(inv => inv.age), 0);
          const bucket = ageingBucket(maxAge);
          return `<div class="alert ${bucket === '0-30' ? 'alert-success' : bucket === '31-60' ? 'alert-warning' : 'alert-danger'} py-2 mb-2">
            <strong>${c.customer}</strong>: ${formatCurrency(c.pending)} outstanding (${maxAge} days · ${c.invoices.length} open)
          </div>`;
        }).join('')
      : '<p class="text-muted">No outstanding receivables</p>';

    App.destroyDataTable('receivablesTable');
    document.querySelector('#receivablesTable tbody').innerHTML = visible.map(c => {
      const maxAge = c.invoices.length ? Math.max(...c.invoices.map(i => i.age)) : 0;
      const bucket = ageingBucket(maxAge);
      const detail = c.invoices.length
        ? `<details class="mt-1"><summary class="small text-muted">${c.invoices.length} open invoice(s)</summary>
            <ul class="small mb-0 ps-3">${c.invoices.map(inv =>
              `<li>${formatDate(inv.date)} · ${formatCurrency(inv.amount)} pending`
              + (inv.machine ? ` · ${String(inv.machine).includes('M2') ? 'M2' : 'M1'}` : '')
              + `</li>`
            ).join('')}</ul></details>`
        : '';
      return `<tr>
        <td><strong>${c.customer}</strong>${detail}</td>
        <td>${formatCurrency(c.invoiced)}</td>
        <td>${formatCurrency(c.received)}</td>
        <td class="${c.pending > 0 ? ageingColor(bucket) : ''}"><strong>${formatCurrency(c.pending)}</strong></td>
        <td>${c.invoices.length}</td>
        <td>${c.pending > 0 ? maxAge + ' days (' + bucket + ')' : '—'}</td>
      </tr>`;
    }).join('');
    App.initDataTable('receivablesTable', { order: [[3, 'desc']] });
  }

  function getTotalReceivables() {
    return AppData.income.reduce((s, i) => s + pendingOf(i), 0);
  }

  function getOver90Customers() {
    return buildCustomerLedger().filter(c =>
      c.invoices.some(inv => inv.age > 90)
    );
  }

  function init() {
    document.getElementById('receivablesFilter')?.addEventListener('change', render);
  }

  return {
    init,
    render,
    buildCustomerLedger,
    buildAgeingReport,
    getTotalReceivables,
    getOver90Customers,
    ageingBucket,
    ageingColor
  };
})();
