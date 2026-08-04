/**
 * Transparent & Empirical Recommendation Engine
 * Analyzes official team input (from Google Sheets) and builds a defensible
 * system recommendation based on POI catchment density within 500 meters and BMN asset type.
 */

const RecommendationEngine = {
  /**
   * Evaluate asset and return official & defensible recommendation objects
   * @param {Object} asset 
   * @param {Array} nearbyPOIs 
   * @returns {Object} Recommendation result
   */
  generateRecommendation(asset, nearbyPOIs = []) {
    const officialRec = asset.rekomendasiUser || asset.kondisi || 'Dipergunakan / Hasil penelitian awal';
    
    // Filter POIs within 500 meters
    const pois500m = nearbyPOIs.filter(p => p.distanceMeters <= 500 || p.distanceKm <= 0.5);
    const poiCount = pois500m.length;

    const systemRec = this.calculateDefensibleSystemRecommendation(asset, poiCount, pois500m);

    let badgeInfo = CONFIG.RECOMMENDATION_TYPES.SEWA_KOMERSIAL;
    let rationale = [];

    // Empirically defensible rationale lines
    if (poiCount > 0) {
      const poiSummary = pois500m.map(p => `${p.name} (${p.distanceMeters < 1000 ? p.distanceMeters + 'm' : p.distanceKm + 'km'})`).join(', ');
      rationale.push(`**Analisis Aksesibilitas & POI (Radius 500m):** Ditemukan ${poiCount} fasilitas publik (${poiSummary}).`);
    } else {
      rationale.push(`**Analisis Aksesibilitas & POI (Radius 500m):** Kawasan berkembang / berkembang terbatas.`);
    }

    if (asset.catatanTim) {
      rationale.push(`**Hasil Penelitian Tim:** ${asset.catatanTim}`);
    } else if (asset.kondisi) {
      rationale.push(`**Status Penggunaan Saat Ini:** ${asset.kondisi}`);
    }

    const checkText = (officialRec || systemRec).toLowerCase();
    if (checkText.includes('sewa') || checkText.includes('komersial') || checkText.includes('ruko') || checkText.includes('logistik')) {
      badgeInfo = CONFIG.RECOMMENDATION_TYPES.SEWA_KOMERSIAL;
    } else if (checkText.includes('ksp') || checkText.includes('pariwisata') || checkText.includes('resort') || checkText.includes('bungalow')) {
      badgeInfo = CONFIG.RECOMMENDATION_TYPES.KSP_PARIWISATA;
    } else if (checkText.includes('alih status') || checkText.includes('satker') || checkText.includes('pemerintah')) {
      badgeInfo = CONFIG.RECOMMENDATION_TYPES.ALIH_STATUS;
    } else if (checkText.includes('pinjam pakai')) {
      badgeInfo = CONFIG.RECOMMENDATION_TYPES.PINJAM_PAKAI;
    } else {
      badgeInfo = CONFIG.RECOMMENDATION_TYPES.OPTIMALISASI_TERBATAS;
    }

    return {
      type: badgeInfo,
      officialTitle: officialRec,
      systemSuggestion: systemRec,
      poiCount500m: poiCount,
      pois500m: pois500m,
      rationale: rationale
    };
  },

  calculateDefensibleSystemRecommendation(asset, poiCount, pois500m = []) {
    const isTanah = asset.kategori === 'Tanah Kosong' || asset.luasBangunan === 0;
    const jenis = (asset.jenisBarang || '').toLowerCase();

    // Direct, transparent rules based on empirical POI count and asset type
    if (jenis.includes('mess') || jenis.includes('bungalow') || jenis.includes('resort') || asset.namaAset.toLowerCase().includes('bungalow')) {
      return 'Kerja Sama Pemanfaatan (KSP) / Sewa Penginapan & Pariwisata';
    }

    if (jenis.includes('kantor') || jenis.includes('pemerintah')) {
      if (poiCount >= 2) {
        return 'Sewa Perkantoran Swasta / Alih Status Penggunaan ke Instansi Lain';
      }
      return 'Alih Status Penggunaan / Pinjam Pakai Instansi / Pemda';
    }

    if (jenis.includes('rumah')) {
      return 'Optimalisasi Sewa Rumah Dinas / Hunian Pegawai / Co-Living';
    }

    if (isTanah) {
      if (asset.luasTanah >= 2000) {
        return 'Sewa Lahan Terbuka (Rest Area / Depo Logistik / Fasilitas Umum)';
      }
      return 'Sewa Lahan Komersial / Parkir / Tempat Usaha UMKM';
    }

    // Default based on POI density
    if (poiCount >= 2) {
      return 'Sewa Komersial / Tempat Usaha Jasa & Perdagangan';
    }
    return 'Optimalisasi Penggunaan Internal / Sewa Jangka Pendek';
  }
};
