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
    if (!DataEngine.activeAssets || DataEngine.activeAssets.length === 0) {
      DataEngine.init();
    }
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
    MapEngine.renderBMNMarkers(this.activeAssets, (asset) => this.selectAsset(asset.id, false));
    this.bindEvents();
    this.updateExportCountBadge();

    // Load permanent photos, live dataset, and Pola Tata Ruang Bali in background
    this.loadPhotosFromSheet();
    this.loadLiveDatasetFromSheet();
    if (typeof PolaRuangEngine !== 'undefined') {
      PolaRuangEngine.loadDataset().then(() => {
        this.enrichAssetLocationsWithPolaRuang();
      });
    }
  },

  /**
   * Fetches live asset rows directly from Google Sheets via Apps Script (?action=getData).
   * Automatically synchronizes all 248 active assets from the Google Sheet into activeAssets.
   */
  async loadLiveDatasetFromSheet() {
    if (typeof DataEngine === 'undefined') return;
    const synced = await DataEngine.syncLiveDatasetFromSheet();
    if (synced) {
      this.activeAssets = DataEngine.activeAssets || [];

      // Update PPT export selection with new active assets
      this.activeAssets.forEach(a => this.selectedExportAssetIds.add(a.id));

      // Refresh UI components with live Google Sheets data
      this.populateKabupatenOptions();
      this.updateKPIStats();
      this.renderClusterAccordion();
      this.renderAllAssetsList();

      if (typeof MapEngine !== 'undefined' && MapEngine.map) {
        const mapped = this.activeAssets.filter(a => a.hasCoordinates);
        MapEngine.renderBMNMarkers(mapped, (asset) => this.selectAsset(asset.id, false));
      }
    }
  },

  /**
   * Fetches permanent Google Drive photo URLs from Apps Script backend.
   * Merges them into each asset's fotoList.
   */
  async loadPhotosFromSheet() {
    if (!CONFIG.APPS_SCRIPT || !CONFIG.APPS_SCRIPT.WEB_APP_URL) return;
    try {
      const url = CONFIG.APPS_SCRIPT.WEB_APP_URL + '?action=getPhotos';
      const resp = await fetch(url);
      const json = await resp.json();

      if (json && json.status === 'success' && json.photos) {
        const photoMap = json.photos;
        let updated = false;

        const allAssets = [...(this.activeAssets || []), ...(DataEngine.activeAssets || []), ...(DataEngine.pendingAssets || [])];

        allAssets.forEach(asset => {
          if (!asset || !asset.id) return;
          const driveUrls = photoMap[asset.id];
          if (!driveUrls || driveUrls.length === 0) return;

          const existing = (asset.fotoList || []).filter(u => !u.includes('images.unsplash.com'));
          const merged = [...driveUrls];
          existing.forEach(u => {
            if (!merged.includes(u)) merged.push(u);
          });

          asset.fotoList = merged;
          updated = true;
        });

        if (updated) {
          this.renderClusterAccordion();
          this.renderAllAssetsList();
          if (this.selectedAsset) {
            const refreshed = this.getAsset(this.selectedAsset.id);
            if (refreshed) {
              const catchment = SpatialEngine.getCatchmentAnalysis(refreshed.lat, refreshed.lng);
              const rec = typeof RecommendationEngine !== 'undefined' ? RecommendationEngine.getRecommendation(refreshed) : {};
              this.renderDetailPanel(refreshed, catchment, rec);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Google Drive photo fetch error:', e);
    }
  },

  /**
   * Centralized Filter Application:
   * Combines all active filter criteria (kabupaten, klasifikasi, tahap, unmapped, pinned, search)
   */
  getFilteredAssets() {
    let list = [...this.activeAssets];

    if (this.filters.onlyUnmapped) {
      list = list.filter(a => !a.hasCoordinates);
    }

    if (this.filters.onlyPinned) {
      list = list.filter(a => a.isPinned);
    }

    if (this.filters.kabupaten && this.filters.kabupaten !== 'all') {
      list = list.filter(a => a.kabupaten === this.filters.kabupaten);
    }

    if (this.filters.klasifikasi && this.filters.klasifikasi !== 'all') {
      list = list.filter(a => (a.klasifikasiKey || '').toLowerCase() === this.filters.klasifikasi.toLowerCase() || (a.klasifikasi || '').toLowerCase() === this.filters.klasifikasi.toLowerCase());
    }

    if (this.filters.tahap && this.filters.tahap !== 'all') {
      list = list.filter(a => (a.tahapBerikut || '').toUpperCase() === this.filters.tahap.toUpperCase());
    }

    if (this.filters.search) {
      const q = this.filters.search.toLowerCase();
      list = list.filter(a =>
        (a.namaBarang && a.namaBarang.toLowerCase().includes(q)) ||
        (a.namaSatker && a.namaSatker.toLowerCase().includes(q)) ||
        (a.kodeBarang && a.kodeBarang.toLowerCase().includes(q)) ||
        (a.nup && String(a.nup).includes(q)) ||
        (a.klasifikasi && a.klasifikasi.toLowerCase().includes(q)) ||
        (a.detilKlasifikasi && a.detilKlasifikasi.toLowerCase().includes(q)) ||
        (a.kabupaten && a.kabupaten.toLowerCase().includes(q))
      );
    }

    return list;
  },

  applyFilters() {
    this.renderClusterAccordion();
    this.renderAllAssetsList();

    const filtered = this.getFilteredAssets();
    const mappedAssets = filtered.filter(a => a.hasCoordinates);
    if (typeof MapEngine !== 'undefined' && MapEngine.map) {
      MapEngine.renderBMNMarkers(mappedAssets, (asset) => this.selectAsset(asset.id, false));
      if (mappedAssets.length > 0 && typeof L !== 'undefined') {
        const bounds = L.latLngBounds(mappedAssets.map(a => [a.lat, a.lng]));
        if (bounds.isValid()) {
          MapEngine.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        }
      }
    }

    const indicator = document.getElementById('active-filter-indicator');
    if (indicator) {
      const isFiltered = this.filters.onlyUnmapped || this.filters.onlyPinned || this.filters.klasifikasi !== 'all' || this.filters.tahap !== 'all' || this.filters.kabupaten !== 'all' || Boolean(this.filters.search);
      indicator.style.display = isFiltered ? 'inline-block' : 'none';
      if (isFiltered) {
        indicator.textContent = `${filtered.length} Terfilter`;
      }
    }
  },

  resetAllFilters() {
    this.filters.onlyUnmapped = false;
    this.filters.onlyPinned = false;
    this.filters.klasifikasi = 'all';
    this.filters.tahap = 'all';
    this.filters.kabupaten = 'all';
    this.filters.search = '';

    const sInput = document.getElementById('all-search-input');
    if (sInput) sInput.value = '';
    const gInput = document.getElementById('global-search-input');
    if (gInput) gInput.value = '';
    const clearBtn = document.getElementById('btn-clear-search');
    if (clearBtn) clearBtn.style.display = 'none';

    const selKab = document.getElementById('all-filter-kabupaten');
    if (selKab) selKab.value = 'all';
    const selKlas = document.getElementById('all-filter-klasifikasi');
    if (selKlas) selKlas.value = 'all';
    const selTahap = document.getElementById('all-filter-tahap');
    if (selTahap) selTahap.value = 'all';

    this.updateQuickFilterUI('all');
    this.updateActiveStatCard(null);
    this.applyFilters();
    this.showToast('📋 Menampilkan seluruh 248 unit BMN Idle (60 Satker)', 'info');
  },

  handleGlobalSearch(query) {
    const val = (query || '').trim();
    this.filters.search = val;

    const clearBtn = document.getElementById('btn-clear-search');
    if (clearBtn) clearBtn.style.display = val ? 'flex' : 'none';

    const secInput = document.getElementById('all-search-input');
    if (secInput && secInput.value !== query) secInput.value = query;

    this.applyFilters();
  },

  clearSearch() {
    const mainInput = document.getElementById('global-search-input');
    const secInput = document.getElementById('all-search-input');
    const clearBtn = document.getElementById('btn-clear-search');

    if (mainInput) mainInput.value = '';
    if (secInput) secInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';

    this.filters.search = '';
    this.applyFilters();
  },

  toggleFilterUnmapped() {
    this.filters.onlyUnmapped = !this.filters.onlyUnmapped;
    if (this.filters.onlyUnmapped) {
      this.filters.onlyPinned = false;
      this.updateQuickFilterUI('unmapped');
      this.updateActiveStatCard('card-filter-unmapped');
      this.showToast('⚠️ Memfilter daftar Satker yang perlu disurati untuk update koordinat GPS', 'warning');
    } else {
      this.updateQuickFilterUI('all');
      this.updateActiveStatCard(null);
      this.showToast('Menampilkan seluruh aset', 'info');
    }
    this.applyFilters();
  },

  toggleFilterPinned() {
    this.filters.onlyPinned = !this.filters.onlyPinned;
    if (this.filters.onlyPinned) {
      this.filters.onlyUnmapped = false;
      this.updateQuickFilterUI('pinned');
      this.updateActiveStatCard('card-filter-pinned');
      this.showToast('📌 Memfilter aset Prioritas BMN Idle', 'success');
    } else {
      this.updateQuickFilterUI('all');
      this.updateActiveStatCard(null);
    }
    this.applyFilters();
  },

  cycleFilterKlasifikasi() {
    const list = ['all', 'penggunaan', 'penghapusan', 'pemanfaatan', 'pemindahtanganan', 'renovasi', 'masalah_pencatatan'];
    let idx = list.indexOf(this.filters.klasifikasi || 'all');
    idx = (idx + 1) % list.length;
    this.filters.klasifikasi = list[idx];
    const selKlas = document.getElementById('all-filter-klasifikasi');
    if (selKlas) selKlas.value = this.filters.klasifikasi;
    this.updateQuickFilterUI(this.filters.klasifikasi === 'all' ? 'all' : this.filters.klasifikasi);
    this.updateActiveStatCard(this.filters.klasifikasi !== 'all' ? 'card-filter-klasifikasi' : null);
    this.applyFilters();
    this.showToast(`🏷️ Filter Klasifikasi: ${this.filters.klasifikasi.toUpperCase()}`, 'info');
  },

  cycleFilterTahap() {
    const list = ['all', 'PENELITIAN', 'PEMANTAUAN'];
    let idx = list.indexOf(this.filters.tahap || 'all');
    idx = (idx + 1) % list.length;
    this.filters.tahap = list[idx];
    const selTahap = document.getElementById('all-filter-tahap');
    if (selTahap) selTahap.value = this.filters.tahap;
    this.updateActiveStatCard(this.filters.tahap !== 'all' ? 'card-filter-tahap' : null);
    this.applyFilters();
    this.showToast(`🔄 Filter Rencana Tindak Lanjut: ${this.filters.tahap === 'all' ? 'Semua' : this.filters.tahap}`, 'info');
  },

  setQuickFilter(type) {
    if (type === 'all') {
      this.resetAllFilters();
      return;
    }
    if (type === 'unmapped') {
      this.filters.onlyUnmapped = true;
      this.filters.onlyPinned = false;
      this.filters.klasifikasi = 'all';
    } else if (type === 'pinned') {
      this.filters.onlyPinned = true;
      this.filters.onlyUnmapped = false;
      this.filters.klasifikasi = 'all';
    } else {
      this.filters.onlyUnmapped = false;
      this.filters.onlyPinned = false;
      this.filters.klasifikasi = type;
      const selKlas = document.getElementById('all-filter-klasifikasi');
      if (selKlas) selKlas.value = type;
    }
    this.updateQuickFilterUI(type);
    this.applyFilters();
  },

  updateQuickFilterUI(activeId) {
    document.querySelectorAll('.quick-filter-pill').forEach(pill => {
      pill.classList.toggle('active', pill.id === `qf-${activeId}`);
    });
  },

  updateActiveStatCard(activeCardId) {
    document.querySelectorAll('.stat-card.interactive').forEach(card => {
      card.classList.toggle('active-filter', card.id === activeCardId);
    });
  },

  getKlasifikasiBadgeClass(key) {
    const k = (key || 'penggunaan').toUpperCase();
    if (CONFIG.KLASIFIKASI_TAXONOMY && CONFIG.KLASIFIKASI_TAXONOMY[k]) {
      return CONFIG.KLASIFIKASI_TAXONOMY[k].badgeClass || 'badge-pastel-blue';
    }
    return 'badge-pastel-blue';
  },

  getKlasifikasiIcon(key) {
    const k = (key || 'penggunaan').toUpperCase();
    if (CONFIG.KLASIFIKASI_TAXONOMY && CONFIG.KLASIFIKASI_TAXONOMY[k]) {
      return CONFIG.KLASIFIKASI_TAXONOMY[k].icon || 'fa-tag';
    }
    return 'fa-tag';
  },

  bindEvents() {
    const allSearchInput = document.getElementById('all-search-input');
    if (allSearchInput) {
      allSearchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value;
        this.applyFilters();
      });
    }

    const allFilterKab = document.getElementById('all-filter-kabupaten');
    if (allFilterKab) {
      allFilterKab.addEventListener('change', (e) => {
        this.filters.kabupaten = e.target.value;
        this.applyFilters();
      });
    }

    const allFilterKlas = document.getElementById('all-filter-klasifikasi');
    if (allFilterKlas) {
      allFilterKlas.addEventListener('change', (e) => {
        this.filters.klasifikasi = e.target.value;
        this.updateQuickFilterUI(e.target.value === 'all' ? 'all' : e.target.value);
        this.applyFilters();
      });
    }

    const allFilterTahap = document.getElementById('all-filter-tahap');
    if (allFilterTahap) {
      allFilterTahap.addEventListener('change', (e) => {
        this.filters.tahap = e.target.value;
        this.applyFilters();
      });
    }

    document.addEventListener('keydown', (e) => {
      const modal = document.getElementById('photo-lightbox-modal');
      if (modal && modal.style.display === 'flex') {
        if (e.key === 'Escape') this.closePhotoLightbox();
        if (e.key === 'ArrowLeft') this.navigateLightbox(-1);
        if (e.key === 'ArrowRight') this.navigateLightbox(1);
      }
    });

    document.querySelectorAll('.btn-tile-switch:not(#btn-toggle-pola-ruang)').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-tile-switch:not(#btn-toggle-pola-ruang)').forEach(b => b.classList.remove('active'));
        const target = e.currentTarget;
        target.classList.add('active');
        const layerKey = target.getAttribute('data-layer');
        if (layerKey) {
          MapEngine.switchTileLayer(layerKey);
        }
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

    this.isRightDrawerOpen = drawer.classList.contains('open') || drawer.classList.contains('mobile-active');

    if (this.isRightDrawerOpen) {
      drawer.classList.remove('open');
      drawer.classList.remove('mobile-active');
      if (rightToggleBtn) rightToggleBtn.style.display = 'flex';
      MapEngine.resetView();
      if (window.innerWidth <= 768) {
        this.switchMobileTab('map');
      }
    } else {
      if (this.selectedAsset) {
        drawer.classList.add('open');
        drawer.classList.add('mobile-active');
        if (rightToggleBtn) rightToggleBtn.style.display = 'none';
        if (window.innerWidth <= 768) {
          this.switchMobileTab('detail');
        }
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

    selectKab.innerHTML = '<option value="all">Semua Kabupaten/Kota</option>';
    const kabList = [...new Set(this.activeAssets.map(a => a.kabupaten))].filter(Boolean).sort();
    kabList.forEach(kab => {
      const opt = document.createElement('option');
      opt.value = kab;
      opt.textContent = kab;
      selectKab.appendChild(opt);
    });
  },

  setTahapFilter(tahapCode) {
    this.filters.tahap = tahapCode;
    this.filters.onlyUnmapped = false;
    this.filters.onlyPinned = false;
    const selTahap = document.getElementById('all-filter-tahap');
    if (selTahap) selTahap.value = tahapCode;
    this.updateActiveStatCard('card-filter-tahap');
    this.applyFilters();
    this.showToast(`🔄 Filter Rencana Tindak Lanjut: ${tahapCode}`, 'info');
  },

  updateKPIStats() {
    const stats = DataEngine.getStatsSummary();

    // Card 1: Total Permintaan Klarifikasi
    const elTotal = document.getElementById('stat-total-permintaan');
    const elTotalSatker = document.getElementById('stat-total-satker-sub');
    const elDikirim = document.getElementById('stat-sub-dikirim');
    const elDijawab = document.getElementById('stat-sub-dijawab');
    const elBelum = document.getElementById('stat-sub-belum');

    if (elTotal) elTotal.textContent = `${stats.totalAssets} Unit`;
    if (elTotalSatker) elTotalSatker.textContent = `${stats.totalSatkers} Satker Terdata`;
    if (elDikirim) elDikirim.textContent = stats.dikirimCount;
    if (elDijawab) elDijawab.textContent = stats.dijawabCount;
    if (elBelum) elBelum.textContent = stats.belumDijawabCount;

    // Card 2: BMN Belum Ada Koordinat
    const elUnmapped = document.getElementById('stat-unmapped-unit');
    const elUnmappedSatker = document.getElementById('stat-unmapped-satker-sub');
    if (elUnmapped) elUnmapped.textContent = `${stats.unmappedCount} Unit`;
    if (elUnmappedSatker) elUnmappedSatker.textContent = `${stats.unmappedSatkersCount} Satker`;

    // Card 3: Klasifikasi BMN Idle (Hero 2-Row Card on Right)
    const elKlasBreakdown = document.getElementById('stat-klasifikasi-breakdown');
    if (elKlasBreakdown && stats.hierarchy) {
      const items = [
        { key: 'penggunaan', label: 'Penggunaan', colorClass: 'blue', icon: 'fa-building-user', data: stats.hierarchy['Penggunaan'] },
        { key: 'renovasi', label: 'Renovasi', colorClass: 'orange', icon: 'fa-hammer', data: stats.hierarchy['Renovasi'] },
        { key: 'penghapusan', label: 'Penghapusan', colorClass: 'red', icon: 'fa-trash-can', data: stats.hierarchy['Penghapusan'] },
        { key: 'masalah_pencatatan', label: 'Masalah Catat', colorClass: 'purple', icon: 'fa-triangle-exclamation', data: stats.hierarchy['Masalah Pencatatan'] },
        { key: 'pemanfaatan', label: 'Pemanfaatan', colorClass: 'green', icon: 'fa-handshake', data: stats.hierarchy['Pemanfaatan'] },
        { key: 'pemindahtanganan', label: 'Pemindahtanganan', colorClass: 'cyan', icon: 'fa-gift', data: stats.hierarchy['Pemindahtanganan'] }
      ];

      elKlasBreakdown.innerHTML = items.map(item => {
        const count = item.data ? item.data.count : 0;
        const detailsObj = item.data ? item.data.details : {};
        const detailSnippet = Object.entries(detailsObj)
          .map(([dName, dCount]) => {
            const shortName = dName.replace('Rencana / Usulan ', 'Rencana ').replace('ke Satker Lain', '').replace(' / Sewa', '').replace(' / Koreksi Catat', '').trim();
            return `${shortName} (${dCount})`;
          })
          .join(' • ');

        return `
          <div class="hero-cat-item ${item.colorClass}" onclick="event.stopPropagation(); App.setQuickFilter('${item.key}')" title="Filter klasifikasi: ${item.label} (${count} Unit)">
            <div class="cat-main">
              <span class="cat-title"><i class="fa-solid ${item.icon}"></i> ${item.label}</span>
              <span class="cat-subtext">${detailSnippet || '-'}</span>
            </div>
            <span class="cat-badge-val">${count}</span>
          </div>
        `;
      }).join('');
    }

    // Card 4: Rencana Tindak Lanjut (Dynamic Stages from Sheet)
    const tahapEntries = Object.entries(stats.tahapMap || {});
    const cPenelitian = stats.tahapMap['PENELITIAN'] || 0;
    const cPemantauan = stats.tahapMap['PEMANTAUAN'] || 0;
    const totalTahap = stats.totalAssets || 1;

    const elPenelitian = document.getElementById('stat-tahap-penelitian');
    const elPemantauan = document.getElementById('stat-tahap-pemantauan');
    if (elPenelitian) elPenelitian.textContent = cPenelitian;
    if (elPemantauan) elPemantauan.textContent = cPemantauan;

    // If there are more stages present in Google Sheet (e.g. PENELUSURAN, DATA TIDAK LENGKAP):
    const cardsContainer = document.getElementById('stat-tahap-cards-container');
    if (cardsContainer && tahapEntries.length > 2) {
      cardsContainer.style.gridTemplateColumns = `repeat(${Math.min(tahapEntries.length, 4)}, 1fr)`;
      cardsContainer.innerHTML = tahapEntries.map(([tCode, tCount], tIdx) => {
        const colorClass = tIdx === 0 ? 'blue' : (tIdx === 1 ? 'mint' : (tIdx === 2 ? 'orange' : 'purple'));
        const iconClass = tCode.includes('PANTAU') ? 'fa-eye' : (tCode.includes('TELUSUR') ? 'fa-compass' : (tCode.includes('LENGKAP') ? 'fa-triangle-exclamation' : 'fa-magnifying-glass'));
        return `
          <div class="tahap-box ${colorClass}" onclick="event.stopPropagation(); App.setTahapFilter('${tCode}')" title="Filter: ${tCode} (${tCount} Unit)">
            <div class="tahap-box-info">
              <strong style="font-size:11.5px; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><i class="fa-solid ${iconClass}"></i> ${tCode}</strong>
            </div>
            <div class="tahap-box-val" style="font-size:16px;">${tCount}</div>
          </div>
        `;
      }).join('');
    }

    const ratioBlue = ((cPenelitian / totalTahap) * 100).toFixed(1);
    const ratioMint = ((cPemantauan / totalTahap) * 100).toFixed(1);

    const barBlue = document.getElementById('stat-tahap-ratio-blue');
    const barMint = document.getElementById('stat-tahap-ratio-mint');
    if (barBlue) barBlue.style.width = `${ratioBlue}%`;
    if (barMint) barMint.style.width = `${ratioMint}%`;

    // Card 2 sub-description count
    const elUnmappedDesc = document.getElementById('stat-unmapped-satker-desc');
    if (elUnmappedDesc) elUnmappedDesc.textContent = `${stats.unmappedSatkersCount} Satker`;

    // Card 5: Prioritas BMN Idle (Swapped to Row 2)
    const elPinned = document.getElementById('stat-total-pinned');
    if (elPinned) elPinned.textContent = stats.pinnedCount;

    const elPinnedPreviewNote = document.getElementById('stat-pinned-preview-note');
    if (elPinnedPreviewNote) {
      if (stats.pinnedCount > 0) {
        elPinnedPreviewNote.innerHTML = `<i class="fa-solid fa-thumbtack text-danger"></i> <span><strong>${stats.pinnedCount} Unit</strong> terpilih atensi pimpinan (1-Klik filter)</span>`;
      } else {
        elPinnedPreviewNote.innerHTML = `<i class="fa-solid fa-thumbtack text-danger"></i> <span>Klik tanda 📌 pada kartu aset untuk menandai prioritas</span>`;
      }
    }

    const elPinnedList = document.getElementById('stat-pinned-preview-list');
    if (elPinnedList) {
      if (stats.pinnedAssets && stats.pinnedAssets.length > 0) {
        elPinnedList.innerHTML = stats.pinnedAssets.map(asset => `
          <div class="hero-pinned-item" onclick="event.stopPropagation(); App.selectAsset('${asset.id}')" title="Fokus ke aset ${asset.namaBarang}">
            <div style="display:flex; align-items:center; gap:5px; min-width:0; flex:1;">
              <i class="fa-solid fa-thumbtack text-danger" style="font-size:8.5px;"></i>
              <strong style="color:var(--text-main); font-size:9.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${asset.namaBarang}</strong>
            </div>
            <span class="badge badge-pastel-blue" style="font-size:8px; padding:1px 4px; flex-shrink:0;">${asset.kabupaten}</span>
          </div>
        `).join('');
      } else {
        elPinnedList.innerHTML = `
          <div style="font-size:9px; color:var(--text-muted); text-align:center; padding:8px 4px; background:#fff5f5; border-radius:6px;">
            <i class="fa-solid fa-thumbtack text-danger" style="margin-bottom:2px;"></i><br>
            Klik tanda pin 📌 pada kartu aset untuk menandai prioritas atensi pimpinan.
          </div>
        `;
      }
    }

    // Tab badges
    const tree = DataEngine.getClusteredTree(this.getFilteredAssets());
    const totalKluster = Object.keys(tree).length;
    const badgeCluster = document.getElementById('badge-cluster-count');
    const badgeAll = document.getElementById('badge-all-count');
    if (badgeCluster) badgeCluster.textContent = `${totalKluster} Kluster`;
    if (badgeAll) badgeAll.textContent = `${stats.totalAssets} Unit`;
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

    const displayAssets = this.getFilteredAssets();
    const tree = DataEngine.getClusteredTree(displayAssets);

    if (Object.keys(tree).length === 0) {
      container.innerHTML = `<div class="p-4 text-center text-muted">Tidak ada aset yang cocok dengan filter aktif.</div>`;
      return;
    }

    let html = '';

    // Sort Kementerian keys by totalPinned DESC, then totalAssets DESC
    const kemKeys = Object.keys(tree).sort((aKey, bKey) => {
      const pA = tree[aKey].totalPinned || 0;
      const pB = tree[bKey].totalPinned || 0;
      if (pA !== pB) return pB - pA;
      return tree[bKey].totalAssets - tree[aKey].totalAssets;
    });

    kemKeys.forEach((kemKey, kIdx) => {
      const kemData = tree[kemKey];
      const satkerKeys = Object.keys(kemData.satkers);

      // Sort Satkers: Satkers with pinned assets float to top
      satkerKeys.sort((aKey, bKey) => {
        const pA = kemData.satkers[aKey].pinnedCount || 0;
        const pB = kemData.satkers[bKey].pinnedCount || 0;
        if (pA !== pB) return pB - pA;
        return kemData.satkers[bKey].assets.length - kemData.satkers[aKey].assets.length;
      });

      let satkerContentHtml = '';

      satkerKeys.forEach((sKey, sIdx) => {
        const satkerObj = kemData.satkers[sKey];

        const cardsHtml = satkerObj.assets.map(asset => {
          const isChecked = this.selectedExportAssetIds.has(asset.id) ? 'checked' : '';
          const isSelected = this.selectedAsset && this.selectedAsset.id === asset.id ? 'active' : '';

          const firstPhoto = (asset.fotoList && asset.fotoList.length > 0) ? asset.fotoList[0] : '';
          const thumbStyle = firstPhoto ? `background-image: url('${this.formatPhotoUrl(firstPhoto)}');` : `background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); display:flex; align-items:center; justify-content:center;`;
          const thumbInner = firstPhoto ? '' : `<i class="fa-solid fa-camera-retro" style="color:#94a3b8; font-size:16px;"></i>`;

          return `
            <div class="asset-card ${isSelected} ${!asset.hasCoordinates ? 'unmapped-card' : ''}" style="position: relative;">
              <input type="checkbox" class="custom-checkbox asset-export-cb" data-asset-id="${asset.id}" ${isChecked} onchange="App.toggleSelectAssetForExport('${asset.id}', this.checked)">
              <div class="asset-card-thumb" style="${thumbStyle}" onclick="App.selectAsset('${asset.id}')">
                ${thumbInner}
                <span class="asset-card-category">${asset.kategori}</span>
                ${asset.isPinned ? `<span class="thumb-pin-badge" title="Prioritas Idle"><i class="fa-solid fa-thumbtack"></i></span>` : ''}
              </div>
              <div class="asset-card-content" onclick="App.selectAsset('${asset.id}')">
                <h5 class="asset-card-title">${asset.namaBarang}</h5>
                <div class="d-flex align-items-center gap-1 flex-wrap mb-1">
                  <span class="badge badge-klasifikasi ${this.getKlasifikasiBadgeClass(asset.klasifikasiKey)}" title="${asset.detilKlasifikasi}">
                    <i class="fa-solid ${this.getKlasifikasiIcon(asset.klasifikasiKey)}"></i> ${asset.klasifikasi}: ${asset.detilKlasifikasi}
                  </span>
                  ${!asset.hasCoordinates ? `<span class="badge-unmapped" title="Belum ada titik koordinat GPS. Perlu disurati."><i class="fa-solid fa-triangle-exclamation"></i> Butuh GPS</span>` : ''}
                </div>
                <div class="asset-card-meta">
                  <span><i class="fa-solid fa-barcode"></i> NUP ${asset.nup} &bull; ${asset.kodeBarang}</span>
                  <span><i class="fa-solid fa-location-dot text-danger"></i> ${asset.kabupaten}</span>
                </div>
                <div class="asset-card-footer">
                  <div class="asset-card-area"><i class="fa-solid fa-vector-square"></i> Luas: ${SpatialEngine.formatLuas(asset.luas)}</div>
                  <span class="badge badge-pastel-purple" style="font-size:9px;">${asset.tahapBerikut || 'PENELITIAN'}</span>
                </div>
              </div>
            </div>
          `;
        }).join('');

        const pinnedBadge = satkerObj.pinnedCount > 0 ? `
          <span class="satker-pin-icon" title="${satkerObj.pinnedCount} Aset Prioritas Idle"><i class="fa-solid fa-thumbtack"></i></span>
        ` : '';

        satkerContentHtml += `
          <div class="accordion-satker-block">
            <div class="accordion-satker-header" onclick="App.filterBySatker('${kemKey}', '${sKey}')">
              <span style="font-weight:700; font-size:11.5px; color:var(--text-main);">${satkerObj.name} ${pinnedBadge}</span>
              <span class="badge badge-pastel-purple" style="font-size:9px; flex-shrink:0;">${satkerObj.assets.length} Aset</span>
            </div>
            <div class="cluster-asset-grid">
              ${cardsHtml}
            </div>
          </div>
        `;
      });

      const kemPinnedBadge = kemData.totalPinned > 0 ? `
        <span class="badge" style="background:#e74c3c; color:#ffffff; font-size:10.5px; padding:3px 8px; border-radius:10px; margin-left:8px;"><i class="fa-solid fa-thumbtack"></i> ${kemData.totalPinned} Prioritas</span>
      ` : '';

      html += `
        <div class="accordion-group">
          <div class="accordion-kem-header" onclick="App.toggleAccordionBlock('kem-block-${kIdx}', '${kemKey}')">
            <div class="kem-title-text">${kemData.name} ${kemPinnedBadge}</div>
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
    this.syncCheckboxesUI();
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

    if (kemKey && typeof MapEngine !== 'undefined') {
      const filteredAssets = this.getFilteredAssets().filter(a => a.kementerian === kemKey && a.hasCoordinates);
      if (filteredAssets.length > 0) {
        MapEngine.renderBMNMarkers(filteredAssets, (asset) => this.selectAsset(asset.id, false));
        if (typeof L !== 'undefined') {
          const bounds = L.latLngBounds(filteredAssets.map(a => [a.lat, a.lng]));
          if (bounds.isValid() && MapEngine.map) {
            MapEngine.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
          }
        }
      }
    }
  },

  filterBySatker(kemKey, satkerName) {
    const filteredAssets = this.getFilteredAssets().filter(a => a.kementerian === kemKey && a.namaSatker === satkerName);
    const mappedAssets = filteredAssets.filter(a => a.hasCoordinates);
    if (mappedAssets.length > 0 && typeof MapEngine !== 'undefined') {
      MapEngine.renderBMNMarkers(mappedAssets, (asset) => this.selectAsset(asset.id, false));
      if (typeof L !== 'undefined') {
        const bounds = L.latLngBounds(mappedAssets.map(a => [a.lat, a.lng]));
        if (bounds.isValid() && MapEngine.map) {
          MapEngine.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }
      }
    }
    this.showToast(`Filter Satker: ${satkerName} (${filteredAssets.length} unit)`, 'info');
  },

  renderAllAssetsList() {
    const container = document.getElementById('all-assets-list-root');
    if (!container) return;

    let list = this.getFilteredAssets();

    // Sort: Pinned assets first
    list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return a.namaBarang.localeCompare(b.namaBarang);
    });

    if (list.length === 0) {
      container.innerHTML = `<div class="p-4 text-center text-muted">Tidak ada aset yang cocok dengan filter pencarian.</div>`;
      return;
    }

    const html = list.map(asset => {
      const isChecked = this.selectedExportAssetIds.has(asset.id) ? 'checked' : '';
      const isSelected = this.selectedAsset && this.selectedAsset.id === asset.id ? 'active' : '';

      const firstPhoto = (asset.fotoList && asset.fotoList.length > 0) ? asset.fotoList[0] : '';
      const thumbStyle = firstPhoto ? `background-image: url('${this.formatPhotoUrl(firstPhoto)}');` : `background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); display:flex; align-items:center; justify-content:center;`;
      const thumbInner = firstPhoto ? '' : `<i class="fa-solid fa-camera-retro" style="color:#94a3b8; font-size:16px;"></i>`;

      return `
        <div class="asset-card ${isSelected} mb-2 ${!asset.hasCoordinates ? 'unmapped-card' : ''}" style="position: relative;">
          <input type="checkbox" class="custom-checkbox asset-export-cb" data-asset-id="${asset.id}" ${isChecked} onchange="App.toggleSelectAssetForExport('${asset.id}', this.checked)">
          <div class="asset-card-thumb" style="${thumbStyle}" onclick="App.selectAsset('${asset.id}')">
            ${thumbInner}
            <span class="asset-card-category">${asset.kategori}</span>
            ${asset.isPinned ? `<span class="thumb-pin-badge" title="Prioritas Idle"><i class="fa-solid fa-thumbtack"></i></span>` : ''}
          </div>
          <div class="asset-card-content" onclick="App.selectAsset('${asset.id}')">
            <h5 class="asset-card-title">${asset.namaBarang}</h5>
            <div class="d-flex align-items-center gap-1 flex-wrap mb-1">
              <span class="badge badge-klasifikasi ${this.getKlasifikasiBadgeClass(asset.klasifikasiKey)}" title="${asset.detilKlasifikasi}">
                <i class="fa-solid ${this.getKlasifikasiIcon(asset.klasifikasiKey)}"></i> ${asset.klasifikasi}: ${asset.detilKlasifikasi}
              </span>
              ${!asset.hasCoordinates ? `<span class="badge-unmapped" title="Belum ada titik koordinat GPS. Perlu disurati."><i class="fa-solid fa-triangle-exclamation"></i> Butuh GPS</span>` : ''}
            </div>
            <div class="asset-card-meta">
              <span><i class="fa-solid fa-building-user text-primary"></i> ${asset.namaSatker}</span>
              <span><i class="fa-solid fa-barcode"></i> NUP ${asset.nup} &bull; ${asset.kodeBarang}</span>
              <span><i class="fa-solid fa-location-dot text-danger"></i> ${asset.kabupaten}</span>
            </div>
            <div class="asset-card-footer">
              <div class="asset-card-area"><i class="fa-solid fa-vector-square"></i> Luas: ${SpatialEngine.formatLuas(asset.luas)}</div>
              <span class="badge badge-pastel-purple" style="font-size:9px;">${asset.tahapBerikut || 'PENELITIAN'}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
    this.syncCheckboxesUI();
  },

  async selectAsset(assetId, openDrawer = true) {
    const asset = this.activeAssets.find(a => a.id === assetId);
    if (!asset) return;

    this.selectedAsset = asset;
    MapEngine.activeAssetId = assetId;

    this.renderClusterAccordion();
    this.renderAllAssetsList();

    const drawer = document.getElementById('detail-drawer');
    const rightToggleBtn = document.getElementById('right-panel-toggle-btn');
    if (openDrawer) {
      if (drawer) {
        drawer.classList.add('open');
        drawer.classList.add('mobile-active');
      }
      if (rightToggleBtn) rightToggleBtn.style.display = 'none';

      if (window.innerWidth <= 768) {
        this.switchMobileTab('detail');
      }
    }

    let catchmentData = { pois: [], totalCount: 0 };
    let recommendation = typeof RecommendationEngine !== 'undefined'
      ? RecommendationEngine.generateRecommendation(asset, [])
      : { officialTitle: 'Penelitian Awal Penggunaan BMN', type: { badgeClass: 'badge-pastel-blue' } };

    if (asset.hasCoordinates && typeof asset.lat === 'number' && typeof asset.lng === 'number') {
      MapEngine.focusLocation(asset.lat, asset.lng, 16);
      MapEngine.drawKPKNLConnector(asset);
      MapEngine.drawCatchmentCircle(asset.lat, asset.lng, 500);

      // Render Pola Tata Ruang inside Catchment Focus Area (500m Radius)
      if (typeof MapEngine.renderCatchmentPolaRuang === 'function') {
        MapEngine.renderCatchmentPolaRuang(asset, 500);
      }

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
      catchmentData = await SpatialEngine.fetchDynamicPOIsInCatchment(asset.lat, asset.lng, 500);
      MapEngine.renderNearbyPOIs(catchmentData.pois);
      recommendation = RecommendationEngine.generateRecommendation(asset, catchmentData.pois);
    } else {
      this.showToast(`📍 Aset belum ada titik GPS. Menampilkan data surat & atribut satker ${asset.namaSatker}.`, 'warning');
      if (MapEngine.connectorLinesGroup) MapEngine.connectorLinesGroup.clearLayers();
      if (typeof MapEngine.clearCatchmentCircle === 'function') MapEngine.clearCatchmentCircle();
      if (typeof MapEngine.clearPolaRuang === 'function') MapEngine.clearPolaRuang();
    }

    this.renderDetailPanel(asset, catchmentData, recommendation);
  },

  closeDetailPanel() {
    const drawer = document.getElementById('detail-drawer');
    const rightToggleBtn = document.getElementById('right-panel-toggle-btn');
    if (drawer) {
      drawer.classList.remove('open');
      drawer.classList.remove('mobile-active');
    }
    if (rightToggleBtn) rightToggleBtn.style.display = 'flex';
    this.selectedAsset = null;
    MapEngine.resetView();
    if (window.innerWidth <= 768) {
      this.switchMobileTab('map');
    }
  },

  renderDetailPanel(asset, catchmentData, recommendation) {
    const container = document.getElementById('detail-drawer-body');
    if (!container) return;

    this.currentPhotoIndex = 0;
    const savedUser = this.currentUser || JSON.parse(localStorage.getItem('bmn_idle_user') || 'null');
    const userRole = savedUser ? (savedUser.role || savedUser.username || '') : 'viewer';
    const canEditOrUpload = userRole !== 'Viewer' && userRole !== 'viewer' && userRole !== 'tamu' && userRole !== '';
    const isAdmin = savedUser && (
      savedUser.role === 'Admin KPKNL' ||
      savedUser.username === 'admin_kpknl' ||
      savedUser.role === 'admin_kpknl' ||
      savedUser.role === 'Admin' ||
      savedUser.role === 'admin'
    );

    const hasCoords = asset.hasCoordinates && typeof asset.lat === 'number' && typeof asset.lng === 'number';
    const distData = hasCoords ? SpatialEngine.getDistanceToKPKNL(asset.lat, asset.lng) : { distanceKm: '-' };
    const multiDist = hasCoords ? SpatialEngine.getMultiLevelDistances(asset.lat, asset.lng, asset.kabupaten, asset.kecamatan, asset.kelurahan) : null;
    const gmapsUrl = hasCoords ? `https://www.google.com/maps?q=${asset.lat},${asset.lng}` : '#';

    // Point-in-Polygon Spatial Zoning Analytics (RTRW / RDTR)
    const zoningInfo = (hasCoords && typeof PolaRuangEngine !== 'undefined')
      ? PolaRuangEngine.getZoningForPoint(asset.lat, asset.lng)
      : null;

    // Perfect synchronization: ensure asset kabupaten matches the official GIS polygon
    if (zoningInfo && zoningInfo.kabupaten && zoningInfo.kabupaten !== 'Provinsi Bali') {
      asset.kabupaten = zoningInfo.kabupaten;
    }

    const rawPhotoUrl = (asset.fotoList && asset.fotoList.length > 0) ? asset.fotoList[this.currentPhotoIndex || 0] : '';
    const activePhotoUrl = this.formatPhotoUrl(rawPhotoUrl);
    const totalPhotos = asset.fotoList ? asset.fotoList.length : 0;

    const navArrows = totalPhotos > 1 ? `
      <button class="carousel-nav-btn carousel-nav-prev" onclick="event.stopPropagation(); App.prevPhoto('${asset.id}')" title="Foto Sebelumnya">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <button class="carousel-nav-btn carousel-nav-next" onclick="event.stopPropagation(); App.nextPhoto('${asset.id}')" title="Foto Selanjutnya">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    ` : '';

    const catchmentPoiHtml = (catchmentData && catchmentData.pois) ? catchmentData.pois.map(poi => `
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
    `).join('') : '';

    container.innerHTML = `
      ${totalPhotos > 0 && activePhotoUrl ? `
        <div id="photo-carousel-box" class="photo-carousel-container photo-thumbnail-clickable" onclick="App.openPhotoLightbox('${asset.id}')" title="Klik untuk perbesar foto (Lightbox)" style="background-image: url('${activePhotoUrl}'); background-size: cover; background-position: center; position: relative; height: 190px; border-radius: 10px; overflow: hidden; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
          <span id="photo-carousel-counter" class="photo-counter">${(this.currentPhotoIndex || 0) + 1} / ${totalPhotos}</span>
          ${canEditOrUpload ? `
            <button class="btn-delete-photo" title="Hapus foto ini" onclick="event.stopPropagation(); App.deletePhoto('${asset.id}')">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          ` : ''}
          ${navArrows}
        </div>
      ` : `
        <div class="photo-placeholder-box">
          <i class="fa-solid fa-camera-retro"></i>
          <span>Belum Ada Foto Lapangan</span>
          <small>Unggah foto aset melalui tombol upload foto di bawah</small>
        </div>
      `}

      <!-- UNMAPPED WARNING CALLOUT BOX (IF NO GPS) -->
      ${!hasCoords ? `
        <div class="unmapped-alert-box">
          <i class="fa-solid fa-triangle-exclamation" style="font-size:20px; color:#d35400; flex-shrink:0; margin-top:2px;"></i>
          <div>
            <strong style="font-size:12px; display:block; margin-bottom:2px;">Aset Belum Memiliki Titik Koordinat GPS</strong>
            <span>Satker <strong>${asset.namaSatker}</strong> perlu dikirimi surat dinas klarifikasi dan pemutakhiran koordinat spasial BMN.</span>
          </div>
        </div>
      ` : ''}

      <!-- CLASSIFICATION & SUB-DETAIL CHIP BANNER -->
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:10px 12px; margin-bottom:12px;">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="badge ${this.getKlasifikasiBadgeClass(asset.klasifikasiKey)}" style="font-size:10.5px; font-weight:700;">
            <i class="fa-solid ${this.getKlasifikasiIcon(asset.klasifikasiKey)}"></i> ${asset.klasifikasi}
          </span>
          <span class="badge badge-pastel-purple" style="font-size:9.5px; font-weight:700;">Tahap: ${asset.tahapBerikut || 'PENELITIAN'}</span>
        </div>
        <div style="font-size:11.5px; font-weight:700; color:var(--text-main); margin-top:4px;">
          <i class="fa-solid fa-arrow-turn-down" style="font-size:9px; margin-right:4px; color:var(--pastel-blue);"></i> Detil: ${asset.detilKlasifikasi}
        </div>
      </div>

      <div class="mb-4">
        <span class="badge badge-pastel-blue">${asset.kategori} (${asset.jenisBarang})</span>
        ${asset.isPinned ? `<span class="badge" style="background:linear-gradient(135deg, #e74c3c, #c0392b); color:#ffffff; font-size:10.5px; padding:4px 8px; border-radius:6px; margin-left:6px;"><i class="fa-solid fa-thumbtack"></i> Prioritas Idle</span>` : ''}
        <h3 style="font-size:15px; font-weight:800; margin-top:6px; color:var(--text-main); line-height:1.4;">${asset.namaBarang}</h3>
        <p style="font-size:11.5px; color:var(--text-muted); margin-top:4px;"><i class="fa-solid fa-building-user text-primary" style="margin-right:6px;"></i> ${asset.namaSatker}</p>
        <p style="font-size:11.5px; color:var(--text-muted); margin-top:4px;"><i class="fa-solid fa-id-card text-secondary" style="margin-right:6px;"></i> Kode Satker: <strong style="color:var(--text-main);">${asset.kodeSatker || '-'}</strong> &bull; <i class="fa-solid fa-location-dot text-danger" style="margin-left:4px; margin-right:4px;"></i> <strong>${asset.kabupaten}</strong></p>
      </div>

      <!-- SURAT JAWABAN & TANGGAL SURAT CARD -->
      <div class="detail-section-card mb-4">
        <h4 class="section-title mb-2"><i class="fa-solid fa-envelope-open-text text-primary" style="margin-right:6px;"></i> Respon & Surat Pengguna Barang</h4>
        <div style="font-size:11.5px; line-height:1.5;">
          <p class="mb-1"><strong>Nomor Surat:</strong> <span class="badge badge-pastel-blue" style="font-size:10.5px;">${asset.suratJawaban || '-'}</span></p>
          <p class="mb-2"><strong>Tanggal Surat:</strong> <span style="color:var(--text-muted);">${asset.tglSurat || '-'}</span></p>
          <div style="background:#f8fafc; border-left:3px solid var(--pastel-blue); padding:8px 12px; border-radius:0 8px 8px 0; font-size:11.5px; font-style:italic; color:var(--text-main);">
            "${asset.hasilJawaban || 'Belum ada catatan jawaban dari satker.'}"
          </div>
          ${asset.catatanTim ? `
            <div class="mt-2" style="background:#fff9db; border:1px dashed #f59f00; padding:6px 10px; border-radius:6px; font-size:10.5px; color:#854d0e;">
              <strong>Catatan Rekonsiliasi:</strong> ${asset.catatanTim}
            </div>
          ` : ''}
        </div>
      </div>

      <!-- SPATIAL ZONING (POLA TATA RUANG ATR/BPN) CARD -->
      ${hasCoords && zoningInfo ? `
      <div class="detail-section-card mb-4" style="background:#ffffff; border:1.5px solid ${zoningInfo.color}; border-radius:12px; padding:14px; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h4 class="section-title mb-0" style="color:${zoningInfo.color}; font-size:13px; font-weight:800;">
            <i class="fa-solid fa-map-location-dot" style="margin-right:6px;"></i> Pola Tata Ruang (RTRW / RDTR)
          </h4>
          <span class="badge" style="background:${zoningInfo.color}; color:#ffffff; font-size:10.5px; font-weight:700; padding:4px 9px; border-radius:6px;">
            <i class="fa-solid ${zoningInfo.icon}"></i> ${zoningInfo.namaZona}
          </span>
        </div>
        
        <div style="font-size:11.5px; line-height:1.55; color:var(--text-main);">
          <div style="background:#f8fafc; border-left:3.5px solid ${zoningInfo.color}; padding:8px 12px; border-radius:0 8px 8px 0; margin-bottom:8px;">
            <strong style="color:var(--text-main); display:block; font-size:12px;">Peruntukan Kawasan:</strong>
            <span>${zoningInfo.desc}</span>
          </div>

          ${zoningInfo.keteranganKhusus ? `
            <div class="mb-2" style="background:#fff9db; border:1px dashed #f59f00; padding:6px 10px; border-radius:6px; font-size:11px; color:#854d0e;">
              <strong><i class="fa-solid fa-star text-warning"></i> Atribut Khusus:</strong> ${zoningInfo.keteranganKhusus}
            </div>
          ` : ''}

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:8px;">
            <div style="background:#f1f5f9; padding:6px 10px; border-radius:6px; font-size:10.5px;">
              <span style="color:#64748b; display:block;">Wilayah Administrasi:</span>
              <strong>${zoningInfo.kabupaten}</strong>
            </div>
            <div style="background:#f1f5f9; padding:6px 10px; border-radius:6px; font-size:10.5px;">
              <span style="color:#64748b; display:block;">Cagar Budaya:</span>
              <strong style="${zoningInfo.cagarBudaya ? 'color:#e74c3c;' : 'color:#10b981;'}">${zoningInfo.cagarBudaya || 'Tidak Ada'}</strong>
            </div>
          </div>

          <div class="mt-2" style="background:#f8fafc; border:1px solid #e2e8f0; padding:8px 10px; border-radius:8px; font-size:10.5px;">
            <span style="color:#64748b; display:block; margin-bottom:2px;"><i class="fa-solid fa-triangle-exclamation text-danger"></i> Kerawanan Bencana (KRB):</span>
            <strong style="${zoningInfo.rawanBencana !== 'Tidak Ada Riwayat Rawan Tinggi' ? 'color:#c0392b;' : 'color:#10b981;'}">${zoningInfo.rawanBencana}</strong>
          </div>

          <!-- PANDUAN WARNA ZONASI ATR/BPN (DRAWER ACCORDION) -->
          <details class="mt-3" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:7px 10px; font-size:11px;">
            <summary style="font-weight:700; color:var(--text-main); cursor:pointer; display:flex; align-items:center; justify-content:space-between;">
              <span style="display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-palette" style="color:var(--pastel-blue);"></i> <strong>Panduan Warna Zonasi ATR/BPN</strong>
              </span>
              <i class="fa-solid fa-chevron-down" style="font-size:10px; color:#94a3b8;"></i>
            </summary>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:8px; padding-top:8px; border-top:1px dashed #cbd5e1;">
              <div style="display:flex; align-items:center; gap:6px; font-size:10px;"><span style="width:11px; height:11px; border-radius:3px; background:#e91e63; display:inline-block; flex-shrink:0;"></span> Pariwisata</div>
              <div style="display:flex; align-items:center; gap:6px; font-size:10px;"><span style="width:11px; height:11px; border-radius:3px; background:#e67e22; display:inline-block; flex-shrink:0;"></span> Permukiman</div>
              <div style="display:flex; align-items:center; gap:6px; font-size:10px;"><span style="width:11px; height:11px; border-radius:3px; background:#27ae60; display:inline-block; flex-shrink:0;"></span> Pertanian</div>
              <div style="display:flex; align-items:center; gap:6px; font-size:10px;"><span style="width:11px; height:11px; border-radius:3px; background:#00bcd4; display:inline-block; flex-shrink:0;"></span> Perikanan</div>
              <div style="display:flex; align-items:center; gap:6px; font-size:10px;"><span style="width:11px; height:11px; border-radius:3px; background:#1b5e20; display:inline-block; flex-shrink:0;"></span> Konservasi</div>
              <div style="display:flex; align-items:center; gap:6px; font-size:10px;"><span style="width:11px; height:11px; border-radius:3px; background:#004d40; display:inline-block; flex-shrink:0;"></span> Mangrove</div>
              <div style="display:flex; align-items:center; gap:6px; font-size:10px;"><span style="width:11px; height:11px; border-radius:3px; background:#c0392b; display:inline-block; flex-shrink:0;"></span> Transportasi</div>
              <div style="display:flex; align-items:center; gap:6px; font-size:10px;"><span style="width:11px; height:11px; border-radius:3px; background:#00897b; display:inline-block; flex-shrink:0;"></span> Perlindungan Setempat</div>
              <div style="display:flex; align-items:center; gap:6px; font-size:10px;"><span style="width:11px; height:11px; border-radius:3px; background:#546e7a; display:inline-block; flex-shrink:0;"></span> Industri</div>
              <div style="display:flex; align-items:center; gap:6px; font-size:10px;"><span style="width:11px; height:11px; border-radius:3px; background:#0288d1; display:inline-block; flex-shrink:0;"></span> Badan Air</div>
            </div>
          </details>
        </div>
      </div>
      ` : ''}

      <!-- DIRECT GOOGLE MAPS & MULTI-PHOTO UPLOAD BUTTONS -->
      ${hasCoords ? `
      <div style="margin-bottom: 12px !important; display: block !important;">
        <a href="${gmapsUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-block" style="display: flex !important; width: 100% !important; background: #eafaf1 !important; color: #27ae60 !important; border: 1px solid #2ecc71 !important; font-weight: 700; padding: 12px 14px; border-radius: 10px; text-decoration: none;">
          <i class="fa-solid fa-map-location-dot" style="font-size: 14px; margin-right: 8px;"></i> Buka Koordinat di Google Maps (${asset.lat.toFixed(5)}, ${asset.lng.toFixed(5)})
        </a>
      </div>
      ` : ''}

      ${canEditOrUpload ? `
      <div style="margin-bottom: 12px !important; display: block !important;">
        <button class="btn btn-primary btn-block" style="display: flex !important; width: 100% !important; padding: 12px 14px; border-radius: 10px; box-shadow: 0 4px 14px rgba(74, 144, 226, 0.3);" onclick="App.openUploadPhotoModal('${asset.id}')">
          <i class="fa-solid fa-images" style="font-size: 14px; margin-right: 8px;"></i> Upload Multi-Foto Aset (Up to 5)
        </button>
      </div>
      ` : ''}

      ${isAdmin ? `
      <div style="margin-bottom: 24px !important; display: block !important;">
        <button class="btn btn-block" style="${asset.isPinned ? 'background: linear-gradient(135deg, #e74c3c, #c0392b); color: #ffffff; box-shadow: 0 4px 14px rgba(231, 76, 60, 0.35);' : 'background: #ffffff; color: #2c3e50; border: 1.5px solid #e74c3c;'} display: flex !important; width: 100% !important; font-weight: 700; padding: 12px 14px; border-radius: 10px; align-items: center; justify-content: center; font-size: 13px;" onclick="App.togglePinAsset('${asset.id}')" title="Toggle status prioritas pin idle">
          <i class="fa-solid fa-thumbtack" style="font-size: 14px; margin-right: 8px; ${asset.isPinned ? 'transform: rotate(-45deg);' : ''}"></i> ${asset.isPinned ? '📌 Prioritas Idle (Klik untuk Lepas Pin)' : '📌 Pin Aset Sebagai Prioritas Idle'}
        </button>
      </div>
      ` : ''}

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

      <!-- MULTI-LEVEL SPATIAL DISTANCES CARD (IF COORDS AVAILABLE) -->
      ${hasCoords && multiDist ? `
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
          <div class="d-flex justify-content-between align-items-center" style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px 14px; border-radius:10px;">
            <span style="line-height:1.5;"><i class="fa-solid fa-landmark text-secondary" style="margin-right:10px; margin-left:2px;"></i> <strong>Jarak ke Ibukota Kab. Terdekat (${multiDist.regencyCapital ? multiDist.regencyCapital.name : asset.kabupaten}):</strong></span>
            <span class="badge badge-pastel-purple" style="font-size:11px; padding:6px 12px; border-radius:12px; margin-left:8px; flex-shrink:0;">${multiDist.regencyCapital ? multiDist.regencyCapital.distanceKm + ' km' : '-'}</span>
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
            <div style="position:absolute; top:0; left:0; height:100%; width:${multiDist.nightLightScore}%; background:rgba(0,0,0,0.25); border-radius:20px; transition: width 0.8s ease;"></div>
            <div style="position:absolute; top:-3px; left:calc(${multiDist.nightLightScore}% - 9px); width:18px; height:24px; background:#1e293b; border-radius:4px; border:2px solid #ffffff; box-shadow:0 2px 8px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center;">
              <div style="width:4px; height:4px; background:#ffffff; border-radius:50%;"></div>
            </div>
          </div>
          <div style="display:flex; justify-content:space-between; margin-top:5px; font-size:9px; color:#94a3b8; font-weight:600;">
            <span>Rendah<br><em style="font-weight:400;">&lt;50</em></span>
            <span style="text-align:center;">Sedang<br><em style="font-weight:400;">50–70</em></span>
            <span style="text-align:center;">Tinggi<br><em style="font-weight:400;">70–85</em></span>
            <span style="text-align:right;">Sangat Tinggi<br><em style="font-weight:400;">&gt;85</em></span>
          </div>
        </div>

        <div style="background:rgba(255,255,255,0.8); border:1px solid rgba(243,156,18,0.3); border-radius:8px; padding:8px 12px; font-size:10.5px; color:#1e293b; line-height:1.6;">
          <strong>Klasifikasi:</strong> ${multiDist.nighttimeHub ? multiDist.nighttimeHub.tier : 'Sedang'} &bull; 
          Berdasarkan pendekatan <em>VIIRS Nighttime Light Index</em> (NASA/NOAA) yang digunakan sebagai proxy kepadatan aktivitas ekonomi malam. Skor ≥70 mengindikasikan zona komersial aktif yang berpotensi tinggi untuk pemanfaatan BMN.
        </div>
      </div>

      <div class="detail-section-card mb-4">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h4 class="section-title mb-0"><i class="fa-solid fa-bullseye text-primary" style="margin-right:6px;"></i> Proksimitas POI (Radius 500m)</h4>
          <span class="badge badge-pastel-blue">${catchmentData ? catchmentData.totalCount : 0} POI Ditemukan</span>
        </div>
        <!-- MINI POI CATEGORY STRIP -->
        <div style="display:flex; flex-wrap:wrap; gap:4px 8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:6px 10px; margin-bottom:8px; font-size:9.5px; color:#475569;">
          <span style="display:inline-flex; align-items:center; gap:4px;"><span style="width:8px; height:8px; border-radius:50%; background:#e67e22; display:inline-block;"></span> Pendidikan</span>
          <span style="display:inline-flex; align-items:center; gap:4px;"><span style="width:8px; height:8px; border-radius:50%; background:#3498db; display:inline-block;"></span> Keamanan</span>
          <span style="display:inline-flex; align-items:center; gap:4px;"><span style="width:8px; height:8px; border-radius:50%; background:#9b59b6; display:inline-block;"></span> Instansi</span>
          <span style="display:inline-flex; align-items:center; gap:4px;"><span style="width:8px; height:8px; border-radius:50%; background:#e74c3c; display:inline-block;"></span> Kesehatan</span>
          <span style="display:inline-flex; align-items:center; gap:4px;"><span style="width:8px; height:8px; border-radius:50%; background:#f1c40f; display:inline-block;"></span> Komersial</span>
          <span style="display:inline-flex; align-items:center; gap:4px;"><span style="width:8px; height:8px; border-radius:50%; background:#1abc9c; display:inline-block;"></span> Transportasi</span>
        </div>
        <div class="poi-list-container">
          ${catchmentPoiHtml || `<p class="text-muted text-center p-3" style="font-size:11px; background:#f8fafc; border-radius:8px;"><i class="fa-solid fa-info-circle"></i> Tidak ada POI utama dalam radius 500m.</p>`}
        </div>
      </div>
      ` : ''}

      <div class="detail-section-card recommendation-card mb-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="badge ${recommendation.type ? recommendation.type.badgeClass : 'badge-pastel-blue'}"><i class="fa-solid fa-user-check"></i> REKOMENDASI TIM</span>
        </div>
        <h4 class="rec-title">${recommendation.officialTitle || 'Optimalisasi & Penelitian BMN'}</h4>
        
        <div class="mt-2 pt-2 border-top" style="border-top:1px dashed rgba(243, 156, 18, 0.3) !important;">
          <small style="font-size:11px; font-weight:700; color:var(--text-muted); display:block;" class="mb-1">
            <i class="fa-solid fa-shield-halved" style="color:var(--pastel-blue); margin-right:4px;"></i> Rekomendasi Sistem (Empirical Rule Engine):
          </small>
          <p style="font-size:11.5px; color:var(--text-main); font-weight:600; background:rgba(255,255,255,0.75); padding:6px 10px; border-radius:6px;">
            ${recommendation.systemSuggestion || 'Lakukan penelitian status hukum dan fisik BMN.'}
          </p>
        </div>

        <ul class="rec-rationale mt-2">
          ${recommendation.rationale ? recommendation.rationale.map(r => `<li><i class="fa-solid fa-circle-check"></i> ${r}</li>`).join('') : ''}
        </ul>

        <div class="mt-2 pt-2 border-top" style="border-top:1px dashed rgba(243, 156, 18, 0.3) !important;">
          <label style="font-size:10.5px; font-weight:700; color:var(--pastel-orange); text-transform:uppercase; margin-bottom:4px; display:block;">
            <i class="fa-solid fa-pen-to-square"></i> Rekomendasi Khusus Pengguna / Tim:
          </label>
          <div style="font-size:12px; color:var(--text-main); font-style:italic;">
            "${asset.rekomendasiUser || 'Belum ada rekomendasi khusus yang ditambahkan.'}"
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:12px; margin-top:16px; padding-top:14px; border-top:1px dashed rgba(243, 156, 18, 0.4) !important;">
          <button class="btn btn-primary" style="background:linear-gradient(135deg, #4a90e2, #2575fc); color:#ffffff; border:none; font-weight:700; padding:11px 16px; width:100%; box-shadow: 0 4px 14px rgba(74, 144, 226, 0.28); border-radius:10px; cursor:pointer; font-size:12px;" onclick="App.openLaporanModal('${asset.id}')">
            <i class="fa-solid fa-file-contract" style="font-size:14px; margin-right:6px;"></i> Buat Laporan Penelitian (PMK 120/2024)
          </button>
          ${isAdmin ? `
            <button class="btn btn-warning" style="background:linear-gradient(135deg, #f39c12, #d35400); color:#ffffff; border:none; font-weight:700; padding:11px 16px; width:100%; box-shadow: 0 4px 14px rgba(243, 156, 18, 0.28); border-radius:10px; cursor:pointer; font-size:12px;" onclick="App.openEditAssetModal('${asset.id}')">
              <i class="fa-solid fa-pen-to-square" style="font-size:14px; margin-right:6px;"></i> Edit Data & Rekomendasi Aset (Admin KPKNL)
            </button>
          ` : ''}
        </div>
      </div>

      <!-- GENEROUS BOTTOM WHITESPACE SPACER FOR SMOOTH SCROLL -->
      <div style="height: 80px; width: 100%;" aria-hidden="true"></div>
    `;
  },

  togglePolaRuangMode() {
    if (typeof MapEngine === 'undefined') return;
    const isEnabled = MapEngine.togglePolaRuang();
    const btn = document.getElementById('btn-toggle-pola-ruang');
    if (btn) {
      btn.classList.toggle('active', isEnabled);
      btn.innerHTML = isEnabled 
        ? '<i class="fa-solid fa-map-location-dot text-primary"></i> Pola Ruang: ON' 
        : '<i class="fa-regular fa-map text-muted"></i> Pola Ruang: OFF';
    }
    this.showToast(isEnabled ? '🗺️ Layer Pola Ruang Catchment diaktifkan' : '🗺️ Layer Pola Ruang dinonaktifkan', 'info');
  },

  async togglePinAsset(assetId) {
    if (typeof DataEngine === 'undefined') return;

    const isPinnedNow = DataEngine.togglePinAsset(assetId);
    const asset = this.getAsset(assetId);

    if (isPinnedNow) {
      this.showToast(`📌 ${asset ? asset.namaBarang : 'Aset'} ditandai sebagai Prioritas Idle!`, 'success');
    } else {
      this.showToast(`📌 Tanda pin aset dilepas.`, 'info');
    }

    // Sync pin state to Google Sheet via Apps Script Web App
    if (CONFIG.APPS_SCRIPT.WEB_APP_URL && asset) {
      fetch(CONFIG.APPS_SCRIPT.WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'updateAsset',
          assetId: asset.id,
          kodeSatker: asset.kodeSatker,
          kodeBarang: asset.kodeBarang,
          nup: asset.nup,
          isPinned: isPinnedNow
        })
      }).catch(err => console.log('Apps Script pin sync error:', err));
    }

    // Re-render UI views immediately
    this.renderClusterAccordion();
    this.renderAllAssetsList();
    if (this.selectedAsset && this.selectedAsset.id === assetId) {
      const refreshed = this.getAsset(assetId);
      if (refreshed) {
        this.renderDetailPanel(
          refreshed,
          SpatialEngine.getCatchmentAnalysis(refreshed.lat, refreshed.lng),
          RecommendationEngine.getRecommendation(refreshed)
        );
      }
    }
  },

  openUploadPhotoModal(assetId) {
    const asset = this.getAsset(assetId) || this.activeAssets.find(a => a.id === assetId);
    if (!asset) return;

    document.getElementById('upload-asset-id').value = asset.id;
    document.getElementById('upload-asset-title').textContent = asset.namaBarang;
    document.getElementById('photo-preview-grid').innerHTML = '';
    document.getElementById('compression-status-badge').style.display = 'none';
    this.compressedPhotoBlobs = [];

    const modal = document.getElementById('upload-photo-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('show');
    }
  },

  closeUploadPhotoModal() {
    const modal = document.getElementById('upload-photo-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('show');
    }
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

  getAsset(assetId) {
    return (DataEngine.activeAssets && DataEngine.activeAssets.find(a => a.id === assetId)) ||
           (DataEngine.pendingAssets && DataEngine.pendingAssets.find(a => a.id === assetId)) ||
           (this.activeAssets && this.activeAssets.find(a => a.id === assetId));
  },

  async handleMultiPhotoSubmit(event) {
    if (event) event.preventDefault();
    const assetId = document.getElementById('upload-asset-id').value;
    const asset = this.getAsset(assetId);

    if (asset && this.compressedPhotoBlobs.length > 0) {
      // 1. Show instant compressed preview in UI
      asset.fotoList = [...this.compressedPhotoBlobs, ...asset.fotoList];
      this.currentPhotoIndex = 0;
      this.savePhotosToLocalStorage();
      this.closeUploadPhotoModal();
      this.selectAsset(assetId);
      this.showToast(`Mengompres & mengunggah ${this.compressedPhotoBlobs.length} foto ke Google Drive...`, 'info');

      // 2. Upload to Google Drive via Apps Script Web App
      if (CONFIG.APPS_SCRIPT.WEB_APP_URL) {
        try {
          const resp = await fetch(CONFIG.APPS_SCRIPT.WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({
              action: 'uploadBase64Photos',
              assetId: assetId,
              photos: this.compressedPhotoBlobs
            })
          });
          const json = await resp.json();
          if (json && json.status === 'success' && json.urls && json.urls.length > 0) {
            // Replace temporary base64 with permanent Google Drive URLs!
            const nonBase64 = asset.fotoList.filter(url => !url.startsWith('data:image'));
            asset.fotoList = [...json.urls, ...nonBase64];
            this.savePhotosToLocalStorage();
            this.updateCarouselDisplay(asset);
            this.showToast(`✅ Berhasil menyimpan ${json.urls.length} foto permanen di Google Drive!`);
          }
        } catch(err) {
          console.warn('Apps Script Drive photo upload error:', err);
        }
      }
    }
  },

  prevPhoto(assetId) {
    const asset = this.getAsset(assetId);
    if (!asset || !asset.fotoList || asset.fotoList.length <= 1) return;
    this.currentPhotoIndex = (this.currentPhotoIndex || 0) - 1;
    if (this.currentPhotoIndex < 0) this.currentPhotoIndex = asset.fotoList.length - 1;
    this.updateCarouselDisplay(asset);
  },

  nextPhoto(assetId) {
    const asset = this.getAsset(assetId);
    if (!asset || !asset.fotoList || asset.fotoList.length <= 1) return;
    this.currentPhotoIndex = (this.currentPhotoIndex || 0) + 1;
    if (this.currentPhotoIndex >= asset.fotoList.length) this.currentPhotoIndex = 0;
    this.updateCarouselDisplay(asset);
  },

  formatPhotoUrl(url) {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
      let fileId = '';
      const matchId = url.match(/[?&]id=([^&]+)/);
      if (matchId) {
        fileId = matchId[1];
      } else {
        const matchPath = url.match(/\/d\/([^/]+)/);
        if (matchPath) fileId = matchPath[1];
      }
      if (fileId) {
        return `https://lh3.googleusercontent.com/d/${fileId}`;
      }
    }
    return url;
  },

  updateCarouselDisplay(asset) {
    const box = document.getElementById('photo-carousel-box');
    const counter = document.getElementById('photo-carousel-counter');
    if (!box || !asset || !asset.fotoList || asset.fotoList.length === 0) return;
    if (this.currentPhotoIndex >= asset.fotoList.length) this.currentPhotoIndex = 0;
    const rawUrl = asset.fotoList[this.currentPhotoIndex] || asset.fotoList[0];
    const url = this.formatPhotoUrl(rawUrl);
    box.style.backgroundImage = `url('${url}')`;
    if (counter) {
      counter.textContent = `${this.currentPhotoIndex + 1} / ${asset.fotoList.length}`;
    }
  },

  deletePhoto(assetId) {
    const asset = this.getAsset(assetId);
    if (!asset || !asset.fotoList || asset.fotoList.length <= 1) {
      this.showToast('Minimal harus ada 1 foto aset.', 'warning');
      return;
    }

    if (confirm('Apakah Anda yakin ingin menghapus foto ini?')) {
      const idx = this.currentPhotoIndex || 0;

      // Splice the specific photo at current index
      asset.fotoList.splice(idx, 1);

      // Sync fotoList back to DataEngine (same object reference, but ensure both in sync)
      const deAsset = (DataEngine.activeAssets && DataEngine.activeAssets.find(a => a.id === assetId))
                   || (DataEngine.pendingAssets && DataEngine.pendingAssets.find(a => a.id === assetId));
      if (deAsset) deAsset.fotoList = asset.fotoList;

      // Also sync to App.activeAssets
      const appAsset = this.activeAssets && this.activeAssets.find(a => a.id === assetId);
      if (appAsset) appAsset.fotoList = asset.fotoList;

      // Reset counter BEFORE re-render
      this.currentPhotoIndex = 0;

      this.savePhotosToLocalStorage();
      this.showToast('Foto berhasil dihapus.');
      this.renderAssetDetail(asset); // Re-render detail without full selectAsset to preserve state
    }
  },

  savePhotosToLocalStorage() {
    // Merge photos from all sources: App.activeAssets + DataEngine assets
    const allAssets = [
      ...(this.activeAssets || []),
      ...(DataEngine.activeAssets || []),
      ...(DataEngine.pendingAssets || [])
    ];
    const photoMap = {};
    allAssets.forEach(a => {
      if (a && a.id && a.fotoList && a.fotoList.length > 0) {
        // Only keep non-placeholder Unsplash photos and real URLs/base64
        // Keep all photos (placeholder + real) - filtering can cause loss
        photoMap[a.id] = a.fotoList;
      }
    });
    try {
      localStorage.setItem('bmn_custom_photos', JSON.stringify(photoMap));
    } catch(e) {
      console.warn('LocalStorage save error:', e);
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
    const session = typeof getSession === 'function' ? getSession() : null;
    if (session) {
      this.currentUser = session;
      this.updateUserUI();
    } else {
      const savedUser = localStorage.getItem('bmn_idle_user');
      if (savedUser) {
        try {
          this.currentUser = JSON.parse(savedUser);
          this.updateUserUI();
        } catch (e) {}
      }
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
    if (typeof clearSession === 'function') {
      clearSession();
    } else {
      localStorage.removeItem('bmn_idle_user');
    }
    this.updateUserUI();
    this.showToast('Berhasil logout dari sesi. Mengalihkan ke halaman login...');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 400);
  },

  handleExitToLanding(event) {
    if (event) event.preventDefault();
    this.currentUser = null;
    if (typeof clearSession === 'function') {
      clearSession();
    } else {
      localStorage.removeItem('bmn_idle_user');
    }
    this.updateUserUI();
    window.location.href = 'https://gvzhndra.github.io/landing_page_geospasial_dps/';
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

  toggleMobileBurgerMenu() {
    const dropdown = document.getElementById('mobile-burger-dropdown');
    if (dropdown) {
      const isVisible = dropdown.style.display === 'flex';
      dropdown.style.display = isVisible ? 'none' : 'flex';
    }
  },

  switchMobileTab(targetTab) {
    this.mobileTab = targetTab;
    const mnavStats = document.getElementById('mnav-stats');
    const mnavMap = document.getElementById('mnav-map');
    const mnavList = document.getElementById('mnav-list');
    const mnavDetail = document.getElementById('mnav-detail');

    const statsBar = document.getElementById('executive-stats-bar');
    const leftPanel = document.getElementById('left-tab-panel');
    const detailDrawer = document.getElementById('detail-drawer');

    if (mnavStats) mnavStats.classList.toggle('active', targetTab === 'stats');
    if (mnavMap) mnavMap.classList.toggle('active', targetTab === 'map');
    if (mnavList) mnavList.classList.toggle('active', targetTab === 'list');
    if (mnavDetail) mnavDetail.classList.toggle('active', targetTab === 'detail');

    if (statsBar) statsBar.classList.toggle('mobile-active', targetTab === 'stats');
    if (leftPanel) leftPanel.classList.toggle('mobile-active', targetTab === 'list');
    if (detailDrawer) {
      detailDrawer.classList.toggle('mobile-active', targetTab === 'detail');
      detailDrawer.classList.toggle('open', targetTab === 'detail');
    }

    if (targetTab === 'map' && typeof MapEngine !== 'undefined' && MapEngine.map) {
      setTimeout(() => { MapEngine.map.invalidateSize(); }, 300);
    }
  },

  openPhotoLightbox(assetId) {
    const asset = this.getAsset(assetId);
    if (!asset || !asset.fotoList || asset.fotoList.length === 0) return;
    this.lightboxAsset = asset;
    this.lightboxIndex = this.currentPhotoIndex || 0;
    this.updateLightboxContent();

    const modal = document.getElementById('photo-lightbox-modal');
    if (modal) modal.style.display = 'flex';
  },

  updateLightboxContent() {
    if (!this.lightboxAsset || !this.lightboxAsset.fotoList) return;
    const total = this.lightboxAsset.fotoList.length;
    if (this.lightboxIndex < 0) this.lightboxIndex = total - 1;
    if (this.lightboxIndex >= total) this.lightboxIndex = 0;

    const rawUrl = this.lightboxAsset.fotoList[this.lightboxIndex];
    const activeUrl = this.formatPhotoUrl(rawUrl);
    const imgEl = document.getElementById('lightbox-img');
    const captionEl = document.getElementById('lightbox-caption');

    if (imgEl) imgEl.src = activeUrl;
    if (captionEl) {
      captionEl.textContent = `${this.lightboxAsset.namaBarang || 'Aset BMN'} (${this.lightboxIndex + 1} dari ${total})`;
    }
  },

  navigateLightbox(dir) {
    this.lightboxIndex = (this.lightboxIndex || 0) + dir;
    this.updateLightboxContent();
  },

  closePhotoLightbox(event) {
    if (event && event.target.id !== 'photo-lightbox-modal' && !event.target.classList.contains('lightbox-close-btn') && !event.target.closest('.lightbox-close-btn')) return;
    const modal = document.getElementById('photo-lightbox-modal');
    if (modal) modal.style.display = 'none';
  },

  openLaporanModal(assetId) {
    const asset = this.getAsset(assetId) || (this.selectedAsset && this.selectedAsset.id === assetId ? this.selectedAsset : null);
    if (!asset) {
      this.showToast('Gagal memuat data aset untuk laporan.', 'warning');
      return;
    }
    this.laporanAssetId = assetId;

    if (typeof LaporanEngine !== 'undefined') {
      LaporanEngine.populateSTDropdown();
    }

    const presets = typeof LaporanEngine !== 'undefined' ? LaporanEngine.loadTeamPresets() : {};

    const idEl = document.getElementById('laporan-asset-id');
    const stEl = document.getElementById('lap-no-st');
    const tglStEl = document.getElementById('lap-tgl-st');
    const knEl = document.getElementById('lap-ketua-nama');
    const knipEl = document.getElementById('lap-ketua-nip');
    const anEl = document.getElementById('lap-anggota-nama');
    const anipEl = document.getElementById('lap-anggota-nip');

    if (idEl) idEl.value = assetId;
    if (stEl) stEl.value = presets.noSuratTugas || 'ST-101/KPKNL.1401/2026';
    if (tglStEl) tglStEl.value = presets.tglSuratTugas || '15 Januari 2026';
    if (knEl) knEl.value = presets.ketuaNama || 'I Putu Harjaya';
    if (knipEl) knipEl.value = presets.ketuaNip || '19850101 201012 1 001';
    if (anEl) anEl.value = presets.anggota1Nama || 'Gede Shendra';
    if (anipEl) anipEl.value = presets.anggota1Nip || '19900202 201402 1 002';

    const modal = document.getElementById('laporan-pmk-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('show');
    }
  },

  handleSelectPresetST(stId) {
    if (!stId || typeof LaporanEngine === 'undefined') return;
    const found = LaporanEngine.masterTimSTList.find(s => s.id_st === stId || s.no_st === stId);
    if (!found) return;

    const stEl = document.getElementById('lap-no-st');
    const tglStEl = document.getElementById('lap-tgl-st');
    const knEl = document.getElementById('lap-ketua-nama');
    const knipEl = document.getElementById('lap-ketua-nip');
    const anEl = document.getElementById('lap-anggota-nama');
    const anipEl = document.getElementById('lap-anggota-nip');

    if (stEl) stEl.value = found.no_st || '';
    if (tglStEl) tglStEl.value = found.tgl_st || '';
    if (knEl) knEl.value = found.ketua_nama || '';
    if (knipEl) knipEl.value = found.ketua_nip || '';
    if (anEl) anEl.value = found.anggota1_nama || '';
    if (anipEl) anipEl.value = found.anggota1_nip || '';

    this.showToast(`✅ Menggunakan data Surat Tugas: ${found.no_st}`, 'info');
  },

  openManageTimSTModal() {
    if (typeof LaporanEngine !== 'undefined') {
      LaporanEngine.renderTimSTTable();
    }
    const modal = document.getElementById('manage-tim-st-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('show');
    }
  },

  closeManageTimSTModal() {
    const modal = document.getElementById('manage-tim-st-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('show');
    }
  },

  toggleAddSTForm(show) {
    const container = document.getElementById('form-st-container');
    if (!container) return;
    container.style.display = show ? 'block' : 'none';
    if (!show) {
      document.getElementById('form-manage-tim-st')?.reset();
      document.getElementById('st-form-id').value = '';
      const linkDisp = document.getElementById('st-pdf-link-display');
      if (linkDisp) linkDisp.innerHTML = '';
    }
  },

  editTimSTRow(stId) {
    if (typeof LaporanEngine === 'undefined') return;
    const found = LaporanEngine.masterTimSTList.find(s => s.id_st === stId || s.no_st === stId);
    if (!found) return;

    this.toggleAddSTForm(true);
    document.getElementById('st-form-id').value = found.id_st || '';
    document.getElementById('st-input-no').value = found.no_st || '';
    document.getElementById('st-input-tgl').value = found.tgl_st || '';
    document.getElementById('st-input-sk').value = found.no_sk_tim || '';
    document.getElementById('st-input-wilayah').value = found.wilayah_satker || '';
    document.getElementById('st-input-ketua-nama').value = found.ketua_nama || '';
    document.getElementById('st-input-ketua-nip').value = found.ketua_nip || '';
    document.getElementById('st-input-ketua-jabatan').value = found.ketua_jabatan || '';
    document.getElementById('st-input-anggota1-nama').value = found.anggota1_nama || '';
    document.getElementById('st-input-anggota1-nip').value = found.anggota1_nip || '';
    document.getElementById('st-input-anggota1-jabatan').value = found.anggota1_jabatan || '';
    document.getElementById('st-input-anggota2-nama').value = found.anggota2_nama || '';
    document.getElementById('st-input-anggota2-nip').value = found.anggota2_nip || '';

    const linkDisp = document.getElementById('st-pdf-link-display');
    if (linkDisp && found.pdf_st_url) {
      linkDisp.innerHTML = `Dokumen saat ini: <a href="${found.pdf_st_url}" target="_blank">Lihat PDF ST</a>`;
    }
  },

  async handleSaveTimSTForm(event) {
    if (event) event.preventDefault();
    const btn = document.getElementById('btn-save-st');
    if (btn) btn.disabled = true;

    const id = document.getElementById('st-form-id').value.trim() || `ST-${Date.now()}`;
    const no_st = document.getElementById('st-input-no').value.trim();
    const tgl_st = document.getElementById('st-input-tgl').value.trim();
    const no_sk_tim = document.getElementById('st-input-sk').value.trim();
    const wilayah_satker = document.getElementById('st-input-wilayah').value.trim();
    const ketua_nama = document.getElementById('st-input-ketua-nama').value.trim();
    const ketua_nip = document.getElementById('st-input-ketua-nip').value.trim();
    const ketua_jabatan = document.getElementById('st-input-ketua-jabatan').value.trim();
    const anggota1_nama = document.getElementById('st-input-anggota1-nama').value.trim();
    const anggota1_nip = document.getElementById('st-input-anggota1-nip').value.trim();
    const anggota1_jabatan = document.getElementById('st-input-anggota1-jabatan').value.trim();
    const anggota2_nama = document.getElementById('st-input-anggota2-nama').value.trim();
    const anggota2_nip = document.getElementById('st-input-anggota2-nip').value.trim();

    let pdf_st_url = '';
    const fileInput = document.getElementById('st-input-pdf-file');
    if (fileInput && fileInput.files && fileInput.files[0]) {
      this.showToast('📤 Mengunggah berkas PDF ST ke Google Drive...', 'info');
      try {
        const file = fileInput.files[0];
        const reader = new FileReader();
        const base64Promise = new Promise((resolve) => {
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
        const base64Data = await base64Promise;
        const uploadedUrl = await LaporanEngine.uploadDocumentPDFToDrive(`ST_${no_st.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`, base64Data);
        if (uploadedUrl) {
          pdf_st_url = uploadedUrl;
        }
      } catch (e) {
        console.warn('Upload PDF ST error:', e);
      }
    }

    const payload = {
      id_st: id,
      no_st: no_st,
      tgl_st: tgl_st,
      no_sk_tim: no_sk_tim,
      wilayah_satker: wilayah_satker,
      ketua_nama: ketua_nama,
      ketua_nip: ketua_nip,
      ketua_jabatan: ketua_jabatan,
      anggota1_nama: anggota1_nama,
      anggota1_nip: anggota1_nip,
      anggota1_jabatan: anggota1_jabatan,
      anggota2_nama: anggota2_nama,
      anggota2_nip: anggota2_nip,
      pdf_st_url: pdf_st_url,
      status_aktif: 'AKTIF'
    };

    // Update local state
    const existingIdx = LaporanEngine.masterTimSTList.findIndex(s => s.id_st === id || s.no_st === no_st);
    if (existingIdx >= 0) {
      if (!pdf_st_url && LaporanEngine.masterTimSTList[existingIdx].pdf_st_url) {
        payload.pdf_st_url = LaporanEngine.masterTimSTList[existingIdx].pdf_st_url;
      }
      LaporanEngine.masterTimSTList[existingIdx] = payload;
    } else {
      LaporanEngine.masterTimSTList.push(payload);
    }

    LaporanEngine.saveMasterTimSTToLocal();
    LaporanEngine.renderTimSTTable();
    LaporanEngine.populateSTDropdown();

    // Sync to Google Sheets
    LaporanEngine.saveTimSTToSheet(payload);

    this.toggleAddSTForm(false);
    if (btn) btn.disabled = false;
    this.showToast(`✅ Data Surat Tugas ${no_st} berhasil disimpan!`, 'success');
  },

  closeLaporanModal() {
    const modal = document.getElementById('laporan-pmk-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('show');
    }
  },

  getLaporanFormValues() {
    return {
      noSuratTugas: document.getElementById('lap-no-st')?.value || '',
      tglSuratTugas: document.getElementById('lap-tgl-st')?.value || '',
      ketuaNama: document.getElementById('lap-ketua-nama')?.value || '',
      ketuaNip: document.getElementById('lap-ketua-nip')?.value || '',
      anggota1Nama: document.getElementById('lap-anggota-nama')?.value || '',
      anggota1Nip: document.getElementById('lap-anggota-nip')?.value || ''
    };
  },

  handleGenerateLaporan(event) {
    if (event) event.preventDefault();
    const asset = this.getAsset(this.laporanAssetId);
    if (!asset) return;
    const formVals = this.getLaporanFormValues();

    if (typeof LaporanEngine !== 'undefined') {
      LaporanEngine.generateDocx(asset, formVals);
      this.showToast('📄 Menghasilkan file Word Laporan PMK 120/2024...', 'info');
      this.closeLaporanModal();
    }
  },

  triggerPrintLaporan() {
    const asset = this.getAsset(this.laporanAssetId);
    if (!asset) return;
    const formVals = this.getLaporanFormValues();

    if (typeof LaporanEngine !== 'undefined') {
      LaporanEngine.generatePrintView(asset, formVals);
      this.closeLaporanModal();
    }
  },

  openEditAssetModal(assetId) {
    const asset = this.getAsset(assetId) || (this.selectedAsset && this.selectedAsset.id === assetId ? this.selectedAsset : null);
    if (!asset) {
      this.showToast('Gagal memuat data aset untuk diedit.', 'warning');
      return;
    }

    const idInput = document.getElementById('edit-asset-id');
    const namaInput = document.getElementById('edit-nama-barang');
    const satkerInput = document.getElementById('edit-satker');
    const alamatInput = document.getElementById('edit-alamat');
    const luasInput = document.getElementById('edit-luas');
    const nilaiInput = document.getElementById('edit-nilai-buku');
    const coordInput = document.getElementById('edit-koordinat');
    const kondisiInput = document.getElementById('edit-kondisi');
    const recSelect = document.getElementById('edit-rekomendasi');
    const catatanInput = document.getElementById('edit-catatan-tim');

    if (idInput) idInput.value = asset.id;
    if (namaInput) namaInput.value = asset.namaBarang || asset.uraian_bmn || '';
    if (satkerInput) satkerInput.value = asset.namaSatker || asset.satker || '';
    if (alamatInput) alamatInput.value = asset.alamat || '';
    if (luasInput) luasInput.value = asset.luas || asset.luas_m2 || 0;
    if (nilaiInput) nilaiInput.value = asset.nilaiBuku || asset.nilai_buku || 0;
    if (coordInput) coordInput.value = (asset.lat && asset.lng) ? `${asset.lat}, ${asset.lng}` : (asset.koordinat || '');
    if (kondisiInput) kondisiInput.value = asset.kondisi || asset.hasilJawaban || '';
    if (catatanInput) catatanInput.value = asset.catatanTim || asset.rekomendasiUser || '';

    if (recSelect) {
      recSelect.value = asset.rekomendasi || asset.rekomendasiUser || 'Sewa Komersial / Kerja Sama Pemanfaatan (KSP)';
    }

    const modal = document.getElementById('edit-asset-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('show');
    }
  },

  closeEditAssetModal() {
    const modal = document.getElementById('edit-asset-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('show');
    }
  },

  handleSaveEditAsset(event) {
    if (event) event.preventDefault();
    const assetId = document.getElementById('edit-asset-id').value;
    const asset = this.getAsset(assetId);

    if (!asset) {
      this.showToast('Gagal menemukan data aset yang diedit.', 'error');
      return;
    }

    const namaVal = document.getElementById('edit-nama-barang').value.trim();
    const alamatVal = document.getElementById('edit-alamat').value.trim();
    const luasVal = parseFloat(document.getElementById('edit-luas').value) || 0;
    const nilaiVal = parseFloat(document.getElementById('edit-nilai-buku').value) || 0;
    const coordStr = document.getElementById('edit-koordinat').value.trim();
    const kondisiVal = document.getElementById('edit-kondisi').value.trim();
    const recVal = document.getElementById('edit-rekomendasi').value;
    const catatanVal = document.getElementById('edit-catatan-tim').value.trim();

    asset.namaBarang = namaVal || asset.namaBarang;
    asset.uraian_bmn = asset.namaBarang;
    asset.alamat = alamatVal || asset.alamat;
    asset.luas = luasVal;
    asset.luas_m2 = luasVal;
    asset.nilaiBuku = nilaiVal;
    asset.nilai_buku = nilaiVal;
    asset.kondisi = kondisiVal || asset.kondisi;
    asset.rekomendasi = recVal;
    asset.rekomendasiUser = recVal;
    asset.catatanTim = catatanVal;

    if (coordStr && coordStr.includes(',')) {
      const parts = coordStr.split(',').map(s => parseFloat(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        asset.lat = parts[0];
        asset.lng = parts[1];
        asset.koordinat = `${parts[0]}, ${parts[1]}`;
        asset.hasCoordinates = true;
      }
    }

    // Save to DataEngine instance
    const deAsset = DataEngine.activeAssets.find(a => a.id === asset.id) || DataEngine.pendingAssets.find(a => a.id === asset.id);
    if (deAsset) {
      Object.assign(deAsset, asset);
    }

    // 1. Save edit to localStorage for persistent session survival
    try {
      const storedEdits = JSON.parse(localStorage.getItem('bmn_custom_edits') || '{}');
      storedEdits[asset.id] = {
        namaBarang: asset.namaBarang,
        alamat: asset.alamat,
        luas: asset.luas,
        nilaiBuku: asset.nilaiBuku,
        koordinat: asset.koordinat,
        kondisi: asset.kondisi,
        rekomendasi: asset.rekomendasi,
        rekomendasiUser: asset.rekomendasiUser,
        catatanTim: asset.catatanTim
      };
      localStorage.setItem('bmn_custom_edits', JSON.stringify(storedEdits));
    } catch(e) {
      console.warn('LocalStorage save edit error:', e);
    }

    // 2. Post edit to Google Apps Script Web App if URL is present
    if (CONFIG.APPS_SCRIPT.WEB_APP_URL) {
      fetch(CONFIG.APPS_SCRIPT.WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'updateAsset',
          assetId: asset.id,
          kodeSatker: asset.kodeSatker,
          kodeBarang: asset.kodeBarang,
          nup: asset.nup,
          namaBarang: asset.namaBarang,
          alamat: asset.alamat,
          luas: asset.luas,
          nilaiBuku: asset.nilaiBuku,
          koordinat: asset.koordinat,
          kondisi: asset.kondisi,
          rekomendasiUser: asset.rekomendasiUser,
          catatanTim: asset.catatanTim
        })
      }).catch(err => console.log('Apps Script update error:', err));
    }

    // 3. Refresh UI components
    this.renderClusterAccordion();
    this.renderAllAssetsList();
    this.selectAsset(asset.id);
    this.updateKPIStats();

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

  enrichAssetLocationsWithPolaRuang() {
    if (typeof PolaRuangEngine === 'undefined' || !PolaRuangEngine.isLoaded) return;

    let updatedCount = 0;
    this.activeAssets.forEach(asset => {
      if (asset.hasCoordinates && typeof asset.lat === 'number' && typeof asset.lng === 'number') {
        const zoning = PolaRuangEngine.getZoningForPoint(asset.lat, asset.lng);
        if (zoning && zoning.kabupaten && zoning.kabupaten !== 'Provinsi Bali') {
          if (asset.kabupaten !== zoning.kabupaten) {
            asset.kabupaten = zoning.kabupaten;
            updatedCount++;
          }
        }
      }
    });

    if (updatedCount > 0) {
      console.log(`[PolaRuangEngine] Automatically synchronized and perfected ${updatedCount} asset regency boundaries.`);
      this.populateKabupatenOptions();
      this.renderClusterAccordion();
      this.renderAllAssetsList();
    }
  },

  async syncLiveDatasetManual() {
    const btn = document.getElementById('btn-sync-sheet');
    const icon = btn ? btn.querySelector('i') : null;
    const label = btn ? btn.querySelector('span') : null;
    const mobileBtn = document.getElementById('btn-mobile-sync');
    const mobileIcon = mobileBtn ? mobileBtn.querySelector('i') : null;

    if (btn) {
      btn.disabled = true;
      if (icon) icon.className = 'fa-solid fa-arrows-rotate fa-spin text-primary';
      if (label) label.textContent = 'Menyinkronkan...';
    }
    if (mobileBtn) {
      mobileBtn.disabled = true;
      if (mobileIcon) mobileIcon.className = 'fa-solid fa-arrows-rotate fa-spin text-primary';
    }

    this.showToast('🔄 Menghubungkan ke Google Sheets...', 'info');

    try {
      const synced = await DataEngine.syncLiveDatasetFromSheet();
      if (synced) {
        this.activeAssets = DataEngine.activeAssets || [];
        this.populateKabupatenOptions();
        this.updateKPIStats();
        this.renderClusterAccordion();
        this.renderAllAssetsList();

        const mapped = this.activeAssets.filter(a => a.hasCoordinates);
        MapEngine.renderBMNMarkers(mapped, (asset) => this.selectAsset(asset.id, false));

        this.showToast(`✅ Data Google Sheets tersinkron! (${this.activeAssets.length} unit)`, 'success');
      } else {
        this.showToast('⚠️ Gagal sinkron otomatis. Menggunakan data cache.', 'warning');
      }
    } catch (err) {
      console.warn('Manual sync error:', err);
      this.showToast('⚠️ Gagal menghubungi server Google Sheets.', 'warning');
    } finally {
      if (btn) {
        btn.disabled = false;
        if (icon) icon.className = 'fa-solid fa-arrows-rotate text-success';
        if (label) label.textContent = 'Sync Sheets';
      }
      if (mobileBtn) {
        mobileBtn.disabled = false;
        if (mobileIcon) mobileIcon.className = 'fa-solid fa-arrows-rotate text-primary';
      }
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
