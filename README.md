# Gitai Earthmovers — Standalone Audit & Settlement System

Local **Excel-based** app for earthmoving businesses: machines, income, expenses, partners, loans, EMI (including split partner payments), and settlement reports.

**No Google Sheets. No cloud. No server backend.**

---

## Quick start

```bash
cd "/Users/vijaybarve/Documents/untitled folder/vb/Gitai earthmovers"
python3 -m http.server 8080
```

Open **http://localhost:8080** (do not open `index.html` directly from Finder).

Or double-click **`Start Gitai App.command`**.

Login: **admin / admin123**

---

## How data works

| Action | What happens |
|--------|----------------|
| First open | Loads **`Gitai.xlsx`** from this folder |
| Add / edit | Saved in browser cache |
| **Save Excel** (top bar) | Downloads updated `Gitai.xlsx` — **replace the file in this folder** |
| **Reload Gitai.xlsx** (Backup) | Discards unsaved cache, reloads from file |

See **[STANDALONE.md](STANDALONE.md)** and **[LOCAL_EXCEL.md](LOCAL_EXCEL.md)** for details.

---

## Project structure

```
Gitai.xlsx              ← Database (all business data)
index.html              ← App shell
css/style.css           ← Theme
js/
  api.js                ← Local data API
  excel-store.js        ← Read/write Gitai.xlsx
  emi-payment.js        ← Split EMI (machine + partner)
  standalone.js         ← Save status & warnings
  …                     ← Feature modules (income, partners, reports, …)
scripts/                ← One-time data tools (EMI import, register merge)
documents/              ← Local PDFs (loan schedules, RC, etc.)
Start Gitai App.command ← Mac launcher
```

---

## Gitai.xlsx tabs

Partners · Machines · Income · Expenses · EMI · Loans · Assets · Documents · Users · Vendors · AuditLog · …

---

## Key features

- Per-machine income & expense tracking
- Chola / lender EMI schedule with bounce & penalty
- **Split EMI payment** — part from machine account, part from partner (settlement credit)
- Partner investment, withdrawal & settlement reports
- Marathi OK in remarks fields
- Import legacy register Excel (Register tab)

---

## Admin scripts (optional)

Run from project folder when needed:

```bash
node scripts/import-m1-emi-pdf.js          # Chola EMI schedule → Gitai.xlsx
node scripts/apply-m1-chola-payments.js    # Payment receipts → EMI rows
node scripts/migrate-legacy-to-gitai.js    # Income/expense register import
node scripts/migrate-emi-split-columns.js  # Add EMI split columns
```

---

## Important

After editing data in the app, always **Save Excel** and replace `Gitai.xlsx` on disk — otherwise changes exist only in the browser.

If data looks wrong after an update:

```javascript
localStorage.removeItem('earthmovers-data-v1')
```

Then reload the page.
