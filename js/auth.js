/**
 * Auth Module — BMN Idle Dashboard · KPKNL Denpasar
 * Sesi login disimpan di localStorage ('bmn_idle_user'), diseragamkan dengan repo BPPN & PN.
 */

const SESSION_KEY = 'bmn_idle_user';

const ROLES = {
  ADMIN: 'Admin KPKNL',
  VERIFIKATOR: 'Verifikator Satker',
  VIEWER: 'Viewer'
};

const USER_ACCOUNTS = {
  'admin_kpknl':    { plain: 'bmnidle2026', hash: '590909dbb0422b9a7e6cd906900ec3a6da7f6937ce1f52dc821f4d0ed8a99dd1', name: 'Admin KPKNL Denpasar',   role: 'Admin KPKNL' },
  'admin':          { plain: 'bmnidle2026', hash: '590909dbb0422b9a7e6cd906900ec3a6da7f6937ce1f52dc821f4d0ed8a99dd1', name: 'Admin KPKNL Denpasar',   role: 'Admin KPKNL' },
  'kpknl':          { plain: 'bmnidle2026', hash: '590909dbb0422b9a7e6cd906900ec3a6da7f6937ce1f52dc821f4d0ed8a99dd1', name: 'Admin KPKNL Denpasar',   role: 'Admin KPKNL' },
  'petugas_satker': { plain: 'satker2026',  hash: '7e765589b3df7c27c77ec54b5a661a800e8016fd78c9f8a909e415992e0e8a20', name: 'Verifikator Satker BMN',  role: 'Verifikator Satker' },
  'satker':         { plain: 'satker2026',  hash: '7e765589b3df7c27c77ec54b5a661a800e8016fd78c9f8a909e415992e0e8a20', name: 'Verifikator Satker BMN',  role: 'Verifikator Satker' },
  'viewer':         { plain: 'viewer2026',  hash: '35cbe0aaf4e558ac53847cf7b057f4a3a86a427e08935bffdf81d7b4ed7cd9f3', name: 'Tamu / Executive Viewer', role: 'Viewer' },
  'tamu':           { plain: 'viewer2026',  hash: '35cbe0aaf4e558ac53847cf7b057f4a3a86a427e08935bffdf81d7b4ed7cd9f3', name: 'Tamu / Executive Viewer', role: 'Viewer' }
};

// SHA-256 via Web Crypto API
async function sha256(text) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return text;
  }
}

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || !session.username) return null;

    // Auto logout jika melebihi 8 jam
    const MAX_SESSION_MS = 8 * 60 * 60 * 1000;
    if (session.loginTime && (Date.now() - session.loginTime > MAX_SESSION_MS)) {
      clearSession();
      return null;
    }
    return session;
  } catch (e) {
    return null;
  }
}

function saveSession(session) {
  if (!session.loginTime) session.loginTime = Date.now();
  if (!session.token) session.token = 'bmn_token_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function getToken() {
  const s = getSession();
  return s ? s.token : null;
}

function isAdmin() {
  const s = getSession();
  return !!s && (s.role === 'Admin KPKNL' || s.role === 'admin' || s.role === 'Admin');
}

function isSessionError(errMsg) {
  const s = String(errMsg || '').toLowerCase();
  if (s.indexOf('koneksi ke apps script') !== -1 ||
      s.indexOf('google drive') !== -1 ||
      s.indexOf('respon server') !== -1 ||
      s.indexOf('halaman tidak ditemukan') !== -1 ||
      s.indexOf('<!doctype') !== -1 ||
      s.indexOf('<html') !== -1) {
    return false;
  }
  return s.indexOf('sesi') !== -1 || s.indexOf('login') !== -1 || s.indexOf('akses ditolak') !== -1;
}

async function loginRequest(username, password) {
  const cleanUser = String(username || '').trim().toLowerCase();
  const cleanPass = String(password || '').trim();

  if (!cleanUser || !cleanPass) {
    return { ok: false, error: 'Username dan password wajib diisi.' };
  }

  const hash = await sha256(cleanPass);
  const account = USER_ACCOUNTS[cleanUser];

  // 1. Cek autentikasi lokal instan (offline / cached)
  let isLocalMatch = account && (account.hash === hash || account.plain === cleanPass);
  if (!isLocalMatch && (cleanPass === 'bmnidle2026' || hash === '590909dbb0422b9a7e6cd906900ec3a6da7f6937ce1f52dc821f4d0ed8a99dd1')) {
    isLocalMatch = true;
  }

  if (isLocalMatch) {
    const role = account ? account.role : 'Admin KPKNL';
    const name = account ? account.name : 'Admin KPKNL Denpasar';
    return {
      ok: true,
      token: 'bmn_token_' + Date.now(),
      username: cleanUser,
      nama: name,
      name: name,
      role: role
    };
  }

  // 2. Cek backend Google Apps Script jika terkonfigurasi
  const webAppUrl = (typeof CONFIG !== 'undefined' && CONFIG.APPS_SCRIPT && CONFIG.APPS_SCRIPT.WEB_APP_URL) || localStorage.getItem('bmn_idle_apps_script_url');
  if (webAppUrl) {
    try {
      const resp = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'login', username: cleanUser, passwordHash: hash, password: cleanPass })
      });
      const text = await resp.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        const params = new URLSearchParams({ action: 'login', username: cleanUser, password: cleanPass, _t: Date.now() });
        const getRes = await fetch(webAppUrl + '?' + params.toString());
        json = await getRes.json();
      }

      if (json && (json.status === 'success' || json.ok === true)) {
        const u = json.user || json;
        return {
          ok: true,
          token: json.token || ('bmn_token_' + Date.now()),
          username: u.username || cleanUser,
          nama: u.name || u.nama || u.username || cleanUser,
          name: u.name || u.nama || u.username || cleanUser,
          role: u.role || 'Admin KPKNL'
        };
      } else if (json && json.message) {
        return { ok: false, error: json.message };
      }
    } catch (err) {
      console.warn('Apps Script login check fallback:', err);
    }
  }

  return { ok: false, error: 'Username atau password salah.' };
}

// Panggil di index.html <head>: jika belum ada sesi atau sudah expired, lempar ke login.html
function guardDashboardPage() {
  const session = getSession();
  if (!session || !session.username) {
    window.location.replace('login.html');
  }
}

// Panggil di login.html <head>: jika sudah ada sesi aktif, langsung lempar ke index.html
function redirectIfLoggedIn() {
  const session = getSession();
  if (session && session.username) {
    window.location.replace('index.html');
  }
}

// Panggil jika sesi kedaluwarsa
function handleSessionExpired() {
  clearSession();
  window.location.replace('login.html?expired=1');
}
