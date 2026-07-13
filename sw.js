/* Progressão — service worker: offline-first para o app shell */
const CACHE = "progressao-v2"; // <- suba este número a cada atualização de app.js/index.html
const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./icons.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "https://cdn.tailwindcss.com",
  "https://unpkg.com/react@18.3.1/umd/react.production.min.js",
  "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js",
  "https://unpkg.com/react-is@18.3.1/umd/react-is.production.min.js",
  "https://unpkg.com/prop-types@15.8.1/prop-types.min.js",
  "https://unpkg.com/recharts@2.12.7/umd/Recharts.min.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.allSettled(ASSETS.map((u) => c.add(u)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const isSameOrigin = req.url.startsWith(self.location.origin);

  // Arquivos do próprio app (HTML/JS/manifest/ícones): NETWORK-FIRST.
  // Assim, toda vez que você atualizar app.js/index.html no GitHub,
  // o navegador pega a versão nova em vez de reusar um cache antigo.
  if (isSameOrigin) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  // Bibliotecas externas (CDN, com versão fixa na URL): CACHE-FIRST.
  // Seguro porque a URL já contém a versão exata (ex: react@18.3.1).
  e.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached)
    )
  );
});
