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

### 7. 🗺️ Pola Ruang & RTRW Spatial Zoning Engine (`js/pola_ruang.js` & `pola_ruang_bali_.json`)
- TopoJSON/GeoJSON Spatial Catchment & Zoning Layer Provinsi Bali.
- Standard ATR/BPN Zoning Color Palette (Kawasan Pariwisata, Permukiman, Pertanian, Perikanan, Konservasi, Mangrove, Transportasi).
- Spatial indexing berbasis bounding box & Turf.js untuk klasifikasi zona RTRW aset BMN Idle secara instan.

### 8. 📱 Optimization Layout Mobile (< 768px) & Bottom Navigation Bar
- Responsive Layout Engine (`css/styles.css`) dengan Bottom Navigation Bar (`[ 🗺️ Peta ]` | `[ 📋 Daftar Aset ]` | `[ 📊 Detail ]`).
- Full-width sliding drawer & smooth view transition pada layar smartphone/tablet.

### 9. 🖼️ Interactive Lightbox Photo Viewer Modal (`#photo-lightbox-modal`)
- Full-screen high-res photo modal viewer berlatar gelap (*backdrop blur*).
- Tombol navigasi Next/Prev, caption nama aset, serta navigasi keyboard (ESC/Arrow keys).

### 10. 🔍 Real-Time Global Search Bar & Dual Filter Engine
- Filter pencarian instan pada sidebar & marker Leaflet berdasarkan Nama Barang, Satker, NUP/Kode Barang, dan Wilayah.

### 11. ✏️ Modal Edit Informasi Aset Frontend (`#edit-asset-modal`)
- Form pengeditan Nama Barang, Alamat, Luas, Nilai Buku, Koordinat, Rekomendasi Official, & Catatan Tim.
- Real-time sync ke state `DataEngine`, persistence `localStorage`, & backend Google Apps Script.

### 12. 📄 Generator Laporan Hasil Penelitian BMN Idle (PMK 120/2024) (`js/laporan.js`)
- Dual Export Support: File Word (`.docx`) via `docx.js` & Printable PDF View via `@media print`.
- Auto-preset Tim Penelitian (Nama & NIP) di `localStorage`.

---

## 📋 NEXT FEATURE ACTION PLAN (FUTURE ROADMAP & BACKLOG)

> [!TIP]
> Rencana pengembangan fitur selanjutnya:

### 1. 📌 Quick Priority Filter & Summary Stat Bar (Prioritas 1)
- **Konsep**: Menambahkan tombol filter cepat di bagian atas panel kiri: *"Tampilkan Hanya Aset Prioritas (Pinned)"* dan counter `📌 X Aset Prioritas` pada Header KPI Stats Bar.

### 2. 🗺️ Interactive Map Picker / Drag-and-Drop Pin Coordinate Editor (Prioritas 2)
- **Konsep**: Memungkinkan Admin untuk menggeser pin aset langsung di peta Leaflet.

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
├── login.html                 # Authentication & User Login Page
├── implementation.md          # Dokumen Histori, MVP Milestone, & Next Feature Action Plan
├── reminder.md                # Panduan Deployment Google Apps Script (Code.gs)
├── pola_ruang_bali_.json      # Data TopoJSON GeoJSON Pola Ruang RTRW Provinsi Bali
├── format laporan penelitian / # Template Resmi Docx Laporan Penelitian PMK 120/2024
│   └── draft_laporan-hasil-penelitian-bmn-idle.docx
├── css/
│   └── styles.css             # System Style Soft Pastel Palette & Responsive Layout
└── js/
    ├── config.js              # Konfigurasi KPKNL Denpasar & App Settings
    ├── bmn_dataset.js         # Fallback Offline Dataset BMN Idle
    ├── data.js                # Data Engine, Live Sync, Pinning & Clustered Hierarchy
    ├── spatial.js             # Engine Jarak Spasial Haversine & 57 Centroid Kecamatan Bali
    ├── pola_ruang.js          # Pola Ruang (RTRW Zoning) Analytics Engine & TopoJSON Loader
    ├── turf.min.js            # Turf.js Spatial Analysis Library
    ├── recommendation.js      # Smart Recommendation Rule Engine (Official + Backend Helper)
    ├── map.js                 # Leaflet GIS Map Controller (Soft Pastel Basemap)
    ├── presentation.js        # Spotlight / Tour Presentation Mode Controller
    ├── auth.js                # Navigation Auth Redirect Guard
    ├── login.js               # Login Form Authentication Logic
    └── app.js                 # Main App Controller, UI Renderer & PowerPoint (.pptx) Exporter
```

---

## 🛠️ Cara Menjalankan Project

```bash
cd /Users/putuharjaya/Desktop/repo/idleDps
python3 -m http.server 8088
```
Akses di browser: **`http://localhost:8088`**
