# Use Your Existing Google Sheet — Step by Step

Your spreadsheet is already the right place. **Do not create a new spreadsheet.**

| Your sheet | App sheets |
|------------|------------|
| Existing tab with Date, Description, Category, Income/Expense columns | **Kept as archive** (not deleted) |
| — | **Income** tab (customer billing) |
| — | **Expenses** tab (diesel, salary, etc.) |
| — | **Partners, Machines, EMI, …** (new empty tabs for you to fill) |

**Your Spreadsheet ID:** `1RsNG4F2B70OV5jo1WndqN77j3lvx9Snp6kMEnPWctR8`

Sheet URL: https://docs.google.com/spreadsheets/d/1RsNG4F2B70OV5jo1WndqN77j3lvx9Snp6kMEnPWctR8/edit

---

## Step 1 — Make a backup

1. Open your sheet:  
   https://docs.google.com/spreadsheets/d/1UO70K4L_WMA246zkB6IIMLU_4N3v5OWd/edit
2. **File → Make a copy**
3. Name it `Gitai Earthmovers BACKUP`

---

## Step 2 — Add Apps Script to the **same** spreadsheet

1. In your sheet: **Extensions → Apps Script**
2. Delete any default code
3. Copy **all** of `google-apps-script/Code.gs` from this project → paste
4. Line 11 already has your Spreadsheet ID — verify it matches:
   ```javascript
   const SPREADSHEET_ID = '1UO70K4L_WMA246zkB6IIMLU_4N3v5OWd';
   ```
5. If your data tab is **not** auto-detected, set its name on line 16:
   ```javascript
   const LEGACY_REGISTER_SHEET = 'Register';  // your tab name
   ```
6. **Save** the project

---

## Step 3 — Create new app tabs

1. In Apps Script dropdown, select **`initializeSpreadsheet`**
2. Click **Run** → authorize Google when asked
3. Go back to the spreadsheet — you will see **new tabs**: Income, Expenses, Partners, Machines, Users, etc.
4. Your **old tab stays unchanged**

---

## Step 4 — Import your real data (one-time)

1. In Apps Script, select **`migrateLegacyIncomeExpense`**
2. Click **Run**
3. Check **View → Logs** — you should see:
   ```
   Migrating from sheet: Register
   Migration complete. Income: XXX, Expenses: YYY
   ```
4. Open the **Income** and **Expenses** tabs — your historical rows should be there

### How rows are split

| Your Category | Goes to |
|---------------|---------|
| Work hrs, Trip, Gutta, Us trolly | **Income** (Customer = Description) |
| Diesel, Operator, Servicing, Grease, Petrol, Other, … | **Expenses** |

Your original register tab is **never deleted** — it remains as reference.

---

## Step 5 — Add login user (if Users tab is empty)

The `initializeSpreadsheet` run creates **admin / admin123** automatically.  
Check the **Users** tab — if empty, add:

| ID | Username | Password | Role | Name | Active |
|----|----------|----------|------|------|--------|
| 1 | admin | admin123 | Admin | Administrator | TRUE |

---

## Step 6 — Deploy Web App URL

1. **Deploy → New deployment → Web app**
2. Execute as: **Me**
3. Who has access: **Anyone**
4. **Deploy** → copy URL ending in `/exec`

---

## Step 7 — Connect the app

1. Open **http://localhost:8080**
2. Click **Demo Mode** badge → paste Web App URL → **Connect & reload**
3. Login: **admin / admin123**
4. Dashboard should show your **real** income & expenses from Jan 2022 onward

---

## After migration — fill remaining tabs manually

| Tab | What to add |
|-----|-------------|
| **Machines** | JCB, excavator names & purchase values |
| **Partners** | Rajesh / Vijay investments & withdrawals |
| **EMI** | Monthly loan EMI records |
| **Loans** | Outstanding loan balances |

Or enter these through the app — they save to the same spreadsheet.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Legacy register sheet not found" | Set `LEGACY_REGISTER_SHEET` to your tab name |
| Migration counts look wrong | Check Income/Expenses tabs; adjust categories in script if needed |
| Sheet is "View only" | Ask owner for **Editor** access, or use File → Make a copy you own |
| Run migration twice | Duplicates rows — restore from backup and run once |
