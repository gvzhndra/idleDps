/**
 * Configuration for BMN Idle Interactive Dashboard
 * Header Branding: KPKNL Denpasar (Cakupan: Seluruh Provinsi Bali)
 */

const CONFIG = {
  // Office Reference for Distance Calculations (KPKNL Denpasar)
  KPKNL_OFFICE: {
    id: 'denpasar',
    name: 'KPKNL Denpasar',
    address: 'Jl. Dr. Kusuma Atmaja No. 8, Niti Mandala Renon, Denpasar, Bali',
    lat: -8.6705,
    lng: 115.2260,
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

  // Bali Spatial Planning (RTRW) Zoning Codes - Soft Pastel Palette
  ZONING_TYPES: {
    PERDAGANGAN_JASA: {
      code: 'K-1',
      name: 'Perdagangan & Jasa',
      color: '#f6d186',
      fillColor: '#fff5c0',
      description: 'Zona Komersial & Pertokoan'
    },
    PARIWISATA: {
      code: 'K-2',
      name: 'Kawasan Pariwisata',
      color: '#ffaaa5',
      fillColor: '#ffd3b6',
      description: 'Zona Wisata & Hospitality'
    },
    PEMERINTAHAN: {
      code: 'K-3',
      name: 'Fasilitas Pemerintahan',
      color: '#a8d8ea',
      fillColor: '#d4f0f0',
      description: 'Zona Perkantoran & Fasilitas Umum'
    },
    PERUMAHAN: {
      code: 'K-4',
      name: 'Permukiman / Perumahan',
      color: '#a8e6cf',
      fillColor: '#dcedc1',
      description: 'Zona Perumahan & Hunian'
    },
    RTH_LINDUNG: {
      code: 'K-5',
      name: 'Ruang Terbuka Hijau / Lindung',
      color: '#c7ceea',
      fillColor: '#e8dff5',
      description: 'Zona Hijau & Konservasi'
    }
  },

  // POIs Categories in Soft Pastel Theme
  POI_CATEGORIES: {
    KANTOR_DESA: { id: 'desa', name: 'Kantor Desa/Kelurahan', icon: 'fa-building-columns', color: '#8e7cc3' },
    POLSEK_POLRES: { id: 'polisi', name: 'Kantor Polisi (Polsek/Polres)', icon: 'fa-user-shield', color: '#6fa8dc' },
    KORAMIL_KODIM: { id: 'tentara', name: 'Kantor Tentara (Koramil/Kodim)', icon: 'fa-person-military-pointing', color: '#93c47d' },
    PASAR_PASARAN: { id: 'pasar', name: 'Pasar / Pusat Bisnis', icon: 'fa-store', color: '#f6b26b' }
  },

  // Utilization Recommendations Mapping
  RECOMMENDATION_TYPES: {
    SEWA_KOMERSIAL: { label: 'Sewa Komersial / UMKM', color: '#e69138', badgeClass: 'badge-pastel-orange' },
    KSP_PARIWISATA: { label: 'Kerja Sama Pemanfaatan (KSP) Pariwisata', color: '#cc4125', badgeClass: 'badge-pastel-rose' },
    ALIH_STATUS: { label: 'Alih Status Penggunaan (Satker)', color: '#3d85c6', badgeClass: 'badge-pastel-blue' },
    PINJAM_PAKAI: { label: 'Pinjam Pakai Pemda / Instansi', color: '#674ea7', badgeClass: 'badge-pastel-purple' },
    OPTIMALISASI_TERBATAS: { label: 'Optimalisasi Terbatas / Agrowisata', color: '#38761d', badgeClass: 'badge-pastel-green' }
  },

  // Google Apps Script Integration
  APPS_SCRIPT: {
    WEB_APP_URL: localStorage.getItem('bmn_idle_apps_script_url') || '',
    SHEET_NAME: 'Data_BMN_Idle'
  }
};
