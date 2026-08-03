/**
 * Recommendation Display & Analysis Engine
 * Merges official user recommendation input from Google Sheets with
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
    const officialRec = asset.rekomendasiUser || asset.rekomendasiPemanfaatan || '';
    const smartBackendRec = asset.smartSuggestionBackend || this.calculateLocalSmartSuggestion(asset);

    const zoning = asset.zoningCode || 'K-1';
    let badgeInfo = CONFIG.RECOMMENDATION_TYPES.SEWA_KOMERSIAL;
    let rationale = [];

    if (asset.zoningName) {
      rationale.push(`Sesuai dengan **Zonasi Tata Ruang (${asset.zoningName})**.`);
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

    const checkText = (officialRec || smartBackendRec).toLowerCase();
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
      officialTitle: officialRec || smartBackendRec,
      smartSuggestion: smartBackendRec,
      rationale: rationale,
      estimatedPnbpRange: SpatialEngine.formatRupiah(asset.potensiPnbpTahun) + ' / tahun',
      hasOfficialInput: !!officialRec
    };
  },

  calculateLocalSmartSuggestion(asset) {
    const code = String(asset.zoningCode || 'K-1').toUpperCase();
    const isTanah = asset.kategori === 'Tanah Kosong' || asset.luasBangunan === 0;

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
