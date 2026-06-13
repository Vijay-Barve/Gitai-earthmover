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
      el.title = 'Click Save Excel and replace Gitai.xlsx in your project folder';
    } else if (meta.lastSavedAt) {
      el.className = 'badge bg-success';
      el.textContent = 'Saved to Excel';
      el.title = 'Last saved: ' + formatDateTime(meta.lastSavedAt);
    } else {
      el.className = 'badge bg-secondary';
      el.textContent = 'Loaded from file';
      el.title = 'Data loaded from Gitai.xlsx';
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
      document.getElementById('btnSaveExcel')?.click();
    });

    document.getElementById('connectionBadge')?.addEventListener('click', () => {
      if (ApiClient.isDirty()) {
        App.showAlert('You have unsaved changes. Click <strong>Save Excel</strong> and replace Gitai.xlsx in your project folder.', 'warning');
      } else {
        App.showAlert('Standalone mode — database file: <strong>Gitai.xlsx</strong> in this project folder.', 'info');
      }
    });
  }

  return { init, updateSaveStatus };
})();
