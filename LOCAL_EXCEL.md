# Local Excel Mode — Gitai.xlsx

The app uses **Gitai.xlsx** in this folder as the only database.

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
| **Save to Excel** | App → downloads `Gitai.xlsx` + `Gitai-M1.xlsx` + `Gitai-M2.xlsx` — replace them in this folder |
| **Sync from Excel** | Disk → App — reloads `Gitai.xlsx` from this folder (use after editing Excel) |
| **Reload Gitai.xlsx** (Backup) | Discards cache, reloads from file |
| **Import Excel** (Backup) | Load a different `.xlsx` file |

## Gitai.xlsx tabs

Partners, Machines, Income, Expenses, EMI, Loans, Assets, Documents, Users, Vendors, etc.

## Import Machine register (Machine 1, Machine 2, …)

If you have a separate income/expense workbook (Register tab with **Date, Description, Category, Income Money IN, Expense Money OUT**):

1. Admin → **Backup** → **Import Machine Register**
2. Set machine name (e.g. `M1- Mahindra earthmaster sx iv 2022`) → choose your `.xlsx` file
3. Data is **merged** into Income + Expenses (does not wipe other tabs)
4. Click **Save Excel** to download updated `Gitai.xlsx`

## EMI split payments

When editing an EMI, choose payment mode:

- **Machine account** — full EMI from business bank
- **Partner personal** — partner paid full EMI (credited in settlement)
- **Split** — part machine, part partner

## Fleet (confirmed)

| | **M1 — Earth Master SX IV 2022** | **M2 — Earth Master SX 2023** |
|---|----------------------------------|----------------------------------|
| Purchase | 27 Jan 2022 | 14 Jan 2023 |
| Cost | ₹26.72L | ₹28L |
| Loan | **₹22.22L Chola** `X0CENDD00004530947` | **₹24.36L Chola** `X0CENDD00005335473` |
| EMI | ₹48,399 | ₹52,960 |
| Income register | **559 income + 190 expense** | — (add when available) |
| EMIs | **61 from Chola PDF** | Schedule pending (42 paid / 18 left) |
| RC | MH-38-AD-0794 | **MH-38-AD-4046** |

**Partners:** Gajanan Barve & Baliram Barve — ₹1L each (Jan 2022)

After updating `Gitai.xlsx`, clear browser cache once if data looks stale:

```javascript
localStorage.removeItem('earthmovers-data-v1')
```

Then reload **http://localhost:8080**.

## Backup

Admin → **Backup** → Export JSON for extra safety.
