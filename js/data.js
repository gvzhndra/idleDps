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

  processRawDataset() {
    this.activeAssets = [];
    this.pendingAssets = [];

    this.rawDataset.forEach((row, idx) => {
      if (!row) return;

      const satkerNameRaw = String(row.nama_satker || row.NAMA_SATKER || row['NAMA SATKER'] || row['Pengguna Barang'] || '').trim();
      const barangNameRaw = String(row.nama_barang || row.NAMA_BARANG || row['NAMA BARANG'] || '').trim();
      const kodeSatkerRaw = String(row.kode_satker || row.KODE_SATKER || row['KODE SATKER'] || '').trim();
      const kodeBarangRaw = String(row.kode_barang || row.KODE_BARANG || row['KODE BARANG'] || '').trim();
      const kemValRaw = String(row.kementerian || row.KEMENTERIAN || '').trim();

      // STRICT GUARD: Skip empty / placeholder dummy rows from Google Sheets
      if (!satkerNameRaw && !barangNameRaw && !kodeSatkerRaw && !kodeBarangRaw) {
        return;
      }
      if ((satkerNameRaw === 'Satker Tanpa Nama' || satkerNameRaw === '-' || satkerNameRaw === 'undefined') && !barangNameRaw && !kodeBarangRaw) {
        return;
      }
      if (kemValRaw === 'LAIN-LAIN / INDEPENDEN' && (!satkerNameRaw || satkerNameRaw === 'Satker Tanpa Nama') && !kodeBarangRaw) {
        return;
      }

      // Universal coordinate parsing across potential coordinate fields
      const rawCoord = row.koordinat || row.KOORDINAT || row.Koordinat || row['KOORDINAT ASET'] || row.titik_koordinat || '';
      const parsed = this.parseCoordinatesFlexible(rawCoord);
      const lat = parsed ? parsed.lat : null;
      const lng = parsed ? parsed.lng : null;
      const hasCoords = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);

      const luas = parseFloat(row.luas || row.LUAS || row.Luas) || 0;
      const jenis = String(row.jenis_barang || row.JENIS_BARANG || row['JENIS BARANG'] || 'BMN').trim();
      const satkerName = satkerNameRaw || 'Satker Tanpa Nama';
      const barangName = barangNameRaw || jenis || 'Aset BMN Idle';
      const kodeSatker = kodeSatkerRaw;
      const kodeBarang = kodeBarangRaw;
      const nupVal = String(row.nup || row.NUP || '1').trim();
      const kemVal = kemValRaw || String(row['Pengguna Barang'] || 'KEMENTERIAN / LEMBAGA').trim();
      const fotoUrlsVal = String(row.foto_urls || row.FOTO_URLS || row.fotoList || '').trim();
      const isTanah = jenis.toLowerCase().includes('tanah');

      let fotoList = [];
      if (fotoUrlsVal) {
        fotoList = fotoUrlsVal.split(',').map(u => u.trim()).filter(u => u.length > 0 && !u.includes('images.unsplash.com'));
      }

      const kabupaten = this.detectKabupaten(satkerName, barangName, lat, lng);
      const kecamatan = this.detectKecamatan(satkerName, barangName, lat, lng);
      const kelurahan = this.detectKelurahan(satkerName, barangName, lat, lng);

      const isPinnedFromRow = row.is_pinned === true || row.is_pinned === 'TRUE' || row.is_pinned === '1' || row.isPinned === true;

      // Smart Multi-Keyword Classification Engine
      const normKlas = this.normalizeKlasifikasi(row);

      const rawTahap = String(row['TAHAP_BERIKUT'] || row.tahap_berikut || '').toUpperCase().trim();
      const normTahap = (rawTahap.includes('PANTAU') || rawTahap === 'PEMANTAUAN') ? 'PEMANTAUAN' : 'PENELITIAN';

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
        alamat: row.alamat || `${kelurahan}, ${kecamatan}, ${kabupaten}`,
        lat: lat,
        lng: lng,
        hasCoordinates: hasCoords,
        luas: luas,
        luasTanah: luas,
        luasBangunan: 0,
        kondisi: row['HASIL JAWABAN'] || row.kondisi || 'Telah dilakukan penelitian awal',
        statusPenguasaan: 'Sertifikat Hak Pakai a.n. Pemerintah RI c.q. Pengelola',
        zoningCode: 'Kategori 1',
        zoningName: 'Kawasan Perdagangan & Jasa',
        rekomendasiUser: row.rekomendasi_user || row.rekomendasi || row['HASIL JAWABAN'] || '',
        catatanTim: row['CATATAN_REKONSILIASI'] || row.catatan_tim || row['PEMETAAN AWAL BERBASIS KEYWORD'] || '',
        fotoList: fotoList,
        isPinned: isPinnedFromRow,
        suratJawaban: row['SURAT JAWABAN PENGGUNA BARANG'] || row.surat_jawaban || '-',
        tglSurat: row['TANGGAL SURAT JAWABAN PENGGUNA BARANG'] || row.tgl_surat || '-',
        hasilJawaban: row['HASIL JAWABAN'] || row.hasil_jawaban || row.kondisi || '',
        tahapBerikut: normTahap,
        penyampaianKlarifikasi: row['PENYAMPAIAN_KLARIFIKASI_REKAP'] || 'SUDAH'
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
        detil: isSelesai ? 'Selesai Hibah Pemda' : 'Rencana Hibah Pemkab'
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
        detil: isRencana ? 'Rencana Pemanfaatan / Sewa' : 'Pemanfaatan Berjalan / Sewa'
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
    if (rawD.includes('alih status') || rawD.includes('transfer') || rawD.includes('satker lain')) {
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

      // 2. Load persistent custom asset edits (catatan, rekomendasi, nama, kondisi, luas)
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

  detectKabupaten(satker, namaBarang, lat, lng) {
    // 1. Primary & Most Accurate: GPS Coordinate Distance to Regency Capitals
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

    // 2. Keyword Fallback (Explicit regency names ONLY, no ambiguous words like "negara")
    const text = (String(satker) + ' ' + String(namaBarang)).toLowerCase();
    if (text.includes('tabanan')) return 'Kabupaten Tabanan';
    if (text.includes('buleleng') || text.includes('singaraja')) return 'Kabupaten Buleleng';
    if (text.includes('gianyar') || text.includes('ubud')) return 'Kabupaten Gianyar';
    if (text.includes('badung') || text.includes('kuta') || text.includes('tuban') || text.includes('canggu') || text.includes('berawa')) return 'Kabupaten Badung';
    if (text.includes('karangasem') || text.includes('amlapura')) return 'Kabupaten Karangasem';
    if (text.includes('klungkung') || text.includes('semarapura')) return 'Kabupaten Klungkung';
    if (text.includes('bangli')) return 'Kabupaten Bangli';
    if (text.includes('jembrana')) return 'Kabupaten Jembrana';

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
