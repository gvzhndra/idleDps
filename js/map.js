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
  catchmentCircleLayer: null,
  activeAssetId: null,

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

    const office = CONFIG.KPKNL_OFFICE;
    const distData = SpatialEngine.getDistanceToKPKNL(asset.lat, asset.lng);

    const polyline = L.polyline(
      [[asset.lat, asset.lng], [office.lat, office.lng]],
      {
        color: office.color,
        weight: 3,
        opacity: 0.85,
        dashArray: '6, 6'
      }
    ).addTo(this.connectorLinesGroup);

    const midLat = (asset.lat + office.lat) / 2;
    const midLng = (asset.lng + office.lng) / 2;

    L.tooltip({
      permanent: true,
      direction: 'center',
      className: 'spatial-distance-tooltip'
    })
      .setContent(`<i class="fa-solid fa-route"></i> <strong>${distData.distanceKm} km</strong> ke KPKNL Denpasar`)
      .setLatLng([midLat, midLng])
      .addTo(this.connectorLinesGroup);
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
      fillOpacity: 0.16,
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
  }
};
