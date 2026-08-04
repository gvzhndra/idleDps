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
    .addItem('🌐 Buka Dashboard Web App', 'openDashboardDialog')
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
      if (!row[0]) continue;

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
      return handleUserLogin(contents.username, contents.passwordHash);
    }

    if (action === 'uploadBase64Photos') {
      return handleMultiPhotoUploadToDrive(contents.assetId, contents.photos);
    }

    return createJsonResponse({ status: 'error', message: 'Aksi tidak dikenal.' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * Validates login using SHA-256 hash comparison.
 * The frontend sends the SHA-256 hash of the password (NOT plain text).
 * The sheet stores SHA-256 hashes in column C (password_hash).
 */
function handleUserLogin(username, passwordHash) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Users');

  if (!sheet) {
    // Fallback: compare hash against known admin hash
    var adminHash = sha256Hex('bmnidle2026');
    if (username === 'admin_kpknl' && passwordHash === adminHash) {
      return createJsonResponse({ status: 'success', user: { username: username, role: 'Admin KPKNL' } });
    }
    return createJsonResponse({ status: 'error', message: 'Akun tidak valid.' });
  }

  var data = sheet.getDataRange().getValues();
  // Columns: [user_id, username, password_hash, nama_lengkap, role, status_aktif]
  for (var i = 1; i < data.length; i++) {
    var rowUsername = String(data[i][1]).trim();
    var rowHash     = String(data[i][2]).trim().toLowerCase();
    var rowStatus   = String(data[i][5]).trim().toUpperCase();

    if (rowUsername === username && rowHash === passwordHash && rowStatus === 'AKTIF') {
      return createJsonResponse({
        status: 'success',
        user: {
          username: data[i][1],
          name: data[i][3],
          role: data[i][4]
        }
      });
    }
  }

  return createJsonResponse({ status: 'error', message: 'Username atau password salah.' });
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

  var folders = DriveApp.getFoldersByName('BMN_Idle_Photos');
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder('BMN_Idle_Photos');
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var uploadedUrls = [];

  for (var k = 0; k < base64PhotoArray.length; k++) {
    var rawBase64 = base64PhotoArray[k];
    var base64Data = rawBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    var blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      'image/jpeg',
      'BMN_' + assetId + '_' + (k + 1) + '_' + new Date().getTime() + '.jpg'
    );

    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileUrl = 'https://drive.google.com/uc?id=' + file.getId();
    uploadedUrls.push(fileUrl);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('BMN_Idle') || ss.getSheetByName('denpasar saja');
  if (sheet) {
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var fotoColIdx = headers.indexOf('foto_urls');
    if (fotoColIdx === -1) fotoColIdx = 19;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(assetId) || String(data[i][3]) === String(assetId)) {
        var existing = String(data[i][fotoColIdx] || '');
        var newPhotos = uploadedUrls.join(',') + (existing ? ',' + existing : '');
        sheet.getRange(i + 1, fotoColIdx + 1).setValue(newPhotos);
        break;
      }
    }
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

function openDashboardDialog() {
  var html = HtmlService.createHtmlOutputFromFile('index')
    .setWidth(1280)
    .setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(html, 'BMN Idle Interactive Dashboard');
}
