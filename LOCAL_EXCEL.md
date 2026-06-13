# Local Excel Mode — Gitai.xlsx

The app uses **Gitai.xlsx** in this folder instead of Google Sheets.

## Run the app

```bash
cd "/Users/vijaybarve/Documents/untitled folder/vb/Gitai earthmovers"
python3 -m http.server 8080
```

Open **http://localhost:8080** (not the file directly).

Login: **admin / admin123**

## How data works

| Action | What happens |
|--------|----------------|
| First open | Loads `Gitai.xlsx` from this folder |
| Add/edit records | Saved in browser cache automatically |
| **Save Excel** (top bar) | Downloads updated `Gitai.xlsx` — replace the file in this folder |
| **Reload Gitai.xlsx** (Backup) | Discards cache, reloads from file |
| **Import Excel** (Backup) | Load a different `.xlsx` file |

## Gitai.xlsx tabs

Partners, Machines, Income, Expenses, EMI, Loans, Assets, Documents, Users, Vendors, etc.

## Import Machine register (Machine 1, Machine 2, …)

If you have a separate income/expense workbook (Register tab with **Date, Description, Category, Income Money IN, Expense Money OUT**):

1. Admin → **Backup** → **Import Machine Register**
2. Set machine name (e.g. `Machine 1`) → choose your `.xlsx` file
3. Data is **merged** into Income + Expenses (does not wipe other tabs)
4. Click **Save Excel** to download updated `Gitai.xlsx`

## Fleet (confirmed)

| | **M1 — Earth Master SX IV 2022** | **M2 — Earth Master SX IV 2023** |
|---|----------------------------------|----------------------------------|
| Purchase | 27 Jan 2022 | 14 Jan 2023 |
| Cost | ₹26.72L | ₹28L |
| Loan | **₹22.22L (Cholamandalam)** | **₹25L** (add lender) |
| Income register | **559 income + 190 expense** | — (add when available) |
| EMIs | **61 from Chola PDF** (53 paid · 8 pending) | — |
| Lender | Cholamandalam | Add when available |
| RC | MH-38-AD-0794 | Add when available |

**Partners:** Gajanan Barve & Baliram Barve — ₹1L each (Jan 2022)

Re-merge after editing `Gitai (1).xlsx`:
```bash
node scripts/merge-gitai-workbook.js ~/Downloads/Gitai\ \(1\).xlsx
node scripts/align-machines-loans.js
```

After updating `Gitai.xlsx`, clear browser cache once:

```javascript
localStorage.removeItem('earthmovers-data-v1')
```

Then reload **http://localhost:8080**.

## Backup

Admin → **Backup** → Export JSON for extra safety.

## Google Sheets (optional)

To use Google Sheets later, set in `js/config.js`:

```javascript
DATA_MODE: 'google',
USE_MOCK_DATA: false,
API_BASE_URL: 'your-web-app-url/exec',
```

Default is **excel mode** — no Google account needed.
