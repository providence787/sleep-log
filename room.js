/* LIFE LOG — room.js（⛪ 牧師のトレーニングルーム：第3弾 1回目）
   読み込み順: core → ui → en → room → report → main。
   全体を即時関数で包んでいるので、ここで作る名前は他のファイルとぶつからない。
   外に出す名前は window.openRoom だけ。
   kind='topic'（問いの棚）・kind='room'（口述の記録）。どちらも保存ボタンで確定。 */
(function(){
'use strict';
if(typeof db==='undefined'||typeof $!=='function'||typeof C!=='function') return;

const ROOM_DEF={
  scenes:[
    {icon:'🌱',label:'新来者'},
    {icon:'🔍',label:'求道者'},
    {icon:'🤝',label:'信徒の相談'},
    {icon:'👥',label:'連合の先生方'},
    {icon:'📜',label:'説教の依頼'},
    {icon:'🛡',label:'弁明・弁証'}
  ]
};
const ST_T=['問いだけ','要点あり','講評済み','口で言える'];
const MK={ok:'✓ できた',part:'△ 一部',ng:'✗ 詰まった'};
const MKS={ok:'✓',part:'△',ng:'✗'};
const ROOM_AUTO='auto:room:口述';

const T_=()=>dayKeyOf(new Date());
const line1=s=>String(s||'').replace(/\s+/g,' ').trim();
const gv=id=>{const el=$(id);return el?el.value:'';};
const sv=(id,v)=>{const el=$(id);if(el)el.value=(v===null||v===undefined)?'':v;};
const nv=id=>{const v=gv(id);if(v==='')return null;const n=+v;return isNaN(n)?null:Math.max(0,Math.round(n));};
const isOpen=id=>{const el=$(id);return !!(el&&el.open);};
const say=(id,t)=>{const el=$(id);if(el)el.textContent=t;};
const dmd=k=>md(new Date(k+'T12:00:00'));

/* ---------- 設定（場面） config の data.room に保存 ---------- */
function rmCfg(){
  const d=C(),r=(d.room&&typeof d.room==='object')?d.room:null;
  return {scenes:(r&&Array.isArray(r.scenes)&&r.scenes.length)?r.scenes:ROOM_DEF.scenes};
}
const scenes=()=>rmCfg().scenes.filter(s=>s&&!s.off&&s.label);
const sceneIcon=lb=>{const s=rmCfg().scenes.find(x=>x.label===lb);return s&&s.icon?s.icon:'';};
const scLab=lb=>{const i=sceneIcon(lb);return (i?i+' ':'')+lb;};
const cfgFresh=c=>c.updatedAt===new Date(0).toISOString();

/* ---------- データ ---------- */
const tpAll=()=>live().filter(i=>i.kind==='topic');
const rmAll=()=>live().filter(i=>i.kind==='room')
  .sort((a,b)=>new Date(b.start)-new Date(a.start));
const tpById=id=>db.items.find(i=>i.id===id&&i.kind==='topic'&&!i.deleted);
const stT=t=>t.oralAt?3:t.reviewAt?2:(String(t.ans||'').trim()?1:0);
const tpRuns=id=>rmAll().filter(r=>r.topicId===id);
function sceneList(withUsed){
  const L=scenes().map(s=>s.label);
  if(withUsed) tpAll().forEach(t=>{if(t.scene&&!L.includes(t.scene))L.push(t.scene);});
  return L;
}
function newTopic(o){
  const t={id:'TP'+uid(),kind:'topic',dateKey:T_(),start:now(),end:null,
    scene:o.scene||'',q:o.q||'',verse:o.verse||'',aim:o.aim||'',ans:'',
    extId:o.extId||'',src:o.src||'manual',count:0,lastMark:'',lastAt:'',
    oralAt:null,reviewAt:null,deleted:false,updatedAt:now(),synced:false};
  db.items.push(t);return t;
}
function refreshTopic(t){                 // 口述回数・最後の評価を記録から付け直す
  const rs=tpRuns(t.id),last=rs[0];
  const n=rs.length,lm=last?(last.mark||''):'',la=last?last.start:'';
  if((t.count||0)!==n||(t.lastMark||'')!==lm||(t.lastAt||'')!==la){
    t.count=n;t.lastMark=lm;t.lastAt=la;touch(t);}
}
function rmStats(){
  const T=T_(),wk=shiftKey(T,-6),A=tpAll(),R=rmAll();
  const W=R.filter(r=>r.dateKey>=wk&&r.dateKey<=T);
  return {total:A.length,ans:A.filter(t=>stT(t)>=1).length,
    rev:A.filter(t=>t.reviewAt).length,oral:A.filter(t=>t.oralAt).length,
    today:R.filter(r=>r.dateKey===T).length,
    wN:W.length,wMin:W.reduce((a,r)=>a+(+r.mins||0),0)};
}

/* ---------- 出す順番: 未回答 → 前回✗ → 前回△ → その他 → 口で言える ---------- */
let rmScene='',curTid=null;
const skipped=new Set();
function rank(t){
  if(t.oralAt) return 4;
  if(!t.count) return 0;
  return t.lastMark==='ng'?1:t.lastMark==='part'?2:3;
}
function queue(){
  return tpAll().filter(t=>!rmScene||t.scene===rmScene)
    .sort((a,b)=>rank(a)-rank(b)||
      String(a.lastAt||a.start||'').localeCompare(String(b.lastAt||b.start||'')));
}
function curTopic(){
  const q=queue(); if(!q.length) return null;
  let t=curTid?q.find(x=>x.id===curTid):null;
  if(!t){t=q.find(x=>!skipped.has(x.id))||q[0];curTid=t.id;}
  return t;
}
function nextTopic(){
  const q=queue(); if(!q.length) return;
  if(curTid) skipped.add(curTid);
  let t=q.find(x=>!skipped.has(x.id));
  if(!t){skipped.clear();t=q.find(x=>x.id!==curTid)||q[0];}
  curTid=t.id;drawRoom();
}

/* ---------- ⏱（端末ごと。db.settings は同期しない） ---------- */
const runGet=()=>db.settings.roomRun||null;
function runSet(v){if(v)db.settings.roomRun=v;else delete db.settings.roomRun;save();}
const mmss=ms=>{const s=Math.max(0,Math.floor(ms/1000));return `${Math.floor(s/60)}:${pad(s%60)}`;};

/* ---------- 日次チェックの自動判定（auto:room:口述） ---------- */
function roomAuto(key,k){
  if(key==='room:口述'){
    const R=rmAll().filter(r=>r.dateKey===k);
    if(!R.length) return null;                   // 0件の日は「データなし」（✗は手で付ける）
    const m=R.reduce((a,r)=>a+(+r.mins||0),0);
    return {v:'ok',text:`${R.length}問・${m}分`};
  }
  return null;                                   // room:朝 は次の回で作る
}
if(typeof autoVal==='function'){
  const base=autoVal;
  try{autoVal=function(key,k){
    if(String(key).startsWith('room:')) return roomAuto(key,k);
    return base(key,k);};
  }catch(e){console.warn('room: autoVal を拡張できませんでした',e);}
}

/* ---------- メイン画面のカード ---------- */
function renderRoomSum(){
  const el=$('roomSum'); if(!el) return;
  const s=rmStats(),run=runGet();
  el.innerHTML=`⛪ 牧師ルーム　今日 ${s.today}問 ／ 7日 ${s.wN}問・${s.wMin}分<br>棚 ${s.total}問（口で言える ${s.oral}）`+
    (run?' <span class="bad">⏱ 口述中</span>':'');
}
if(typeof render==='function'){
  const r0=render;
  try{render=function(){
    const x=r0.apply(this,arguments);
    try{renderRoomSum();
      if(isOpen('rmdlg')&&!isOpen('tpdlg')&&!isOpen('dldlg')) drawRoom();
    }catch(e){console.error('[room]',e);}
    return x;};
  }catch(e){console.warn('room: render を拡張できませんでした',e);}
}

/* ---------- ルーム画面 ---------- */
function chipsHtml(list,cur){
  return list.map(lb=>`<button class="chip${lb===cur?' on':''}" data-v="${esc(lb)}">${esc(scLab(lb))}</button>`).join('');
}
function shelfHtml(){
  const L=tpAll().filter(t=>!rmScene||t.scene===rmScene)
    .sort((a,b)=>String(a.scene||'').localeCompare(String(b.scene||''))||
      String(a.start||'').localeCompare(String(b.start||'')));
  if(!L.length) return '<div class="mini mt">まだありません</div>';
  return L.map(t=>`<div class="prow" data-id="${t.id}"><span class="tag t-rm">${esc(scLab(t.scene||'場面なし'))}</span>`+
    `<span class="mini">${ST_T[stT(t)]}・${t.count||0}回${t.lastMark?' 前回'+MKS[t.lastMark]:''}</span><br>${esc(t.q)}</div>`).join('');
}
function runsHtml(R){
  if(!R.length) return '<div class="mini mt">まだありません</div>';
  return R.slice(0,40).map(r=>`<div class="prow" data-id="${r.id}">${dmd(r.dateKey)} <b>${MKS[r.mark]||''}</b>`+
    `${r.mins!=null?' '+r.mins+'分':''}${r.stuck!=null?' 詰まり'+r.stuck:''}${r.mode==='sermon'?' 📜骨組み':''}`+
    ` <span class="mini">${esc(scLab(r.scene||''))}</span><br><span class="mini">${esc(line1(r.q).slice(0,90))}</span></div>`).join('');
}
const hasDaily=()=>(C().daily||[]).some(d=>d.opt===ROOM_AUTO);

function drawRoom(){
  const t=curTopic(),s=rmStats(),run=runGet();
  say('rmDate',dmd(T_()));
  const f=$('rmFilt');
  if(f) f.innerHTML=`<button class="chip${!rmScene?' on':''}" data-v="">すべて</button>`+chipsHtml(sceneList(true),rmScene);
  const rb=$('rmRunBox'); if(rb) rb.style.display=run?'':'none';
  const card=$('rmCard');
  if(card){
    if(!t) card.innerHTML='<div class="mini" style="line-height:1.6">問いがまだありません。「＋ 問いを足す」か、下の「問いの取り込み」で入れてください。</div>';
    else card.innerHTML=`<div class="mini">${esc(scLab(t.scene||'場面なし'))}　${ST_T[stT(t)]}・口述${t.count||0}回${t.lastMark?'・前回'+MKS[t.lastMark]:''}</div>`+
      `<div style="font-size:17px;font-weight:700;line-height:1.55;margin:6px 0">${esc(t.q)}</div>`+
      (t.verse?`<div class="mini">📖 ${esc(t.verse)}</div>`:'')+
      (t.aim?`<div class="mini">🎯 ${esc(t.aim)}</div>`:'');
  }
  ['rmGo','rmNext','rmEdit'].forEach(id=>{const b=$(id);if(b)b.disabled=!t;});
  const fun=$('rmFun');
  if(fun) fun.innerHTML=[['棚',s.total],['要点あり',s.ans],['講評済み',s.rev],['口で言える',s.oral,1]]
    .map(([a,b,k])=>`<div${k?' class="key"':''}><b>${b}</b><span class="mini">${a}</span></div>`).join('');
  say('rmFunSub',`今日 ${s.today}問 ／ 直近7日 ${s.wN}問・${s.wMin}分`);
  const dd=$('rmDaily'); if(dd) dd.style.display=hasDaily()?'none':'';
  const sh=$('rmShelf'); if(sh) sh.innerHTML=shelfHtml();
  const rr=$('rmRuns'); if(rr) rr.innerHTML=runsHtml(rmAll().filter(r=>!rmScene||r.scene===rmScene));
}
const scToText=L=>L.map(s=>(s.off?'#':'')+[s.icon||'',s.label].join(',')).join('\n');
function scParse(txt){
  return String(txt||'').split('\n').map(x=>x.trim()).filter(Boolean).map(line=>{
    let off=false;
    if(line.startsWith('#')){off=true;line=line.replace(/^#+/,'').trim();}
    const p=line.split(',').map(y=>y.trim());
    const o=p.length>1?{icon:p[0],label:p.slice(1).join(',')}:{icon:'',label:p[0]};
    if(off) o.off=true;
    return o;
  }).filter(o=>o.label);
}
function openRoom(){
  try{
    skipped.clear();curTid=null;
    sv('rmScenes',scToText(rmCfg().scenes));
    say('rmMsg','');
    ['rmOut','rmImpBox'].forEach(id=>{const el=$(id);if(el)el.style.display='none';});
    drawRoom();$('rmdlg').showModal();
  }catch(e){console.error(e);toast('ルームを開けませんでした：'+e.message);}
}
window.openRoom=openRoom;

on('btnRoom','click',openRoom);
on('rmClose','click',()=>$('rmdlg').close());
on('rmdlg','close',()=>{try{render();}catch(e){}});
on('rmFilt','click',e=>{const b=e.target.closest('.chip');if(!b)return;
  const v=b.dataset.v||'';rmScene=(v===rmScene)?'':v;curTid=null;skipped.clear();drawRoom();});
on('rmNext','click',nextTopic);
on('rmGo','click',()=>{const t=curTopic();if(t)openDrill(t.id,null);});
on('rmEdit','click',()=>{const t=curTopic();if(t)openTopic(t.id);});
on('rmAdd','click',()=>openTopic(null));
on('rmResume','click',()=>{
  const run=runGet(); if(!run) return;
  if(!tpById(run.tid)){runSet(null);drawRoom();renderRoomSum();return;}
  openDrill(run.tid,null);
});
on('rmShelf','click',e=>{const r=e.target.closest('.prow');if(r)openTopic(r.dataset.id);});
on('rmRuns','click',e=>{const r=e.target.closest('.prow');if(r)openDrill(null,r.dataset.id);});
on('rmDaily','click',()=>{
  if(hasDaily()) return;
  const c=cfgRec();
  if(cfgFresh(c)&&canSync()){say('rmMsg','先に「同期」を押してから、もう一度押してください');return;}
  c.data.daily=c.data.daily||[];
  c.data.daily.push({icon:'⛪',label:'牧師ルーム 口述1問',opt:ROOM_AUTO});
  touch(c);save();drawRoom();render();sync(true);
  say('rmMsg','日次チェックに入れました（答えた日は自動で✓）');
});
on('rmScSave','click',()=>{
  const L=scParse(gv('rmScenes'));
  if(!L.filter(x=>!x.off).length){say('rmMsg','場面は1つ以上必要です');return;}
  const seen={};
  for(const x of L){if(seen[x.label]){say('rmMsg','同じ名前の場面があります：'+x.label);return;}seen[x.label]=1;}
  const c=cfgRec();
  if(cfgFresh(c)&&canSync()){say('rmMsg','先に「同期」を押してから保存してください');return;}
  c.data.room=Object.assign({},c.data.room||{},{scenes:L});
  touch(c);save();drawRoom();sync(true);
  say('rmMsg','場面を保存しました');
});

/* ---------- 取り込み（Claude で問いを作る） ---------- */
async function cp(text,outId,msgId,okMsg){
  const o=$(outId);
  try{await navigator.clipboard.writeText(text);if(o)o.style.display='none';say(msgId,okMsg);}
  catch(e){if(o){o.value=text;o.style.display='';o.select();}say(msgId,'下の欄を長押ししてコピーしてください');}
}
function genPrompt(){
  const sc=rmScene?[rmScene]:scenes().map(s=>s.label);
  let mx=0;
  tpAll().forEach(t=>{const m=String(t.extId||'').match(/^T(\d+)$/i);if(m)mx=Math.max(mx,+m[1]);});
  const nid='T'+String(mx+1).padStart(3,'0');
  const ex=tpAll().slice(-80).map(t=>`- [${t.scene||'場面なし'}] ${line1(t.q)}`);
  return [
    'あなたは、牧師（神学生）の自己研鑽を手伝うメンターです。',
    '牧会の現場で実際に出会いそうな「もしこう聞かれたら／こう頼まれたら」という問いを10個作ってください。',
    '私はこの問いに、聖書を見ずに声に出して答える練習をします。',
    '',
    '## 条件',
    `- 場面は次から選ぶ：${sc.join('、')}`,
    '- 問いは、相手が実際に口にしそうな言葉で一文で書く（例: 神さまがいるなら、なぜ子どもが病気になるんですか）',
    '- 「説教の依頼」は、依頼の言葉で書く（例: 来月の連合の集会で、20分で「希望」について話してください）',
    '- みことば：答えの土台になる聖書箇所を1〜3か所（書名 章:節）',
    '- ねらい：この問いで鍛えたいことを短く（例: 共感してから聖書に入る／3分で福音の要点を言う）',
    '- やさしい問いと難しい問いを混ぜる',
    '- 下の「すでにある問い」と重ならないようにする',
    '',
    '## 出力形式（この形の行だけを出す。表の飾りや説明は不要）',
    'ID | 場面 | 問い | みことば | ねらい',
    `ID は ${nid} から連番。問いの中に「|」は使わない。`,
    '',
    '## すでにある問い',
    ex.length?ex.join('\n'):'（まだありません）'
  ].join('\n');
}
function importTopics(text){
  let add=0,upd=0,skip=0;
  String(text||'').split('\n').forEach(line=>{
    let s=line.trim(); if(!s.includes('|')) return;
    s=s.replace(/^\|/,'').replace(/\|$/,'');
    const p=s.split('|').map(x=>x.trim());
    if(p.every(x=>x===''||/^:?-{2,}:?$/.test(x))) return;      // 表の区切り行
    if(/^id$/i.test(p[0])||p[2]==='問い') return;               // 見出し行
    if(p.length<3||!p[2]){skip++;return;}
    const ext=p[0],scene=p[1],q=p[2],verse=p[3]||'',aim=p.slice(4).join(' / ');
    let t=(ext&&tpAll().find(x=>x.extId===ext))||tpAll().find(x=>line1(x.q)===line1(q));
    if(t){
      const nw={scene:scene||t.scene||'',q:q,verse:verse||t.verse||'',aim:aim||t.aim||''};
      let ch=Object.keys(nw).some(k=>(t[k]||'')!==nw[k]);
      if(ch) Object.assign(t,nw);
      if(ext&&!t.extId){t.extId=ext;ch=true;}
      if(ch){touch(t);upd++;}
    }else{newTopic({extId:ext,scene,q,verse,aim,src:'import'});add++;}
  });
  save();
  return {add,upd,skip};
}
on('rmGen','click',()=>cp(genPrompt(),'rmOut','rmMsg','依頼文をコピーしました。Claude に貼り付けて、返事を「返答を取り込む」に貼ってください'));
on('rmImpOpen','click',()=>{const b=$('rmImpBox');if(b)b.style.display=b.style.display==='none'?'':'none';});
on('rmImpGo','click',()=>{
  const r=importTopics(gv('rmImp'));
  if(!r.add&&!r.upd){say('rmMsg','取り込める行がありませんでした（ID | 場面 | 問い | みことば | ねらい の形か確認してください）');return;}
  sv('rmImp','');const b=$('rmImpBox');if(b)b.style.display='none';
  curTid=null;skipped.clear();drawRoom();render();sync(true);
  say('rmMsg',`取り込みました：新しい問い ${r.add}・更新 ${r.upd}${r.skip?'・読めない行 '+r.skip:''}`);
});

/* ---------- 問いの修正（保存で確定） ---------- */
let tpCur=null,tpScn='';
function drawTpScene(){
  const L=sceneList(false);
  if(tpScn&&!L.includes(tpScn)) L.push(tpScn);
  const el=$('tpScene'); if(el) el.innerHTML=chipsHtml(L,tpScn);
}
function openTopic(id){
  const t=id?tpById(id):null;
  tpCur=t?t.id:null;
  tpScn=t?(t.scene||''):(rmScene||((scenes()[0]||{}).label)||'');
  say('tpHead',t?`問い（${ST_T[stT(t)]}・口述${t.count||0}回）`:'＋ 問いを足す');
  sv('tpQ',t?t.q:'');sv('tpV',t?t.verse:'');sv('tpAim',t?t.aim:'');sv('tpAns',t?t.ans:'');
  const o=$('tpOral'); if(o) o.checked=!!(t&&t.oralAt);
  const hb=$('tpHistBox'); if(hb) hb.style.display=t?'':'none';
  const h=$('tpHist'); if(h) h.innerHTML=t?runsHtml(tpRuns(t.id)):'';
  ['tpDel','tpGo'].forEach(x=>{const b=$(x);if(b)b.style.display=t?'':'none';});
  say('tpMsg','');drawTpScene();$('tpdlg').showModal();
}
function saveTopic(){
  const q=gv('tpQ').trim();
  if(!q){say('tpMsg','問いを入れてください');return null;}
  let t=tpCur?tpById(tpCur):null;
  if(!t){t=newTopic({q,scene:tpScn});tpCur=t.id;}
  t.q=q;t.scene=tpScn;t.verse=gv('tpV').trim();t.aim=gv('tpAim').trim();t.ans=gv('tpAns').trim();
  const o=$('tpOral'),ck=!!(o&&o.checked);
  if(ck&&!t.oralAt) t.oralAt=now();
  if(!ck) t.oralAt=null;
  touch(t);save();
  return t;
}
on('tpScene','click',e=>{const b=e.target.closest('.chip');if(!b)return;
  tpScn=(b.dataset.v===tpScn)?'':b.dataset.v;drawTpScene();});
on('tpSave','click',()=>{
  const t=saveTopic(); if(!t) return;
  $('tpdlg').close();if(!curTid)curTid=t.id;drawRoom();render();sync(true);
});
on('tpGo','click',()=>{
  const t=saveTopic(); if(!t) return;
  $('tpdlg').close();curTid=t.id;drawRoom();openDrill(t.id,null);sync(true);
});
on('tpCancel','click',()=>$('tpdlg').close());
on('tpDel','click',()=>{
  const t=tpCur?tpById(tpCur):null;
  if(!t||!confirm('この問いを削除しますか？（口述の記録は残ります）'))return;
  drop(t);if(curTid===t.id)curTid=null;
  $('tpdlg').close();drawRoom();render();sync(true);
});
on('tpHist','click',e=>{const r=e.target.closest('.prow');if(!r)return;
  $('tpdlg').close();openDrill(null,r.dataset.id);});

/* ---------- 口述の記録（保存で確定） ---------- */
let dlCur=null,dlTid=null,dlMode='oral',dlMk='',dlAt=null;
function drawTimer(){
  const el=$('dlTimer'),b=$('dlRun'); if(!el||!b) return;
  const run=runGet(),mine=!dlCur&&run&&run.tid===dlTid;
  if(mine){
    el.textContent=mmss(Date.now()-new Date(run.at));el.style.color='#ff9a8a';
    b.textContent='⏹ 止める（分に入れる）';b.className='big stop';
  }else{
    el.textContent=(dlAt&&!dlCur)?'計測済み':'0:00';el.style.color='';
    b.textContent='⏱ 開始（声に出して答える）';b.className='big rmb';
  }
}
function drawDrill(){
  ['oral','sermon'].forEach(m=>{const b=$('dl_'+m);if(b)b.classList.toggle('on',dlMode===m);});
  const sm=$('dlSermon'); if(sm) sm.style.display=dlMode==='sermon'?'':'none';
  const mk=$('dlMarks');
  if(mk) mk.innerHTML=Object.keys(MK).map(k=>`<button class="chip${dlMk===k?' on':''}" data-v="${k}">${MK[k]}</button>`).join('');
  drawTimer();
}
function openDrill(tid,rid){
  const r=rid?db.items.find(i=>i.id===rid&&i.kind==='room'&&!i.deleted):null;
  dlCur=r?r.id:null;
  dlTid=r?(r.topicId||null):tid;
  const t=dlTid?tpById(dlTid):null;
  dlMode=r?(r.mode||'oral'):((t&&/説教/.test(t.scene||''))?'sermon':'oral');
  dlMk=r?(r.mark||''):'';
  const run=runGet();
  dlAt=r?r.start:((run&&run.tid===dlTid)?run.at:null);
  say('dlHead',r?'口述の記録を直す':'🎙 口述');
  const q=t?t.q:(r?r.q:''),sc=t?t.scene:(r?r.scene:'');
  const qb=$('dlQ');
  if(qb) qb.innerHTML=`<div class="mini">${esc(scLab(sc||'場面なし'))}</div>`+
    `<div style="font-size:16px;font-weight:700;line-height:1.55;margin:4px 0">${esc(q)}</div>`+
    (t&&t.verse?`<div class="mini">📖 ${esc(t.verse)}</div>`:'')+
    (t&&t.aim?`<div class="mini">🎯 ${esc(t.aim)}</div>`:'');
  say('dlAns',t&&t.ans?t.ans:'（まだ書いていません。問いの画面で育てていきます）');
  sv('dlDate',r?r.dateKey:T_());
  sv('dlMin',r?r.mins:'');sv('dlStuck',r?r.stuck:'');
  sv('dlVerse',r?r.verses:'');sv('dlNote',r?r.note:'');sv('dlLink',r?r.link:'');
  const o=(r&&r.outline)||{};
  sv('dlTheme',o.theme);sv('dlText',o.text);sv('dlPoints',o.points);sv('dlApply',o.apply);
  const ob=$('dlOralBox'); if(ob) ob.style.display=t?'':'none';
  const oc=$('dlOral'); if(oc) oc.checked=!!(t&&t.oralAt);
  const rb=$('dlRunBox'); if(rb) rb.style.display=r?'none':'';
  const db_=$('dlDel'); if(db_) db_.style.display=r?'':'none';
  say('dlMsg','');drawDrill();$('dldlg').showModal();
}
['oral','sermon'].forEach(m=>on('dl_'+m,'click',()=>{dlMode=m;drawDrill();}));
on('dlMarks','click',e=>{const b=e.target.closest('.chip');if(!b)return;
  dlMk=(dlMk===b.dataset.v)?'':b.dataset.v;drawDrill();});
on('dlRun','click',()=>{
  const run=runGet();
  if(run&&run.tid===dlTid){
    const m=Math.max(1,Math.round((Date.now()-new Date(run.at))/60000));
    sv('dlMin',m);dlAt=run.at;runSet(null);drawTimer();renderRoomSum();
    say('dlMsg',`${m}分を入れました。評価を選んで保存してください`);
    return;
  }
  if(run&&!confirm('別の問いの⏱が動いています。止めて（記録せずに）こちらを始めますか？'))return;
  const at=now();runSet({tid:dlTid,at});dlAt=at;drawTimer();renderRoomSum();
  try{if(navigator.vibrate)navigator.vibrate(25);}catch(e){}
});
on('dlSave','click',()=>{
  if(!dlMk){say('dlMsg','評価（✓△✗）を選んでください');return;}
  const run=runGet();
  if(!dlCur&&run&&run.tid===dlTid){            // 止め忘れたまま保存 → ここで止める
    if(gv('dlMin')==='') sv('dlMin',Math.max(1,Math.round((Date.now()-new Date(run.at))/60000)));
    dlAt=run.at;runSet(null);
  }
  const t=dlTid?tpById(dlTid):null;
  const dk=gv('dlDate')||T_();
  let r=dlCur?db.items.find(i=>i.id===dlCur):null;
  if(!r){
    let st=dlAt||now();
    if(dayKeyOf(new Date(st))!==dk) st=new Date(dk+'T12:00:00').toISOString();
    r={id:'RM'+uid(),kind:'room',start:st,end:null,topicId:t?t.id:'',
       scene:t?t.scene:'',q:t?t.q:'',deleted:false};
    db.items.push(r);
  }else if(r.dateKey!==dk){
    r.start=new Date(dk+'T12:00:00').toISOString();
  }
  Object.assign(r,{dateKey:dk,mode:dlMode,mins:nv('dlMin'),stuck:nv('dlStuck'),mark:dlMk,
    verses:gv('dlVerse').trim(),note:gv('dlNote').trim(),link:gv('dlLink').trim(),
    outline:dlMode==='sermon'?{theme:gv('dlTheme').trim(),text:gv('dlText').trim(),
      points:gv('dlPoints').trim(),apply:gv('dlApply').trim()}:null});
  r.end=r.mins!=null?new Date(new Date(r.start).getTime()+r.mins*60000).toISOString():null;
  touch(r);
  if(t){
    const oc=$('dlOral'),ck=!!(oc&&oc.checked);
    if(ck&&!t.oralAt){t.oralAt=now();touch(t);}
    if(!ck&&t.oralAt){t.oralAt=null;touch(t);}
    refreshTopic(t);
  }
  save();
  const wasNew=!dlCur;
  $('dldlg').close();
  if(wasNew&&t){skipped.add(t.id);curTid=null;}
  drawRoom();render();sync(true);
  if(wasNew) toast(`⛪ 口述を記録しました（${MKS[dlMk]}${r.mins!=null?'・'+r.mins+'分':''}）`);
});
on('dlCancel','click',()=>{
  const run=runGet();
  if(!dlCur&&run&&run.tid===dlTid&&
     confirm('⏱ が動いています。計測も取り消しますか？\nOK＝取り消す ／ キャンセル＝動かしたまま閉じる（あとで戻れます）'))
    runSet(null);
  $('dldlg').close();
});
on('dlDel','click',()=>{
  const r=dlCur?db.items.find(i=>i.id===dlCur):null;
  if(!r||!confirm('この口述の記録を削除しますか？'))return;
  const t=r.topicId?tpById(r.topicId):null;
  drop(r);if(t){refreshTopic(t);save();}
  $('dldlg').close();drawRoom();render();sync(true);
});
on('dldlg','close',()=>{renderRoomSum();if(isOpen('rmdlg'))drawRoom();});

setInterval(()=>{try{if(isOpen('dldlg'))drawTimer();}catch(e){}},1000);
try{renderRoomSum();}catch(e){}
})();