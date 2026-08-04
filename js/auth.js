/**
 * Auth Guard — BMN Idle Dashboard
 * Redirects to login.html if no valid session exists.
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
