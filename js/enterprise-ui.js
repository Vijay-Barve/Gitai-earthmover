/**
 * Inject enterprise UI sections into the SPA
 */
async function injectEnterpriseUI() {
  // Login overlay
  if (!document.getElementById('loginOverlay')) {
    document.body.insertAdjacentHTML('afterbegin', `
      <div id="loginOverlay" class="login-overlay">
        <div class="login-card card">
          <div class="card-body p-4">
            <div class="text-center mb-4">
              <i class="bi bi-truck-front-fill brand-icon fs-1"></i>
              <h4>Gitai Earthmovers</h4>
              <p class="text-muted small">Audit & Settlement System v2.0</p>
            </div>
            <form id="loginForm">
              <div class="mb-3"><label class="form-label">Username</label><input type="text" class="form-control" id="loginUsername" required></div>
              <div class="mb-3"><label class="form-label">Password</label><input type="password" class="form-control" id="loginPassword" required></div>
              <div id="loginError" class="text-danger small mb-2"></div>
              <button type="submit" class="btn btn-accent w-100">Sign In</button>
            </form>
            <p class="text-muted small mt-3 mb-0 text-center">Demo: admin/admin123 · accountant/acc123</p>
          </div>
        </div>
      </div>`);
  }

  // Enterprise sections
  try {
    const resp = await fetch('partials/enterprise-sections.html');
    if (resp.ok) {
      document.querySelector('.content-area')?.insertAdjacentHTML('beforeend', await resp.text());
    }
  } catch (err) {
    console.warn('Enterprise sections partial not loaded:', err);
  }

  // Enterprise modals
  if (!document.getElementById('docMgmtModal')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal fade" id="docMgmtModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">
        <div class="modal-header"><h5 class="modal-title">Document</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <form id="docMgmtForm"><div class="modal-body">
          <input type="hidden" id="docMgmtId">
          <div class="mb-3"><label class="form-label">Category</label><select class="form-select" id="docMgmtCategory" required></select></div>
          <div class="mb-3"><label class="form-label">Reference Module</label><select class="form-select" id="docMgmtRefModule"></select></div>
          <div class="mb-3"><label class="form-label">Reference ID</label><input type="text" class="form-control" id="docMgmtRefId"></div>
          <div class="mb-3"><label class="form-label">File Name</label><input type="text" class="form-control" id="docMgmtFileName" required></div>
          <div class="mb-3"><label class="form-label">Google Drive Link</label><input type="url" class="form-control" id="docMgmtDriveLink"></div>
        </div><div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-accent">Save</button></div></form>
      </div></div></div>
      <div class="modal fade" id="docVersionModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">
        <div class="modal-header"><h5 class="modal-title">Version History</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body" id="docVersionModalBody"></div>
      </div></div></div>
      <div class="modal fade" id="vendorModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">
        <div class="modal-header"><h5 class="modal-title">Vendor</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <form id="vendorForm"><div class="modal-body">
          <input type="hidden" id="vendorId">
          <div class="mb-3"><label class="form-label">Vendor Name</label><input type="text" class="form-control" id="vendorName" required></div>
          <div class="mb-3"><label class="form-label">Type</label><select class="form-select" id="vendorType"></select></div>
          <div class="mb-3"><label class="form-label">Contact</label><input type="text" class="form-control" id="vendorContact"></div>
          <div class="mb-3"><label class="form-label">Total Payable</label><input type="number" class="form-control" id="vendorPayable" min="0"></div>
          <div class="mb-3"><label class="form-label">Paid</label><input type="number" class="form-control" id="vendorPaid" min="0"></div>
          <div class="mb-3"><label class="form-label">Outstanding</label><input type="number" class="form-control" id="vendorOutstanding" readonly></div>
          <div class="mb-3"><label class="form-label">Remarks</label><textarea class="form-control" id="vendorRemarks" rows="2"></textarea></div>
        </div><div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-accent">Save</button></div></form>
      </div></div></div>`);
  }
}
