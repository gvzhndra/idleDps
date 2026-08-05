# Catatan Implementasi & Backlog Project BMN Idle Interactive Dashboard (idleDps)

Dokumen ini mencatat **histori diskusi, fitur yang telah diimplementasikan (Status MVP), timeline kerja, serta daftar pekerjaan selanjutnya (Next Feature Action Plan)** untuk BMN Idle Interactive Dashboard KPKNL Denpasar.

---

## ⏰ Target Timeline Kerja

| Hari | Target & Milestones | Status |
| :--- | :--- | :--- |
| **Rabu** | **Aplikasi & Data 100% Selesai (MVP RELEASE)**: Perapihan Layout UI, Live Google Sheet Sync, Multilevel Spatial Analysis, Google Drive Photos, SHA-256 Auth, & Priority Pinning. | **✅ SELESAI (MVP)** |
| **Kamis** | **Internal Review & Final Feedback Pimpinan**: Batas waktu paling lambat mendapatkan feedback & revisi akhir sebelum WFH. | **🟡 IN PROGRESS** |
| **Jumat** | **Presentasi BMN Idle KPKNL**: Mode WFH - Seluruh sistem & slide sudah terkunci dan siap dipresentasikan secara live. | **⏳ PENDING** |

---

## 🎯 Tujuan Project
Membangun **Single-Page Application (SPA) Interactive Presentation Dashboard** untuk menyajikan data aset **BMN Idle di seluruh Provinsi Bali** dengan acuan kantor pelayanan **KPKNL Denpasar**. Dashboard ini menggabungkan analisis spasial (jarak koordinat, 57 centroid kecamatan, proksimitas POI OSM Overpass, VIIRS Nighttime Lights), rekomendasi resmi pemanfaatan, serta integrasi Google Sheets, Google Drive & PowerPoint (.pptx).

---

## 🚀 FITUR MVP YANG SUDAH DIIMPLEMENTASIKAN (COMPLETED MVP)

### 1. 📍 Multilevel Spatial Analysis & 3 Straight Line Visualizer (`js/spatial.js`)
- Calculation engine **Formula Haversine** untuk menghitung jarak ($km$) spasial multilevel:
  - 🔵 **Jarak ke KPKNL Denpasar** (Garis Biru Dotted)
  - 🔴 **Jarak ke Ibukota Prov. Bali (Denpasar)** (Garis Merah Dashed)
  - 🟣 **Jarak ke Ibukota Kab. Terdekat** (Garis Ungu Solid)
- **57 Centroid Kecamatan se-Provinsi Bali**: Terintegrasi untuk kalkulasi jarak kecamatan paling presisi.
- Function `setupMasterKecamatan()` di `Code.gs` untuk auto-provisioning tab sheet `Master_Kecamatan` di Google Sheets.

### 2. 🔐 Secure Authentication & User Session Management (`js/app.js` & `login.html`)
- Otentikasi berbasis **SHA-256 Hashed Password** (Web Crypto API).
- 3 Tingkatan Role Pengguna:
  - `Admin KPKNL` (Username: `admin_kpknl`) — Akses Penuh Edit, Upload Foto, & Toggle Pin Prioritas.
  - `Verifikator Satker` (Username: `petugas_satker`) — Akses Edit & Upload Foto.
  - `Executive Viewer` (Username: `viewer`) — Akses Lihat & Presentasi.
- Sesi terenkripsi tersimpan aman di `localStorage` (`bmn_idle_user`).

### 3. 📸 Permanent Multi-Photo Upload & Google Drive Integration
- Form modal upload foto dengan kompresi client-side HTML5 Canvas (max 5 foto per upload).
- Upload otomatis ke Google Drive folder `BMN_Idle_Photos`.
- Otomatisasi URL embedding CDN resmi Google: **`https://lh3.googleusercontent.com/d/FILE_ID`** (100% bebas blokir CORS/Cookie).
- Pencatatan permanen URL foto di tab sheet **`BMN_Asset_Photos`** dan kolom `foto_urls` pada sheet `BMN_Idle`.
- Auto-sync foto saat aplikasi pertama kali dibuka via endpoint Apps Script `?action=getPhotos`.

### 4. 🔄 Live Google Sheets Dataset Synchronization
- Auto-fetch live dataset saat aplikasi dibuka via Apps Script endpoint `?action=getData`.
- Aset yang baru diisi nilai koordinatnya di Google Sheets (`koordinat`) **otomatis berpindah dari daftar Pending ke Aset Aktif (`activeAssets`)** dan langsung muncul di panel kiri & peta Leaflet.

### 5. 📌 Admin KPKNL Toggle Pin & Priority Sorting Engine
- Tombol 1-click **`📌 Pin Aset Sebagai Prioritas Idle`** khusus untuk `Admin KPKNL` di Slide-over Detail Drawer Panel Kanan.
- **Hierarchical Priority Sorting**:
  - **Aset ber-Pin** melompat ke **urutan #1 teratas** di dalam Satker-nya (badge merah `📌 Prioritas`).
  - **Satker ber-Pin** melompat ke **urutan teratas** di dalam kluster Kementerian (badge `📌 X Prioritas`).
- Auto-create kolom **`is_pinned`** di Google Sheets dan tersimpan instan di `localStorage`.

### 6. 🌙 Nighttime Lights & VIIRS Proxy Activity Index Card
- Visual score bar gradien warna dinamis (`blue` ➔ `green` ➔ `yellow` ➔ `orange` ➔ `red`).
- Jarum penunjuk (*needle marker*) skor intensitas cahaya 0–100.
- Label zona (*Rendah <50*, *Sedang 50-70*, *Tinggi 70-85*, *Sangat Tinggi >85*).
- Penjelasan ilmiah metodologi *VIIRS Nighttime Light Index* (NASA/NOAA).

---

## 📋 NEXT FEATURE ACTION PLAN (FUTURE ROADMAP & BACKLOG)

> [!TIP]
> Rencana pengembangan fitur selanjutnya setelah fase MVP ini disetujui pimpinan:

### 1. 📌 Quick Priority Filter & Summary Stat Bar (Prioritas 1)
- **Konsep**: Menambahkan tombol filter cepat di bagian atas panel kiri: *"Tampilkan Hanya Aset Prioritas (Pinned)"*.
- **Indikator KPI**: Menambahkan counter `📌 X Aset Prioritas` pada Header KPI Stats Bar di bagian atas dashboard.

### 2. 🗺️ Real GeoJSON Layer RTRW Tata Ruang Bali (Prioritas 2)
- **Konsep**: Mengintegrasikan file GeoJSON resmi RTRW Pemprov Bali (`data/zonasi-bali.geojson`).
- **Visualisasi**: Menampilkan polygon interaktif zonasi K-1 (Perdagangan), K-2 (Pariwisata), K-3 (Pemerintahan), dll. pada peta Leaflet saat diproyeksikan.

### 3. 🗺️ Interactive Map Picker / Drag-and-Drop Pin Coordinate Editor (Prioritas 3)
- **Konsep**: Memungkinkan Admin untuk menggeser pin aset langsung di peta Leaflet jika koordinat kurang presisi, lalu menyimpan koordinat baru tersebut kembali ke Google Sheets.

### 4. 📊 PowerPoint (.pptx) & Google Slides Priority Export Enhancements (Prioritas 4)
- **Konsep**: Menambahkan badge `📌 Prioritas Idle` dan menyertakan foto resolusi tinggi dari Google Drive pada file slide presentasi `.pptx` hasil unduhan.
- **Batch Export Filter**: Opsi centang otomatis seluruh aset ber-pin untuk diekspor menjadi slide PowerPoint dalam 1x klik.

---

## ⚠️ KNOWN BUGS & FIX PLAN (CATATAN BUG)

> [!WARNING]
> Bug yang dilaporkan dan tercatat untuk segera ditangani pada iterasi berikutnya:

### 🐛 Bug #1: Gagal Memuat / Ekspor PPT (`exportSelectedToPPT`)
- **Gejala**: Saat menekan tombol **Ekspor PPTX**, proses ekspor slide PowerPoint terkadang gagal / throw error.
- **Hasil Analisis Akar Masalah (Root Cause Analysis)**:
  - Library `PptxGenJS` saat ini mencoba memuat foto aset dari URL eksternal (Google Drive / Unsplash) secara langsung di dalam fungsi `slide.addImage({ path: asset.fotoList[0] })`.
  - Jika URL foto eksternal terkena pembatasan CORS browser atau belum selesai di-download saat file `.pptx` di-generate, `PptxGenJS` akan mengalami *unhandled Promise rejection*.
- **Rencana Perbaikan (Fix Plan)**:
  1. Membuat helper fungsi `preloadImageToBase64(url)` yang melakukan pre-fetch foto aset ke format `base64` terlebih dahulu sebelum dimasukkan ke slide `PptxGenJS`.
  2. Menambahkan `try...catch` fallback yang aman: jika foto eksternal gagal di-fetch, slide tetap berhasil di-generate dengan menyajikan kotak gambar *placeholder* yang rapi tanpa membuat proses ekspor gagal.

---

## 📁 Struktur File Repository (`idleDps`)

```
/Users/putuharjaya/Desktop/repo/idleDps/
├── Code.gs                    # Backend Script Google Apps Script, Sheet Sync, Drive Photo & Pinning
├── index.html                 # Single-Page Application Layout (Soft Pastel Theme & PptxGenJS)
├── implementation.md          # Dokumen Histori, MVP Milestone, & Next Feature Action Plan
├── css/
│   └── styles.css             # System Style Soft Pastel Palette & Responsive Layout
└── js/
    ├── config.js              # Konfigurasi KPKNL Denpasar & App Settings
    ├── bmn_dataset.js         # Fallback Offline Dataset BMN Idle
    ├── data.js                # Data Engine, Live Sync, Pinning & Clustered Hierarchy
    ├── spatial.js             # Engine Jarak Spasial Haversine & 57 Centroid Kecamatan Bali
    ├── recommendation.js      # Smart Recommendation Rule Engine (Official + Backend Helper)
    ├── map.js                 # Leaflet GIS Map Controller (Soft Pastel Basemap)
    ├── presentation.js        # Spotlight / Tour Presentation Mode Controller
    ├── auth.js                # Navigation Auth Redirect Guard
    └── app.js                 # Main App Controller, UI Renderer & PowerPoint (.pptx) Exporter
```

---

## 🛠️ Cara Menjalankan Project

```bash
cd /Users/putuharjaya/Desktop/repo/idleDps
python3 -m http.server 8088
```
Akses di browser: **`http://localhost:8088`**
