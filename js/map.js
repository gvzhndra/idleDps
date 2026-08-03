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
  zoningGeoJsonLayer: null,
  poiLayerGroup: null,
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

    // Render GeoJSON Zoning Layer
    this.renderZoningOverlay();
  },

  switchTileLayer(layerKey) {
    if (!this.tileLayers[layerKey]) return;
    this.map.removeLayer(this.tileLayers[this.currentTileLayer]);
    this.tileLayers[layerKey].addTo(this.map);
    this.currentTileLayer = layerKey;
  },

  renderKPKNLMarker() {
    const office = CONFIG.KPKNL_OFFICE;
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
        <span class="badge badge-pastel-blue">Pusat Pelayanan DJKN Bali</span>
      </div>
    `);
  },

  renderZoningOverlay() {
    if (typeof BALI_ZONING_GEOJSON === 'undefined') return;

    this.zoningGeoJsonLayer = L.geoJSON(BALI_ZONING_GEOJSON, {
      style: (feature) => {
        const code = feature.properties.zoningCode;
        const typeInfo = CONFIG.ZONING_TYPES[Object.keys(CONFIG.ZONING_TYPES).find(key => CONFIG.ZONING_TYPES[key].code === code)] || {};
        return {
          color: typeInfo.color || '#4a90e2',
          fillColor: typeInfo.fillColor || '#d4f0f0',
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.25
        };
      },
      onEachFeature: (feature, layer) => {
        layer.bindTooltip(`<b>${feature.properties.name}</b> (${feature.properties.zoningCode})`, { sticky: true });
      }
    }).addTo(this.map);
  },

  toggleZoningOverlay(visible) {
    if (!this.zoningGeoJsonLayer) return;
    if (visible) {
      this.zoningGeoJsonLayer.addTo(this.map);
    } else {
      this.map.removeLayer(this.zoningGeoJsonLayer);
    }
  },

  renderBMNMarkers(assetList, onSelectAsset) {
    this.markersLayer.clearLayers();

    assetList.forEach(asset => {
      const isTanah = asset.kategori === 'Tanah Kosong';
      const iconHtml = isTanah ? '<i class="fa-solid fa-vector-square"></i>' : '<i class="fa-solid fa-house-flag"></i>';
      const isSpotlight = asset.isSpotlight ? 'spotlight-pulse' : '';
      const isSelected = asset.id === this.activeAssetId ? 'selected-marker' : '';

      const icon = L.divIcon({
        className: 'custom-bmn-marker-container',
        html: `
          <div class="bmn-marker-pin ${isSpotlight} ${isSelected}" data-id="${asset.id}">
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
            <h4 class="popup-title">${asset.namaAset}</h4>
            <div class="popup-code"><i class="fa-solid fa-barcode"></i> NUP ${asset.nup}</div>
            <div class="popup-meta">
              <span><i class="fa-solid fa-location-dot"></i> ${asset.kabupaten}</span>
              <span><i class="fa-solid fa-chart-area"></i> ${SpatialEngine.formatLuas(asset.luasTanah)}</span>
            </div>
            <div class="popup-price">
              <label>Nilai Aset:</label>
              <strong>${SpatialEngine.formatRupiah(asset.nilaiAset)}</strong>
            </div>
            <button class="btn btn-sm btn-primary btn-block mt-2" onclick="App.selectAsset('${asset.id}')">
              <i class="fa-solid fa-eye"></i> Detail & Analisis Spasial
            </button>
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

    poiList.slice(0, 5).forEach(poi => {
      const poiIcon = L.divIcon({
        className: 'custom-poi-marker',
        html: `<div class="poi-pin" style="background:${poi.color}"><i class="fa-solid ${poi.icon}"></i></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker([poi.lat, poi.lng], { icon: poiIcon }).addTo(this.poiLayerGroup);
      marker.bindTooltip(`<b>${poi.name}</b><br>${poi.categoryName} (${poi.distanceKm} km)`, { sticky: true });
    });
  },

  focusLocation(lat, lng, zoom = 15) {
    if (!this.map) return;
    this.activeAssetId = null;
    this.map.flyTo([lat, lng], zoom, { animate: true, duration: 1.5 });
  },

  resetView() {
    if (!this.map) return;
    this.activeAssetId = null;
    this.connectorLinesGroup.clearLayers();
    this.poiLayerGroup.clearLayers();
    this.map.flyTo(CONFIG.MAP.DEFAULT_CENTER, CONFIG.MAP.DEFAULT_ZOOM, { animate: true, duration: 1.2 });
  }
};
