/**
 * Generator Laporan & Dokumen Legal PMK 120/2024 Engine
 * Mendukung:
 * 1. Format H: Laporan Hasil Penelitian BMN Terindikasi Idle (+ Matriks)
 * 2. Format G: Laporan Hasil Penelusuran BMN Terindikasi Idle (+ Matriks)
 * 3. Format D: Laporan Hasil Pemantauan Lapangan
 * 4. Format F: Berita Acara Peninjauan Lapangan
 * 5. Format C: Rekapitulasi Pemantauan Kolektif per Satker / Kementerian
 * Output: Print PDF View (@media print) & Microsoft Word (.docx via docx.js)
 */

const LaporanEngine = {
  PRESET_KEY: 'bmn_idle_tim_penelitian_preset',
  MASTER_ST_KEY: 'bmn_idle_master_tim_st_list',
  MASTER_SK_KEY: 'bmn_idle_master_sk_tim_list',
  masterTimSTList: [],
  masterSKTimList: [],

  init() {
    this.loadMasterTimSTFromLocal();
    this.loadMasterSKFromLocal();
    this.fetchMasterTimSTFromSheet();
  },

  loadMasterTimSTFromLocal() {
    try {
      const stored = localStorage.getItem(this.MASTER_ST_KEY);
      if (stored) {
        this.masterTimSTList = JSON.parse(stored);
      } else {
        this.masterTimSTList = [{
          id_st: 'ST-2026-001',
          no_st: 'ST-101/KPKNL.1401/2026',
          tgl_st: '15 Januari 2026',
          no_sk_tim: 'KEP-45/KPKNL.14/2026',
          wilayah_satker: 'Provinsi Bali',
          personil: [
            { peran: 'Ketua Tim', nama: 'I Putu Harjaya', nip: '19850101 201012 1 001', jabatan: 'Kepala Seksi PKN' },
            { peran: 'Anggota Tim', nama: 'Gede Shendra', nip: '19900202 201402 1 002', jabatan: 'Penata Muda PKN' }
          ],
          ketua_nama: 'I Putu Harjaya',
          ketua_nip: '19850101 201012 1 001',
          ketua_jabatan: 'Kepala Seksi PKN',
          anggota1_nama: 'Gede Shendra',
          anggota1_nip: '19900202 201402 1 002',
          anggota1_jabatan: 'Penata Muda PKN',
          pdf_st_url: '',
          status_aktif: 'AKTIF'
        }];
        this.saveMasterTimSTToLocal();
      }
    } catch (e) {
      console.warn('Gagal memuat master Tim & ST dari local:', e);
    }
  },

  saveMasterTimSTToLocal() {
    try {
      localStorage.setItem(this.MASTER_ST_KEY, JSON.stringify(this.masterTimSTList));
    } catch (e) {
      console.warn('Gagal menyimpan master Tim & ST ke local:', e);
    }
  },

  loadMasterSKFromLocal() {
    try {
      const stored = localStorage.getItem(this.MASTER_SK_KEY);
      if (stored) {
        this.masterSKTimList = JSON.parse(stored);
      } else {
        this.masterSKTimList = [{
          id_sk: 'SK-2026-001',
          no_sk: 'KEP-45/KPKNL.14/2026',
          tgl_sk: '10 Januari 2026',
          perihal: 'Pembentukan Tim Penelitian BMN Terindikasi Idle TA 2026',
          pejabat: 'Kepala KPKNL Denpasar',
          personil: [
            { peran: 'Ketua Tim', nama: 'I Putu Harjaya', nip: '19850101 201012 1 001', jabatan: 'Kepala Seksi PKN' },
            { peran: 'Anggota Tim', nama: 'Gede Shendra', nip: '19900202 201402 1 002', jabatan: 'Penata Muda PKN' }
          ],
          pdf_sk_url: '',
          status_aktif: 'AKTIF'
        }];
        this.saveMasterSKToLocal();
      }
    } catch (e) {
      console.warn('Gagal memuat master SK Tim dari local:', e);
    }
  },

  saveMasterSKToLocal() {
    try {
      localStorage.setItem(this.MASTER_SK_KEY, JSON.stringify(this.masterSKTimList));
    } catch (e) {
      console.warn('Gagal menyimpan master SK Tim ke local:', e);
    }
  },

  async fetchMasterTimSTFromSheet() {
    if (typeof CONFIG === 'undefined' || !CONFIG.APPS_SCRIPT || !CONFIG.APPS_SCRIPT.WEB_APP_URL) return;
    try {
      const url = CONFIG.APPS_SCRIPT.WEB_APP_URL + '?action=getTimST';
      const resp = await fetch(url);
      const json = await resp.json();
      if (json && json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
        this.masterTimSTList = json.data;
        this.saveMasterTimSTToLocal();
        this.populateSTDropdown();
        this.renderTimSTTable();
      }
    } catch (err) {
      console.warn('Live getTimST fetch error:', err);
    }
  },

  async saveTimSTToSheet(stPayload) {
    if (typeof CONFIG === 'undefined' || !CONFIG.APPS_SCRIPT || !CONFIG.APPS_SCRIPT.WEB_APP_URL) return false;
    try {
      const resp = await fetch(CONFIG.APPS_SCRIPT.WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveTimST',
          ...stPayload
        })
      });
      const json = await resp.json();
      return json && json.status === 'success';
    } catch (err) {
      console.warn('Save Tim ST error:', err);
      return false;
    }
  },

  async uploadDocumentPDFToDrive(fileName, base64Data, docType = 'SURAT_TUGAS') {
    if (typeof CONFIG === 'undefined' || !CONFIG.APPS_SCRIPT || !CONFIG.APPS_SCRIPT.WEB_APP_URL) return null;
    try {
      const resp = await fetch(CONFIG.APPS_SCRIPT.WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'uploadBase64PDF',
          fileName: fileName,
          base64Data: base64Data,
          docType: docType
        })
      });
      const json = await resp.json();
      if (json && json.status === 'success') {
        return json.fileUrl;
      }
    } catch (err) {
      console.warn('Upload PDF to Drive error:', err);
    }
    return null;
  },

  populateSTDropdown() {
    const select = document.getElementById('lap-select-preset-st');
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Pilih dari Master Surat Tugas --</option>';

    this.masterTimSTList.forEach(st => {
      const opt = document.createElement('option');
      opt.value = st.id_st || st.no_st;
      opt.textContent = `${st.no_st} (${st.tgl_st}) - ${st.ketua_nama || 'Ketua'}`;
      select.appendChild(opt);
    });

    if (currentVal) select.value = currentVal;
  },

  populateSKDropdownInSTForm() {
    const select = document.getElementById('st-input-sk-select');
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Tanpa / Pilih dari Master SK --</option>';

    this.masterSKTimList.forEach(sk => {
      const opt = document.createElement('option');
      opt.value = sk.no_sk;
      opt.textContent = `${sk.no_sk} (${sk.tgl_sk}) - ${sk.perihal || 'SK Tim'}`;
      select.appendChild(opt);
    });

    if (currentVal) select.value = currentVal;
  },

  renderTimSTTable() {
    const tbody = document.getElementById('tim-st-table-body');
    if (!tbody) return;

    if (!this.masterTimSTList || this.masterTimSTList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:12px; color:var(--text-muted);">Belum ada data Surat Tugas yang tersimpan.</td></tr>';
      return;
    }

    tbody.innerHTML = this.masterTimSTList.map((st) => {
      const personilList = Array.isArray(st.personil) && st.personil.length > 0
        ? st.personil.map(p => `<div><strong>${p.peran || 'Anggota'}:</strong> ${p.nama || '-'} <small class="text-muted">(${p.nip || '-'})</small></div>`).join('')
        : `<div><strong>Ketua:</strong> ${st.ketua_nama || '-'} <small class="text-muted">(${st.ketua_nip || '-'})</small></div>` +
          (st.anggota1_nama ? `<div><strong>Anggota:</strong> ${st.anggota1_nama}</div>` : '');

      return `
        <tr style="border-bottom:1px solid var(--border-subtle);">
          <td style="padding:8px 10px; font-weight:700; color:var(--text-main);">
            <div>${st.no_st || '-'}</div>
            <small style="color:var(--text-muted); font-weight:normal;">Tgl: ${st.tgl_st || '-'}</small>
          </td>
          <td style="padding:8px 10px;">
            ${personilList}
          </td>
          <td style="padding:8px 10px;">
            <div><span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:10px;">${st.wilayah_satker || 'Provinsi Bali'}</span></div>
            <small style="color:var(--text-muted);">SK: ${st.no_sk_tim || '-'}</small>
          </td>
          <td style="padding:8px 10px;">
            ${st.pdf_st_url ? `
              <a href="${st.pdf_st_url}" target="_blank" class="btn btn-sm btn-secondary" style="font-size:10px; padding:3px 8px; color:var(--pastel-blue);" title="Buka Dokumen PDF">
                <i class="fa-solid fa-file-pdf text-danger"></i> PDF ST
              </a>
            ` : '<span style="color:var(--text-muted); font-size:10.5px;">-</span>'}
          </td>
          <td style="padding:8px 10px; text-align:center;">
            <button class="btn btn-sm btn-secondary" style="font-size:11px; padding:3px 8px;" onclick="App.editTimSTRow('${st.id_st || st.no_st}')" title="Edit Data ST">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderSKTimTable() {
    const tbody = document.getElementById('tim-sk-table-body');
    if (!tbody) return;

    if (!this.masterSKTimList || this.masterSKTimList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:12px; color:var(--text-muted);">Belum ada data SK Tim yang tersimpan.</td></tr>';
      return;
    }

    tbody.innerHTML = this.masterSKTimList.map((sk) => {
      const personilList = Array.isArray(sk.personil) && sk.personil.length > 0
        ? sk.personil.map(p => `<div><strong>${p.peran || 'Anggota'}:</strong> ${p.nama || '-'} <small class="text-muted">(${p.nip || '-'})</small></div>`).join('')
        : '<div><small class="text-muted">-</small></div>';

      return `
        <tr style="border-bottom:1px solid var(--border-subtle);">
          <td style="padding:8px 10px; font-weight:700; color:var(--text-main);">
            <div>${sk.no_sk || '-'}</div>
            <small style="color:var(--text-muted); font-weight:normal;">Tgl: ${sk.tgl_sk || '-'}</small>
          </td>
          <td style="padding:8px 10px;">
            ${personilList}
          </td>
          <td style="padding:8px 10px;">
            <div style="font-weight:600; color:#1e293b;">${sk.perihal || 'SK Tim Penelitian BMN'}</div>
            <small style="color:var(--text-muted);">${sk.pejabat || 'Kepala KPKNL'}</small>
          </td>
          <td style="padding:8px 10px;">
            ${sk.pdf_sk_url ? `
              <a href="${sk.pdf_sk_url}" target="_blank" class="btn btn-sm btn-secondary" style="font-size:10px; padding:3px 8px; color:var(--pastel-blue);" title="Buka Dokumen PDF">
                <i class="fa-solid fa-file-pdf text-danger"></i> PDF SK
              </a>
            ` : '<span style="color:var(--text-muted); font-size:10.5px;">-</span>'}
          </td>
          <td style="padding:8px 10px; text-align:center;">
            <button class="btn btn-sm btn-secondary" style="font-size:11px; padding:3px 8px;" onclick="App.editSKTimRow('${sk.id_sk || sk.no_sk}')" title="Edit Data SK">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  loadTeamPresets() {
    try {
      const stored = localStorage.getItem(this.PRESET_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}

    if (this.masterTimSTList && this.masterTimSTList.length > 0) {
      const first = this.masterTimSTList[0];
      return {
        noSuratTugas: first.no_st,
        tglSuratTugas: first.tgl_st,
        ketuaNama: first.ketua_nama,
        ketuaNip: first.ketua_nip,
        ketuaJabatan: first.ketua_jabatan,
        anggota1Nama: first.anggota1_nama,
        anggota1Nip: first.anggota1_nip,
        anggota1Jabatan: first.anggota1_jabatan
      };
    }

    return {
      ketuaNama: 'I Putu Harjaya',
      ketuaNip: '19850101 201012 1 001',
      ketuaJabatan: 'Kepala Seksi PKN KPKNL Denpasar',
      anggota1Nama: 'Gede Shendra',
      anggota1Nip: '19900202 201402 1 002',
      anggota1Jabatan: 'Penata Muda PKN'
    };
  },

  saveTeamPresets(data) {
    try {
      localStorage.setItem(this.PRESET_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Gagal menyimpan preset tim penelitian:', e);
    }
  },

  /**
   * Generates Printable PDF View (@media print) strictly following PMK 120/2024
   */
  generatePrintView(asset, formValues) {
    const formatType = formValues.formatType || 'FORMAT_H';
    const preset = {
      ketuaNama: formValues.ketuaNama || 'I Putu Harjaya',
      ketuaNip: formValues.ketuaNip || '-',
      ketuaJabatan: formValues.ketuaJabatan || 'Ketua Tim Penelitian BMN',
      anggota1Nama: formValues.anggota1Nama || 'Gede Shendra',
      anggota1Nip: formValues.anggota1Nip || '-',
      noSuratTugas: formValues.noSuratTugas || 'ST-101/KPKNL.1401/2026',
      tglSuratTugas: formValues.tglSuratTugas || '15 Januari 2026'
    };
    this.saveTeamPresets(preset);

    let docTitle = 'LAPORAN HASIL PENELITIAN';
    let docSub = 'BARANG MILIK NEGARA TERINDIKASI IDLE';
    let docCode = 'PMK 120/2024 (Lampiran H)';

    if (formatType === 'FORMAT_G') {
      docTitle = 'LAPORAN HASIL PENELUSURAN';
      docSub = 'ATAS BMN YANG TERINDIKASI SEBAGAI BMN IDLE';
      docCode = 'PMK 120/2024 (Lampiran G)';
    } else if (formatType === 'FORMAT_D') {
      docTitle = 'LAPORAN HASIL PEMANTAUAN PENINJAUAN LAPANGAN';
      docSub = 'ATAS BMN YANG TERINDIKASI SEBAGAI BMN IDLE';
      docCode = 'PMK 120/2024 (Lampiran D)';
    } else if (formatType === 'FORMAT_F') {
      docTitle = 'BERITA ACARA PENINJAUAN LAPANGAN';
      docSub = 'ATAS BMN YANG TERINDIKASI SEBAGAI BMN IDLE';
      docCode = 'PMK 120/2024 (Lampiran F)';
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Popup blocker aktif! Mohon izinkan popup untuk melihat preview laporan.');
      return;
    }

    const batasText = `Utara: ${asset.batasUtara || '-'}, Timur: ${asset.batasTimur || '-'}, Selatan: ${asset.batasSelatan || '-'}, Barat: ${asset.batasBarat || '-'}`;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>${docTitle} - ${asset.namaBarang || asset.uraian_bmn || 'Aset'}</title>
      <style>
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          line-height: 1.45;
          margin: 2.2cm 2cm 2.2cm 2cm;
          color: #000;
        }
        .header-kop {
          text-align: center;
          font-weight: bold;
          text-transform: uppercase;
          border-bottom: 3px double #000;
          padding-bottom: 8px;
          margin-bottom: 16px;
          font-size: 11pt;
          line-height: 1.3;
        }
        .header-title {
          text-align: center;
          font-weight: bold;
          margin: 14px 0;
          text-transform: uppercase;
          font-size: 11.5pt;
          line-height: 1.35;
        }
        .section-title {
          font-weight: bold;
          margin-top: 14px;
          margin-bottom: 4px;
          font-size: 11pt;
        }
        .sub-section-title {
          font-weight: bold;
          margin-top: 8px;
          margin-bottom: 3px;
          font-size: 10.5pt;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0 12px 0;
        }
        th, td {
          border: 1px solid #000;
          padding: 5px 8px;
          font-size: 10pt;
          vertical-align: top;
        }
        th {
          background-color: #f2f2f2;
          text-align: center;
        }
        ol, ul {
          margin-top: 4px;
          margin-bottom: 6px;
          padding-left: 22px;
        }
        li {
          margin-bottom: 3px;
        }
        .signature-table {
          width: 100%;
          border: none;
          margin-top: 30px;
        }
        .signature-table td {
          border: none;
          text-align: center;
          font-size: 10.5pt;
        }
        .page-break { page-break-before: always; }
        @media print {
          @page { size: A4; margin: 2cm; }
        }
      </style>
    </head>
    <body>
      <div class="header-kop">
        KEMENTERIAN KEUANGAN REPUBLIK INDONESIA<br>
        DIREKTORAT JENDERAL KEKAYAAN NEGARA<br>
        KANTOR WILAYAH DJKN BALI DAN NUSA TENGGARA<br>
        KPKNL DENPASAR
      </div>

      <div class="header-title">
        ${docTitle}<br>
        ${docSub}<br>
        PADA ${asset.satker || asset.namaSatker || 'SATUAN KERJA'}<br>
        NOMOR: LAP-01/KPKNL.1401/2026
      </div>

      <div class="section-title">I. PENDAHULUAN</div>
      <ol type="1">
        <li><strong>Dasar Pelaksanaan:</strong>
          <ol type="a">
            <li>Peraturan Pemerintah Nomor 27 Tahun 2014 jo PP Nomor 28 Tahun 2020 tentang Pengelolaan BMN/D;</li>
            <li>Peraturan Menteri Keuangan Nomor 120 Tahun 2024 tentang Tata Cara Pengelolaan BMN Yang Tidak Digunakan Untuk Penyelenggaraan Tusi K/L;</li>
            <li>Surat Permintaan Klarifikasi Tertulis dari Kepala KPKNL Denpasar Nomor: <strong>${formValues.noKlarifikasiKpknl || 'S-259/MK/KNL.1401/2025'}</strong> tanggal <strong>${formValues.tglKlarifikasiKpknl || '15 Desember 2025'}</strong>;</li>
            <li>Surat Jawaban Klarifikasi dari Satker / Pengguna Barang Nomor: <strong>${formValues.noSuratSatker || asset.suratJawaban || '-'}</strong> tanggal <strong>${formValues.tglSuratSatker || asset.tglSurat || '-'}</strong>;</li>
            <li>Surat Tugas Kepala KPKNL Denpasar Nomor: <strong>${preset.noSuratTugas || 'ST-..../KPKNL.1401/2026'}</strong> tanggal <strong>${preset.tglSuratTugas || '.... 2026'}</strong>;</li>
            ${formValues.noSkTim ? `<li>Keputusan Kepala KPKNL Denpasar Nomor: <strong>${formValues.noSkTim}</strong> tentang Pembentukan Tim Penelitian BMN Terindikasi Idle;</li>` : ''}
          </ol>
        </li>
        <li><strong>Latar Belakang:</strong> Dalam rangka akuntabilitas tata kelola BMN (good governance), diperlukan optimalisasi penggunaan aset pada ${asset.kementerian || 'Kementerian/Lembaga'} berupa ${asset.namaBarang || asset.uraian_bmn || 'BMN'} yang berlokasi di ${asset.alamat || '-'}.</li>
        <li><strong>Tujuan & Manfaat:</strong> Memperoleh kepastian administratif, fisik, spasial, dan rencana tindak lanjut atas BMN terindikasi idle sesuai ketentuan PMK 120/2024.</li>
      </ol>

      <div class="section-title">II. OBJEK PENELITIAN / DATA BMN</div>
      <table>
        <tr><td width="30%"><strong>Satuan Kerja (Satker)</strong></td><td>${asset.kodeSatker || '-'} - ${asset.satker || asset.namaSatker || '-'}</td></tr>
        <tr><td><strong>Kementerian / Lembaga</strong></td><td>${asset.kementerian || '-'}</td></tr>
        <tr><td><strong>Kode Barang / NUP</strong></td><td>${asset.kodeBarang || '-'} / NUP ${asset.nup || '-'}</td></tr>
        <tr><td><strong>Nama Barang / Jenis</strong></td><td>${asset.namaBarang || asset.uraian_bmn || '-'} (${asset.jenisBarang || 'Tanah'})</td></tr>
        <tr><td><strong>Luas Aset / Jml Bangunan</strong></td><td>${asset.luas || asset.luas_m2 || 0} m² / ${asset.jumlahBangunan || 0} unit bangunan</td></tr>
        <tr><td><strong>Nilai Buku / Nilai Awal</strong></td><td>Rp ${(asset.nilaiBuku || asset.nilai_buku || 0).toLocaleString('id-ID')} / Rp ${(asset.nilaiPerolehan || asset.nilaiBuku || 0).toLocaleString('id-ID')}</td></tr>
        <tr><td><strong>Legalitas & Sertipikat</strong></td><td>${asset.jenisDokumen || 'SHP'}: <strong>${asset.noDokumen || 'Dalam Proses Konfirmasi'}</strong> a.n. ${asset.atasNamaDokumen || 'Pemerintah RI'} (Tgl: ${asset.tglDokumen || '-'})</td></tr>
        <tr><td><strong>Batas-Batas Bidang Tanah</strong></td><td>${batasText}</td></tr>
        <tr><td><strong>Alamat & Koordinat GPS</strong></td><td>${asset.alamat || '-'} (${asset.lat || '-'}, ${asset.lng || '-'}) | <strong>Akses Jalan:</strong> ${asset.pinggirJalan === 'Ya' ? 'Pinggir Jalan Utama' : 'Masuk Gang/Di Dalam'}</td></tr>
      </table>

      <div class="section-title">III. ANALISIS DOKUMEN & FAKTA LAPANGAN</div>
      <table>
        <tr><th width="35%">Parameter PMK 120/2024</th><th>Hasil Analisis & Temuan Lapangan</th></tr>
        <tr><td><strong>Surat Permintaan Klarifikasi KPKNL</strong></td><td>Nomor: ${formValues.noKlarifikasiKpknl || 'S-259/MK/KNL.1401/2025'} (Tanggal: ${formValues.tglKlarifikasiKpknl || '15 Desember 2025'})</td></tr>
        <tr><td><strong>Surat Jawaban Tanggapan Satker</strong></td><td>Nomor: ${formValues.noSuratSatker || asset.suratJawaban || '-'} (Tanggal: ${formValues.tglSuratSatker || asset.tglSurat || '-'})</td></tr>
        <tr><td><strong>Peruntukan Riil Saat Ini</strong></td><td>${asset.peruntukanSaatIni || 'Tanah Kosong / Belum Dimanfaatkan Penuh'}</td></tr>
        <tr><td><strong>Kondisi Fisik Bangunan/Tanah</strong></td><td>${asset.kondisi || asset.hasilJawaban || 'Aset dalam kondisi baik/terawat, tidak digunakan untuk tusi utama.'}</td></tr>
        <tr><td><strong>Pengamanan Fisik Aset</strong></td><td>Pagar: ${asset.pengamananPagar ? 'Ada' : 'Tidak Ada'} | Plang BMN: ${asset.pengamananPlang ? 'Terpasang' : 'Belum Terpasang'} | Petugas Jaga: ${asset.pengamananPenjaga ? 'Ada' : 'Tidak Ada'}</td></tr>
        <tr><td><strong>Status Sengketa / Klaim</strong></td><td>${asset.permasalahanSengketa || 'Bebas sengketa dan klaim pihak ketiga.'}</td></tr>
        <tr><td><strong>Rencana Pengguna Barang (Satker)</strong></td><td>"${asset.rekomendasiUser || asset.hasilJawaban || 'Belum ada rencana penggunaan operasional dalam waktu dekat.'}"</td></tr>
        <tr><td><strong>Zonasi RTRW & Potensi</strong></td><td>${asset.zoningName || 'Kawasan Strategis / Perdagangan & Jasa'} (Kategori 1)</td></tr>
      </table>

      <div class="section-title">IV. KESIMPULAN & REKOMENDASI TINDAK LANJUT</div>
      <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:10px; margin-bottom:12px;">
        <p style="margin:0 0 6px;"><strong>Status Kesimpulan Hilir:</strong> <strong>${(asset.statusKesimpulanIdle || 'TIDAK_IDLE').replace('_', ' ')}</strong></p>
        <p style="margin:0 0 6px;"><strong>Dasar Pertimbangan:</strong> ${asset.alasanKesimpulanIdle || asset.rekomendasiUser || 'Berdasarkan klarifikasi dan verifikasi dokumen'}</p>
        ${(asset.alasanKesimpulanIdle && asset.alasanKesimpulanIdle.includes('Rencana')) ? `<p style="margin:0 0 6px; color:#047857;"><strong>Tindak Lanjut PMK 120:</strong> 🟢 <strong>DILAKUKAN PEMANTAUAN</strong> terhadap ${asset.fokusPemantauan || 'Realisasi Alokasi DIPA / Pemanfaatan'} (${asset.targetPemantauan || 'Target TA 2027'}).</p>` : ''}
        <p style="margin:0;"><strong>Rekomendasi Resmi Pengelola:</strong> <strong>${asset.rekomendasi || 'Optimalisasi Penggunaan Mandiri Satker'}</strong></p>
      </div>

      <table class="signature-table">
        <tr>
          <td width="50%">
            Mengetahui,<br>
            <strong>${preset.ketuaJabatan || 'Kepala Seksi PKN'}</strong><br><br><br><br>
            <u><strong>${preset.ketuaNama || 'I Putu Harjaya'}</strong></u><br>
            NIP. ${preset.ketuaNip || '19850101 201012 1 001'}
          </td>
          <td width="50%">
            Denpasar, ${preset.tglSuratTugas || '15 Januari 2026'}<br>
            Anggota Tim Pelaksana,<br><br><br><br>
            <u><strong>${preset.anggota1Nama || 'Gede Shendra'}</strong></u><br>
            NIP. ${preset.anggota1Nip || '19900202 201402 1 002'}
          </td>
        </tr>
      </table>

      <!-- MATRIKS LAMPIRAN RESMI PMK 120 -->
      <div class="page-break"></div>
      <div class="header-kop" style="margin-top:20px;">
        LAMPIRAN ${docTitle}<br>
        FORMAT STANDAR MATRIKS BMN TERINDIKASI IDLE (${docCode})
      </div>
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Kode Barang</th>
            <th>Nama Barang</th>
            <th>NUP</th>
            <th>Lokasi / Alamat</th>
            <th>Peruntukan</th>
            <th>Luas (m²)</th>
            <th>Jml Bgn</th>
            <th>Jenis & No Dokumen</th>
            <th>Batas-Batas</th>
            <th>Kondisi</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td align="center">1</td>
            <td>${asset.kodeBarang || '-'}</td>
            <td>${asset.namaBarang || '-'}</td>
            <td align="center">${asset.nup || '1'}</td>
            <td>${asset.alamat || '-'}</td>
            <td>${asset.peruntukanSaatIni || 'Tanah Kosong'}</td>
            <td align="right">${(asset.luas || 0).toLocaleString('id-ID')}</td>
            <td align="center">${asset.jumlahBangunan || 0}</td>
            <td>${asset.jenisDokumen || 'SHP'}<br><small>${asset.noDokumen || 'Proses'}</small></td>
            <td><small>${batasText}</small></td>
            <td>${asset.kondisi || 'Baik'}</td>
          </tr>
        </tbody>
      </table>

      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 500);
        };
      </script>
    </body>
    </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  },

  /**
   * Generates Microsoft Word (.docx) file matching PMK 120/2024
   */
  async generateDocx(asset, formValues) {
    const docxLib = (typeof docx !== 'undefined' ? docx : (typeof window !== 'undefined' ? window.docx : null));
    if (!docxLib) {
      alert('Library docx.js belum selesai dimuat. Silakan coba lagi.');
      return;
    }

    const formatType = formValues.formatType || 'FORMAT_H';
    const preset = {
      ketuaNama: formValues.ketuaNama || 'I Putu Harjaya',
      ketuaNip: formValues.ketuaNip || '19850101 201012 1 001',
      ketuaJabatan: formValues.ketuaJabatan || 'Kepala Seksi PKN',
      anggota1Nama: formValues.anggota1Nama || 'Gede Shendra',
      anggota1Nip: formValues.anggota1Nip || '19900202 201402 1 002',
      noSuratTugas: formValues.noSuratTugas || 'ST-101/KPKNL.1401/2026',
      tglSuratTugas: formValues.tglSuratTugas || '15 Januari 2026'
    };
    this.saveTeamPresets(preset);

    let docTitle = 'LAPORAN HASIL PENELITIAN BARANG MILIK NEGARA TERINDIKASI IDLE';
    if (formatType === 'FORMAT_G') docTitle = 'LAPORAN HASIL PENELUSURAN BMN TERINDIKASI IDLE';
    if (formatType === 'FORMAT_D') docTitle = 'LAPORAN HASIL PEMANTAUAN PENINJAUAN LAPANGAN BMN IDLE';
    if (formatType === 'FORMAT_F') docTitle = 'BERITA ACARA PENINJAUAN LAPANGAN BMN TERINDIKASI IDLE';

    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType } = docxLib;

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "KEMENTERIAN KEUANGAN REPUBLIK INDONESIA\nDIREKTORAT JENDERAL KEKAYAAN NEGARA\nKPKNL DENPASAR", bold: true, size: 24, font: "Times New Roman" }),
            ],
          }),
          new Paragraph({ text: "\n", font: "Times New Roman" }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: docTitle, bold: true, size: 24, font: "Times New Roman" }),
              new TextRun({ text: `\nPADA ${asset.satker || asset.namaSatker || 'SATKER'}`, bold: true, size: 22, font: "Times New Roman" }),
              new TextRun({ text: "\nNOMOR: LAP-01/KPKNL.1401/2026", bold: true, size: 20, font: "Times New Roman" }),
            ]
          }),
          new Paragraph({ text: "\n", font: "Times New Roman" }),
          new Paragraph({
            children: [
              new TextRun({ text: "I. PENDAHULUAN", bold: true, size: 24, font: "Times New Roman" }),
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ 
                text: `Berdasarkan PMK Nomor 120 Tahun 2024 dan Surat Tugas Kepala KPKNL Denpasar Nomor ${preset.noSuratTugas} tanggal ${preset.tglSuratTugas}, telah dilaksanakan pemeriksaan administratif dan fisik terhadap BMN terindikasi idle pada ${asset.satker || asset.namaSatker || 'Satker'}.`,
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
          new Paragraph({ text: "\n", font: "Times New Roman" }),
          new Paragraph({
            children: [
              new TextRun({ text: "II. IDENTITAS & LEGALITAS OBJEK BMN", bold: true, size: 24, font: "Times New Roman" }),
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Satuan Kerja / Kementerian", bold: true, font: "Times New Roman" })] }),
                  new TableCell({ children: [new Paragraph({ text: `${asset.satker || asset.namaSatker || '-'} (${asset.kementerian || '-'})`, font: "Times New Roman" })] }),
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Kode Barang / NUP", bold: true, font: "Times New Roman" })] }),
                  new TableCell({ children: [new Paragraph({ text: `${asset.kodeBarang || '-'} / ${asset.nup || '-'}`, font: "Times New Roman" })] }),
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Nama Barang & Peruntukan", bold: true, font: "Times New Roman" })] }),
                  new TableCell({ children: [new Paragraph({ text: `${asset.namaBarang || '-'} (${asset.peruntukanSaatIni || 'Tanah Kosong'})`, font: "Times New Roman" })] }),
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Dokumen Kepemilikan", bold: true, font: "Times New Roman" })] }),
                  new TableCell({ children: [new Paragraph({ text: `${asset.jenisDokumen || 'SHP'}: ${asset.noDokumen || 'Dalam Konfirmasi'} a.n. ${asset.atasNamaDokumen || 'Pemerintah RI'}`, font: "Times New Roman" })] }),
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Batas-Batas Tanah", bold: true, font: "Times New Roman" })] }),
                  new TableCell({ children: [new Paragraph({ text: `U: ${asset.batasUtara || '-'}, T: ${asset.batasTimur || '-'}, S: ${asset.batasSelatan || '-'}, B: ${asset.batasBarat || '-'}`, font: "Times New Roman" })] }),
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Luas & Nilai Buku", bold: true, font: "Times New Roman" })] }),
                  new TableCell({ children: [new Paragraph({ text: `${(asset.luas || 0)} m² | Rp ${(asset.nilaiBuku || 0).toLocaleString('id-ID')}`, font: "Times New Roman" })] }),
                ]
              }),
            ]
          }),
          new Paragraph({ text: "\n", font: "Times New Roman" }),
          new Paragraph({
            children: [
              new TextRun({ text: "III. KESIMPULAN & REKOMENDASI", bold: true, size: 24, font: "Times New Roman" }),
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ 
                text: `Kondisi Fisik: ${asset.kondisi || 'Baik/Terawat'}\nPosisi Akses: ${asset.pinggirJalan === 'Ya' ? 'Pinggir Jalan Utama' : 'Masuk Gang'}\nPengamanan: Pagar (${asset.pengamananPagar ? 'Ada' : 'Tidak'}), Plang (${asset.pengamananPlang ? 'Ada' : 'Tidak'})\n\nRekomendasi Resmi Pengelola: ${asset.rekomendasi || 'Sewa Komersial / Kerja Sama Pemanfaatan (KSP)'}.`,
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
          new Paragraph({ text: "\n\n", font: "Times New Roman" }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: `Denpasar, 2 September 2026\nTim Pelaksana KPKNL Denpasar\n\n\n\n(${preset.ketuaNama})\nNIP. ${preset.ketuaNip}`, font: "Times New Roman", size: 24 })
            ]
          })
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `${docTitle.replace(/\s+/g, '_')}_NUP${asset.nup || '1'}.docx`;
    if (typeof saveAs !== 'undefined') {
      saveAs(blob, fileName);
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
    }
  }
};

window.LaporanEngine = LaporanEngine;
document.addEventListener('DOMContentLoaded', () => {
  if (typeof LaporanEngine !== 'undefined') {
    LaporanEngine.init();
  }
});
