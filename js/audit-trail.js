/**
 * Gitai Earthmovers — Enterprise Audit Trail
 * Immutable audit log — Admin view only
 */
const AuditTrailModule = (function () {
  const IMMUTABLE_MODULES = ['audit'];

  async function log(action, module, recordId, oldData, newData, remarks) {
    const user = AuthModule.getUser();
    const entry = {
      Timestamp: new Date().toISOString(),
      User: user?.Name || user?.Username || 'System',
      Module: module,
      Action: action,
      RecordID: recordId,
      OldData: typeof oldData === 'string' ? oldData : JSON.stringify(oldData || ''),
      NewData: typeof newData === 'string' ? newData : JSON.stringify(newData || ''),
      IPAddress: 'client-side',
      Remarks: remarks || ''
    };

    if (CONFIG.USE_MOCK_DATA) {
      const store = ApiClient._getMockStore?.();
      if (store) {
        const id = (store.audit?.length || 0) + 1;
        store.audit.unshift({ ID: id, ...entry });
      }
    } else {
      await ApiClient.post('audit', entry);
    }
  }

  function normalizeRecord(r) {
    return {
      ID: r.ID,
      Timestamp: r.Timestamp || r.DateTime,
      User: r.User || '—',
      Module: r.Module,
      Action: r.Action || r.UserAction,
      RecordID: r.RecordID,
      OldData: r.OldData || r.OldValue || '',
      NewData: r.NewData || r.NewValue || '',
      IPAddress: r.IPAddress || '—',
      Remarks: r.Remarks || ''
    };
  }

  function render() {
    if (!AuthModule.isAdmin()) {
      document.getElementById('section-audit').innerHTML = `
        <div class="section-header"><h1>Audit Trail</h1></div>
        <div class="alert alert-danger"><i class="bi bi-shield-lock"></i> Admin access required to view audit logs.</div>`;
      return;
    }

    const records = (AppData.audit || []).map(normalizeRecord);

    document.getElementById('auditStats').innerHTML = `
      <div class="col-md-3"><div class="card stat-card"><div class="card-body"><div class="stat-label">Total Events</div><div class="stat-value">${records.length}</div></div></div></div>
      <div class="col-md-3"><div class="card stat-card"><div class="card-body"><div class="stat-label">Creates</div><div class="stat-value">${records.filter(r => r.Action === 'CREATE').length}</div></div></div></div>
      <div class="col-md-3"><div class="card stat-card"><div class="card-body"><div class="stat-label">Updates</div><div class="stat-value">${records.filter(r => r.Action === 'UPDATE').length}</div></div></div></div>
      <div class="col-md-3"><div class="card stat-card"><div class="card-body"><div class="stat-label">Exports</div><div class="stat-value">${records.filter(r => r.Action === 'EXPORT').length}</div></div></div></div>
    `;

    App.destroyDataTable('auditTable');
    document.querySelector('#auditTable tbody').innerHTML = records.map(r => `
      <tr>
        <td>${r.ID}</td>
        <td>${formatDateTime(r.Timestamp)}</td>
        <td>${r.User}</td>
        <td>${r.Module}</td>
        <td><span class="badge bg-secondary">${r.Action}</span></td>
        <td>${r.RecordID}</td>
        <td><small class="audit-json" title="${escapeHtml(r.OldData)}">${truncate(r.OldData, 60)}</small></td>
        <td><small class="audit-json" title="${escapeHtml(r.NewData)}">${truncate(r.NewData, 60)}</small></td>
        <td>${r.IPAddress}</td>
        <td>${r.Remarks || '—'}</td>
      </tr>
    `).join('');
    App.initDataTable('auditTable', { order: [[1, 'desc']] });
  }

  function truncate(str, len) {
    if (!str) return '—';
    return str.length > len ? str.substring(0, len) + '…' : str;
  }

  function escapeHtml(str) {
    return String(str).replace(/"/g, '&quot;');
  }

  function logExport(reportName) {
    return log('EXPORT', 'Reports', reportName, '', reportName, 'Report exported');
  }

  return { log, render, logExport, normalizeRecord, IMMUTABLE_MODULES };
})();
