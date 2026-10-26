// Workshop Tracker — lets the page open without internet.
// The page itself is always fetched fresh when online (so updates show up), and the last good copy is used when offline.
// Database / login traffic (supabase.co) is never touched here.
const V = 'wt-offline-v1';
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(c => Promise.all(['./', 'index.html'].map(u => c.add(u).catch(() => {})))));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.hostname.endsWith('.supabase.co')) return;
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r).then(res => { const c = res.clone(); caches.open(V).then(ch => ch.put(r, c)); return res; })
        .catch(() => caches.match(r).then(m => m || caches.match('index.html') || caches.match('./')))
    );
    return;
  }
  // pinned libraries (sign-in + Excel) and other static files: cache first
  if (u.origin === location.origin || /(^|\.)(jsdelivr\.net|cdnjs\.cloudflare\.com)$/.test(u.hostname)) {
    e.respondWith(
      caches.match(r).then(m => m || fetch(r).then(res => {
        if (res && (res.ok || res.type === 'opaque')) { const c = res.clone(); caches.open(V).then(ch => ch.put(r, c)); }
        return res;
      }))
    );
  }
});
