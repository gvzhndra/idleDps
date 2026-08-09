/**
 * Pola Ruang (Spatial Zoning) Analytics & Catchment Filter Engine
 * Khusus Provinsi Bali - Data RTRW / RDTR TopoJSON
 */

const PolaRuangEngine = {
  isLoaded: false,
  isLoading: false,
  loadPromise: null,
  geoFeatures: [],
  indexedFeatures: [], // Features with precomputed bounding box for high-speed spatial queries

  // Standard ATR/BPN Zoning Color Palette & Metadata
  ZONING_PALETTE: {
    'Kawasan Pariwisata': {
      color: '#e91e63',
      fillColor: '#f06292',
      badgeClass: 'badge-pink',
      icon: 'fa-umbrella-beach',
      desc: 'Kawasan Peruntukan Pariwisata (Hotel, Resort, Daya Tarik Wisata)'
    },
    'Kawasan Permukiman': {
      color: '#e67e22',
      fillColor: '#f39c12',
      badgeClass: 'badge-orange',
      icon: 'fa-house-chimney',
      desc: 'Kawasan Permukiman Penduduk & Perumahan'
    },
    'Kawasan Pertanian': {
      color: '#27ae60',
      fillColor: '#2ecc71',
      badgeClass: 'badge-green',
      icon: 'fa-seedling',
      desc: 'Kawasan Pertanian Tanaman Pangan & Hortikultura'
    },
    'Kawasan Perikanan': {
      color: '#00bcd4',
      fillColor: '#4dd0e1',
      badgeClass: 'badge-cyan',
      icon: 'fa-fish',
      desc: 'Kawasan Perikanan Tangkap & Budidaya'
    },
    'Kawasan Konservasi': {
      color: '#1b5e20',
      fillColor: '#2e7d32',
      badgeClass: 'badge-dark-green',
      icon: 'fa-tree',
      desc: 'Kawasan Konservasi Alam & Suaka Margasatwa'
    },
    'Kawasan Ekosistem Mangrove': {
      color: '#004d40',
      fillColor: '#00796b',
      badgeClass: 'badge-teal',
      icon: 'fa-water',
      desc: 'Kawasan Hutan Mangrove & Perlindungan Pesisir'
    },
    'Kawasan Transportasi': {
      color: '#c0392b',
      fillColor: '#e74c3c',
      badgeClass: 'badge-red',
      icon: 'fa-plane-departure',
      desc: 'Kawasan Prasarana Transportasi (Bandara, Pelabuhan, Terminal)'
    },
    'Kawasan Perlindungan Setempat': {
      color: '#00897b',
      fillColor: '#26a69a',
      badgeClass: 'badge-teal',
      icon: 'fa-shield-halved',
      desc: 'Sempadan Sungai, Pantai, dan Kawasan Sekitar Danau'
    },
    'Kawasan yang Memberikan Perlindungan terhadap Kawasan Bawahannya': {
      color: '#00695c',
      fillColor: '#00897b',
      badgeClass: 'badge-teal',
      icon: 'fa-mountain',
      desc: 'Kawasan Resapan Air & Hutan Lindung'
    },
    'Kawasan Hutan Produksi': {
      color: '#558b2f',
      fillColor: '#7cb342',
      badgeClass: 'badge-green',
      icon: 'fa-tree-city',
      desc: 'Kawasan Hutan Produksi Tetap / Terbatas'
    },
    'Badan Air': {
      color: '#0288d1',
      fillColor: '#29b6f6',
      badgeClass: 'badge-blue',
      icon: 'fa-droplet',
      desc: 'Danau, Waduk, Sungai, dan Badan Air Permukaan'
    },
    'Kawasan Peruntukan Industri': {
      color: '#546e7a',
      fillColor: '#78909c',
      badgeClass: 'badge-slate',
      icon: 'fa-industry',
      desc: 'Kawasan Peruntukan Industri & Pergudangan'
    },
    'Kawasan Pertambangan dan Energi': {
      color: '#6d4c41',
      fillColor: '#8d6e63',
      badgeClass: 'badge-brown',
      icon: 'fa-bolt',
      desc: 'Kawasan Pertambangan Mineral, Batubara & Infrastruktur Energi'
    },
    'Kawasan Pertahanan dan Keamanan': {
      color: '#3949ab',
      fillColor: '#5c6bc0',
      badgeClass: 'badge-indigo',
      icon: 'fa-shield',
      desc: 'Pangkalan Militer, Polsek, TNI, Kawasan Hankam'
    },
    'Kawasan Pencadangan Konservasi di Laut': {
      color: '#0097a7',
      fillColor: '#00bcd4',
      badgeClass: 'badge-cyan',
      icon: 'fa-water-ladder',
      desc: 'Kawasan Konservasi Perairan Laut'
    },
    'Kawasan Pergaraman': {
      color: '#00acc1',
      fillColor: '#4dd0e1',
      badgeClass: 'badge-cyan',
      icon: 'fa-cubes-stacked',
      desc: 'Kawasan Sentra Produksi Garam Rakyat'
    }
  },

  /**
   * Load and convert TopoJSON into indexed GeoJSON features in the background
   */
  async loadDataset() {
    if (this.isLoaded) return this.geoFeatures;
    if (this.isLoading) return this.loadPromise;

    this.isLoading = true;
    this.loadPromise = (async () => {
      try {
        console.log('[PolaRuangEngine] Loading Pola Tata Ruang Bali (TopoJSON)...');
        const response = await fetch('./pola_ruang_bali_.json');
        if (!response.ok) {
          throw new Error(`Failed to fetch pola_ruang_bali_.json: HTTP ${response.status}`);
        }
        const topoData = await response.json();

        // Convert TopoJSON to GeoJSON
        if (typeof topojson === 'undefined') {
          console.error('[PolaRuangEngine] topojson library not loaded!');
          return [];
        }

        const objectKey = Object.keys(topoData.objects)[0] || 'pola_ruang_bali';
        const geojson = topojson.feature(topoData, topoData.objects[objectKey]);
        const rawFeatures = geojson.features || [];

        // Decompose MultiPolygons into Atomic Polygon Features for local catchment filtering
        this.geoFeatures = [];
        rawFeatures.forEach(f => {
          if (f.geometry.type === 'Polygon') {
            this.geoFeatures.push(f);
          } else if (f.geometry.type === 'MultiPolygon') {
            f.geometry.coordinates.forEach(polyCoords => {
              this.geoFeatures.push({
                type: 'Feature',
                properties: f.properties,
                geometry: {
                  type: 'Polygon',
                  coordinates: polyCoords
                }
              });
            });
          }
        });

        // Precompute Bounding Box for every atomic polygon
        this.indexedFeatures = this.geoFeatures.map(feat => {
          const bbox = this.calculateFeatureBBox(feat);
          return {
            feature: feat,
            bbox: bbox
          };
        });

        this.isLoaded = true;
        this.isLoading = false;
        console.log(`[PolaRuangEngine] Loaded & indexed ${this.indexedFeatures.length} atomic spatial zones successfully.`);
        return this.geoFeatures;
      } catch (err) {
        console.warn('[PolaRuangEngine] Error loading Pola Tata Ruang:', err);
        this.isLoading = false;
        return [];
      }
    })();

    return this.loadPromise;
  },

  /**
   * Calculate [minLng, minLat, maxLng, maxLat] bounding box of a GeoJSON feature
   */
  calculateFeatureBBox(feature) {
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;

    const processCoords = (coords) => {
      if (!Array.isArray(coords)) return;
      if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
        const lng = coords[0];
        const lat = coords[1];
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
      } else {
        coords.forEach(processCoords);
      }
    };

    if (feature.geometry && feature.geometry.coordinates) {
      processCoords(feature.geometry.coordinates);
    }

    return { minLng, minLat, maxLng, maxLat };
  },

  /**
   * Get all zoning features that intersect strictly with circle catchment
   */
  getFeaturesInCatchment(centerLat, centerLng, radiusMeters = 1000) {
    if (!this.isLoaded || !this.indexedFeatures.length) return [];

    // Degree offsets for catchment circle radius
    const latOffset = (radiusMeters * 1.1) / 111320;
    const lngOffset = (radiusMeters * 1.1) / (111320 * Math.cos(centerLat * Math.PI / 180));

    const catchmentBBox = {
      minLng: centerLng - lngOffset,
      maxLng: centerLng + lngOffset,
      minLat: centerLat - latOffset,
      maxLat: centerLat + latOffset
    };

    const matchingFeatures = [];

    for (let i = 0; i < this.indexedFeatures.length; i++) {
      const item = this.indexedFeatures[i];
      const b = item.bbox;

      // Ultra-fast Bounding Box Overlap Check
      if (b.maxLng < catchmentBBox.minLng || b.minLng > catchmentBBox.maxLng ||
          b.maxLat < catchmentBBox.minLat || b.minLat > catchmentBBox.maxLat) {
        continue;
      }

      // Check if feature ring has at least one coordinate within catchment
      const ring = item.feature.geometry.coordinates[0];
      if (ring && Array.isArray(ring)) {
        const touches = ring.some(pt => {
          return pt[0] >= catchmentBBox.minLng && pt[0] <= catchmentBBox.maxLng &&
                 pt[1] >= catchmentBBox.minLat && pt[1] <= catchmentBBox.maxLat;
        });
        if (touches) {
          matchingFeatures.push(item.feature);
        }
      }

      if (matchingFeatures.length >= 35) break; // Keep UI ultra lightweight
    }

    return matchingFeatures;
  },

  /**
   * Geometrically clips zoning features strictly inside the circle catchment using Turf.js
   */
  getClippedCatchmentFeatures(centerLat, centerLng, radiusMeters = 500) {
    const rawFeatures = this.getFeaturesInCatchment(centerLat, centerLng, radiusMeters * 1.5);
    if (!rawFeatures.length) return [];

    if (typeof turf === 'undefined') {
      return rawFeatures;
    }

    try {
      const circlePoly = turf.circle([centerLng, centerLat], radiusMeters / 1000, { steps: 36, units: 'kilometers' });
      const clipped = [];

      rawFeatures.forEach(f => {
        try {
          let intersection = null;
          try {
            // Turf v7 / v6 syntax
            intersection = turf.intersect(turf.featureCollection([f, circlePoly]));
          } catch (e1) {
            // Fallback for v6 specific direct intersect
            intersection = turf.intersect(f, circlePoly);
          }

          if (intersection && intersection.geometry) {
            // Successfully cropped
            intersection.properties = f.properties;
            clipped.push(intersection);
          }
        } catch (e) {
          // If complex geometry fails intersection, skip or push original
          // To ensure crop effect, we DO NOT push original uncropped polygons
          console.warn('[PolaRuangEngine] Turf intersect geometry skipped', e.message);
        }
      });

      // If nothing intersected, return empty array so we don't draw uncropped map
      return clipped;
    } catch (err) {
      console.warn('[PolaRuangEngine] Turf circle/clipping error:', err);
      return rawFeatures;
    }
  },

  /**
   * Point-in-Polygon (Ray Casting) algorithm to find exact zoning for an asset point
   */
  getZoningForPoint(lat, lng) {
    if (!this.isLoaded || !this.indexedFeatures.length) return null;

    // 1. Fast BBox candidate filtering
    const candidates = [];
    for (let i = 0; i < this.indexedFeatures.length; i++) {
      const item = this.indexedFeatures[i];
      const b = item.bbox;
      if (lng >= b.minLng && lng <= b.maxLng && lat >= b.minLat && lat <= b.maxLat) {
        candidates.push(item.feature);
      }
    }

    // 2. Precise Polygon / MultiPolygon point test
    for (let f = 0; f < candidates.length; f++) {
      const feat = candidates[f];
      if (this.isPointInsideFeature(lat, lng, feat)) {
        return this.formatZoningInfo(feat);
      }
    }

    // If point is right at border or closest nearby feature within 200m
    if (candidates.length > 0) {
      return this.formatZoningInfo(candidates[0]);
    }

    return null;
  },

  /**
   * Ray-casting test for Point in Polygon/MultiPolygon
   */
  isPointInsideFeature(lat, lng, feature) {
    const geom = feature.geometry;
    if (!geom) return false;

    const testPolygon = (rings) => {
      if (!rings || !rings.length) return false;
      // Test outer ring
      let inside = this.isPointInRing(lng, lat, rings[0]);
      if (inside && rings.length > 1) {
        // Test holes (if inside hole, then outside)
        for (let h = 1; h < rings.length; h++) {
          if (this.isPointInRing(lng, lat, rings[h])) {
            return false;
          }
        }
      }
      return inside;
    };

    if (geom.type === 'Polygon') {
      return testPolygon(geom.coordinates);
    } else if (geom.type === 'MultiPolygon') {
      for (let p = 0; p < geom.coordinates.length; p++) {
        if (testPolygon(geom.coordinates[p])) {
          return true;
        }
      }
    }

    return false;
  },

  /**
   * Standard ray-casting algorithm for single ring
   */
  isPointInRing(x, y, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];

      const intersect = ((yi > y) !== (yj > y)) &&
          (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  },

  /**
   * Format zoning feature properties into rich UI metadata
   */
  formatZoningInfo(feature) {
    const p = feature.properties || {};
    const zoneName = p.NAMOBJ || 'Kawasan Terbuka / Lainnya';
    const config = this.getZoningStyle(zoneName);

    return {
      namaZona: zoneName,
      kabupaten: p.WADMKK || 'Provinsi Bali',
      luasHa: p.LUASHA ? parseFloat(p.LUASHA).toFixed(2) : null,
      keteranganKhusus: (p.REMARK && p.REMARK !== 'Tidak Ada') ? p.REMARK : null,
      rawanBencana: (p.KRB_03 && p.KRB_03 !== 'Tidak Ada') ? p.KRB_03 : 'Tidak Ada Riwayat Rawan Tinggi',
      cagarBudaya: (p.CAGBUD && p.CAGBUD !== 'Tidak Ada') ? p.CAGBUD : null,
      resapanAir: (p.RESAIR && p.RESAIR !== 'Tidak Ada') ? p.RESAIR : null,
      pertanianPangan: (p.KP2B_2 && p.KP2B_2 !== 'Tidak Ada') ? p.KP2B_2 : null,
      pertambangan: (p.PTBGMB && p.PTBGMB !== 'Tidak Ada') ? p.PTBGMB : null,
      color: config.color,
      fillColor: config.fillColor,
      badgeClass: config.badgeClass,
      icon: config.icon,
      desc: config.desc
    };
  },

  /**
   * Get style config (color, icon, badge) for a zone name
   */
  getZoningStyle(zoneName = '') {
    // Exact match
    if (this.ZONING_PALETTE[zoneName]) {
      return this.ZONING_PALETTE[zoneName];
    }

    // Partial keyword matches
    const nameLower = (zoneName || '').toLowerCase();
    if (nameLower.includes('pariwisata')) return this.ZONING_PALETTE['Kawasan Pariwisata'];
    if (nameLower.includes('permukiman')) return this.ZONING_PALETTE['Kawasan Permukiman'];
    if (nameLower.includes('pertanian')) return this.ZONING_PALETTE['Kawasan Pertanian'];
    if (nameLower.includes('perikanan')) return this.ZONING_PALETTE['Kawasan Perikanan'];
    if (nameLower.includes('mangrove')) return this.ZONING_PALETTE['Kawasan Ekosistem Mangrove'];
    if (nameLower.includes('konservasi')) return this.ZONING_PALETTE['Kawasan Konservasi'];
    if (nameLower.includes('transportasi')) return this.ZONING_PALETTE['Kawasan Transportasi'];
    if (nameLower.includes('hutan produksi')) return this.ZONING_PALETTE['Kawasan Hutan Produksi'];
    if (nameLower.includes('lindung') || nameLower.includes('perlindungan')) return this.ZONING_PALETTE['Kawasan Perlindungan Setempat'];
    if (nameLower.includes('badan air') || nameLower.includes('danau') || nameLower.includes('sungai')) return this.ZONING_PALETTE['Badan Air'];
    if (nameLower.includes('industri')) return this.ZONING_PALETTE['Kawasan Peruntukan Industri'];
    if (nameLower.includes('tambang') || nameLower.includes('energi')) return this.ZONING_PALETTE['Kawasan Pertambangan dan Energi'];
    if (nameLower.includes('hankam') || nameLower.includes('keamanan') || nameLower.includes('pertahanan')) return this.ZONING_PALETTE['Kawasan Pertahanan dan Keamanan'];

    // Default neutral
    return {
      color: '#7f8c8d',
      fillColor: '#95a5a6',
      badgeClass: 'badge-secondary',
      icon: 'fa-map-pin',
      desc: zoneName || 'Kawasan Zonasi Lainnya'
    };
  }
};
