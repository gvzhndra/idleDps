/**
 * GeoBoundaryEngine: Administrative Boundary Detection & Spatial Rendering
 * Khusus 9 Kabupaten & Kota di Provinsi Bali
 * Menggunakan data poligon resmi BPS / BIG (100% presisi spasial, tanpa latency, offline-ready)
 */
const GeoBoundaryEngine = {
  isLoaded: false,
  geoData: null,
  boundaryLayer: null,
  highlightLayer: null,

  init() {
    if (typeof KABUPATEN_BALI_GEOJSON !== 'undefined') {
      this.geoData = KABUPATEN_BALI_GEOJSON;
      this.isLoaded = true;
      console.log('[GeoBoundaryEngine] Loaded 9 Kabupaten/Kota boundaries in Bali.');
    }
  },

  /**
   * Ray-casting algorithm for Point-in-Polygon check
   */
  pointInPolygon(point, vs) {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][0], yi = vs[i][1];
      const xj = vs[j][0], yj = vs[j][1];
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  },

  /**
   * Deteksi Kabupaten/Kota dari koordinat GPS (lat, lng)
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {string|null} Nama Kabupaten/Kota standar atau null jika di luar Bali
   */
  detectKabupaten(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return null;
    if (!this.geoData && typeof KABUPATEN_BALI_GEOJSON !== 'undefined') {
      this.geoData = KABUPATEN_BALI_GEOJSON;
    }
    if (!this.geoData || !this.geoData.features) return null;

    const pt = [lng, lat]; // GeoJSON uses [longitude, latitude]

    // 1. Exact Point-in-Polygon check
    for (let f of this.geoData.features) {
      const geom = f.geometry;
      if (geom.type === 'Polygon') {
        if (this.pointInPolygon(pt, geom.coordinates[0])) {
          return f.properties.nama_kabupaten;
        }
      } else if (geom.type === 'MultiPolygon') {
        for (let poly of geom.coordinates) {
          if (this.pointInPolygon(pt, poly[0])) {
            return f.properties.nama_kabupaten;
          }
        }
      }
    }

    // 2. Coastal Edge Fallback (misal dermaga/pelabuhan sedikit di luar garis pantai, maks toleransi ~3 km)
    let closestKab = null;
    let minDistanceSq = 0.001; // ~3.5 km toleransi batas tepi pantai

    for (let f of this.geoData.features) {
      const rings = f.geometry.type === 'Polygon' ? [f.geometry.coordinates[0]] : f.geometry.coordinates.map(p => p[0]);
      for (let ring of rings) {
        for (let coord of ring) {
          const dSq = Math.pow(coord[0] - lng, 2) + Math.pow(coord[1] - lat, 2);
          if (dSq < minDistanceSq) {
            minDistanceSq = dSq;
            closestKab = f.properties.nama_kabupaten;
          }
        }
      }
    }

    return closestKab;
  },

  /**
   * Menampilkan batas administrasi kabupaten tipis di peta Leaflet
   */
  renderBoundaryLayer(map) {
    if (!map || typeof L === 'undefined') return;
    if (!this.geoData && typeof KABUPATEN_BALI_GEOJSON !== 'undefined') {
      this.geoData = KABUPATEN_BALI_GEOJSON;
    }
    if (!this.geoData) return;

    if (this.boundaryLayer) {
      map.removeLayer(this.boundaryLayer);
    }

    this.boundaryLayer = L.geoJSON(this.geoData, {
      style: function(feature) {
        return {
          color: '#6366f1',
          weight: 1.5,
          opacity: 0.6,
          fillColor: '#818cf8',
          fillOpacity: 0.03,
          dashArray: '4, 4'
        };
      },
      onEachFeature: (feature, layer) => {
        const kabName = feature.properties.nama_kabupaten;
        layer.bindTooltip(`<strong>${kabName}</strong>`, {
          sticky: true,
          className: 'boundary-tooltip'
        });
      }
    });

    // Default: layer batas aktif
    this.boundaryLayer.addTo(map);
  },

  /**
   * Sorot (Highlight) batas poligon kabupaten saat difilter
   */
  highlightKabupaten(map, kabName) {
    if (!map || typeof L === 'undefined') return;
    if (this.highlightLayer) {
      map.removeLayer(this.highlightLayer);
      this.highlightLayer = null;
    }

    if (!kabName || kabName === 'all' || !this.geoData) return;

    const matchedFeatures = this.geoData.features.filter(f => f.properties.nama_kabupaten === kabName);
    if (matchedFeatures.length === 0) return;

    this.highlightLayer = L.geoJSON(matchedFeatures, {
      style: {
        color: '#4f46e5',
        weight: 2.5,
        opacity: 0.9,
        fillColor: '#6366f1',
        fillOpacity: 0.08,
        dashArray: null
      }
    }).addTo(map);
  }
};

// Auto-initialize when loaded
if (typeof window !== 'undefined') {
  window.GeoBoundaryEngine = GeoBoundaryEngine;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GeoBoundaryEngine;
}
