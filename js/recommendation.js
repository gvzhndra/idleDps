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
      rationale.push(`Sesuai dengan **Zonasi Tata Ruang (${asset.zoningName} - ${asset.zoningCode || 'Kategori 1'})**.`);
    }

    // Generalized Spatial Crowd & Activity Center Context
    const spatialContext = SpatialEngine.getMultiLevelDistances(
      asset.lat, asset.lng, asset.kabupaten, asset.kecamatan, asset.kelurahan
    );

    if (spatialContext.crowdCenter && spatialContext.crowdCenter.description) {
      rationale.push(spatialContext.crowdCenter.description);
    }

    // Enrich POI Proximity Analysis
    if (nearbyPOIs.length > 0) {
      const poiSummary = nearbyPOIs.slice(0, 3).map(p => `${p.name} (${p.distanceKm} km)`).join(', ');
      rationale.push(`**Fasilitas Terdekat (POI):** Berdekatan dengan ${poiSummary}.`);
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
    const code = String(asset.zoningCode || 'Kategori 1').toLowerCase();
    const isTanah = asset.kategori === 'Tanah Kosong' || asset.luasBangunan === 0;

    if (code.includes('kategori 2') || code.includes('k-2') || code.includes('pariwisata')) {
      return isTanah 
        ? 'Kerja Sama Pemanfaatan (KSP) Beach Club / Boutique Eco-Resort / Pariwisata'
        : 'Sewa / KSP Restoran Concept / Cafe Pariwisata & Hospitality';
    }
    if (code.includes('kategori 3') || code.includes('k-3') || code.includes('pemerintahan')) {
      return 'Alih Status Penggunaan / Pinjam Pakai Satker Kemenkeu / Pemda';
    }
    if (code.includes('kategori 4') || code.includes('k-4') || code.includes('perumahan')) {
      return 'Rumah Dinas Pegawai / Mess Instansi / Co-Living Hunian';
    }
    if (code.includes('kategori 5') || code.includes('k-5') || code.includes('hijau') || code.includes('rth')) {
      return 'Optimalisasi Terbatas / Agrowisata Organik / Taman Edukasi';
    }

    // Default: Kategori 1 (Perdagangan & Jasa)
    return (asset.luasTanah >= 3000) 
      ? 'Sewa Depo Logistik / SPBU / Supermarket Modern' 
      : 'Sewa Komersial Ruko / Perkantoran Swasta / UMKM';
  }
};

