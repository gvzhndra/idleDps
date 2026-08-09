/**
 * Configuration for BMN Idle Interactive Dashboard
 * Header Branding: KPKNL Denpasar (Cakupan: Seluruh Provinsi Bali)
 */

const CONFIG = {
  // Application Version & Release Metadata
  VERSION: 'v2.6.7',
  VERSION_NAME: 'Automated 100% GIS Regency Vector Boundary Synchronization',

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

  // Classification Taxonomy & Sub-Details Mapping
  KLASIFIKASI_TAXONOMY: {
    PENGGUNAAN: {
      key: 'penggunaan',
      label: 'Penggunaan',
      icon: 'fa-building-circle-check',
      color: '#3498db',
      badgeClass: 'badge-pastel-blue',
      details: {
        'digunakan satker': 'Digunakan Satker',
        'alih status ke satker lain': 'Alih Status ke Satker Lain',
        'rencana penggunaan satker': 'Rencana Penggunaan Satker'
      }
    },
    PENGHAPUSAN: {
      key: 'penghapusan',
      label: 'Penghapusan',
      icon: 'fa-trash-can',
      color: '#e74c3c',
      badgeClass: 'badge-pastel-rose',
      details: {
        'sudah dihapus': 'Sudah Dihapus',
        'sudah penghapusan': 'Sudah Dihapus',
        'rencana penghapusan': 'Rencana / Usulan Penghapusan'
      }
    },
    PEMANFAATAN: {
      key: 'pemanfaatan',
      label: 'Pemanfaatan',
      icon: 'fa-handshake',
      color: '#2ecc71',
      badgeClass: 'badge-pastel-mint',
      details: {
        'pemanfaatan': 'Pemanfaatan Berjalan / Sewa',
        'rencana pemanfaatan': 'Rencana Pemanfaatan / Sewa',
        'rencana pemanfatan': 'Rencana Pemanfaatan / Sewa'
      }
    },
    PEMINDAHTANGANAN: {
      key: 'pemindahtanganan',
      label: 'Pemindahtanganan',
      icon: 'fa-gift',
      color: '#f39c12',
      badgeClass: 'badge-pastel-orange',
      details: {
        'rencana hibah pemkab': 'Rencana Hibah Pemkab / Pemda',
        'selesai hibah': 'Selesai Hibah Pemda'
      }
    },
    RENOVASI: {
      key: 'renovasi',
      label: 'Renovasi',
      icon: 'fa-hammer',
      color: '#9b59b6',
      badgeClass: 'badge-pastel-purple',
      details: {
        'rencana renovasi': 'Rencana Renovasi',
        'rusak berat perlu renovasi': 'Rusak Berat Perlu Renovasi',
        'proses renovasi': 'Proses Renovasi Sedang Berjalan'
      }
    },
    MASALAH_PENCATATAN: {
      key: 'masalah_pencatatan',
      label: 'Masalah Pencatatan',
      icon: 'fa-circle-exclamation',
      color: '#e67e22',
      badgeClass: 'badge-pastel-orange',
      details: {
        'tidak ditemukan di master aset': 'Tidak Ditemukan di Master Aset',
        'reklas pencatatan': 'Reklasifikasi / Koreksi Catat',
        'koreksi pencatatan': 'Koreksi Pencatatan',
        'kode satker berbeda': 'Kode Satker Berbeda',
        'dobel catat': 'Dobel Catat (Duplikasi)',
        'masalah pencatatan': 'Masalah Pencatatan / Anomali'
      }
    }
  },

  // Next Stages Mapping (Tahap / Rencana Tindak Lanjut dari kolom TAHAP_BERIKUT)
  TAHAP_TINDAK_LANJUT: {
    PENELITIAN: { key: 'PENELITIAN', label: 'Penelitian', icon: 'fa-magnifying-glass-chart', color: '#4a90e2', badgeClass: 'badge-pastel-blue' },
    PEMANTAUAN: { key: 'PEMANTAUAN', label: 'Pemantauan', icon: 'fa-eye', color: '#2ecc71', badgeClass: 'badge-pastel-mint' }
  },

  // Google Apps Script Integration
  APPS_SCRIPT: {
    WEB_APP_URL: localStorage.getItem('bmn_idle_apps_script_url') || 'https://script.google.com/macros/s/AKfycbzWqyN97KaeTwwFXBMPDCanTQizU35KXSMNBMMJcjLhmZGki1tLuMq9X2oeTB04HhjH/exec',
    SHEET_NAME: 'BMN_Idle'
  }
};
