/**
 * Gitai Earthmovers — Backup System
 */
const BackupModule = (function () {
  async function createBackup(type) {
    if (!AuthModule.require('backup', 'backup') && !AuthModule.isAdmin()) return;

    const user = AuthModule.getUser();
    const timestamp = new Date().toISOString();

    if (CONFIG.USE_MOCK_DATA) {
      await runLocalBackup(type, timestamp, user);
    } else {
      const result = await ApiClient.action('backup', { type, createdBy: user?.Name });
      if (result.success) {
        App.showAlert('Backup created: ' + result.data.DriveLink);
        await App.loadData();
      } else {
        App.showAlert(result.error, 'danger');
      }
    }
  }

  async function runLocalBackup(type, timestamp, user) {
    const payload = {
      exportedAt: timestamp,
      version: CONFIG.APP_VERSION,
      data: { ...AppData }
    };

    let blob, filename, mime;

    if (type === 'json') {
      blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      filename = `earthmovers_backup_${timestamp.split('T')[0]}.json`;
      mime = 'JSON';
    } else if (type === 'excel') {
      const csv = buildFullCsvExport();
      blob = new Blob([csv], { type: 'text/csv' });
      filename = `earthmovers_backup_${timestamp.split('T')[0]}.csv`;
      mime = 'Excel/CSV';
    } else {
      App.showAlert('Sheet copy backup requires Google Apps Script deployment.', 'info');
      return;
    }

    downloadBlob(blob, filename);

    await ApiClient.post('backups', {
      DateTime: timestamp,
      Type: mime,
      DriveLink: filename,
      CreatedBy: user?.Name || 'Admin',
      Status: 'Completed',
      FileSize: blob.size
    });

    await AuditTrailModule.log('BACKUP', 'System', type, '', filename, 'Local backup created');
    App.showAlert('Backup downloaded: ' + filename);
    await App.loadData();
  }

  function buildFullCsvExport() {
    const lines = ['# Gitai Earthmovers Backup - ' + new Date().toISOString()];
    Object.keys(AppData).forEach(key => {
      const rows = AppData[key];
      if (!Array.isArray(rows) || rows.length === 0) return;
      lines.push('\n## ' + key.toUpperCase());
      const headers = Object.keys(rows[0]);
      lines.push(headers.join(','));
      rows.forEach(r => {
        lines.push(headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','));
      });
    });
    return lines.join('\n');
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  function render() {
    if (!AuthModule.isAdmin()) {
      document.getElementById('backupContent').innerHTML =
        '<div class="alert alert-warning">Admin access required for backup management.</div>';
      return;
    }

    document.querySelector('#backupsTable tbody').innerHTML = (AppData.backups || []).map(b => `
      <tr>
        <td>${b.ID}</td>
        <td>${formatDateTime(b.DateTime)}</td>
        <td>${b.Type}</td>
        <td>${b.DriveLink || '—'}</td>
        <td>${b.CreatedBy}</td>
        <td><span class="badge bg-success">${b.Status}</span></td>
      </tr>
    `).join('') || '<tr><td colspan="6" class="text-muted">No backups yet</td></tr>';
    App.initDataTable('backupsTable');
  }

  function init() {
    document.getElementById('btnBackupJson')?.addEventListener('click', () => createBackup('json'));
    document.getElementById('btnBackupExcel')?.addEventListener('click', () => createBackup('excel'));
    document.getElementById('btnBackupSheet')?.addEventListener('click', () => createBackup('sheet'));
  }

  return { init, render, createBackup };
})();
