/**
 * Gitai Earthmovers — Customer Receivable Management
 */
const ReceivablesModule = (function () {
  function buildCustomerLedger() {
    const customers = {};

    AppData.income.forEach(i => {
      const name = i.Customer;
      if (!customers[name]) {
        customers[name] = { customer: name, invoiced: 0, received: 0, pending: 0, invoices: [] };
      }
      customers[name].invoiced += parseNum(i.BillAmount);
      customers[name].received += parseNum(i.ReceivedAmount);
      customers[name].pending += parseNum(i.PendingAmount);
      if (parseNum(i.PendingAmount) > 0) {
        customers[name].invoices.push({
          id: i.ID,
          date: i.Date,
          amount: parseNum(i.PendingAmount),
          age: daysSince(i.Date)
        });
      }
    });

    return Object.values(customers).sort((a, b) => b.pending - a.pending);
  }

  function daysSince(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    return Math.floor((now - d) / (1000 * 60 * 60 * 24));
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

  function buildAgeingReport() {
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    AppData.income.filter(i => parseNum(i.PendingAmount) > 0).forEach(i => {
      const bucket = ageingBucket(daysSince(i.Date));
      buckets[bucket] += parseNum(i.PendingAmount);
    });
    return buckets;
  }

  function render() {
    const ledger = buildCustomerLedger();
    const ageing = buildAgeingReport();
    const topOutstanding = ledger.filter(c => c.pending > 0).slice(0, 5);

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
            <strong>${c.customer}</strong>: ${formatCurrency(c.pending)} outstanding (${maxAge} days)
          </div>`;
        }).join('')
      : '<p class="text-muted">No outstanding receivables</p>';

    App.destroyDataTable('receivablesTable');
    document.querySelector('#receivablesTable tbody').innerHTML = ledger.map(c => {
      const maxAge = c.invoices.length ? Math.max(...c.invoices.map(i => i.age)) : 0;
      const bucket = ageingBucket(maxAge);
      return `<tr>
        <td><strong>${c.customer}</strong></td>
        <td>${formatCurrency(c.invoiced)}</td>
        <td>${formatCurrency(c.received)}</td>
        <td class="${c.pending > 0 ? ageingColor(bucket) : ''}"><strong>${formatCurrency(c.pending)}</strong></td>
        <td>${c.invoices.length}</td>
        <td>${c.pending > 0 ? maxAge + ' days (' + bucket + ')' : '—'}</td>
      </tr>`;
    }).join('');
    App.initDataTable('receivablesTable');
  }

  function getTotalReceivables() {
    return AppData.income.reduce((s, i) => s + parseNum(i.PendingAmount), 0);
  }

  function getOver90Customers() {
    return buildCustomerLedger().filter(c =>
      c.invoices.some(inv => inv.age > 90)
    );
  }

  return { render, buildCustomerLedger, buildAgeingReport, getTotalReceivables, getOver90Customers, ageingBucket, ageingColor };
})();
