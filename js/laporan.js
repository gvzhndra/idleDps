/**
 * Generator Laporan Hasil Penelitian BMN Idle (PMK 120/2024)
 * Supports:
 * - Word (.docx) Export via docx.js
 * - Printable PDF View via @media print matching PMK 120/2024 official structure
 * - Master Tim & Surat Tugas (ST/SK) Management with Google Drive Document Integration
 */

const LaporanEngine = {
  PRESET_KEY: 'bmn_idle_tim_penelitian_preset',
  MASTER_ST_KEY: 'bmn_idle_master_tim_st_list',
  masterTimSTList: [],

  init() {
    this.loadMasterTimSTFromLocal();
    this.fetchMasterTimSTFromSheet();
  },

  loadMasterTimSTFromLocal() {
    try {
      const stored = localStorage.getItem(this.MASTER_ST_KEY);
      if (stored) {
        this.masterTimSTList = JSON.parse(stored);
      } else {
        // Initial fallback default
        this.masterTimSTList = [{
          id_st: 'ST-2026-001',
          no_st: 'ST-101/KPKNL.1401/2026',
          tgl_st: '15 Januari 2026',
          no_sk_tim: 'KEP-45/KPKNL.14/2026',
          wilayah_satker: 'Seluruh Wilayah Provinsi Bali',
          ketua_nama: 'I Putu Harjaya',
          ketua_nip: '19850101 201012 1 001',
          ketua_jabatan: 'Kepala Seksi PKN KPKNL Denpasar',
          anggota1_nama: 'Gede Shendra',
          anggota1_nip: '19900202 201402 1 002',
          anggota1_jabatan: 'Penata Muda PKN',
          anggota2_nama: '',
          anggota2_nip: '',
          anggota2_jabatan: '',
          pdf_st_url: '',
          pdf_sk_url: '',
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

  renderTimSTTable() {
    const tbody = document.getElementById('tim-st-table-body');
    if (!tbody) return;

    if (!this.masterTimSTList || this.masterTimSTList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:12px; color:var(--text-muted);">Belum ada data Surat Tugas yang tersimpan.</td></tr>';
      return;
    }

    tbody.innerHTML = this.masterTimSTList.map((st, idx) => `
      <tr style="border-bottom:1px solid var(--border-subtle);">
        <td style="padding:8px 10px; font-weight:700; color:var(--text-main);">
          <div>${st.no_st || '-'}</div>
          <small style="color:var(--text-muted); font-weight:normal;">Tgl: ${st.tgl_st || '-'}</small>
        </td>
        <td style="padding:8px 10px;">
          <div><strong>Ketua:</strong> ${st.ketua_nama || '-'} (${st.ketua_nip || '-'})</div>
          ${st.anggota1_nama ? `<div><strong>Anggota:</strong> ${st.anggota1_nama}</div>` : ''}
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
    `).join('');
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
   * Generates printable HTML preview window/modal strictly following PMK 120/2024
   */
  generatePrintView(asset, formValues) {
    const preset = {
      ketuaNama: formValues.ketuaNama || 'I Putu Harjaya',
      ketuaNip: formValues.ketuaNip || '-',
      ketuaJabatan: formValues.ketuaJabatan || 'Ketua Tim Penelitian BMN',
      anggota1Nama: formValues.anggota1Nama || 'Gede Shendra',
      anggota1Nip: formValues.anggota1Nip || '-',
      anggota2Nama: formValues.anggota2Nama || '',
      anggota2Nip: formValues.anggota2Nip || '',
      noSuratTugas: formValues.noSuratTugas || 'ST-101/KPKNL.1401/2026',
      tglSuratTugas: formValues.tglSuratTugas || '15 Januari 2026',
      noSuratKlarifikasi: asset.suratJawaban || 'S-50/KPKNL.1401/2026',
      tglSuratKlarifikasi: asset.tglSurat || '10 Januari 2026',
      noSuratJawaban: asset.suratJawaban || '-',
      tglSuratJawaban: asset.tglSurat || '-'
    };

    this.saveTeamPresets(preset);

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Popup blocker aktif! Mohon izinkan popup untuk melihat preview laporan.');
      return;
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Laporan Hasil Penelitian BMN Idle - ${asset.namaBarang || asset.uraian_bmn || 'Aset'}</title>
      <style>
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          line-height: 1.5;
          margin: 2.5cm 2cm 2.5cm 2.5cm;
          color: #000;
        }
        .header-kop {
          text-align: center;
          font-weight: bold;
          text-transform: uppercase;
          border-bottom: 3px double #000;
          padding-bottom: 8px;
          margin-bottom: 18px;
          font-size: 11pt;
          line-height: 1.3;
        }
        .header-title {
          text-align: center;
          font-weight: bold;
          margin: 16px 0;
          text-transform: uppercase;
          font-size: 12pt;
          line-height: 1.4;
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
          padding-left: 24px;
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
        LAPORAN HASIL PENELITIAN<br>
        BARANG MILIK NEGARA TERINDIKASI IDLE<br>
        PADA ${asset.satker || asset.namaSatker || 'SATUAN KERJA'}<br>
        NOMOR: LAP-01/KPKNL.1401/2026
      </div>

      <div class="section-title">I. PENDAHULUAN</div>
      <ol type="1">
        <li><strong>Dasar Penelitian:</strong>
          <ol type="a">
            <li>Peraturan Pemerintah Nomor 27 Tahun 2014 jo PP Nomor 28 Tahun 2020 tentang Pengelolaan BMN/D;</li>
            <li>Peraturan Menteri Keuangan Nomor 120 Tahun 2024 tentang Tata Cara Pengelolaan BMN Yang Tidak Digunakan Untuk Penyelenggaraan Tusi K/L;</li>
            <li>Surat Klarifikasi BMN Terindikasi Idle Nomor: ${asset.suratJawaban || 'S-50/KPKNL.1401/2026'};</li>
            <li>Surat Tugas Kepala KPKNL Denpasar Nomor: <strong>${preset.noSuratTugas}</strong> tanggal <strong>${preset.tglSuratTugas}</strong>.</li>
          </ol>
        </li>
        <li><strong>Latar Belakang:</strong> Dalam rangka akuntabilitas tata kelola BMN (good governance), diperlukan optimalisasi penggunaan aset pada ${asset.kementerian || 'Kementerian/Lembaga'} berupa ${asset.namaBarang || asset.uraian_bmn || 'BMN'} yang berlokasi di ${asset.alamat || '-'}.</li>
        <li><strong>Tujuan & Manfaat:</strong> Memperoleh kepastian administratif, fisik, spasial, dan rencana pemanfaatan/penggunaan terbaik atas BMN terindikasi idle.</li>
      </ol>

      <div class="section-title">II. OBJEK PENELITIAN</div>
      <div class="sub-section-title">1. Identitas Satuan Kerja:</div>
      <table>
        <tr><td width="30%"><strong>Kode Satuan Kerja</strong></td><td>${asset.kodeSatker || '-'}</td></tr>
        <tr><td><strong>Nama Satuan Kerja</strong></td><td>${asset.satker || asset.namaSatker || '-'}</td></tr>
        <tr><td><strong>Kementerian / Lembaga</strong></td><td>${asset.kementerian || '-'}</td></tr>
        <tr><td><strong>Wilayah Pelayanan</strong></td><td>KPKNL Denpasar (Provinsi Bali)</td></tr>
      </table>

      <div class="sub-section-title">2. Identitas Barang Milik Negara (BMN):</div>
      <table>
        <tr><td width="30%"><strong>Kode Barang / NUP</strong></td><td>${asset.kodeBarang || '-'} / ${asset.nup || '-'}</td></tr>
        <tr><td><strong>Nama Barang / Jenis</strong></td><td>${asset.namaBarang || asset.uraian_bmn || '-'} (${asset.jenisBarang || 'Tanah/Bangunan'})</td></tr>
        <tr><td><strong>Luas Aset</strong></td><td>${asset.luas || asset.luas_m2 || 0} m²</td></tr>
        <tr><td><strong>Nilai Buku</strong></td><td>Rp ${(asset.nilaiBuku || asset.nilai_buku || 0).toLocaleString('id-ID')}</td></tr>
        <tr><td><strong>Alamat / Lokasi</strong></td><td>${asset.alamat || '-'}, Kec. ${asset.kecamatan || '-'}, ${asset.kabupaten || '-'}</td></tr>
        <tr><td><strong>Koordinat GPS</strong></td><td>${asset.lat || '-'}, ${asset.lng || '-'}</td></tr>
      </table>

      <div class="section-title">III. ANALISIS DATA DAN DOKUMEN</div>
      <ol type="1" start="6">
        <li><strong>Sumber Data:</strong> Rekonsiliasi SIMAN/SAKTI, Surat Jawaban Satker No: <strong>${asset.suratJawaban || '-'}</strong>, dan berkas kepemilikan.</li>
        <li><strong>Status Kepemilikan & Penatausahaan:</strong> Tercatat aktif pada Master Aset KPKNL Denpasar.</li>
        <li><strong>Analisa Rencana Pengguna Barang:</strong> "${asset.rekomendasiUser || asset.hasilJawaban || 'Belum ada rencana penggunaan operasional dalam waktu dekat.'}"</li>
      </ol>

      <div class="section-title">IV. ANALISIS FISIK, SPASIAL & LINGKUNGAN</div>
      <table>
        <tr><th>Parameter Fisik & Lingkungan</th><th>Kondisi / Analisis</th></tr>
        <tr><td>Kondisi Fisik Lapangan</td><td>${asset.kondisi || asset.hasilJawaban || 'Aset dalam kondisi baik/terawat, tidak difungsikan penuh untuk tusi.'}</td></tr>
        <tr><td>Analisis Zonasi RTRW / Pola Ruang</td><td>${asset.zoningName || 'Kawasan Strategis / Perdagangan & Jasa'} (Kategori 1)</td></tr>
        <tr><td>Proksimitas & Aksesibilitas</td><td>Jarak ke KPKNL Denpasar: ${asset.distanceToKPKNL || '-'} km | Jarak ke Pusat Kota: ${asset.distanceToDenpasar || '-'} km</td></tr>
        <tr><td>Indeks Aktivitas Ekonomi (VIIRS)</td><td>Skor ${asset.viirsIndex || 50}/100 (Aktivitas ekonomi malam hari)</td></tr>
        <tr><td>Catatan Khusus Tim Lapangan</td><td>${asset.catatanTim || 'Akses jalan memadai, berpotensi tinggi untuk skema kerja sama pemanfaatan.'}</td></tr>
      </table>

      <div class="section-title">V. KESIMPULAN & TINDAK LANJUT</div>
      <p><strong>Kesimpulan:</strong> BMN tersebut terindikasi tidak digunakan untuk penyelenggaraan tugas dan fungsi (Tusi) Kementerian/Lembaga secara optimal.</p>
      <p><strong>Rekomendasi Tindak Lanjut:</strong> <strong>${asset.rekomendasi || asset.rekomendasiUser || 'Sewa Komersial / Kerja Sama Pemanfaatan (KSP)'}</strong>.</p>

      <table class="signature-table">
        <tr>
          <td width="50%">
            Mengetahui,<br>
            <strong>${preset.ketuaJabatan}</strong><br><br><br><br>
            <u><strong>${preset.ketuaNama}</strong></u><br>
            NIP. ${preset.ketuaNip}
          </td>
          <td width="50%">
            Denpasar, 2 September 2026<br>
            Anggota Tim Penelitian,<br><br><br><br>
            <u><strong>${preset.anggota1Nama || 'Gede Shendra'}</strong></u><br>
            NIP. ${preset.anggota1Nip || '-'}
          </td>
        </tr>
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
   * Generates MS Word (.docx) file via docx.js library strictly formatted to PMK 120/2024
   */
  async generateDocx(asset, formValues) {
    if (typeof docx === 'undefined') {
      alert('Library docx.js belum selesai dimuat. Silakan coba lagi.');
      return;
    }

    const preset = {
      ketuaNama: formValues.ketuaNama || 'I Putu Harjaya',
      ketuaNip: formValues.ketuaNip || '-',
      ketuaJabatan: formValues.ketuaJabatan || 'Kepala Seksi PKN',
      anggota1Nama: formValues.anggota1Nama || 'Gede Shendra',
      anggota1Nip: formValues.anggota1Nip || '-',
      noSuratTugas: formValues.noSuratTugas || 'ST-101/KPKNL.1401/2026',
      tglSuratTugas: formValues.tglSuratTugas || '15 Januari 2026'
    };

    this.saveTeamPresets(preset);

    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType } = docx;

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
              new TextRun({ text: "LAPORAN HASIL PENELITIAN BARANG MILIK NEGARA TERINDIKASI IDLE", bold: true, size: 26, font: "Times New Roman" }),
              new TextRun({ text: `\nPADA ${asset.satker || asset.namaSatker || 'SATKER'}`, bold: true, size: 24, font: "Times New Roman" }),
              new TextRun({ text: "\nNOMOR: LAP-01/KPKNL.1401/2026", bold: true, size: 22, font: "Times New Roman" }),
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
                text: `Berdasarkan PMK Nomor 120 Tahun 2024 tentang Pengelolaan BMN Yang Tidak Digunakan Untuk Tusi K/L dan Surat Tugas Nomor ${preset.noSuratTugas} tanggal ${preset.tglSuratTugas}, telah dilaksanakan penelitian fisik dan administratif terhadap aset BMN terindikasi idle.`,
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
          new Paragraph({ text: "\n", font: "Times New Roman" }),
          new Paragraph({
            children: [
              new TextRun({ text: "II. OBJEK PENELITIAN", bold: true, size: 24, font: "Times New Roman" }),
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Kode Satker / Satuan Kerja", bold: true, font: "Times New Roman" })] }),
                  new TableCell({ children: [new Paragraph({ text: `${asset.kodeSatker || '-'} / ${asset.satker || asset.namaSatker || '-'}`, font: "Times New Roman" })] }),
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
                  new TableCell({ children: [new Paragraph({ text: "Nama Barang", bold: true, font: "Times New Roman" })] }),
                  new TableCell({ children: [new Paragraph({ text: asset.namaBarang || asset.uraian_bmn || '-', font: "Times New Roman" })] }),
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Alamat & Lokasi", bold: true, font: "Times New Roman" })] }),
                  new TableCell({ children: [new Paragraph({ text: `${asset.alamat || '-'}, Kec. ${asset.kecamatan || '-'}, ${asset.kabupaten || '-'}`, font: "Times New Roman" })] }),
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Luas Tanah / Bangunan", bold: true, font: "Times New Roman" })] }),
                  new TableCell({ children: [new Paragraph({ text: `${asset.luas || asset.luas_m2 || 0} m²`, font: "Times New Roman" })] }),
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Nilai Buku", bold: true, font: "Times New Roman" })] }),
                  new TableCell({ children: [new Paragraph({ text: `Rp ${(asset.nilaiBuku || asset.nilai_buku || 0).toLocaleString('id-ID')}`, font: "Times New Roman" })] }),
                ]
              }),
            ]
          }),
          new Paragraph({ text: "\n", font: "Times New Roman" }),
          new Paragraph({
            children: [
              new TextRun({ text: "III. ANALISIS FISIK, SPASIAL & REKOMENDASI", bold: true, size: 24, font: "Times New Roman" }),
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ 
                text: `Kondisi Fisik: ${asset.kondisi || 'Baik / Terawat'}\nZonasi Pola Ruang: ${asset.zoningName || 'Kawasan Strategis'}\nJarak ke KPKNL: ${asset.distanceToKPKNL || '-'} km\n\nRekomendasi Tindak Lanjut: ${asset.rekomendasi || 'Sewa Komersial / Kerja Sama Pemanfaatan (KSP)'}.`,
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
          new Paragraph({ text: "\n\n", font: "Times New Roman" }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: `Denpasar, 2 September 2026\nTim Penelitian BMN Idle KPKNL Denpasar\n\n\n\n(${preset.ketuaNama})\nNIP. ${preset.ketuaNip}`, font: "Times New Roman", size: 24 })
            ]
          })
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `Laporan_Penelitian_PMK120_${(asset.nup || 'Aset')}.docx`;
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
