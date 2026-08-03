/**
 * ============================================================================
 * GOOGLE APPS SCRIPT BACKEND & SMART RECOMMENDATION ENGINE FOR BMN IDLE
 * File: Code.gs (KPKNL Denpasar)
 * ============================================================================
 * Fitur Tambahan:
 * - Menu Khusus di Google Sheets: "💡 BMN Idle Tools"
 * - Fungsi Otomatisasi Rekomendasi untuk membantu User menentukan opsi optimalisasi.
 * - Custom Formula Sheet: =SMART_RECOMMENDATION(Zoning, LuasTanah, LuasBangunan, Kategori)
 * ============================================================================
 */

/**
 * Otomatis menambahkan Menu "💡 BMN Idle Tools" saat Spreadsheet dibuka
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('💡 BMN Idle Tools')
    .addItem('✨ Hasilkan Smart Recommendation (Baris Dipilih)', 'generateRecommendationForSelectedRow')
    .addItem('🚀 Hasilkan Smart Recommendation (Seluruh Sheet)', 'generateRecommendationForAllRows')
    .addSeparator()
    .addItem('🌐 Buka Web App Dashboard', 'openDashboardDialog')
    .addToUi();
}

/**
 * Web App Entry Point
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'getData') {
    return fetchBMNDataAsJSON();
  }

  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('BMN Idle Interactive Dashboard - KPKNL Denpasar')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Membaca Data dari Sheet "Data_BMN_Idle"
 */
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

      // Smart Recommendation buatan backend (sebagai pembantu / saran otomatis)
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
        rekomendasiUser: String(row[22] || ''), // Rekomendasi input resmi dari user
        catatanTim: String(row[23] || ''),
        smartSuggestionBackend: smartSuggestion // Saran otomatis dari backend Apps Script
      };

      result.push(item);
    }

    return createJsonResponse({ status: 'success', data: result });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * LOGIKA SMART RECOMMENDATION BACKEND (Rule Engine)
 */
function calculateSmartRecommendation(zoningCode, luasTanah, luasBangunan, kategori) {
  var code = String(zoningCode).toUpperCase().trim();
  var isTanah = kategori === 'Tanah Kosong' || luasBangunan === 0;

  switch (code) {
    case 'K-2': // Pariwisata
      return isTanah 
        ? 'Kerja Sama Pemanfaatan (KSP) Beach Club / Boutique Resort / Eco-Lodge'
        : 'Sewa / KSP Restoran Concept / Cafe / Pusat Souvenir Pariwisata';

    case 'K-3': // Pemerintahan
      return 'Alih Status Penggunaan / Pinjam Pakai Satker Kemenkeu/Instansi Lain';

    case 'K-1': // Perdagangan & Jasa
    default:
      if (luasTanah >= 3000) {
        return 'Sewa Lahan Depo Logistik / SPBU / Charging Station / Supermarket Modern';
      }
      return 'Sewa Komersial Ruko / Showroom / Perkantoran Swasta / UMKM';

    case 'K-4': // Permukiman
      return 'Rumah Dinas Pegawai / Mess Instansi / Sewa Hunian';

    case 'K-5': // RTH / Pertanian
      return 'Optimalisasi Terbatas / Agrowisata Organik / Taman Edukasi Lingkungan';
  }
}

/**
 * CUSTOM FORMULA SPREADSHEET (Bisa dipakai di cell: =SMART_RECOMMENDATION(R2, L2, M2, E2))
 */
function SMART_RECOMMENDATION(zoningCode, luasTanah, luasBangunan, kategori) {
  return calculateSmartRecommendation(zoningCode, luasTanah, luasBangunan, kategori);
}

/**
 * Otomatis Mengisi Kolom W (rekomendasiUser) untuk Baris yang Sedang Dipilih di Google Sheet
 */
function generateRecommendationForSelectedRow() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Data_BMN_Idle');
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Error: Sheet "Data_BMN_Idle" tidak ditemukan.');
    return;
  }

  var range = sheet.getActiveRange();
  var startRow = range.getRow();
  var numRows = range.getNumRows();

  if (startRow <= 1) {
    SpreadsheetApp.getUi().alert('Pilih baris data BMN Idle (mulai baris 2).');
    return;
  }

  for (var r = startRow; r < startRow + numRows; r++) {
    var rowData = sheet.getRange(r, 1, 1, 24).getValues()[0];
    var kategori = rowData[4];
    var luasTanah = rowData[11];
    var luasBangunan = rowData[12];
    var zoningCode = rowData[17];

    var suggestion = calculateSmartRecommendation(zoningCode, luasTanah, luasBangunan, kategori);
    sheet.getRange(r, 23).setValue(suggestion); // Isi ke Col W (rekomendasiUser)
  }

  SpreadsheetApp.getUi().alert('✨ Smart Recommendation berhasil diisikan ke Kolom W!');
}

/**
 * Otomatis Mengisi Kolom W untuk Seluruh Baris di Sheet
 */
function generateRecommendationForAllRows() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Data_BMN_Idle');
  if (!sheet) return;

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  for (var r = 2; r <= lastRow; r++) {
    var rowData = sheet.getRange(r, 1, 1, 24).getValues()[0];
    if (!rowData[0]) continue;

    var currentRec = String(rowData[22] || ''); // Col W
    if (!currentRec) { // Hanya isi jika masih kosong
      var suggestion = calculateSmartRecommendation(rowData[17], rowData[11], rowData[12], rowData[4]);
      sheet.getRange(r, 23).setValue(suggestion);
    }
  }

  SpreadsheetApp.getUi().alert('🚀 Smart Recommendation telah berhasil diisikan ke seluruh baris data yang kosong!');
}

/**
 * Menangani Upload Foto & Request POST
 */
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
