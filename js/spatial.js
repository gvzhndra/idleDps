/**
 * Spatial Analytics & Distance Calculator Engine
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

// Major Commercial & Tourism Hubs in Bali (Activity Level Context)
const TOURISM_COMMERCIAL_HUBS = [
  { name: 'Pusat Tourism & Cultural Hub Ubud', district: 'Ubud', kabupaten: 'Kabupaten Gianyar', lat: -8.5069, lng: 115.2625, tier: 1, note: 'Tingkat keramaian & nilai komersial sangat tinggi (melampaui Kota Gianyar)' },
  { name: 'Pusat Commercial & Entertainment Hub Kuta', district: 'Kuta', kabupaten: 'Kabupaten Badung', lat: -8.7180, lng: 115.1686, tier: 1, note: 'Pusat pariwisata internasional utama & bisnis logistik' },
  { name: 'Kawasan Lifestyle & Tourism Hub Canggu', district: 'Canggu', kabupaten: 'Kabupaten Badung', lat: -8.6500, lng: 115.1380, tier: 1, note: 'Pusat pertumbuhan komersial & hospitality baru' },
  { name: 'Kawasan Resort & Marine Hub Sanur', district: 'Sanur', kabupaten: 'Kota Denpasar', lat: -8.6782, lng: 115.2589, tier: 1, note: 'Koridor pariwisata & dermaga penyeberangan utama' },
  { name: 'Kawasan MICE & Resort Nusa Dua', district: 'Nusa Dua', kabupaten: 'Kabupaten Badung', lat: -8.7983, lng: 115.2317, tier: 1, note: 'Kawasan konvensi & resort internasional' }
];

const SpatialEngine = {
  /**
   * Calculate Haversine distance between two sets of lat/lng coordinates
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = this._deg2rad(lat2 - lat1);
    const dLon = this._deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._deg2rad(lat1)) * Math.cos(this._deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;
    return Math.round(distanceKm * 10) / 10;
  },

  _deg2rad(deg) {
    return deg * (Math.PI / 180);
  },

  /**
   * Calculate distance to KPKNL Denpasar Office
   */
  getDistanceToKPKNL(lat, lng) {
    const office = CONFIG.KPKNL_OFFICE;
    const distanceKm = this.calculateDistance(lat, lng, office.lat, office.lng);

    return {
      office: office,
      distanceKm: distanceKm
    };
  },

  /**
   * Calculate multi-level administrative distances:
   * 1. Jarak ke Ibukota Provinsi Bali (Denpasar)
   * 2. Jarak ke Ibukota Kabupaten Terdekat (Closest Regency Capital)
   * 3. Jarak ke Pusat Hub Komersial / Pariwisata Terdekat
   * 4. Analisis Orientasi Pusat Keramaian Utama (Pusat Kab vs Pusat Desa vs Hub Komersial)
   */
  getMultiLevelDistances(lat, lng, kabupaten = '', kecamatan = '', kelurahan = '') {
    // 1. Provincial Capital (Denpasar - Renon)
    const provCap = REGENCY_CAPITALS['Kota Denpasar'];
    const distToProvincialCapital = this.calculateDistance(lat, lng, provCap.lat, provCap.lng);

    // 2. Find Nearest Regency Capital dynamically across Bali
    let nearestRegCap = null;
    let minRegCapDist = 999;

    Object.keys(REGENCY_CAPITALS).forEach(key => {
      const cap = REGENCY_CAPITALS[key];
      const dist = this.calculateDistance(lat, lng, cap.lat, cap.lng);
      if (dist < minRegCapDist) {
        minRegCapDist = dist;
        nearestRegCap = { ...cap, regencyKey: key, distanceKm: dist };
      }
    });

    // 3. Find Nearest Commercial / Tourism Hub
    let nearestHub = null;
    let minHubDist = 999;

    TOURISM_COMMERCIAL_HUBS.forEach(hub => {
      const d = this.calculateDistance(lat, lng, hub.lat, hub.lng);
      if (d < minHubDist) {
        minHubDist = d;
        nearestHub = { ...hub, distanceKm: d };
      }
    });

    // 4. Dynamic Crowd & Activity Center Determination
    let crowdCenterType = '';
    let crowdCenterName = '';
    let crowdCenterDesc = '';

    if (nearestHub && nearestHub.distanceKm <= 5.0) {
      crowdCenterType = 'Hub Komersial & Pariwisata';
      crowdCenterName = nearestHub.name;
      crowdCenterDesc = `Pusat keramaian & aktivitas ekonomi di lokasi ini berpusat di **${nearestHub.name}** (${nearestHub.distanceKm} km), yang memiliki intensitas kegiatan ekonomi & pariwisata lebih dominan dibanding pusat administratif kabupaten.`;
    } else if (nearestRegCap && nearestRegCap.distanceKm <= 8.0) {
      crowdCenterType = 'Pusat Ibukota Kabupaten';
      crowdCenterName = nearestRegCap.name;
      crowdCenterDesc = `Pusat keramaian & pelayanan publik utama berada di **${nearestRegCap.name}** (${nearestRegCap.distanceKm} km).`;
    } else {
      const localName = kelurahan || kecamatan || 'Desa/Kelurahan Setempat';
      crowdCenterType = 'Pusat Desa / Lokal';
      crowdCenterName = `Pusat Desa ${localName}`;
      crowdCenterDesc = `Aktivitas keramaian utama berpusat pada area **${localName}** (Skala Lokal / Lingkungan Permukiman).`;
    }

    return {
      provincialCapital: { name: 'Ibukota Provinsi (Denpasar)', distanceKm: distToProvincialCapital },
      regencyCapital: nearestRegCap,
      nearestHub: nearestHub,
      crowdCenter: {
        type: crowdCenterType,
        name: crowdCenterName,
        description: crowdCenterDesc
      }
    };
  },

  /**
   * Find nearby government and public POIs within maxRadiusKm
   */
  getNearbyPOIs(lat, lng, maxRadiusKm = 10) {
    if (typeof GOVERNMENT_POIS === 'undefined') return [];

    const poiListWithDist = GOVERNMENT_POIS.map(poi => {
      const dist = this.calculateDistance(lat, lng, poi.lat, poi.lng);
      const categoryInfo = CONFIG.POI_CATEGORIES[Object.keys(CONFIG.POI_CATEGORIES).find(key => CONFIG.POI_CATEGORIES[key].id === poi.type)] || {};
      return {
        ...poi,
        distanceKm: dist,
        categoryName: categoryInfo.name || poi.type,
        icon: categoryInfo.icon || 'fa-building',
        color: categoryInfo.color || '#8e7cc3'
      };
    });

    return poiListWithDist
      .filter(poi => poi.distanceKm <= maxRadiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  },

  formatRupiah(num) {
    if (!num) return 'Rp 0';
    if (num >= 1000000000) {
      return `Rp ${(num / 1000000000).toFixed(2)} Miliar`;
    }
    if (num >= 1000000) {
      return `Rp ${(num / 1000000).toFixed(0)} Juta`;
    }
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  },

  formatLuas(m2) {
    if (!m2) return '0 m²';
    if (m2 >= 10000) {
      return `${m2.toLocaleString('id-ID')} m² (${(m2 / 10000).toFixed(2)} Ha)`;
    }
    return `${m2.toLocaleString('id-ID')} m²`;
  }
};

