/**
 * Gitai Earthmovers — Business Intelligence Analytics Engine
 * Machine Profitability, Utilization, Diesel Analysis
 */
const AnalyticsModule = (function () {
  let charts = {};

  function destroyCharts() {
    Object.values(charts).forEach(c => c?.destroy());
    charts = {};
  }

  /** Machine Profitability Engine */
  function calcMachineProfitability() {
    const totalInsurance = AppData.expenses
      .filter(e => e.ExpenseType === 'Insurance')
      .reduce((s, e) => s + parseNum(e.Amount), 0);
    const machineCount = AppData.machines.filter(m => m.Status === 'Active').length || 1;

    return AppData.machines.map(m => {
      const name = m.MachineName;
      const revenue = AppData.income.filter(i => i.Machine === name).reduce((s, r) => s + parseNum(r.BillAmount), 0);
      const diesel = sumExpense(name, 'Diesel');
      const repairs = sumExpense(name, 'Repair') + sumExpense(name, 'Maintenance');
      const salary = sumExpense(name, 'Salary');
      const insurance = sumExpense(name, 'Insurance') + (totalInsurance / machineCount);
      const emiInterest = AppData.loans.filter(l => l.Machine === name).reduce((s, l) => s + parseNum(l.InterestPaid), 0);

      const directExpenses = diesel + repairs + salary + insurance + emiInterest;
      const allExpenses = AppData.expenses.filter(e => e.Machine === name).reduce((s, e) => s + parseNum(e.Amount), 0);
      const profit = revenue - directExpenses;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return { name, revenue, diesel, repairs, salary, insurance, emiInterest, directExpenses, allExpenses, profit, margin, status: m.Status };
    });
  }

  function sumExpense(machine, type) {
    return AppData.expenses
      .filter(e => e.Machine === machine && e.ExpenseType === type)
      .reduce((s, e) => s + parseNum(e.Amount), 0);
  }

  /** Machine Utilization */
  function calcUtilization() {
    const stored = AppData.utilization || [];
    if (stored.length > 0) {
      return stored.map(u => ({
        machine: u.Machine,
        month: `${u.Year}-${String(u.Month).padStart(2, '0')}`,
        available: parseNum(u.AvailableDays),
        working: parseNum(u.WorkingDays),
        idle: parseNum(u.IdleDays),
        utilization: parseNum(u.AvailableDays) > 0 ? (parseNum(u.WorkingDays) / parseNum(u.AvailableDays)) * 100 : 0
      }));
    }

    // Derive from income hours — estimate working days
    const byMachineMonth = {};
    AppData.income.forEach(i => {
      const key = `${i.Machine}|${getMonthKey(i.Date)}`;
      if (!byMachineMonth[key]) byMachineMonth[key] = { hours: 0, machine: i.Machine, month: getMonthKey(i.Date) };
      byMachineMonth[key].hours += parseNum(i.HoursWorked);
    });

    return Object.values(byMachineMonth).map(v => {
      const [y, m] = v.month.split('-');
      const daysInMonth = new Date(parseInt(y), parseInt(m), 0).getDate();
      const workingDays = Math.min(daysInMonth, Math.ceil(v.hours / 8));
      const idleDays = daysInMonth - workingDays;
      return {
        machine: v.machine,
        month: v.month,
        available: daysInMonth,
        working: workingDays,
        idle: idleDays,
        utilization: (workingDays / daysInMonth) * 100
      };
    });
  }

  function utilizationAlertClass(pct) {
    if (pct < 50) return 'alert-danger';
    if (pct < 75) return 'alert-warning';
    return 'alert-success';
  }

  /** Diesel Consumption Analysis */
  function calcDieselAnalysis() {
    const byMachineMonth = {};

    AppData.expenses.filter(e => e.ExpenseType === 'Diesel').forEach(e => {
      const key = `${e.Machine}|${getMonthKey(e.Date)}`;
      if (!byMachineMonth[key]) byMachineMonth[key] = { machine: e.Machine, month: getMonthKey(e.Date), diesel: 0, hours: 0 };
      byMachineMonth[key].diesel += parseNum(e.Amount);
    });

    AppData.income.forEach(i => {
      const key = `${i.Machine}|${getMonthKey(i.Date)}`;
      if (byMachineMonth[key]) byMachineMonth[key].hours += parseNum(i.HoursWorked);
    });

    const results = Object.values(byMachineMonth).map(v => ({
      ...v,
      dieselPerHour: v.hours > 0 ? v.diesel / v.hours : 0
    }));

    const avg = results.length ? results.reduce((s, r) => s + r.dieselPerHour, 0) / results.length : 0;
    const sorted = [...results].sort((a, b) => a.dieselPerHour - b.dieselPerHour);

    return {
      results,
      average: avg,
      best: sorted[0] || null,
      worst: sorted[sorted.length - 1] || null,
      alerts: detectDieselSpikes(results)
    };
  }

  function detectDieselSpikes(results) {
    const alerts = [];
    const byMachine = {};
    results.forEach(r => {
      if (!byMachine[r.machine]) byMachine[r.machine] = [];
      byMachine[r.machine].push(r);
    });

    Object.entries(byMachine).forEach(([machine, months]) => {
      months.sort((a, b) => a.month.localeCompare(b.month));
      for (let i = 1; i < months.length; i++) {
        const prev = months[i - 1].dieselPerHour;
        const curr = months[i].dieselPerHour;
        if (prev > 0 && ((curr - prev) / prev) > 0.15) {
          alerts.push({ machine, month: months[i].month, increase: (((curr - prev) / prev) * 100).toFixed(1) });
        }
      }
    });
    return alerts;
  }

  function renderProfitability() {
    const data = calcMachineProfitability();
    document.getElementById('profitabilityTable').querySelector('tbody').innerHTML = data.map(m => `
      <tr>
        <td><strong>${m.name}</strong></td>
        <td>${formatCurrency(m.revenue)}</td>
        <td>${formatCurrency(m.diesel)}</td>
        <td>${formatCurrency(m.repairs)}</td>
        <td>${formatCurrency(m.salary)}</td>
        <td>${formatCurrency(m.insurance)}</td>
        <td>${formatCurrency(m.emiInterest)}</td>
        <td>${formatCurrency(m.directExpenses)}</td>
        <td class="${m.profit >= 0 ? 'text-success' : 'text-danger'}"><strong>${formatCurrency(m.profit)}</strong></td>
        <td>${m.margin.toFixed(1)}%</td>
      </tr>
    `).join('');

    destroyCharts();
    const colors = DashboardModule.getChartColors?.() || { palette: ['#f5c518', '#3b82f6', '#22c55e'], text: '#9ca3af', grid: 'rgba(255,255,255,0.06)' };

    charts.profitCompare = new Chart(document.getElementById('chartProfitCompare'), {
      type: 'bar',
      data: {
        labels: data.map(d => d.name),
        datasets: [
          { label: 'Revenue', data: data.map(d => d.revenue), backgroundColor: colors.palette[0] },
          { label: 'Expenses', data: data.map(d => d.directExpenses), backgroundColor: colors.palette[1] },
          { label: 'Profit', data: data.map(d => d.profit), backgroundColor: colors.palette[2] }
        ]
      },
      options: { responsive: true, plugins: { legend: { labels: { color: colors.text } } } }
    });

    // Monthly trend for top machine
    const topMachine = data.sort((a, b) => b.revenue - a.revenue)[0]?.name;
    if (topMachine) {
      const monthly = {};
      AppData.income.filter(i => i.Machine === topMachine).forEach(i => {
        const k = getMonthKey(i.Date);
        monthly[k] = (monthly[k] || 0) + parseNum(i.BillAmount);
      });
      const labels = Object.keys(monthly).sort();
      charts.profitTrend = new Chart(document.getElementById('chartProfitTrend'), {
        type: 'line',
        data: {
          labels,
          datasets: [{ label: topMachine + ' Revenue', data: labels.map(l => monthly[l]), borderColor: colors.palette[0], tension: 0.3 }]
        },
        options: { responsive: true, plugins: { legend: { labels: { color: colors.text } } } }
      });
    }
  }

  function renderUtilization() {
    const data = calcUtilization();
    const avgUtil = data.length ? data.reduce((s, d) => s + d.utilization, 0) / data.length : 0;

    document.getElementById('utilizationAlerts').innerHTML = data.slice(-6).map(u => `
      <div class="alert ${utilizationAlertClass(u.utilization)} py-2 mb-2">
        <strong>${u.machine}</strong> (${u.month}): ${u.utilization.toFixed(1)}% utilization
        — Working: ${u.working}d / Available: ${u.available}d
      </div>
    `).join('') || '<p class="text-muted">No utilization data</p>';

    document.getElementById('utilizationTable').querySelector('tbody').innerHTML = data.map(u => `
      <tr>
        <td>${u.machine}</td><td>${u.month}</td><td>${u.available}</td><td>${u.working}</td><td>${u.idle}</td>
        <td class="${u.utilization < 50 ? 'text-danger' : u.utilization < 75 ? 'text-warning' : 'text-success'}"><strong>${u.utilization.toFixed(1)}%</strong></td>
      </tr>
    `).join('');

    document.getElementById('avgUtilization').textContent = avgUtil.toFixed(1) + '%';
  }

  function renderDiesel() {
    const analysis = calcDieselAnalysis();
    document.getElementById('dieselStats').innerHTML = `
      <div class="col-md-4"><div class="card stat-card"><div class="card-body"><div class="stat-label">Avg Diesel/Hour</div><div class="stat-value">${formatCurrency(analysis.average)}</div></div></div></div>
      <div class="col-md-4"><div class="card stat-card"><div class="card-body"><div class="stat-label">Best Month</div><div class="stat-value">${analysis.best ? analysis.best.machine + ' (' + analysis.best.month + ')' : '—'}</div></div></div></div>
      <div class="col-md-4"><div class="card stat-card"><div class="card-body"><div class="stat-label">Worst Month</div><div class="stat-value">${analysis.worst ? analysis.worst.machine + ' (' + analysis.worst.month + ')' : '—'}</div></div></div></div>
    `;

    document.getElementById('dieselAlerts').innerHTML = analysis.alerts.length
      ? analysis.alerts.map(a => `<div class="alert alert-warning py-2">⚠ ${a.machine}: Diesel/hr increased ${a.increase}% in ${a.month}</div>`).join('')
      : '';

    document.getElementById('dieselTable').querySelector('tbody').innerHTML = analysis.results.map(r => `
      <tr>
        <td>${r.machine}</td><td>${r.month}</td><td>${formatCurrency(r.diesel)}</td>
        <td>${r.hours}</td><td>${formatCurrency(r.dieselPerHour)}</td>
      </tr>
    `).join('');
  }

  function render() {
    renderProfitability();
    renderUtilization();
    renderDiesel();
  }

  return {
    render,
    calcMachineProfitability,
    calcUtilization,
    calcDieselAnalysis,
    utilizationAlertClass
  };
})();
