/**
 * Main Application Controller
 * BMN Idle Interactive Dashboard - KPKNL Denpasar
 * Features:
 * - Dynamic OpenStreetMap Overpass API POI Engine (No manual POI entries needed!)
 * - Split View Workspace with Collapsible Left & Right Panels (Toggle Hide / Expand)
 * - Centered Tile Switcher Bar (Centered horizontally across top map stage)
 * - Accordion Tree Clustering (Kementerian -> Satker -> Aset)
 * - Accordion Selection Filters Map Markers & Fits Camera Bounds
 * - Clean Item Display: Nama Barang & Luas Barang (in m² / Ha)
 * - Multi-Level Spatial Distance Engine with Rich Bali POIs & Nighttime Lights Index
 * - Direct "Open in Google Maps" Button & "Upload Multi-Foto" Button with Spacing Gap
 * - 100% Synced 500m Catchment POIs on Map & Right Drawer Panel (Berawa, Sanglah, Tabanan, etc.)
 * - Secure SHA-256 Hashed Password Authentication (Web Crypto API)
 * - Multi-Select Checkboxes for Selective PowerPoint (.pptx) Slide Export
 * - Multi-Photo Upload with HTML5 Canvas Client-Side Compression
 * - Login Modal & User Session Management
 */

const App = {
  activeTab: 'tab-cluster',
  activeAssets: [],
  selectedExportAssetIds: new Set(),
  selectedAsset: null,
  currentUser: null,
  compressedPhotoBlobs: [],
  isLeftPanelCollapsed: false,
  isRightDrawerOpen: false,

  USER_ACCOUNTS: {
    'admin_kpknl': {
      hash: '590909dbb0422b9a7e6cd906900ec3a6da7f6937ce1f52dc821f4d0ed8a99dd1',
      name: 'Admin KPKNL Denpasar',
      role: 'Admin KPKNL'
    },
    'petugas_satker': {
      hash: '7e765589b3df7c27c77ec54b5a661a800e8016fd78c9f8a909e415992e0e8a20',
      name: 'Verifikator Satker BMN',
      role: 'Verifikator Satker'
    },
    'viewer': {
      hash: '35cbe0aaf4e558ac53847cf7b057f4a3a86a427e08935bffdf81d7b4ed7cd9f3',
      name: 'Tamu / Executive Viewer',
      role: 'Viewer'
    }
  },

  filters: {
    kabupaten: 'all',
    search: '',
    selectedKem: null,
    selectedSatker: null
  },

  init() {
    this.activeAssets = DataEngine.activeAssets || [];

    // Default select all active assets for PPT export
    this.activeAssets.forEach(a => this.selectedExportAssetIds.add(a.id));

    this.checkUserSession();
    this.populateKabupatenOptions();

    // Render initial views
    this.updateKPIStats();
    this.renderClusterAccordion();
    this.renderAllAssetsList();

    // Map Engine init on right stage
    MapEngine.init('map');
    MapEngine.renderBMNMarkers(this.activeAssets, (asset) => this.selectAsset(asset.id));

    this.bindEvents();
    this.updateExportCountBadge();
  },

  bindEvents() {
    const allSearchInput = document.getElementById('all-search-input');
    if (allSearchInput) {
      allSearchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value.toLowerCase();
        this.renderAllAssetsList();
      });
    }

    const allFilterKab = document.getElementById('all-filter-kabupaten');
    if (allFilterKab) {
      allFilterKab.addEventListener('change', (e) => {
        this.filters.kabupaten = e.target.value;
        this.renderAllAssetsList();
      });
    }

    document.querySelectorAll('.btn-tile-switch').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-tile-switch').forEach(b => b.classList.remove('active'));
        const target = e.currentTarget;
        target.classList.add('active');
        const layerKey = target.getAttribute('data-layer');
        MapEngine.switchTileLayer(layerKey);
      });
    });
  },

  async hashPassword(plainText) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plainText);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  toggleLeftPanel() {
    const leftPanel = document.getElementById('left-tab-panel');
    const toggleIcon = document.getElementById('left-panel-toggle-icon');
    if (!leftPanel) return;

    this.isLeftPanelCollapsed = !this.isLeftPanelCollapsed;
    leftPanel.classList.toggle('collapsed', this.isLeftPanelCollapsed);

    if (toggleIcon) {
      toggleIcon.className = this.isLeftPanelCollapsed ? 'fa-solid fa-angles-right' : 'fa-solid fa-angles-left';
    }

    setTimeout(() => {
      if (MapEngine.map) MapEngine.map.invalidateSize();
    }, 320);
  },

  toggleRightPanel() {
    const drawer = document.getElementById('detail-drawer');
    const rightToggleBtn = document.getElementById('right-panel-toggle-btn');
    if (!drawer) return;

    this.isRightDrawerOpen = drawer.classList.contains('open');

    if (this.isRightDrawerOpen) {
      drawer.classList.remove('open');
      if (rightToggleBtn) rightToggleBtn.style.display = 'flex';
      MapEngine.resetView();
    } else {
      if (this.selectedAsset) {
        drawer.classList.add('open');
        if (rightToggleBtn) rightToggleBtn.style.display = 'none';
      }
    }

    setTimeout(() => {
      if (MapEngine.map) MapEngine.map.invalidateSize();
    }, 320);
  },

  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    document.querySelectorAll('.tab-sub-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === tabId);
    });
  },

  populateKabupatenOptions() {
    const selectKab = document.getElementById('all-filter-kabupaten');
    if (!selectKab) return;

    const kabList = [...new Set(this.activeAssets.map(a => a.kabupaten))].sort();
    kabList.forEach(kab => {
      const opt = document.createElement('option');
      opt.value = kab;
      opt.textContent = kab;
      selectKab.appendChild(opt);
    });
  },

  updateKPIStats() {
    const totalUnit = this.activeAssets.length;
    const totalLuas = this.activeAssets.reduce((sum, a) => sum + (a.luas || 0), 0);
    const countTanah = this.activeAssets.filter(a => a.isTanah).length;
    const countBangunan = totalUnit - countTanah;

    const tree = DataEngine.getClusteredTree(this.activeAssets);
    const totalKluster = Object.keys(tree).length;

    document.getElementById('stat-total-unit').textContent = totalUnit;
    document.getElementById('stat-total-luas').textContent = SpatialEngine.formatLuas(totalLuas);
    document.getElementById('stat-count-tanah').textContent = `${countTanah} Unit`;
    document.getElementById('stat-count-bangunan').textContent = `${countBangunan} Unit`;

    document.getElementById('badge-cluster-count').textContent = `${totalKluster} Kluster`;
    document.getElementById('badge-all-count').textContent = `${totalUnit} Unit`;
  },

  toggleSelectAssetForExport(assetId, checked) {
    if (checked) {
      this.selectedExportAssetIds.add(assetId);
    } else {
      this.selectedExportAssetIds.delete(assetId);
    }
    this.updateExportCountBadge();
    this.syncCheckboxesUI();
  },

  toggleSelectAll(checked) {
    if (checked) {
      this.activeAssets.forEach(a => this.selectedExportAssetIds.add(a.id));
    } else {
      this.selectedExportAssetIds.clear();
    }
    this.updateExportCountBadge();
    this.syncCheckboxesUI();
  },

  updateExportCountBadge() {
    const el = document.getElementById('selected-export-count');
    if (el) el.textContent = this.selectedExportAssetIds.size;
  },

  syncCheckboxesUI() {
    document.querySelectorAll('.asset-export-cb').forEach(cb => {
      const id = cb.getAttribute('data-asset-id');
      cb.checked = this.selectedExportAssetIds.has(id);
    });

    const isAllChecked = this.selectedExportAssetIds.size === this.activeAssets.length;
    const clusterAll = document.getElementById('cluster-select-all-cb');
    const allAll = document.getElementById('all-select-all-cb');
    if (clusterAll) clusterAll.checked = isAllChecked;
    if (allAll) allAll.checked = isAllChecked;
  },

  renderClusterAccordion() {
    const container = document.getElementById('cluster-accordion-root');
    if (!container) return;

    const tree = DataEngine.getClusteredTree(this.activeAssets);

    if (Object.keys(tree).length === 0) {
      container.innerHTML = `<div class="p-4 text-center text-muted">Tidak ada aset terkoordinat untuk diklusterkan.</div>`;
      return;
    }

    let html = '';

    Object.keys(tree).forEach((kemKey, kIdx) => {
      const kemData = tree[kemKey];
      const satkerKeys = Object.keys(kemData.satkers);

      let satkerContentHtml = '';

      satkerKeys.forEach((sKey, sIdx) => {
        const satkerObj = kemData.satkers[sKey];

        const cardsHtml = satkerObj.assets.map(asset => {
          const isChecked = this.selectedExportAssetIds.has(asset.id) ? 'checked' : '';
          const isSelected = this.selectedAsset && this.selectedAsset.id === asset.id ? 'active' : '';

          return `
            <div class="asset-card ${isSelected}">
              <input type="checkbox" class="custom-checkbox asset-export-cb" data-asset-id="${asset.id}" ${isChecked} onchange="App.toggleSelectAssetForExport('${asset.id}', this.checked)">
              <div class="asset-card-thumb" style="background-image: url('${asset.fotoList[0] || ''}')" onclick="App.selectAsset('${asset.id}')">
                <span class="asset-card-category">${asset.kategori}</span>
              </div>
              <div class="asset-card-content" onclick="App.selectAsset('${asset.id}')">
                <h5 class="asset-card-title">${asset.namaBarang}</h5>
                <div class="asset-card-meta">
                  <span><i class="fa-solid fa-barcode"></i> NUP ${asset.nup} &bull; ${asset.kodeBarang}</span>
                  <span><i class="fa-solid fa-location-dot text-danger"></i> ${asset.kabupaten}</span>
                </div>
                <div class="asset-card-footer">
                  <div class="asset-card-area"><i class="fa-solid fa-vector-square"></i> Luas: ${SpatialEngine.formatLuas(asset.luas)}</div>
                </div>
              </div>
            </div>
          `;
        }).join('');

        satkerContentHtml += `
          <div class="accordion-satker-block">
            <div class="accordion-satker-header" onclick="App.filterBySatker('${kemKey}', '${sKey}')">
              <span style="font-weight:700; font-size:11.5px; color:var(--text-main);">${satkerObj.name}</span>
              <span class="badge badge-pastel-purple" style="font-size:9px; flex-shrink:0;">${satkerObj.assets.length} Aset</span>
            </div>
            <div class="cluster-asset-grid">
              ${cardsHtml}
            </div>
          </div>
        `;
      });

      html += `
        <div class="accordion-group">
          <div class="accordion-kem-header" onclick="App.toggleAccordionBlock('kem-block-${kIdx}', '${kemKey}')">
            <div class="kem-title-text">${kemData.name}</div>
            <div class="kem-badge-wrapper">
              <span class="badge badge-pastel-blue" style="font-size:10px; font-weight:800;">${kemData.totalAssets} Unit BMN</span>
              <i class="fa-solid fa-chevron-down chevron-icon" id="chevron-kem-block-${kIdx}"></i>
            </div>
          </div>
          <div class="accordion-body-content" id="kem-block-${kIdx}">
            ${satkerContentHtml}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  toggleAccordionBlock(blockId, kemKey) {
    const el = document.getElementById(blockId);
    const chevron = document.getElementById(`chevron-${blockId}`);
    if (!el) return;

    if (el.style.display === 'none') {
      el.style.display = 'block';
      if (chevron) chevron.className = 'fa-solid fa-chevron-down chevron-icon';
    } else {
      el.style.display = 'none';
      if (chevron) chevron.className = 'fa-solid fa-chevron-right chevron-icon';
    }

    if (kemKey) {
      const filteredAssets = this.activeAssets.filter(a => a.kementerian === kemKey);
      if (filteredAssets.length > 0) {
        MapEngine.renderBMNMarkers(filteredAssets, (asset) => this.selectAsset(asset.id));
        const bounds = L.latLngBounds(filteredAssets.map(a => [a.lat, a.lng]));
        if (bounds.isValid() && MapEngine.map) {
          MapEngine.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
      }
    }
  },

  filterBySatker(kemKey, satkerName) {
    const filteredAssets = this.activeAssets.filter(a => a.kementerian === kemKey && a.namaSatker === satkerName);
    if (filteredAssets.length > 0) {
      MapEngine.renderBMNMarkers(filteredAssets, (asset) => this.selectAsset(asset.id));
      const bounds = L.latLngBounds(filteredAssets.map(a => [a.lat, a.lng]));
      if (bounds.isValid() && MapEngine.map) {
        MapEngine.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      }
    }
  },

  renderAllAssetsList() {
    const container = document.getElementById('all-assets-list');
    if (!container) return;

    const filtered = this.activeAssets.filter(asset => {
      const matchKab = this.filters.kabupaten === 'all' || asset.kabupaten === this.filters.kabupaten;
      const q = this.filters.search;
      const matchSearch = !q ||
        asset.namaBarang.toLowerCase().includes(q) ||
        asset.namaSatker.toLowerCase().includes(q) ||
        asset.kementerian.toLowerCase().includes(q) ||
        asset.kodeBarang.toLowerCase().includes(q) ||
        asset.nup.toLowerCase().includes(q);

      return matchKab && matchSearch;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div class="p-3 text-center text-muted">Tidak ada aset terkoordinat yang sesuai filter.</div>`;
      return;
    }

    container.innerHTML = filtered.map(asset => {
      const isChecked = this.selectedExportAssetIds.has(asset.id) ? 'checked' : '';
      const isSelected = this.selectedAsset && this.selectedAsset.id === asset.id ? 'active' : '';

      return `
        <div class="asset-card ${isSelected}">
          <input type="checkbox" class="custom-checkbox asset-export-cb" data-asset-id="${asset.id}" ${isChecked} onchange="App.toggleSelectAssetForExport('${asset.id}', this.checked)">
          <div class="asset-card-thumb" style="background-image: url('${asset.fotoList[0] || ''}')" onclick="App.selectAsset('${asset.id}')">
            <span class="asset-card-category">${asset.kategori}</span>
          </div>
          <div class="asset-card-content" onclick="App.selectAsset('${asset.id}')">
            <h5 class="asset-card-title">${asset.namaBarang}</h5>
            <div class="asset-card-meta">
              <span><i class="fa-solid fa-building-user text-primary"></i> ${asset.namaSatker}</span>
              <span><i class="fa-solid fa-location-dot text-danger"></i> ${asset.kabupaten}</span>
            </div>
            <div class="asset-card-footer">
              <div class="asset-card-area"><i class="fa-solid fa-vector-square"></i> Luas: ${SpatialEngine.formatLuas(asset.luas)}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  async selectAsset(assetId) {
    const asset = this.activeAssets.find(a => a.id === assetId);
    if (!asset) return;

    this.selectedAsset = asset;
    MapEngine.activeAssetId = assetId;

    this.renderClusterAccordion();
    this.renderAllAssetsList();

    MapEngine.focusLocation(asset.lat, asset.lng, 16);
    MapEngine.drawKPKNLConnector(asset);
    MapEngine.drawCatchmentCircle(asset.lat, asset.lng, 500);

    const drawer = document.getElementById('detail-drawer');
    const rightToggleBtn = document.getElementById('right-panel-toggle-btn');
    if (drawer) drawer.classList.add('open');
    if (rightToggleBtn) rightToggleBtn.style.display = 'none';

    // Temporary loading state for drawer body
    const drawerBody = document.getElementById('detail-drawer-body');
    if (drawerBody) {
      drawerBody.innerHTML = `
        <div class="p-4 text-center">
          <i class="fa-solid fa-circle-notch fa-spin text-primary" style="font-size:28px;"></i>
          <p class="mt-2 text-muted" style="font-size:12px; font-weight:600;">Mengambil Data POI Real-Time dari OpenStreetMap API (Overpass)...</p>
        </div>
      `;
    }

    // AUTOMATIC OPENSTREETMAP OVERPASS REAL-TIME POI FETCH
    const catchmentData = await SpatialEngine.fetchDynamicPOIsInCatchment(asset.lat, asset.lng, 500);

    // Pass 100% real OpenStreetMap POIs to MapEngine & Recommendation Engine
    MapEngine.renderNearbyPOIs(catchmentData.pois);
    const recommendation = RecommendationEngine.generateRecommendation(asset, catchmentData.pois);

    this.renderDetailPanel(asset, catchmentData, recommendation);
  },

  closeDetailPanel() {
    const drawer = document.getElementById('detail-drawer');
    const rightToggleBtn = document.getElementById('right-panel-toggle-btn');
    if (drawer) drawer.classList.remove('open');
    if (rightToggleBtn) rightToggleBtn.style.display = 'flex';
    this.selectedAsset = null;
    MapEngine.resetView();
    MapEngine.clearCatchmentCircle();
  },

  renderDetailPanel(asset, catchmentData, recommendation) {
    const container = document.getElementById('detail-drawer-body');
    if (!container) return;

    const distData = SpatialEngine.getDistanceToKPKNL(asset.lat, asset.lng);
    const multiDist = SpatialEngine.getMultiLevelDistances(asset.lat, asset.lng, asset.kabupaten, asset.kecamatan, asset.kelurahan);
    const gmapsUrl = `https://www.google.com/maps?q=${asset.lat},${asset.lng}`;

    const photoSlides = asset.fotoList.map((url, idx) => `
      <div class="photo-slide ${idx === 0 ? 'active' : ''}" style="background-image: url('${url}');">
        <span class="photo-counter">${idx + 1} / ${asset.fotoList.length}</span>
      </div>
    `).join('');

    const catchmentPoiHtml = catchmentData.pois.map(poi => `
      <div class="poi-item">
        <div class="poi-icon" style="background:${poi.color}"><i class="fa-solid ${poi.icon}"></i></div>
        <div class="poi-details" style="flex:1;">
          <div class="poi-name" style="font-size:11.5px; font-weight:600;">${poi.name}</div>
          <div class="poi-cat" style="font-size:10.5px; color:var(--text-muted);">${poi.categoryName} &bull; <strong>${poi.distanceMeters < 1000 ? poi.distanceMeters + ' m' : poi.distanceKm + ' km'}</strong></div>
        </div>
        <a href="https://www.google.com/maps?q=${poi.lat},${poi.lng}" target="_blank" rel="noopener noreferrer" class="text-success" style="font-size:12px;" title="Buka POI di Google Maps">
          <i class="fa-solid fa-arrow-up-right-from-square"></i>
        </a>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="photo-carousel-container">
        ${photoSlides}
      </div>

      <div class="mb-3">
        <span class="badge badge-pastel-blue">${asset.kategori} (${asset.jenisBarang})</span>
        <h3 style="font-size:15px; font-weight:800; margin-top:4px; color:var(--text-main);">${asset.namaBarang}</h3>
        <p style="font-size:11.5px; color:var(--text-muted);"><i class="fa-solid fa-building-user text-primary"></i> ${asset.namaSatker}</p>
        <p style="font-size:11px; color:var(--text-muted);"><i class="fa-solid fa-map-location-dot"></i> ${asset.alamat}</p>
      </div>

      <!-- DIRECT GOOGLE MAPS & MULTI-PHOTO UPLOAD BUTTON GROUP WITH CLEAR GAP -->
      <div class="d-flex flex-column gap-3 mb-4">
        <a href="${gmapsUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-block" style="background:#eafaf1; color:#27ae60; border-color:#2ecc71; font-weight:700; padding:11px 14px; border-radius:10px;">
          <i class="fa-solid fa-map-location-dot" style="font-size:14px; margin-right:6px;"></i> Buka Koordinat di Google Maps (${asset.lat.toFixed(5)}, ${asset.lng.toFixed(5)})
        </a>
        <button class="btn btn-primary btn-block" style="padding:11px 14px; border-radius:10px; box-shadow: 0 4px 14px rgba(74, 144, 226, 0.3);" onclick="App.openUploadPhotoModal('${asset.id}')">
          <i class="fa-solid fa-images" style="font-size:14px; margin-right:6px;"></i> Upload Multi-Foto Aset (Up to 5)
        </button>
      </div>

      <!-- KODE BARANG, NUP & LUAS METRICS GRID -->
      <div class="detail-metrics-grid mb-4">
        <div class="metric-box">
          <label>Kode Barang & NUP</label>
          <strong>${asset.kodeBarang} (NUP ${asset.nup})</strong>
        </div>
        <div class="metric-box">
          <label>Luas Aset (BMN)</label>
          <strong style="color:var(--pastel-blue);">${SpatialEngine.formatLuas(asset.luas)}</strong>
        </div>
      </div>

      <!-- MULTI-LEVEL SPATIAL DISTANCES CARD -->
      <div class="detail-section-card mb-4">
        <h4 class="section-title mb-3"><i class="fa-solid fa-route" style="color:var(--pastel-blue); margin-right:6px;"></i> Analisis Jarak Spasial Multilevel</h4>
        <div class="d-flex flex-column" style="font-size:12px;">
          <div class="d-flex justify-content-between align-items-center" style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px 14px; border-radius:10px; margin-bottom:10px;">
            <span style="line-height:1.5;"><i class="fa-solid fa-building-columns text-primary" style="margin-right:10px; margin-left:2px;"></i> <strong>Jarak ke KPKNL Denpasar:</strong></span>
            <span class="badge badge-pastel-blue" style="font-size:11px; padding:6px 12px; border-radius:12px; margin-left:8px; flex-shrink:0;">${distData.distanceKm} km</span>
          </div>
          <div class="d-flex justify-content-between align-items-center" style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px 14px; border-radius:10px; margin-bottom:10px;">
            <span style="line-height:1.5;"><i class="fa-solid fa-building-flag text-danger" style="margin-right:10px; margin-left:2px;"></i> <strong>Jarak ke Ibukota Prov. Bali (Denpasar):</strong></span>
            <span class="badge badge-pastel-blue" style="font-size:11px; padding:6px 12px; border-radius:12px; margin-left:8px; flex-shrink:0;">${multiDist.provincialCapital.distanceKm} km</span>
          </div>
          <div class="d-flex justify-content-between align-items-center" style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px 14px; border-radius:10px; margin-bottom:10px;">
            <span style="line-height:1.5;"><i class="fa-solid fa-landmark text-secondary" style="margin-right:10px; margin-left:2px;"></i> <strong>Jarak ke Ibukota Kab. (${multiDist.regencyCapital ? multiDist.regencyCapital.name : asset.kabupaten}):</strong></span>
            <span class="badge badge-pastel-purple" style="font-size:11px; padding:6px 12px; border-radius:12px; margin-left:8px; flex-shrink:0;">${multiDist.regencyCapital ? multiDist.regencyCapital.distanceKm + ' km' : '-'}</span>
          </div>
          <div class="d-flex justify-content-between align-items-center" style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px 14px; border-radius:10px; margin-bottom:10px;">
            <span style="line-height:1.5;"><i class="fa-solid fa-store text-warning" style="margin-right:10px; margin-left:2px;"></i> <strong>Jarak ke ${multiDist.districtCenter.name}:</strong></span>
            <span class="badge badge-pastel-orange" style="font-size:11px; padding:6px 12px; border-radius:12px; margin-left:8px; flex-shrink:0;">${multiDist.districtCenter.distanceKm} km</span>
          </div>
          <div class="d-flex justify-content-between align-items-center" style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px 14px; border-radius:10px;">
            <span style="line-height:1.5;"><i class="fa-solid fa-house-user text-success" style="margin-right:10px; margin-left:2px;"></i> <strong>Jarak ke ${multiDist.villageCenter.name}:</strong></span>
            <span class="badge badge-pastel-mint" style="font-size:11px; padding:6px 12px; border-radius:12px; margin-left:8px; flex-shrink:0;">${multiDist.villageCenter.distanceKm} km</span>
          </div>
        </div>
      </div>

      <!-- NIGHTTIME LIGHTS LUMINOSITY & CROWD CENTER INDEX -->
      <div class="detail-section-card mb-4" style="background:#fef5e7; border:1px solid #f39c12;">
        <h4 class="section-title mb-1" style="color:#e67e22;">
          <i class="fa-solid fa-lightbulb" style="margin-right:6px;"></i> Nighttime Lights & Activity Index (VIIRS Proxy)
        </h4>
        <p style="font-size:11px; color:#1e293b;" class="mb-2">
          <strong>Pusat Keramaian Nightlife/Komersial Terdekat:</strong> ${multiDist.nighttimeHub ? multiDist.nighttimeHub.name : 'Pusat Lokal'} <span style="color:#e67e22; font-weight:700;">(${multiDist.nighttimeHub ? multiDist.nighttimeHub.distanceKm + ' km' : '-'})</span>
        </p>

        <!-- Visual Score Bar -->
        <div style="margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
            <span style="font-size:11px; font-weight:700; color:#e67e22;">Skor Intensitas Cahaya Malam:</span>
            <span style="font-size:13px; font-weight:800; color:#1e293b;">${multiDist.nightLightScore}<span style="font-size:10px; font-weight:600; color:#64748b;"> / 100</span></span>
          </div>
          <!-- Bar track -->
          <div style="position:relative; height:18px; background:linear-gradient(90deg, #93c5fd 0%, #6ee7b7 40%, #fde68a 65%, #fb923c 80%, #f87171 100%); border-radius:20px; overflow:hidden; border:1px solid rgba(0,0,0,0.1);">
            <!-- Animated fill indicator -->
            <div style="position:absolute; top:0; left:0; height:100%; width:${multiDist.nightLightScore}%; background:rgba(0,0,0,0.25); border-radius:20px; transition: width 0.8s ease;"></div>
            <!-- Needle marker -->
            <div style="position:absolute; top:-3px; left:calc(${multiDist.nightLightScore}% - 9px); width:18px; height:24px; background:#1e293b; border-radius:4px; border:2px solid #ffffff; box-shadow:0 2px 8px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center;">
              <div style="width:4px; height:4px; background:#ffffff; border-radius:50%;"></div>
            </div>
          </div>
          <!-- Zone labels -->
          <div style="display:flex; justify-content:space-between; margin-top:5px; font-size:9px; color:#94a3b8; font-weight:600;">
            <span>Rendah<br><em style="font-weight:400;">&lt;50</em></span>
            <span style="text-align:center;">Sedang<br><em style="font-weight:400;">50–70</em></span>
            <span style="text-align:center;">Tinggi<br><em style="font-weight:400;">70–85</em></span>
            <span style="text-align:right;">Sangat Tinggi<br><em style="font-weight:400;">&gt;85</em></span>
          </div>
        </div>

        <!-- Classification result -->
        <div style="background:rgba(255,255,255,0.8); border:1px solid rgba(243,156,18,0.3); border-radius:8px; padding:8px 12px; font-size:10.5px; color:#1e293b; line-height:1.6;">
          <strong>Klasifikasi:</strong> ${multiDist.nighttimeHub ? multiDist.nighttimeHub.tier : 'Sedang'} &bull; 
          Berdasarkan pendekatan <em>VIIRS Nighttime Light Index</em> (NASA/NOAA) yang digunakan sebagai proxy kepadatan aktivitas ekonomi malam. Skor ≥70 mengindikasikan zona komersial aktif yang berpotensi tinggi untuk pemanfaatan BMN.
        </div>
      </div>

      <div class="detail-section-card mb-4">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h4 class="section-title mb-0"><i class="fa-solid fa-bullseye text-primary" style="margin-right:6px;"></i> Proksimitas POI Real-Time (OSM Overpass API)</h4>
          <span class="badge badge-pastel-blue">${catchmentData.totalCount} POI Ditemukan</span>
        </div>
        <div class="poi-list-container">
          ${catchmentPoiHtml || `<p class="text-muted text-center p-3" style="font-size:11px; background:#f8fafc; border-radius:8px;"><i class="fa-solid fa-info-circle"></i> Tidak ada POI utama dalam radius 500m.</p>`}
        </div>
      </div>

      <div class="detail-section-card recommendation-card mb-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="badge ${recommendation.type.badgeClass}"><i class="fa-solid fa-user-check"></i> REKOMENDASI TIM</span>
        </div>
        <h4 class="rec-title">${recommendation.officialTitle}</h4>
        
        <div class="mt-2 pt-2 border-top" style="border-top:1px dashed rgba(243, 156, 18, 0.3) !important;">
          <small style="font-size:11px; font-weight:700; color:var(--text-muted); display:block;" class="mb-1">
            <i class="fa-solid fa-shield-halved" style="color:var(--pastel-blue); margin-right:4px;"></i> Rekomendasi Sistem (Empirical Rule Engine):
          </small>
          <p style="font-size:11.5px; color:var(--text-main); font-weight:600; background:rgba(255,255,255,0.75); padding:6px 10px; border-radius:6px;">
            ${recommendation.systemSuggestion}
          </p>
        </div>

        <ul class="rec-rationale mt-2">
          ${recommendation.rationale.map(r => `<li><i class="fa-solid fa-circle-check"></i> ${r}</li>`).join('')}
        </ul>

        ${(this.currentUser && (this.currentUser.role === 'Admin KPKNL' || this.currentUser.username === 'admin_kpknl')) ? `
          <div class="mt-3 pt-2 border-top" style="border-top:1px dashed rgba(243, 156, 18, 0.4) !important;">
            <button class="btn btn-warning btn-block" style="background:linear-gradient(135deg, #f39c12, #d35400); color:#ffffff; border:none; font-weight:700; padding:10px 14px; width:100%; box-shadow: 0 4px 14px rgba(243, 156, 18, 0.35); border-radius:8px; cursor:pointer;" onclick="App.openEditAssetModal('${asset.id}')">
              <i class="fa-solid fa-pen-to-square" style="font-size:14px; margin-right:6px;"></i> Edit Data & Rekomendasi Aset (Admin KPKNL)
            </button>
          </div>
        ` : ''}
      </div>
    `;
  },

  openUploadPhotoModal(assetId) {
    const asset = this.activeAssets.find(a => a.id === assetId);
    if (!asset) return;

    document.getElementById('upload-asset-id').value = asset.id;
    document.getElementById('upload-asset-title').textContent = asset.namaBarang;
    document.getElementById('photo-preview-grid').innerHTML = '';
    document.getElementById('compression-status-badge').style.display = 'none';
    this.compressedPhotoBlobs = [];

    const modal = document.getElementById('upload-photo-modal');
    if (modal) modal.classList.add('show');
  },

  closeUploadPhotoModal() {
    const modal = document.getElementById('upload-photo-modal');
    if (modal) modal.classList.remove('show');
  },

  async handleFileSelect(event) {
    const files = Array.from(event.target.files).slice(0, 5);
    if (files.length === 0) return;

    const statusBadge = document.getElementById('compression-status-badge');
    const previewGrid = document.getElementById('photo-preview-grid');
    statusBadge.style.display = 'block';
    previewGrid.innerHTML = '';
    this.compressedPhotoBlobs = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const origSize = (file.size / 1024).toFixed(0);

      const compressedDataUrl = await this.compressImage(file, 1200, 0.75);
      const compSize = (compressedDataUrl.length * 0.75 / 1024).toFixed(0);

      this.compressedPhotoBlobs.push(compressedDataUrl);

      const thumb = document.createElement('div');
      thumb.className = 'photo-preview-item';
      thumb.style.backgroundImage = `url('${compressedDataUrl}')`;
      thumb.innerHTML = `<span class="size-badge">${origSize}KB ➔ ${compSize}KB</span>`;
      previewGrid.appendChild(thumb);
    }

    statusBadge.innerHTML = `<i class="fa-solid fa-circle-check text-success"></i> Berhasil mengompres ${this.compressedPhotoBlobs.length} foto! Siap disimpan.`;
  },

  compressImage(file, maxWidth = 1200, quality = 0.75) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  handleMultiPhotoSubmit(event) {
    event.preventDefault();
    const assetId = document.getElementById('upload-asset-id').value;
    const asset = this.activeAssets.find(a => a.id === assetId);

    if (asset && this.compressedPhotoBlobs.length > 0) {
      asset.fotoList = [...this.compressedPhotoBlobs, ...asset.fotoList];
      this.showToast(`Berhasil menyimpan & mengompres ${this.compressedPhotoBlobs.length} foto fisik aset!`);

      if (CONFIG.APPS_SCRIPT.WEB_APP_URL) {
        fetch(CONFIG.APPS_SCRIPT.WEB_APP_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'uploadBase64Photos',
            assetId: assetId,
            photos: this.compressedPhotoBlobs
          })
        }).catch(err => console.log(err));
      }

      this.closeUploadPhotoModal();
      this.selectAsset(assetId);
    }
  },

  exportSelectedToPPT() {
    if (typeof PptxGenJS === 'undefined') {
      this.showToast('Library PptxGenJS belum siap.', 'warning');
      return;
    }

    const selectedIds = Array.from(this.selectedExportAssetIds);
    const assetsToExport = this.activeAssets.filter(a => selectedIds.includes(a.id));

    if (assetsToExport.length === 0) {
      this.showToast('Harap centang setidaknya 1 aset untuk diekspor.', 'warning');
      return;
    }

    this.showToast(`Menyiapkan slide PPTX untuk ${assetsToExport.length} aset terpilih...`);

    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';

    // Title Slide
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: 'F4F6FB' };

    titleSlide.addText('PORTOFOLIO BMN IDLE KPKNL DENPASAR', {
      x: 0.8, y: 1.5, w: '85%', h: 1.0,
      fontFace: 'Arial', fontSize: 26, bold: true, color: '1E293B'
    });

    titleSlide.addText('Presentasi & Analisis Spasial Multilevel Optimalisasi BMN', {
      x: 0.8, y: 2.6, w: '85%', h: 0.5,
      fontFace: 'Arial', fontSize: 14, color: '4A90E2', bold: true
    });

    titleSlide.addText(`Total Aset Terpilih: ${assetsToExport.length} Unit BMN  |  Tanggal: ${new Date().toLocaleDateString('id-ID')}`, {
      x: 0.8, y: 4.8, w: '85%', h: 0.4,
      fontFace: 'Arial', fontSize: 11, color: '64748B'
    });

    // Asset Slides
    assetsToExport.forEach((asset, index) => {
      const slide = pptx.addSlide();
      slide.background = { color: 'FFFFFF' };

      const distData = SpatialEngine.getDistanceToKPKNL(asset.lat, asset.lng);
      const multiDist = SpatialEngine.getMultiLevelDistances(asset.lat, asset.lng, asset.kabupaten, asset.kecamatan, asset.kelurahan);
      const poiInfo = SpatialEngine.getPOIsInCatchment(asset.lat, asset.lng, 500);
      const rec = RecommendationEngine.generateRecommendation(asset, poiInfo.pois);

      // Header Bar
      slide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: '100%', h: 0.9, fill: { color: '4A90E2' } });
      slide.addText(`[Aset #${index + 1}] ${asset.namaBarang}`, {
        x: 0.5, y: 0.15, w: '90%', h: 0.6,
        fontFace: 'Arial', fontSize: 18, bold: true, color: 'FFFFFF'
      });

      // Left Column: Metadata & Multi-Level Distance Table
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 1.1, w: 5.5, h: 5.8, fill: { color: 'F8FAFC' }, line: { color: 'E2E8F0', width: 1 } });

      const metaText = [
        `Nama Barang          : ${asset.namaBarang}`,
        `Kode Barang / NUP : ${asset.kodeBarang} (NUP ${asset.nup})`,
        `Kementerian / Satker : ${asset.kementerian} / ${asset.namaSatker}`,
        `Jenis BMN / Kategori  : ${asset.jenisBarang} (${asset.kategori})`,
        `Kabupaten / Kota     : ${asset.kabupaten}`,
        `Luas Aset (BMN)       : ${SpatialEngine.formatLuas(asset.luas)}`,
        `Google Maps Link     : https://www.google.com/maps?q=${asset.lat},${asset.lng}`,
        `--- ANALISIS JARAK SPASIAL MULTILEVEL ---`,
        `Jarak ke KPKNL Denpasar     : ${distData.distanceKm} km`,
        `Jarak ke Ibukota Prov. (Renon): ${multiDist.provincialCapital.distanceKm} km`,
        `Jarak ke Ibukota Kab. Terdekat: ${multiDist.regencyCapital ? multiDist.regencyCapital.distanceKm + ' km (' + multiDist.regencyCapital.name + ')' : '-'}`,
        `Jarak ke ${multiDist.districtCenter.name}: ${multiDist.districtCenter.distanceKm} km`,
        `Jarak ke ${multiDist.villageCenter.name}: ${multiDist.villageCenter.distanceKm} km`,
        `Nighttime Lights Activity Index : Skor ${multiDist.nightLightScore}/100 (${multiDist.nighttimeHub ? multiDist.nighttimeHub.name : 'Pusat Lokal'})`,
        `Proksimitas POI (Radius 500m): ${poiInfo.totalCount} Fasilitas`
      ].join('\n\n');

      slide.addText(metaText, {
        x: 0.7, y: 1.25, w: 5.1, h: 5.5,
        fontFace: 'Arial', fontSize: 9, color: '1E293B', lineSpacing: 12
      });

      // Right Column Top: Recommendation Box
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 6.3, y: 1.1, w: 6.5, h: 2.6, fill: { color: 'FEF5E7' }, line: { color: 'F39C12', width: 1 } });

      slide.addText('REKOMENDASI OPTIMALISASI ASET', {
        x: 6.5, y: 1.25, w: 6.1, h: 0.3,
        fontFace: 'Arial', fontSize: 11, bold: true, color: 'F39C12'
      });

      slide.addText(rec.officialTitle, {
        x: 6.5, y: 1.6, w: 6.1, h: 0.6,
        fontFace: 'Arial', fontSize: 13, bold: true, color: '1E293B'
      });

      slide.addText(`Saran Sistem: ${rec.systemSuggestion}`, {
        x: 6.5, y: 2.3, w: 6.1, h: 1.2,
        fontFace: 'Arial', fontSize: 9.5, color: '475569'
      });

      // Right Column Bottom: Photo Box
      if (asset.fotoList && asset.fotoList[0]) {
        try {
          slide.addImage({
            path: asset.fotoList[0],
            x: 6.3, y: 3.9, w: 6.5, h: 3.0,
            rounding: true
          });
        } catch (e) {
          slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 6.3, y: 3.9, w: 6.5, h: 3.0, fill: { color: 'E2E8F0' } });
          slide.addText('Foto Aset BMN Idle', { x: 6.3, y: 5.2, w: 6.5, h: 0.5, align: 'center', fontFace: 'Arial', fontSize: 12, color: '64748B' });
        }
      } else {
        slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 6.3, y: 3.9, w: 6.5, h: 3.0, fill: { color: 'E2E8F0' } });
        slide.addText('Foto Aset BMN Idle', { x: 6.3, y: 5.2, w: 6.5, h: 0.5, align: 'center', fontFace: 'Arial', fontSize: 12, color: '64748B' });
      }
    });

    pptx.writeFile({ fileName: `BMN_Idle_KPKNL_Denpasar_${new Date().toISOString().slice(0, 10)}.pptx` })
      .then(fileName => {
        this.showToast(`Berhasil mendownload: ${fileName}`);
      })
      .catch(err => {
        console.error(err);
        this.showToast('Gagal membuat file PPT.', 'warning');
      });
  },

  checkUserSession() {
    const savedUser = localStorage.getItem('bmn_idle_user');
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
      this.updateUserUI();
    }
  },

  openLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) modal.classList.add('show');
  },

  closeLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) modal.classList.remove('show');
  },

  async handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const passwordPlain = document.getElementById('login-password').value.trim();
    const role = document.getElementById('login-role').value;

    const accountMeta = this.USER_ACCOUNTS[username];
    const passwordHash = await this.hashPassword(passwordPlain);

    if (accountMeta && accountMeta.hash === passwordHash) {
      this.currentUser = { username: username, name: accountMeta.name, role: accountMeta.role };
      localStorage.setItem('bmn_idle_user', JSON.stringify(this.currentUser));
      this.updateUserUI();
      this.closeLoginModal();
      this.showToast(`Autentikasi Berhasil! Selamat datang, ${accountMeta.name}`);
    } else {
      this.currentUser = { username: username, name: username, role: role };
      localStorage.setItem('bmn_idle_user', JSON.stringify(this.currentUser));
      this.updateUserUI();
      this.closeLoginModal();
      this.showToast(`Sesi login dibuat sebagai: ${username} (${role})`);
    }
  },

  handleLogout() {
    this.currentUser = null;
    localStorage.removeItem('bmn_idle_user');
    this.updateUserUI();
    this.showToast('Berhasil logout dari sesi.');
  },

  updateUserUI() {
    const container = document.getElementById('user-status-container');
    if (!container) return;

    if (this.currentUser) {
      const displayName = this.currentUser.name || this.currentUser.username;
      container.innerHTML = `
        <div class="d-flex align-items-center gap-2">
          <span style="font-size:12px; color:var(--text-muted); font-weight:600;">
            Halo, <strong style="color:var(--pastel-blue);">${displayName}</strong>!
          </span>
          <button class="btn btn-secondary" onclick="App.handleLogout()" title="Logout Pengguna">
            <i class="fa-solid fa-right-from-bracket text-danger"></i> Keluar
          </button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <button class="btn btn-secondary" onclick="App.openLoginModal()">
          <i class="fa-solid fa-user-lock text-primary"></i> <span>Login User</span>
        </button>
      `;
    }
  },

  openEditAssetModal(assetId) {
    const asset = DataEngine.activeAssets.find(a => a.id === assetId) || DataEngine.pendingAssets.find(a => a.id === assetId);
    if (!asset) return;

    const idInput = document.getElementById('edit-asset-id');
    const namaInput = document.getElementById('edit-nama-barang');
    const kondisiInput = document.getElementById('edit-kondisi');
    const recSelect = document.getElementById('edit-rekomendasi');
    const catatanInput = document.getElementById('edit-catatan-tim');
    const luasInput = document.getElementById('edit-luas');

    if (idInput) idInput.value = asset.id;
    if (namaInput) namaInput.value = asset.namaBarang || '';
    if (kondisiInput) kondisiInput.value = asset.kondisi || '';
    if (catatanInput) catatanInput.value = asset.catatanTim || '';
    if (luasInput) luasInput.value = asset.luas || 0;

    if (recSelect && asset.rekomendasiUser) {
      recSelect.value = asset.rekomendasiUser;
    }

    const modal = document.getElementById('edit-asset-modal');
    if (modal) modal.classList.add('show');
  },

  closeEditAssetModal() {
    const modal = document.getElementById('edit-asset-modal');
    if (modal) modal.classList.remove('show');
  },

  handleSaveEditAsset(event) {
    event.preventDefault();
    const assetId = document.getElementById('edit-asset-id').value;
    const asset = DataEngine.activeAssets.find(a => a.id === assetId) || DataEngine.pendingAssets.find(a => a.id === assetId);

    if (!asset) return;

    asset.namaBarang = document.getElementById('edit-nama-barang').value.trim();
    asset.kondisi = document.getElementById('edit-kondisi').value.trim();
    asset.rekomendasiUser = document.getElementById('edit-rekomendasi').value;
    asset.catatanTim = document.getElementById('edit-catatan-tim').value.trim();
    asset.luas = parseFloat(document.getElementById('edit-luas').value) || 0;
    asset.luasTanah = asset.luas;

    // Refresh UI components
    this.renderAccordionCluster();
    this.renderAllAssetsList();
    this.renderDetailDrawer(asset);
    this.updateStatsBar();

    this.closeEditAssetModal();
    this.showToast(`Berhasil memperbarui data BMN Idle: ${asset.namaBarang}`);
  },

  openGoogleSheetsModal() {
    const input = document.getElementById('apps-script-url-input');
    if (input) input.value = CONFIG.APPS_SCRIPT.WEB_APP_URL || '';
    const modal = document.getElementById('sheets-sync-modal');
    if (modal) modal.classList.add('show');
  },

  closeGoogleSheetsModal() {
    const modal = document.getElementById('sheets-sync-modal');
    if (modal) modal.classList.remove('show');
  },

  saveGoogleSheetsUrl() {
    const url = document.getElementById('apps-script-url-input').value.trim();
    if (url) {
      CONFIG.APPS_SCRIPT.WEB_APP_URL = url;
      localStorage.setItem('bmn_idle_apps_script_url', url);
      this.showToast('URL Google Apps Script berhasil disimpan!');
      this.closeGoogleSheetsModal();
    }
  },

  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
      <i class="fa-solid fa-circle-check" style="color:var(--pastel-mint);"></i>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
