# Catatan Implementasi & Backlog Project BMN Idle Interactive Dashboard (idleDps)

Dokumen ini mencatat **histori diskusi, fitur yang telah diimplementasikan, timeline kerja, serta daftar pekerjaan tertunda (backlog)** untuk persiapan Presentasi BMN Idle KPKNL Denpasar pada hari Jumat.

---

## ⏰ Target Timeline Kerja

| Hari | Target & Milestones |
| :--- | :--- |
| **Rabu** | **Aplikasi & Data 100% Selesai** (Perapihan Layout UI Spacious, Integrasi Layer GeoJSON Tata Ruang Bali, Sync Data Sheets, & Ekspor PPT). |
| **Kamis** | **Internal Review & Final Feedback Pimpinan** (Batas waktu paling lambat mendapatkan feedback & revisi akhir sebelum WFH). |
| **Jumat** | **Presentasi BMN Idle KPKNL** (Mode WFH - Seluruh sistem & slide sudah terkunci dan siap dipresentasikan secara live). |

---

## 🎯 Tujuan Project
Membangun **Single-Page Application (SPA) Interactive Presentation Dashboard** untuk menyajikan data aset **BMN Idle di seluruh Provinsi Bali** dengan acuan kantor pelayanan **KPKNL Denpasar**. Dashboard ini menggabungkan analisis spasial (jarak koordinat, zonasi tata ruang, proksimitas POI), rekomendasi resmi pemanfaatan, serta integrasi Google Sheets & Google Slides.

---

## ✅ Fitur yang SUDAH Diimplementasikan

1. **Standalone Repository**:
   - Ditempatkan di folder khusus `/Users/putuharjaya/Desktop/repo/idleDps`.
   - Git repository lokal telah diinisialisasi & di-commit.

2. **UI & Theme Aesthetic**:
   - Tampilan **Soft Pastel Palette** (lembut di mata, kontras tinggi *dark slate* `#1e293b`).
   - Kartu statistik KPI (Total Unit, Total Luas Tanah, Total Luas Bangunan, Estimasi Nilai Wajar Aset; *Potensi PNBP disembunyikan sesuai arahan karena belum bisa diukur*).
   - **Collapsible Sidebar**: Tombol toggle untuk menyembunyikan/menampilkan sidebar daftar aset agar area peta bisa *full screen*.
   - *Live Clock* di header.

3. **Spatial GIS & Distance Engine Multilevel**:
   - Leaflet GIS Map dengan basemap pilihan (*Soft Pastel CartoDB Voyager*, *Satelit*, dan *Street Map*).
   - Calculation engine **Formula Haversine** untuk menghitung jarak ($km$) spasial multilevel:
     - **Ibukota Provinsi** (Denpasar - Renon)
     - **Ibukota Kabupaten** (Mangupura, Kota Gianyar, Singaraja, Tabanan, Amlapura, Semarapura, Kota Bangli, Negara)
     - **Pusat Desa / Hub Pariwisata Terdekat**
   - **Konteks Khusus Hub Komersial Ubud & Pariwisata Bali**: Memasukkan pembobotan aktivitas spasial di mana area **Desa Ubud / Peliatan** memiliki keramaian & aktivitas ekonomi pariwisata yang jauh lebih tinggi dibanding Kota Gianyar.
   - Line connector (*dashed polyline*) dan label jarak spasial.
   - Proksimitas Fasilitas Publik / Pemerintahan (POI: Kantor Desa, Polsek, Koramil, Pasar).

4. **Sistem Rekomendasi Ganda (Input Tim + Backend Helper)**:
   - Menampilkan **Rekomendasi Tim** dari input Google Sheets (Kolom W `rekomendasiUser`).
   - Menampilkan **Smart Recommendation Engine (Backend Helper)** berbasis aturan spasial zonasi (K-1 Perdagangan, K-2 Pariwisata, K-3 Pemerintahan, K-4 Permukiman, K-5 RTH) tanpa membutuhkan Token API AI eksternal.

5. **Modul Foto Aset**:
   - Multi-photo carousel viewer pada panel detail.
   - Form modal *upload foto fisik* baru yang secara otomatis memperbarui URL foto ke Google Sheets (Kolom T `fotoList`).

6. **Mode Presentasi Live (Spotlight / Tour Mode)**:
   - Tombol **"Mulai Presentasi Live"** yang menjalankan tur slide otomatis berpindah antar-BMN dengan animasi *camera pan & flyTo* Leaflet.

7. **Backend Google Sheets (`Code.gs`)**:
   - Script `Code.gs` siap pakai di Apps Script.
   - Menu khusus di Google Sheets: `💡 BMN Idle Tools`.
   - Rumus custom formula sel: `=SMART_RECOMMENDATION(Zoning, LuasTanah, LuasBangunan, Kategori)`.
   - Fitur auto-fill rekomendasi otomatis untuk baris terpilih / seluruh sheet.

8. **Ekspor Presentasi (1 Aset = 1 Slide)**:
   - **Tombol Ekspor PPT (.pptx)**: Ekspor client-side menggunakan `PptxGenJS` (16:9 Widescreen) untuk mengunduh slide PowerPoint lengkap dengan tabel metadata jarak multilevel, kotak rekomendasi tim, dan foto aset.
   - **Ekspor Google Slides (Backend `Code.gs`)**: Menu Apps Script `📊 Ekspor ke Google Slides` untuk membuat file presentasi Google Slides baru langsung di Google Drive.

---

## ⏳ PENDING / BACKLOG (Belum Diimplementasikan / Perlu Dibenahi)

> [!IMPORTANT]
> Catatan pekerjaan tertunda yang harus selesai di hari Rabu:

### 1. 🎨 Perapihan Layout UI (Tampilan Terlalu Cramped)
- **Problem**: Tampilan dashboard saat ini terasa *too cramped* (terlalu padat/sempit).
- **Rencana Perbaikan**:
  - [ ] Implementasi **Collapsible Sidebar** (tombol toggle untuk menyembunyikan/menampilkan sidebar daftar aset agar area peta bisa *full screen*).
  - [ ] Memperluas *padding*, *margin*, dan *line-height* pada Slide-over Detail Drawer Panel agar lebih lega (*spacious*).
  - [ ] Penyesuaian ukuran font & *box-shadow* agar pas saat diproyeksikan pada layar proyektor / TV presentasi.

### 2. 🗺️ Upload Layer Tata Ruang Bali (Real GeoJSON File)
- **Problem**: Layer zonasi tata ruang saat ini masih menggunakan mock data sampel.
- **Rencana Perbaikan**:
  - [ ] Pengguna akan mengunggah file **GeoJSON / KML Tata Ruang Provinsi Bali** (RTRW Pemprov/Pemda).
  - [ ] Mengintegrasikan file GeoJSON tersebut ke dalam project (`data/zonasi-bali.geojson` / `js/map.js`) agar polygon zonasi riil tampil presisi di peta Bali.

### 3. 🐙 Push ke Remote Repository GitHub (`idleDps`)
- **Problem**: Remote repository di GitHub belum dibuat.
- **Rencana Perbaikan**:
  - [ ] Buat repo baru bernama **`idleDps`** di [github.com/new](https://github.com/new) di bawah akun `gvzhndra`.
  - [ ] Hapus/rename repository lama jika diperlukan agar tidak ganda.
  - [ ] Jalankan `git push -u origin main` dari folder `/Users/putuharjaya/Desktop/repo/idleDps`.

---

## 📁 Struktur File Repository (`idleDps`)

```
/Users/putuharjaya/Desktop/repo/idleDps/
├── Code.gs                    # Backend Script Google Apps Script, Sheet Sync, & Google Slides Exporter
├── index.html                 # Single-Page Application Layout (Soft Pastel Theme & PptxGenJS)
├── implementation.md          # Dokumen Histori, Timeline, & Backlog Project ini
├── css/
│   └── styles.css             # System Style Soft Pastel Palette & Responsive Layout
└── js/
    ├── config.js              # Konfigurasi KPKNL Denpasar & App Settings
    ├── data.js                # Dataset BMN Idle Seluruh Bali & POI Mock
    ├── spatial.js             # Engine Jarak Spasial Haversine & Proksimitas POI
    ├── recommendation.js      # Smart Recommendation Rule Engine (Official + Backend Helper)
    ├── map.js                 # Leaflet GIS Map Controller (Soft Pastel Basemap)
    ├── presentation.js        # Spotlight / Tour Presentation Mode Controller
    └── app.js                 # Main App Controller, Filter, & PowerPoint (.pptx) Exporter
```

---

## 🛠️ Cara Menjalankan Project

```bash
cd /Users/putuharjaya/Desktop/repo/idleDps
python3 -m http.server 8088
```
Akses di browser: **`http://localhost:8088`**
