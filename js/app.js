/**
 * Main Application Controller
 * BMN Idle Interactive Dashboard - KPKNL Denpasar
 * Supporting Google Sheets & Apps Script Backend Smart Recommendation Integration
 */

const App = {
  assets: [],
  filteredAssets: [],
  selectedAsset: null,
  filters: {
    kabupaten: 'all',
    kategori: 'all',
    search: ''
  },

  init() {
    this.assets = typeof BMN_IDLE_DATA !== 'undefined' ? [...BMN_IDLE_DATA] : [];
    this.filteredAssets = [...this.assets];

    if (CONFIG.APPS_SCRIPT.WEB_APP_URL) {
      this.syncDataFromGoogleSheets();
    }

    MapEngine.init('map');
    this.updateKPIStats();
    this.renderAssetListSidebar();
    MapEngine.renderBMNMarkers(this.filteredAssets, (asset) => this.selectAsset(asset.id));

    this.populateKabupatenOptions();
    this.bindEvents();
    this.startClock();
  },

  bindEvents() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value.toLowerCase();
        this.applyFilters();
      });
    }

    const filterKab = document.getElementById('filter-kabupaten');
    if (filterKab) {
      filterKab.addEventListener('change', (e) => {
        this.filters.kabupaten = e.target.value;
        this.applyFilters();
      });
    }

    const filterKat = document.getElementById('filter-kategori');
    if (filterKat) {
      filterKat.addEventListener('change', (e) => {
        this.filters.kategori = e.target.value;
        this.applyFilters();
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

    const toggleZoning = document.getElementById('toggle-zoning-layer');
    if (toggleZoning) {
      toggleZoning.addEventListener('change', (e) => {
        MapEngine.toggleZoningOverlay(e.target.checked);
      });
    }

    const uploadForm = document.getElementById('upload-photo-form');
    if (uploadForm) {
      uploadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handlePhotoUpload();
      });
    }
  },

  populateKabupatenOptions() {
    const selectKab = document.getElementById('filter-kabupaten');
    if (!selectKab) return;

    const kabList = [...new Set(this.assets.map(a => a.kabupaten))].sort();
    kabList.forEach(kab => {
      const opt = document.createElement('option');
      opt.value = kab;
      opt.textContent = kab;
      selectKab.appendChild(opt);
    });
  },

  applyFilters() {
    this.filteredAssets = this.assets.filter(asset => {
      const matchKab = this.filters.kabupaten === 'all' || asset.kabupaten === this.filters.kabupaten;
      const matchKat = this.filters.kategori === 'all' || asset.kategori === this.filters.kategori;

      const q = this.filters.search;
      const matchSearch = !q ||
        asset.namaAset.toLowerCase().includes(q) ||
        asset.kodeBarang.toLowerCase().includes(q) ||
        asset.nup.toLowerCase().includes(q) ||
        asset.alamat.toLowerCase().includes(q) ||
        asset.kabupaten.toLowerCase().includes(q);

      return matchKab && matchKat && matchSearch;
    });

    this.updateKPIStats();
    this.renderAssetListSidebar();
    MapEngine.renderBMNMarkers(this.filteredAssets, (asset) => this.selectAsset(asset.id));
  },

  updateKPIStats() {
    const totalUnit = this.filteredAssets.length;
    const totalLuasTanah = this.filteredAssets.reduce((sum, a) => sum + (a.luasTanah || 0), 0);
    const totalLuasBangunan = this.filteredAssets.reduce((sum, a) => sum + (a.luasBangunan || 0), 0);
    const totalNilaiAset = this.filteredAssets.reduce((sum, a) => sum + (a.nilaiAset || 0), 0);
    const totalPotensiPnbp = this.filteredAssets.reduce((sum, a) => sum + (a.potensiPnbpTahun || 0), 0);

    document.getElementById('stat-total-unit').textContent = totalUnit;
    document.getElementById('stat-luas-tanah').textContent = SpatialEngine.formatLuas(totalLuasTanah);
    document.getElementById('stat-luas-bangunan').textContent = SpatialEngine.formatLuas(totalLuasBangunan);
    document.getElementById('stat-nilai-aset').textContent = SpatialEngine.formatRupiah(totalNilaiAset);
    document.getElementById('stat-potensi-pnbp').textContent = SpatialEngine.formatRupiah(totalPotensiPnbp) + ' /thn';
  },

  renderAssetListSidebar() {
    const container = document.getElementById('asset-list-container');
    if (!container) return;

    if (this.filteredAssets.length === 0) {
      container.innerHTML = `
        <div class="empty-state p-4 text-center">
          <i class="fa-solid fa-folder-open text-muted" style="font-size:32px;"></i>
          <p class="mt-2 text-muted">Tidak ada BMN Idle yang sesuai dengan filter.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.filteredAssets.map(asset => {
      const isSelected = this.selectedAsset && this.selectedAsset.id === asset.id ? 'active' : '';
      const isSpotlight = asset.isSpotlight ? '<span class="badge badge-pastel-orange"><i class="fa-solid fa-star"></i> Unggulan</span>' : '';
      const distData = SpatialEngine.getDistanceToKPKNL(asset.lat, asset.lng);

      return `
        <div class="asset-card ${isSelected}" onclick="App.selectAsset('${asset.id}')">
          <div class="asset-card-thumb" style="background-image: url('${asset.fotoList[0] || ''}')">
            <span class="asset-card-category">${asset.kategori}</span>
          </div>
          <div class="asset-card-content">
            <div class="asset-card-header">
              <h5 class="asset-card-title">${asset.namaAset}</h5>
              ${isSpotlight}
            </div>
            <div class="asset-card-meta">
              <span><i class="fa-solid fa-location-dot"></i> ${asset.kabupaten}</span>
              <span><i class="fa-solid fa-route"></i> ${distData.distanceKm} km ke KPKNL Denpasar</span>
            </div>
            <div class="asset-card-footer">
              <div class="asset-card-price">${SpatialEngine.formatRupiah(asset.nilaiAset)}</div>
              <div class="asset-card-area"><i class="fa-solid fa-vector-square"></i> ${asset.luasTanah} m²</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  selectAsset(assetId) {
    const asset = this.assets.find(a => a.id === assetId);
    if (!asset) return;

    this.selectedAsset = asset;
    MapEngine.activeAssetId = assetId;

    this.renderAssetListSidebar();
    MapEngine.focusLocation(asset.lat, asset.lng, 15);
    MapEngine.drawKPKNLConnector(asset);

    const nearbyPOIs = SpatialEngine.getNearbyPOIs(asset.lat, asset.lng, 8);
    MapEngine.renderNearbyPOIs(nearbyPOIs);
    const recommendation = RecommendationEngine.generateRecommendation(asset, nearbyPOIs);

    this.renderDetailPanel(asset, nearbyPOIs, recommendation);

    const drawer = document.getElementById('detail-drawer');
    if (drawer) drawer.classList.add('open');
  },

  closeDetailPanel() {
    const drawer = document.getElementById('detail-drawer');
    if (drawer) drawer.classList.remove('open');
    this.selectedAsset = null;
    MapEngine.resetView();
  },

  renderDetailPanel(asset, nearbyPOIs, recommendation) {
    const container = document.getElementById('detail-drawer-body');
    if (!container) return;

    const distData = SpatialEngine.getDistanceToKPKNL(asset.lat, asset.lng);

    const photoSlides = asset.fotoList.map((url, idx) => `
      <div class="photo-slide ${idx === 0 ? 'active' : ''}" style="background-image: url('${url}');">
        <span class="photo-counter">${idx + 1} / ${asset.fotoList.length}</span>
      </div>
    `).join('');

    const poiHtml = nearbyPOIs.slice(0, 4).map(poi => `
      <div class="poi-item">
        <div class="poi-icon" style="background:${poi.color}"><i class="fa-solid ${poi.icon}"></i></div>
        <div class="poi-details">
          <div class="poi-name" style="font-size:12px; font-weight:600;">${poi.name}</div>
          <div class="poi-cat" style="font-size:11px; color:var(--text-muted);">${poi.categoryName} &bull; <strong>${poi.distanceKm} km</strong></div>
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="photo-carousel-container">
        ${photoSlides}
      </div>

      <div class="mb-3">
        <span class="badge badge-pastel-blue">${asset.kategori}</span>
        <h3 style="font-size:16px; font-weight:800; margin-top:6px; color:var(--text-main);">${asset.namaAset}</h3>
        <p style="font-size:12px; color:var(--text-muted);"><i class="fa-solid fa-map-location-dot"></i> ${asset.alamat}</p>
      </div>

      <div class="detail-metrics-grid mb-3">
        <div class="metric-box">
          <label>NUP / Kode Barang</label>
          <strong>NUP ${asset.nup} &bull; ${asset.kodeBarang}</strong>
        </div>
        <div class="metric-box">
          <label>Luas Tanah / Bangunan</label>
          <strong>${SpatialEngine.formatLuas(asset.luasTanah)} / ${asset.luasBangunan} m²</strong>
        </div>
        <div class="metric-box">
          <label>Estimasi Nilai Wajar Aset</label>
          <strong style="color:var(--pastel-blue);">${SpatialEngine.formatRupiah(asset.nilaiAset)}</strong>
        </div>
        <div class="metric-box">
          <label>Potensi PNBP / Tahun</label>
          <strong style="color:var(--pastel-mint);">${SpatialEngine.formatRupiah(asset.potensiPnbpTahun)} / thn</strong>
        </div>
      </div>

      <!-- Distance to KPKNL Denpasar -->
      <div class="detail-section-card mb-3">
        <h4 class="section-title"><i class="fa-solid fa-route" style="color:var(--pastel-blue);"></i> Jarak Spasial ke KPKNL Denpasar</h4>
        <div class="kpknl-distance-banner">
          <div class="dist-icon"><i class="fa-solid fa-building-columns"></i></div>
          <div class="dist-info">
            <div class="office-name" style="font-size:12px; font-weight:700;">KPKNL Denpasar</div>
            <div class="dist-value" style="font-size:13px;">Jarak Antar Koordinat: <strong>${distData.distanceKm} km</strong></div>
          </div>
        </div>
      </div>

      <!-- Recommendation Card (Official User Input + Backend Smart Suggestion) -->
      <div class="detail-section-card recommendation-card mb-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="badge ${recommendation.type.badgeClass}"><i class="fa-solid fa-user-check"></i> REKOMENDASI RESMI TIM</span>
        </div>
        <h4 class="rec-title">${recommendation.officialTitle}</h4>
        
        <div class="mt-2 pt-2 border-top" style="border-top:1px dashed rgba(243, 156, 18, 0.3) !important;">
          <small style="font-size:11px; font-weight:700; color:var(--text-muted); display:block;" class="mb-1">
            <i class="fa-solid fa-brain" style="color:var(--pastel-blue);"></i> Smart Recommendation Engine (Backend Helper):
          </small>
          <p style="font-size:12px; color:var(--text-main); font-weight:600; background:rgba(255,255,255,0.7); padding:6px 10px; border-radius:6px;">
            ${recommendation.smartSuggestion}
          </p>
        </div>

        <ul class="rec-rationale mt-2">
          ${recommendation.rationale.map(r => `<li><i class="fa-solid fa-circle-check"></i> ${r}</li>`).join('')}
        </ul>
      </div>

      <!-- Zonasi & POI -->
      <div class="detail-section-card mb-3">
        <h4 class="section-title"><i class="fa-solid fa-map" style="color:var(--pastel-purple);"></i> Zonasi Tata Ruang & Fasilitas Terdekat</h4>
        <div class="mb-2">
          <span class="badge badge-pastel-purple">${asset.zoningName} (${asset.zoningCode})</span>
        </div>
        <label style="font-size:11px; color:var(--text-muted); display:block;" class="mb-1">Fasilitas Terdekat (POI):</label>
        <div class="poi-list-container">
          ${poiHtml || '<p class="text-muted" style="font-size:11px;">Tidak ada POI utama dalam radius 8 km.</p>'}
        </div>
      </div>

      <!-- Legalitas -->
      <div class="detail-section-card mb-3">
        <h4 class="section-title"><i class="fa-solid fa-file-contract"></i> Legalitas & Kondisi Aset</h4>
        <p style="font-size:12px;"><strong>Status:</strong> ${asset.statusPenguasaan}</p>
        <p style="font-size:12px;"><strong>Kondisi:</strong> ${asset.kondisi}</p>
        <p style="font-size:12px; color:var(--text-muted);" class="mt-2">${asset.keterangan}</p>
      </div>

      <div class="d-flex flex-column gap-2 mt-3">
        <button class="btn btn-primary btn-block" onclick="App.openUploadPhotoModal('${asset.id}')">
          <i class="fa-solid fa-cloud-arrow-up"></i> Upload Foto Aset Terbaru
        </button>
      </div>
    `;
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
      this.syncDataFromGoogleSheets();
    }
  },

  syncDataFromGoogleSheets() {
    const url = CONFIG.APPS_SCRIPT.WEB_APP_URL;
    if (!url) return;

    this.showToast('Menghubungkan ke Google Sheets...');
    fetch(`${url}?action=getData`)
      .then(res => res.json())
      .then(res => {
        if (res.status === 'success' && Array.isArray(res.data) && res.data.length > 0) {
          this.assets = res.data;
          this.filteredAssets = [...this.assets];
          this.applyFilters();
          this.showToast(`Berhasil menyinkronkan ${res.data.length} data BMN Idle dari Google Sheets!`);
        }
      })
      .catch(err => {
        console.warn('Google Sheets sync notice:', err);
      });
  },

  openUploadPhotoModal(assetId) {
    const asset = this.assets.find(a => a.id === assetId);
    if (!asset) return;

    document.getElementById('upload-asset-id').value = asset.id;
    document.getElementById('upload-asset-title').textContent = asset.namaAset;
    const modal = document.getElementById('upload-photo-modal');
    if (modal) modal.classList.add('show');
  },

  closeUploadPhotoModal() {
    const modal = document.getElementById('upload-photo-modal');
    if (modal) modal.classList.remove('show');
  },

  handlePhotoUpload() {
    const assetId = document.getElementById('upload-asset-id').value;
    const photoUrlInput = document.getElementById('upload-photo-url').value;
    const asset = this.assets.find(a => a.id === assetId);

    if (asset && photoUrlInput) {
      asset.fotoList.unshift(photoUrlInput);
      this.showToast('Foto BMN Idle berhasil ditambahkan!');

      if (CONFIG.APPS_SCRIPT.WEB_APP_URL) {
        fetch(CONFIG.APPS_SCRIPT.WEB_APP_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'addPhoto', assetId: assetId, photoUrl: photoUrlInput })
        }).catch(e => console.log(e));
      }

      this.closeUploadPhotoModal();
      this.selectAsset(assetId);
    }
  },

  startPresentationMode() {
    PresentationEngine.startPresentation(this.filteredAssets);
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
  },

  startClock() {
    const clockEl = document.getElementById('live-clock');
    if (!clockEl) return;
    const update = () => {
      const now = new Date();
      clockEl.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) + ' | ' + now.toLocaleTimeString('id-ID');
    };
    update();
    setInterval(update, 1000);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
