const V='sleeplog-2026-10-11b';
const CORE=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET') return;                       // 同期の POST は素通し
  const url=new URL(req.url);
  if(url.origin!==location.origin) return;              // GAS など外部も素通し
  const put=res=>{
    if(res.ok&&res.type==='basic'){
      const cp=res.clone();
      caches.open(V).then(c=>c.put(req,cp));
    }
    return res;
  };
  const isHTML=req.mode==='navigate'||(req.headers.get('accept')||'').includes('text/html');
  if(isHTML){                                           // HTML はネットワーク優先
    e.respondWith(
      fetch(req).then(put).catch(()=>
        caches.match(req,{ignoreSearch:true}).then(r=>r||caches.match('index.html')))
    );
  }else{                                                // それ以外はキャッシュ優先
    e.respondWith(caches.match(req).then(r=>r||fetch(req).then(put)));
  }
});