/**
 * Gitai Earthmovers — AI Insights Panel
 * Rule-based business intelligence insights
 */
const InsightsModule = (function () {
  function generateInsights() {
    const insights = [];
    const warnings = [];

    // Revenue trend
    const monthlyRev = {};
    AppData.income.forEach(i => {
      const k = getMonthKey(i.Date);
      monthlyRev[k] = (monthlyRev[k] || 0) + parseNum(i.BillAmount);
    });
    const revMonths = Object.keys(monthlyRev).sort();
    if (revMonths.length >= 2) {
      const last = monthlyRev[revMonths[revMonths.length - 1]];
      const prev = monthlyRev[revMonths[revMonths.length - 2]];
      const change = prev > 0 ? ((last - prev) / prev * 100).toFixed(1) : 0;
      insights.push({
        type: 'revenue',
        icon: 'bi-graph-up',
        title: 'Revenue Trend',
        text: `Latest month revenue ${change >= 0 ? 'up' : 'down'} ${Math.abs(change)}% vs previous month (${formatCurrency(last)} vs ${formatCurrency(prev)}).`,
        positive: change >= 0
      });
    }

    // Expense trend
    const monthlyExp = {};
    AppData.expenses.forEach(e => {
      const k = getMonthKey(e.Date);
      monthlyExp[k] = (monthlyExp[k] || 0) + parseNum(e.Amount);
    });
    const expMonths = Object.keys(monthlyExp).sort();
    if (expMonths.length >= 2) {
      const last = monthlyExp[expMonths[expMonths.length - 1]];
      const prev = monthlyExp[expMonths[expMonths.length - 2]];
      const change = prev > 0 ? ((last - prev) / prev * 100).toFixed(1) : 0;
      if (change > 10) {
        warnings.push({ icon: 'bi-receipt', text: `Expenses increased ${change}% month-over-month. Review cost controls.` });
      }
      insights.push({
        type: 'expense',
        icon: 'bi-receipt',
        title: 'Expense Trend',
        text: `Operating expenses ${change >= 0 ? 'increased' : 'decreased'} ${Math.abs(change)}% in the latest period.`,
        positive: change <= 0
      });
    }

    // Machine performance
    const profitability = AnalyticsModule.calcMachineProfitability();
    const best = profitability.sort((a, b) => b.profit - a.profit)[0];
    const worst = profitability.sort((a, b) => a.profit - b.profit)[0];
    if (best) {
      insights.push({
        type: 'machine',
        icon: 'bi-truck',
        title: 'Top Performer',
        text: `${best.name} leads with ${formatCurrency(best.profit)} profit (${best.margin.toFixed(1)}% margin).`,
        positive: true
      });
    }
    if (worst && worst.profit < 0) {
      warnings.push({ icon: 'bi-truck', text: `${worst.name} is operating at a loss (${formatCurrency(worst.profit)}). Investigate costs.` });
    }

    // Partner contributions
    const partners = App.getPartnerBalances();
    insights.push({
      type: 'partner',
      icon: 'bi-people',
      title: 'Partner Capital',
      text: `Total partner investment: ${formatCurrency(App.getTotalPartnerInvestment())}. Net profit allocation based on ${partners.length} partners.`,
      positive: true
    });

    // Outstanding risks
    const receivables = ReceivablesModule.getTotalReceivables();
    const loans = App.getOutstandingLoans();
    if (receivables > App.getTotalRevenue() * 0.2) {
      warnings.push({ icon: 'bi-cash', text: `Receivables (${formatCurrency(receivables)}) exceed 20% of total revenue. Follow up on collections.` });
    }
    if (loans > App.getCurrentAssetValue() * 0.5) {
      warnings.push({ icon: 'bi-bank', text: `Outstanding loans (${formatCurrency(loans)}) are high relative to asset value.` });
    }

    // Diesel warnings
    AnalyticsModule.calcDieselAnalysis().alerts.forEach(a => {
      warnings.push({ icon: 'bi-fuel-pump', text: `High diesel cost: ${a.machine} consumption up ${a.increase}% in ${a.month}.` });
    });

    // EMI bounce
    const bounces = AppData.emi.filter(e => e.Status === 'Bounced').length;
    if (bounces > 0) {
      warnings.push({ icon: 'bi-x-circle', text: `Repeated EMI bounce detected (${bounces} record(s)). Review cash flow timing.` });
    }

    // Customer payment delays
    const over60 = AppData.income.filter(i => parseNum(i.PendingAmount) > 0 && ReceivablesModule.ageingBucket(ReceivablesModule.buildCustomerLedger().find(c => c.customer === i.Customer)?.invoices[0]?.age || 0) !== '0-30').length;
    if (over60 > 0) {
      warnings.push({ icon: 'bi-clock-history', text: `Customer payment delays: ${over60} invoice(s) pending beyond 30 days.` });
    }

    // Low utilization
    const lowUtil = AnalyticsModule.calcUtilization().filter(u => u.utilization < 50);
    if (lowUtil.length > 0) {
      warnings.push({ icon: 'bi-speedometer2', text: `Low machine utilization on ${lowUtil.length} machine-month(s). Consider redeployment.` });
    }

    return { insights, warnings };
  }

  function render() {
    const { insights, warnings } = generateInsights();

    document.getElementById('insightsPanel').innerHTML = insights.map(i => `
      <div class="insight-card ${i.positive ? 'insight-positive' : 'insight-neutral'}">
        <i class="bi ${i.icon}"></i>
        <div><strong>${i.title}</strong><p class="mb-0 small">${i.text}</p></div>
      </div>
    `).join('');

    document.getElementById('warningsPanel').innerHTML = warnings.length
      ? warnings.map(w => `<div class="alert alert-warning py-2 mb-2">⚠ ${w.text}</div>`).join('')
      : '<p class="text-muted">No critical warnings</p>';
  }

  function renderDashboardWidget() {
    const { warnings } = generateInsights();
    const el = document.getElementById('dashboardInsights');
    if (!el) return;
    el.innerHTML = warnings.slice(0, 4).map(w =>
      `<div class="alert alert-warning py-1 px-2 mb-1 small">⚠ ${w.text}</div>`
    ).join('') || '<p class="text-muted small mb-0">All clear — no warnings</p>';
  }

  return { generateInsights, render, renderDashboardWidget };
})();
