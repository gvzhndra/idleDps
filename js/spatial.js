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
  { name: 'Pusat Kota Singaraja Buleleng', lat: -8.1120, lng: 115.0882, nightLightScore: 72, tier: 'Sedang (Medium Luminosity)' }
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

  // --- KOTA TABANAN (Kejari Tabanan - BMN-28, BMN-35) ---
  { name: 'Kantor Bupati Tabanan', type: 'pemda', lat: -8.5380, lng: 115.1220 },
  { name: 'RSUD Kabupaten Tabanan', type: 'kesehatan', lat: -8.5390, lng: 115.1200 },
  { name: 'Polres Tabanan', type: 'polisi', lat: -8.5360, lng: 115.1180 },
  { name: 'Pasar Umum Tabanan', type: 'pasar', lat: -8.5375, lng: 115.1240 },
  { name: 'SMA Negeri 1 Tabanan', type: 'pendidikan', lat: -8.5355, lng: 115.1190 },

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

  getDistanceToKPKNL(lat, lng) {
    const office = CONFIG.KPKNL_OFFICE;
    const distanceKm = Math.round(this.calculateDistance(lat, lng, office.lat, office.lng) * 10) / 10;
    return { office: office, distanceKm: distanceKm };
  },

  getMultiLevelDistances(lat, lng, kabupaten = '', kecamatan = '', kelurahan = '') {
    const provCap = REGENCY_CAPITALS['Kota Denpasar'];
    const distProv = Math.round(this.calculateDistance(lat, lng, provCap.lat, provCap.lng) * 10) / 10;

    let nearestReg = null;
    let minRegDist = 999;
    Object.keys(REGENCY_CAPITALS).forEach(key => {
      const cap = REGENCY_CAPITALS[key];
      const dist = this.calculateDistance(lat, lng, cap.lat, cap.lng);
      if (dist < minRegDist) {
        minRegDist = dist;
        nearestReg = { ...cap, regencyKey: key, distanceKm: Math.round(dist * 10) / 10 };
      }
    });

    const districtName = kecamatan || 'Kecamatan Setempat';
    const distDistrict = Math.max(0.4, Math.round((minRegDist * 0.45) * 10) / 10);

    const villageName = kelurahan || 'Pusat Desa Setempat';
    const distVillage = Math.max(0.2, Math.round((distDistrict * 0.35) * 10) / 10);

    let nearestNightHub = null;
    let minNightDist = 999;

    NIGHTTIME_LIGHTS_HUBS.forEach(hub => {
      const d = this.calculateDistance(lat, lng, hub.lat, hub.lng);
      if (d < minNightDist) {
        minNightDist = d;
        nearestNightHub = { ...hub, distanceKm: Math.round(d * 10) / 10 };
      }
    });

    let nightLightScore = 50;
    if (nearestNightHub) {
      if (nearestNightHub.distanceKm <= 1.0) nightLightScore = 99;
      else if (nearestNightHub.distanceKm <= 3.0) nightLightScore = 92;
      else if (nearestNightHub.distanceKm <= 6.0) nightLightScore = 82;
      else if (nearestNightHub.distanceKm <= 12.0) nightLightScore = 70;
      else nightLightScore = 55;
    }

    return {
      provincialCapital: { name: 'Ibukota Provinsi (Denpasar)', distanceKm: distProv },
      regencyCapital: nearestReg,
      districtCenter: { name: `Pusat Kec. ${districtName}`, distanceKm: distDistrict },
      villageCenter: { name: `Pusat ${villageName}`, distanceKm: distVillage },
      nighttimeHub: nearestNightHub,
      nightLightScore: nightLightScore
    };
  },

  getNearbyPOIs(lat, lng, maxRadiusKm = 5) {
    const poiListWithDist = BALI_EXTENDED_POIS.map(poi => {
      const dist = this.calculateDistance(lat, lng, poi.lat, poi.lng);
      let catName = 'Fasilitas Publik';
      let icon = 'fa-building';
      let color = '#8e7cc3';

      if (poi.type === 'hotel') { catName = 'Hotel / Resort / Villa'; icon = 'fa-hotel'; color = '#e74c3c'; }
      else if (poi.type === 'pariwisata') { catName = 'Kawasan Wisata / Beach Club'; icon = 'fa-umbrella-beach'; color = '#e67e22'; }
      else if (poi.type === 'pasar') { catName = 'Pasar / Pusat Bisnis'; icon = 'fa-store'; color = '#f1c40f'; }
      else if (poi.type === 'polisi') { catName = 'Polsek / TNI'; icon = 'fa-user-shield'; color = '#3498db'; }
      else if (poi.type === 'pemda') { catName = 'Kantor Pemda / Instansi'; icon = 'fa-landmark'; color = '#9b59b6'; }
      else if (poi.type === 'kesehatan') { catName = 'Rumah Sakit / Puskesmas'; icon = 'fa-hospital'; color = '#e74c3c'; }
      else if (poi.type === 'pendidikan') { catName = 'Sekolah / Kampus'; icon = 'fa-graduation-cap'; color = '#2ecc71'; }
      else if (poi.type === 'transportasi') { catName = 'Bandara / Pelabuhan'; icon = 'fa-plane-departure'; color = '#1abc9c'; }

      return {
        ...poi,
        distanceKm: Math.round(dist * 100) / 100,
        distanceMeters: Math.round(dist * 1000),
        categoryName: catName,
        icon: icon,
        color: color
      };
    });

    return poiListWithDist
      .filter(poi => poi.distanceKm <= maxRadiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  },

  getPOIsInCatchment(lat, lng, radiusMeters = 500) {
    const maxRadiusKm = radiusMeters / 1000;
    let nearby = this.getNearbyPOIs(lat, lng, maxRadiusKm);

    // Fallback if list is tight: search up to 800m
    if (nearby.length === 0) {
      nearby = this.getNearbyPOIs(lat, lng, 1.2).slice(0, 4);
    }

    return {
      radiusMeters: radiusMeters,
      radiusLabel: radiusMeters >= 1000 ? (radiusMeters / 1000) + ' km' : radiusMeters + ' m',
      totalCount: nearby.length,
      pois: nearby
    };
  },

  formatLuas(m2) {
    if (!m2) return '0 m²';
    if (m2 >= 10000) {
      return `${m2.toLocaleString('id-ID')} m² (${(m2 / 10000).toFixed(2)} Ha)`;
    }
    return `${m2.toLocaleString('id-ID')} m²`;
  }
};
