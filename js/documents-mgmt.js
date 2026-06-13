/**
 * Gitai Earthmovers — Enhanced Document Management
 */
const DocumentsMgmtModule = (function () {
  const CATEGORIES = CONFIG.DOCUMENT_CATEGORIES;

  function init() {
    document.getElementById('docMgmtForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!AuthModule.can('documents', 'create')) return;

      const id = document.getElementById('docMgmtId').value;
      const data = {
        Category: document.getElementById('docMgmtCategory').value,
        ReferenceID: document.getElementById('docMgmtRefId').value,
        ReferenceModule: document.getElementById('docMgmtRefModule').value,
        UploadDate: todayISO(),
        UploadedBy: AuthModule.getUser()?.Name || 'System',
        FileName: document.getElementById('docMgmtFileName').value,
        DriveLink: document.getElementById('docMgmtDriveLink').value,
        Version: 1,
        Date: todayISO(),
        DocumentType: document.getElementById('docMgmtCategory').value,
        GoogleDriveLink: document.getElementById('docMgmtDriveLink').value
      };

      if (id) {
        const existing = AppData.documents.find(d => d.ID == id);
        data.Version = parseNum(existing?.Version) + 1;
        await ApiClient.put('documents', { ...data, ID: parseInt(id) }, id);
        await ApiClient.post('documentversions', {
          DocumentID: id,
          Version: data.Version,
          UploadDate: data.UploadDate,
          UploadedBy: data.UploadedBy,
          FileName: data.FileName,
          DriveLink: data.DriveLink
        });
      } else {
        await ApiClient.post('documents', data);
      }

      bootstrap.Modal.getInstance(document.getElementById('docMgmtModal')).hide();
      App.showAlert('Document saved');
      await App.loadData();
    });

    document.getElementById('docMgmtModal')?.addEventListener('show.bs.modal', () => {
      document.getElementById('docMgmtForm')?.reset();
      document.getElementById('docMgmtId').value = '';
      document.getElementById('docMgmtCategory').innerHTML = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
      document.getElementById('docMgmtRefModule').innerHTML = ['income', 'expenses', 'emi', 'partners', 'machines', 'loans'].map(m =>
        `<option value="${m}">${m}</option>`
      ).join('');
    });
  }

  function getVersions(docId) {
    return (AppData.documentversions || []).filter(v => v.DocumentID == docId);
  }

  function render() {
    const docs = AppData.documents || [];
    const filter = document.getElementById('docFilterCategory')?.value;

    const filtered = filter ? docs.filter(d => (d.Category || d.DocumentType) === filter) : docs;

    if (document.getElementById('docFilterCategory')) {
      document.getElementById('docFilterCategory').innerHTML =
        '<option value="">All Categories</option>' + CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
      document.getElementById('docFilterCategory').onchange = render;
    }

    App.destroyDataTable('docMgmtTable');
    document.querySelector('#docMgmtTable tbody').innerHTML = filtered.map(d => {
      const versions = getVersions(d.ID);
      const link = d.DriveLink || d.GoogleDriveLink;
      return `<tr>
        <td>${d.ID}</td>
        <td><span class="badge badge-accent">${d.Category || d.DocumentType}</span></td>
        <td>${d.ReferenceModule || '—'} #${d.ReferenceID || '—'}</td>
        <td>${formatDate(d.UploadDate || d.Date)}</td>
        <td>${d.UploadedBy || '—'}</td>
        <td>${d.FileName}</td>
        <td>v${d.Version || 1}${versions.length ? ` (+${versions.length} history)` : ''}</td>
        <td>
          ${link ? `<a href="${link}" target="_blank" class="btn btn-sm btn-outline-accent action-btn" title="Preview"><i class="bi bi-eye"></i></a>
          <a href="${link}" download class="btn btn-sm btn-outline-accent action-btn" title="Download"><i class="bi bi-download"></i></a>` : '—'}
          <button class="btn btn-sm btn-outline-secondary action-btn" onclick="DocumentsMgmtModule.showVersions(${d.ID})" title="Versions"><i class="bi bi-clock-history"></i></button>
        </td>
      </tr>`;
    }).join('');
    App.initDataTable('docMgmtTable');
  }

  function showVersions(docId) {
    const doc = AppData.documents.find(d => d.ID == docId);
    const versions = getVersions(docId);
    const html = `<h6>Version History: ${doc?.FileName}</h6>
      <table class="table table-sm"><thead><tr><th>Version</th><th>Date</th><th>By</th><th>File</th></tr></thead>
      <tbody>
        <tr><td>v${doc.Version || 1} (current)</td><td>${formatDate(doc.UploadDate || doc.Date)}</td><td>${doc.UploadedBy || '—'}</td><td><a href="${doc.DriveLink || doc.GoogleDriveLink}" target="_blank">Open</a></td></tr>
        ${versions.map(v => `<tr><td>v${v.Version}</td><td>${formatDate(v.UploadDate)}</td><td>${v.UploadedBy}</td><td><a href="${v.DriveLink}" target="_blank">Open</a></td></tr>`).join('')}
      </tbody></table>`;
    document.getElementById('docVersionModalBody').innerHTML = html;
    new bootstrap.Modal(document.getElementById('docVersionModal')).show();
  }

  return { init, render, showVersions, CATEGORIES };
})();

/**
 * Partner Settlement Engine — Enhanced formulas
 */
const PartnerSettlementEngine = (function () {
  function emptyPartner(name) {
    return {
      name,
      capitalIntroduced: 0,
      additionalCapital: 0,
      withdrawals: 0,
      emiPaidByPartner: 0,
      profitShare: 0,
      lossShare: 0,
      settlement: 0
    };
  }

  function calculate() {
    const netProfit = App.getNetProfit();
    const isLoss = netProfit < 0;
    const totalCapital = App.getTotalPartnerInvestment();
    const emiContribs = EmiPaymentHelper.partnerContributions(AppData.emi || []);

    const partners = {};
    AppData.partners.forEach(p => {
      const name = p.PartnerName;
      if (!partners[name]) partners[name] = emptyPartner(name);
      if (p.TransactionType === 'Investment') {
        if (partners[name].capitalIntroduced === 0) {
          partners[name].capitalIntroduced += parseNum(p.Amount);
        } else {
          partners[name].additionalCapital += parseNum(p.Amount);
        }
      } else {
        partners[name].withdrawals += parseNum(p.Amount);
      }
    });

    Object.entries(emiContribs).forEach(([name, amount]) => {
      if (!partners[name]) partners[name] = emptyPartner(name);
      partners[name].emiPaidByPartner += amount;
    });

    Object.values(partners).forEach(p => {
      const totalInv = p.capitalIntroduced + p.additionalCapital;
      const ratio = totalCapital > 0 ? totalInv / totalCapital : 0;
      p.sharePercent = (ratio * 100).toFixed(1);

      if (isLoss) {
        p.lossShare = Math.abs(netProfit) * ratio;
        p.profitShare = 0;
      } else {
        p.profitShare = netProfit * ratio;
        p.lossShare = 0;
      }

      p.settlement = totalInv + p.additionalCapital - p.withdrawals + p.profitShare - p.lossShare + p.emiPaidByPartner;
      p.netCapital = totalInv - p.withdrawals;
    });

    return Object.values(partners);
  }

  function renderContributionCharts() {
    const timeline = {};
    AppData.partners.filter(p => p.TransactionType === 'Investment').forEach(p => {
      const k = getMonthKey(p.Date);
      if (!timeline[k]) timeline[k] = {};
      timeline[k][p.PartnerName] = (timeline[k][p.PartnerName] || 0) + parseNum(p.Amount);
    });

    const labels = Object.keys(timeline).sort();
    const partnerNames = [...new Set(AppData.partners.map(p => p.PartnerName))];

    if (window.partnerTrendChart) window.partnerTrendChart.destroy();
    window.partnerTrendChart = new Chart(document.getElementById('chartPartnerTrend'), {
      type: 'line',
      data: {
        labels,
        datasets: partnerNames.map((name, i) => ({
          label: name,
          data: labels.map(l => timeline[l]?.[name] || 0),
          borderColor: ['#f5c518', '#3b82f6', '#22c55e', '#f97316'][i % 4],
          tension: 0.3
        }))
      },
      options: { responsive: true }
    });

    const totals = partnerNames.map(name => ({
      name,
      total: AppData.partners.filter(p => p.PartnerName === name && p.TransactionType === 'Investment')
        .reduce((s, p) => s + parseNum(p.Amount), 0)
    }));

    if (window.partnerCompareChart) window.partnerCompareChart.destroy();
    window.partnerCompareChart = new Chart(document.getElementById('chartPartnerCompare'), {
      type: 'doughnut',
      data: {
        labels: totals.map(t => t.name),
        datasets: [{ data: totals.map(t => t.total), backgroundColor: ['#f5c518', '#3b82f6', '#22c55e'] }]
      },
      options: { responsive: true }
    });
  }

  return { calculate, renderContributionCharts };
})();
