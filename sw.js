const V='sleeplog-2026-10-14c';
const CORE=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png'];

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(V).then(c=>
      Promise.all(CORE.map(u=>fetch(u,{cache:'no-store'}).then(r=>r.ok?c.put(u,r):null).catch(()=>{})))
    )
  );
  self.skipWaiting();
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});
const put=(req,res)=>{
  if(res&&res.ok&&res.type==='basic'){
    const c=res.clone();
    caches.open(V).then(x=>{
      x.put(req,c);
      const u=new URL(req.url);
      if(u.pathname.endsWith('/')||u.pathname.endsWith('index.html')){
        x.put('index.html',res.clone());
      }
    });
  }
  return res;
};
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==location.origin) return;               // GAS などは触らない
  const isHtml=req.mode==='navigate'||url.pathname.endsWith('.html')||url.pathname.endsWith('/');
  if(isHtml){                                            // HTML はネットワーク優先（HTTPキャッシュ無視）
    e.respondWith(fetch(req,{cache:'no-store'}).then(r=>put(req,r))
      .catch(()=>caches.match(req).then(r=>r||caches.match('index.html')||caches.match('./'))));
  }else{                                                 // それ以外はキャッシュ優先
    e.respondWith(caches.match(req).then(r=>r||fetch(req).then(x=>put(req,x))));
  }
});