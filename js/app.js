/**
 * Main Application Controller
 * BMN Idle Interactive Dashboard - KPKNL Denpasar
 * Supporting PowerPoint (.pptx) Slide Export (1 Asset = 1 Slide)
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

  toggleSidebar() {
    const sidebar = document.getElementById('asset-sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    if (!sidebar) return;

    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');

    if (toggleBtn) {
      toggleBtn.innerHTML = isCollapsed 
        ? '<i class="fa-solid fa-chevron-right"></i>' 
        : '<i class="fa-solid fa-chevron-left"></i>';
    }

    setTimeout(() => {
      if (MapEngine.map) {
        MapEngine.map.invalidateSize();
      }
    }, 300);
  },

  updateKPIStats() {
    const totalUnit = this.filteredAssets.length;
    const totalLuasTanah = this.filteredAssets.reduce((sum, a) => sum + (a.luasTanah || 0), 0);
    const totalLuasBangunan = this.filteredAssets.reduce((sum, a) => sum + (a.luasBangunan || 0), 0);
    const totalNilaiAset = this.filteredAssets.reduce((sum, a) => sum + (a.nilaiAset || 0), 0);

    document.getElementById('stat-total-unit').textContent = totalUnit;
    document.getElementById('stat-luas-tanah').textContent = SpatialEngine.formatLuas(totalLuasTanah);
    document.getElementById('stat-luas-bangunan').textContent = SpatialEngine.formatLuas(totalLuasBangunan);
    document.getElementById('stat-nilai-aset').textContent = SpatialEngine.formatRupiah(totalNilaiAset);
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
    const multiDist = SpatialEngine.getMultiLevelDistances(
      asset.lat, asset.lng, asset.kabupaten, asset.kecamatan, asset.kelurahan
    );

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

    let hubBadge = '';
    if (multiDist.crowdCenter) {
      hubBadge = `
        <div class="p-2 mb-2 rounded" style="background:#fef5e7; border:1px solid #f39c12; border-radius:8px;">
          <small style="font-size:11px; font-weight:700; color:#e67e22; display:block;" class="mb-1">
            <i class="fa-solid fa-fire"></i> Orientasi Pusat Keramaian & Ekonomi Utama:
          </small>
          <span style="font-size:11.5px; color:#1e293b; font-weight:600; display:block;">
            ${multiDist.crowdCenter.description}
          </span>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="photo-carousel-container">
        ${photoSlides}
      </div>

      <div class="mb-3">
        <span class="badge badge-pastel-blue">${asset.kategori}</span>
        <h3 style="font-size:16px; font-weight:800; margin-top:6px; color:var(--text-main);">${asset.namaAset}</h3>
        <p style="font-size:12px; color:var(--text-muted);"><i class="fa-solid fa-map-location-dot"></i> ${asset.alamat}</p>
      </div>

      <div class="detail-metrics-grid mb-3" style="grid-template-columns: repeat(3, 1fr);">
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
      </div>

      <div class="detail-section-card mb-3">
        <h4 class="section-title"><i class="fa-solid fa-route" style="color:var(--pastel-blue);"></i> Analisis Jarak Spasial Multilevel</h4>
        
        ${hubBadge}

        <div class="d-flex flex-column gap-2 mt-2" style="font-size:12px;">
          <div class="d-flex justify-content-between align-items-center p-2 rounded" style="background:#f8fafc; border:1px solid #e2e8f0;">
            <span><i class="fa-solid fa-building-flag text-primary"></i> <strong>Jarak ke Ibukota Prov. (Denpasar):</strong></span>
            <span class="badge badge-pastel-blue">${multiDist.provincialCapital.distanceKm} km</span>
          </div>
          <div class="d-flex justify-content-between align-items-center p-2 rounded" style="background:#f8fafc; border:1px solid #e2e8f0;">
            <span><i class="fa-solid fa-landmark text-secondary"></i> <strong>Jarak ke Ibukota Kab. Terdekat (${multiDist.regencyCapital ? multiDist.regencyCapital.name : asset.kabupaten}):</strong></span>
            <span class="badge badge-pastel-purple">${multiDist.regencyCapital ? multiDist.regencyCapital.distanceKm + ' km' : '-'}</span>
          </div>
          <div class="d-flex justify-content-between align-items-center p-2 rounded" style="background:#f8fafc; border:1px solid #e2e8f0;">
            <span><i class="fa-solid fa-house-user text-warning"></i> <strong>Pusat Desa / Kel. (${asset.kelurahan || asset.kecamatan || '-'}):</strong></span>
            <span class="badge badge-pastel-orange">${distData.distanceKm <= 5 ? distData.distanceKm + ' km' : 'Pusat Lokal'}</span>
          </div>
        </div>
      </div>

      <div class="detail-section-card recommendation-card mb-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="badge ${recommendation.type.badgeClass}"><i class="fa-solid fa-user-check"></i> REKOMENDASI TIM</span>
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

  /**
   * EXPORT PRESENTATION TO POWERPOINT (.pptx)
   * 1 Slide per BMN Idle Asset
   */
  exportToPPT() {
    if (typeof PptxGenJS === 'undefined') {
      this.showToast('Library PptxGenJS belum siap. Harap muat ulang halaman.', 'warning');
      return;
    }

    const assetsToExport = this.filteredAssets.length > 0 ? this.filteredAssets : this.assets;
    if (assetsToExport.length === 0) {
      this.showToast('Tidak ada data BMN Idle untuk diekspor.', 'warning');
      return;
    }

    this.showToast('Menyiapkan file PowerPoint (.pptx)...');

    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';

    // 1. TITLE SLIDE
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: 'F4F6FB' };

    titleSlide.addText('PORTOFOLIO BMN IDLE KPKNL DENPASAR', {
      x: 0.8, y: 1.5, w: '85%', h: 1.0,
      fontFace: 'Arial', fontSize: 26, bold: true, color: '1E293B'
    });

    titleSlide.addText('Kanwil DJKN Bali dan Nusa Tenggara | Presentasi & Analisis Spasial Optimalisasi BMN', {
      x: 0.8, y: 2.6, w: '85%', h: 0.5,
      fontFace: 'Arial', fontSize: 14, color: '4A90E2', bold: true
    });

    titleSlide.addText(`Total Aset: ${assetsToExport.length} Unit BMN Idle  |  Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID')}`, {
      x: 0.8, y: 4.8, w: '85%', h: 0.4,
      fontFace: 'Arial', fontSize: 11, color: '64748B'
    });

    // 2. ASSET SLIDES (1 Slide per BMN)
    assetsToExport.forEach((asset, index) => {
      const slide = pptx.addSlide();
      slide.background = { color: 'FFFFFF' };

      const multiDist = SpatialEngine.getMultiLevelDistances(asset.lat, asset.lng, asset.kabupaten, asset.kecamatan, asset.kelurahan);
      const rec = RecommendationEngine.generateRecommendation(asset, []);

      // Slide Header Bar
      slide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: '100%', h: 0.9, fill: { color: '4A90E2' } });
      slide.addText(`[Aset #${index + 1}] ${asset.namaAset}`, {
        x: 0.5, y: 0.15, w: '90%', h: 0.6,
        fontFace: 'Arial', fontSize: 18, bold: true, color: 'FFFFFF'
      });

      // Left Column: Metadata Table Card
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 1.1, w: 5.5, h: 5.8, fill: { color: 'F8FAFC' }, line: { color: 'E2E8F0', width: 1 } });

      const metaText = [
        `Kode Barang / NUP : ${asset.kodeBarang} (NUP ${asset.nup})`,
        `Kategori Aset         : ${asset.kategori}`,
        `Kabupaten / Kota     : ${asset.kabupaten} (${asset.kecamatan || '-'})`,
        `Alamat                   : ${asset.alamat}`,
        `Luas Tanah            : ${SpatialEngine.formatLuas(asset.luasTanah)}`,
        `Luas Bangunan      : ${asset.luasBangunan} m²`,
        `Estimasi Nilai Aset  : ${SpatialEngine.formatRupiah(asset.nilaiAset)}`,
        `Jarak ke Ibukota Prov: ${multiDist.provincialCapital.distanceKm} km (Denpasar)`,
        `Jarak ke Ibukota Kab : ${multiDist.regencyCapital.distanceKm} km (${multiDist.regencyCapital.name})`,
        `Zonasi Tata Ruang : ${asset.zoningName} (${asset.zoningCode})`,
        `Status Legalitas      : ${asset.statusPenguasaan}`
      ].join('\n\n');

      slide.addText(metaText, {
        x: 0.7, y: 1.3, w: 5.1, h: 5.4,
        fontFace: 'Arial', fontSize: 10, color: '1E293B', lineSpacing: 14
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

      slide.addText(`Saran System: ${rec.smartSuggestion}\nCatatan: ${asset.keterangan || '-'}`, {
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
        } catch (err) {
          slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 6.3, y: 3.9, w: 6.5, h: 3.0, fill: { color: 'E2E8F0' } });
          slide.addText('Foto Aset BMN Idle', { x: 6.3, y: 5.2, w: 6.5, h: 0.5, align: 'center', fontFace: 'Arial', fontSize: 12, color: '64748B' });
        }
      } else {
        slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 6.3, y: 3.9, w: 6.5, h: 3.0, fill: { color: 'E2E8F0' } });
        slide.addText('Foto Aset BMN Idle', { x: 6.3, y: 5.2, w: 6.5, h: 0.5, align: 'center', fontFace: 'Arial', fontSize: 12, color: '64748B' });
      }
    });

    // Save PPTX File
    pptx.writeFile({ fileName: `BMN_Idle_KPKNL_Denpasar_${new Date().toISOString().slice(0, 10)}.pptx` })
      .then(fileName => {
        this.showToast(`Berhasil mengunduh slide presentation: ${fileName}`);
      })
      .catch(err => {
        console.error(err);
        this.showToast('Gagal membuat file PPT. Silakan coba lagi.', 'warning');
      });
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
