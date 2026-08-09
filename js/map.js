/**
 * Leaflet Map Controller & Visualizer
 * Khusus KPKNL Denpasar - Pastel Theme
 */

const MapEngine = {
  map: null,
  tileLayers: {},
  currentTileLayer: null,
  markersLayer: null,
  connectorLinesGroup: null,
  poiLayerGroup: null,
  polaRuangLayerGroup: null,
  catchmentCircleLayer: null,
  activeAssetId: null,
  isPolaRuangEnabled: true,

  init(containerId = 'map') {
    if (this.map) return;

    this.map = L.map(containerId, {
      center: CONFIG.MAP.DEFAULT_CENTER,
      zoom: CONFIG.MAP.DEFAULT_ZOOM,
      minZoom: CONFIG.MAP.MIN_ZOOM,
      maxZoom: CONFIG.MAP.MAX_ZOOM,
      zoomControl: false
    });

    // Create tile layers
    this.tileLayers.pastel = L.tileLayer(CONFIG.MAP.TILE_LAYERS.PASTEL_LIGHT.url, { attribution: CONFIG.MAP.TILE_LAYERS.PASTEL_LIGHT.attribution });
    this.tileLayers.dark = L.tileLayer(CONFIG.MAP.TILE_LAYERS.DARK_EXECUTIVE.url, { attribution: CONFIG.MAP.TILE_LAYERS.DARK_EXECUTIVE.attribution });
    this.tileLayers.satellite = L.tileLayer(CONFIG.MAP.TILE_LAYERS.SATELLITE.url, { attribution: CONFIG.MAP.TILE_LAYERS.SATELLITE.attribution });
    this.tileLayers.streets = L.tileLayer(CONFIG.MAP.TILE_LAYERS.STREETS.url, { attribution: CONFIG.MAP.TILE_LAYERS.STREETS.attribution });

    // Set default layer to Soft Pastel Voyager
    this.tileLayers.pastel.addTo(this.map);
    this.currentTileLayer = 'pastel';

    // Layer Groups
    this.polaRuangLayerGroup = L.layerGroup().addTo(this.map);
    this.markersLayer = L.layerGroup().addTo(this.map);
    this.connectorLinesGroup = L.layerGroup().addTo(this.map);
    this.poiLayerGroup = L.layerGroup().addTo(this.map);

    // Render KPKNL Denpasar Office Marker
    this.renderKPKNLMarker();
  },

  switchTileLayer(layerKey) {
    if (!this.tileLayers[layerKey]) return;
    this.map.removeLayer(this.tileLayers[this.currentTileLayer]);
    this.tileLayers[layerKey].addTo(this.map);
    this.currentTileLayer = layerKey;
  },

  renderKPKNLMarker() {
    const office = CONFIG.KPKNL_OFFICE;
    const gmapsUrl = `https://www.google.com/maps?q=${office.lat},${office.lng}`;
    const icon = L.divIcon({
      className: 'custom-kpknl-marker-container',
      html: `
        <div class="kpknl-marker-wrapper">
          <div class="kpknl-marker-icon"><i class="fa-solid fa-building-columns"></i></div>
          <div class="kpknl-marker-label">${office.name}</div>
        </div>
      `,
      iconSize: [140, 42],
      iconAnchor: [70, 21]
    });

    const marker = L.marker([office.lat, office.lng], { icon: icon }).addTo(this.map);
    marker.bindPopup(`
      <div class="custom-popup-content kpknl-popup">
        <h4><i class="fa-solid fa-building-columns" style="color:${office.color}"></i> ${office.name}</h4>
        <p>${office.address}</p>
        <span class="badge badge-pastel-blue mb-2">Pusat Pelayanan DJKN Bali</span>
        <a href="${gmapsUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-secondary btn-block mt-2" style="background:#eafaf1; color:#27ae60; border-color:#2ecc71;">
          <i class="fa-solid fa-map-location-dot"></i> Open in Google Maps
        </a>
      </div>
    `);
  },

  renderBMNMarkers(assetList, onSelectAsset) {
    this.markersLayer.clearLayers();

    assetList.forEach(asset => {
      const isTanah = asset.isTanah;
      const iconHtml = isTanah ? '<i class="fa-solid fa-vector-square"></i>' : '<i class="fa-solid fa-house-flag"></i>';
      const isSelected = asset.id === this.activeAssetId ? 'selected-marker' : '';
      const gmapsUrl = `https://www.google.com/maps?q=${asset.lat},${asset.lng}`;

      const icon = L.divIcon({
        className: 'custom-bmn-marker-container',
        html: `
          <div class="bmn-marker-pin ${isSelected}" data-id="${asset.id}">
            <div class="bmn-marker-inner">
              ${iconHtml}
            </div>
            <div class="bmn-marker-badge">${asset.nup}</div>
          </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 42],
        popupAnchor: [0, -40]
      });

      const marker = L.marker([asset.lat, asset.lng], { icon: icon }).addTo(this.markersLayer);

      const popupHtml = `
        <div class="custom-popup-card">
          <div class="popup-image" style="background-image: url('${asset.fotoList[0] || ''}');">
            <span class="popup-category-badge">${asset.kategori}</span>
          </div>
          <div class="popup-body">
            <h4 class="popup-title">${asset.namaBarang}</h4>
            <div class="popup-code"><i class="fa-solid fa-barcode"></i> NUP ${asset.nup} &bull; ${asset.kodeBarang}</div>
            <div class="popup-meta mt-1">
              <span><i class="fa-solid fa-location-dot text-danger"></i> ${asset.kabupaten}</span>
              <span><i class="fa-solid fa-chart-area text-primary"></i> Luas: ${SpatialEngine.formatLuas(asset.luas)}</span>
            </div>
            <div class="d-flex gap-1 mt-2">
              <button class="btn btn-sm btn-primary" style="flex:1;" onclick="App.selectAsset('${asset.id}')">
                <i class="fa-solid fa-eye"></i> Detail
              </button>
              <a href="${gmapsUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-secondary" style="background:#eafaf1; color:#27ae60; border-color:#2ecc71;" title="Buka di Google Maps">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> Maps
              </a>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 280 });

      marker.on('click', () => {
        if (typeof onSelectAsset === 'function') {
          onSelectAsset(asset);
        }
      });
    });
  },

  drawKPKNLConnector(asset) {
    this.connectorLinesGroup.clearLayers();

    if (!asset || !asset.lat || !asset.lng) return;

    // 1. Blue Line: Asset ➔ KPKNL Denpasar
    const office = CONFIG.KPKNL_OFFICE;
    const distKPKNL = SpatialEngine.getDistanceToKPKNL(asset.lat, asset.lng);

    L.polyline(
      [[asset.lat, asset.lng], [office.lat, office.lng]],
      { color: '#4a90e2', weight: 3.5, opacity: 0.85, dashArray: '6, 6' }
    ).addTo(this.connectorLinesGroup);

    L.tooltip({ permanent: true, direction: 'center', className: 'spatial-distance-tooltip' })
      .setContent(`<i class="fa-solid fa-building-columns text-primary"></i> <strong>${distKPKNL.distanceKm} km</strong> ke KPKNL Denpasar`)
      .setLatLng([(asset.lat + office.lat) / 2, (asset.lng + office.lng) / 2])
      .addTo(this.connectorLinesGroup);

    // 2. Red Line: Asset ➔ Ibukota Prov. Bali (Denpasar - Renon)
    const multiDist = SpatialEngine.getMultiLevelDistances(asset.lat, asset.lng, asset.kabupaten, asset.kecamatan, asset.kelurahan);
    const provCap = multiDist.provincialCapital;

    // Only draw Prov line if it's different enough from KPKNL (distance > 0.5km to avoid overlapping text)
    const provDistToKPKNL = SpatialEngine.calculateDistance(office.lat, office.lng, REGENCY_CAPITALS['Kota Denpasar'].lat, REGENCY_CAPITALS['Kota Denpasar'].lng);
    if (provDistToKPKNL > 0.8) {
      const provCoords = [REGENCY_CAPITALS['Kota Denpasar'].lat, REGENCY_CAPITALS['Kota Denpasar'].lng];
      L.polyline(
        [[asset.lat, asset.lng], provCoords],
        { color: '#e74c3c', weight: 2.5, opacity: 0.8, dashArray: '5, 5' }
      ).addTo(this.connectorLinesGroup);

      L.tooltip({ permanent: true, direction: 'center', className: 'spatial-distance-tooltip' })
        .setContent(`<i class="fa-solid fa-building-flag text-danger"></i> <strong>${provCap.distanceKm} km</strong> ke Renon (Prov. Bali)`)
        .setLatLng([(asset.lat + provCoords[0]) / 2, (asset.lng + provCoords[1]) / 2])
        .addTo(this.connectorLinesGroup);
    }

    // 3. Purple Line: Asset ➔ Ibukota Kab. Terdekat (If outside Kota Denpasar)
    if (multiDist.regencyCapital && multiDist.regencyCapital.name !== 'Pusat Kota Denpasar (Renon)') {
      const regCapObj = Object.values(REGENCY_CAPITALS).find(c => c.name === multiDist.regencyCapital.name);
      if (regCapObj) {
        L.polyline(
          [[asset.lat, asset.lng], [regCapObj.lat, regCapObj.lng]],
          { color: '#9b59b6', weight: 3, opacity: 0.85, dashArray: '7, 7' }
        ).addTo(this.connectorLinesGroup);

        L.tooltip({ permanent: true, direction: 'center', className: 'spatial-distance-tooltip' })
          .setContent(`<i class="fa-solid fa-landmark text-purple"></i> <strong>${multiDist.regencyCapital.distanceKm} km</strong> ke ${regCapObj.name.split('(')[1]?.replace(')', '') || regCapObj.name}`)
          .setLatLng([(asset.lat + regCapObj.lat) / 2, (asset.lng + regCapObj.lng) / 2])
          .addTo(this.connectorLinesGroup);
      }
    }
  },

  renderNearbyPOIs(poiList) {
    this.poiLayerGroup.clearLayers();

    poiList.forEach(poi => {
      // Guard: ensure icon is a valid FontAwesome class, otherwise use a safe default
      const iconClass = (poi.icon && poi.icon.startsWith('fa-')) ? poi.icon : 'fa-location-dot';
      const bgColor = poi.color || '#4a90e2';

      const poiIcon = L.divIcon({
        className: 'custom-poi-marker-badge',
        html: `
          <div class="map-poi-badge" style="background:${bgColor};">
            <i class="fa-solid ${iconClass}"></i>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([poi.lat, poi.lng], { icon: poiIcon }).addTo(this.poiLayerGroup);
      
      const distLabel = poi.distanceMeters < 1000 ? `${poi.distanceMeters} m` : `${poi.distanceKm} km`;
      
      marker.bindTooltip(`<b>${poi.name}</b><br><span style="color:#64748b; font-size:10px;">${poi.categoryName} (${distLabel})</span>`, { sticky: true });
    });
  },

  focusLocation(lat, lng, zoom = 16) {
    if (!this.map) return;
    this.map.flyTo([lat, lng], zoom, { animate: true, duration: 1.5 });
  },

  resetView() {
    if (!this.map) return;
    this.activeAssetId = null;
    this.connectorLinesGroup.clearLayers();
    this.poiLayerGroup.clearLayers();
    this.clearCatchmentCircle();
    this.clearPolaRuang();
    this.map.flyTo(CONFIG.MAP.DEFAULT_CENTER, CONFIG.MAP.DEFAULT_ZOOM, { animate: true, duration: 1.2 });
  },

  drawCatchmentCircle(lat, lng, radiusMeters = 500) {
    if (!this.map) return;
    this.clearCatchmentCircle();

    if (!lat || !lng) return;

    this.catchmentCircleLayer = L.circle([lat, lng], {
      radius: radiusMeters,
      color: '#4a90e2',
      fillColor: '#4a90e2',
      fillOpacity: 0.12,
      weight: 2,
      dashArray: '6, 6'
    }).addTo(this.map);

    const radiusLabel = radiusMeters >= 1000 ? (radiusMeters / 1000) + ' km' : radiusMeters + ' m';
    this.catchmentCircleLayer.bindTooltip(`<b>Radius Catchment POI: ${radiusLabel}</b>`, {
      permanent: true,
      direction: 'top',
      className: 'catchment-tooltip'
    });
  },

  clearCatchmentCircle() {
    if (this.catchmentCircleLayer && this.map) {
      this.map.removeLayer(this.catchmentCircleLayer);
      this.catchmentCircleLayer = null;
    }
  },

  /**
   * Render Pola Tata Ruang polygons only inside the asset's catchment radius
   */
  async renderCatchmentPolaRuang(asset, radiusMeters = 1500) {
    this.clearPolaRuang();

    if (!this.isPolaRuangEnabled || !asset || !asset.lat || !asset.lng) return;
    if (typeof PolaRuangEngine === 'undefined') return;

    if (!PolaRuangEngine.isLoaded) {
      await PolaRuangEngine.loadDataset();
    }

    const features = PolaRuangEngine.getFeaturesInCatchment(asset.lat, asset.lng, radiusMeters);
    if (!features || !features.length) return;

    features.forEach(feat => {
      const p = feat.properties || {};
      const zoneName = p.NAMOBJ || 'Kawasan Terbuka';
      const style = PolaRuangEngine.getZoningStyle(zoneName);

      const geoLayer = L.geoJSON(feat, {
        style: () => ({
          color: style.color,
          fillColor: style.fillColor,
          fillOpacity: 0.35,
          weight: 1.5,
          opacity: 0.85,
          dashArray: '3, 3'
        }),
        onEachFeature: (feature, layer) => {
          // Hover highlighting
          layer.on({
            mouseover: (e) => {
              const l = e.target;
              l.setStyle({
                fillOpacity: 0.65,
                weight: 3,
                opacity: 1
              });
              if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                l.bringToFront();
              }
            },
            mouseout: (e) => {
              geoLayer.resetStyle(e.target);
            }
          });

          // Tooltip info
          const remarkHtml = (p.REMARK && p.REMARK !== 'Tidak Ada')
            ? `<div style="font-size:10px; color:#e67e22; margin-top:2px;"><i class="fa-solid fa-circle-info"></i> ${p.REMARK}</div>`
            : '';
          const disasterHtml = (p.KRB_03 && p.KRB_03 !== 'Tidak Ada')
            ? `<div style="font-size:9.5px; color:#e74c3c; margin-top:2px;"><i class="fa-solid fa-triangle-exclamation"></i> Rawan: ${p.KRB_03.split(',')[0]}</div>`
            : '';

          const tooltipContent = `
            <div class="pola-ruang-map-tooltip">
              <div style="font-weight:700; font-size:12px; color:${style.color}; display:flex; align-items:center; gap:5px;">
                <i class="fa-solid ${style.icon}"></i> ${zoneName}
              </div>
              <div style="font-size:11px; color:#64748b;">${p.WADMKK || 'Provinsi Bali'}</div>
              ${remarkHtml}
              ${disasterHtml}
            </div>
          `;

          layer.bindTooltip(tooltipContent, { sticky: true, className: 'pola-ruang-leaflet-tooltip' });
        }
      });

      geoLayer.addTo(this.polaRuangLayerGroup);
    });
  },

  clearPolaRuang() {
    if (this.polaRuangLayerGroup) {
      this.polaRuangLayerGroup.clearLayers();
    }
  },

  togglePolaRuang(enabled) {
    this.isPolaRuangEnabled = (typeof enabled === 'boolean') ? enabled : !this.isPolaRuangEnabled;
    if (!this.isPolaRuangEnabled) {
      this.clearPolaRuang();
    } else if (this.activeAssetId) {
      const asset = DataEngine.getAssetById(this.activeAssetId);
      if (asset) {
        this.renderCatchmentPolaRuang(asset, 1500);
      }
    }
    return this.isPolaRuangEnabled;
  }
};
