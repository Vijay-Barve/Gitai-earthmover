# Gitai Earthmovers — Standalone App

**No Google. No cloud. No internet required** (after first load).

Your database is **`Gitai.xlsx`** in this folder.

---

## Start the app

### Mac (easiest)
Double-click **`Start Gitai App.command`**

Or in Terminal:
```bash
cd "/Users/vijaybarve/Documents/untitled folder/vb/Gitai earthmovers"
python3 -m http.server 8080
```
Open **http://localhost:8080**

Login: **admin / admin123**

---

## Daily workflow

| Step | Action |
|------|--------|
| 1 | Start app → data loads from `Gitai.xlsx` |
| 2 | Add/edit income, expenses, EMI, etc. |
| 3 | Top bar shows **Unsaved changes** (yellow) when you edit |
| 4 | Click **Save Excel** → downloads `Gitai.xlsx` + `Gitai-M1.xlsx` + `Gitai-M2.xlsx` |
| 5 | **Replace** those three files in this project folder |
| 6 | Badge turns **Saved to Excel** (green) |

**Important:** Always use **Save Excel** at end of day so your file on disk is up to date.

---

## What’s stored where

| Location | Purpose |
|----------|---------|
| `Gitai.xlsx` | Master database (both machines — keep backups!) |
| `Gitai-M1.xlsx` | Dedicated Machine 1 workbook (auto-built on Save) |
| `Gitai-M2.xlsx` | Dedicated Machine 2 workbook (auto-built on Save) |
| Browser cache | Current session only (auto) |
| `documents/` | Loan PDFs, agreements |

---

## Backup

- **Save Excel** daily
- Admin → **Backup** → Export JSON (extra safety)
- Copy whole project folder to USB/cloud weekly

---

## Import data

| File type | Where |
|-----------|--------|
| Income/expense register | Backup → Import Machine Register |
| Full Gitai.xlsx | Backup → Import Excel |
| M1 EMI PDF | Already imported (61 rows) |

---

## Troubleshooting

**Empty income/expense?**
1. Must use **http://localhost:8080** (not Finder/file://)
2. Console: `localStorage.removeItem('earthmovers-data-v1'); location.reload()`
3. Backup → **Reload Gitai.xlsx**

**Unsaved changes warning when closing tab?**  
Click **Save Excel** and replace the file first.

---

## Your data today

- **M1** — 559 income, 190 expenses, Cholamandalam EMIs  
- **M2** — machine record (add loan/register when ready)  
- **Partners** — Gajanan & Baliram Barve  

No Google account needed.
