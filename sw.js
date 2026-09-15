const V='sleeplog-2026-09-15c';   // 更新したらこの文字列を必ず変える
const SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
const DOC_TIMEOUT=3000;           // これを超えたらキャッシュ版で表示

self.addEventListener('install',e=>{
  e.waitUntil((async()=>{
    const c=await caches.open(V);
    // 1つ失敗しても他を止めない（addAll だと全滅する）
    await Promise.all(SHELL.map(u=>
      c.add(new Request(u,{cache:'reload'})).catch(err=>console.warn('skip',u,err))
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==V).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',e=>{           // 手動更新用
  if(e.data==='skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch',e=>{
  const req=e.request, url=new URL(req.url);
  if(req.method!=='GET' || url.origin!==location.origin) return;   // GAS への POST は素通し

  const isDoc = req.mode==='navigate'
    || url.pathname.endsWith('/')
    || url.pathname.endsWith('.html');

  if(isDoc){ e.respondWith(docStrategy()); return; }
  e.respondWith(assetStrategy(req));
});

// HTML はネットワーク優先。遅い・失敗したらキャッシュ版
async function docStrategy(){
  const cached=()=>caches.match('./').then(r=>r||caches.match('./index.html'));
  try{
    const net=fetch('./',{cache:'no-store'});
    const res=await Promise.race([
      net,
      new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),DOC_TIMEOUT))
    ]);
    if(res && res.ok && res.type==='basic'){     // 404/500 をキャッシュしない
      const cp=res.clone();
      caches.open(V).then(c=>c.put('./',cp)).catch(()=>{});
      return res;
    }
    return (await cached()) || res;
  }catch(err){
    const c=await cached();
    if(c) return c;
    return new Response(
      '<meta charset="utf-8"><body style="background:#0e1117;color:#e8ecf3;'+
      'font-family:sans-serif;padding:40px;text-align:center">'+
      '<p>オフラインで、まだ保存された画面がありません。</p>'+
      '<p>通信できる場所で一度開いてください。</p>',
      {headers:{'Content-Type':'text/html; charset=utf-8'},status:503});
  }
}

// アイコン等はキャッシュ優先
async function assetStrategy(req){
  const hit=await caches.match(req);
  if(hit) return hit;
  try{
    const res=await fetch(req);
    if(res && res.ok && res.type==='basic'){
      const cp=res.clone();
      caches.open(V).then(c=>c.put(req,cp)).catch(()=>{});
    }
    return res;
  }catch(err){
    return new Response('',{status:504});
  }
}