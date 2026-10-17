/* LIFE LOG — sw.js
   更新のたびに V を変えること（古いキャッシュはまとめて消える）。
   HTML と JS はネットワーク優先（ファイルが分かれているので、新旧が混ざらないように）。
   画像・マニフェストはキャッシュ優先。res.ok かつ type==='basic' だけ保存する。 */
const V='lifelog-2026-10-17a';
const PRE=['./','core.js','ui.js','en.js','room.js','report.js','main.js',
  'manifest.webmanifest','icon-192.png','icon-512.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(V).then(c=>Promise.all(PRE.map(u=>
    fetch(u,{cache:'no-cache'}).then(r=>{if(r.ok&&r.type==='basic'&&!r.redirected)return c.put(u,r);})
      .catch(()=>{})
  ))).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys()
    .then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});

function keep(req,res,key){
  if(res&&res.ok&&res.type==='basic'&&!res.redirected){
    const copy=res.clone();
    caches.open(V).then(c=>c.put(key||req,copy)).catch(()=>{});
  }
  return res;
}

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET') return;                 // 同期（POST）は触らない
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;  // GAS など外部は触らない

  const isNav=req.mode==='navigate';
  const netFirst=isNav||/\.(html|js)$/.test(url.pathname)||url.pathname.endsWith('/');

  if(netFirst){
    e.respondWith(
      fetch(req,{cache:'no-cache'})
        .then(res=>keep(req,res,isNav?'./':null))
        .catch(()=>caches.match(isNav?'./':req,{ignoreSearch:true})
          .then(r=>r||caches.match('./')))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(hit=>hit||fetch(req).then(res=>keep(req,res)))
  );
});