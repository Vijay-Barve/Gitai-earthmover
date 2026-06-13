# Gitai Earthmovers — Audit & Partner Settlement Management System

A production-ready single-page application for managing earthmoving business records since January 2022. Built for audit readiness and partner dispute resolution.

## Architecture (No Backend Server)

This app is **frontend + Google Sheets only**:

| Layer | What it is | Where it runs |
|-------|-----------|---------------|
| **Frontend** | `index.html` + `js/*.js` | Your browser (or static hosting) |
| **Database** | Google Spreadsheet (17 tabs) | Google Drive |
| **API** | `google-apps-script/Code.gs` | Inside Google Sheets (Apps Script) |

The `backend/` folder name was removed — use **`google-apps-script/Code.gs`**. You paste this into **Extensions → Apps Script** in your spreadsheet. You do **not** run Node, Python, or any server.

**Full setup guide:** [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript, Bootstrap 5 |
| Charts | Chart.js |
| Tables | DataTables |
| Database | Google Sheets |
| API | Google Apps Script (REST) |

## Folder Structure (v2.0)

```
Gitai earthmovers/
├── index.html
├── MIGRATION.md              # Phase 1 → 2 upgrade guide
├── css/style.css
├── js/
│   ├── config.js             # Extended endpoints & categories
│   ├── api.js                # Mock store + month lock validation
│   ├── auth.js               # Role-based access control
│   ├── audit-trail.js        # Immutable audit logging
│   ├── month-lock.js         # Accounting period locking
│   ├── pdf-engine.js         # Branded PDF reports
│   ├── alerts.js             # Dashboard alert center
│   ├── insights.js           # AI insights panel
│   ├── analytics.js          # Profitability, utilization, diesel
│   ├── receivables.js        # Customer ageing
│   ├── vendors.js            # Vendor management
│   ├── cashflow.js           # Cash flow, loan dash, business worth
│   ├── bank-recon.js         # Bank reconciliation
│   ├── backup.js             # Backup system
│   ├── documents-mgmt.js     # Document mgmt + partner settlement engine
│   ├── enterprise-ui.js      # Dynamic section injection
│   ├── app.js                # Main controller (extended)
│   ├── dashboard.js          # Dashboard + alerts widget
│   └── ... (Phase 1 modules)
├── partials/
│   └── enterprise-sections.html
└── google-apps-script/Code.gs  # Paste into Google Sheets → Apps Script (NOT a server)
```

> **No backend server.** See [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md) for connecting to Google Sheets.

See [MIGRATION.md](MIGRATION.md) for Phase 1 → 2 upgrade steps.

## Demo Login (v2.0)

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |
| accountant | acc123 | Accountant |
| partner | partner123 | Partner |
| viewer | view123 | Viewer |

## Quick Start (Demo Mode)

The app ships with **mock data enabled** so you can explore immediately without Google Sheets.

1. Open `index.html` in a browser, or serve locally:

```bash
# Python 3
python3 -m http.server 8080

# Node.js (if npx available)
npx serve .
```

2. Visit `http://localhost:8080`

3. Login with **admin / admin123** and explore all modules including Analytics, Alerts, AI Insights, Bank Recon, and Partner Dispute.

## Google Sheet Structure

Phase 1 uses **9 core sheets**. Phase 2 extends to **17 sheets**. Run `initializeSpreadsheet()` to create all sheets automatically.

**Core sheets:** Partners, Machines, Income, Expenses, EMI, Loans, Assets, Documents, AuditLog

**Phase 2 sheets:** MonthLocks, Users, Vendors, VendorTransactions, BankStatements, MachineUtilization, DocumentVersions, Backups

Full column specs and migration steps: see [MIGRATION.md](MIGRATION.md).

### 1. Partners
| ID | Date | PartnerName | TransactionType | Amount | Remarks |

### 2. Machines
| ID | MachineName | PurchaseDate | PurchaseCost | LoanAmount | DownPayment | CurrentValue | Status |

### 3. Income
| ID | Date | Customer | Machine | Site | HoursWorked | BillAmount | ReceivedAmount | PendingAmount | Remarks |

### 4. Expenses
| ID | Date | ExpenseType | Machine | Amount | PaidBy | Remarks |

Expense Types: Diesel, Repair, Maintenance, Salary, Insurance, RTO, Transport, Misc

### 5. EMI
| ID | Machine | DueDate | EMIAmount | PaidDate | BounceCharges | PenaltyCharges | TotalPaid | Status |

### 6. Loans
| ID | Machine | LoanAmount | PrincipalPaid | InterestPaid | OutstandingLoan |

### 7. Assets
| ID | AssetName | PurchaseValue | CurrentValue | Remarks |

### 8. Documents
| ID | Date | DocumentType | FileName | GoogleDriveLink |

### 9. AuditLog (v2 schema)
| ID | Timestamp | User | Module | Action | RecordID | OldData | NewData | IPAddress | Remarks |

> **Tip:** Run `initializeSpreadsheet()` from Apps Script to auto-create all sheets with headers.

---

## Google Apps Script Deployment Guide

### Step 1: Create the Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet.
2. Name it **Gitai Earthmovers Audit**.
3. Copy the Spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```

### Step 2: Set Up Apps Script

1. In the spreadsheet, go to **Extensions → Apps Script**.
2. Delete any default code.
3. Copy the entire contents of `google-apps-script/Code.gs` into the editor.
4. Replace `YOUR_SPREADSHEET_ID_HERE` with your actual Spreadsheet ID.
5. Save the project (name it **Earthmovers API**).

### Step 3: Initialize Sheets

1. In the Apps Script editor, select `initializeSpreadsheet` from the function dropdown.
2. Click **Run** (authorize when prompted).
3. Optionally run `insertSampleData` to populate test records.

### Step 4: Deploy as Web App

1. Click **Deploy → New deployment**.
2. Click the gear icon → select **Web app**.
3. Configure:
   - **Description:** Earthmovers REST API v1
   - **Execute as:** Me
   - **Who has access:** Anyone (required for browser fetch; use "Anyone with Google account" for stricter access)
4. Click **Deploy** and copy the **Web App URL**.

### Step 5: Connect Frontend

1. Open `js/config.js`.
2. Set your Web App URL:
   ```javascript
   API_BASE_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
   USE_MOCK_DATA: false,
   ```
3. Serve or open `index.html` — the app now reads/writes to Google Sheets.

### Step 6: Re-deploy After Changes

Whenever you modify `appscript.gs`:
1. **Deploy → Manage deployments**
2. Edit → **New version** → Deploy

---

## API Reference

All requests go to the Web App URL with query parameters.

### GET — List all records
```
GET ?endpoint=income&method=GET
```

### GET — Single record
```
GET ?endpoint=income&method=GET&id=5
```

### POST — Create record
```
POST ?endpoint=income&method=POST
Body: { "method": "POST", "data": { "Date": "2024-01-01", "Customer": "...", ... } }
```

### PUT — Update record
```
POST ?endpoint=income&method=PUT
Body: { "method": "PUT", "id": 5, "data": { "BillAmount": 500000, ... } }
```

### DELETE — Remove record
```
POST ?endpoint=income&method=DELETE
Body: { "method": "DELETE", "id": 5 }
```

### Endpoints
| Endpoint | Sheet |
|----------|-------|
| `partners` | Partners |
| `machines` | Machines |
| `income` | Income |
| `expenses` | Expenses |
| `emi` | EMI |
| `loans` | Loans |
| `assets` | Assets |
| `documents` | Documents |
| `audit` | AuditLog |

### Response Format
```json
{
  "success": true,
  "data": [ ... ]   // or single object for GET by id
}
```

```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Features

### Dashboard
- 8 KPI cards: Revenue, Expenses, Net Profit, Outstanding Loan, EMI Paid, Bounce Charges, Partner Investment, Asset Value
- Charts: Monthly Revenue, Monthly Expenses, Machine Revenue, Expense Breakdown
- EMI warnings for overdue and bounced payments

### Partner Management
- Add Investment / Withdrawal
- Partner ledger with DataTables
- Balance cards with formula: **Investments − Withdrawals + Profit Share**

### Income / Expenses
- Full CRUD with filters (date range, machine, customer/type)
- Auto-calculated `PendingAmount = BillAmount − ReceivedAmount`

### EMI Management
- Auto-calculated `TotalPaid = EMIAmount + BounceCharges + PenaltyCharges`
- Status auto-detection (Pending, Paid, Overdue, Bounced)

### Reports
- Profit & Loss, Partner Settlement, Machine Profitability
- Expense Summary, EMI Summary, Loan Summary
- Export: Excel (CSV), PDF (jsPDF), Print

### Partner Dispute Module
- Settlement report per partner with audit declaration
- Export and print for dispute resolution

### Global Search
- Search across Income, Expenses, Partners, EMIs, Machines

### Audit Log
- Every CREATE, UPDATE, DELETE is logged automatically

---

## Sample Data

Mock data is included in `js/api.js` (enabled when `USE_MOCK_DATA: true`).

| Module | Sample Records |
|--------|---------------|
| Partners | Rajesh Gitai & Vijay Barve — investments & withdrawals |
| Machines | JCB 3DX Super, Tata Hitachi EX 70, Hyundai R80 |
| Income | 5 billing entries from L&T, Shapoorji, Godrej, HCC |
| Expenses | Diesel, Salary, Repair, Insurance, Maintenance, RTO |
| EMI | 5 records including Paid, Bounced, Overdue |
| Loans | 3 machine loans with outstanding balances |
| Assets | Office Container, Diesel Generator |
| Documents | Purchase invoice, Loan agreement |

Run `insertSampleData()` in Apps Script to load equivalent data into Google Sheets.

---

## Theme & UI

- **Colors:** Dark Gray (#1a1d21), White, Yellow Accent (#f5c518)
- **Dark/Light toggle** — persisted in localStorage
- **Responsive:** Desktop, tablet, mobile with collapsible sidebar

---

## Production Checklist

- [ ] Replace `SPREADSHEET_ID` in Apps Script
- [ ] Deploy Web App and set `API_BASE_URL` in config.js
- [ ] Set `USE_MOCK_DATA: false`
- [ ] Restrict Web App access if needed
- [ ] Back up spreadsheet regularly
- [ ] Import historical data from Jan 2022 onwards
- [ ] Upload documents to Google Drive and link in Documents sheet

---

## Extending the System

- **New expense type:** Add to `CONFIG.EXPENSE_TYPES` in `config.js`
- **New report:** Add generator function in `reports.js` and a card in `index.html`
- **New module:** Create `js/newmodule.js`, add API endpoint in `appscript.gs`, register in `app.js`
- **Authentication:** Add Google OAuth or PIN gate before `App.init()` for production security

---

## License

Private business application for Gitai Earthmovers. All rights reserved.
