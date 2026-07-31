/**
 * Gitai Earthmovers — Standalone mode (Gitai.xlsx, no cloud)
 */
const StandaloneModule = (function () {
  function updateSaveStatus() {
    const el = document.getElementById('saveStatusBadge');
    if (!el || !CONFIG.STANDALONE) return;

    const dirty = ApiClient.isDirty();
    const meta = ApiClient.getMeta();

    if (dirty) {
      el.className = 'badge bg-warning text-dark';
      el.textContent = 'Unsaved changes';
      el.title = 'Click Save to Excel, replace files in project folder, then Sync from Excel when you edit Excel outside';
    } else if (meta.lastSavedAt) {
      el.className = 'badge bg-success';
      el.textContent = 'In sync';
      el.title = 'Last saved: ' + formatDateTime(meta.lastSavedAt) + ' — Sync from Excel to pull disk changes';
    } else {
      el.className = 'badge bg-secondary';
      el.textContent = 'Loaded from file';
      el.title = 'Data loaded from Gitai.xlsx — Sync from Excel to reload';
    }
  }

  function init() {
    if (!CONFIG.STANDALONE) return;

    window.addEventListener('beforeunload', (e) => {
      if (ApiClient.isDirty()) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    document.getElementById('saveStatusBadge')?.addEventListener('click', () => {
      if (ApiClient.isDirty()) {
        document.getElementById('btnSaveExcel')?.click();
      } else {
        document.getElementById('btnSyncExcel')?.click();
      }
    });

    document.getElementById('connectionBadge')?.addEventListener('click', () => {
      App.showAlert(
        '<strong>Save to Excel</strong> = App → files<br>' +
        '<strong>Sync from Excel</strong> = Gitai.xlsx on disk → App<br>' +
        'Edit <code>Gitai.xlsx</code> in Excel, save the file, then click Sync.',
        'info'
      );
    });
  }

  return { init, updateSaveStatus };
})();
