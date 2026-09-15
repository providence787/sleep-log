const V='sleeplog-2026-09-15a';          // 更新したらここを書き換える
const SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys()
    .then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x))))
    .then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request, url=new URL(req.url);
  if(req.method!=='GET' || url.origin!==location.origin) return;

  const isDoc = req.mode==='navigate'
    || url.pathname.endsWith('/') || url.pathname.endsWith('.html');

  if(isDoc){                              // HTML は常に最新を取りに行く
    e.respondWith(
      fetch(url.href,{cache:'no-store'}).then(res=>{
        const cp=res.clone(); caches.open(V).then(c=>c.put('./',cp)); return res;
      }).catch(()=>caches.match('./').then(r=>r||caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(caches.match(req).then(r=>r||fetch(req).then(res=>{  // 画像等はキャッシュ優先
    const cp=res.clone(); caches.open(V).then(c=>c.put(req,cp)); return res;
  })));
});