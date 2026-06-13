/**
 * Gitai Earthmovers — Reports & Partner Dispute Module
 */
const ReportsModule = (function () {
  let currentReport = null;
  let currentTitle = '';

  function showReport(title, html) {
    currentTitle = title;
    currentReport = html;
    document.getElementById('reportTitle').textContent = title;
    document.getElementById('reportOutput').innerHTML = html;
    document.getElementById('reportOutputCard').style.display = 'block';
    document.getElementById('reportOutputCard').scrollIntoView({ behavior: 'smooth' });
  }

  function reportMeta() {
    return `<div class="report-meta">
      <strong>Gitai Earthmovers</strong> — Generated on ${formatDateTime(new Date().toISOString())}
      | Business Period: ${formatDate(CONFIG.BUSINESS_START_DATE)} to ${formatDate(todayISO())}
    </div>`;
  }

  function generatePnl() {
    const revenue = App.getTotalRevenue();
    const expenses = App.getTotalExpenses();
    const profit = App.getNetProfit();
    const received = AppData.income.reduce((s, r) => s + parseNum(r.ReceivedAmount), 0);
    const pending = AppData.income.reduce((s, r) => s + parseNum(r.PendingAmount), 0);

    const html = reportMeta() + `
      <table class="table table-bordered">
        <thead><tr><th>Item</th><th class="text-end">Amount</th></tr></thead>
        <tbody>
          <tr><td>Total Bill Amount (Revenue)</td><td class="text-end">${formatCurrency(revenue)}</td></tr>
          <tr><td>Amount Received</td><td class="text-end">${formatCurrency(received)}</td></tr>
          <tr><td>Pending Receivables</td><td class="text-end">${formatCurrency(pending)}</td></tr>
          <tr class="table-danger"><td>Total Expenses</td><td class="text-end">${formatCurrency(expenses)}</td></tr>
          <tr class="table-success"><td><strong>Net Profit</strong></td><td class="text-end"><strong>${formatCurrency(profit)}</strong></td></tr>
        </tbody>
      </table>
      <h6 class="mt-4">Expense Breakdown</h6>
      ${generateExpenseTable()}
    `;
    showReport('Profit & Loss Report', html);
  }

  function generatePartnerSettlement() {
    const balances = App.getPartnerBalances();
    const html = reportMeta() + `
      <table class="table table-bordered">
        <thead>
          <tr>
            <th>Partner</th><th>Share %</th><th>Investments</th><th>EMI Paid (personal)</th><th>Withdrawals</th>
            <th>Net Capital</th><th>Profit Share</th><th>Final Balance</th>
          </tr>
        </thead>
        <tbody>
          ${balances.map(p => `
            <tr>
              <td><strong>${p.name}</strong></td>
              <td>${p.sharePercent}%</td>
              <td>${formatCurrency(p.investments)}</td>
              <td>${formatCurrency(p.emiPaidByPartner || 0)}</td>
              <td>${formatCurrency(p.withdrawals)}</td>
              <td>${formatCurrency(p.investments - p.withdrawals)}</td>
              <td>${formatCurrency(p.profitShare)}</td>
              <td><strong class="text-accent">${formatCurrency(p.balance)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="table-secondary">
            <td colspan="2"><strong>Totals</strong></td>
            <td>${formatCurrency(App.getTotalPartnerInvestment())}</td>
            <td>${formatCurrency(App.getTotalEmiFromPartners())}</td>
            <td>${formatCurrency(App.getTotalPartnerWithdrawals())}</td>
            <td>${formatCurrency(App.getTotalPartnerInvestment() - App.getTotalPartnerWithdrawals())}</td>
            <td>${formatCurrency(App.getNetProfit())}</td>
            <td>${formatCurrency(balances.reduce((s, p) => s + p.balance, 0))}</td>
          </tr>
        </tfoot>
      </table>
      <p class="text-muted small mt-2">
        Formula: Partner Balance = Investments − Withdrawals + Profit Share + EMI paid personally by partner<br>
        Profit Share = Net Profit × (Partner Investment ÷ Total Investment)
      </p>
    `;
    showReport('Partner Settlement Report', html);
  }

  function generateMachineProfitability() {
    const machines = AppData.machines.map(m => {
      const revenue = AppData.income.filter(i => i.Machine === m.MachineName).reduce((s, r) => s + parseNum(r.BillAmount), 0);
      const expenses = AppData.expenses.filter(e => e.Machine === m.MachineName).reduce((s, r) => s + parseNum(r.Amount), 0);
      const profit = revenue - expenses;
      return { name: m.MachineName, revenue, expenses, profit, status: m.Status };
    });

    const html = reportMeta() + `
      <table class="table table-bordered">
        <thead>
          <tr><th>Machine</th><th>Status</th><th>Revenue</th><th>Expenses</th><th>Net Profit</th><th>Margin</th></tr>
        </thead>
        <tbody>
          ${machines.map(m => `
            <tr>
              <td><strong>${m.name}</strong></td>
              <td>${m.status}</td>
              <td>${formatCurrency(m.revenue)}</td>
              <td>${formatCurrency(m.expenses)}</td>
              <td class="${m.profit >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(m.profit)}</td>
              <td>${m.revenue > 0 ? ((m.profit / m.revenue) * 100).toFixed(1) + '%' : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    showReport('Machine Profitability Report', html);
  }

  function generateExpenseTable() {
    const byType = {};
    AppData.expenses.forEach(r => {
      byType[r.ExpenseType] = (byType[r.ExpenseType] || 0) + parseNum(r.Amount);
    });
    const total = Object.values(byType).reduce((s, v) => s + v, 0);

    return `<table class="table table-bordered table-sm">
      <thead><tr><th>Category</th><th>Amount</th><th>% of Total</th></tr></thead>
      <tbody>
        ${Object.entries(byType).map(([type, amt]) => `
          <tr>
            <td>${type}</td>
            <td>${formatCurrency(amt)}</td>
            <td>${total > 0 ? ((amt / total) * 100).toFixed(1) : 0}%</td>
          </tr>
        `).join('')}
        <tr class="table-secondary"><td><strong>Total</strong></td><td><strong>${formatCurrency(total)}</strong></td><td>100%</td></tr>
      </tbody>
    </table>`;
  }

  function generateExpenseSummary() {
    showReport('Expense Summary Report', reportMeta() + generateExpenseTable());
  }

  function generateEmiSummary() {
    const totalEmi = AppData.emi.reduce((s, r) => s + parseNum(r.EMIAmount), 0);
    const totalPaid = AppData.emi.reduce((s, r) => s + parseNum(r.TotalPaid), 0);
    const totalBounce = AppData.emi.reduce((s, r) => s + parseNum(r.BounceCharges), 0);
    const totalPenalty = AppData.emi.reduce((s, r) => s + parseNum(r.PenaltyCharges), 0);
    const overdue = AppData.emi.filter(e => e.Status === 'Overdue').length;
    const bounced = AppData.emi.filter(e => e.Status === 'Bounced').length;

    const html = reportMeta() + `
      <table class="table table-bordered mb-4">
        <tr><td>Total EMI Due</td><td>${formatCurrency(totalEmi)}</td></tr>
        <tr><td>Total Paid (incl. charges)</td><td>${formatCurrency(totalPaid)}</td></tr>
        <tr><td>Bounce Charges</td><td>${formatCurrency(totalBounce)}</td></tr>
        <tr><td>Penalty Charges</td><td>${formatCurrency(totalPenalty)}</td></tr>
        <tr><td>Overdue Count</td><td>${overdue}</td></tr>
        <tr><td>Bounced Count</td><td>${bounced}</td></tr>
      </table>
      <table class="table table-bordered table-sm">
        <thead>
          <tr><th>Machine</th><th>Due Date</th><th>EMI</th><th>Total Paid</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${AppData.emi.map(r => `
            <tr>
              <td>${r.Machine}</td><td>${formatDate(r.DueDate)}</td>
              <td>${formatCurrency(r.EMIAmount)}</td><td>${formatCurrency(r.TotalPaid)}</td>
              <td>${r.Status}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    showReport('EMI Summary Report', html);
  }

  function generateLoanSummary() {
    const html = reportMeta() + `
      <table class="table table-bordered">
        <thead>
          <tr><th>Machine</th><th>Loan Amount</th><th>Principal Paid</th><th>Interest Paid</th><th>Outstanding</th><th>% Repaid</th></tr>
        </thead>
        <tbody>
          ${AppData.loans.map(r => {
            const repaid = parseNum(r.LoanAmount) > 0
              ? (((parseNum(r.LoanAmount) - parseNum(r.OutstandingLoan)) / parseNum(r.LoanAmount)) * 100).toFixed(1)
              : 0;
            return `
              <tr>
                <td><strong>${r.Machine}</strong></td>
                <td>${formatCurrency(r.LoanAmount)}</td>
                <td>${formatCurrency(r.PrincipalPaid)}</td>
                <td>${formatCurrency(r.InterestPaid)}</td>
                <td>${formatCurrency(r.OutstandingLoan)}</td>
                <td>${repaid}%</td>
              </tr>
            `;
          }).join('')}
        </tbody>
        <tfoot>
          <tr class="table-secondary">
            <td><strong>Total</strong></td>
            <td>${formatCurrency(AppData.loans.reduce((s, r) => s + parseNum(r.LoanAmount), 0))}</td>
            <td>${formatCurrency(AppData.loans.reduce((s, r) => s + parseNum(r.PrincipalPaid), 0))}</td>
            <td>${formatCurrency(AppData.loans.reduce((s, r) => s + parseNum(r.InterestPaid), 0))}</td>
            <td><strong>${formatCurrency(App.getOutstandingLoans())}</strong></td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    `;
    showReport('Loan Summary Report', html);
  }

  function generate(type) {
    switch (type) {
      case 'pnl': generatePnl(); break;
      case 'partner': generatePartnerSettlement(); break;
      case 'machine': generateMachineProfitability(); break;
      case 'expense': generateExpenseSummary(); break;
      case 'emi': generateEmiSummary(); break;
      case 'loan': generateLoanSummary(); break;
    }
  }

  function generateDisputeSettlement() {
    generateFullDisputeReport();
  }

  function generateFullDisputeReport() {
    const partners = PartnerSettlementEngine.calculate();
    const worth = BusinessWorthModule.calculate();
    const docCount = (AppData.documents || []).length;

    const html = `
      <div class="card" id="fullDisputeReport">
        <div class="card-header bg-dark text-white d-flex justify-content-between">
          <h5 class="mb-0"><i class="bi bi-shield-exclamation"></i> Complete Dispute Report</h5>
          <div class="btn-group">
            <button class="btn btn-sm btn-outline-light" onclick="ReportsModule.exportDisputeExcel()">Excel</button>
            <button class="btn btn-sm btn-outline-light" onclick="ReportsModule.exportFullDisputePDF()">PDF</button>
            <button class="btn btn-sm btn-outline-light" onclick="ReportsModule.printDispute()">Print</button>
          </div>
        </div>
        <div class="card-body">
          ${reportMeta()}

          <h6 class="mt-3">1. Business Summary</h6>
          <table class="table table-bordered table-sm">
            <tr><td>Total Revenue</td><td>${formatCurrency(App.getTotalRevenue())}</td></tr>
            <tr><td>Total Expenses</td><td>${formatCurrency(App.getTotalExpenses())}</td></tr>
            <tr><td>Net Profit / (Loss)</td><td><strong>${formatCurrency(App.getNetProfit())}</strong></td></tr>
          </table>

          <h6 class="mt-3">2. Assets</h6>
          <table class="table table-bordered table-sm">
            <tr><td>Machine Value</td><td>${formatCurrency(worth.machineValue)}</td></tr>
            <tr><td>Other Assets</td><td>${formatCurrency(worth.assetValue)}</td></tr>
            <tr><td>Receivables</td><td>${formatCurrency(worth.receivables)}</td></tr>
            <tr><td><strong>Total Assets</strong></td><td><strong>${formatCurrency(worth.assets)}</strong></td></tr>
          </table>

          <h6 class="mt-3">3. Liabilities</h6>
          <table class="table table-bordered table-sm">
            <tr><td>Outstanding Loans</td><td>${formatCurrency(worth.loans)}</td></tr>
            <tr><td>Pending EMIs</td><td>${formatCurrency(worth.pendingEmi)}</td></tr>
            <tr><td>Vendor Payables</td><td>${formatCurrency(worth.vendorPayables)}</td></tr>
            <tr><td><strong>Total Liabilities</strong></td><td><strong>${formatCurrency(worth.liabilities)}</strong></td></tr>
          </table>

          <h6 class="mt-3">4. Partner Summary</h6>
          <table class="table table-bordered">
            <thead><tr><th>Partner</th><th>Capital</th><th>Add. Capital</th><th>EMI Paid</th><th>Withdrawals</th><th>Profit Share</th><th>Loss Share</th><th>Settlement</th></tr></thead>
            <tbody>${partners.map(p => `
              <tr>
                <td><strong>${p.name}</strong></td>
                <td>${formatCurrency(p.capitalIntroduced)}</td>
                <td>${formatCurrency(p.additionalCapital)}</td>
                <td>${formatCurrency(p.emiPaidByPartner || 0)}</td>
                <td>${formatCurrency(p.withdrawals)}</td>
                <td>${formatCurrency(p.profitShare)}</td>
                <td>${formatCurrency(p.lossShare)}</td>
                <td><strong class="text-accent">${formatCurrency(p.settlement)}</strong></td>
              </tr>
            `).join('')}</tbody>
          </table>
          <p class="small text-muted">Formula: Settlement = Capital + Additional Capital − Withdrawals + Profit Share − Loss Share + EMI paid by partner</p>

          <h6 class="mt-3">5. Attachments Summary</h6>
          <p>${docCount} documents on file across ${CONFIG.DOCUMENT_CATEGORIES.length} categories.</p>

          <h6 class="mt-3">6. Audit Summary</h6>
          <p>${(AppData.audit || []).length} audit events recorded. Report generated from immutable audit trail.</p>

          <div class="mt-4 p-3 border rounded small text-muted">
            <strong>Declaration:</strong> This report is generated for partner dispute resolution. All figures derived from system records since ${formatDate(CONFIG.BUSINESS_START_DATE)}.
          </div>
        </div>
      </div>`;

    document.getElementById('disputeOutput').innerHTML = html;
    currentReport = html;
    currentTitle = 'Complete Dispute Report';
  }

  function renderDisputeSection() {
    generateFullDisputeReport();
  }

  function renderPartnerAnalysis() {
    const partners = PartnerSettlementEngine.calculate();
    document.getElementById('partnerAnalysisTable').querySelector('tbody').innerHTML = partners.map(p => `
      <tr>
        <td>${p.name}</td>
        <td>${formatCurrency(p.capitalIntroduced)}</td>
        <td>${formatCurrency(p.additionalCapital)}</td>
        <td>${formatCurrency(p.emiPaidByPartner || 0)}</td>
        <td>${formatCurrency(p.withdrawals)}</td>
        <td>${p.sharePercent}%</td>
        <td><strong>${formatCurrency(p.settlement)}</strong></td>
      </tr>
    `).join('');
  }

  function exportFullDisputePDF() {
    PdfEngine.fromElement('Complete Dispute Report', document.getElementById('fullDisputeReport') || document.getElementById('disputeOutput'));
  }

  function exportPDF() {
    if (typeof PdfEngine !== 'undefined') {
      PdfEngine.fromElement(currentTitle, document.getElementById('reportOutput'));
    } else {
      exportElementToPDF(document.getElementById('reportOutput'), currentTitle);
    }
  }

  function exportDisputePDF() {
    exportFullDisputePDF();
  }

  function exportExcel() {
    if (!currentReport) return;
    const table = document.querySelector('#reportOutput table');
    if (!table) return;
    exportTableToCSV(table, currentTitle.replace(/\s+/g, '_') + '.csv');
  }

  function exportDisputeExcel() {
    const table = document.querySelector('#disputeOutput table');
    if (table) exportTableToCSV(table, 'Partner_Dispute_Settlement.csv');
  }

  function exportTableToCSV(table, filename) {
    const rows = [];
    table.querySelectorAll('tr').forEach(tr => {
      const cols = [];
      tr.querySelectorAll('th, td').forEach(td => {
        cols.push('"' + td.textContent.trim().replace(/"/g, '""') + '"');
      });
      rows.push(cols.join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  function exportElementToPDF(element, title) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.text('Gitai Earthmovers — ' + formatDateTime(new Date().toISOString()), 14, 28);

    const tables = element.querySelectorAll('table');
    let startY = 35;
    tables.forEach((table, idx) => {
      doc.autoTable({
        html: table,
        startY: idx === 0 ? startY : doc.lastAutoTable.finalY + 10,
        theme: 'grid',
        headStyles: { fillColor: [26, 29, 33] },
        styles: { fontSize: 8 }
      });
    });
    doc.save(title.replace(/\s+/g, '_') + '.pdf');
  }

  function print() {
    const content = document.getElementById('reportOutput').innerHTML;
    printContent(currentTitle, content);
  }

  function printDispute() {
    printContent('Partner Dispute Settlement', document.getElementById('disputeOutput').innerHTML);
  }

  function printContent(title, content) {
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html><html><head><title>${title}</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
      <style>body{padding:2rem;font-size:12px} @media print{body{padding:0}}</style>
      </head><body>
      <h2>${title}</h2><p>Gitai Earthmovers — ${formatDateTime(new Date().toISOString())}</p>
      ${content}
      <script>window.onload=function(){window.print()}<\/script>
      </body></html>
    `);
    win.document.close();
  }

  return {
    generate,
    generateDisputeSettlement,
    generateFullDisputeReport,
    renderDisputeSection,
    renderPartnerAnalysis,
    exportExcel,
    exportPDF,
    print,
    exportDisputeExcel,
    exportDisputePDF,
    exportFullDisputePDF,
    printDispute
  };
})();
