/**
 * Auth Guard — BMN Idle Dashboard
 * Redirects to login.html if no valid session exists or if session expired (> 8 hours).
 * Runs on index.html load (placed at bottom of body).
 */
(function () {
  const saved = localStorage.getItem('bmn_idle_user');
  if (!saved) {
    window.location.replace('login.html');
    return;
  }
  try {
    const user = JSON.parse(saved);
    if (!user || !user.username) {
      window.location.replace('login.html');
      return;
    }

    // Auto logout if logged in longer than 8 hours (8 * 3600 * 1000 ms)
    const MAX_SESSION_MS = 8 * 60 * 60 * 1000;
    if (user.loginTime && (Date.now() - user.loginTime > MAX_SESSION_MS)) {
      localStorage.removeItem('bmn_idle_user');
      window.location.replace('login.html?expired=1');
      return;
    }

    // Restore session into App after it initializes
    document.addEventListener('DOMContentLoaded', () => {
      if (typeof App !== 'undefined') {
        App.currentUser = user;
        App.updateUserUI();
      }
    });
  } catch (e) {
    window.location.replace('login.html');
  }
})();
