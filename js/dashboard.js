/**
 * Gitai Earthmovers — Dashboard Module
 */
const DashboardModule = (function () {
  let charts = {};

  function destroyCharts() {
    Object.values(charts).forEach(c => c?.destroy());
    charts = {};
  }

  function renderCards() {
    const cards = [
      { label: 'Total Revenue', value: App.getTotalRevenue(), icon: 'bi-cash-stack' },
      { label: 'Total Expenses', value: App.getTotalExpenses(), icon: 'bi-receipt' },
      { label: 'Net Profit', value: App.getNetProfit(), icon: 'bi-graph-up-arrow', highlight: true },
      { label: 'Outstanding Loan', value: App.getOutstandingLoans(), icon: 'bi-bank' },
      { label: 'Total EMI Paid', value: App.getTotalEmiPaid(), icon: 'bi-calendar-check' },
      { label: 'Bounce Charges', value: App.getTotalBounceCharges(), icon: 'bi-exclamation-triangle' },
      { label: 'Partner Investment', value: App.getTotalPartnerInvestment(), icon: 'bi-people' },
      { label: 'Current Asset Value', value: App.getCurrentAssetValue(), icon: 'bi-box-seam' }
    ];

    document.getElementById('dashboardCards').innerHTML = cards.map(c => `
      <div class="col-sm-6 col-lg-3">
        <div class="card stat-card h-100">
          <div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <div class="stat-label">${c.label}</div>
              <div class="stat-value ${c.highlight ? 'text-accent' : ''}">${formatCurrency(c.value)}</div>
            </div>
            <i class="bi ${c.icon} stat-icon"></i>
          </div>
        </div>
      </div>
    `).join('');
  }

  function renderEmiWarnings() {
    const today = todayISO();
    const overdue = AppData.emi.filter(e => e.Status === 'Overdue' || (e.Status === 'Pending' && e.DueDate < today));
    const bounced = AppData.emi.filter(e => e.Status === 'Bounced');

    let html = '';
    if (overdue.length > 0) {
      html += `<div class="alert alert-danger emi-warning mb-2">
        <strong><i class="bi bi-exclamation-circle"></i> Overdue EMIs (${overdue.length}):</strong>
        ${overdue.map(e => `${e.Machine} — Due ${formatDate(e.DueDate)} (${formatCurrency(e.EMIAmount)})`).join(' | ')}
      </div>`;
    }
    if (bounced.length > 0) {
      html += `<div class="alert alert-warning emi-warning-bounce mb-2">
        <strong><i class="bi bi-x-circle"></i> Bounced EMIs (${bounced.length}):</strong>
        ${bounced.map(e => `${e.Machine} — ${formatDate(e.DueDate)} (Charges: ${formatCurrency(parseNum(e.BounceCharges) + parseNum(e.PenaltyCharges))})`).join(' | ')}
      </div>`;
    }
    document.getElementById('emiWarnings').innerHTML = html;
  }

  function getChartColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      text: isDark ? '#9ca3af' : '#6b7280',
      grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      accent: '#f5c518',
      palette: ['#f5c518', '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ef4444', '#06b6d4']
    };
  }

  function aggregateMonthly(data, amountField, dateField) {
    const months = {};
    data.forEach(r => {
      const key = getMonthKey(r[dateField]);
      if (!key) return;
      months[key] = (months[key] || 0) + parseNum(r[amountField]);
    });
    const sorted = Object.keys(months).sort();
    return { labels: sorted, values: sorted.map(k => months[k]) };
  }

  function renderMonthlyRevenueChart() {
    const colors = getChartColors();
    const { labels, values } = aggregateMonthly(AppData.income, 'BillAmount', 'Date');

    charts.revenue = new Chart(document.getElementById('chartMonthlyRevenue'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Revenue',
          data: values,
          borderColor: colors.accent,
          backgroundColor: 'rgba(245, 197, 24, 0.1)',
          fill: true,
          tension: 0.3
        }]
      },
      options: chartOptions(colors)
    });
  }

  function renderMonthlyExpensesChart() {
    const colors = getChartColors();
    const { labels, values } = aggregateMonthly(AppData.expenses, 'Amount', 'Date');

    charts.expenses = new Chart(document.getElementById('chartMonthlyExpenses'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Expenses',
          data: values,
          backgroundColor: colors.palette[1],
          borderRadius: 4
        }]
      },
      options: chartOptions(colors)
    });
  }

  function renderMachineRevenueChart() {
    const colors = getChartColors();
    const byMachine = {};
    AppData.income.forEach(r => {
      byMachine[r.Machine] = (byMachine[r.Machine] || 0) + parseNum(r.BillAmount);
    });

    charts.machine = new Chart(document.getElementById('chartMachineRevenue'), {
      type: 'bar',
      data: {
        labels: Object.keys(byMachine),
        datasets: [{
          label: 'Revenue',
          data: Object.values(byMachine),
          backgroundColor: colors.palette
        }]
      },
      options: { ...chartOptions(colors), indexAxis: 'y' }
    });
  }

  function renderExpenseBreakdownChart() {
    const colors = getChartColors();
    const byType = {};
    AppData.expenses.forEach(r => {
      byType[r.ExpenseType] = (byType[r.ExpenseType] || 0) + parseNum(r.Amount);
    });

    charts.breakdown = new Chart(document.getElementById('chartExpenseBreakdown'), {
      type: 'doughnut',
      data: {
        labels: Object.keys(byType),
        datasets: [{
          data: Object.values(byType),
          backgroundColor: colors.palette
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: colors.text } }
        }
      }
    });
  }

  function chartOptions(colors) {
    return {
      responsive: true,
      plugins: {
        legend: { labels: { color: colors.text } }
      },
      scales: {
        x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
        y: {
          ticks: {
            color: colors.text,
            callback: v => CONFIG.CURRENCY + (v / 1000).toFixed(0) + 'K'
          },
          grid: { color: colors.grid }
        }
      }
    };
  }

  function renderBusinessWorthSnippet() {
    const el = document.getElementById('businessWorthSnippet');
    if (!el || typeof BusinessWorthModule === 'undefined') return;
    const w = BusinessWorthModule.calculate();
    el.innerHTML = `
      <div class="card stat-card">
        <div class="card-body d-flex justify-content-between align-items-center">
          <div>
            <div class="stat-label">Net Business Worth</div>
            <div class="stat-value text-accent">${formatCurrency(w.netWorth)}</div>
          </div>
          <a href="#business-worth" class="btn btn-sm btn-outline-accent" onclick="App.navigateTo('business-worth')">Details</a>
        </div>
      </div>`;
  }

  function render() {
    renderCards();
    renderEmiWarnings();
    if (typeof AlertCenter !== 'undefined') AlertCenter.render('dashboardAlerts', 5);
    if (typeof InsightsModule !== 'undefined') InsightsModule.renderDashboardWidget();
    renderBusinessWorthSnippet();
    destroyCharts();
    renderMonthlyRevenueChart();
    renderMonthlyExpensesChart();
    renderMachineRevenueChart();
    renderExpenseBreakdownChart();
  }

  return { render, getChartColors };
})();
