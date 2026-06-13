# Migration Guide: Phase 1 → Phase 2

This guide covers upgrading the Gitai Earthmovers system from Phase 1 to the enterprise Phase 2–6 release (v2.0.0).

## Overview

Phase 2 adds **17 new modules** without replacing Phase 1 functionality. All existing sheets remain compatible. New sheets and columns are additive.

## Step 1: Backup Existing Data

Before any migration:

1. **File → Make a copy** of your Google Spreadsheet
2. Run **Backup → JSON Export** from the app (Admin login)
3. Store backup in Google Drive

## Step 2: Add New Google Sheets

Run `initializeSpreadsheet()` in Apps Script after deploying updated `appscript.gs`. This creates:

| Sheet | Purpose |
|-------|---------|
| `MonthLocks` | Accounting period locking |
| `Users` | Role-based access |
| `Vendors` | Vendor master |
| `VendorTransactions` | Vendor ledger |
| `BankStatements` | Bank reconciliation |
| `MachineUtilization` | Utilization tracking |
| `DocumentVersions` | Document version history |
| `Backups` | Backup audit log |

## Step 3: Migrate Existing Sheets

### AuditLog (REQUIRED — column rename)

**Old columns:**
`ID, DateTime, UserAction, Module, RecordID, OldValue, NewValue`

**New columns:**
`ID, Timestamp, User, Module, Action, RecordID, OldData, NewData, IPAddress, Remarks`

**Migration script** (Apps Script editor):

```javascript
function migrateAuditLog() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('AuditLog');
  var data = sheet.getDataRange().getValues();
  var newHeaders = ['ID','Timestamp','User','Module','Action','RecordID','OldData','NewData','IPAddress','Remarks'];
  sheet.clear();
  sheet.appendRow(newHeaders);
  for (var i = 1; i < data.length; i++) {
    sheet.appendRow([
      data[i][0],
      data[i][1],
      'Legacy',
      data[i][3],
      data[i][2],
      data[i][4],
      data[i][5],
      data[i][6],
      '',
      'Migrated from Phase 1'
    ]);
  }
}
```

### Documents (OPTIONAL — extended schema)

Add columns if missing: `Category, ReferenceID, ReferenceModule, UploadDate, UploadedBy, DriveLink, Version`

Copy existing data:
- `DocumentType` → `Category`
- `GoogleDriveLink` → `DriveLink`
- `Date` → `UploadDate`

### Partners (OPTIONAL)

No schema change. Enhanced settlement engine uses same data with improved formulas.

## Step 4: Deploy Updated Apps Script

1. Replace `google-apps-script/Code.gs` in Apps Script editor with v2.0 code
2. Set `SPREADSHEET_ID`, `BACKUP_FOLDER_ID`, `DOCUMENTS_FOLDER_ID`
3. Run `initializeSpreadsheet()`
4. Run `migrateAuditLog()` if upgrading existing audit data
5. **Deploy → New version** of Web App

## Step 5: Update Frontend

1. Replace all files in `js/`, `css/`, `index.html`
2. Add new folders: `partials/`
3. In `js/config.js`:
   ```javascript
   USE_MOCK_DATA: false,
   API_BASE_URL: 'your-deployed-url',
   ```
4. Serve via HTTPS (required for fetch of partials)

## Step 6: Create Users

Add rows to `Users` sheet:

| ID | Username | Password | Role | Name | Active |
|----|----------|----------|------|------|--------|
| 1 | admin | your-secure-password | Admin | Administrator | TRUE |
| 2 | accountant | ... | Accountant | Finance | TRUE |

**Security note:** Passwords are stored in plain text in Sheets for this architecture. For production, integrate Google OAuth or hash passwords server-side.

## Step 7: Lock Historical Months (Recommended)

1. Login as Admin
2. Navigate to **Month Lock**
3. Close each completed month from Jan 2022 onward
4. This prevents retroactive edits for audit integrity

## Step 8: Verify Migration

Checklist:

- [ ] Login works for all roles
- [ ] Dashboard shows alerts & insights
- [ ] Income/Expense CRUD blocked for locked months
- [ ] Audit trail shows new schema (Admin only)
- [ ] Partner dispute report generates full PDF
- [ ] Bank CSV import works
- [ ] Backup creates Sheet copy (live mode)

## Role Permissions Matrix

| Module | Admin | Accountant | Partner | Viewer |
|--------|-------|------------|---------|--------|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| CRUD (Income/Expense) | ✓ | ✓ | — | — |
| Reports/Export | ✓ | ✓ | ✓ | — |
| Analytics | ✓ | ✓ | ✓ | ✓ |
| Bank Recon | ✓ | ✓ | — | — |
| Month Lock | ✓ | — | — | — |
| Audit Trail | ✓ | — | — | — |
| Backup | ✓ | — | — | — |
| Dispute Report | ✓ | ✓ | ✓ | — |

## Rollback

If issues occur:

1. Restore spreadsheet from backup copy
2. Redeploy Phase 1 Apps Script
3. Use Phase 1 frontend files from git history

## Performance (5+ Years Data)

- DataTables default page size: 25 (handles large datasets)
- Charts aggregate by month (not row-level)
- Consider archiving pre-2022 data to separate sheet after verification
- Apps Script: batch reads via `getDataRange()` — acceptable up to ~50K rows per sheet

## Support

Refer to `README.md` for full API reference and folder structure.
