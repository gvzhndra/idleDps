/**
 * Multi-Level Spatial Analytics Engine & POI Density Engine
 * Khusus KPKNL Denpasar & Seluruh Wilayah Provinsi Bali
 */

const REGENCY_CAPITALS = {
  'Kota Denpasar': { name: 'Pusat Kota Denpasar (Renon)', lat: -8.6705, lng: 115.2260 },
  'Kabupaten Badung': { name: 'Pusat Kab. Badung (Mangupura)', lat: -8.5833, lng: 115.1819 },
  'Kabupaten Gianyar': { name: 'Pusat Kab. Gianyar (Kota Gianyar)', lat: -8.5398, lng: 115.3275 },
  'Kabupaten Tabanan': { name: 'Pusat Kab. Tabanan (Kota Tabanan)', lat: -8.5412, lng: 115.1256 },
  'Kabupaten Buleleng': { name: 'Pusat Kab. Buleleng (Singaraja)', lat: -8.1120, lng: 115.0882 },
  'Kabupaten Karangasem': { name: 'Pusat Kab. Karangasem (Amlapura)', lat: -8.4475, lng: 115.6148 },
  'Kabupaten Klungkung': { name: 'Pusat Kab. Klungkung (Semarapura)', lat: -8.5356, lng: 115.4039 },
  'Kabupaten Bangli': { name: 'Pusat Kab. Bangli (Kota Bangli)', lat: -8.4559, lng: 115.3547 },
  'Kabupaten Jembrana': { name: 'Pusat Kab. Jembrana (Negara)', lat: -8.3585, lng: 114.6295 }
};

// Nighttime Lights Luminosity & Commercial Hub Activity Centers in Bali
const NIGHTTIME_LIGHTS_HUBS = [
  { name: 'Kawasan Komersial Berawa Beach & Canggu Lifestyle Hub', lat: -8.6543, lng: 115.1438, nightLightScore: 99, tier: 'Sangat Tinggi (High Luminosity)' },
  { name: 'Kawasan Komersial & Nightlife Kuta - Seminyak', lat: -8.7180, lng: 115.1686, nightLightScore: 98, tier: 'Sangat Tinggi (High Luminosity)' },
  { name: 'Koridor Bisnis & Pariwisata Sanur', lat: -8.6782, lng: 115.2589, nightLightScore: 90, tier: 'Tinggi (High Luminosity)' },
  { name: 'Pusat Wisata Seni & Budaya Ubud', lat: -8.5069, lng: 115.2625, nightLightScore: 92, tier: 'Tinggi (High Luminosity)' },
  { name: 'Kawasan MICE & Resort Internasional Nusa Dua', lat: -8.7983, lng: 115.2317, nightLightScore: 88, tier: 'Tinggi (High Luminosity)' },
  { name: 'Pusat Perdagangan Kota Denpasar (Renon / Teuku Umar)', lat: -8.6705, lng: 115.2260, nightLightScore: 85, tier: 'Sedang-Tinggi (Medium-High)' },
  { name: 'Pusat Kota Singaraja Buleleng', lat: -8.1120, lng: 115.0882, nightLightScore: 72, tier: 'Sedang (Medium Luminosity)' },
  { name: 'Pusat Kota & Pemerintahan Tabanan', lat: -8.5410, lng: 115.1316, nightLightScore: 78, tier: 'Sedang-Tinggi (Medium Luminosity)' }
];

// Rich Comprehensive POIs covering Berawa/Canggu, Sanglah, Renon, Tuban, Tabanan, Bedugul, etc.
const BALI_EXTENDED_POIS = [
  // --- BERAWA BEACH / CANGGU AREA (Kejaksaan Tinggi Bali Mess - BMN-25) ---
  { name: 'Pantai Berawa (Berawa Beach)', type: 'pariwisata', lat: -8.6548, lng: 115.1420 },
  { name: 'Atlas Beach Fest & Beach Club', type: 'pasar', lat: -8.6541, lng: 115.1430 },
  { name: 'Finns Beach Club Canggu', type: 'pasar', lat: -8.6552, lng: 115.1425 },
  { name: 'Lv8 Resort Hotel Berawa', type: 'hotel', lat: -8.6538, lng: 115.1445 },
  { name: 'Swarga Suites Bali Berawa', type: 'hotel', lat: -8.6545, lng: 115.1435 },
  { name: 'Secana Cottage & Villa Berawa', type: 'hotel', lat: -8.6530, lng: 115.1440 },
  { name: 'Canggu Station Commercial Hub', type: 'pasar', lat: -8.6520, lng: 115.1460 },
  { name: 'Polsek Kuta Utara (Pos Pantai Berawa)', type: 'polisi', lat: -8.6535, lng: 115.1455 },

  // --- SANGLAH / DENPASAR BARAT (BMKG Sanglah - BMN-3, BMN-4) ---
  { name: 'RSUP Prof. Ngoerah (Sanglah Denpasar)', type: 'kesehatan', lat: -8.6750, lng: 115.2120 },
  { name: 'Fakultas Kedokteran Universitas Udayana', type: 'pendidikan', lat: -8.6758, lng: 115.2110 },
  { name: 'Puskesmas Denpasar Barat I', type: 'kesehatan', lat: -8.6775, lng: 115.2085 },
  { name: 'Kantor Kelurahan Dauh Puri Klod', type: 'pemda', lat: -8.6780, lng: 115.2070 },
  { name: 'Pasar Sanglah Denpasar', type: 'pasar', lat: -8.6745, lng: 115.2105 },
  { name: 'SMA Negeri 4 Denpasar', type: 'pendidikan', lat: -8.6760, lng: 115.2080 },

  // --- TUBAN / KUTA / BANDARA AREA (BMKG Wilayah III - BMN-8) ---
  { name: 'Bandara Internasional I Gusti Ngurah Rai', type: 'transportasi', lat: -8.7400, lng: 115.1740 },
  { name: 'Hotel Novotel Bali Ngurah Rai Airport', type: 'hotel', lat: -8.7390, lng: 115.1760 },
  { name: 'Polsek Kawasan Bandara Ngurah Rai', type: 'polisi', lat: -8.7375, lng: 115.1770 },
  { name: 'Kantor Kelurahan Tuban Kuta', type: 'pemda', lat: -8.7365, lng: 115.1795 },
  { name: 'Pasar Adat Tuban', type: 'pasar', lat: -8.7370, lng: 115.1790 },

  // --- SANUR SOUTH / BKN DENPASAR (BMN-1, BMN-2, BMN-37) ---
  { name: 'Kantor Regional X BKN Denpasar', type: 'pemda', lat: -8.7150, lng: 115.2190 },
  { name: 'Pelabuhan Utama Benoa', type: 'transportasi', lat: -8.7180, lng: 115.2150 },
  { name: 'Polsek Kawasan Benoa', type: 'polisi', lat: -8.7170, lng: 115.2160 },
  { name: 'Puskesmas Denpasar Selatan II', type: 'kesehatan', lat: -8.7135, lng: 115.2200 },
  { name: 'SD Negeri 6 Sesetan', type: 'pendidikan', lat: -8.7140, lng: 115.2175 },

  // --- RENON / BPK RI BALI (BMN-16) ---
  { name: 'Kantor Gubernur Bali (Civic Center Renon)', type: 'pemda', lat: -8.6705, lng: 115.2250 },
  { name: 'Lapangan Renon & Monumen Bajra Sandhi', type: 'pariwisata', lat: -8.6718, lng: 115.2335 },
  { name: 'Polda Bali Headquarter', type: 'polisi', lat: -8.6740, lng: 115.2440 },
  { name: 'Consulate General of Japan / Australia', type: 'pemda', lat: -8.6750, lng: 115.2450 },
  { name: 'Plaza Renon & Resto Koridor', type: 'pasar', lat: -8.6730, lng: 115.2420 },

  // --- KOTA TABANAN (Kejari Tabanan BMN-28 & Rumah Negara Tabanan) ---
  { name: 'Kantor Bupati & Pemkab Tabanan', type: 'pemda', lat: -8.5385, lng: 115.1245 },
  { name: 'Polsek Tabanan Kota', type: 'polisi', lat: -8.5405, lng: 115.1305 },
  { name: 'Polres Tabanan Headquarter', type: 'polisi', lat: -8.5360, lng: 115.1180 },
  { name: 'SMP Negeri 1 Tabanan', type: 'pendidikan', lat: -8.5420, lng: 115.1310 },
  { name: 'SD Negeri 1 Delod Peken Tabanan', type: 'pendidikan', lat: -8.5415, lng: 115.1325 },
  { name: 'SMA Negeri 1 Tabanan', type: 'pendidikan', lat: -8.5355, lng: 115.1190 },
  { name: 'RSUD Kabupaten Tabanan', type: 'kesehatan', lat: -8.5390, lng: 115.1200 },
  { name: 'Puskesmas Tabanan III', type: 'kesehatan', lat: -8.5425, lng: 115.1320 },
  { name: 'Pasar Umum Tabanan Timur / Dauh Pala', type: 'pasar', lat: -8.5400, lng: 115.1330 },
  { name: 'Kantor Camat Tabanan', type: 'pemda', lat: -8.5395, lng: 115.1290 },

  // --- BATURITI / BEDUGUL TABANAN (Kejari Tabanan Rumah Dinas - BMN-27) ---
  { name: 'Kantor Camat Baturiti Tabanan', type: 'pemda', lat: -8.3160, lng: 115.0810 },
  { name: 'Polsek Baturiti Bedugul', type: 'polisi', lat: -8.3150, lng: 115.0820 },
  { name: 'Puskesmas Baturiti I', type: 'kesehatan', lat: -8.3145, lng: 115.0795 },
  { name: 'Pasar Sayur Baturiti', type: 'pasar', lat: -8.3170, lng: 115.0815 },
  { name: 'Kebun Raya Eka Karya Bedugul', type: 'pariwisata', lat: -8.2830, lng: 115.1550 }
];

const SpatialEngine = {
  calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371; // Radius of earth in km
    const dLat = this._deg2rad(lat2 - lat1);
    const dLon = this._deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._deg2rad(lat1)) * Math.cos(this._deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;
    return Math.round(distanceKm * 100) / 100;
  },

  _deg2rad(deg) {
    return deg * (Math.PI / 180);
  },

  formatLuas(m2) {
    if (!m2 || isNaN(m2)) return '0 m²';
    if (m2 >= 10000) {
      const ha = (m2 / 10000).toFixed(2);
      return `${m2.toLocaleString('id-ID')} m² (${ha} Ha)`;
    }
    return `${m2.toLocaleString('id-ID')} m²`;
  },

  getDistanceToKPKNL(assetLat, assetLng) {
    const kpknl = CONFIG.KPKNL_OFFICE;
    const distKm = this.calculateDistance(assetLat, assetLng, kpknl.lat, kpknl.lng);
    return {
      officeName: kpknl.name,
      distanceKm: distKm,
      distanceMeters: Math.round(distKm * 1000)
    };
  },

  getMultiLevelDistances(lat, lng, kabupatenName, kecamatanName, kelurahanName) {
    const provCap = REGENCY_CAPITALS['Kota Denpasar'];
    const provDist = this.calculateDistance(lat, lng, provCap.lat, provCap.lng);

    const regCap = REGENCY_CAPITALS[kabupatenName] || REGENCY_CAPITALS['Kota Denpasar'];
    const regDist = this.calculateDistance(lat, lng, regCap.lat, regCap.lng);

    const distCenterLat = regCap.lat + 0.005;
    const distCenterLng = regCap.lng + 0.005;
    const distCenterDist = this.calculateDistance(lat, lng, distCenterLat, distCenterLng);

    const villCenterLat = lat + 0.003;
    const villCenterLng = lng + 0.003;
    const villCenterDist = this.calculateDistance(lat, lng, villCenterLat, villCenterLng);

    let nearestNightHub = NIGHTTIME_LIGHTS_HUBS[0];
    let minNightDist = 999;

    NIGHTTIME_LIGHTS_HUBS.forEach(hub => {
      const d = this.calculateDistance(lat, lng, hub.lat, hub.lng);
      if (d < minNightDist) {
        minNightDist = d;
        nearestNightHub = hub;
      }
    });

    let nightLightScore = nearestNightHub.nightLightScore;
    if (minNightDist > 10) {
      nightLightScore = Math.max(45, nightLightScore - Math.round((minNightDist - 10) * 3));
    }

    return {
      provincialCapital: { name: provCap.name, distanceKm: provDist },
      regencyCapital: { name: regCap.name, distanceKm: regDist },
      districtCenter: { name: `Pusat Kec. ${kecamatanName || 'Terdekat'}`, distanceKm: distCenterDist },
      villageCenter: { name: `Pusat Kel./Desa ${kelurahanName || 'Terdekat'}`, distanceKm: villCenterDist },
      nighttimeHub: nearestNightHub,
      nightLightScore: nightLightScore
    };
  },

  getPOIsInCatchment(assetLat, assetLng, radiusMeters = 500) {
    if (!assetLat || !assetLng) return { totalCount: 0, pois: [] };

    const catchmentPois = [];

    BALI_EXTENDED_POIS.forEach(poi => {
      const distKm = this.calculateDistance(assetLat, assetLng, poi.lat, poi.lng);
      const distMeters = Math.round(distKm * 1000);

      if (distMeters <= radiusMeters) {
        const catKey = poi.type.toUpperCase();
        let catMeta = CONFIG.POI_CATEGORIES[catKey] || { name: 'Komersial & Fasilitas', icon: 'fa-location-dot', color: '#4a90e2' };

        if (poi.type === 'pariwisata') {
          catMeta = { name: 'Pariwisata & Pantai', icon: 'fa-umbrella-beach', color: '#e67e22' };
        } else if (poi.type === 'hotel') {
          catMeta = { name: 'Akomodasi & Hotel', icon: 'fa-hotel', color: '#9b59b6' };
        }

        catchmentPois.push({
          ...poi,
          categoryName: catMeta.name,
          icon: catMeta.icon,
          color: catMeta.color,
          distanceKm: distKm,
          distanceMeters: distMeters
        });
      }
    });

    catchmentPois.sort((a, b) => a.distanceMeters - b.distanceMeters);

    return {
      totalCount: catchmentPois.length,
      pois: catchmentPois
    };
  },

  getNearbyPOIs(assetLat, assetLng, limit = 8) {
    const catchment = this.getPOIsInCatchment(assetLat, assetLng, 500);
    return catchment.pois.slice(0, limit);
  }
};
