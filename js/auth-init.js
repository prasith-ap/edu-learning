// Initialize authentication state purely from Supabase
(async () => {
  if (typeof checkAuth === 'function') {
    await checkAuth();
  } else {
    console.error('checkAuth function is not available.');
  }
})();
