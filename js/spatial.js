/**
 * Spatial Analytics & Distance Calculator Engine
 * Khusus KPKNL Denpasar
 */

const SpatialEngine = {
  /**
   * Calculate Haversine distance between two sets of lat/lng coordinates
   * @param {number} lat1 
   * @param {number} lon1 
   * @param {number} lat2 
   * @param {number} lon2 
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
   * @param {number} lat 
   * @param {number} lng 
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
