const CACHE = 'cw-cache-v3';
const SHELL = ['./','./index.html','./app.js','./puzzles.js','./manifest.json'];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', (e)=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e)=>{
  const req = e.request;
  e.respondWith(
    caches.match(req).then(cached=>{
      const fetchPromise = fetch(req).then(net=>{
        if (req.method==='GET' && new URL(req.url).origin===self.location.origin){
          caches.open(CACHE).then(c=>c.put(req, net.clone()));
        }
        return net;
      }).catch(()=>cached);
      return cached || fetchPromise;
    })
  );
});
self.addEventListener('message',(e)=>{
  if (e.data?.type==='PRECACHE_PUZZLES'){
    e.waitUntil((async()=>{ const c=await caches.open(CACHE); await c.addAll(SHELL); })());
  }
});
