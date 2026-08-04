/**
 * ============================================================================
 * GOOGLE APPS SCRIPT BACKEND & DRIVE PHOTO UPLOADER FOR BMN IDLE
 * File: Code.gs (KPKNL Denpasar)
 * ============================================================================
 * Features:
 * - Data API (doGet) for BMN Idle records & User Login authentication.
 * - Multi-Photo Base64 Uploader (doPost): Creates JPG files in Google Drive
 *   Folder "BMN_Idle_Photos", sets permissions, & appends URLs to BMN_Idle sheet.
 * - Google Slides Exporter (1 Asset = 1 Slide) with selective row export.
 * ============================================================================
 */

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('💡 BMN Idle Tools')
    .addItem('📊 Ekspor ke Google Slides (Slide Presentasi)', 'createGoogleSlidesPresentation')
    .addItem('🔑 Inisialisasi Sheet Users & Akses', 'initUsersSheet')
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
      return handleUserLogin(contents.username, contents.password);
    }

    if (action === 'uploadBase64Photos') {
      return handleMultiPhotoUploadToDrive(contents.assetId, contents.photos);
    }

    return createJsonResponse({ status: 'error', message: 'Aksi tidak dikenal.' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function handleUserLogin(username, password) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Users');
  if (!sheet) {
    // Default fallback check
    if (username === 'admin_kpknl' && password === 'bmnidle2026') {
      return createJsonResponse({ status: 'success', user: { username: username, role: 'Admin KPKNL' } });
    }
    return createJsonResponse({ status: 'error', message: 'Akun tidak valid.' });
  }

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === username && String(data[i][2]).trim() === password) {
      return createJsonResponse({
        status: 'success',
        user: {
          username: data[i][1],
          nama: data[i][3],
          role: data[i][4]
        }
      });
    }
  }

  return createJsonResponse({ status: 'error', message: 'Username atau password salah.' });
}

/**
 * Uploads compressed base64 images into Google Drive Folder "BMN_Idle_Photos"
 * and appends public URLs into sheet.
 */
function handleMultiPhotoUploadToDrive(assetId, base64PhotoArray) {
  if (!Array.isArray(base64PhotoArray) || base64PhotoArray.length === 0) {
    return createJsonResponse({ status: 'error', message: 'Tidak ada foto yang dikirim.' });
  }

  // Get or Create Drive Folder "BMN_Idle_Photos"
  var folders = DriveApp.getFoldersByName('BMN_Idle_Photos');
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder('BMN_Idle_Photos');
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var uploadedUrls = [];

  for (var k = 0; k < base64PhotoArray.length; k++) {
    var rawBase64 = base64PhotoArray[k];
    var base64Data = rawBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/jpeg', 'BMN_' + assetId + '_' + (k + 1) + '_' + new Date().getTime() + '.jpg');
    
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var fileUrl = 'https://drive.google.com/uc?id=' + file.getId();
    uploadedUrls.push(fileUrl);
  }

  // Update Sheet Column
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

function initUsersSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Users');
  if (!sheet) {
    sheet = ss.insertSheet('Users');
    sheet.appendRow(['user_id', 'username', 'password', 'nama_lengkap', 'role', 'status_aktif']);
    sheet.appendRow(['USR001', 'admin_kpknl', 'bmnidle2026', 'Admin KPKNL Denpasar', 'Admin KPKNL', 'AKTIF']);
    sheet.appendRow(['USR002', 'petugas_satker', 'satker2026', 'Verifikator Satker', 'Verifikator Satker', 'AKTIF']);
    sheet.appendRow(['USR003', 'viewer', 'viewer2026', 'Tamu / Viewer', 'Viewer', 'AKTIF']);
    SpreadsheetApp.getUi().alert('✨ Sheet "Users" berhasil dibuat dengan akun default!');
  } else {
    SpreadsheetApp.getUi().alert('Sheet "Users" sudah ada.');
  }
}

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
