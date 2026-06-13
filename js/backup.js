/**
 * Gitai Earthmovers — Backup System
 */
const BackupModule = (function () {
  async function createBackup(type) {
    if (!AuthModule.isAdmin()) return;

    const user = AuthModule.getUser();
    const timestamp = new Date().toISOString();

    if (type === 'excel' && CONFIG.DATA_MODE === 'excel') {
      await ApiClient.saveToExcel();
      await logBackup('Excel', CONFIG.EXCEL_FILE, timestamp, user);
      App.showAlert('Downloaded ' + CONFIG.EXCEL_FILE);
      return;
    }

    const payload = { exportedAt: timestamp, version: CONFIG.APP_VERSION, data: { ...AppData } };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const filename = `earthmovers_backup_${timestamp.split('T')[0]}.json`;
    downloadBlob(blob, filename);
    await logBackup('JSON', filename, timestamp, user);
    App.showAlert('Backup downloaded: ' + filename);
    await App.loadData();
  }

  async function logBackup(type, filename, timestamp, user) {
    await ApiClient.post('backups', {
      DateTime: timestamp,
      Type: type,
      DriveLink: filename,
      CreatedBy: user?.Name || 'Admin',
      Status: 'Completed',
      FileSize: 0
    });
    await AuditTrailModule.log('BACKUP', 'System', type, '', filename, 'Local backup created');
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
    document.getElementById('btnImportJson')?.addEventListener('click', () => {
      document.getElementById('importJsonFile')?.click();
    });
    document.getElementById('importJsonFile')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file || !AuthModule.isAdmin()) return;
      try {
        const parsed = JSON.parse(await file.text());
        await ApiClient.importLocalData(parsed.data || parsed);
        await App.loadData();
        App.showAlert('Imported ' + file.name);
      } catch (err) {
        App.showAlert('Import failed: ' + err.message, 'danger');
      }
      e.target.value = '';
    });
  }

  return { init, render, createBackup };
})();
