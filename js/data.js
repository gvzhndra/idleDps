/**
 * Dataset BMN Idle Provinsi Bali
 * Unit Kerja: KPKNL Denpasar (Mencakup seluruh Kabupaten/Kota di Bali)
 */

const BMN_IDLE_DATA = [
  {
    id: 'BMN-IDLE-001',
    kodeBarang: '2.01.01.04.001',
    nup: '000012',
    namaAset: 'Tanah & Bangunan Eks Kantor Sanur',
    kategori: 'Tanah & Bangunan',
    kabupaten: 'Kota Denpasar',
    kecamatan: 'Denpasar Selatan',
    kelurahan: 'Sanur Kaja',
    alamat: 'Jl. Bypass Ngurah Rai No. 142, Sanur, Denpasar',
    lat: -8.6782,
    lng: 115.2589,
    luasTanah: 1850,
    luasBangunan: 650,
    nilaiAset: 14250000000,
    potensiPnbpTahun: 450000000,
    kondisi: 'Kondisi Baik (Perlu Cat Ulang)',
    statusPenguasaan: 'Sertifikat Hak Pakai a.n. Pemerintah RI c.q. DJKN',
    zoningCode: 'Kategori 2',
    zoningName: 'Kawasan Pariwisata',
    rekomendasiUser: 'Sewa Komersial Restoran / Rest Area Pariwisata Sanur',
    catatanTim: 'Telah disetujui tim penilai untuk skema Sewa Komersial jangka waktu 5 tahun.',
    fotoList: [
      'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'
    ],
    keterangan: 'Lokasi strategis di pinggir jalan utama Bypass Ngurah Rai Sanur, akses ke pantai & jalan tol.',
    isSpotlight: true
  },
  {
    id: 'BMN-IDLE-002',
    kodeBarang: '2.01.01.01.005',
    nup: '000004',
    namaAset: 'Tanah Kosong Lahan Tuban Kuta',
    kategori: 'Tanah Kosong',
    kabupaten: 'Kabupaten Badung',
    kecamatan: 'Kuta',
    kelurahan: 'Tuban',
    alamat: 'Jl. Raya Kuta No. 88, Tuban, Kuta, Badung',
    lat: -8.7390,
    lng: 115.1765,
    luasTanah: 2400,
    luasBangunan: 0,
    nilaiAset: 28800000000,
    kondisi: 'Tanah Kosong Datar (Berpagar)',
    statusPenguasaan: 'Sertifikat Hak Pakai No. 42 / Tuban',
    zoningCode: 'Kategori 1',
    zoningName: 'Kawasan Perdagangan & Jasa',
    rekomendasiUser: 'Sewa Lahan Parkir Logistik & Retail Modern',
    catatanTim: 'Potensi penerimaan komersial tinggi karena dekat Bandara I Gusti Ngurah Rai.',
    fotoList: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80'
    ],
    keterangan: '5 menit dari Bandara I Gusti Ngurah Rai. Sangat cocok untuk parkir bus/logistik atau minimarket.',
    isSpotlight: true
  },
  {
    id: 'BMN-IDLE-003',
    kodeBarang: '2.01.01.04.019',
    nup: '000008',
    namaAset: 'Gedung Perkantoran Renon Denpasar',
    kategori: 'Tanah & Bangunan',
    kabupaten: 'Kota Denpasar',
    kecamatan: 'Denpasar Timur',
    kelurahan: 'Sumerta Kelod',
    alamat: 'Jl. Raya Puputan No. 45, Renon, Denpasar',
    lat: -8.6728,
    lng: 115.2340,
    luasTanah: 1200,
    luasBangunan: 950,
    nilaiAset: 18500000000,
    kondisi: 'Bangunan 2 Lantai Kokoh',
    statusPenguasaan: 'Sertifikat Hak Pakai Kemenkeu RI',
    zoningCode: 'Kategori 3',
    zoningName: 'Kawasan Fasilitas Pemerintahan',
    rekomendasiUser: 'Alih Status Penggunaan ke Satker / Lembaga Negara',
    catatanTim: 'Satker BPS / KPU telah mengajukan minat alih status penggunaan.',
    fotoList: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80'
    ],
    keterangan: 'Pusat Pemerintahan Renon (dekat Bajra Sandhi). Direkomendasikan untuk Alih Status Penggunaan.',
    isSpotlight: true
  },
  {
    id: 'BMN-IDLE-004',
    kodeBarang: '2.01.01.01.042',
    nup: '000002',
    namaAset: 'Tanah Lahan Eks BLK Ubud Gianyar',
    kategori: 'Tanah Kosong',
    kabupaten: 'Kabupaten Gianyar',
    kecamatan: 'Ubud',
    kelurahan: 'Peliatan',
    alamat: 'Jl. Raya Peliatan, Ubud, Gianyar',
    lat: -8.5142,
    lng: 115.2715,
    luasTanah: 4100,
    luasBangunan: 0,
    nilaiAset: 24600000000,
    kondisi: 'Tanah Datar Berkarakter Budaya',
    statusPenguasaan: 'Sertifikat Hak Pakai c.q. DJKN',
    zoningCode: 'Kategori 2',
    zoningName: 'Kawasan Pariwisata & Seni',
    rekomendasiUser: 'Kerja Sama Pemanfaatan (KSP) Galeri Seni / Eco-Resort',
    catatanTim: 'Dipertimbangkan skema KSP jangka panjang 30 tahun.',
    fotoList: [
      'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80'
    ],
    keterangan: 'Kawasan Wisata Seni Ubud. Ideal untuk KSP Galeri Seni, Boutique Resort, atau Amphitheater.',
    isSpotlight: true
  },
  {
    id: 'BMN-IDLE-005',
    kodeBarang: '2.01.01.03.011',
    nup: '000003',
    namaAset: 'Bangunan Mess & Diklat Singaraja',
    kategori: 'Tanah & Bangunan',
    kabupaten: 'Kabupaten Buleleng',
    kecamatan: 'Buleleng',
    kelurahan: 'Kampung Singaraja',
    alamat: 'Jl. Ahmad Yani No. 12, Singaraja, Buleleng',
    lat: -8.1180,
    lng: 115.0880,
    luasTanah: 3200,
    luasBangunan: 1400,
    nilaiAset: 9600000000,
    kondisi: 'Bangunan 1-2 Lantai Perlu Pemeliharaan',
    statusPenguasaan: 'Sertifikat Hak Pakai Singaraja',
    zoningCode: 'Kategori 3',
    zoningName: 'Kawasan Pendidikan & Perkantoran',
    rekomendasiUser: 'Pinjam Pakai / Sewa Mess Mahasiswa Undiksha',
    catatanTim: 'Usulan kerja sama penggunaan oleh civitas akademika.',
    fotoList: [
      'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80'
    ],
    keterangan: 'Dekat dengan Kampus Undiksha dan Kantor Bupati Buleleng.',
    isSpotlight: false
  },
  {
    id: 'BMN-IDLE-006',
    kodeBarang: '2.01.01.01.088',
    nup: '000001',
    namaAset: 'Tanah Pesisir Pantai Lovina Beach',
    kategori: 'Tanah Kosong',
    kabupaten: 'Kabupaten Buleleng',
    kecamatan: 'Banjar',
    kelurahan: 'Kalibukbuk',
    alamat: 'Jl. Raya Lovina Beach, Buleleng',
    lat: -8.1585,
    lng: 115.0255,
    luasTanah: 2900,
    luasBangunan: 0,
    nilaiAset: 11600000000,
    kondisi: 'Tanah Pesisir Pantai Datar',
    statusPenguasaan: 'Sertifikat Hak Pakai Kemenhub c.q. DJKN',
    zoningCode: 'Kategori 2',
    zoningName: 'Kawasan Wisata Bahari',
    rekomendasiUser: 'KSP Beach Club / Wisata Watersport Lovina',
    catatanTim: 'Potensi tinggi kerja sama mitra investor pariwisata bahari.',
    fotoList: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'
    ],
    keterangan: 'Akses langsung ke pesisir Pantai Lovina (Wisata Lumba-Lumba).',
    isSpotlight: false
  },
  {
    id: 'BMN-IDLE-007',
    kodeBarang: '2.01.01.02.003',
    nup: '000015',
    namaAset: 'Lahan Koridor Kediri Tabanan',
    kategori: 'Tanah Kosong',
    kabupaten: 'Kabupaten Tabanan',
    kecamatan: 'Kediri',
    kelurahan: 'Abiantuwung',
    alamat: 'Jl. Raya Denpasar - Gilimanuk Km 18, Tabanan',
    lat: -8.5582,
    lng: 115.1432,
    luasTanah: 5200,
    luasBangunan: 0,
    nilaiAset: 15600000000,
    kondisi: 'Lahan Datar Luas Pinggir Jalan Nasional',
    statusPenguasaan: 'Sertifikat Hak Pakai Kemenhub c.q. DJKN',
    zoningCode: 'Kategori 1',
    zoningName: 'Kawasan Koridor Logistik',
    rekomendasiUser: 'Sewa Rest Area Truk & SPBU Jalan Nasional',
    catatanTim: 'Cocok untuk penyewaan usaha fasilitas jalan nasional.',
    fotoList: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80'
    ],
    keterangan: 'Jalan Nasional Denpasar-Gilimanuk. Ideal untuk Rest Area, SPBU, atau Depo Logistik.',
    isSpotlight: false
  },
  {
    id: 'BMN-IDLE-008',
    kodeBarang: '2.01.01.04.055',
    nup: '000006',
    namaAset: 'Bangunan Eks Asrama Pelabuhan Padangbai',
    kategori: 'Tanah & Bangunan',
    kabupaten: 'Kabupaten Karangasem',
    kecamatan: 'Manggis',
    kelurahan: 'Padangbai',
    alamat: 'Jl. Pelabuhan Padangbai No. 5, Karangasem',
    lat: -8.5365,
    lng: 115.5085,
    luasTanah: 1600,
    luasBangunan: 720,
    nilaiAset: 6400000000,
    kondisi: 'Bangunan Perlu Renovasi',
    statusPenguasaan: 'Sertifikat Hak Pakai Kemenhub RI',
    zoningCode: 'Kategori 2',
    zoningName: 'Kawasan Pelabuhan & Pariwisata',
    rekomendasiUser: 'Sewa Penginapan Transit / Hotel Backpacker Padangbai',
    catatanTim: 'Lokasi 250m dari Dermaga Penyeberangan Bali-Lombok.',
    fotoList: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'
    ],
    keterangan: 'Dekat Dermaga Padangbai. Cocok untuk penginapan transit atau usaha ruko.',
    isSpotlight: false
  },
  {
    id: 'BMN-IDLE-009',
    kodeBarang: '2.01.01.01.102',
    nup: '000009',
    namaAset: 'Tanah Lahan Eks Balai Benih Negara Jembrana',
    kategori: 'Tanah Kosong',
    kabupaten: 'Kabupaten Jembrana',
    kecamatan: 'Negara',
    kelurahan: 'Batuagung',
    alamat: 'Jl. Raya Negara - Pengambengan, Jembrana',
    lat: -8.3750,
    lng: 114.6320,
    luasTanah: 8900,
    luasBangunan: 0,
    nilaiAset: 8900000000,
    kondisi: 'Tanah Subur Kebun/Pertanian',
    statusPenguasaan: 'Sertifikat Hak Pakai No. 05 Batuagung',
    zoningCode: 'Kategori 5',
    zoningName: 'Kawasan Pertanian & Agrowisata',
    rekomendasiUser: 'Sewa Pertanian Organik / Kerjasama Agrowisata Pemda',
    catatanTim: 'Lahan luas 0.89 Ha ideal untuk kemitraan bidang pertanian.',
    fotoList: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80'
    ],
    keterangan: 'Lahan luas 0.89 Ha. Direkomendasikan untuk Kerja Sama Agrowisata atau Sewa Pertanian.',
    isSpotlight: false
  }
];

// Rich Extended POIs (Schools, Police, Government, Health, Markets, Transport) across Bali
const GOVERNMENT_POIS = [
  // Sanur Area
  { name: 'Kantor Kelurahan Sanur Kaja', type: 'pemda', lat: -8.6755, lng: 115.2570 },
  { name: 'Polsek Denpasar Selatan', type: 'polisi', lat: -8.6810, lng: 115.2490 },
  { name: 'SD Negeri 1 Sanur', type: 'pendidikan', lat: -8.6790, lng: 115.2580 },
  { name: 'Pasar Intaran Sanur', type: 'pasar', lat: -8.6850, lng: 115.2595 },
  { name: 'Dermaga Penyeberangan Sanur', type: 'transportasi', lat: -8.6740, lng: 115.2630 },
  
  // Tuban / Kuta Area
  { name: 'Kantor Kelurahan Tuban', type: 'pemda', lat: -8.7410, lng: 115.1780 },
  { name: 'Polsek Bandara Ngurah Rai', type: 'polisi', lat: -8.7450, lng: 115.1710 },
  { name: 'Bandara Internasional I Gusti Ngurah Rai', type: 'transportasi', lat: -8.7480, lng: 115.1670 },
  { name: 'SMA Negeri 1 Kuta', type: 'pendidikan', lat: -8.7320, lng: 115.1750 },
  { name: 'Pasar Adat Tuban', type: 'pasar', lat: -8.7360, lng: 115.1740 },

  // Renon Area
  { name: 'Kantor Sumerta Kelod Renon', type: 'pemda', lat: -8.6710, lng: 115.2320 },
  { name: 'Polda Bali HQ', type: 'polisi', lat: -8.6700, lng: 115.2300 },
  { name: 'RSUP Prof. Ngoerah (Sanglah)', type: 'kesehatan', lat: -8.6750, lng: 115.2130 },
  { name: 'Universitas Udayana (Kampus Sudirman)', type: 'pendidikan', lat: -8.6715, lng: 115.2180 },

  // Ubud / Peliatan Area
  { name: 'Kantor Desa Peliatan Ubud', type: 'pemda', lat: -8.5130, lng: 115.2725 },
  { name: 'Polsek Ubud', type: 'polisi', lat: -8.5080, lng: 115.2610 },
  { name: 'SMP Negeri 1 Ubud', type: 'pendidikan', lat: -8.5060, lng: 115.2630 },
  { name: 'Pasar Seni Ubud', type: 'pasar', lat: -8.5068, lng: 115.2626 },

  // Singaraja Area
  { name: 'Kantor Lurah Kampung Singaraja', type: 'pemda', lat: -8.1170, lng: 115.0890 },
  { name: 'Polres Buleleng', type: 'polisi', lat: -8.1140, lng: 115.0930 },
  { name: 'Universitas Pendidikan Ganesha (Undiksha)', type: 'pendidikan', lat: -8.1175, lng: 115.0870 },
  { name: 'RSUD Kabupaten Buleleng', type: 'kesehatan', lat: -8.1150, lng: 115.0910 },

  // Padangbai / Karangasem Area
  { name: 'Pelabuhan Penyeberangan Padangbai', type: 'transportasi', lat: -8.5370, lng: 115.5090 },
  { name: 'Kantor Desa Padangbai', type: 'pemda', lat: -8.5360, lng: 115.5070 },
  { name: 'Polsek Kawasan Pelabuhan Padangbai', type: 'polisi', lat: -8.5368, lng: 115.5082 }
];

// GeoJSON Zoning Polygons Mock for Bali Key Regions
const BALI_ZONING_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Zona Perdagangan & Jasa Sanur", zoningCode: "Kategori 2" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [115.2500, -8.6700],
          [115.2650, -8.6700],
          [115.2650, -8.6850],
          [115.2500, -8.6850],
          [115.2500, -8.6700]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Zona Pemerintahan Renon", zoningCode: "Kategori 3" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [115.2200, -8.6650],
          [115.2400, -8.6650],
          [115.2400, -8.6800],
          [115.2200, -8.6800],
          [115.2200, -8.6650]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Zona Komersial Tuban Kuta", zoningCode: "Kategori 1" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [115.1650, -8.7300],
          [115.1850, -8.7300],
          [115.1850, -8.7500],
          [115.1650, -8.7500],
          [115.1650, -8.7300]
        ]]
      }
    }
  ]
};
