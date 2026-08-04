# 📌 REMINDER: Google Apps Script (Code.gs) Deployment Guide

> **IMPORTANT RULE FOR ASSISTANT / AGENT:**  
> Whenever any modification is made to `Code.gs` in this repository, you **MUST IMMEDIATELY NOTIFY THE USER** to update and re-deploy the code in their Google Apps Script Editor!

---

## 🚀 How to Sync `Code.gs` to Google Sheets Backend

Because Google Apps Script does **NOT** auto-sync from GitHub repositories, follow these 5 steps whenever `Code.gs` is modified:

1. Open your master **Google Sheet** (`BMN_Idle_Master_Backend` / connected sheet).
2. Go to top menu: **Extensions (Ekstensi)** ➔ **Apps Script**.
3. Open `Code.gs` in the Apps Script editor, **select all and replace** with the latest content of [`Code.gs`](file:///Users/putuharjaya/Desktop/repo/idleDps/Code.gs).
4. Save the file (**Ctrl+S** / **Cmd+S**).
5. Click **Deploy** (top right) ➔ **Manage Deployments** ➔ Click pencil icon ✏️ ➔ Select **New Version (Versi Baru)** ➔ Click **Deploy**.

---

## 🔑 Trigger Setup (Required Once for Auto SHA-256 Hashing)

To automatically hash passwords typed into the `Users` sheet:
1. In the Apps Script sidebar, click ⏰ **Triggers (Pemicu)**.
2. Click **+ Add Trigger (+ Tambah Pemicu)**.
3. Choose function: `onEdit`
4. Event source: `From spreadsheet`
5. Event type: `On edit`
6. Click **Save**.

---
*Last updated: August 2026 — KPKNL Denpasar BMN Idle Dashboard*
