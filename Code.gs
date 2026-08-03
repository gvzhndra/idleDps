/**
 * ============================================================================
 * GOOGLE APPS SCRIPT BACKEND & GOOGLE SLIDES EXPORTER FOR BMN IDLE
 * File: Code.gs (KPKNL Denpasar)
 * ============================================================================
 * Fitur:
 * - Export ke Google Slides (1 Aset 1 Slide) langsung dari Google Sheets.
 * - Custom Menu: "💡 BMN Idle Tools"
 * - Web App Data API & Auto Photo Upload Handler.
 * ============================================================================
 */

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('💡 BMN Idle Tools')
    .addItem('✨ Hasilkan Smart Recommendation (Baris Dipilih)', 'generateRecommendationForSelectedRow')
    .addItem('🚀 Hasilkan Smart Recommendation (Seluruh Sheet)', 'generateRecommendationForAllRows')
    .addSeparator()
    .addItem('📊 Ekspor ke Google Slides (1 Aset = 1 Slide)', 'createGoogleSlidesPresentation')
    .addItem('🌐 Buka Web App Dashboard', 'openDashboardDialog')
    .addToUi();
}

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'getData') {
    return fetchBMNDataAsJSON();
  }

  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('BMN Idle Interactive Dashboard - KPKNL Denpasar')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function fetchBMNDataAsJSON() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Data_BMN_Idle');
    if (!sheet) {
      return createJsonResponse({ status: 'error', message: 'Sheet "Data_BMN_Idle" tidak ditemukan.' });
    }

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return createJsonResponse({ status: 'success', data: [] });
    }

    var result = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue;

      var zoningCode = String(row[17] || 'K-1');
      var luasTanah = parseFloat(row[11]) || 0;
      var luasBangunan = parseFloat(row[12]) || 0;
      var kategori = String(row[4] || 'Tanah Kosong');

      var smartSuggestion = calculateSmartRecommendation(zoningCode, luasTanah, luasBangunan, kategori);

      var item = {
        id: String(row[0]),
        kodeBarang: String(row[1] || ''),
        nup: String(row[2] || ''),
        namaAset: String(row[3] || ''),
        kategori: kategori,
        kpknlId: 'denpasar',
        kabupaten: String(row[5] || 'Kota Denpasar'),
        kecamatan: String(row[6] || ''),
        kelurahan: String(row[7] || ''),
        alamat: String(row[8] || ''),
        lat: parseFloat(row[9]) || -8.6705,
        lng: parseFloat(row[10]) || 115.2260,
        luasTanah: luasTanah,
        luasBangunan: luasBangunan,
        nilaiAset: parseFloat(row[13]) || 0,
        potensiPnbpTahun: parseFloat(row[14]) || 0,
        kondisi: String(row[15] || 'Kondisi Baik'),
        statusPenguasaan: String(row[16] || 'Hak Pakai Kemenkeu RI'),
        zoningCode: zoningCode,
        zoningName: String(row[18] || 'Kawasan Perdagangan & Jasa'),
        fotoList: String(row[19] || '').split(',').map(function(url) { return url.trim(); }).filter(function(url) { return url.length > 0; }),
        keterangan: String(row[20] || ''),
        isSpotlight: row[21] === true || String(row[21]).toLowerCase() === 'true',
        rekomendasiUser: String(row[22] || ''),
        catatanTim: String(row[23] || ''),
        smartSuggestionBackend: smartSuggestion
      };

      result.push(item);
    }

    return createJsonResponse({ status: 'success', data: result });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * EKSPOR KE GOOGLE SLIDES (1 ASET = 1 SLIDE)
 */
function createGoogleSlidesPresentation() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Data_BMN_Idle');
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Sheet "Data_BMN_Idle" tidak ditemukan.');
    return;
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    SpreadsheetApp.getUi().alert('Tidak ada data BMN Idle untuk diekspor.');
    return;
  }

  // Buat Google Slides Presentation Baru
  var presentationTitle = 'PORTOFOLIO BMN IDLE KPKNL DENPASAR - ' + Utilities.formatDate(new Date(), 'GMT+8', 'yyyy-MM-dd');
  var deck = SlidesApp.create(presentationTitle);
  var slides = deck.getSlides();
  var titleSlide = slides[0]; // Slide pertama (Judul)

  titleSlide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, 720, 405)
    .getFill().setSolidFill('#F4F6FB');

  var titleBox = titleSlide.insertTextBox('PORTOFOLIO BMN IDLE KPKNL DENPASAR', 50, 100, 620, 80);
  titleBox.getText().getRuns()[0].getTextStyle().setFontSize(24).setBold(true).setForegroundColor('#1E293B');

  var subtitleBox = titleSlide.insertTextBox('Kanwil DJKN Bali dan Nusa Tenggara\nPresentasi & Analisis Spasial Optimalisasi BMN', 50, 190, 620, 60);
  subtitleBox.getText().getRuns()[0].getTextStyle().setFontSize(14).setForegroundColor('#4A90E2');

  // Loop setiap baris aset BMN Idle (1 Baris = 1 Slide)
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;

    var namaAset = String(row[3] || '');
    var kodeBarang = String(row[1] || '');
    var nup = String(row[2] || '');
    var kategori = String(row[4] || '');
    var kabupaten = String(row[5] || '');
    var alamat = String(row[8] || '');
    var luasTanah = row[11] || 0;
    var luasBangunan = row[12] || 0;
    var nilaiAset = row[13] || 0;
    var potensiPnbp = row[14] || 0;
    var zoningName = row[18] || '';
    var rekomendasiUser = row[22] || calculateSmartRecommendation(row[17], luasTanah, luasBangunan, kategori);

    var slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);

    // Banner Header
    var header = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, 720, 50);
    header.getFill().setSolidFill('#4A90E2');
    var headerText = slide.insertTextBox('[Aset #' + i + '] ' + namaAset, 20, 10, 680, 30);
    headerText.getText().getRuns()[0].getTextStyle().setFontSize(16).setBold(true).setForegroundColor('#FFFFFF');

    // Box Metadata
    var metaText = 'Kode Barang / NUP: ' + kodeBarang + ' (NUP ' + nup + ')\n' +
                   'Kategori: ' + kategori + ' | Kab: ' + kabupaten + '\n' +
                   'Alamat: ' + alamat + '\n' +
                   'Luas Tanah / Bangunan: ' + luasTanah + ' m² / ' + luasBangunan + ' m²\n' +
                   'Nilai Aset: Rp ' + Number(nilaiAset).toLocaleString('id-ID') + '\n' +
                   'Zonasi Tata Ruang: ' + zoningName;

    var metaBox = slide.insertTextBox(metaText, 30, 70, 320, 300);
    metaBox.getText().getRuns()[0].getTextStyle().setFontSize(10).setForegroundColor('#1E293B');

    // Box Rekomendasi
    var recText = 'REKOMENDASI OPTIMALISASI:\n' + rekomendasiUser;
    var recBox = slide.insertTextBox(recText, 370, 70, 320, 120);
    recBox.getFill().setSolidFill('#FEF5E7');
    recBox.getText().getRuns()[0].getTextStyle().setFontSize(12).setBold(true).setForegroundColor('#F39C12');
  }

  var url = deck.getUrl();
  SpreadsheetApp.getUi().alert('🎉 Berhasil membuat Google Slides!\n\nBuka link berikut: ' + url);
}

function calculateSmartRecommendation(zoningCode, luasTanah, luasBangunan, kategori) {
  var code = String(zoningCode).toUpperCase().trim();
  var isTanah = kategori === 'Tanah Kosong' || luasBangunan === 0;

  switch (code) {
    case 'K-2':
      return isTanah 
        ? 'Kerja Sama Pemanfaatan (KSP) Beach Club / Boutique Resort / Eco-Lodge'
        : 'Sewa / KSP Restoran Concept / Cafe Pariwisata';
    case 'K-3':
      return 'Alih Status Penggunaan / Pinjam Pakai Satker Kemenkeu/Instansi Lain';
    case 'K-1':
    default:
      return (luasTanah >= 3000) 
        ? 'Sewa Depo Logistik / SPBU / Supermarket Modern' 
        : 'Sewa Komersial Ruko / Showroom / Perkantoran Swasta / UMKM';
    case 'K-4':
      return 'Rumah Dinas Pegawai / Mess Instansi / Sewa Hunian';
    case 'K-5':
      return 'Optimalisasi Terbatas / Agrowisata Organik / Taman Edukasi';
  }
}

function generateRecommendationForSelectedRow() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Data_BMN_Idle');
  if (!sheet) return;

  var range = sheet.getActiveRange();
  var startRow = range.getRow();
  var numRows = range.getNumRows();

  if (startRow <= 1) return;

  for (var r = startRow; r < startRow + numRows; r++) {
    var rowData = sheet.getRange(r, 1, 1, 24).getValues()[0];
    var suggestion = calculateSmartRecommendation(rowData[17], rowData[11], rowData[12], rowData[4]);
    sheet.getRange(r, 23).setValue(suggestion);
  }

  SpreadsheetApp.getUi().alert('✨ Smart Recommendation berhasil diisikan ke Kolom W!');
}

function generateRecommendationForAllRows() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Data_BMN_Idle');
  if (!sheet) return;

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  for (var r = 2; r <= lastRow; r++) {
    var rowData = sheet.getRange(r, 1, 1, 24).getValues()[0];
    if (!rowData[0]) continue;

    var currentRec = String(rowData[22] || '');
    if (!currentRec) {
      var suggestion = calculateSmartRecommendation(rowData[17], rowData[11], rowData[12], rowData[4]);
      sheet.getRange(r, 23).setValue(suggestion);
    }
  }

  SpreadsheetApp.getUi().alert('🚀 Smart Recommendation telah diisikan ke seluruh baris data yang kosong!');
}

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var action = contents.action;

    if (action === 'addPhoto') {
      var assetId = contents.assetId;
      var photoUrl = contents.photoUrl;

      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName('Data_BMN_Idle');
      var data = sheet.getDataRange().getValues();

      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(assetId)) {
          var currentPhotos = String(data[i][19] || '');
          var newPhotos = currentPhotos ? photoUrl + ',' + currentPhotos : photoUrl;
          sheet.getRange(i + 1, 20).setValue(newPhotos);
          return createJsonResponse({ status: 'success', message: 'Foto berhasil disimpan.' });
        }
      }
      return createJsonResponse({ status: 'error', message: 'ID tidak ditemukan.' });
    }

    return createJsonResponse({ status: 'error', message: 'Aksi tidak dikenal.' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function openDashboardDialog() {
  var html = HtmlService.createHtmlOutputFromFile('index')
    .setWidth(1200)
    .setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(html, 'BMN Idle Interactive Dashboard');
}
