/**
 * Presentation "Spotlight / Tour Mode" Controller
 * Auto-navigates through BMN Idle assets with camera animations
 * for Friday's Executive Presentation to KPKNL Pimpinan.
 */

const PresentationEngine = {
  isPlaying: false,
  currentIndex: 0,
  tourList: [],
  timerId: null,
  slideDurationMs: 8000, // 8 seconds per BMN slide

  /**
   * Start Presentation Mode
   * @param {Array} assetList 
   */
  startPresentation(assetList) {
    if (!assetList || assetList.length === 0) return;

    // Filter spotlight assets or use all
    this.tourList = assetList.filter(a => a.isSpotlight);
    if (this.tourList.length === 0) {
      this.tourList = assetList;
    }

    this.currentIndex = 0;
    this.isPlaying = true;

    // Render presentation banner overlay
    this._renderPresentationBar();
    this.goToSlide(0);
  },

  /**
   * Navigate to specific slide index
   * @param {number} index 
   */
  goToSlide(index) {
    if (index < 0 || index >= this.tourList.length) return;

    this.currentIndex = index;
    const asset = this.tourList[index];

    // Select asset in main App controller
    if (typeof App !== 'undefined' && App.selectAsset) {
      App.selectAsset(asset.id, false); // Don't close sidebar
    }

    // Update presentation bar UI
    this._updatePresentationBarUI();

    // Reset timer if playing
    if (this.isPlaying) {
      this._resetTimer();
    }
  },

  nextSlide() {
    let nextIdx = this.currentIndex + 1;
    if (nextIdx >= this.tourList.length) {
      nextIdx = 0; // Loop back to start
    }
    this.goToSlide(nextIdx);
  },

  prevSlide() {
    let prevIdx = this.currentIndex - 1;
    if (prevIdx < 0) {
      prevIdx = this.tourList.length - 1;
    }
    this.goToSlide(prevIdx);
  },

  togglePlayPause() {
    this.isPlaying = !this.isPlaying;
    const btn = document.getElementById('btn-presentation-play');
    if (btn) {
      btn.innerHTML = this.isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
    }

    if (this.isPlaying) {
      this._resetTimer();
    } else {
      this._clearTimer();
    }
  },

  stopPresentation() {
    this.isPlaying = false;
    this._clearTimer();
    const bar = document.getElementById('presentation-bar');
    if (bar) bar.remove();
    document.body.classList.remove('presentation-mode-active');
  },

  _resetTimer() {
    this._clearTimer();
    this.timerId = setTimeout(() => {
      if (this.isPlaying) {
        this.nextSlide();
      }
    }, this.slideDurationMs);
  },

  _clearTimer() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  },

  _renderPresentationBar() {
    let existingBar = document.getElementById('presentation-bar');
    if (existingBar) existingBar.remove();

    document.body.classList.add('presentation-mode-active');

    const barHtml = `
      <div id="presentation-bar" class="presentation-bar-container animated slideInDown">
        <div class="presentation-info">
          <span class="badge badge-gold"><i class="fa-solid fa-tv"></i> MODE PRESENTASI EKSKUTIF</span>
          <span class="presentation-counter" id="presentation-counter">Slide 1 dari ${this.tourList.length}</span>
        </div>
        
        <div class="presentation-title-preview" id="presentation-current-title">
          Loading BMN Asset...
        </div>

        <div class="presentation-controls">
          <button class="btn btn-icon btn-secondary" onclick="PresentationEngine.prevSlide()" title="Sebelumnya">
            <i class="fa-solid fa-backward-step"></i>
          </button>
          <button class="btn btn-icon btn-gold" id="btn-presentation-play" onclick="PresentationEngine.togglePlayPause()" title="Play/Pause">
            <i class="fa-solid fa-pause"></i>
          </button>
          <button class="btn btn-icon btn-secondary" onclick="PresentationEngine.nextSlide()" title="Selanjutnya">
            <i class="fa-solid fa-forward-step"></i>
          </button>
          <button class="btn btn-sm btn-danger ml-3" onclick="PresentationEngine.stopPresentation()">
            <i class="fa-solid fa-xmark"></i> Keluar Mode Presentasi
          </button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('afterbegin', barHtml);
  },

  _updatePresentationBarUI() {
    const counterEl = document.getElementById('presentation-counter');
    const titleEl = document.getElementById('presentation-current-title');

    const currentAsset = this.tourList[this.currentIndex];

    if (counterEl) {
      counterEl.textContent = `Slide ${this.currentIndex + 1} dari ${this.tourList.length}`;
    }

    if (titleEl && currentAsset) {
      titleEl.innerHTML = `<strong>${currentAsset.namaAset}</strong> <span class="text-muted">(${currentAsset.kabupaten} - ${currentAsset.kategori})</span>`;
    }
  }
};
