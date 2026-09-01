/**
 * Generator Laporan Hasil Penelitian BMN Idle (PMK 120/2024)
 * Supports Word (.docx) Export via docx.js and Printable PDF View via @media print
 */

const LaporanEngine = {
  PRESET_KEY: 'bmn_idle_tim_penelitian_preset',

  loadTeamPresets() {
    try {
      const stored = localStorage.getItem(this.PRESET_KEY);
      return stored ? JSON.parse(stored) : {
        ketuaNama: 'I Putu Harjaya',
        ketuaNip: '19850101 201012 1 001',
        ketuaJabatan: 'Kepala Seksi PKN KPKNL Denpasar',
        anggota1Nama: 'Gede Shendra',
        anggota1Nip: '19900202 201402 1 002',
        anggota1Jabatan: 'Penata Muda PKN',
        anggota2Nama: '',
        anggota2Nip: '',
        anggota2Jabatan: ''
      };
    } catch (e) {
      console.warn('Gagal memuat preset tim penelitian:', e);
      return {};
    }
  },

  saveTeamPresets(data) {
    try {
      localStorage.setItem(this.PRESET_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Gagal menyimpan preset tim penelitian:', e);
    }
  },

  /**
   * Generates printable HTML preview window/modal
   */
  generatePrintView(asset, formValues) {
    const preset = {
      ketuaNama: formValues.ketuaNama || 'I Putu Harjaya',
      ketuaNip: formValues.ketuaNip || '-',
      ketuaJabatan: formValues.ketuaJabatan || 'Ketua Tim',
      anggota1Nama: formValues.anggota1Nama || '',
      anggota1Nip: formValues.anggota1Nip || '',
      anggota2Nama: formValues.anggota2Nama || '',
      anggota2Nip: formValues.anggota2Nip || '',
      noSuratTugas: formValues.noSuratTugas || 'ST-101/KPKNL.1401/2026',
      tglSuratTugas: formValues.tglSuratTugas || '15 Januari 2026',
      noSuratKlarifikasi: formValues.noSuratKlarifikasi || 'S-50/KPKNL.1401/2026',
      tglSuratKlarifikasi: formValues.tglSuratKlarifikasi || '10 Januari 2026',
      noSuratJawaban: formValues.noSuratJawaban || 'S-12/Satker/2026',
      tglSuratJawaban: formValues.tglSuratJawaban || '14 Januari 2026'
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
          font-size: 12pt;
          line-height: 1.6;
          margin: 2.5cm 2cm 2.5cm 2.5cm;
          color: #000;
        }
        .header-kop {
          text-align: center;
          font-weight: bold;
          text-transform: uppercase;
          border-bottom: 3px double #000;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .header-title {
          text-align: center;
          font-weight: bold;
          margin: 20px 0;
          text-transform: uppercase;
        }
        .section-title {
          font-weight: bold;
          margin-top: 15px;
          margin-bottom: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
        }
        th, td {
          border: 1px solid #000;
          padding: 6px 8px;
          font-size: 11pt;
          vertical-align: top;
        }
        th {
          background-color: #f2f2f2;
          text-align: center;
        }
        .signature-table {
          width: 100%;
          border: none;
          margin-top: 40px;
        }
        .signature-table td {
          border: none;
          text-align: center;
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
        PADA ${asset.satker || asset.nama_satker || 'SATUAN KERJA'}<br>
        NOMOR: LAP-01/KPKNL.1401/2026
      </div>

      <div class="section-title">A. PENDAHULUAN</div>
      <p>Berdasarkan Peraturan Menteri Keuangan Nomor 120 Tahun 2024 tentang Tata Cara Pengelolaan Barang Milik Negara Yang Tidak Digunakan Untuk Penyelenggaraan Tugas dan Fungsi Kementerian Negara/Lembaga, dan Surat Tugas Kepala KPKNL Denpasar Nomor: <strong>${preset.noSuratTugas}</strong> tanggal <strong>${preset.tglSuratTugas}</strong>, telah dilaksanakan penelitian administratif dan fisik atas BMN terindikasi idle.</p>

      <div class="section-title">B. OBJEK PENELITIAN</div>
      <table>
        <tr><td width="30%"><strong>Kode Barang / NUP</strong></td><td>${asset.kodeBarang || asset.kode_barang || '-'} / ${asset.nup || '-'}</td></tr>
        <tr><td><strong>Nama Barang / Uraian BMN</strong></td><td>${asset.namaBarang || asset.uraian_bmn || '-'}</td></tr>
        <tr><td><strong>Satuan Kerja</strong></td><td>${asset.satker || asset.nama_satker || '-'}</td></tr>
        <tr><td><strong>Kementerian / Lembaga</strong></td><td>${asset.kementerian || '-'}</td></tr>
        <tr><td><strong>Lokasi / Alamat</strong></td><td>${asset.alamat || '-'}, ${asset.kecamatan || '-'}, ${asset.kabupaten || '-'}</td></tr>
        <tr><td><strong>Luas Tanah / Bangunan</strong></td><td>${asset.luas || asset.luas_m2 || 0} m²</td></tr>
        <tr><td><strong>Nilai Buku</strong></td><td>Rp ${(asset.nilaiBuku || asset.nilai_buku || 0).toLocaleString('id-ID')}</td></tr>
        <tr><td><strong>Koordinat GPS</strong></td><td>${asset.lat || asset.koordinat?.split(',')[0] || '-'}, ${asset.lng || asset.koordinat?.split(',')[1] || '-'}</td></tr>
      </table>

      <div class="section-title">C. ANALISIS SPASIAL & VIIRS NIGHTTIME LIGHTS</div>
      <table>
        <tr><th>Indikator Spasial</th><th>Nilai / Jarak</th><th>Analisis & Potensi</th></tr>
        <tr><td>Jarak ke KPKNL Denpasar</td><td>${asset.distanceToKPKNL || asset.jarak_kpknl || '-'} km</td><td>Proksimitas kantor pengelola barang</td></tr>
        <tr><td>Jarak ke Ibukota Prov. Bali</td><td>${asset.distanceToDenpasar || asset.jarak_denpasar || '-'} km</td><td>Aksesibilitas pusat pemerintahan provinsi</td></tr>
        <tr><td>VIIRS Nighttime Lights Index</td><td>${asset.viirsIndex || 50} / 100</td><td>Indikator aktivitas ekonomi & iluminasi malam hari</td></tr>
      </table>

      <div class="section-title">D. HASIL PENELITIAN & REKOMENDASI PEMANFAATAN</div>
      <p><strong>Hasil Penelitian Fisik:</strong> ${asset.kondisi || asset.catatan || 'Kondisi fisik aset terawat baik dan terindikasi tidak lagi digunakan secara aktif untuk penyelenggaraan tugas dan fungsi satker.'}</p>
      <p><strong>Rekomendasi Tim Penelitian:</strong> <strong>${asset.rekomendasi || 'Sewa Komersial / Kerja Sama Pemanfaatan (KSP)'}</strong></p>

      <div class="section-title">E. PENUTUP & TANDA TANGAN TIM PENELITIAN</div>
      <p>Demikian Laporan Hasil Penelitian BMN Terindikasi Idle ini disusun sebagai bahan pertimbangan penetapan status BMN Idle oleh Pengelola Barang.</p>

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
   * Generates MS Word (.docx) file via docx.js library
   */
  async generateDocx(asset, formValues) {
    if (typeof docx === 'undefined') {
      alert('Library docx.js belum selesai dimuat. Silakan coba lagi dalam beberapa detik.');
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
              new TextRun({ text: "KEMENTERIAN KEUANGAN REPUBLIK INDONESIA", bold: true, size: 24, font: "Times New Roman" }),
              new TextRun({ text: "\nDIREKTORAT JENDERAL KEKAYAAN NEGARA", bold: true, size: 24, font: "Times New Roman" }),
              new TextRun({ text: "\nKANTOR WILAYAH DJKN BALI DAN NUSA TENGGARA", bold: true, size: 24, font: "Times New Roman" }),
              new TextRun({ text: "\nKPKNL DENPASAR", bold: true, size: 24, font: "Times New Roman" }),
            ],
          }),
          new Paragraph({ text: "\n", font: "Times New Roman" }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "LAPORAN HASIL PENELITIAN BARANG MILIK NEGARA TERINDIKASI IDLE", bold: true, size: 26, font: "Times New Roman" }),
              new TextRun({ text: `\nPADA ${asset.satker || asset.nama_satker || 'SATKER'}`, bold: true, size: 24, font: "Times New Roman" }),
              new TextRun({ text: "\nNOMOR: LAP-01/KPKNL.1401/2026", bold: true, size: 22, font: "Times New Roman" }),
            ]
          }),
          new Paragraph({ text: "\n", font: "Times New Roman" }),
          new Paragraph({
            children: [
              new TextRun({ text: "A. PENDAHULUAN", bold: true, size: 24, font: "Times New Roman" }),
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ 
                text: `Berdasarkan Peraturan Menteri Keuangan Nomor 120 Tahun 2024 tentang Tata Cara Pengelolaan BMN Yang Tidak Digunakan Untuk Penyelenggaraan Tugas dan Fungsi Kementerian/Lembaga, dan Surat Tugas Nomor ${preset.noSuratTugas} tanggal ${preset.tglSuratTugas}, telah dilaksanakan penelitian atas BMN terindikasi idle sebagai berikut:`,
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
          new Paragraph({ text: "\n", font: "Times New Roman" }),
          new Paragraph({
            children: [
              new TextRun({ text: "B. OBJEK PENELITIAN", bold: true, size: 24, font: "Times New Roman" }),
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Kode Barang / NUP", bold: true, font: "Times New Roman" })] }),
                  new TableCell({ children: [new Paragraph({ text: `${asset.kodeBarang || asset.kode_barang || '-'} / ${asset.nup || '-'}`, font: "Times New Roman" })] }),
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
                  new TableCell({ children: [new Paragraph({ text: "Satuan Kerja", bold: true, font: "Times New Roman" })] }),
                  new TableCell({ children: [new Paragraph({ text: asset.satker || asset.nama_satker || '-', font: "Times New Roman" })] }),
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Lokasi", bold: true, font: "Times New Roman" })] }),
                  new TableCell({ children: [new Paragraph({ text: `${asset.alamat || '-'}, ${asset.kecamatan || '-'}, ${asset.kabupaten || '-'}`, font: "Times New Roman" })] }),
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Luas Aset", bold: true, font: "Times New Roman" })] }),
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
              new TextRun({ text: "C. REKOMENDASI TIM PENELITIAN", bold: true, size: 24, font: "Times New Roman" }),
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ 
                text: `Berdasarkan hasil penelitian fisik dan analisis spasial, direkomendasikan opsi pemanfaatan: ${asset.rekomendasi || 'Sewa Komersial / Kerja Sama Pemanfaatan (KSP)'}.`,
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
    const fileName = `Laporan_Penelitian_BMN_Idle_${(asset.nup || 'Aset')}.docx`;
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
