// Firebase Messaging SW - exists to stop 404, we don't use push yet
self.addEventListener('install', (e) => {
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.returnValue = self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  // Let browser handle fetch normally
  return;
});