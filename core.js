/* LIFE LOG — core.js（データ・設定・自動判定・同期）
   読み込み順: core → ui → en → report → main。
   ファイルをまたいで同じ名前の const / let / function を作らないこと（後のファイルが丸ごと止まる） */

/* ===== 初期値（実際の項目は config シートと同期。ここは一般的な内容のみ） ===== */
const DEFAULTS={
  title:'場面ログ',
  levels:[
    {icon:'🌱',label:'落ち着いて対応できた'},
    {icon:'🙂',label:'ふつうに対応した'},
    {icon:'😶',label:'不機嫌な態度・無言'},
    {icon:'🗯️',label:'きつい言い方'},
    {icon:'📢',label:'大きな声を出した'}
  ],
  who:['家族','職場','その他'],
  trig:['朝の支度','食事','片づけ','寝かしつけ','自分が寝不足','自分が疲れている','時間に追われた'],
  tags:[
    {icon:'◎',label:'寝起き◎',group:'wake'},
    {icon:'○',label:'寝起き○',group:'wake'},
    {icon:'△',label:'寝起き△',group:'wake'},
    {icon:'☾',label:'中途覚醒'},
    {icon:'🍺',label:'飲酒'},
    {icon:'🤒',label:'体調不良'},
    {icon:'📱',label:'夜更かし'},
    {icon:'💭',label:'夢'}
  ],
  daily:[
    {icon:'⏰',label:'起床 3:30±10分',opt:'auto:wake'},
    {icon:'📌',label:'Padlet 投稿',opt:'auto:padlet'},
    {icon:'🚽',label:'トイレ滞在 目安以内',opt:'auto:toilet'},
    {icon:'🃏',label:'Anki 金フレ 10枚',opt:'x3'},
    {icon:'🃏',label:'Anki Distinction 10枚',opt:'x3'},
    {icon:'✍️',label:'聖書模写・黙想 A5 1枚'},
    {icon:'🙏',label:'Obsidian 朝の祈り（音声入力）'},
    {icon:'🪢',label:'ぶら下がり10秒 ×5',opt:'auto:act:ぶら下がり10秒'},
    {icon:'💪',label:'懸垂 1日20回',opt:'auto:act:懸垂'},
    {icon:'📖',label:'スラッシュリーディング 15分',opt:'auto:act:スラッシュリーディング'}
  ],
  act:[
    {icon:'🪢',label:'ぶら下がり10秒',opt:'tap5'},
    {icon:'💪',label:'懸垂',opt:'rep20'},
    {icon:'📖',label:'スラッシュリーディング',opt:'min15'},
    {icon:'💻',label:'アフィリエイト',opt:'min0'}
  ],
  ievals:[
    {icon:'✍️',label:'書いた'},
    {icon:'👀',label:'見ただけ'},
    {icon:'⚫',label:'不要だった'},
    {icon:'🗑',label:'見ずに削除'},
    {icon:'🇬🇧',label:'英語で書いた',off:true}
  ],
  rt:{
    wake:'03:30',tol:10,toilet:40,maxH:6,
    link:'https://harvestclay.net/',linkName:'聴くClay',
    steps:[
      {icon:'⏰',label:'起床',opt:'wake'},
      {icon:'🧴',label:'エネマ準備'},
      {icon:'🚪',label:'トイレ入室',opt:'toilet'},
      {icon:'📖',label:'聖書読了'},
      {icon:'🟣',label:'Obsidian 記入（デボーション）'},
      {icon:'📌',label:'Padlet 投稿',opt:'padlet'},
      {icon:'🏁',label:'退出＝終了',opt:'end'}
    ],
    yt:[
      {icon:'🌱',label:'寄り道なし'},
      {icon:'🔀',label:'少し寄り道'},
      {icon:'🌀',label:'ザッピングした'}
    ],
    mig3:true
  },
  en:{
    islands:[
      {icon:'🌅',label:'朝ルーティンと信仰'},
      {icon:'🔬',label:'研究・論文'},
      {icon:'🤖',label:'AIの使い方'},
      {icon:'🏠',label:'家族と日常'},
      {icon:'💪',label:'健康と習慣'},
      {icon:'🧭',label:'考え方・価値観'}
    ],
    goal:300
  }
};
const PN_LIMIT=3;
const DAY_CUT=3;                 // 日次・ルーティン・鍛錬の日付は 3:00 で切り替え
const RT_WIN=[2,7];              // この時間帯に睡眠を終えたら朝ルーティンを自動開始
const SLEEP_EVE=18;              // 計測中の睡眠: この時刻以降に寝始めたら翌日扱い
const EXP_MAX=92;                // エクスポート・レポートの期間指定の上限（日）
const RANGE_DEF=10;              // 「期間」を開いたときの既定（直近◯日）
const FIX_MAX=30;                // 添削に一度に出す件数
const UNDO_MIN=60;               // 終了を取り消して計測中に戻せる時間（分）
const CMD_GAP=3;                 // 同じショートカットをこの分数以内に続けて開いたら無視
const STOP_WAIT=6000;            // 開始・終了の前に他端末の記録を確認する最大待ち時間（ms）
const SHORT_SLEEP=360;           // レポートの気づき: この分数未満を「短い睡眠」とする
const EXP_SHOW=14;               // メイン画面に実験を表示する日数（レポート期間の終わりから）
const ACT_GAP=1500;              // 鍛錬: 同じボタンをこのミリ秒以内に続けて押したら二度押しとして無視
const SESS_WARN=180;             // ⏱: この分数を超えて止めたら「止め忘れかも」と知らせる
const DEFAULT_URL='...';         // 実値は入れない（各端末の設定に保存）
const DEFAULT_TOKEN='...';
/* ============================================================ */

const $=id=>document.getElementById(id);
function on(id,ev,fn){const el=$(id);
  if(el) el.addEventListener(ev,fn); else console.warn('missing element:',id);}
const isReal=v=>!!v&&v!=='...';
const isAndroid=/Android/i.test(navigator.userAgent);
const isMobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const wait=ms=>new Promise(r=>setTimeout(r,ms));

const KEY='sleeplog.v2';         // 名前を LIFE LOG にしても保存場所は変えない（変えると記録が見えなくなる）
const blank=()=>({items:[],settings:{url:'',token:''}});
let db=null;
try{db=JSON.parse(localStorage.getItem(KEY))}catch(e){}
if(!db){
  db=blank();
  try{const o=JSON.parse(localStorage.getItem('sleeplog.v1'));
    if(o){db.settings=o.settings||db.settings;
      (o.records||[]).forEach(r=>db.items.push({id:r.id,kind:'sleep',type:r.type,
        start:r.start,end:r.end,dateKey:r.dateKey,tags:[],note:'',
        deleted:!!r.deleted,updatedAt:r.end||new Date().toISOString(),synced:false}));}
  }catch(e){}
}
if(!db.items) db.items=[];
if(!db.settings) db.settings={url:'',token:''};
if(!db.settings.url&&isReal(DEFAULT_URL))     db.settings.url=DEFAULT_URL;
if(!db.settings.token&&isReal(DEFAULT_TOKEN)) db.settings.token=DEFAULT_TOKEN;

const save=()=>localStorage.setItem(KEY,JSON.stringify(db));
const now=()=>new Date().toISOString();
const pad=n=>String(n).padStart(2,'0');
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const dkey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const hhmm=d=>`${pad(d.getHours())}:${pad(d.getMinutes())}`;
const md=d=>`${d.getMonth()+1}/${d.getDate()}`;
const fmt=d=>new Date(d).toLocaleString('ja-JP',
  {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
const clone=o=>JSON.parse(JSON.stringify(o));
const dayKeyOf=d=>{const x=new Date(d);x.setHours(x.getHours()-DAY_CUT);return dkey(x);};
const shiftKey=(k,n)=>{const d=new Date(k+'T12:00:00');d.setDate(d.getDate()+n);return dkey(d);};
const isOffStr=s=>typeof s==='string'&&s.startsWith('#');
const atTime=(base,v,afterBase)=>{const [H,M]=v.split(':').map(Number);
  const d=new Date(base);d.setHours(H,M,0,0);
  if(afterBase&&d<new Date(base)) d.setDate(d.getDate()+1);
  return d.toISOString();};
const canSync=()=>!!(db.settings.url&&db.settings.token);

/* ---------- 設定（項目定義）: 1レコードとして同期 ---------- */
const CFG_KEYS=['title','levels','who','trig','tags','daily','act','ievals','rt','en'];
function migrateCfg(c){               // 「排便完了」廃止 → トイレ入室→退出 に統合（1回だけ）
  const rt=c.data.rt; if(rt.mig3) return;
  let ch=false;
  (rt.steps||[]).forEach(s=>{if(s.opt==='bowel'){s.off=true;delete s.opt;ch=true;}});
  if(!(rt.steps||[]).some(s=>s.opt==='toilet')){
    const t=(rt.steps||[]).find(s=>!s.off&&/入室/.test(s.label));
    if(t){t.opt='toilet';ch=true;}
  }
  (c.data.daily||[]).forEach(d=>{
    if(d.opt==='auto:toilet'&&/排便/.test(d.label)){d.label='トイレ滞在 目安以内';ch=true;}});
  rt.mig3=true;
  if(ch) touch(c);
}
function actDailyLabel(m){
  const ty=aType(m);
  if(ty.t==='rep') return `${m.label} 1日${ty.goal}回`;
  if(ty.t==='time') return `${m.label} ${ty.goal}分`;
  return `${m.label} ×${ty.goal}`;
}
/* 鍛錬・作業メニューの追加（1回だけ）。
   第1弾をすでに入れた設定には、⏱の初期メニューだけを足す。
   初期値のままの設定（まだ同期していない新しい端末）は送らない（本物の設定を上書きしないため） */
function migrateAct(c){
  const d=c.data; if(d.actMig2) return;
  const fresh=c.updatedAt===new Date(0).toISOString();
  d.act=Array.isArray(d.act)?d.act:clone(DEFAULTS.act);
  d.daily=d.daily||[];
  let ch=false,targets;
  if(d.actMig){
    targets=DEFAULTS.act.filter(m=>aType(m).t==='time'&&!d.act.some(x=>x.label===m.label)).map(clone);
    targets.forEach(m=>{d.act.push(m);ch=true;});
  }else targets=d.act;
  targets.forEach(m=>{
    if(m.off||!m.label||!aType(m).goal) return;
    const o='auto:act:'+m.label;
    if(d.daily.some(x=>x.opt===o)) return;
    d.daily.push({icon:m.icon||'',label:actDailyLabel(m),opt:o});ch=true;
  });
  d.actMig=true;d.actMig2=true;
  if(ch&&!fresh) touch(c);
}
function cfgRec(){
  let c=db.items.find(i=>i.kind==='config');
  if(!c){c={id:'CONFIG',kind:'config',data:clone(DEFAULTS),
    updatedAt:new Date(0).toISOString(),synced:false};db.items.push(c);}
  if(!c.data) c.data=clone(DEFAULTS);
  CFG_KEYS.forEach(k=>{if(c.data[k]===undefined) c.data[k]=clone(DEFAULTS[k]);});
  if(!c.data.rt||typeof c.data.rt!=='object') c.data.rt=clone(DEFAULTS.rt);
  Object.keys(DEFAULTS.rt).forEach(k=>{
    if(k!=='mig3'&&c.data.rt[k]===undefined) c.data.rt[k]=clone(DEFAULTS.rt[k]);});
  if(!c.data.en||typeof c.data.en!=='object') c.data.en=clone(DEFAULTS.en);
  if(!Array.isArray(c.data.en.islands)) c.data.en.islands=clone(DEFAULTS.en.islands);
  if(!c.data.en.goal) c.data.en.goal=DEFAULTS.en.goal;
  if(!Array.isArray(c.data.act)) c.data.act=clone(DEFAULTS.act);
  migrateCfg(c);
  migrateAct(c);
  return c;
}
const C=()=>cfgRec().data;

/* 旧バージョンのタグキー・反応段階をラベルへ移行（初回のみ） */
const OLD_TAG={sex:'sex',wake2:'寝起き◎',wake1:'寝起き○',wake0:'寝起き△',
  awake:'中途覚醒',alc:'飲酒',sick:'体調不良',late:'夜更かし',dream:'夢'};
const OLD_LV=['気づいて流せた','不機嫌な態度・無言','嫌味・きつい言葉',
  '大きな声・怒鳴った','物に当たった','手が出た'];
if(!db.migrated2){
  db.items.forEach(i=>{
    if(i.kind==='sleep'&&Array.isArray(i.tags))
      i.tags=i.tags.map(t=>OLD_TAG[t]||t);
    if(i.kind==='anger'&&!i.levelKey&&typeof i.level==='number')
      i.levelKey=OLD_LV[i.level]||'';
  });
  db.migrated2=true;save();
}

const live=()=>db.items.filter(i=>!i.deleted&&i.kind!=='config');
const actives=()=>live().filter(i=>i.kind==='sleep'&&!i.end)
  .sort((a,b)=>new Date(b.start)-new Date(a.start));
const activeRec=()=>actives()[0];          // 計測中が複数あるときは一番新しいもの
/* 睡眠の日付 = 起きた日（終了時刻のカレンダー日付）。
   計測中は仮の日付: 夜の睡眠は18時以降開始なら翌日、PNは開始日。 */
function sleepKey(r){
  if(r.end) return dkey(new Date(r.end));
  const d=new Date(r.start);
  if(r.type!=='pn'&&d.getHours()>=SLEEP_EVE) d.setDate(d.getDate()+1);
  return dkey(d);
}
const keyOf=i=>i.kind==='sleep'?sleepKey(i):i.dateKey;
let migNote='';
if(!db.migrated3){                    // 過去の睡眠の日付を新ルールで付け直す（1回だけ）
  let n=0;
  db.items.forEach(i=>{
    if(i.kind!=='sleep'||!i.start)return;
    const k=sleepKey(i); if(i.dateKey===k)return;
    i.dateKey=k;
    if(!i.deleted){touch(i);n++;}
  });
  db.migrated3=true;save();
  if(n) migNote=`睡眠の日付を「起きた日」に付け直しました（${n}件）。同期するとスプレッドシートにも反映されます`;
}
const mins=r=>r.end?Math.max(0,Math.round((new Date(r.end)-new Date(r.start))/60000)):0;
const durText=m=>m>=60?`${Math.floor(m/60)}時間${pad(m%60)}分`:`${m}分`;
function touch(r){r.updatedAt=now();r.synced=false;}
const drop=r=>{
  if(!r)return;
  if(r.everSynced){r.deleted=true;touch(r);}
  else{const i=db.items.indexOf(r);if(i>=0)db.items.splice(i,1);}
  save();};
const pnToday=()=>live().filter(i=>i.kind==='sleep'&&i.type==='pn'
  &&sleepKey(i)===dkey(new Date())).length;
const pnIndexOf=r=>live().filter(x=>x.kind==='sleep'&&x.type==='pn'
  &&sleepKey(x)===sleepKey(r)&&new Date(x.start)<=new Date(r.start)).length;
const tagDef=lb=>C().tags.find(t=>t.label===lb)||{icon:'',label:lb};
function lvDef(r){
  const L=C().levels;
  let d=L.find(x=>x.label===r.levelKey);
  if(!d&&typeof r.level==='number') d=L[r.level];
  return d||{icon:'·',label:r.levelKey||'(未設定)'};
}

/* ---------- 鍛錬・作業: データ（kind='act'・1メニュー×1日＝1記録、中に記録を並べる）
   タップ1件 = {id, t:開始時刻, n:回数または分, u:更新時刻, e:終了時刻(⏱のみ), del:取り消し} ---------- */
function aType(m){
  const o=String((m&&m.opt)||'').trim().toLowerCase();
  let x=o.match(/^rep(\d+)$/); if(x) return {t:'rep',goal:Math.max(1,+x[1])};
  x=o.match(/^min(\d+)$/);     if(x) return {t:'time',goal:+x[1]};
  x=o.match(/^tap(\d+)$/);     if(x) return {t:'tap',goal:Math.max(1,+x[1])};
  return {t:'tap',goal:1};
}
const actDefs=()=>(C().act||[]).filter(x=>!x.off&&x.label);
const actDef=lb=>(C().act||[]).find(x=>x.label===lb)||null;
const hid=s=>{let h=0;for(const ch of String(s))h=(h*31+ch.codePointAt(0))|0;return (h>>>0).toString(36);};
const actId=(k,lb)=>'AC-'+k.replace(/-/g,'')+'-'+hid(lb);
function actRec(k,lb,create){
  let r=db.items.find(i=>i.kind==='act'&&i.id===actId(k,lb));
  if(!r&&create){
    r={id:actId(k,lb),kind:'act',dateKey:k,label:lb,
       start:new Date(k+'T12:00:00').toISOString(),end:null,taps:[],updatedAt:now(),synced:false};
    db.items.push(r);
  }
  if(r&&r.deleted){if(create)r.deleted=false;else return null;}
  return r||null;
}
const liveTaps=r=>((r&&r.taps)||[]).filter(t=>t&&!t.del)
  .sort((a,b)=>new Date(a.t)-new Date(b.t));
const tapMin=t=>t.e?(+t.n||0):Math.max(0,Math.round((Date.now()-new Date(t.t))/60000));
function actProg(lb,k){
  const m=actDef(lb),r=actRec(k,lb,false);
  const ty=m?aType(m):{t:(r&&r.typ)||'tap',goal:(r&&r.goal!=null)?+r.goal:1};
  const ts=liveTaps(r);
  const time=ty.t==='time';
  const total=ts.reduce((a,t)=>a+(time?tapMin(t):(+t.n||0)),0);
  const val=ty.t==='tap'?ts.length:total;
  const run=time?(ts.find(t=>!t.e)||null):null;
  return {m:m||{icon:'',label:lb},ty,r,ts,sets:ts.length,total,val,run,
    done:ty.goal>0&&val>=ty.goal};
}
function progText(p){
  if(p.ty.t==='time') return (p.ty.goal?`${p.val}/${p.ty.goal}分`:`${p.val}分`)+(p.sets?`（${p.sets}回）`:'');
  if(p.ty.t==='rep') return `${p.val}/${p.ty.goal}回${p.sets?'（'+p.sets+'セット）':''}`;
  return `${p.val}/${p.ty.goal}回`;
}
function tapLabel(t,typ){
  const s=hhmm(new Date(t.t));
  if(typ==='time') return `${s}–${t.e?hhmm(new Date(t.e)):'計測中'} ${tapMin(t)}分`;
  if(typ==='rep') return `${s} ${t.n}回`;
  return s;
}
function addTap(lb,n,iso,k,endIso){
  k=k||dayKeyOf(new Date());
  const m=actDef(lb),r=actRec(k,lb,true);
  if(m){const ty=aType(m);r.typ=ty.t;r.goal=ty.goal;}
  const tp={id:uid(),t:iso||now(),n:Math.max(0,Math.round(+n||0)),u:now()};
  if(r.typ==='time'){
    tp.e=endIso||null;
    if(tp.e) tp.n=Math.max(0,Math.round((new Date(tp.e)-new Date(tp.t))/60000));
  }else tp.n=Math.max(1,tp.n||1);
  r.taps=r.taps||[];r.taps.push(tp);
  touch(r);save();
  return {r,t:tp};
}
function delTap(r,id){
  if(!r)return;
  const t=(r.taps||[]).find(x=>x.id===id); if(!t||t.del)return;
  t.del=true;t.u=now();touch(r);save();     // 消した印を残す（他の端末の記録と足し合わせても復活しない）
}
function endTap(r,t,iso){
  t.e=iso||now();
  t.n=Math.max(0,Math.round((new Date(t.e)-new Date(t.t))/60000));
  t.u=now();touch(r);save();
  return t.n;
}
function lastTapToday(){
  const k=dayKeyOf(new Date());let best=null;
  live().filter(i=>i.kind==='act'&&i.dateKey===k).forEach(r=>liveTaps(r).forEach(t=>{
    if(!best||new Date(t.t)>new Date(best.t.t)) best={r,t};}));
  return best;
}
/* 計測中の⏱（全メニューで1つだけ） */
function activeSess(){
  let best=null;
  live().filter(i=>i.kind==='act'&&i.typ==='time').forEach(r=>(r.taps||[]).forEach(t=>{
    if(t&&!t.del&&!t.e&&(!best||new Date(t.t)>new Date(best.t.t))) best={r,t};}));
  return best;
}
/* 2つの端末の記録を足し合わせる（同じ ID は更新が新しい方。どちらかで取り消されていれば取り消し） */
function unionTaps(a,b){
  const m={};
  (a||[]).concat(b||[]).forEach(t=>{
    if(!t||!t.id)return;
    const x=m[t.id];
    if(!x){m[t.id]=Object.assign({},t);return;}
    const del=!!(x.del||t.del);
    if(String(t.u||'')>String(x.u||'')) m[t.id]=Object.assign({},t);
    if(del) m[t.id].del=true;
  });
  return Object.keys(m).map(id=>m[id]).sort((x,y)=>new Date(x.t)-new Date(y.t));
}
const tapSig=a=>(a||[]).map(t=>[t.id,t.n||0,t.e||'',t.del?1:0].join(':')).sort().join(',');
const repN=lb=>{const v=(db.settings.actLast||{})[lb];return v>0?v:5;};
function setRepN(lb,v){
  db.settings.actLast=db.settings.actLast||{};
  db.settings.actLast[lb]=Math.max(1,Math.min(999,Math.round(v)||1));save();
}
const lastTapAt={};
function tapMenu(lb,n){
  const t=Date.now();
  if(lastTapAt[lb]&&t-lastTapAt[lb]<ACT_GAP) return;     // 二度押し防止
  lastTapAt[lb]=t;
  const m=actDef(lb),ty=m?aType(m):{t:'tap'};
  if(ty.t==='time'){
    const a=activeSess();
    if(a&&a.r.label===lb){                               // 同じメニュー → 停止
      const mn=endTap(a.r,a.t);
      toast(mn>SESS_WARN?`⏱ ${lb} ${mn}分で止めました。長すぎる場合は止め忘れかもしれません（「記録を見る・直す」で直せます）`
                         :`⏱ ${lb} ${mn}分を記録しました`);
    }else{
      if(a){const mn=endTap(a.r,a.t);toast(`⏱ ${a.r.label} を ${mn}分で止めて、${lb} を始めました`);}
      addTap(lb,0,now(),dayKeyOf(new Date()),null);
    }
  }else addTap(lb,n);
  try{if(navigator.vibrate)navigator.vibrate(25);}catch(e){}
  render();sync(true);
}

/* ---------- 朝ルーティン: データ ---------- */
const rtId=k=>'RT-'+k.replace(/-/g,'');
function rtKeyOf(d){                   // 2:00〜3:00 に始めた場合もその日の朝として扱う
  const x=new Date(d),h=x.getHours();
  return (h>=RT_WIN[0]&&h<DAY_CUT)?dkey(x):dayKeyOf(x);
}
const inRtWin=iso=>{const h=new Date(iso).getHours();return h>=RT_WIN[0]&&h<RT_WIN[1];};
const rtRec=k=>db.items.find(i=>i.kind==='routine'&&i.id===rtId(k)&&!i.deleted);
const activeRt=()=>live().find(i=>i.kind==='routine'&&!i.end&&!i.closed);
const stepDefs=()=>C().rt.steps.filter(s=>!s.off);
const stepLabel=role=>{const d=C().rt.steps.find(s=>s.opt===role);return d?d.label:null;};
const ytIcon=lb=>{const y=C().rt.yt.find(x=>x.label===lb);return (y&&y.icon)||lb;};
function rtTarget(k){const [H,M]=(C().rt.wake||'03:30').split(':').map(Number);
  const t=new Date(k+'T00:00:00');t.setHours(H,M,0,0);return t;}
function startRoutine(startIso,sleepId){
  const k=rtKeyOf(new Date(startIso)),id=rtId(k);
  let r=db.items.find(i=>i.id===id);
  if(r&&!r.deleted) return r;                      // 同じ朝のルーティンは1つだけ
  const base={id,kind:'routine',dateKey:k,start:startIso,end:null,steps:{},
    yt:'',note:'',sleepId:sleepId||null,closed:'',deleted:false};
  if(r) Object.assign(r,base); else {r=base;db.items.push(r);}
  touch(r);save();return r;
}
function autoCloseRoutines(){
  const mh=(+C().rt.maxH||6)*3600000;let ch=false;
  live().filter(i=>i.kind==='routine'&&!i.end&&!i.closed).forEach(r=>{
    if(Date.now()-new Date(r.start)>mh){r.closed='auto';touch(r);ch=true;}});
  if(ch) save();
}
function rtMetrics(r){
  const T=stepLabel('toilet'),P=stepLabel('padlet'),st=r.steps||{};
  const wakeDiff=Math.round((new Date(r.start)-rtTarget(r.dateKey))/60000);
  const totalMin=r.end?Math.max(0,Math.round((new Date(r.end)-new Date(r.start))/60000)):'';
  const toiletMin=(T&&st[T]&&r.end)?Math.max(0,Math.round((new Date(r.end)-new Date(st[T]))/60000)):'';
  const labels=stepDefs().filter(d=>d.opt!=='wake'&&d.opt!=='end').map(d=>d.label);
  Object.keys(st).forEach(l=>{if(!labels.includes(l))labels.push(l);});
  const stepText=labels.map(l=>l+'='+(st[l]?hhmm(new Date(st[l])):'')).join('|');
  const ytText=r.yt?(ytIcon(r.yt)!==r.yt?ytIcon(r.yt)+' ':'')+r.yt:'';
  const status=r.closed==='done'?'完了':r.closed==='auto'?'未完':'進行中';
  return {wakeDiff,totalMin,toiletMin,padletText:(P&&st[P])?'○':'',ytText,stepText,status};
}
function followSleep(s){                // 睡眠の終了時刻を直したらルーティンの起床も追従
  if(!s||s.kind!=='sleep'||!s.end)return;
  const r=live().find(i=>i.kind==='routine'&&i.sleepId===s.id);
  if(r&&r.start!==s.end){r.start=s.end;touch(r);save();}
}
function linkHref(u){
  if(!u) return '';
  if(!isAndroid) return u;
  try{const x=new URL(u);
    return `intent://${x.host}${x.pathname}${x.search}#Intent;scheme=${x.protocol.replace(':','')};`+
      `package=com.brave.browser;S.browser_fallback_url=${encodeURIComponent(u)};end`;
  }catch(e){return u;}
}

/* ---------- インボックス: データ ---------- */
const inboxAll=()=>live().filter(i=>i.kind==='inbox');
const inboxPending=()=>inboxAll().filter(i=>!i.eval);
const evDef=lb=>C().ievals.find(x=>x.label===lb)||{icon:'',label:lb};
const extractUrl=s=>{const m=String(s||'').match(/https?:\/\/[^\s<>"]+/);return m?m[0]:'';};
function addInbox(title,url,src){
  const s=now();
  const r={id:uid(),kind:'inbox',start:s,end:null,dateKey:dayKeyOf(new Date()),
    title:(title||url||'(無題)').slice(0,300),url:url||'',note:'',eval:'',doneAt:null,
    src:src,updatedAt:s,synced:false};
  db.items.push(r);save();return r;
}

/* ---------- EN: データ ---------- */
const phAll=()=>live().filter(i=>i.kind==='phrase');
const pcAll=()=>live().filter(i=>i.kind==='piece');
const islDefs=()=>(C().en.islands||[]).filter(x=>!x.off);
const islDef=lb=>(C().en.islands||[]).find(x=>x.label===lb)||{icon:'',label:lb};
const islName=lb=>{if(!lb)return '（島なし）';const d=islDef(lb);return (d.icon?d.icon+' ':'')+lb;};
const ST={raw:'未添削',fixed:'整えた',anki:'Anki済み',used:'使えた'};
function stageOf(p){
  if((p.usedIn||[]).length) return 'used';
  if(p.ankiAt) return 'anki';
  if(p.en) return 'fixed';
  return 'raw';
}
const oneLine=s=>String(s||'').replace(/[\t\r\n]+/g,' ').replace(/\s{2,}/g,' ').trim();
const wordCount=s=>(String(s||'').match(/[A-Za-z][A-Za-z'’-]*/g)||[]).length;
function addPhrase(raw,isl){
  const s=now();
  const p={id:'PH'+uid(),kind:'phrase',start:s,end:null,dateKey:dayKeyOf(new Date()),
    island:isl||'',raw:raw,en:'',ja:'',tip:'',fixedAt:null,ankiAt:null,usedIn:[],usedAt:null,
    updatedAt:s,synced:false};
  db.items.push(p);save();return p;
}
function relink(ids){                  // フレーズの「使えた」を書いた・話した記録から付け直す
  const P=pcAll();
  ids.forEach(id=>{
    const p=db.items.find(i=>i.id===id&&i.kind==='phrase'); if(!p)return;
    const u=P.filter(x=>(x.phrases||[]).includes(id)).map(x=>x.id);
    if(JSON.stringify(u)!==JSON.stringify(p.usedIn||[])){
      p.usedIn=u;
      if(u.length&&!p.usedAt) p.usedAt=now();
      if(!u.length) p.usedAt=null;
      touch(p);
    }
  });
}
function enStats(){
  const A=phAll(),P=pcAll(),T=dayKeyOf(new Date()),wk=shiftKey(T,-6);
  const spokenIds=new Set(P.filter(x=>x.type==='speak').flatMap(x=>x.phrases||[]));
  const W=P.filter(x=>x.dateKey>=wk&&x.dateKey<=T);
  const Ww=W.filter(x=>x.type!=='speak'),Ws=W.filter(x=>x.type==='speak');
  return {A,P,total:A.length,
    fixed:A.filter(p=>p.en).length,
    anki:A.filter(p=>p.ankiAt).length,
    used:A.filter(p=>(p.usedIn||[]).length).length,
    spoken:A.filter(p=>spokenIds.has(p.id)).length,
    raw:A.filter(p=>!p.en).length,
    today:A.filter(p=>p.dateKey===T).length,
    wWrite:Ww.length,wWords:Ww.reduce((a,x)=>a+(+x.words||0),0),
    wSpeak:Ws.length,wMin:Ws.reduce((a,x)=>a+(+x.mins||0),0)};
}
function pieceText(x){
  const n=(x.phrases||[]).length;
  if(x.type==='speak') return `🎙 話した ${x.mins??'-'}分（詰まり ${x.stuck??'-'}・日本語 ${x.jp??'-'}）${x.island?' '+x.island:''}${n?' フレーズ'+n:''}`;
  return `✍️ 書いた ${x.words??'-'}語${x.island?' '+x.island:''}${n?' フレーズ'+n:''}`;
}

/* ---------- 睡眠・PN の計測 ---------- */
let pendingRt=null,stopping=false;
function startRec(type){
  if(activeRec())return;
  const s=now();
  db.items.push({id:uid(),kind:'sleep',type,start:s,end:null,
    dateKey:sleepKey({type,start:s,end:null}),tags:[],note:'',updatedAt:s,synced:false});
  save();render();sync(true);
}
/* 終了: 押した瞬間の時刻を控え、他端末の最新状態を確認してから記録する */
async function stopRec(){
  const a=activeRec(); if(!a||stopping)return;
  const t=now();
  if(canSync()&&navigator.onLine){
    stopping=true;render();
    try{await Promise.race([sync(true),wait(STOP_WAIT)]);}catch(e){}
    stopping=false;
  }
  const x=db.items.find(i=>i.id===a.id);
  if(!x||x.deleted||x.end){
    render();
    toast(`この${a.type==='pn'?'パワーナップ':'睡眠'}は他の端末で終了または削除済みでした（上書きしていません）`);
    return;
  }
  x.end=t;x.dateKey=sleepKey(x);touch(x);save();render();
  pendingRt=x.type==='sleep'?x.id:null;
  openEdit(x.id);sync(true);
}
const canUndo=r=>!!(r&&r.kind==='sleep'&&r.end&&(Date.now()-new Date(r.end))<UNDO_MIN*60000);

/* ---------- 日次チェック: データと判定 ---------- */
const dayId=k=>'DAY-'+k.replace(/-/g,'');
function dailyRec(k,create){
  let r=db.items.find(i=>i.kind==='daily'&&i.id===dayId(k));
  if(!r&&create){
    r={id:dayId(k),kind:'daily',dateKey:k,start:new Date(k+'T12:00:00').toISOString(),
       end:null,checks:{},ovr:{},auto:{},brave:null,updatedAt:now(),synced:false};
    db.items.push(r);
  }
  if(r&&create&&r.deleted) r.deleted=false;
  return r;
}
const dItems=()=>C().daily.filter(x=>!x.off);
function dType(it){
  const o=it.opt||'';
  if(o.startsWith('auto:')) return {t:'auto',key:o.slice(5)};
  const m=o.match(/^x(\d+)$/); if(m) return {t:'count',n:Math.max(1,+m[1])};
  return {t:'tri'};
}
function autoVal(key,k){
  const rt=C().rt;
  if(key.startsWith('act:')){                     // 鍛錬・作業: 目標に届けば ✓。今日の途中は判定しない
    const lb=key.slice(4),p=actProg(lb,k),text=progText(p);
    if(p.done) return {v:'ok',text};
    if(!p.sets) return null;                       // 記録が0件の日は「データなし」
    if(k<dayKeyOf(new Date())&&!p.run) return {v:'ng',text};
    return {v:null,text:text+(p.run?' 計測中':' 途中')};
  }
  if(key==='wake'){
    const lo=new Date(k+'T02:00:00'),hi=new Date(k+'T07:00:00');
    const s=live().filter(i=>i.kind==='sleep'&&i.type==='sleep'&&i.end
      &&new Date(i.end)>=lo&&new Date(i.end)<=hi)
      .sort((a,b)=>new Date(a.end)-new Date(b.end)).pop();
    if(!s) return null;
    const diff=Math.round((new Date(s.end)-rtTarget(k))/60000);
    return {v:Math.abs(diff)<=(+rt.tol||0)?'ok':'ng',
      text:`${hhmm(new Date(s.end))}（${diff>=0?'+':''}${diff}分）`};
  }
  if(key==='padlet'||key==='toilet'){
    const r=rtRec(k); if(!r) return null;
    const mt=rtMetrics(r);
    if(key==='padlet'){
      const P=stepLabel('padlet'); if(!P) return null;
      if(mt.padletText) return {v:'ok',text:hhmm(new Date(r.steps[P]))};
      return r.closed?{v:'ng',text:'記録なし'}:null;   // 進行中は未確定
    }
    if(mt.toiletMin==='') return null;
    return {v:mt.toiletMin<=(+rt.toilet||0)?'ok':'ng',text:`${mt.toiletMin}分（目安${rt.toilet}分）`};
  }
  return null;
}
/* 値: undefined=未記入 / 'na'=対象外（分母から除外） / 'ok' / 'ng' / 回数型は 0〜n の数値（0=できなかった） */
function dailyEval(k,rec){
  if(rec===undefined) rec=dailyRec(k,false);
  if(rec&&rec.deleted) rec=null;
  const ch=(rec&&rec.checks)||{},ov=(rec&&rec.ovr)||{};
  let done=0,total=0,filled=0;
  const rows=dItems().map(it=>{
    const ty=dType(it);let v,auto=null,manual=false;
    if(ty.t==='auto'){
      auto=autoVal(ty.key,k);
      if(ov[it.label]!==undefined){v=ov[it.label];manual=true;}
      else v=(auto&&auto.v)?auto.v:undefined;
    }else v=ch[it.label];
    const ok=ty.t==='count'?v===ty.n:v==='ok';
    if(v!=='na'){total++;if(ok)done++;}
    if(v!==undefined)filled++;
    let mark=v===undefined?'未':v==='na'?'−':v==='ok'?'○':v==='ng'?'✕':`${v}/${ty.n}`;
    if(ty.t==='auto'&&v!==undefined) mark+=manual?'(手)':'(自)';
    return {it,ty,v,auto,manual,ok,mark};
  });
  return {rows,done,total,filled};
}
function snapAuto(rec){        // 自動判定の結果を記録に残す（スプレッドシート用）
  const e=dailyEval(rec.dateKey,rec),a={};
  e.rows.forEach(r=>{if(r.ty.t==='auto'&&r.auto)a[r.it.label]=r.auto;});
  const changed=JSON.stringify(rec.auto||{})!==JSON.stringify(a);
  rec.auto=a; return changed;
}

/* ---------- 同期 ---------- */
function forPush(i){
  const o=Object.assign({},i); delete o.synced; delete o.everSynced;
  if(i.kind==='sleep'){
    o.dateKey=sleepKey(i);                 // 常に新ルールの日付で送る
    o.minutes=mins(i);
    o.pnIndex=i.type==='pn'?pnIndexOf(i):'';
    o.tagText=(i.tags||[]).map(k=>{const t=tagDef(k);return (t.icon||'')+t.label;}).join(' ');
  }else if(i.kind==='anger'){
    const l=lvDef(i);
    o.levelText=(l.icon||'')+' '+l.label;
  }else if(i.kind==='daily'){
    const e=dailyEval(i.dateKey,i);
    o.doneCount=e.done;o.total=e.total;
    o.checkText=e.rows.map(r=>r.it.label+'='+r.mark).join('|');
  }else if(i.kind==='routine'){
    Object.assign(o,rtMetrics(i));
  }else if(i.kind==='inbox'){
    o.evalText=i.eval?((evDef(i.eval).icon||'')+' '+i.eval).trim():'';
  }else if(i.kind==='phrase'){
    o.stageText=ST[stageOf(i)];
  }else if(i.kind==='act'){
    const p=actProg(i.label,i.dateKey);
    o.typ=p.ty.t;o.goal=p.ty.goal;o.sets=p.sets;o.total=p.total;o.done=p.done;
    o.tapText=p.ts.map(t=>tapLabel(t,p.ty.t)).join(', ');
  }else if(i.kind==='report'&&i.from&&i.to){
    try{                                   // report.js が読めなくても同期は止めない
      const ks=keysBetween(i.from,i.to),n=ks.length;
      const S=repStats(ks),P=repStats(keysBetween(shiftKey(i.from,-n),shiftKey(i.from,-1)));
      o.sumText=`起床${hm(S.wake)}(ブレ${S.wakeSd??'—'}分) 睡眠${dm(S.sleep)} PN${S.pn} 朝RT${dm(S.rt)} 達成率${S.rate??'—'}% Brave${dm(S.brave)} 場面${S.ang} EN${S.ph}`;
      o.insText=insights(S,P).concat(reviewHints(S)).join(' / ');
      o.markText=MARK[i.mark]||'';
    }catch(e){}
  }
  return o;
}
function merge(remote){
  const map={}; db.items.forEach(i=>map[i.id]=i);
  let pieceChanged=false;
  (remote||[]).forEach(r=>{
    const l=map[r.id];
    if(!l){
      db.items.push(Object.assign(r,{synced:true,everSynced:true}));map[r.id]=r;
      if(r.kind==='piece') pieceChanged=true;
    }else if(r.kind==='act'){                  // 鍛錬・作業は記録を足し合わせる
      const u=unionTaps(l.taps,r.taps),newer=(r.updatedAt||'')>(l.updatedAt||'');
      const more=tapSig(u)!==tapSig(r.taps);   // こちらにしかない・こちらが新しい記録がある → 送り直す
      if(newer) Object.assign(l,r);
      l.taps=u;l.everSynced=true;
      if(more) l.synced=false; else if(newer) l.synced=true;
    }else if((r.updatedAt||'')>(l.updatedAt||'')){
      Object.assign(l,r,{synced:true,everSynced:true});
      if(r.kind==='piece') pieceChanged=true;
    }
  });
  if(pieceChanged) relink(phAll().map(p=>p.id));
}
/* 同期中に呼ばれたら、終わったあとにもう一度回す（変更を取りこぼさない）。
   「同期済み」にするのは、送った時点と updatedAt が同じ記録だけ。 */
let busy=false,again=false,syncP=null;
function sync(silent){
  if(busy){again=true;return syncP;}
  syncP=runSync(silent);
  return syncP;
}
async function runSync(silent){
  const url=db.settings.url,token=db.settings.token;
  if(!url||!token){if(!silent)msg('設定に URL とトークンを入れてください');return;}
  busy=true;
  if(!silent)msg('同期中…');
  try{
    let round=0;
    do{
      again=false;round++;
      const items=db.items.filter(i=>!i.synced);
      const sent={};items.forEach(i=>{sent[i.id]=i.updatedAt;});
      const push=items.map(forPush);
      const res=await fetch(url,{method:'POST',
        headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({token:token,push:push})});
      const j=await res.json();
      if(!j.ok)throw new Error(j.error||'NG');
      (j.saved||[]).forEach(id=>{const r=db.items.find(x=>x.id===id);
        if(!r)return;
        if(r.updatedAt===sent[id]){r.synced=true;r.everSynced=true;}
        else again=true;                     // 送信中に変わった → もう一度送る
      });
      merge(j.items);save();
    }while(again&&round<3);
    render();
    if($('idlg').open) drawInbox();
    if($('ndlg').open&&!$('phdlg').open&&!$('pcdlg').open) drawEn();
    if($('rpdlg').open) drawReport();
    if($('acdlg').open) drawActDlg();
    if($('ddlg').open) drawDaily();
    msg('同期しました '+new Date().toLocaleTimeString('ja-JP'));
  }catch(e){msg('同期失敗：'+e.message+'（記録は端末に保持）');}
  finally{busy=false;}
}
function msg(t){const a=$('syncmsg'),b=$('cfgMsg');if(a)a.textContent=t;if(b)b.textContent=t;}
function toast(t){const el=$('toast');if(!el)return;el.textContent=t;el.style.display='';
  clearTimeout(toast.tm);toast.tm=setTimeout(()=>{el.style.display='none';},8000);}