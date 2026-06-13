/**
 * Gitai Earthmovers — Role-Based Access Control
 */
const AuthModule = (function () {
  const SESSION_KEY = 'earthmovers-session';

  const ROLES = ['Admin', 'Partner', 'Accountant', 'Viewer'];

  /** Permissions matrix: module → actions */
  const PERMISSIONS = {
    Admin: {
      '*': ['view', 'create', 'edit', 'delete', 'export', 'lock', 'unlock', 'backup', 'admin']
    },
    Partner: {
      dashboard: ['view'],
      partners: ['view'],
      machines: ['view'],
      income: ['view'],
      expenses: ['view'],
      emi: ['view'],
      loans: ['view'],
      assets: ['view'],
      documents: ['view'],
      reports: ['view', 'export'],
      dispute: ['view', 'export'],
      analytics: ['view'],
      receivables: ['view'],
      vendors: ['view'],
      cashflow: ['view'],
      'loan-dashboard': ['view'],
      'business-worth': ['view'],
      insights: ['view'],
      alerts: ['view']
    },
    Accountant: {
      dashboard: ['view'],
      partners: ['view', 'create', 'edit'],
      machines: ['view', 'create', 'edit'],
      income: ['view', 'create', 'edit', 'delete'],
      expenses: ['view', 'create', 'edit', 'delete'],
      emi: ['view', 'create', 'edit'],
      loans: ['view', 'create', 'edit'],
      assets: ['view', 'create', 'edit'],
      documents: ['view', 'create', 'edit'],
      reports: ['view', 'export'],
      analytics: ['view'],
      receivables: ['view'],
      vendors: ['view', 'create', 'edit'],
      cashflow: ['view'],
      'bank-recon': ['view', 'create', 'edit'],
      'loan-dashboard': ['view'],
      'business-worth': ['view'],
      insights: ['view'],
      alerts: ['view']
    },
    Viewer: {
      '*': ['view']
    }
  };

  /** Demo users — replace with Users sheet in production */
  const DEMO_USERS = [
    { ID: 1, Username: 'admin', Password: 'admin123', Role: 'Admin', Name: 'Administrator', Active: true },
    { ID: 2, Username: 'accountant', Password: 'acc123', Role: 'Accountant', Name: 'Finance Team', Active: true },
    { ID: 3, Username: 'partner', Password: 'partner123', Role: 'Partner', Name: 'Rajesh Gitai', Active: true },
    { ID: 4, Username: 'viewer', Password: 'view123', Role: 'Viewer', Name: 'Auditor', Active: true }
  ];

  let currentUser = null;

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch {
      return null;
    }
  }

  function saveSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      id: user.ID,
      username: user.Username,
      role: user.Role,
      name: user.Name,
      loginAt: new Date().toISOString()
    }));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    currentUser = null;
  }

  function findUser(username, password) {
    const users = AppData.users?.length ? AppData.users : DEMO_USERS;
    return users.find(u =>
      u.Username === username &&
      u.Password === password &&
      (u.Active === true || u.Active === 'TRUE' || u.Active === 'true' || u.Active === 1)
    );
  }

  async function login(username, password) {
    if (!AppData.users?.length) {
      const result = await ApiClient.get('users');
      if (result.success) AppData.users = result.data || [];
    }

    const user = findUser(username, password);
    if (!user) return { success: false, error: 'Invalid credentials' };

    currentUser = user;
    saveSession(user);

    await AuditTrailModule.log('LOGIN', 'Auth', user.ID, '', JSON.stringify({ username: user.Username, role: user.Role }), 'User login');

    return { success: true, user };
  }

  async function logout() {
    if (currentUser) {
      await AuditTrailModule.log('LOGOUT', 'Auth', currentUser.ID || currentUser.Username, '', '', 'User logout');
    }
    clearSession();
    showLoginScreen();
  }

  function restoreSession() {
    const session = getSession();
    if (!session) return false;
    const users = AppData.users?.length ? AppData.users : DEMO_USERS;
    currentUser = users.find(u => u.Username === session.username) || {
      Username: session.username,
      Role: session.role,
      Name: session.name,
      ID: session.id
    };
    return true;
  }

  function getUser() {
    return currentUser || restoreSession() ? currentUser : null;
  }

  function getRole() {
    return getUser()?.Role || 'Viewer';
  }

  function can(module, action) {
    const role = getRole();
    const matrix = PERMISSIONS[role] || PERMISSIONS.Viewer;

    if (matrix['*']?.includes(action) || matrix['*']?.includes('admin')) return true;

    const modPerms = matrix[module] || matrix['*'] || [];
    if (modPerms.includes(action)) return true;
    if (action === 'view' && modPerms.length > 0) return modPerms.includes('view');
    return false;
  }

  function isAdmin() {
    return getRole() === 'Admin';
  }

  function require(module, action) {
    if (!can(module, action)) {
      App.showAlert('Access denied. Your role (' + getRole() + ') cannot perform this action.', 'danger');
      return false;
    }
    return true;
  }

  function applyNavPermissions() {
    document.querySelectorAll('.sidebar-nav .nav-link[data-section]').forEach(link => {
      const section = link.dataset.section;
      const adminOnly = link.classList.contains('admin-only');
      const parent = link.closest('.nav-item');

      if (adminOnly && !isAdmin()) {
        parent?.classList.add('d-none');
      } else if (!can(section, 'view') && section !== 'dashboard') {
        parent?.classList.add('d-none');
      } else {
        parent?.classList.remove('d-none');
      }
    });

    document.querySelectorAll('[data-perm]').forEach(el => {
      const [mod, action] = (el.dataset.perm || '').split(':');
      if (mod && action && !can(mod, action)) {
        el.classList.add('d-none');
      }
    });
  }

  function showLoginScreen() {
    document.getElementById('loginOverlay')?.classList.remove('d-none');
    document.querySelector('.app-wrapper')?.classList.add('blurred');
  }

  function hideLoginScreen() {
    document.getElementById('loginOverlay')?.classList.add('d-none');
    document.querySelector('.app-wrapper')?.classList.remove('blurred');
  }

  function updateUserDisplay() {
    const el = document.getElementById('currentUserDisplay');
    if (el && currentUser) {
      el.classList.remove('d-none');
      el.innerHTML = `<span class="badge badge-accent">${currentUser.Name}</span> <small class="text-muted">${currentUser.Role}</small>`;
    }
  }

  async function init() {
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('loginUsername').value.trim();
      const password = document.getElementById('loginPassword').value;
      const result = await login(username, password);
      if (result.success) {
        hideLoginScreen();
        updateUserDisplay();
        AuthModule.applyNavPermissions();
        App.showAlert('Welcome, ' + result.user.Name);
        await App.loadData();
      } else {
        document.getElementById('loginError').textContent = result.error;
      }
    });

    document.getElementById('logoutBtn')?.addEventListener('click', () => logout());

    if (restoreSession()) {
      hideLoginScreen();
      updateUserDisplay();
    } else if (CONFIG.DATA_MODE === 'excel') {
      await login('admin', 'admin123');
      hideLoginScreen();
      updateUserDisplay();
    } else {
      showLoginScreen();
    }
  }

  return {
    init,
    login,
    logout,
    getUser,
    getRole,
    can,
    isAdmin,
    require,
    applyNavPermissions,
    ROLES,
    PERMISSIONS,
    showLoginScreen,
    hideLoginScreen,
    updateUserDisplay
  };
})();
