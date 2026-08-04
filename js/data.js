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

  processRawDataset() {
    this.activeAssets = [];
    this.pendingAssets = [];

    this.rawDataset.forEach((row, idx) => {
      const coordStr = String(row.koordinat || '').trim();
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

      const luas = parseFloat(row.luas) || 0;
      const jenis = String(row.jenis_barang || 'BMN').trim();
      const isTanah = jenis.toLowerCase().includes('tanah');

      let fotoList = [];
      if (row.foto_urls && row.foto_urls.trim()) {
        fotoList = row.foto_urls.split(',').map(u => u.trim()).filter(u => u.length > 0);
      }
      if (fotoList.length === 0) {
        const nameText = (String(row.nama_barang) + ' ' + jenis).toLowerCase();

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

      const kabupaten = this.detectKabupaten(row.nama_satker, row.nama_barang, lat, lng);
      const kecamatan = this.detectKecamatan(row.nama_satker, row.nama_barang, lat, lng);
      const kelurahan = this.detectKelurahan(row.nama_satker, row.nama_barang, lat, lng);

      const item = {
        id: row.id || `BMN-${idx + 1}`,
        kodeSatker: row.kode_satker || '',
        kementerian: row.kementerian || 'LAIN-LAIN / INDEPENDEN',
        namaSatker: row.nama_satker || 'Satker Tanpa Nama',
        kodeBarang: row.kode_barang || '',
        nup: row.nup || '1',
        namaBarang: row.nama_barang || jenis || 'Aset BMN Idle',
        namaAset: row.nama_barang || jenis || 'Aset BMN Idle',
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
        kondisi: row['HASIL JAWABAN'] || 'Telah dilakukan penelitian awal',
        statusPenguasaan: 'Sertifikat Hak Pakai a.n. Pemerintah RI c.q. Pengelola',
        zoningCode: 'Kategori 1',
        zoningName: 'Kawasan Perdagangan & Jasa',
        rekomendasiUser: row.rekomendasi_user || row['HASIL JAWABAN'] || '',
        catatanTim: row['CATATAN_REKONSILIASI'] || row['PEMETAAN AWAL BERBASIS KEYWORD'] || '',
        fotoList: fotoList,
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
    const text = (String(satker) + ' ' + String(namaBarang)).toLowerCase();
    if (text.includes('tabanan')) {
      if (text.includes('baturiti')) return 'Baturiti';
      return 'Tabanan';
    }

    if (lat !== null && lng !== null) {
      if (lat > -8.67 && lat < -8.63 && lng > 115.13 && lng < 115.16) return 'Kuta Utara';
      if (lat < -8.70 && lng < 115.20) return 'Kuta';
      if (lat > -8.35 && lat < -8.25) return 'Baturiti';
      if (lat > -8.56 && lat < -8.50) return 'Tabanan';
    }
    return 'Denpasar Selatan';
  },

  detectKelurahan(satker, namaBarang, lat, lng) {
    const text = (String(satker) + ' ' + String(namaBarang)).toLowerCase();

    if (text.includes('tabanan')) {
      if (text.includes('baturiti')) return 'Baturiti';
      return 'Delod Peken';
    }

    if (lat !== null && lng !== null) {
      if (lat > -8.67 && lat < -8.63 && lng > 115.13 && lng < 115.16) return 'Tibubeneng (Berawa Beach)';
      if (lat < -8.70 && lng < 115.20) return 'Tuban';
      if (lat > -8.35 && lat < -8.25) return 'Baturiti';
      if (lat > -8.56 && lat < -8.50) return 'Delod Peken';
    }
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
          totalLuas: 0
        };
      }

      if (!tree[kem].satkers[satker]) {
        tree[kem].satkers[satker] = {
          name: satker,
          kodeSatker: asset.kodeSatker,
          assets: []
        };
      }

      tree[kem].satkers[satker].assets.push(asset);
      tree[kem].totalAssets += 1;
      tree[kem].totalLuas += asset.luas;
    });

    return tree;
  }
};

DataEngine.init();
