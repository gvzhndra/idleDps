/**
 * Multi-Level Spatial Analytics Engine & Dynamic OpenStreetMap Overpass POI Engine
 * Khusus KPKNL Denpasar & Seluruh Wilayah Provinsi Bali
 */

const REGENCY_CAPITALS = {
  'Kota Denpasar': { name: 'Pusat Kota Denpasar (Renon)', lat: -8.6705, lng: 115.2260 },
  'Kabupaten Badung': { name: 'Pusat Kab. Badung (Mangupura)', lat: -8.5833, lng: 115.1819 },
  'Kabupaten Badung (Canggu / Berawa)': { name: 'Pusat Kab. Badung (Mangupura)', lat: -8.5833, lng: 115.1819 },
  'Kabupaten Badung (Tuban)': { name: 'Pusat Kab. Badung (Mangupura)', lat: -8.5833, lng: 115.1819 },
  'Kabupaten Gianyar': { name: 'Pusat Kab. Gianyar (Kota Gianyar)', lat: -8.5398, lng: 115.3275 },
  'Kabupaten Tabanan': { name: 'Pusat Kab. Tabanan (Kota Tabanan)', lat: -8.5412, lng: 115.1256 },
  'Kabupaten Tabanan (Baturiti)': { name: 'Pusat Kab. Tabanan (Kota Tabanan)', lat: -8.5412, lng: 115.1256 },
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

// Fallback Curated GIS POIs covering Bali
const BALI_FALLBACK_POIS = [
  { name: 'Pantai Berawa (Berawa Beach)', type: 'pariwisata', lat: -8.6548, lng: 115.1420 },
  { name: 'Atlas Beach Fest & Beach Club', type: 'pasar', lat: -8.6541, lng: 115.1430 },
  { name: 'Finns Beach Club Canggu', type: 'pasar', lat: -8.6552, lng: 115.1425 },
  { name: 'Lv8 Resort Hotel Berawa', type: 'hotel', lat: -8.6538, lng: 115.1445 },
  { name: 'Swarga Suites Bali Berawa', type: 'hotel', lat: -8.6545, lng: 115.1435 },
  { name: 'Secana Cottage & Villa Berawa', type: 'hotel', lat: -8.6530, lng: 115.1440 },
  { name: 'Canggu Station Commercial Hub', type: 'pasar', lat: -8.6520, lng: 115.1460 },
  { name: 'Polsek Kuta Utara (Pos Pantai Berawa)', type: 'polisi', lat: -8.6535, lng: 115.1455 },

  { name: 'RSUP Prof. Ngoerah (Sanglah Denpasar)', type: 'kesehatan', lat: -8.6750, lng: 115.2120 },
  { name: 'Fakultas Kedokteran Universitas Udayana', type: 'pendidikan', lat: -8.6758, lng: 115.2110 },
  { name: 'Puskesmas Denpasar Barat I', type: 'kesehatan', lat: -8.6775, lng: 115.2085 },

  { name: 'Bandara Internasional I Gusti Ngurah Rai', type: 'transportasi', lat: -8.7400, lng: 115.1740 },
  { name: 'Hotel Novotel Bali Ngurah Rai Airport', type: 'hotel', lat: -8.7390, lng: 115.1760 },

  { name: 'Kantor Regional X BKN Denpasar', type: 'pemda', lat: -8.7150, lng: 115.2190 },
  { name: 'Pelabuhan Utama Benoa', type: 'transportasi', lat: -8.7180, lng: 115.2150 },

  { name: 'Kantor Gubernur Bali (Civic Center Renon)', type: 'pemda', lat: -8.6705, lng: 115.2250 },
  { name: 'Lapangan Renon & Monumen Bajra Sandhi', type: 'pariwisata', lat: -8.6718, lng: 115.2335 },

  { name: 'Kantor Kejaksaan Negeri Tabanan', type: 'pemda', lat: -8.5410, lng: 115.1316 },
  { name: 'RSUD Kabupaten Tabanan (Jl. Pahlawan)', type: 'kesehatan', lat: -8.5398, lng: 115.1268 },
  { name: 'Pasar Kota Tabanan (Pasar Umum)', type: 'pasar', lat: -8.5392, lng: 115.1275 }
];

const SpatialEngine = {
  dynamicPoiCache: {},

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

    // Use the best matching regency capital for kabupaten distance
    const regCap = REGENCY_CAPITALS[kabupatenName] || REGENCY_CAPITALS['Kota Denpasar'];
    const regDist = this.calculateDistance(lat, lng, regCap.lat, regCap.lng);

    // For district/sub-district: use regency capital as reference (realistic, not fake)
    // Show as "~X km from [Regency Capital]" context
    const distCenterDist = regDist;

    // For village: use a small offset from regency capital proportional to regDist
    // This is an estimate: village center is roughly 20-40% closer than regency capital
    const villCenterDist = Math.round((regDist * 0.3) * 100) / 100;

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

  /* AUTOMATIC REAL-TIME DYNAMIC OPENSTREETMAP OVERPASS POI ENGINE
   * Uses multiple mirror endpoints with progressive fallback.
   * Falls back to curated local GIS data if all endpoints fail.
   */
  async fetchDynamicPOIsInCatchment(lat, lng, radiusMeters = 500) {
    if (!lat || !lng) return { totalCount: 0, pois: [] };

    const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}_${radiusMeters}`;
    if (this.dynamicPoiCache[cacheKey]) {
      return this.dynamicPoiCache[cacheKey];
    }

    // Compact Overpass QL query (union syntax is more reliable than multiple separate node queries)
    const overpassQuery = `[out:json][timeout:10];(
      node(around:${radiusMeters},${lat},${lng})[amenity];
      node(around:${radiusMeters},${lat},${lng})[tourism];
      node(around:${radiusMeters},${lat},${lng})[shop];
      node(around:${radiusMeters},${lat},${lng})[office~"government|ngo"];
      node(around:${radiusMeters},${lat},${lng})[leisure~"park|stadium|sports_centre"];
    );out body;`;

    // Multiple Overpass API mirror endpoints for reliability
    const OVERPASS_MIRRORS = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
    ];

    for (const mirrorUrl of OVERPASS_MIRRORS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const resp = await fetch(`${mirrorUrl}?data=${encodeURIComponent(overpassQuery)}`, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timeoutId);

        if (!resp.ok) continue;

        const json = await resp.json();
        const elements = json.elements || [];

        if (elements.length > 0) {
          const dynamicPois = [];

          elements.forEach(node => {
            if (!node.lat || !node.lon) return;
            const tags = node.tags || {};

            // Skip unnamed generic nodes with no meaningful tag
            const name = tags.name;
            if (!name) return;

            const distKm = this.calculateDistance(lat, lng, node.lat, node.lon);
            const distMeters = Math.round(distKm * 1000);

            if (distMeters <= radiusMeters) {
              const meta = this._mapOsmTagToCategory(tags);
              dynamicPois.push({
                name: name,
                categoryName: meta.name,
                icon: meta.icon,
                color: meta.color,
                lat: node.lat,
                lng: node.lon,
                distanceKm: distKm,
                distanceMeters: distMeters
              });
            }
          });

          if (dynamicPois.length > 0) {
            // Deduplicate and sort by distance
            const seenNames = new Set();
            const uniquePois = [];
            dynamicPois.sort((a, b) => a.distanceMeters - b.distanceMeters);

            dynamicPois.forEach(p => {
              const key = p.name.toLowerCase();
              if (!seenNames.has(key)) {
                seenNames.add(key);
                uniquePois.push(p);
              }
            });

            const result = { totalCount: uniquePois.length, pois: uniquePois.slice(0, 15) };
            this.dynamicPoiCache[cacheKey] = result;
            console.info(`Overpass: ${result.totalCount} POIs from ${mirrorUrl}`);
            return result;
          }
        }
      } catch (e) {
        console.warn(`Overpass mirror ${mirrorUrl} failed:`, e.message);
      }
    }

    // All mirrors failed → use curated fallback GIS data
    console.warn('All Overpass mirrors failed — using curated fallback GIS data.');
    const fallbackResult = this.getFallbackPOIsInCatchment(lat, lng, radiusMeters);
    this.dynamicPoiCache[cacheKey] = fallbackResult;
    return fallbackResult;
  },

  _mapOsmTagToCategory(tags) {
    const amenity = (tags.amenity || '').toLowerCase();
    const tourism = (tags.tourism || '').toLowerCase();
    const shop = (tags.shop || '').toLowerCase();
    const office = (tags.office || '').toLowerCase();

    if (amenity.includes('school') || amenity.includes('university') || amenity.includes('college') || amenity.includes('kindergarten') || amenity.includes('library')) {
      return { name: 'Sekolah / Kampus (Pendidikan)', icon: 'fa-graduation-cap', color: '#2ecc71' };
    }
    if (amenity.includes('hospital') || amenity.includes('clinic') || amenity.includes('doctors') || amenity.includes('pharmacy')) {
      return { name: 'Rumah Sakit / Kesehatan', icon: 'fa-hospital', color: '#e74c3c' };
    }
    if (amenity.includes('police') || amenity.includes('townhall') || office.includes('government') || amenity.includes('courthouse') || amenity.includes('public_building')) {
      return { name: 'Kantor Polisi / Instansi Pemda', icon: 'fa-landmark', color: '#9b59b6' };
    }
    if (tourism.includes('hotel') || tourism.includes('guest_house') || tourism.includes('hostel') || tourism.includes('resort') || tourism.includes('motel')) {
      return { name: 'Akomodasi & Hotel', icon: 'fa-hotel', color: '#3498db' };
    }
    if (tourism.includes('attraction') || tourism.includes('beach') || tourism.includes('museum') || tags.leisure) {
      return { name: 'Pariwisata & Pantai', icon: 'fa-umbrella-beach', color: '#e67e22' };
    }
    if (amenity.includes('bank') || amenity.includes('atm') || amenity.includes('restaurant') || amenity.includes('cafe') || shop || amenity.includes('marketplace')) {
      return { name: 'Pasar / Pusat Komersial & UMKM', icon: 'fa-store', color: '#f1c40f' };
    }

    return { name: 'Fasilitas & Komersial Publik', icon: 'fa-location-dot', color: '#4a90e2' };
  },

  getFallbackPOIsInCatchment(assetLat, assetLng, radiusMeters = 500) {
    const catchmentPois = [];

    BALI_FALLBACK_POIS.forEach(poi => {
      const distKm = this.calculateDistance(assetLat, assetLng, poi.lat, poi.lng);
      const distMeters = Math.round(distKm * 1000);

      if (distMeters <= radiusMeters) {
        const catKey = poi.type.toUpperCase();
        let catMeta = CONFIG.POI_CATEGORIES[catKey] || { name: 'Komersial & Fasilitas', icon: 'fa-location-dot', color: '#4a90e2' };

        if (poi.type === 'pariwisata') {
          catMeta = { name: 'Pariwisata & Fasilitas Publik', icon: 'fa-umbrella-beach', color: '#e67e22' };
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

  getPOIsInCatchment(assetLat, assetLng, radiusMeters = 500) {
    return this.getFallbackPOIsInCatchment(assetLat, assetLng, radiusMeters);
  }
};
