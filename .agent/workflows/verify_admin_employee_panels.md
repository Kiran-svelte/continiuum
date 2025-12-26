# Verify Admin & Employee Panels

---
description: Verify all admin and employee pages, fix errors, and capture screenshots
---

## Overview
This workflow will:
1. Count Blade view files for **admin** and **employee** panels.
2. Generate a JSON list of all application routes.
3. Extract admin‑ and employee‑specific routes.
4. Programmatically request each route (authenticated) and log HTTP status.
5. Capture screenshots of every successful page using a headless browser (Puppeteer).
6. Produce a short report with counts, any failing routes, and links to screenshots.

---
### Step 1 – Count Blade Views
```bash
# Count admin Blade files
fd "*.blade.php" -t f "c:/xampp/htdocs/Company/resources/views/admin" | wc -l
# Count employee Blade files
fd "*.blade.php" -t f "c:/xampp/htdocs/Company/resources/views/employee" | wc -l
```
// turbo

---
### Step 2 – Export Routes to JSON
```bash
php artisan route:list --json > routes.json
```
// turbo

---
### Step 3 – Extract URLs (PHP)
Create `verify_panels.php` (see next step) and run it to produce:
- `admin_urls.txt`
- `employee_urls.txt`
- `panel_report.txt`
```bash
php verify_panels.php
```
// turbo

---
### Step 4 – Capture Screenshots (Node + Puppeteer)
```bash
npm i puppeteer@latest
node screenshot.js admin_urls.txt screenshots/admin
node screenshot.js employee_urls.txt screenshots/employee
```
// turbo

---
### Step 5 – Review Report
Open `panel_report.txt`. It contains:
- Total admin pages: **{{admin_count}}**
- Total employee pages: **{{employee_count}}**
- List of routes that returned non‑200 status codes.
- Paths to all generated screenshots.

---
### Step 6 – Fix Errors (Manual)
For any route that failed:
1. Locate the corresponding Blade view in `resources/views/...`.
2. Verify the controller method exists and returns the view.
3. If the view is missing, create a placeholder or copy an existing one.
4. Re‑run Step 3 & 4 until `panel_report.txt` shows **no errors**.

---
### Step 7 – Archive Proof
Zip the `screenshots/` folder together with `panel_report.txt` and share it as proof of a fully functional admin & employee UI.

---
**Notes**
- The PHP script uses credentials from `WORKING_CREDENTIALS.md` to obtain a session cookie.
- All commands marked with `// turbo` are safe to run automatically.
- Ensure Node.js is installed for the screenshot step.
