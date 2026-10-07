const V='sleeplog-2026-10-07a';
const SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys()
    .then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==location.origin) return;            // GAS など外部はそのまま通す
  const isHtml=req.mode==='navigate'||(req.headers.get('accept')||'').includes('text/html');
  if(isHtml){                                          // HTML はネットワーク優先
    e.respondWith(fetch(req).then(res=>{
      if(res.ok&&res.type==='basic'){const cp=res.clone();caches.open(V).then(c=>c.put('./index.html',cp));}
      return res;
    }).catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{   // 他はキャッシュ優先
    if(res.ok&&res.type==='basic'){const cp=res.clone();caches.open(V).then(c=>c.put(req,cp));}
    return res;
  })));
});