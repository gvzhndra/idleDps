// Kalau datang ke halaman ini karena sesi habis (dilempar oleh handleSessionExpired
// di js/auth.js), tampilkan pesannya.
(function showExpiredMessageIfAny() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('expired') === '1') {
    const errEl = document.getElementById('loginError');
    if (errEl) {
      errEl.textContent = 'Sesi berakhir atau telah kedaluwarsa, silakan masuk kembali.';
      errEl.style.display = 'block';
    }
  }
  setTimeout(() => {
    const input = document.getElementById('loginUsername');
    if (input) input.focus();
  }, 100);
})();

async function doLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';

  if (!username || !password) {
    errEl.textContent = 'Username dan password wajib diisi.';
    errEl.style.display = 'block';
    return;
  }

  const btn = document.getElementById('btnLogin');
  btn.disabled = true;
  btn.textContent = 'Memproses...';

  const res = await loginRequest(username, password);
  btn.disabled = false;
  btn.textContent = 'Masuk';

  if (!res.ok) {
    errEl.textContent = res.error || 'Username atau password salah.';
    errEl.style.display = 'block';
    return;
  }

  saveSession({
    token: res.token,
    username: res.username,
    role: res.role,
    nama: res.nama || res.name,
    name: res.name || res.nama,
    loginTime: Date.now()
  });

  window.location.href = 'index.html';
}

document.getElementById('togglePassword').addEventListener('click', () => {
  const pwInput = document.getElementById('loginPassword');
  const btn = document.getElementById('togglePassword');
  const isHidden = pwInput.type === 'password';
  pwInput.type = isHidden ? 'text' : 'password';
  btn.textContent = isHidden ? '🙈' : '👁';
  btn.setAttribute('aria-label', isHidden ? 'Sembunyikan password' : 'Tampilkan password');
});

document.getElementById('btnLogin').addEventListener('click', doLogin);
document.getElementById('loginPassword').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doLogin();
});
document.getElementById('loginUsername').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doLogin();
});
