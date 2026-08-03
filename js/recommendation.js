/**
 * Recommendation Display & Analysis Engine
 * Merges user recommendation input from Google Sheets with
 * the automated backend smart spatial suggestion helper.
 */

const RecommendationEngine = {
  /**
   * Evaluate asset and return official & backend recommendation objects
   * @param {Object} asset 
   * @param {Array} nearbyPOIs 
   * @returns {Object} Recommendation result
   */
  generateRecommendation(asset, nearbyPOIs = []) {
    const userRec = asset.rekomendasiUser || asset.rekomendasiPemanfaatan || '';
    const smartBackendRec = asset.smartSuggestionBackend || this.calculateLocalSmartSuggestion(asset);

    let badgeInfo = CONFIG.RECOMMENDATION_TYPES.SEWA_KOMERSIAL;
    let rationale = [];

    if (asset.zoningName) {
      rationale.push(`Sesuai dengan **Zonasi Tata Ruang (${asset.zoningName})**.`);
    }

    // Spatial Hub Context (e.g., Ubud vs Kota Gianyar)
    const spatialContext = SpatialEngine.getMultiLevelDistances(
      asset.lat, asset.lng, asset.kabupaten, asset.kecamatan, asset.kelurahan
    );

    if (spatialContext.isUbudArea) {
      rationale.push(`Kawasan **Desa Ubud / Peliatan** Memiliki **Tingkat Keramaian & Aktivitas Komersial Pariwisata Sangat Tinggi** (Melampaui Pusat Kota Gianyar).`);
    } else if (spatialContext.nearestHub && spatialContext.nearestHub.distanceKm <= 5) {
      rationale.push(`Dekat dengan **${spatialContext.nearestHub.name}** (${spatialContext.nearestHub.distanceKm} km) - ${spatialContext.nearestHub.note}.`);
    }

    if (nearbyPOIs.length > 0) {
      const topPoi = nearbyPOIs[0];
      rationale.push(`Berdekatan dengan **${topPoi.name}** (${topPoi.distanceKm} km).`);
    }

    if (asset.catatanTim) {
      rationale.push(`Catatan Kajian Tim: ${asset.catatanTim}`);
    } else {
      rationale.push(`Kondisi Fisik: ${asset.kondisi}`);
    }

    const checkText = (userRec || smartBackendRec).toLowerCase();
    if (checkText.includes('sewa') || checkText.includes('komersial')) {
      badgeInfo = CONFIG.RECOMMENDATION_TYPES.SEWA_KOMERSIAL;
    } else if (checkText.includes('ksp') || checkText.includes('pariwisata') || checkText.includes('resort')) {
      badgeInfo = CONFIG.RECOMMENDATION_TYPES.KSP_PARIWISATA;
    } else if (checkText.includes('alih status') || checkText.includes('satker')) {
      badgeInfo = CONFIG.RECOMMENDATION_TYPES.ALIH_STATUS;
    } else if (checkText.includes('pinjam pakai')) {
      badgeInfo = CONFIG.RECOMMENDATION_TYPES.PINJAM_PAKAI;
    } else if (checkText.includes('agrowisata') || checkText.includes('pertanian')) {
      badgeInfo = CONFIG.RECOMMENDATION_TYPES.OPTIMALISASI_TERBATAS;
    }

    return {
      type: badgeInfo,
      officialTitle: userRec || smartBackendRec,
      smartSuggestion: smartBackendRec,
      rationale: rationale,
      hasOfficialInput: !!userRec
    };
  },

  calculateLocalSmartSuggestion(asset) {
    const code = String(asset.zoningCode || 'K-1').toUpperCase();
    const isTanah = asset.kategori === 'Tanah Kosong' || asset.luasBangunan === 0;

    const isUbud = asset.kecamatan && asset.kecamatan.toLowerCase().includes('ubud');

    if (isUbud) {
      return isTanah 
        ? 'Kerja Sama Pemanfaatan (KSP) Boutique Eco-Resort / Galeri Seni & Budaya Ubud'
        : 'Sewa Komersial Restoran High-End / Galeri Seni & Boutique Cafe Ubud';
    }

    switch (code) {
      case 'K-2':
        return isTanah 
          ? 'Kerja Sama Pemanfaatan (KSP) Beach Club / Eco-Resort'
          : 'Sewa / KSP Restoran Concept / Cafe Pariwisata';
      case 'K-3':
        return 'Alih Status Penggunaan / Pinjam Pakai Satker Kemenkeu/Instansi';
      case 'K-1':
      default:
        return (asset.luasTanah >= 3000) 
          ? 'Sewa Depo Logistik / SPBU / Supermarket Modern' 
          : 'Sewa Komersial Ruko / Perkantoran Swasta / UMKM';
      case 'K-4':
        return 'Rumah Dinas Pegawai / Mess Instansi / Sewa Hunian';
      case 'K-5':
        return 'Optimalisasi Terbatas / Agrowisata Organik / Taman Edukasi';
    }
  }
};

