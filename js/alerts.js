/**
 * Gitai Earthmovers — Dashboard Alert Center
 */
const AlertCenter = (function () {
  const SEVERITY = { critical: 'danger', warning: 'warning', info: 'info', success: 'success' };

  function collectAlerts() {
    const alerts = [];

    // EMI Due within 7 days
    LoanDashboardModule.getUpcomingEmis(7).forEach(e => {
      alerts.push({
        type: 'EMI Due',
        severity: 'warning',
        message: `${e.Machine} EMI of ${formatCurrency(e.EMIAmount)} due ${formatDate(e.DueDate)}`,
        section: 'loan-dashboard',
        icon: 'bi-calendar-exclamation'
      });
    });

    // EMI Bounce
    AppData.emi.filter(e => e.Status === 'Bounced').forEach(e => {
      alerts.push({
        type: 'EMI Bounce',
        severity: 'critical',
        message: `${e.Machine} EMI bounced for ${formatDate(e.DueDate)}`,
        section: 'emi',
        icon: 'bi-x-circle'
      });
    });

    // Overdue EMIs
    AppData.emi.filter(e => e.Status === 'Overdue').forEach(e => {
      alerts.push({
        type: 'EMI Overdue',
        severity: 'critical',
        message: `${e.Machine} EMI overdue since ${formatDate(e.DueDate)}`,
        section: 'emi',
        icon: 'bi-exclamation-triangle'
      });
    });

    // Customer outstanding >90 days
    ReceivablesModule.getOver90Customers().forEach(c => {
      alerts.push({
        type: 'Receivable',
        severity: 'critical',
        message: `${c.customer} has ${formatCurrency(c.pending)} outstanding over 90 days`,
        section: 'receivables',
        icon: 'bi-person-exclamation'
      });
    });

    // Low machine utilization
    AnalyticsModule.calcUtilization().filter(u => u.utilization < 50).slice(0, 5).forEach(u => {
      alerts.push({
        type: 'Utilization',
        severity: 'warning',
        message: `${u.machine} utilization at ${u.utilization.toFixed(1)}% (${u.month})`,
        section: 'analytics',
        icon: 'bi-speedometer'
      });
    });

    // Diesel spike
    AnalyticsModule.calcDieselAnalysis().alerts.forEach(a => {
      alerts.push({
        type: 'Diesel',
        severity: 'warning',
        message: `${a.machine} diesel cost up ${a.increase}% in ${a.month}`,
        section: 'analytics',
        icon: 'bi-fuel-pump'
      });
    });

    // Missing documents for large expenses
    AppData.expenses.filter(e => parseNum(e.Amount) > 50000).forEach(e => {
      const hasDoc = (AppData.documents || []).some(d =>
        d.ReferenceID == e.ID || (d.ReferenceModule === 'expenses' && d.ReferenceID == e.ID)
      );
      if (!hasDoc) {
        alerts.push({
          type: 'Documents',
          severity: 'info',
          message: `No document linked for ${e.ExpenseType} expense ${formatCurrency(e.Amount)} (${formatDate(e.Date)})`,
          section: 'documents',
          icon: 'bi-file-earmark-x'
        });
      }
    });

    // Loan overdue (high outstanding ratio)
    AppData.loans.forEach(l => {
      const ratio = parseNum(l.OutstandingLoan) / parseNum(l.LoanAmount);
      if (ratio > 0.7) {
        alerts.push({
          type: 'Loan',
          severity: 'warning',
          message: `${l.Machine} loan ${(ratio * 100).toFixed(0)}% still outstanding`,
          section: 'loan-dashboard',
          icon: 'bi-bank'
        });
      }
    });

    return alerts.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2, success: 3 };
      return (order[a.severity] || 9) - (order[b.severity] || 9);
    });
  }

  function render(containerId, limit) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const alerts = collectAlerts();
    const badge = document.getElementById('alertBadge');
    const badgeTop = document.getElementById('alertBadgeTop');
    if (badge) {
      badge.textContent = alerts.length;
      badge.classList.toggle('d-none', alerts.length === 0);
    }
    if (badgeTop) {
      badgeTop.textContent = alerts.length;
      badgeTop.classList.toggle('d-none', alerts.length === 0);
    }

    const show = limit ? alerts.slice(0, limit) : alerts;
    el.innerHTML = show.length === 0
      ? '<p class="text-muted mb-0">No active alerts</p>'
      : show.map(a => `
        <div class="alert alert-${SEVERITY[a.severity] || 'info'} alert-item py-2 mb-2 d-flex align-items-start gap-2">
          <i class="bi ${a.icon}"></i>
          <div class="flex-grow-1">
            <strong>${a.type}</strong>: ${a.message}
            ${a.section ? `<a href="#${a.section}" class="ms-2 small" onclick="App.navigateTo('${a.section}')">View →</a>` : ''}
          </div>
        </div>
      `).join('');

    return alerts;
  }

  return { collectAlerts, render, SEVERITY };
})();
