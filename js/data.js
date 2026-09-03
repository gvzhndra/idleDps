/**
 * Data Engine & Parser for BMN Idle Interactive Dashboard
 * Unit Kerja: KPKNL Denpasar (Provinsi Bali)
 */

const DataEngine = {
  rawDataset: typeof RAW_BMN_DATASET !== 'undefined' ? RAW_BMN_DATASET : [],
  activeAssets: [],
  pendingAssets: [],

  init() {
    this.processRawDataset();
  },

  async syncLiveDatasetFromSheet() {
    if (typeof CONFIG === 'undefined' || !CONFIG.APPS_SCRIPT || !CONFIG.APPS_SCRIPT.WEB_APP_URL) return false;
    try {
      const url = CONFIG.APPS_SCRIPT.WEB_APP_URL + '?action=getData';
      const resp = await fetch(url);
      const json = await resp.json();

      if (json && json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
        this.rawDataset = json.data;
        this.processRawDataset();
        return true;
      }
    } catch(err) {
      console.warn('Live Google Sheets dataset fetch error:', err);
    }
    return false;
  },

  /**
   * Universal Flexible Coordinate Parser
   * Handles:
   * 1. "-8.7152, 115.2185" (standard comma)
   * 2. "-8.7152 115.2185" (space separated)
   * 3. "-8.7152; 115.2185" (semicolon)
   * 4. "-8,7152, 115,2185" (Indonesian decimal commas)
   * 5. "115.2185, -8.7152" (reversed lat/lng)
   * 6. "https://maps.google.com/?q=-8.7152,115.2185" (Google Maps URLs)
   */
  parseCoordinatesFlexible(rawStr) {
    if (!rawStr) return null;
    const s = String(rawStr).trim();
    if (!s || s === '-' || s === 'undefined' || s === 'null') return null;

    // 1. Check for standard decimal numbers with signs
    // Find all numbers that look like coordinates
    const normalized = s.replace(/;/g, ' ').replace(/\s+/g, ' ');
    const matches = normalized.match(/[-+]?\d+[\.,]\d+/g);

    if (matches && matches.length >= 2) {
      let p1 = parseFloat(matches[0].replace(',', '.'));
      let p2 = parseFloat(matches[1].replace(',', '.'));

      // Check if p1 is latitude (Bali latitude is between -9.5 and -8.0)
      if (p1 < 0 && p1 >= -12 && p2 > 110 && p2 < 120) {
        return { lat: p1, lng: p2 };
      }
      // If reversed (longitude first)
      if (p2 < 0 && p2 >= -12 && p1 > 110 && p1 < 120) {
        return { lat: p2, lng: p1 };
      }
      // General valid coordinate check
      if (!isNaN(p1) && !isNaN(p2) && Math.abs(p1) <= 90 && Math.abs(p2) <= 180) {
        return { lat: p1 < p2 ? p1 : p2, lng: p1 < p2 ? p2 : p1 };
      }
    }

    return null;
  },

  getRowVal(row, keys) {
    if (!row) return '';
    for (let k of keys) {
      if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
        return String(row[k]).trim();
      }
    }
    const rowKeys = Object.keys(row);
    for (let k of keys) {
      const kClean = k.toLowerCase().replace(/[\s_\-]/g, '');
      for (let rk of rowKeys) {
        if (rk.toLowerCase().replace(/[\s_\-]/g, '') === kClean) {
          const val = row[rk];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            return String(val).trim();
          }
        }
      }
    }
    return '';
  },

  processRawDataset() {
    this.activeAssets = [];
    this.pendingAssets = [];

    if (!Array.isArray(this.rawDataset) || this.rawDataset.length === 0) {
      if (typeof RAW_BMN_DATASET !== 'undefined' && Array.isArray(RAW_BMN_DATASET)) {
        this.rawDataset = RAW_BMN_DATASET;
      }
    }

    this.rawDataset.forEach((row, idx) => {
      if (!row) return;

      const satkerNameRaw = this.getRowVal(row, ['nama_satker', 'NAMA_SATKER', 'NAMA SATKER', 'Nama Satker', 'satker', 'Pengguna Barang', 'PENGGUNA BARANG']);
      const barangNameRaw = this.getRowVal(row, ['nama_barang', 'NAMA_BARANG', 'NAMA BARANG', 'Nama Barang', 'uraian_bmn', 'URAIAN BMN', 'Uraian BMN', 'namaAset']);
      const kodeSatkerRaw = this.getRowVal(row, ['kode_satker', 'KODE_SATKER', 'KODE SATKER', 'Kode Satker']);
      const kodeBarangRaw = this.getRowVal(row, ['kode_barang', 'KODE_BARANG', 'KODE BARANG', 'Kode Barang']);
      const kemValRaw = this.getRowVal(row, ['kementerian', 'KEMENTERIAN', 'Kementerian / Lembaga', 'Pengguna Barang']);

      // Guard: Skip completely empty rows
      if (!satkerNameRaw && !barangNameRaw && !kodeSatkerRaw && !kodeBarangRaw) {
        return;
      }

      // Universal coordinate parsing
      const rawCoord = this.getRowVal(row, ['koordinat', 'KOORDINAT', 'Koordinat', 'KOORDINAT ASET', 'titik_koordinat', 'Titik Koordinat', 'latlng']);
      const parsed = this.parseCoordinatesFlexible(rawCoord);
      const lat = parsed ? parsed.lat : (parseFloat(row.lat) || null);
      const lng = parsed ? parsed.lng : (parseFloat(row.lng) || null);
      const hasCoords = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);

      const rawLuas = this.getRowVal(row, ['luas', 'LUAS', 'Luas', 'luas_m2', 'Luas Tanah']);
      const luas = parseFloat(rawLuas) || 0;
      const rawJenis = this.getRowVal(row, ['jenis_barang', 'JENIS_BARANG', 'JENIS BARANG', 'Jenis Barang', 'kategori']);
      const jenis = rawJenis || (barangNameRaw.toLowerCase().includes('tanah') ? 'Tanah' : 'Bangunan');
      const satkerName = satkerNameRaw || 'Satker Terdata';
      const barangName = barangNameRaw || jenis || 'Aset BMN Idle';
      const kodeSatker = kodeSatkerRaw;
      const kodeBarang = kodeBarangRaw;
      const nupVal = this.getRowVal(row, ['nup', 'NUP', 'Nup']) || '1';
      const kemVal = kemValRaw || 'KEMENTERIAN / LEMBAGA';
      const fotoUrlsVal = this.getRowVal(row, ['foto_urls', 'FOTO_URLS', 'fotoList', 'foto_list', 'foto']);
      const isTanah = jenis.toLowerCase().includes('tanah') || barangName.toLowerCase().includes('tanah');

      let fotoList = [];
      if (fotoUrlsVal) {
        fotoList = fotoUrlsVal.split(',').map(u => u.trim()).filter(u => u.length > 0 && !u.includes('images.unsplash.com'));
      }

      const kabupaten = this.detectKabupaten(row, satkerName, barangName, lat, lng);
      const kecamatan = this.detectKecamatan(satkerName, barangName, lat, lng);
      const kelurahan = this.detectKelurahan(satkerName, barangName, lat, lng);

      const isPinnedFromRow = row.is_pinned === true || row.is_pinned === 'TRUE' || row.is_pinned === '1' || row.isPinned === true;

      // Smart Multi-Keyword Classification Engine
      const normKlas = this.normalizeKlasifikasi(row);

      const rawTahap = this.getRowVal(row, ['tahap_berikut', 'TAHAP_BERIKUT', 'Tahap Berikut', 'tahap', 'rencana_tindak_lanjut']).toUpperCase();
      let normTahap = 'PENELITIAN';
      if (rawTahap.includes('MANTAU') || rawTahap.includes('PANTAU')) {
        normTahap = 'PEMANTAUAN';
      } else if (rawTahap.includes('LUSUR') || rawTahap.includes('TELUSUR')) {
        normTahap = 'PENELUSURAN';
      } else if (rawTahap.includes('LITI') || rawTahap.includes('TELITI')) {
        normTahap = 'PENELITIAN';
      } else {
        // Smart PMK 120 fallback only if column is completely blank
        if (normKlas.key === 'penggunaan' || normKlas.key === 'pemanfaatan') {
          normTahap = 'PEMANTAUAN';
        } else if (normKlas.key === 'penghapusan' || normKlas.key === 'pemindahtanganan' || normKlas.key === 'masalah_pencatatan') {
          normTahap = 'PENELUSURAN';
        } else {
          normTahap = 'PENELITIAN';
        }
      }

      const item = {
        id: row.id || (kodeSatker && kodeBarang ? `${kodeSatker}-${kodeBarang}-${nupVal}` : `BMN-${idx + 1}`),
        kodeSatker: kodeSatker,
        kementerian: kemVal,
        namaSatker: satkerName,
        kodeBarang: kodeBarang,
        nup: nupVal,
        namaBarang: barangName,
        namaAset: barangName,
        jenisBarang: jenis,
        isTanah: isTanah,
        kategori: isTanah ? 'Tanah' : 'Bangunan',
        klasifikasiKey: normKlas.key,
        klasifikasi: normKlas.label,
        detilKlasifikasi: normKlas.detil,
        kabupaten: kabupaten,
        kecamatan: kecamatan,
        kelurahan: kelurahan,
        alamat: this.getRowVal(row, ['alamat', 'ALAMAT', 'Alamat', 'Lokasi']) || `${kelurahan}, ${kecamatan}, ${kabupaten}`,
        lat: lat,
        lng: lng,
        hasCoordinates: hasCoords,
        luas: luas,
        luasTanah: luas,
        luasBangunan: 0,
        nilaiBuku: parseFloat(this.getRowVal(row, ['nilai_buku', 'NILAI_BUKU', 'Nilai Buku', 'nilaiBuku'])) || 0,
        kondisi: this.getRowVal(row, ['hasil jawaban', 'HASIL JAWABAN', 'kondisi', 'KONDISI']) || 'Telah dilakukan penelitian awal',
        statusPenguasaan: this.getRowVal(row, ['status_penguasaan', 'STATUS_PENGUASAAN', 'Status Penguasaan']) || 'Sertifikat Hak Pakai a.n. Pemerintah RI',
        zoningCode: 'Kategori 1',
        zoningName: 'Kawasan Perdagangan & Jasa',
        rekomendasiUser: this.getRowVal(row, ['rekomendasi_user', 'REKOMENDASI_USER', 'rekomendasi', 'HASIL JAWABAN']) || '',
        catatanTim: this.getRowVal(row, ['catatan_rekonsiliasi', 'CATATAN_REKONSILIASI', 'catatan_tim', 'PEMETAAN AWAL BERBASIS KEYWORD']) || '',
        fotoList: fotoList,
        isPinned: isPinnedFromRow,
        suratJawaban: this.getRowVal(row, ['surat_jawaban', 'SURAT JAWABAN PENGGUNA BARANG', 'Surat Jawaban']) || '-',
        tglSurat: this.formatSuratDate(this.getRowVal(row, ['tgl_surat', 'TANGGAL SURAT JAWABAN PENGGUNA BARANG', 'Tanggal Surat']) || '-'),
        hasilJawaban: this.getRowVal(row, ['hasil_jawaban', 'HASIL JAWABAN', 'kondisi']) || '',
        tahapBerikut: normTahap,
        penyampaianKlarifikasi: this.getRowVal(row, ['penyampaian_klarifikasi_rekap', 'PENYAMPAIAN_KLARIFIKASI_REKAP']) || 'SUDAH',

        // PMK 120 Dynamic Attributes
        peruntukanSaatIni: this.getRowVal(row, ['peruntukan_saat_ini', 'PERUNTUKAN_SAAT_INI', 'peruntukan', 'PERUNTUKAN']) || (isTanah ? 'Tanah Kosong / Belum Dimanfaatkan Penuh' : 'Bangunan Tidak Digunakan Optimal'),
        jenisDokumen: this.getRowVal(row, ['jenis_dokumen', 'JENIS_DOKUMEN', 'Jenis Dokumen']) || (isTanah ? 'Sertipikat Hak Pakai (SHP)' : 'IMB / PBG / Berita Acara Perolehan'),
        noDokumen: this.getRowVal(row, ['no_dokumen', 'NO_DOKUMEN', 'no_sertipikat', 'NO_SERTIPIKAT', 'No Sertipikat']),
        tglDokumen: this.getRowVal(row, ['tgl_dokumen', 'TGL_DOKUMEN', 'Tanggal Dokumen']),
        atasNamaDokumen: this.getRowVal(row, ['atas_nama_dokumen', 'ATAS_NAMA_DOKUMEN', 'Atas Nama']) || 'Pemerintah Republik Indonesia',
        batasUtara: this.getRowVal(row, ['batas_utara', 'BATAS_UTARA', 'Batas Utara']),
        batasTimur: this.getRowVal(row, ['batas_timur', 'BATAS_TIMUR', 'Batas Timur']),
        batasSelatan: this.getRowVal(row, ['batas_selatan', 'BATAS_SELATAN', 'Batas Selatan']),
        batasBarat: this.getRowVal(row, ['batas_barat', 'BATAS_BARAT', 'Batas Barat']),
        jumlahBangunan: parseInt(this.getRowVal(row, ['jumlah_bangunan', 'JUMLAH_BANGUNAN'])) || 0,
        tglPerolehan: this.getRowVal(row, ['tgl_perolehan', 'TGL_PEROLEHAN', 'Tahun Perolehan']),
        nilaiPerolehan: parseFloat(this.getRowVal(row, ['nilai_perolehan', 'NILAI_PEROLEHAN'])) || parseFloat(this.getRowVal(row, ['nilai_buku', 'NILAI_BUKU'])) || 0,
        pengamananPagar: row.pengamanan_pagar === true || row.pengamanan_pagar === 'TRUE' || row.pengamanan_pagar === '1',
        pengamananPlang: row.pengamanan_plang === true || row.pengamanan_plang === 'TRUE' || row.pengamanan_plang === '1',
        pengamananPenjaga: row.pengamanan_penjaga === true || row.pengamanan_penjaga === 'TRUE' || row.pengamanan_penjaga === '1',
        permasalahanSengketa: this.getRowVal(row, ['permasalahan_sengketa', 'PERMASALAHAN_SENGKETA', 'sengketa']) || 'Bebas Sengketa / Tidak ada klaim pihak ketiga',
        pinggirJalan: this.getRowVal(row, ['pinggir_jalan', 'PINGGIR_JALAN']) || 'Ya',
        statusKesimpulanIdle: this.getRowVal(row, ['status_kesimpulan_idle', 'STATUS_KESIMPULAN_IDLE']) || 'TIDAK_IDLE',
        alasanKesimpulanIdle: this.getRowVal(row, ['alasan_kesimpulan_idle', 'ALASAN_KESIMPULAN_IDLE']) || '',
        fokusPemantauan: this.getRowVal(row, ['fokus_pemantauan', 'FOKUS_PEMANTAUAN']) || '',
        targetPemantauan: this.getRowVal(row, ['target_pemantauan', 'TARGET_PEMANTAUAN']) || 'TA 2026'
      };

      // Load ALL assets into activeAssets for Left Panel & Global Search
      this.activeAssets.push(item);
      if (!hasCoords) {
        this.pendingAssets.push(item);
      }
    });

    this.loadCustomOverrides();
  },

  /**
   * Converts Excel/Google Sheets Serial Date numbers (e.g. 46155.0) and date strings into human Indonesian date
   */
  formatSuratDate(val) {
    if (!val || val === '-' || val === 'null' || val === 'undefined') return '-';
    const strVal = String(val).trim();

    // 1. Excel/Sheets Date Serial (e.g. 46155.0 or 46155)
    const num = parseFloat(strVal);
    if (!isNaN(num) && num > 30000 && num < 60000) {
      const jsDate = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(jsDate.getTime())) {
        const d = jsDate.getUTCDate();
        const m = jsDate.getUTCMonth() + 1;
        const y = jsDate.getUTCFullYear();
        const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        return `${d} ${monthNames[m] || ''} ${y}`;
      }
    }

    // 2. Format YYYY-MM-DD or MM/DD/YYYY or DD/MM/YYYY
    if (strVal.includes('/') || strVal.includes('-')) {
      const parts = strVal.split(/[\/\-]/);
      if (parts.length === 3) {
        let d, m, y;
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          y = parts[0]; m = parseInt(parts[1], 10); d = parseInt(parts[2], 10);
        } else if (parseInt(parts[0], 10) > 12) {
          // DD/MM/YYYY
          d = parseInt(parts[0], 10); m = parseInt(parts[1], 10); y = parts[2];
        } else {
          // MM/DD/YYYY or M/D/YYYY
          m = parseInt(parts[0], 10); d = parseInt(parts[1], 10); y = parts[2];
        }
        const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        if (m >= 1 && m <= 12) {
          return `${d} ${monthNames[m]} ${y}`;
        }
      }
    }

    return strVal;
  },

  /**
   * Normalizes classification directly from Column N (klasifikasi) and Column O (detil klasifikasi)
   * in the Google Sheet, ensuring exact matching with zero keyword contamination.
   */
  normalizeKlasifikasi(row) {
    if (!row) return { key: 'penggunaan', label: 'Penggunaan', detil: 'Digunakan Satker' };

    let rawK = String(row.klasifikasi || row.KLASIFIKASI || '').toLowerCase().trim();
    let rawD = String(row['detil klasifikasi'] || row.detil_klasifikasi || row['DETIL KLASIFIKASI'] || '').toLowerCase().trim();

    // 1. Pemindahtanganan / Hibah
    if (rawK.includes('pemindahtanganan') || rawK.includes('hibah')) {
      const isSelesai = rawD.includes('selesai');
      return {
        key: 'pemindahtanganan',
        label: 'Pemindahtanganan',
        detil: isSelesai ? 'Selesai Hibah' : 'Rencana Hibah Pemkab'
      };
    }

    // 2. Penghapusan
    if (rawK.includes('penghapusan') || rawK.includes('hapus')) {
      const isRencana = rawD.includes('rencana') || rawD.includes('usul');
      return {
        key: 'penghapusan',
        label: 'Penghapusan',
        detil: isRencana ? 'Rencana Penghapusan' : 'Sudah Dihapus'
      };
    }

    // 3. Renovasi
    if (rawK.includes('renovasi') || rawK.includes('renov') || rawK.includes('rusak')) {
      const isRusak = rawD.includes('rusak');
      return {
        key: 'renovasi',
        label: 'Renovasi',
        detil: isRusak ? 'Rusak Berat Perlu Renovasi' : 'Rencana Renovasi'
      };
    }

    // 4. Pemanfaatan
    if (rawK.includes('pemanfaatan') || rawK.includes('manfaat') || rawK.includes('sewa')) {
      const isRencana = rawD.includes('rencana') || rawD.includes('usul');
      return {
        key: 'pemanfaatan',
        label: 'Pemanfaatan',
        detil: isRencana ? 'Rencana Pemanfaatan' : 'Pemanfaatan Berjalan'
      };
    }

    // 5. Masalah Pencatatan
    if (rawK.includes('catat') || rawK.includes('pencatatan') || rawK.includes('masalah') || rawK.includes('anomali')) {
      let d = 'Reklasifikasi / Koreksi Catat';
      if (rawD.includes('master') || rawD.includes('tidak ditemukan')) {
        d = 'Tidak Ditemukan di Master Aset';
      } else if (rawD.includes('dobel')) {
        d = 'Dobel Catat';
      } else if (rawD.includes('kode satker')) {
        d = 'Kode Satker Berbeda';
      }
      return {
        key: 'masalah_pencatatan',
        label: 'Masalah Pencatatan',
        detil: d
      };
    }

    // 6. Penggunaan (default, covers 'penggunaan', 'pernggunaan', 'pengunaan')
    let detilGuna = 'Digunakan Satker';
    if (rawD.includes('alih status') || rawD.includes('transfer')) {
      detilGuna = 'Alih Status ke Satker Lain';
    } else if (rawD.includes('rencana') || rawD.includes('usul')) {
      detilGuna = 'Rencana Penggunaan Satker';
    }

    return {
      key: 'penggunaan',
      label: 'Penggunaan',
      detil: detilGuna
    };
  },

  getStatsSummary() {
    const totalAssets = this.activeAssets.length;
    const satkerSet = new Set();
    const unmappedSatkerSet = new Set();
    let unmappedCount = 0;
    let mappedCount = 0;
    let totalLuas = 0;
    let countTanah = 0;
    let countBangunan = 0;
    let pinnedCount = 0;
    let suratCount = 0;

    const klasifikasiMap = {};
    const detilMap = {};
    const hierarchy = {
      'Penggunaan': { count: 0, key: 'penggunaan', details: {} },
      'Penghapusan': { count: 0, key: 'penghapusan', details: {} },
      'Renovasi': { count: 0, key: 'renovasi', details: {} },
      'Pemanfaatan': { count: 0, key: 'pemanfaatan', details: {} },
      'Masalah Pencatatan': { count: 0, key: 'masalah_pencatatan', details: {} },
      'Pemindahtanganan': { count: 0, key: 'pemindahtanganan', details: {} }
    };
    const tahapMap = {};
    const pinnedAssets = [];

    this.activeAssets.forEach(a => {
      satkerSet.add(a.namaSatker);
      totalLuas += a.luas || 0;
      if (a.isTanah) countTanah++; else countBangunan++;
      if (a.isPinned) {
        pinnedCount++;
        pinnedAssets.push(a);
      }

      if (a.hasCoordinates) {
        mappedCount++;
      } else {
        unmappedCount++;
        unmappedSatkerSet.add(a.namaSatker);
      }

      const s = (a.suratJawaban || '').trim();
      if (s && s !== '-' && s !== 'Belum' && s !== 'BELUM') {
        suratCount++;
      }

      const kLabel = a.klasifikasi || 'Penggunaan';
      klasifikasiMap[kLabel] = (klasifikasiMap[kLabel] || 0) + 1;
      detilMap[a.detilKlasifikasi] = (detilMap[a.detilKlasifikasi] || 0) + 1;

      if (!hierarchy[kLabel]) {
        hierarchy[kLabel] = { count: 0, key: a.klasifikasiKey || 'penggunaan', details: {} };
      }
      hierarchy[kLabel].count++;
      const dLabel = a.detilKlasifikasi || 'Umum';
      hierarchy[kLabel].details[dLabel] = (hierarchy[kLabel].details[dLabel] || 0) + 1;

      // Dynamic Stage Extraction from Google Sheet
      const rawTh = String(a.tahapBerikut || 'PENELITIAN').trim();
      const th = rawTh ? rawTh.toUpperCase() : 'PENELITIAN';
      tahapMap[th] = (tahapMap[th] || 0) + 1;
    });

    return {
      totalAssets,
      totalSatkers: satkerSet.size,
      mappedCount,
      unmappedCount,
      unmappedSatkersCount: unmappedSatkerSet.size,
      totalLuas,
      countTanah,
      countBangunan,
      pinnedCount,
      pinnedAssets,
      suratCount,
      dikirimCount: totalAssets,
      dijawabCount: totalAssets,
      belumDijawabCount: 0,
      klasifikasiMap,
      detilMap,
      hierarchy,
      tahapMap
    };
  },

  loadCustomOverrides() {
    try {
      // 1. Load persistent custom photos
      const storedPhotos = localStorage.getItem('bmn_custom_photos');
      if (storedPhotos) {
        const photoMap = JSON.parse(storedPhotos);
        [...this.activeAssets, ...this.pendingAssets].forEach(asset => {
          if (photoMap[asset.id] && Array.isArray(photoMap[asset.id])) {
            asset.fotoList = photoMap[asset.id];
          }
        });
      }

      // 2. Load persistent custom asset edits (catatan, rekomendasi, nama, kondisi, luas, PMK 120 attributes)
      const storedEdits = localStorage.getItem('bmn_custom_edits');
      if (storedEdits) {
        const editMap = JSON.parse(storedEdits);
        [...this.activeAssets, ...this.pendingAssets].forEach(asset => {
          if (editMap[asset.id]) {
            const e = editMap[asset.id];
            if (e.namaBarang) asset.namaBarang = e.namaBarang;
            if (e.kondisi) asset.kondisi = e.kondisi;
            if (e.rekomendasiUser) asset.rekomendasiUser = e.rekomendasiUser;
            if (e.catatanTim) asset.catatanTim = e.catatanTim;
            if (e.tahapBerikut) asset.tahapBerikut = e.tahapBerikut;
            if (e.statusKesimpulanIdle) asset.statusKesimpulanIdle = e.statusKesimpulanIdle;
            if (e.alasanKesimpulanIdle) asset.alasanKesimpulanIdle = e.alasanKesimpulanIdle;
            if (e.fokusPemantauan) asset.fokusPemantauan = e.fokusPemantauan;
            if (e.targetPemantauan) asset.targetPemantauan = e.targetPemantauan;
            if (e.luas !== undefined) {
              asset.luas = parseFloat(e.luas) || asset.luas;
              asset.luasTanah = asset.luas;
            }
          }
        });
      }

      // 3. Load persistent pinned assets (Admin KPKNL)
      const storedPins = localStorage.getItem('bmn_pinned_assets');
      if (storedPins) {
        const pinMap = JSON.parse(storedPins);
        [...this.activeAssets, ...this.pendingAssets].forEach(asset => {
          if (pinMap[asset.id] !== undefined) {
            asset.isPinned = Boolean(pinMap[asset.id]);
          }
        });
      }
    } catch (e) {
      console.warn('LocalStorage overrides error:', e);
    }
  },

  togglePinAsset(assetId) {
    const all = [...this.activeAssets, ...this.pendingAssets];
    const asset = all.find(a => a.id === assetId);
    if (!asset) return false;

    asset.isPinned = !asset.isPinned;

    try {
      const storedPins = JSON.parse(localStorage.getItem('bmn_pinned_assets') || '{}');
      if (asset.isPinned) {
        storedPins[asset.id] = true;
      } else {
        delete storedPins[asset.id];
      }
      localStorage.setItem('bmn_pinned_assets', JSON.stringify(storedPins));
    } catch(e) {
      console.warn('LocalStorage pin error:', e);
    }

    return asset.isPinned;
  },

  detectKabupaten(row, satker, namaBarang, lat, lng) {
    // 1. Direct Column Check from Google Sheet if provided
    if (row) {
      const explicitKab = row.kabupaten || row.Kabupaten || row.KABUPATEN || row.kota || row.Kota || '';
      if (explicitKab && String(explicitKab).trim().length > 2) {
        const kabStr = String(explicitKab).trim();
        if (!kabStr.toLowerCase().startsWith('kabupaten') && !kabStr.toLowerCase().startsWith('kota')) {
          return kabStr.toLowerCase().includes('denpasar') ? `Kota ${kabStr}` : `Kabupaten ${kabStr}`;
        }
        return kabStr;
      }
    }

    // 2. High-Precision GIS Boundary Check from Pola Ruang (ATR/BPN)
    if (lat !== null && lng !== null && typeof PolaRuangEngine !== 'undefined' && PolaRuangEngine.isLoaded) {
      const zoning = PolaRuangEngine.getZoningForPoint(lat, lng);
      if (zoning && zoning.kabupaten && zoning.kabupaten !== 'Provinsi Bali') {
        return zoning.kabupaten;
      }
    }

    // 3. Keyword Match on Satker, Nama Barang, Alamat, and Catatan
    const text = (
      String(satker || '') + ' ' +
      String(namaBarang || '') + ' ' +
      String(row?.alamat || '') + ' ' +
      String(row?.hasil_jawaban || '') + ' ' +
      String(row?.catatan_tim || '')
    ).toLowerCase();

    if (text.includes('tabanan') || text.includes('pupuan') || text.includes('baturiti') || text.includes('bedugul') || text.includes('selemadeg') || text.includes('marga') || text.includes('penebel') || text.includes('kediri tabanan') || text.includes('kerambitan')) {
      return 'Kabupaten Tabanan';
    }
    if (text.includes('karangasem') || text.includes('amed') || text.includes('candidasa') || text.includes('tulamben') || text.includes('purwakerti') || text.includes('amlapura') || text.includes('manggis') || text.includes('rendang') || text.includes('sidemen') || text.includes('selat') || text.includes('bebandem') || text.includes('kubu')) {
      return 'Kabupaten Karangasem';
    }
    if (text.includes('buleleng') || text.includes('seririt') || text.includes('lovina') || text.includes('singaraja') || text.includes('sukasada') || text.includes('gerokgak') || text.includes('kubutambahan') || text.includes('sawan') || text.includes('busungbiu') || text.includes('tejakula')) {
      return 'Kabupaten Buleleng';
    }
    if (text.includes('gianyar') || text.includes('ubud') || text.includes('sukawati') || text.includes('blahbatuh') || text.includes('tampaksiring') || text.includes('payangan') || text.includes('tegallalang')) {
      return 'Kabupaten Gianyar';
    }
    if (text.includes('badung') || text.includes('kuta') || text.includes('tuban') || text.includes('canggu') || text.includes('berawa') || text.includes('mengwi') || text.includes('abiansemal') || text.includes('petang') || text.includes('jimbaran') || text.includes('nusa dua')) {
      return 'Kabupaten Badung';
    }
    if (text.includes('klungkung') || text.includes('semarapura') || text.includes('nusa penida') || text.includes('banjarangkan') || text.includes('dawan')) {
      return 'Kabupaten Klungkung';
    }
    if (text.includes('bangli') || text.includes('kintamani') || text.includes('susut') || text.includes('tembuku')) {
      return 'Kabupaten Bangli';
    }
    if (text.includes('jembrana') || text.includes('mendoyo') || text.includes('pekutatan') || text.includes('melaya') || text.includes('gilimanuk') || (/\bkota negara\b|\bkecamatan negara\b/.test(text))) {
      return 'Kabupaten Jembrana';
    }
    if (text.includes('denpasar') || text.includes('renon') || text.includes('sanur') || text.includes('sesetan') || text.includes('suwung') || text.includes('pemecutan') || text.includes('kesiman') || text.includes('panjer')) {
      return 'Kota Denpasar';
    }

    // 4. GPS Distance Fallback
    if (lat !== null && lng !== null && typeof SpatialEngine !== 'undefined') {
      const regencyCapitals = {
        'Kota Denpasar': { lat: -8.6705, lng: 115.2260 },
        'Kabupaten Badung': { lat: -8.5833, lng: 115.1819 },
        'Kabupaten Gianyar': { lat: -8.5398, lng: 115.3275 },
        'Kabupaten Tabanan': { lat: -8.5412, lng: 115.1256 },
        'Kabupaten Buleleng': { lat: -8.1120, lng: 115.0882 },
        'Kabupaten Karangasem': { lat: -8.4475, lng: 115.6148 },
        'Kabupaten Klungkung': { lat: -8.5356, lng: 115.4039 },
        'Kabupaten Bangli': { lat: -8.4559, lng: 115.3547 },
        'Kabupaten Jembrana': { lat: -8.3585, lng: 114.6295 }
      };

      let minDistance = 9999;
      let closestKabupaten = 'Kota Denpasar';

      Object.keys(regencyCapitals).forEach(kab => {
        const cap = regencyCapitals[kab];
        const dist = SpatialEngine.calculateDistance(lat, lng, cap.lat, cap.lng);
        if (dist < minDistance) {
          minDistance = dist;
          closestKabupaten = kab;
        }
      });

      return closestKabupaten;
    }

    return 'Kota Denpasar';
  },

  detectKecamatan(satker, namaBarang, lat, lng) {
    // 1. Primary GPS Coordinates Check
    if (lat !== null && lng !== null) {
      if (lat > -8.40 && lat < -8.20) return 'Baturiti';
      if (lat > -8.58 && lat < -8.50) return 'Tabanan';
      if (lat > -8.67 && lat < -8.63 && lng > 115.13 && lng < 115.16) return 'Kuta Utara';
      if (lat < -8.70 && lng < 115.20) return 'Kuta';
    }

    // 2. Keyword Fallback
    const text = (String(satker) + ' ' + String(namaBarang)).toLowerCase();
    if (text.includes('baturiti') || text.includes('bedugul') || text.includes('candikuning')) return 'Baturiti';
    if (text.includes('tabanan')) return 'Tabanan';
    if (text.includes('kuta utara') || text.includes('berawa') || text.includes('canggu')) return 'Kuta Utara';
    if (text.includes('kuta')) return 'Kuta';

    return 'Denpasar Selatan';
  },

  detectKelurahan(satker, namaBarang, lat, lng) {
    // 1. Primary GPS Coordinates Check
    if (lat !== null && lng !== null) {
      if (lat > -8.40 && lat < -8.20) return 'Baturiti / Candikuning';
      if (lat > -8.58 && lat < -8.50) return 'Delod Peken';
      if (lat > -8.67 && lat < -8.63 && lng > 115.13 && lng < 115.16) return 'Tibubeneng (Berawa)';
      if (lat < -8.70 && lng < 115.20) return 'Tuban';
    }

    // 2. Keyword Fallback
    const text = (String(satker) + ' ' + String(namaBarang)).toLowerCase();
    if (text.includes('baturiti') || text.includes('bedugul') || text.includes('candikuning')) return 'Baturiti / Candikuning';
    if (text.includes('tabanan')) return 'Delod Peken';

    return 'Renon';
  },

  getClusteredTree(assetList = this.activeAssets) {
    const tree = {};

    assetList.forEach(asset => {
      const kem = asset.kementerian || 'KEMENTERIAN / LEMBAGA LAIN';
      const satker = asset.namaSatker || 'Satker Umum';

      if (!tree[kem]) {
        tree[kem] = {
          name: kem,
          satkers: {},
          totalAssets: 0,
          totalPinned: 0,
          totalLuas: 0
        };
      }

      if (!tree[kem].satkers[satker]) {
        tree[kem].satkers[satker] = {
          name: satker,
          kodeSatker: asset.kodeSatker,
          pinnedCount: 0,
          assets: []
        };
      }

      tree[kem].satkers[satker].assets.push(asset);
      if (asset.isPinned) {
        tree[kem].satkers[satker].pinnedCount += 1;
        tree[kem].totalPinned += 1;
      }
      tree[kem].totalAssets += 1;
      tree[kem].totalLuas += asset.luas;
    });

    // ── Sort assets inside each Satker: Pinned assets float to top ─────────────
    Object.keys(tree).forEach(kemKey => {
      Object.keys(tree[kemKey].satkers).forEach(satKey => {
        tree[kemKey].satkers[satKey].assets.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return a.namaBarang.localeCompare(b.namaBarang);
        });
      });
    });

    return tree;
  }
};

DataEngine.init();
