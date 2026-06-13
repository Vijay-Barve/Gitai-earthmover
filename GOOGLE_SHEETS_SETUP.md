# Google Sheets Setup — No Separate Backend Required

This app does **not** use Node.js, Python, Firebase, or any server you host yourself.

Your database **is** a Google Spreadsheet. The only "API layer" is **Google Apps Script** — a few lines of JavaScript that live inside Google Sheets (free, included with Google account).

```
┌─────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│  Your Browser   │  HTTPS  │  Google Apps Script  │  reads  │  Google Sheet   │
│  index.html     │ ──────► │  (Web App URL)       │ ──────► │  (17 tabs)      │
│  js/*.js        │ ◄────── │  Code.gs             │ ◄────── │  Your data      │
└─────────────────┘         └──────────────────────┘         └─────────────────┘
```

There is **nothing to install on a server**. You only need:

1. A Google Spreadsheet
2. Apps Script pasted from `google-apps-script/Code.gs`
3. One Web App deployment (gives you a URL)
4. That URL pasted in `js/config.js`

---

## Option A — Use Now Without Google Sheets (Demo)

Already configured for you:

```javascript
// js/config.js
USE_MOCK_DATA: true,
```

- Open `index.html` via a local server (`python3 -m http.server 8080`)
- Login: **admin / admin123**
- All features work with sample data stored in the browser
- No Google account needed for testing

---

## Option B — Connect to Your Google Sheet (Production)

### Step 1: Create the spreadsheet

1. Go to [Google Sheets](https://sheets.google.com) → **Blank spreadsheet**
2. Name it **Gitai Earthmovers Audit**
3. Copy the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/COPY_THIS_PART/edit
   ```

### Step 2: Add Apps Script (this replaces a "backend")

1. In the spreadsheet: **Extensions → Apps Script**
2. Delete any default code
3. Open `google-apps-script/Code.gs` from this project → **copy entire file** → paste into Apps Script editor
4. Replace `YOUR_SPREADSHEET_ID_HERE` with your Spreadsheet ID (line 11)
5. **Save** the project (name: `Earthmovers API`)

### Step 3: Create all sheet tabs automatically

1. In Apps Script, select function **`initializeSpreadsheet`**
2. Click **Run** → authorize when Google asks
3. Refresh your spreadsheet — you will see 17 tabs (Partners, Machines, Income, etc.)

Optional: run **`insertSampleData`** to load test rows.

### Step 4: Deploy as Web App (get your URL)

1. **Deploy → New deployment**
2. Type: **Web app**
3. Settings:
   - Execute as: **Me**
   - Who has access: **Anyone** (or "Anyone with Google account" for stricter access)
4. Click **Deploy** → copy the **Web app URL**  
   Example: `https://script.google.com/macros/s/AKfy.../exec`

### Step 5: Connect the frontend

Edit `js/config.js`:

```javascript
const CONFIG = {
  API_BASE_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
  USE_MOCK_DATA: false,   // ← switch off demo mode
  // ...
};
```

Reload the app in your browser. Data now reads/writes to your Google Sheet.

---

## Where does data live?

| Mode | Where data is stored |
|------|---------------------|
| `USE_MOCK_DATA: true` | Browser memory only (resets on refresh unless you use mock in api.js) |
| `USE_MOCK_DATA: false` | Your Google Spreadsheet tabs |

Every Income, Expense, Partner entry, etc. is a **row in a sheet tab**. You can open the spreadsheet anytime to verify or edit manually (Admin should use the app for audit trail).

---

## Documents & Google Drive

- Document **links** are stored in the Documents sheet (`DriveLink` column)
- Upload files to Google Drive manually, paste the share link in the app
- Optional: set `DOCUMENTS_FOLDER_ID` in `Code.gs` for automated uploads via Apps Script

---

## Backups

- **Demo mode:** Backup downloads JSON/CSV to your computer
- **Google Sheet mode:** Admin → Backup → "Sheet Copy" duplicates the spreadsheet in your Google Drive

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Failed to load data" | Check `API_BASE_URL` and `USE_MOCK_DATA: false` |
| CORS / fetch errors | Redeploy Web App as new version; URL must end with `/exec` |
| Empty sheets | Run `initializeSpreadsheet()` in Apps Script |
| Changes not saving | Redeploy Apps Script after editing `Code.gs` |
| Still in demo mode | Confirm `USE_MOCK_DATA: false` and hard-refresh browser |

---

## Summary

You do **not** need:

- ❌ A VPS or cloud server  
- ❌ Node.js / PHP / Python backend  
- ❌ A database like MySQL or MongoDB  

You **do** need:

- ✅ Google Spreadsheet (database)  
- ✅ Google Apps Script `Code.gs` (API — paste once, deploy once)  
- ✅ Static HTML/JS files (this project — open in browser or host on GitHub Pages, Netlify, etc.)

The old `backend/` folder name was misleading — use **`google-apps-script/Code.gs`** instead.
