/**
 * Gitai Earthmovers — Accounting Period / Month Locking
 */
const MonthLockModule = (function () {
  const DATE_FIELDS = {
    income: 'Date',
    expenses: 'Date',
    partners: 'Date',
    emi: 'DueDate'
  };

  function getLockedMonths() {
    return (AppData.monthlocks || []).filter(m =>
      m.Status === 'Locked' || m.Status === 'locked' || (!m.Status && !m.UnlockedDate)
    );
  }

  function isMonthLocked(year, month) {
    return getLockedMonths().some(m =>
      parseInt(m.Year, 10) === parseInt(year, 10) &&
      parseInt(m.Month, 10) === parseInt(month, 10)
    );
  }

  function isDateLocked(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    return isMonthLocked(d.getFullYear(), d.getMonth() + 1);
  }

  function validateMutation(endpoint, data, existingRecord) {
    if (!AuthModule.can('monthlock', 'lock') && AuthModule.isAdmin()) {
      // admin bypass only when unlocking - actually admin should still respect locks unless they unlock first
    }

    const dateField = DATE_FIELDS[endpoint];
    if (!dateField) return { allowed: true };

    const datesToCheck = [];
    if (data?.[dateField]) datesToCheck.push(data[dateField]);
    if (existingRecord?.[dateField]) datesToCheck.push(existingRecord[dateField]);

    for (const dt of datesToCheck) {
      if (isDateLocked(dt)) {
        const d = new Date(dt);
        return {
          allowed: false,
          error: `Month ${d.toLocaleString('en-IN', { month: 'long', year: 'numeric' })} is locked. No edits allowed. Contact Admin to unlock.`
        };
      }
    }
    return { allowed: true };
  }

  async function closeMonth(month, year) {
    if (!AuthModule.require('monthlock', 'lock')) return;

    if (isMonthLocked(year, month)) {
      App.showAlert('This month is already locked.', 'warning');
      return;
    }

    const user = AuthModule.getUser();
    const data = {
      Month: parseInt(month, 10),
      Year: parseInt(year, 10),
      LockedBy: user?.Name || 'Admin',
      LockedDate: new Date().toISOString(),
      Status: 'Locked',
      UnlockReason: '',
      UnlockedBy: '',
      UnlockedDate: ''
    };

    const result = await ApiClient.post('monthlocks', data);
    if (result.success) {
      await AuditTrailModule.log('LOCK', 'MonthLock', `${year}-${month}`, '', JSON.stringify(data), 'Month closed');
      App.showAlert(`${getMonthName(month)} ${year} locked successfully`);
      await App.loadData();
    }
  }

  async function reopenMonth(id, reason) {
    if (!AuthModule.isAdmin()) {
      App.showAlert('Only Admin can unlock months.', 'danger');
      return;
    }
    if (!reason?.trim()) {
      App.showAlert('Unlock reason is required.', 'warning');
      return;
    }

    const lock = AppData.monthlocks.find(m => m.ID == id);
    if (!lock) return;

    const user = AuthModule.getUser();
    const result = await ApiClient.put('monthlocks', {
      Status: 'Unlocked',
      UnlockReason: reason,
      UnlockedBy: user?.Name || 'Admin',
      UnlockedDate: new Date().toISOString()
    }, id);

    if (result.success) {
      await AuditTrailModule.log('UNLOCK', 'MonthLock', id, JSON.stringify(lock), JSON.stringify(result.data), reason);
      App.showAlert('Month unlocked');
      await App.loadData();
    }
  }

  function getMonthName(m) {
    return new Date(2000, m - 1, 1).toLocaleString('en-IN', { month: 'long' });
  }

  function render() {
    if (!AuthModule.isAdmin()) {
      document.getElementById('monthLockContent').innerHTML =
        '<div class="alert alert-warning">Admin access required to manage month locks.</div>';
      return;
    }

    const locked = getLockedMonths();
    document.getElementById('lockedMonthsList').innerHTML = locked.length === 0
      ? '<p class="text-muted">No months currently locked.</p>'
      : `<table class="table table-sm"><thead><tr><th>Period</th><th>Locked By</th><th>Locked Date</th><th>Actions</th></tr></thead>
        <tbody>${locked.map(m => `
          <tr>
            <td><strong>${getMonthName(m.Month)} ${m.Year}</strong></td>
            <td>${m.LockedBy}</td>
            <td>${formatDateTime(m.LockedDate)}</td>
            <td>${AuthModule.isAdmin() ? `<button class="btn btn-sm btn-outline-warning" onclick="MonthLockModule.promptUnlock(${m.ID})">Reopen</button>` : '—'}</td>
          </tr>
        `).join('')}</tbody></table>`;

    const allLocks = AppData.monthlocks || [];
    App.destroyDataTable('monthLocksTable');
    document.querySelector('#monthLocksTable tbody').innerHTML = allLocks.map(m => `
      <tr>
        <td>${m.ID}</td>
        <td>${getMonthName(m.Month)} ${m.Year}</td>
        <td><span class="badge ${m.Status === 'Locked' ? 'bg-danger' : 'bg-success'}">${m.Status}</span></td>
        <td>${m.LockedBy || '—'}</td>
        <td>${formatDateTime(m.LockedDate)}</td>
        <td>${m.UnlockedBy || '—'}</td>
        <td>${m.UnlockReason || '—'}</td>
      </tr>
    `).join('');
    App.initDataTable('monthLocksTable');
  }

  function promptUnlock(id) {
    const reason = prompt('Enter reason for unlocking this month (required for audit):');
    if (reason) reopenMonth(id, reason);
  }

  function init() {
    document.getElementById('closeMonthForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const month = document.getElementById('lockMonth').value;
      const year = document.getElementById('lockYear').value;
      await closeMonth(month, year);
    });

    const now = new Date();
    document.getElementById('lockMonth').value = now.getMonth() + 1;
    document.getElementById('lockYear').value = now.getFullYear();
  }

  return {
    init,
    render,
    isDateLocked,
    isMonthLocked,
    validateMutation,
    closeMonth,
    reopenMonth,
    promptUnlock,
    getLockedMonths
  };
})();
