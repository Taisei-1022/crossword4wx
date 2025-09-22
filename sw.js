// ★ デプロイのたびに CACHE 名を上げると安全（例: v5→v6）
const CACHE = 'cw-cache-v6';
const SHELL = ['./','./index.html','./app.js','./puzzles.js','./manifest.json'];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));
  self.skipWaiting(); // 新SWをすぐ waiting に
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    (async ()=>{
      const keys = await caches.keys();
      await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
      await self.clients.claim(); // すぐ制御
    })()
  );
});

// 基本は cache-first + バックグラウンド更新
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

// メッセージで制御（即時適用・プリキャッシュ・ハードリセット）
self.addEventListener('message',(e)=>{
  const msg = e.data || {};
  if (msg.type === 'SKIP_WAITING'){ self.skipWaiting(); }
  if (msg.type === 'PRECACHE_SHELL'){
    e.waitUntil((async()=>{ const c=await caches.open(CACHE); await c.addAll(SHELL); })());
  }
  if (msg.type === 'HARD_RESET'){
    e.waitUntil((async()=>{
      const keys = await caches.keys();
      await Promise.all(keys.map(k=>caches.delete(k)));
      const regs = await self.registration.unregister(); // 自分を解除
      // クライアントに戻す必要があれば postMessage も可
    })());
  }
});
