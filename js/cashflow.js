/**
 * Gitai Earthmovers — Cash Flow Dashboard & Loan Dashboard & Business Worth
 */
const CashFlowModule = (function () {
  function calcCashFlow() {
    const received = AppData.income.reduce((s, i) => s + parseNum(i.ReceivedAmount), 0);
    const spent = AppData.expenses.reduce((s, e) => s + parseNum(e.Amount), 0);
    const emiPaid = AppData.emi.reduce((s, e) => s + parseNum(e.TotalPaid), 0);
    const partnerInv = App.getTotalPartnerInvestment();
    const partnerWdl = App.getTotalPartnerWithdrawals();

    const opening = partnerInv - partnerWdl;
    const moneyIn = received + partnerInv;
    const moneyOut = spent + emiPaid + partnerWdl;
    const closing = opening + received - spent - emiPaid;

    const monthly = {};
    AppData.income.forEach(i => {
      const k = getMonthKey(i.Date);
      if (!monthly[k]) monthly[k] = { in: 0, out: 0 };
      monthly[k].in += parseNum(i.ReceivedAmount);
    });
    AppData.expenses.forEach(e => {
      const k = getMonthKey(e.Date);
      if (!monthly[k]) monthly[k] = { in: 0, out: 0 };
      monthly[k].out += parseNum(e.Amount);
    });

    const forecast = forecast30Days();

    return { opening, received, spent, emiPaid, moneyIn, moneyOut, closing, monthly, forecast };
  }

  function forecast30Days() {
    const avgDailyIn = AppData.income.length
      ? AppData.income.reduce((s, i) => s + parseNum(i.ReceivedAmount), 0) / Math.max(1, AppData.income.length) / 30
      : 0;
    const avgDailyOut = AppData.expenses.length
      ? AppData.expenses.reduce((s, e) => s + parseNum(e.Amount), 0) / Math.max(1, AppData.expenses.length) / 30
      : 0;
    const upcomingEmi = AppData.emi.filter(e => {
      const due = new Date(e.DueDate);
      const now = new Date();
      const diff = (due - now) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 30 && e.Status !== 'Paid';
    }).reduce((s, e) => s + parseNum(e.EMIAmount), 0);

    const pendingIn = AppData.income.reduce((s, i) => s + parseNum(i.PendingAmount), 0) * 0.5;

    return {
      projectedIn: avgDailyIn * 30 + pendingIn,
      projectedOut: avgDailyOut * 30 + upcomingEmi,
      net: (avgDailyIn * 30 + pendingIn) - (avgDailyOut * 30 + upcomingEmi),
      upcomingEmi
    };
  }

  function render() {
    const cf = calcCashFlow();

    document.getElementById('cashflowCards').innerHTML = `
      <div class="col-md-3"><div class="card stat-card"><div class="card-body"><div class="stat-label">Opening Balance</div><div class="stat-value">${formatCurrency(cf.opening)}</div></div></div></div>
      <div class="col-md-3"><div class="card stat-card"><div class="card-body"><div class="stat-label">Money Received</div><div class="stat-value text-success">${formatCurrency(cf.received)}</div></div></div></div>
      <div class="col-md-3"><div class="card stat-card"><div class="card-body"><div class="stat-label">Money Spent</div><div class="stat-value text-danger">${formatCurrency(cf.spent + cf.emiPaid)}</div></div></div></div>
      <div class="col-md-3"><div class="card stat-card"><div class="card-body"><div class="stat-label">Closing Balance</div><div class="stat-value text-accent">${formatCurrency(cf.closing)}</div></div></div></div>
    `;

    document.getElementById('forecast30').innerHTML = `
      <div class="card"><div class="card-body">
        <h6>30-Day Forecast</h6>
        <p>Projected In: <strong class="text-success">${formatCurrency(cf.forecast.projectedIn)}</strong></p>
        <p>Projected Out: <strong class="text-danger">${formatCurrency(cf.forecast.projectedOut)}</strong> (incl. EMIs: ${formatCurrency(cf.forecast.upcomingEmi)})</p>
        <p>Net Forecast: <strong class="${cf.forecast.net >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(cf.forecast.net)}</strong></p>
      </div></div>
    `;

    const labels = Object.keys(cf.monthly).sort();
    if (window.cashflowChart) window.cashflowChart.destroy();
    window.cashflowChart = new Chart(document.getElementById('chartCashflow'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Inflow', data: labels.map(l => cf.monthly[l].in), backgroundColor: '#22c55e' },
          { label: 'Outflow', data: labels.map(l => cf.monthly[l].out), backgroundColor: '#ef4444' }
        ]
      },
      options: { responsive: true }
    });
  }

  return { render, calcCashFlow, forecast30Days };
})();

const LoanDashboardModule = (function () {
  function getUpcomingEmis(days = 7) {
    const now = new Date();
    return AppData.emi.filter(e => {
      if (e.Status === 'Paid') return false;
      const due = new Date(e.DueDate);
      const diff = (due - now) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= days;
    }).sort((a, b) => new Date(a.DueDate) - new Date(b.DueDate));
  }

  function render() {
    const totalLoan = AppData.loans.reduce((s, l) => s + parseNum(l.LoanAmount), 0);
    const outstanding = App.getOutstandingLoans();
    const principalPaid = AppData.loans.reduce((s, l) => s + parseNum(l.PrincipalPaid), 0);
    const interestPaid = AppData.loans.reduce((s, l) => s + parseNum(l.InterestPaid), 0);
    const upcoming = getUpcomingEmis(30);
    const due7 = getUpcomingEmis(7);

    document.getElementById('loanDashCards').innerHTML = `
      <div class="col-md-3"><div class="card stat-card"><div class="card-body"><div class="stat-label">Total Loan</div><div class="stat-value">${formatCurrency(totalLoan)}</div></div></div></div>
      <div class="col-md-3"><div class="card stat-card"><div class="card-body"><div class="stat-label">Outstanding</div><div class="stat-value text-danger">${formatCurrency(outstanding)}</div></div></div></div>
      <div class="col-md-3"><div class="card stat-card"><div class="card-body"><div class="stat-label">Principal Paid</div><div class="stat-value">${formatCurrency(principalPaid)}</div></div></div></div>
      <div class="col-md-3"><div class="card stat-card"><div class="card-body"><div class="stat-label">Interest Paid</div><div class="stat-value">${formatCurrency(interestPaid)}</div></div></div></div>
    `;

    document.getElementById('emiDueAlerts').innerHTML = due7.length
      ? due7.map(e => {
          const days = Math.ceil((new Date(e.DueDate) - new Date()) / (1000 * 60 * 60 * 24));
          return `<div class="alert alert-warning py-2">⚠ EMI due in ${days} days: <strong>${e.Machine}</strong> — ${formatCurrency(e.EMIAmount)} (${formatDate(e.DueDate)})</div>`;
        }).join('')
      : '<p class="text-muted">No EMIs due within 7 days</p>';

    document.querySelector('#upcomingEmiTable tbody').innerHTML = upcoming.map(e => {
      const days = Math.ceil((new Date(e.DueDate) - new Date()) / (1000 * 60 * 60 * 24));
      return `<tr>
        <td>${e.Machine}</td><td>${formatDate(e.DueDate)}</td><td>${formatCurrency(e.EMIAmount)}</td>
        <td>${e.Status}</td><td>${days} days</td>
      </tr>`;
    }).join('');
  }

  return { render, getUpcomingEmis };
})();

const BusinessWorthModule = (function () {
  function calculate() {
    const machineValue = AppData.machines.reduce((s, m) => s + parseNum(m.CurrentValue), 0);
    const assetValue = AppData.assets.reduce((s, a) => s + parseNum(a.CurrentValue), 0);
    const cash = CashFlowModule.calcCashFlow().closing;
    const receivables = ReceivablesModule.getTotalReceivables();
    const loans = App.getOutstandingLoans();
    const vendorPayables = VendorsModule.getTotalVendorOutstanding();
    const pendingEmi = AppData.emi.filter(e => e.Status !== 'Paid').reduce((s, e) => s + parseNum(e.EMIAmount), 0);

    const assets = machineValue + assetValue + Math.max(0, cash) + receivables;
    const liabilities = loans + vendorPayables + pendingEmi;
    const netWorth = assets - liabilities;

    return { machineValue, assetValue, cash, receivables, assets, loans, vendorPayables, pendingEmi, liabilities, netWorth };
  }

  function render() {
    const w = calculate();
    document.getElementById('worthDisplay').innerHTML = `
      <div class="row g-3">
        <div class="col-lg-6">
          <div class="card h-100"><div class="card-header"><h5>Assets</h5></div><div class="card-body">
            <table class="table table-sm"><tbody>
              <tr><td>Machine Value</td><td class="text-end">${formatCurrency(w.machineValue)}</td></tr>
              <tr><td>Other Assets</td><td class="text-end">${formatCurrency(w.assetValue)}</td></tr>
              <tr><td>Cash (Est.)</td><td class="text-end">${formatCurrency(w.cash)}</td></tr>
              <tr><td>Receivables</td><td class="text-end">${formatCurrency(w.receivables)}</td></tr>
              <tr class="table-success"><td><strong>Total Assets</strong></td><td class="text-end"><strong>${formatCurrency(w.assets)}</strong></td></tr>
            </tbody></table>
          </div></div>
        </div>
        <div class="col-lg-6">
          <div class="card h-100"><div class="card-header"><h5>Liabilities</h5></div><div class="card-body">
            <table class="table table-sm"><tbody>
              <tr><td>Outstanding Loans</td><td class="text-end">${formatCurrency(w.loans)}</td></tr>
              <tr><td>Vendor Payables</td><td class="text-end">${formatCurrency(w.vendorPayables)}</td></tr>
              <tr><td>Pending EMIs</td><td class="text-end">${formatCurrency(w.pendingEmi)}</td></tr>
              <tr class="table-danger"><td><strong>Total Liabilities</strong></td><td class="text-end"><strong>${formatCurrency(w.liabilities)}</strong></td></tr>
            </tbody></table>
          </div></div>
        </div>
        <div class="col-12">
          <div class="card stat-card text-center py-4">
            <div class="stat-label">Current Business Worth (Net)</div>
            <div class="stat-value fs-1 text-accent">${formatCurrency(w.netWorth)}</div>
          </div>
        </div>
      </div>
    `;
  }

  return { render, calculate };
})();
