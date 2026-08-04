/**
 * Main Application Controller
 * BMN Idle Interactive Dashboard - KPKNL Denpasar
 * Features:
 * - Split View Workspace (Left Panel: Tabs & Controls, Right Panel: Always-Visible Leaflet Map)
 * - Accordion Tree Clustering (Kementerian -> Satker -> Aset)
 * - Clear Item Display: Nama Barang & Luas Barang (in m² / Ha)
 * - Multi-Level Spatial Distance Engine with Rich Bali POIs & Nighttime Lights Index
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

  filters: {
    kabupaten: 'all',
    search: ''
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
    this.startClock();
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

    document.getElementById('stat-total-unit').textContent = totalUnit;
    document.getElementById('stat-total-luas').textContent = SpatialEngine.formatLuas(totalLuas);
    document.getElementById('stat-count-tanah').textContent = `${countTanah} Unit`;
    document.getElementById('stat-count-bangunan').textContent = `${countBangunan} Unit`;

    document.getElementById('badge-cluster-count').textContent = totalUnit;
    document.getElementById('badge-all-count').textContent = totalUnit;
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

      satkerKeys.forEach(sKey => {
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
            <div class="accordion-satker-header">
              <i class="fa-solid fa-building-user"></i> ${satkerObj.name}
              <span class="badge badge-pastel-purple" style="font-size:9px;">${satkerObj.assets.length} Aset</span>
            </div>
            <div class="cluster-asset-grid">
              ${cardsHtml}
            </div>
          </div>
        `;
      });

      html += `
        <div class="accordion-group">
          <div class="accordion-kem-header" onclick="App.toggleAccordionBlock('kem-block-${kIdx}')">
            <div>
              <i class="fa-solid fa-landmark text-primary" style="margin-right:6px;"></i> ${kemData.name}
            </div>
            <div class="d-flex align-items-center gap-2">
              <span class="badge badge-pastel-blue">${kemData.totalAssets} Unit BMN</span>
              <i class="fa-solid fa-chevron-down" id="chevron-kem-block-${kIdx}"></i>
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

  toggleAccordionBlock(blockId) {
    const el = document.getElementById(blockId);
    const chevron = document.getElementById(`chevron-${blockId}`);
    if (!el) return;

    if (el.style.display === 'none') {
      el.style.display = 'block';
      if (chevron) chevron.className = 'fa-solid fa-chevron-down';
    } else {
      el.style.display = 'none';
      if (chevron) chevron.className = 'fa-solid fa-chevron-right';
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

  selectAsset(assetId) {
    const asset = this.activeAssets.find(a => a.id === assetId);
    if (!asset) return;

    this.selectedAsset = asset;
    MapEngine.activeAssetId = assetId;

    this.renderClusterAccordion();
    this.renderAllAssetsList();

    MapEngine.focusLocation(asset.lat, asset.lng, 16);
    MapEngine.drawKPKNLConnector(asset);
    MapEngine.drawCatchmentCircle(asset.lat, asset.lng, 500);

    const nearbyPOIs = SpatialEngine.getNearbyPOIs(asset.lat, asset.lng, 5);
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
    MapEngine.clearCatchmentCircle();
  },

  renderDetailPanel(asset, nearbyPOIs, recommendation) {
    const container = document.getElementById('detail-drawer-body');
    if (!container) return;

    const distData = SpatialEngine.getDistanceToKPKNL(asset.lat, asset.lng);
    const multiDist = SpatialEngine.getMultiLevelDistances(asset.lat, asset.lng, asset.kabupaten, asset.kecamatan, asset.kelurahan);
    const catchmentData = SpatialEngine.getPOIsInCatchment(asset.lat, asset.lng, 500);

    const photoSlides = asset.fotoList.map((url, idx) => `
      <div class="photo-slide ${idx === 0 ? 'active' : ''}" style="background-image: url('${url}');">
        <span class="photo-counter">${idx + 1} / ${asset.fotoList.length}</span>
      </div>
    `).join('');

    const catchmentPoiHtml = catchmentData.pois.map(poi => `
      <div class="poi-item">
        <div class="poi-icon" style="background:${poi.color}"><i class="fa-solid ${poi.icon}"></i></div>
        <div class="poi-details">
          <div class="poi-name" style="font-size:11.5px; font-weight:600;">${poi.name}</div>
          <div class="poi-cat" style="font-size:10.5px; color:var(--text-muted);">${poi.categoryName} &bull; <strong>${poi.distanceMeters < 1000 ? poi.distanceMeters + ' m' : poi.distanceKm + ' km'}</strong></div>
        </div>
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

      <div class="detail-metrics-grid mb-3">
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
      <div class="detail-section-card mb-3">
        <h4 class="section-title"><i class="fa-solid fa-route" style="color:var(--pastel-blue);"></i> Analisis Jarak Spasial Multilevel</h4>
        <div class="d-flex flex-column gap-2" style="font-size:11.5px;">
          <div class="d-flex justify-content-between align-items-center p-2 rounded" style="background:#f8fafc; border:1px solid #e2e8f0;">
            <span><i class="fa-solid fa-building-columns text-primary"></i> <strong>Jarak ke KPKNL Denpasar:</strong></span>
            <span class="badge badge-pastel-blue">${distData.distanceKm} km</span>
          </div>
          <div class="d-flex justify-content-between align-items-center p-2 rounded" style="background:#f8fafc; border:1px solid #e2e8f0;">
            <span><i class="fa-solid fa-building-flag text-danger"></i> <strong>Jarak ke Ibukota Prov. Bali (Denpasar):</strong></span>
            <span class="badge badge-pastel-blue">${multiDist.provincialCapital.distanceKm} km</span>
          </div>
          <div class="d-flex justify-content-between align-items-center p-2 rounded" style="background:#f8fafc; border:1px solid #e2e8f0;">
            <span><i class="fa-solid fa-landmark text-secondary"></i> <strong>Jarak ke Ibukota Kab. (${multiDist.regencyCapital ? multiDist.regencyCapital.name : asset.kabupaten}):</strong></span>
            <span class="badge badge-pastel-purple">${multiDist.regencyCapital ? multiDist.regencyCapital.distanceKm + ' km' : '-'}</span>
          </div>
          <div class="d-flex justify-content-between align-items-center p-2 rounded" style="background:#f8fafc; border:1px solid #e2e8f0;">
            <span><i class="fa-solid fa-store text-warning"></i> <strong>Jarak ke ${multiDist.districtCenter.name}:</strong></span>
            <span class="badge badge-pastel-orange">${multiDist.districtCenter.distanceKm} km</span>
          </div>
          <div class="d-flex justify-content-between align-items-center p-2 rounded" style="background:#f8fafc; border:1px solid #e2e8f0;">
            <span><i class="fa-solid fa-house-user text-success"></i> <strong>Jarak ke ${multiDist.villageCenter.name}:</strong></span>
            <span class="badge badge-pastel-mint">${multiDist.villageCenter.distanceKm} km</span>
          </div>
        </div>
      </div>

      <!-- NIGHTTIME LIGHTS LUMINOSITY & CROWD CENTER INDEX -->
      <div class="detail-section-card mb-3" style="background:#fef5e7; border:1px solid #f39c12;">
        <h4 class="section-title mb-1" style="color:#e67e22;">
          <i class="fa-solid fa-lightbulb"></i> Nighttime Lights & Activity Index (VIIRS Proxy)
        </h4>
        <p style="font-size:11px; color:#1e293b;" class="mb-2">
          <strong>Pusat Keramaian Nightlife/Komersial Terdekat:</strong> ${multiDist.nighttimeHub ? multiDist.nighttimeHub.name : 'Pusat Lokal'} (${multiDist.nighttimeHub ? multiDist.nighttimeHub.distanceKm + ' km' : '-'})
        </p>
        <div class="d-flex align-items-center justify-content-between bg-white p-2 rounded border">
          <span style="font-size:11px; font-weight:700; color:#e67e22;">Indeks Intensitas Cahaya Malam:</span>
          <span class="badge badge-pastel-orange" style="font-size:11px;">Skor ${multiDist.nightLightScore} / 100 (${multiDist.nighttimeHub ? multiDist.nighttimeHub.tier : 'Medium'})</span>
        </div>
      </div>

      <div class="detail-section-card mb-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h4 class="section-title mb-0"><i class="fa-solid fa-bullseye text-primary"></i> Proksimitas POI (Radius 500m)</h4>
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
            <i class="fa-solid fa-shield-halved" style="color:var(--pastel-blue);"></i> Rekomendasi Sistem (Empirical Rule Engine):
          </small>
          <p style="font-size:11.5px; color:var(--text-main); font-weight:600; background:rgba(255,255,255,0.75); padding:6px 10px; border-radius:6px;">
            ${recommendation.systemSuggestion}
          </p>
        </div>

        <ul class="rec-rationale mt-2">
          ${recommendation.rationale.map(r => `<li><i class="fa-solid fa-circle-check"></i> ${r}</li>`).join('')}
        </ul>
      </div>

      <div class="d-flex flex-column gap-2 mt-3">
        <button class="btn btn-primary btn-block" onclick="App.openUploadPhotoModal('${asset.id}')">
          <i class="fa-solid fa-images"></i> Upload Multi-Foto Aset (Up to 5)
        </button>
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

  handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('login-username').value;
    const role = document.getElementById('login-role').value;

    this.currentUser = { username: username, role: role };
    localStorage.setItem('bmn_idle_user', JSON.stringify(this.currentUser));
    this.updateUserUI();
    this.closeLoginModal();
    this.showToast(`Selamat datang, ${username}! (${role})`);
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
      container.innerHTML = `
        <div class="d-flex align-items-center gap-2" style="background:#eafaf1; padding:4px 10px; border-radius:20px; border:1px solid #2ecc71;">
          <span style="font-size:11px; font-weight:700; color:#27ae60;">
            <i class="fa-solid fa-circle-user"></i> ${this.currentUser.username}
          </span>
          <button class="btn btn-sm btn-secondary" onclick="App.handleLogout()" title="Logout" style="padding:2px 6px; font-size:10px;">
            <i class="fa-solid fa-right-from-bracket text-danger"></i>
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
  },

  startClock() {
    const clockEl = document.getElementById('live-clock');
    if (!clockEl) return;
    const update = () => {
      const now = new Date();
      clockEl.innerHTML = `<i class="fa-solid fa-clock"></i> ` + now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) + ' | ' + now.toLocaleTimeString('id-ID');
    };
    update();
    setInterval(update, 1000);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
