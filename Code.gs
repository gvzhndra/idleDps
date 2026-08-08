/**
 * ============================================================================
 * GOOGLE APPS SCRIPT BACKEND & DRIVE PHOTO UPLOADER FOR BMN IDLE
 * File: Code.gs (KPKNL Denpasar)
 * ============================================================================
 * Features:
 * - Data API (doGet) for BMN Idle records & User Login authentication.
 * - SHA-256 Password Hashing via onEdit trigger (auto-hash when typed in sheet).
 * - Multi-Photo Base64 Uploader (doPost): Creates JPG files in Google Drive
 *   Folder "BMN_Idle_Photos", sets permissions, & appends URLs to BMN_Idle sheet.
 * - Google Slides Exporter (1 Asset = 1 Slide) with selective row export.
 * ============================================================================
 */

// ============================================================================
// SHA-256 Helper (Apps Script uses Utilities.computeDigest)
// ============================================================================

/**
 * Converts a plain-text string to SHA-256 hex digest.
 * @param {string} text - Plain text input
 * @returns {string} Lowercase hex string (64 chars)
 */
function sha256Hex(text) {
  var rawHash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    text,
    Utilities.Charset.UTF_8
  );
  return rawHash.map(function(byte) {
    // Convert signed byte to unsigned, then to hex
    var hex = (byte & 0xFF).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// ============================================================================
// onEdit TRIGGER — Auto-hash password when typed in Users sheet
// ============================================================================

/**
 * Triggered automatically when any cell is edited.
 * If the edit is in the "Users" sheet, column C (password_hash, index 3),
 * AND the value doesn't look like a SHA-256 hash already (64 hex chars),
 * it will replace the plain text with its SHA-256 hash.
 *
 * IMPORTANT: You must install this as a trigger:
 *   Extensions > Apps Script > Triggers > Add Trigger > onEdit > From spreadsheet > On edit
 */
function onEdit(e) {
  var range = e.range;
  var sheet = range.getSheet();

  // Only act on the "Users" sheet, column 3 (C = password_hash)
  if (sheet.getName() !== 'Users') return;
  if (range.getColumn() !== 3) return;

  var value = String(range.getValue()).trim();

  // If it's already a 64-char hex string (SHA-256), leave it as-is
  if (/^[0-9a-f]{64}$/.test(value)) return;

  // If the cell is empty, skip
  if (!value || value === '') return;

  // Hash the plain-text password and write it back
  var hashed = sha256Hex(value);
  range.setValue(hashed);

  // Optionally add a note so admin knows it was auto-hashed
  range.setNote('Auto-hashed via SHA-256 on ' + new Date().toLocaleString('id-ID'));

  SpreadsheetApp.getActiveSpreadsheet().toast(
    '🔐 Password untuk baris ' + range.getRow() + ' telah otomatis di-hash (SHA-256).',
    'Auto-Hash Selesai',
    4
  );
}

// ============================================================================
// App Functions
// ============================================================================

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('💡 BMN Idle Tools')
    .addItem('📊 Ekspor ke Google Slides (Slide Presentasi)', 'createGoogleSlidesPresentation')
    .addItem('🔑 Inisialisasi Sheet Users & Akses', 'initUsersSheet')
    .addItem('🔐 Hash Semua Password Lama di Sheet Users', 'hashAllPlaintextPasswords')
    .addSeparator()
    .addItem('🗺️ Setup/Reset Tab Master Kecamatan Bali', 'setupMasterKecamatan')
    .addSeparator()
    .addItem('🌐 Buka Dashboard Web App', 'openDashboardDialog')
    .addToUi();
}

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'getData') {
    return fetchBMNDataAsJSON();
  }

  if (e && e.parameter && e.parameter.action === 'getCentroids') {
    return fetchCentroidsAsJSON();
  }

  if (e && e.parameter && e.parameter.action === 'getPhotos') {
    return fetchPhotoMapAsJSON();
  }

  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('BMN Idle Interactive Dashboard - KPKNL Denpasar')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function fetchBMNDataAsJSON() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('BMN_Idle') || ss.getSheetByName('denpasar saja');
    if (!sheet) {
      return createJsonResponse({ status: 'error', message: 'Sheet "BMN_Idle" atau "denpasar saja" tidak ditemukan.' });
    }

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return createJsonResponse({ status: 'success', data: [] });
    }

    var result = [];
    var headers = data[0];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      // Skip empty placeholder / dummy rows
      var kodeSatker = String(row[0] || '').trim();
      var namaSatker = String(row[2] || '').trim();
      var namaBarang = String(row[8] || '').trim();
      if (!kodeSatker && !namaSatker && !namaBarang) continue;

      var item = {};
      for (var h = 0; h < headers.length; h++) {
        item[headers[h]] = row[h];
      }

      result.push(item);
    }

    return createJsonResponse({ status: 'success', data: result });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var action = contents.action;

    if (action === 'login') {
      return handleUserLogin(contents.username, contents.passwordHash || contents.password);
    }

    if (action === 'uploadBase64Photos') {
      return handleMultiPhotoUploadToDrive(contents.assetId, contents.photos);
    }

    if (action === 'updateAsset') {
      return handleUpdateAssetInSheet(contents);
    }

    return createJsonResponse({ status: 'error', message: 'Aksi tidak dikenal.' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * Validates login against Google Sheet "Users" tab.
 * Supports case-insensitive username matching, plain-text passwords,
 * and SHA-256 password hashes.
 */
function handleUserLogin(username, passwordInput) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Users');

  var cleanUser = String(username || '').trim().toLowerCase();
  var cleanPass = String(passwordInput || '').trim();
  var inputHash = /^[0-9a-f]{64}$/i.test(cleanPass) ? cleanPass.toLowerCase() : sha256Hex(cleanPass);

  if (!sheet) {
    // Fallback if Users sheet is not yet created
    var adminHash = sha256Hex('bmnidle2026');
    if ((cleanUser === 'admin_kpknl' || cleanUser === 'admin' || cleanUser === 'kpknl') &&
        (cleanPass === 'bmnidle2026' || inputHash === adminHash)) {
      return createJsonResponse({
        status: 'success',
        user: { username: 'admin_kpknl', name: 'Admin KPKNL Denpasar', role: 'Admin KPKNL' }
      });
    }
    return createJsonResponse({ status: 'error', message: 'Sheet Users tidak ditemukan.' });
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return createJsonResponse({ status: 'error', message: 'Tidak ada data user di sheet Users.' });
  }

  // Columns: [user_id (0), username (1), password_hash/plain (2), nama_lengkap (3), role (4), status_aktif (5)]
  for (var i = 1; i < data.length; i++) {
    var rowUser   = String(data[i][1] || '').trim().toLowerCase();
    var rowPass   = String(data[i][2] || '').trim();
    var rowPassLower = rowPass.toLowerCase();
    var rowStatus = String(data[i][5] || 'AKTIF').trim().toUpperCase();

    if (rowUser === cleanUser) {
      if (rowStatus !== 'AKTIF' && rowStatus !== 'TRUE' && rowStatus !== '1' && rowStatus !== '') {
        return createJsonResponse({ status: 'error', message: 'Akun ini sedang tidak aktif.' });
      }

      // Check matching: plain-text match OR SHA-256 hash match OR double hash match
      var isMatch = (rowPass === cleanPass) ||
                    (rowPassLower === inputHash) ||
                    (sha256Hex(rowPass) === inputHash);

      if (isMatch) {
        return createJsonResponse({
          status: 'success',
          user: {
            username: String(data[i][1]).trim(),
            name: String(data[i][3] || data[i][1]).trim(),
            role: String(data[i][4] || 'Admin KPKNL').trim()
          }
        });
      } else {
        return createJsonResponse({ status: 'error', message: 'Password salah.' });
      }
    }
  }

  return createJsonResponse({ status: 'error', message: 'Username "' + username + '" tidak ditemukan.' });
}

/**
 * Updates asset record in Google Sheet "BMN_Idle" tab.
 */
function handleUpdateAssetInSheet(contents) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('BMN_Idle') || ss.getSheets()[0];
  if (!sheet) {
    return createJsonResponse({ status: 'error', message: 'Sheet BMN_Idle tidak ditemukan.' });
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return createJsonResponse({ status: 'error', message: 'Sheet kosong.' });
  }

  var headers = data[0];
  var idCol = headers.indexOf('id');
  var satkerCol = headers.indexOf('kode_satker');
  var barangCol = headers.indexOf('kode_barang');
  var nupCol = headers.indexOf('nup');
  var namaBarangCol = headers.indexOf('nama_barang');
  var kondisiCol = headers.indexOf('HASIL JAWABAN');
  var rekomendasiCol = headers.indexOf('rekomendasi_user');
  var catatanCol = headers.indexOf('CATATAN_REKONSILIASI');
  var luasCol = headers.indexOf('luas');
  var pinCol = headers.indexOf('is_pinned');
  if (pinCol === -1 && contents.isPinned !== undefined) {
    pinCol = headers.length;
    sheet.getRange(1, pinCol + 1).setValue('is_pinned');
  }

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var matchById = (idCol >= 0 && String(row[idCol]) === String(contents.assetId));
    var matchByKeys = (satkerCol >= 0 && barangCol >= 0 && nupCol >= 0 &&
                       String(row[satkerCol]) === String(contents.kodeSatker) &&
                       String(row[barangCol]) === String(contents.kodeBarang) &&
                       String(row[nupCol]) === String(contents.nup));

    if (matchById || matchByKeys) {
      if (namaBarangCol >= 0 && contents.namaBarang) sheet.getRange(i + 1, namaBarangCol + 1).setValue(contents.namaBarang);
      if (kondisiCol >= 0 && contents.kondisi) sheet.getRange(i + 1, kondisiCol + 1).setValue(contents.kondisi);
      if (rekomendasiCol >= 0 && contents.rekomendasiUser) sheet.getRange(i + 1, rekomendasiCol + 1).setValue(contents.rekomendasiUser);
      if (catatanCol >= 0 && contents.catatanTim) sheet.getRange(i + 1, catatanCol + 1).setValue(contents.catatanTim);
      if (luasCol >= 0 && contents.luas !== undefined) sheet.getRange(i + 1, luasCol + 1).setValue(contents.luas);
      if (pinCol >= 0 && contents.isPinned !== undefined) sheet.getRange(i + 1, pinCol + 1).setValue(contents.isPinned ? 'TRUE' : 'FALSE');

      return createJsonResponse({ status: 'success', message: 'Data aset berhasil diperbarui di Google Sheets.' });
    }
  }

  return createJsonResponse({ status: 'warning', message: 'Aset tidak ditemukan di baris sheet.' });
}

// ============================================================================
// BATCH HASH: Convert all remaining plain-text passwords in Users sheet
// Run once via: BMN Idle Tools > Hash Semua Password Lama
// ============================================================================

function hashAllPlaintextPasswords() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Users');
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Sheet "Users" tidak ditemukan.');
    return;
  }

  var data = sheet.getDataRange().getValues();
  var count = 0;

  for (var i = 1; i < data.length; i++) {
    var currentValue = String(data[i][2]).trim();
    if (!currentValue) continue;

    // If it's NOT a 64-char hex SHA-256 hash, it's still plain text — hash it
    if (!/^[0-9a-f]{64}$/.test(currentValue)) {
      var hashed = sha256Hex(currentValue);
      sheet.getRange(i + 1, 3).setValue(hashed);
      sheet.getRange(i + 1, 3).setNote('Converted from plain text to SHA-256 on ' + new Date().toLocaleString('id-ID'));
      count++;
    }
  }

  SpreadsheetApp.getUi().alert(
    '✅ Selesai! ' + count + ' password berhasil di-hash ke SHA-256.\n' +
    'Semua password baru yang Anda ketik di kolom C akan otomatis di-hash oleh trigger onEdit.'
  );
}

// ============================================================================
// initUsersSheet — Creates Users sheet with SHA-256 hashed passwords
// ============================================================================

function initUsersSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Users');

  if (!sheet) {
    sheet = ss.insertSheet('Users');

    // Header row with clear column names
    var headers = ['user_id', 'username', 'password_hash', 'nama_lengkap', 'role', 'status_aktif'];
    sheet.appendRow(headers);

    // Format header row
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#1e293b');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setFontSize(11);

    // Default accounts with SHA-256 hashes
    // admin_kpknl    → bmnidle2026
    // petugas_satker → satker2026
    // viewer         → viewer2026
    sheet.appendRow(['USR001', 'admin_kpknl',    sha256Hex('bmnidle2026'), 'Admin KPKNL Denpasar',   'Admin KPKNL',       'AKTIF']);
    sheet.appendRow(['USR002', 'petugas_satker',  sha256Hex('satker2026'),  'Verifikator Satker BMN', 'Verifikator Satker', 'AKTIF']);
    sheet.appendRow(['USR003', 'viewer',          sha256Hex('viewer2026'),  'Tamu / Executive Viewer', 'Viewer',            'AKTIF']);

    // Add note to password column header so team knows the convention
    sheet.getRange(1, 3).setNote(
      'KOLOM INI MENYIMPAN SHA-256 HASH.\n\n' +
      'Cara menambah user baru:\n' +
      '1. Tambah baris baru di bawah\n' +
      '2. Isi kolom A (user_id), B (username), C (ketik password biasa)\n' +
      '3. Kolom C akan OTOMATIS di-hash saat Anda selesai mengetik (via trigger onEdit)\n' +
      '4. Isi kolom D (nama), E (role), F = AKTIF'
    );

    // Set column widths for readability
    sheet.setColumnWidth(1, 80);
    sheet.setColumnWidth(2, 130);
    sheet.setColumnWidth(3, 360); // password_hash column needs to be wider
    sheet.setColumnWidth(4, 200);
    sheet.setColumnWidth(5, 150);
    sheet.setColumnWidth(6, 100);

    // Freeze header row
    sheet.setFrozenRows(1);

    SpreadsheetApp.getUi().alert(
      '✨ Sheet "Users" berhasil dibuat!\n\n' +
      'Password sudah di-hash SHA-256. Akun default:\n' +
      '• admin_kpknl / bmnidle2026\n' +
      '• petugas_satker / satker2026\n' +
      '• viewer / viewer2026\n\n' +
      '⚠️ Jangan lupa: Install trigger onEdit agar auto-hash berjalan saat menambah user baru!\n' +
      '(Extensions > Apps Script > Triggers > + Add Trigger > pilih onEdit)'
    );
  } else {
    SpreadsheetApp.getUi().alert(
      'Sheet "Users" sudah ada.\n\n' +
      'Gunakan menu "Hash Semua Password Lama" jika kolom password masih berisi plain text.'
    );
  }
}

// ============================================================================
// Photo Upload to Google Drive
// ============================================================================

function handleMultiPhotoUploadToDrive(assetId, base64PhotoArray) {
  if (!Array.isArray(base64PhotoArray) || base64PhotoArray.length === 0) {
    return createJsonResponse({ status: 'error', message: 'Tidak ada foto yang dikirim.' });
  }

  // ── 1. Upload each base64 image to Google Drive ────────────────────────────
  var folders = DriveApp.getFoldersByName('BMN_Idle_Photos');
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder('BMN_Idle_Photos');
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var uploadedUrls = [];

  for (var k = 0; k < base64PhotoArray.length; k++) {
    var rawBase64 = base64PhotoArray[k];
    var base64Data = rawBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
    var blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      'image/jpeg',
      'BMN_' + assetId + '_' + (k + 1) + '_' + new Date().getTime() + '.jpg'
    );

    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Use Google CDN URL format so <img> and background-image CSS can render it without CORS/cookie blocking
    var fileUrl = 'https://lh3.googleusercontent.com/d/' + file.getId();
    uploadedUrls.push(fileUrl);
  }

  // ── 2. Write URLs back to BMN_Idle sheet (foto_urls column) ───────────────
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('BMN_Idle') || ss.getSheetByName('denpasar saja');
  if (sheet) {
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    // Find or create the foto_urls column
    var fotoColIdx = headers.indexOf('foto_urls');
    if (fotoColIdx === -1) {
      // Append new column header at end
      fotoColIdx = headers.length;
      sheet.getRange(1, fotoColIdx + 1).setValue('foto_urls');
    }

    // Find the matching row: try matching by 'id' column first, then by kode_satker+kode_barang+nup
    var idColIdx = headers.indexOf('id');
    var satkerColIdx = headers.indexOf('kode_satker');
    var barangColIdx = headers.indexOf('kode_barang');
    var nupColIdx = headers.indexOf('nup');
    var assetIdStr = String(assetId).trim();

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowId = idColIdx >= 0 ? String(row[idColIdx]).trim() : '';
      var rowSatker = satkerColIdx >= 0 ? String(row[satkerColIdx]).trim() : '';
      var rowBarang = barangColIdx >= 0 ? String(row[barangColIdx]).trim() : '';
      var rowNup = nupColIdx >= 0 ? String(row[nupColIdx]).trim() : '';

      // Build a composite key matching the frontend BMN-ID format "KS-KB-NUP"
      var compositeKey = rowSatker + '-' + rowBarang + '-' + rowNup;

      var matched = (rowId !== '' && rowId === assetIdStr) ||
                    (compositeKey.toLowerCase() === assetIdStr.toLowerCase()) ||
                    (String(row[0]).trim() === assetIdStr);

      if (matched) {
        var existing = String(data[i][fotoColIdx] || '').trim();
        var newVal = uploadedUrls.join(',') + (existing ? ',' + existing : '');
        sheet.getRange(i + 1, fotoColIdx + 1).setValue(newVal);
        break;
      }
    }
  }

  // ── 3. Also write to dedicated BMN_Asset_Photos tab for permanent record ───
  var photoSheet = ss.getSheetByName('BMN_Asset_Photos');
  if (!photoSheet) {
    photoSheet = ss.insertSheet('BMN_Asset_Photos');
    photoSheet.getRange(1, 1, 1, 4).setValues([['asset_id', 'foto_url', 'uploaded_at', 'file_name']]);
    var hdr = photoSheet.getRange(1, 1, 1, 4);
    hdr.setBackground('#1a237e');
    hdr.setFontColor('#ffffff');
    hdr.setFontWeight('bold');
    photoSheet.setFrozenRows(1);
  }

  var now = new Date().toLocaleString('id-ID');
  for (var j = 0; j < uploadedUrls.length; j++) {
    photoSheet.appendRow([assetId, uploadedUrls[j], now, 'BMN_' + assetId + '_' + (j + 1) + '.jpg']);
  }

  return createJsonResponse({
    status: 'success',
    message: 'Berhasil mengunggah ' + uploadedUrls.length + ' foto ke Google Drive!',
    urls: uploadedUrls
  });
}

// ============================================================================
// Helpers
// ============================================================================

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Membaca semua URL foto permanen dari:
 *   1. Tab BMN_Asset_Photos (log per-foto terbaru)
 *   2. Kolom foto_urls di BMN_Idle sheet (fallback)
 * Mengembalikan map: { assetId: ['url1', 'url2', ...] }
 * Endpoint: ?action=getPhotos
 */
function fetchPhotoMapAsJSON() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var photoMap = {};

    // ── Source 1: BMN_Asset_Photos tab (most reliable) ───────────────────────
    var photoSheet = ss.getSheetByName('BMN_Asset_Photos');
    if (photoSheet) {
      var pData = photoSheet.getDataRange().getValues();
      // columns: asset_id, foto_url, uploaded_at, file_name
      for (var p = 1; p < pData.length; p++) {
        var pid = String(pData[p][0]).trim();
        var purl = String(pData[p][1]).trim();
        if (pid && purl) {
          if (!photoMap[pid]) photoMap[pid] = [];
          if (photoMap[pid].indexOf(purl) === -1) {
            photoMap[pid].push(purl);
          }
        }
      }
    }

    // ── Source 2: foto_urls column in BMN_Idle sheet (fallback / additional) ─
    var bmnSheet = ss.getSheetByName('BMN_Idle') || ss.getSheetByName('denpasar saja');
    if (bmnSheet) {
      var bData = bmnSheet.getDataRange().getValues();
      var bHeaders = bData[0];
      var fotoColIdx = bHeaders.indexOf('foto_urls');
      var idColIdx = bHeaders.indexOf('id');
      var satkerColIdx = bHeaders.indexOf('kode_satker');
      var barangColIdx = bHeaders.indexOf('kode_barang');
      var nupColIdx = bHeaders.indexOf('nup');

      if (fotoColIdx >= 0) {
        for (var b = 1; b < bData.length; b++) {
          var bRow = bData[b];
          var cellVal = String(bRow[fotoColIdx] || '').trim();
          if (!cellVal) continue;

          // Determine asset ID
          var bid = idColIdx >= 0 ? String(bRow[idColIdx]).trim() : '';
          if (!bid && satkerColIdx >= 0 && barangColIdx >= 0 && nupColIdx >= 0) {
            bid = String(bRow[satkerColIdx]).trim() + '-' +
                  String(bRow[barangColIdx]).trim() + '-' +
                  String(bRow[nupColIdx]).trim();
          }
          if (!bid) continue;

          var urls = cellVal.split(',').map(function(u) { return u.trim(); }).filter(function(u) { return u.length > 0; });
          if (!photoMap[bid]) photoMap[bid] = [];
          urls.forEach(function(u) {
            if (photoMap[bid].indexOf(u) === -1) photoMap[bid].push(u);
          });
        }
      }
    }

    return createJsonResponse({ status: 'success', photos: photoMap });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}


function openDashboardDialog() {
  var html = HtmlService.createHtmlOutputFromFile('index')
    .setWidth(1280)
    .setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(html, 'BMN Idle Interactive Dashboard');
}

// ============================================================================
// MASTER KECAMATAN SETUP — Auto-creates & populates Master_Kecamatan tab
// ============================================================================

/**
 * One-click setup: Membuat (atau me-reset) tab "Master_Kecamatan" di Google Sheet
 * dan mengisi data centroid GPS untuk 57 Kecamatan se-Provinsi Bali.
 *
 * Cara menjalankan:
 *   Menu Google Sheet ➔ 💡 BMN Idle Tools ➔ 🗺️ Setup/Reset Tab Master Kecamatan Bali
 *
 * Kolom output: kode_kec | kabupaten | kecamatan | lat_centroid | lng_centroid
 */
function setupMasterKecamatan() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = 'Master_Kecamatan';

  // Remove existing sheet if any, then recreate fresh
  var existing = ss.getSheetByName(sheetName);
  if (existing) ss.deleteSheet(existing);

  var sheet = ss.insertSheet(sheetName);

  // ── Header Row ─────────────────────────────────────────────────────────────
  var headers = ['kode_kec', 'kabupaten', 'kecamatan', 'lat_centroid', 'lng_centroid'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Style header
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#1a237e');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');

  // ── Data: 57 Kecamatan se-Bali ────────────────────────────────────────────
  // Format: [kode_kec, kabupaten, kecamatan, lat_centroid, lng_centroid]
  var data = [
    // Kota Denpasar
    ['KEC-DPS-01', 'Kota Denpasar',      'Denpasar Selatan', -8.6850,  115.2200],
    ['KEC-DPS-02', 'Kota Denpasar',      'Denpasar Barat',   -8.6650,  115.2000],
    ['KEC-DPS-03', 'Kota Denpasar',      'Denpasar Utara',   -8.6300,  115.2100],
    ['KEC-DPS-04', 'Kota Denpasar',      'Denpasar Timur',   -8.6500,  115.2400],

    // Kabupaten Badung
    ['KEC-BDG-01', 'Kabupaten Badung',   'Kuta',             -8.7200,  115.1700],
    ['KEC-BDG-02', 'Kabupaten Badung',   'Kuta Utara',       -8.6500,  115.1500],
    ['KEC-BDG-03', 'Kabupaten Badung',   'Kuta Selatan',     -8.7900,  115.2000],
    ['KEC-BDG-04', 'Kabupaten Badung',   'Mengwi',           -8.5833,  115.1819],
    ['KEC-BDG-05', 'Kabupaten Badung',   'Abiansemal',       -8.5200,  115.2100],
    ['KEC-BDG-06', 'Kabupaten Badung',   'Petang',           -8.3800,  115.2200],

    // Kabupaten Tabanan
    ['KEC-TBN-01', 'Kabupaten Tabanan',  'Tabanan',          -8.5410,  115.1256],
    ['KEC-TBN-02', 'Kabupaten Tabanan',  'Kediri',           -8.5600,  115.1400],
    ['KEC-TBN-03', 'Kabupaten Tabanan',  'Marga',            -8.4900,  115.1700],
    ['KEC-TBN-04', 'Kabupaten Tabanan',  'Penebel',          -8.4500,  115.1300],
    ['KEC-TBN-05', 'Kabupaten Tabanan',  'Baturiti',         -8.3180,  115.1750],
    ['KEC-TBN-06', 'Kabupaten Tabanan',  'Pupuan',           -8.3400,  115.0600],
    ['KEC-TBN-07', 'Kabupaten Tabanan',  'Selemadeg',        -8.5200,  115.0600],
    ['KEC-TBN-08', 'Kabupaten Tabanan',  'Selemadeg Timur',  -8.5300,  115.0900],
    ['KEC-TBN-09', 'Kabupaten Tabanan',  'Selemadeg Barat',  -8.5000,  115.0200],
    ['KEC-TBN-10', 'Kabupaten Tabanan',  'Kerambitan',       -8.5500,  115.0800],

    // Kabupaten Gianyar
    ['KEC-GNY-01', 'Kabupaten Gianyar',  'Gianyar',          -8.5398,  115.3275],
    ['KEC-GNY-02', 'Kabupaten Gianyar',  'Ubud',             -8.5069,  115.2625],
    ['KEC-GNY-03', 'Kabupaten Gianyar',  'Sukawati',         -8.5800,  115.2800],
    ['KEC-GNY-04', 'Kabupaten Gianyar',  'Blahbatuh',        -8.5600,  115.3000],
    ['KEC-GNY-05', 'Kabupaten Gianyar',  'Tampaksiring',     -8.4400,  115.3000],
    ['KEC-GNY-06', 'Kabupaten Gianyar',  'Tegallalang',      -8.4300,  115.2800],
    ['KEC-GNY-07', 'Kabupaten Gianyar',  'Payangan',         -8.3600,  115.2500],

    // Kabupaten Buleleng
    ['KEC-BLL-01', 'Kabupaten Buleleng', 'Buleleng',         -8.1120,  115.0882],
    ['KEC-BLL-02', 'Kabupaten Buleleng', 'Sukasada',         -8.1500,  115.1000],
    ['KEC-BLL-03', 'Kabupaten Buleleng', 'Banjar',           -8.1900,  115.0000],
    ['KEC-BLL-04', 'Kabupaten Buleleng', 'Seririt',          -8.1900,  114.9300],
    ['KEC-BLL-05', 'Kabupaten Buleleng', 'Gerokgak',         -8.1900,  114.6800],
    ['KEC-BLL-06', 'Kabupaten Buleleng', 'Busungbiu',        -8.2600,  114.9700],
    ['KEC-BLL-07', 'Kabupaten Buleleng', 'Sawan',            -8.1300,  115.1500],
    ['KEC-BLL-08', 'Kabupaten Buleleng', 'Kubutambahan',     -8.1000,  115.1800],
    ['KEC-BLL-09', 'Kabupaten Buleleng', 'Tejakula',         -8.1400,  115.3400],

    // Kabupaten Karangasem
    ['KEC-KRS-01', 'Kabupaten Karangasem', 'Karangasem',     -8.4475,  115.6148],
    ['KEC-KRS-02', 'Kabupaten Karangasem', 'Abang',          -8.3800,  115.6200],
    ['KEC-KRS-03', 'Kabupaten Karangasem', 'Bebandem',       -8.4300,  115.5500],
    ['KEC-KRS-04', 'Kabupaten Karangasem', 'Manggis',        -8.4900,  115.5200],
    ['KEC-KRS-05', 'Kabupaten Karangasem', 'Selat',          -8.4400,  115.4800],
    ['KEC-KRS-06', 'Kabupaten Karangasem', 'Sidemen',        -8.4800,  115.4500],
    ['KEC-KRS-07', 'Kabupaten Karangasem', 'Rendang',        -8.3700,  115.4300],
    ['KEC-KRS-08', 'Kabupaten Karangasem', 'Kubu',           -8.2600,  115.5600],

    // Kabupaten Klungkung
    ['KEC-KLK-01', 'Kabupaten Klungkung', 'Klungkung',       -8.5356,  115.4039],
    ['KEC-KLK-02', 'Kabupaten Klungkung', 'Banjarangkan',    -8.5300,  115.3700],
    ['KEC-KLK-03', 'Kabupaten Klungkung', 'Dawan',           -8.5400,  115.4400],
    ['KEC-KLK-04', 'Kabupaten Klungkung', 'Nusa Penida',     -8.6800,  115.5500],

    // Kabupaten Bangli
    ['KEC-BGL-01', 'Kabupaten Bangli',   'Bangli',           -8.4559,  115.3547],
    ['KEC-BGL-02', 'Kabupaten Bangli',   'Susut',            -8.4700,  115.3300],
    ['KEC-BGL-03', 'Kabupaten Bangli',   'Tembuku',          -8.4400,  115.3800],
    ['KEC-BGL-04', 'Kabupaten Bangli',   'Kintamani',        -8.2400,  115.3500],

    // Kabupaten Jembrana
    ['KEC-JMB-01', 'Kabupaten Jembrana', 'Negara',           -8.3585,  114.6295],
    ['KEC-JMB-02', 'Kabupaten Jembrana', 'Jembrana',         -8.3600,  114.6600],
    ['KEC-JMB-03', 'Kabupaten Jembrana', 'Mendoyo',          -8.3600,  114.7600],
    ['KEC-JMB-04', 'Kabupaten Jembrana', 'Pekutatan',        -8.4100,  114.8900],
    ['KEC-JMB-05', 'Kabupaten Jembrana', 'Melaya',           -8.2600,  114.5000]
  ];

  sheet.getRange(2, 1, data.length, headers.length).setValues(data);

  // Auto-resize columns
  sheet.autoResizeColumns(1, headers.length);

  // Freeze header row
  sheet.setFrozenRows(1);

  // Format lat/lng columns (D & E) to show 4 decimal places
  sheet.getRange(2, 4, data.length, 2).setNumberFormat('0.0000');

  SpreadsheetApp.getActiveSpreadsheet().toast(
    '✅ Tab "Master_Kecamatan" berhasil dibuat dengan ' + data.length + ' data centroid Kecamatan se-Bali!',
    '🗺️ Setup Selesai',
    6
  );
}

/**
 * Membaca tab Master_Kecamatan dan mengembalikannya sebagai JSON.
 * Endpoint: ?action=getCentroids
 */
function fetchCentroidsAsJSON() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Master_Kecamatan');

    if (!sheet) {
      return createJsonResponse({
        status: 'error',
        message: 'Sheet "Master_Kecamatan" belum ada. Jalankan Setup via menu dahulu.'
      });
    }

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return createJsonResponse({ status: 'success', data: [] });
    }

    var headers = data[0];
    var result = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue;
      var item = {};
      for (var h = 0; h < headers.length; h++) {
        item[headers[h]] = row[h];
      }
      result.push(item);
    }

    return createJsonResponse({ status: 'success', data: result });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}
