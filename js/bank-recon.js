/**
 * Gitai Earthmovers — Bank Reconciliation Module
 */
const BankReconModule = (function () {
  function parseCsv(text) {
    const lines = text.trim().split('\n');
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
      if (cols.length >= 3) {
        rows.push({
          Date: cols[0],
          Description: cols[1],
          Debit: parseNum(cols[2]),
          Credit: parseNum(cols[3] || 0),
          Balance: parseNum(cols[4] || 0)
        });
      }
    }
    return rows;
  }

  function autoMatch(bankRow) {
    const amount = bankRow.Credit || bankRow.Debit;
    const desc = (bankRow.Description || '').toLowerCase();

    // Match income
    const income = AppData.income.find(i =>
      Math.abs(parseNum(i.ReceivedAmount) - amount) < 1 &&
      Math.abs(daysDiff(i.Date, bankRow.Date)) <= 5
    );
    if (income) return { module: 'Income', recordId: income.ID, status: 'Matched' };

    // Match expenses
    const expense = AppData.expenses.find(e =>
      Math.abs(parseNum(e.Amount) - amount) < 1 &&
      Math.abs(daysDiff(e.Date, bankRow.Date)) <= 5
    );
    if (expense) return { module: 'Expenses', recordId: expense.ID, status: 'Matched' };

    // Match EMI
    const emi = AppData.emi.find(e =>
      Math.abs(parseNum(e.TotalPaid || e.EMIAmount) - amount) < 1
    );
    if (emi) return { module: 'EMI', recordId: emi.ID, status: 'Matched' };

    // Match partner
    const partner = AppData.partners.find(p =>
      Math.abs(parseNum(p.Amount) - amount) < 1
    );
    if (partner) return { module: 'Partners', recordId: partner.ID, status: 'Matched' };

    if (desc.includes('emi') || desc.includes('loan')) return { module: 'EMI', recordId: '', status: 'Partial' };

    return { module: '', recordId: '', status: 'Unmatched' };
  }

  function daysDiff(d1, d2) {
    return Math.abs(new Date(d1) - new Date(d2)) / (1000 * 60 * 60 * 24);
  }

  async function importCsv(file) {
    if (!AuthModule.can('bank-recon', 'create')) return;

    const text = await file.text();
    const rows = parseCsv(text);
    let matched = 0;

    for (const row of rows) {
      const match = autoMatch(row);
      if (match.status === 'Matched') matched++;

      await ApiClient.post('bankstatements', {
        Date: row.Date,
        Description: row.Description,
        Debit: row.Debit,
        Credit: row.Credit,
        Balance: row.Balance,
        MatchedModule: match.module,
        MatchedRecordID: match.recordId,
        MatchStatus: match.status
      });
    }

    App.showAlert(`Imported ${rows.length} rows. ${matched} auto-matched.`);
    await App.loadData();
  }

  function render() {
    const stmts = AppData.bankstatements || [];
    const unmatched = stmts.filter(s => s.MatchStatus === 'Unmatched');

    document.getElementById('reconSummary').innerHTML = `
      <div class="col-md-4"><div class="card stat-card"><div class="card-body"><div class="stat-label">Total Entries</div><div class="stat-value">${stmts.length}</div></div></div></div>
      <div class="col-md-4"><div class="card stat-card"><div class="card-body"><div class="stat-label">Matched</div><div class="stat-value text-success">${stmts.filter(s => s.MatchStatus === 'Matched').length}</div></div></div></div>
      <div class="col-md-4"><div class="card stat-card"><div class="card-body"><div class="stat-label">Unmatched</div><div class="stat-value text-danger">${unmatched.length}</div></div></div></div>
    `;

    document.getElementById('unmatchedAlerts').innerHTML = unmatched.slice(0, 10).map(s =>
      `<div class="alert alert-warning py-2">${formatDate(s.Date)}: ${s.Description} — ${formatCurrency(s.Debit || s.Credit)}</div>`
    ).join('') || '<p class="text-muted">No unmatched entries</p>';

    App.destroyDataTable('bankReconTable');
    document.querySelector('#bankReconTable tbody').innerHTML = stmts.map(s => `
      <tr class="${s.MatchStatus === 'Unmatched' ? 'table-warning' : ''}">
        <td>${s.ID}</td><td>${formatDate(s.Date)}</td><td>${s.Description}</td>
        <td>${s.Debit ? formatCurrency(s.Debit) : '—'}</td>
        <td>${s.Credit ? formatCurrency(s.Credit) : '—'}</td>
        <td>${s.MatchedModule || '—'}</td>
        <td><span class="badge ${s.MatchStatus === 'Matched' ? 'bg-success' : s.MatchStatus === 'Partial' ? 'bg-warning text-dark' : 'bg-danger'}">${s.MatchStatus}</span></td>
      </tr>
    `).join('');
    App.initDataTable('bankReconTable');
  }

  function init() {
    document.getElementById('bankCsvInput')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) await importCsv(file);
      e.target.value = '';
    });

    document.getElementById('btnReconReport')?.addEventListener('click', () => {
      PdfEngine.fromElement('Bank Reconciliation Report', document.getElementById('bankReconSection'));
    });
  }

  return { init, render, importCsv, autoMatch };
})();
