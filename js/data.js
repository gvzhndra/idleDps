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

  processRawDataset() {
    this.activeAssets = [];
    this.pendingAssets = [];

    this.rawDataset.forEach((row, idx) => {
      const coordStr = String(row.koordinat || row.KOORDINAT || row.Koordinat || row['KOORDINAT ASET'] || '').trim();
      const hasValidCoord = coordStr && coordStr !== '-' && coordStr.includes(',');

      let lat = null;
      let lng = null;

      if (hasValidCoord) {
        const parts = coordStr.split(',');
        if (parts.length >= 2) {
          const parsedLat = parseFloat(parts[0].trim());
          const parsedLng = parseFloat(parts[1].trim());
          if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
            lat = parsedLat;
            lng = parsedLng;
          }
        }
      }

      const luas = parseFloat(row.luas || row.LUAS || row.Luas) || 0;
      const jenis = String(row.jenis_barang || row.JENIS_BARANG || row['JENIS BARANG'] || 'BMN').trim();
      const satkerName = String(row.nama_satker || row.NAMA_SATKER || row['NAMA SATKER'] || row['Pengguna Barang'] || 'Satker Tanpa Nama').trim();
      const barangName = String(row.nama_barang || row.NAMA_BARANG || row['NAMA BARANG'] || jenis || 'Aset BMN Idle').trim();
      const kodeSatker = String(row.kode_satker || row.KODE_SATKER || row['KODE SATKER'] || '').trim();
      const kodeBarang = String(row.kode_barang || row.KODE_BARANG || row['KODE BARANG'] || '').trim();
      const nupVal = String(row.nup || row.NUP || '1').trim();
      const kemVal = String(row.kementerian || row.KEMENTERIAN || row['Pengguna Barang'] || 'LAIN-LAIN / INDEPENDEN').trim();
      const fotoUrlsVal = String(row.foto_urls || row.FOTO_URLS || row.fotoList || '').trim();
      const isTanah = jenis.toLowerCase().includes('tanah');

      let fotoList = [];
      if (fotoUrlsVal) {
        fotoList = fotoUrlsVal.split(',').map(u => u.trim()).filter(u => u.length > 0);
      }
      if (fotoList.length === 0) {
        const nameText = (barangName + ' ' + jenis).toLowerCase();

        if (nameText.includes('bungalow') || nameText.includes('cottage') || nameText.includes('peristirahan') || nameText.includes('mess')) {
          fotoList = [
            'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80'
          ];
        } else if (nameText.includes('rumah')) {
          fotoList = [
            'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'
          ];
        } else if (nameText.includes('gedung') || nameText.includes('kantor')) {
          fotoList = [
            'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80'
          ];
        } else {
          fotoList = [
            'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80'
          ];
        }
      }

      const kabupaten = this.detectKabupaten(satkerName, barangName, lat, lng);
      const kecamatan = this.detectKecamatan(satkerName, barangName, lat, lng);
      const kelurahan = this.detectKelurahan(satkerName, barangName, lat, lng);

      const isPinnedFromRow = row.is_pinned === true || row.is_pinned === 'TRUE' || row.is_pinned === '1' || row.isPinned === true;

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
        kabupaten: kabupaten,
        kecamatan: kecamatan,
        kelurahan: kelurahan,
        alamat: row.alamat || `${kelurahan}, ${kecamatan}, ${kabupaten}`,
        lat: lat,
        lng: lng,
        hasCoordinates: lat !== null && lng !== null,
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
        suratJawaban: row['SURAT JAWABAN PENGGUNA BARANG'] || '-',
        tglSurat: row['TANGGAL SURAT JAWABAN PENGGUNA BARANG'] || '-',
        tahapBerikut: row['TAHAP_BERIKUT'] || 'PENELITIAN'
      };

      if (item.hasCoordinates) {
        this.activeAssets.push(item);
      } else {
        this.pendingAssets.push(item);
      }
    });

    this.loadCustomOverrides();
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
