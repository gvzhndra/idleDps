/**
 * Configuration for BMN Idle Interactive Dashboard
 * Header Branding: KPKNL Denpasar (Cakupan: Seluruh Provinsi Bali)
 */

const CONFIG = {
  // Office Reference for Distance Calculations (KPKNL Denpasar Official Coordinates)
  KPKNL_OFFICE: {
    id: 'denpasar',
    name: 'KPKNL Denpasar',
    address: 'Jl. Dr. Kusuma Atmaja No. 8, Niti Mandala Renon, Denpasar, Bali',
    lat: -8.670697092578227,
    lng: 115.23102923970801,
    color: '#4a90e2'
  },

  // Map Initial View (Covering the Entire Island of Bali)
  MAP: {
    DEFAULT_CENTER: [-8.4095, 115.1889],
    DEFAULT_ZOOM: 10,
    MIN_ZOOM: 8,
    MAX_ZOOM: 18,
    TILE_LAYERS: {
      PASTEL_LIGHT: {
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      },
      DARK_EXECUTIVE: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      },
      SATELLITE: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri'
      },
      STREETS: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap'
      }
    }
  },

  // Extended POIs Categories in Soft Pastel Theme
  POI_CATEGORIES: {
    PENDIDIKAN: { id: 'pendidikan', name: 'Sekolah / Kampus (Pendidikan)', icon: 'fa-graduation-cap', color: '#2ecc71' },
    POLISI_KEAMANAN: { id: 'polisi', name: 'Kantor Polisi / TNI', icon: 'fa-user-shield', color: '#3498db' },
    PEMERINTAHAN: { id: 'pemda', name: 'Kantor Desa / Kelurahan / Pemda', icon: 'fa-landmark', color: '#9b59b6' },
    KESEHATAN: { id: 'kesehatan', name: 'Rumah Sakit / Puskesmas', icon: 'fa-hospital', color: '#e74c3c' },
    PASAR_KOMERSIAL: { id: 'pasar', name: 'Pasar / Pusat Bisnis', icon: 'fa-store', color: '#f1c40f' },
    TRANSPORTASI: { id: 'transportasi', name: 'Bandara / Pelabuhan / Dermaga', icon: 'fa-plane-departure', color: '#1abc9c' }
  },

  // Utilization Recommendations Mapping
  RECOMMENDATION_TYPES: {
    SEWA_KOMERSIAL: { label: 'Sewa Komersial / UMKM', color: '#e69138', badgeClass: 'badge-pastel-orange' },
    KSP_PARIWISATA: { label: 'Kerja Sama Pemanfaatan (KSP) Pariwisata', color: '#cc4125', badgeClass: 'badge-pastel-rose' },
    ALIH_STATUS: { label: 'Alih Status Penggunaan (Satker)', color: '#3d85c6', badgeClass: 'badge-pastel-blue' },
    PINJAM_PAKAI: { label: 'Pinjam Pakai Pemda / Instansi', color: '#674ea7', badgeClass: 'badge-pastel-purple' },
    OPTIMALISASI_TERBATAS: { label: 'Optimalisasi Terbatas / Agrowisata', color: '#38761d', badgeClass: 'badge-pastel-mint' }
  },

  // Google Apps Script Integration
  APPS_SCRIPT: {
    WEB_APP_URL: localStorage.getItem('bmn_idle_apps_script_url') || 'https://script.google.com/macros/s/AKfycbzWqyN97KaeTwwFXBMPDCanTQizU35KXSMNBMMJcjLhmZGki1tLuMq9X2oeTB04HhjH/exec',
    SHEET_NAME: 'BMN_Idle'
  }
};
