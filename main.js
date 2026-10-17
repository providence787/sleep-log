/* LIFE LOG — main.js（カスタマイズ・設定・ショートカット・共有受取・起動）
   読み込み順: core → ui → en → room → report → main（必ず最後）。
   全体を即時関数で包んでいるため、ここで作る名前は他のファイルとぶつからない。
   他のファイルから呼ばれる関数はここに置かないこと。 */
(function(){
'use strict';

/* core.js が無いと何もできないので、画面に知らせて終わる */
if(typeof db==='undefined'||typeof $!=='function'){
  document.body.insertAdjacentHTML('afterbegin',
    '<div style="background:#5a2422;color:#fff;padding:12px;border-radius:12px;margin:8px 0">'+
    'core.js が読み込めていません。GitHub に core.js があるか確認し、アプリを開き直してください。</div>');
  return;
}

/* 1つが失敗しても残りの処理は続ける */
function safe(label,fn){
  try{return fn();}catch(e){console.error('[main] '+label,e);}
}
const gv=id=>{const el=$(id);return el?el.value:'';};
const sv=(id,v)=>{const el=$(id);if(el)el.value=v;};

/* ================= 項目のカスタマイズ ================= */
const toLines=(arr,key)=>(Array.isArray(arr)?arr:[]).map(x=>{
  if(typeof x==='string') return x.replace(/^#+/,'#');
  if(!x) return '';
  const s=[x.icon||'',x.label||''].concat(key&&x[key]?[x[key]]:[]).join(',');
  return (x.off?'#':'')+s;
}).filter(Boolean).join('\n');
const parsePlain=s=>String(s||'').split('\n')
  .map(x=>x.trim().replace(/^#+/,'#')).filter(x=>x&&x!=='#');
function parseIcon(s,key){
  return String(s||'').split('\n').map(x=>x.trim()).filter(Boolean).map(line=>{
    let off=false;
    if(line.startsWith('#')){off=true;line=line.replace(/^#+/,'').trim();}
    const p=line.split(',').map(y=>y.trim());
    const o=p.length>1?{icon:p[0],label:p[1]}:{icon:'',label:p[0]};
    if(key&&p[2]) o[key]=p[2];
    if(off) o.off=true;
    return o;
  }).filter(o=>o.label);
}
function fillCfg(c){
  const rt=c.rt||DEFAULTS.rt;
  sv('cTitle',c.title||'');
  sv('cLevels',toLines(c.levels));
  sv('cWho',toLines(c.who));
  sv('cTrig',toLines(c.trig));
  sv('cTags',toLines(c.tags,'group'));
  sv('cDaily',toLines(c.daily,'opt'));
  sv('cAct',toLines(c.act,'opt'));
  sv('cSteps',toLines(rt.steps,'opt'));
  sv('cYt',toLines(rt.yt));
  sv('cIev',toLines(c.ievals));
  sv('cLinkName',rt.linkName||'');
  sv('cLink',rt.link||'');
  sv('cWake',rt.wake||DEFAULTS.rt.wake);
  sv('cTol',rt.tol??DEFAULTS.rt.tol);
  sv('cToilet',rt.toilet??DEFAULTS.rt.toilet);
  sv('cMaxH',rt.maxH??DEFAULTS.rt.maxH);
  sv('cIsl',toLines((c.en&&c.en.islands)||DEFAULTS.en.islands));
}
/* 同じ名前が2つあると記録が混ざるので止める */
function dupLabel(list){
  const seen={};
  for(const x of list){if(seen[x.label])return x.label;seen[x.label]=1;}
  return '';
}
function checkCfg(o){
  if(!o.lv.filter(x=>!x.off).length) return '「自分の反応」は1つ以上必要です';
  if(!o.steps.filter(x=>!x.off).length) return 'ルーティンのステップは1つ以上必要です';
  if(!o.iev.filter(x=>!x.off).length) return 'インボックスの評価は1つ以上必要です';
  if(!o.isl.filter(x=>!x.off).length) return 'EN の島は1つ以上必要です';
  let d;
  if((d=dupLabel(o.daily))) return `日次チェックに同じ名前があります：${d}`;
  if((d=dupLabel(o.act)))   return `鍛錬・作業メニューに同じ名前があります：${d}`;
  if((d=dupLabel(o.steps))) return `ルーティンのステップに同じ名前があります：${d}`;
  for(const m of o.act){
    if(m.opt&&!/^(tap|rep|min)\d+$/.test(m.opt))
      return `鍛錬「${m.label}」の3つめ「${m.opt}」が読めません（tap5 / rep20 / min15 の形）`;
  }
  const actNames=o.act.filter(m=>!m.off).map(m=>m.label);
  for(const it of o.daily){
    const op=it.opt||''; if(!op||/^x\d+$/.test(op)) continue;
    if(['auto:wake','auto:padlet','auto:toilet'].includes(op)) continue;
    if(op.startsWith('auto:room:')) continue;            // 牧師ルーム（room.js が判定）
    if(op.startsWith('auto:act:')){
      const n=op.slice(9);
      if(!it.off&&!actNames.includes(n))
        return `日次「${it.label}」の auto:act:${n} に当たる鍛錬メニューがありません（名前を合わせるか、行頭に # を付けてください）`;
      continue;
    }
    return `日次「${it.label}」の3つめ「${op}」が読めません`;
  }
  const roles={};
  for(const s of o.steps){
    if(!s.opt) continue;
    if(!['wake','toilet','padlet','end'].includes(s.opt))
      return `ステップ「${s.label}」の3つめ「${s.opt}」が読めません（wake / toilet / padlet / end）`;
    if(s.off) continue;
    if(roles[s.opt]) return `ステップの ${s.opt} が2つあります（${roles[s.opt]} と ${s.label}）`;
    roles[s.opt]=s.label;
  }
  return '';
}
function openCfg(){safe('openCfg',()=>{fillCfg(C());$('cMsg').textContent='';$('cdlg').showModal();});}
on('btnCfg','click',openCfg);
on('cCancel','click',()=>$('cdlg').close());
on('cReset','click',()=>{
  if(!confirm('項目を初期値に戻しますか？（記録は消えません。保存を押すまで確定しません）'))return;
  fillCfg(clone(DEFAULTS));
});
on('cSave','click',()=>safe('cSave',()=>{
  const say=t=>{$('cMsg').textContent=t;};
  const o={
    lv:parseIcon(gv('cLevels'),null),
    steps:parseIcon(gv('cSteps'),'opt'),
    iev:parseIcon(gv('cIev'),null),
    isl:parseIcon(gv('cIsl'),null),
    daily:parseIcon(gv('cDaily'),'opt'),
    act:parseIcon(gv('cAct'),'opt').map(m=>(m.opt&&(m.opt=m.opt.toLowerCase()),m))
  };
  const err=checkCfg(o); if(err){say(err);return;}
  const num=(id,d)=>{const v=gv(id);return v===''||isNaN(+v)?d:+v;};
  const rec=cfgRec(),old=rec.data;

  /* 新しく足した鍛錬メニュー（目標あり）は、日次チェックにも自動判定の行を足すか聞く */
  const oldNames=(old.act||[]).map(m=>m.label);
  const fresh=o.act.filter(m=>!m.off&&!oldNames.includes(m.label)&&aType(m).goal>0
    &&!o.daily.some(d=>d.opt==='auto:act:'+m.label));
  if(fresh.length&&confirm(`新しい鍛錬メニュー（${fresh.map(m=>m.label).join('、')}）を日次チェックにも入れますか？\n（目標に届くと自動で✓になります）`)){
    fresh.forEach(m=>o.daily.push({icon:m.icon||'',
      label:typeof actDailyLabel==='function'?actDailyLabel(m):m.label,opt:'auto:act:'+m.label}));
  }

  rec.data=Object.assign({},old,{            // 既存データとマージ（知らない項目＝room などを消さない）
    title:gv('cTitle').trim()||DEFAULTS.title,
    levels:o.lv,
    who:parsePlain(gv('cWho')),
    trig:parsePlain(gv('cTrig')),
    tags:parseIcon(gv('cTags'),'group'),
    daily:o.daily,
    act:o.act,
    ievals:o.iev,
    rt:Object.assign({},old.rt,{
      wake:gv('cWake')||DEFAULTS.rt.wake,
      tol:num('cTol',DEFAULTS.rt.tol),
      toilet:num('cToilet',DEFAULTS.rt.toilet),
      maxH:Math.max(1,num('cMaxH',DEFAULTS.rt.maxH)),
      steps:o.steps,
      yt:parseIcon(gv('cYt'),null),
      link:gv('cLink').trim(),
      linkName:gv('cLinkName').trim(),
      mig3:true}),
    en:Object.assign({},old.en,{islands:o.isl}),
    actMig:true,actMig2:true
  });
  touch(rec);save();$('cdlg').close();render();sync(true);
}));

/* ================= 同期の設定 ================= */
const GAS_RE=/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/;
on('btnSync','click',()=>sync(false));
on('btnSave','click',()=>{
  const u=gv('cfgUrl').trim(),t=gv('cfgToken').trim();
  db.settings.url=u;db.settings.token=t;save();render();
  if(u&&!GAS_RE.test(u)) toast('URL が「https://script.google.com/macros/s/…/exec」の形になっていません。コピーし直してください');
  msg('保存しました');sync(false);
});
on('btnGen','click',()=>{
  const a=new Uint8Array(18);crypto.getRandomValues(a);
  sv('cfgToken',btoa(String.fromCharCode(...a))
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''));
  msg('新しいトークンを作りました。GAS のスクリプト プロパティ「TOKEN」に同じ値を入れてから「保存して同期」を押してください');
});
on('btnLink','click',async()=>{
  const u=gv('cfgUrl').trim(),t=gv('cfgToken').trim();
  if(!u||!t){msg('URL とトークンを入れてください');return;}
  const link=location.origin+location.pathname+'#setup='+encodeURIComponent(JSON.stringify({u,t}));
  const o=$('linkOut');if(o){o.value=link;o.style.display='';}
  try{await navigator.clipboard.writeText(link);
    msg('セットアップリンクをコピーしました（他人に送らないでください）');}
  catch(e){if(o)o.select();msg('下の欄を長押ししてコピーしてください');}
});
on('toast','click',()=>{const el=$('toast');if(el)el.style.display='none';});

/* ================= ショートカット（?a=sleep / ?a=pn） ================= */
const CMD_KEY='sleeplog.lastcmd';      // 保存場所の名前は変えない
function cmdBlock(a){                  // 実行してよければ ''、だめなら理由
  if(!isMobile) return 'pc';
  const nav=(performance.getEntriesByType&&performance.getEntriesByType('navigation')[0])||{};
  if(nav.type==='reload'||nav.type==='back_forward') return 'reload';
  let last=null;try{last=JSON.parse(localStorage.getItem(CMD_KEY));}catch(e){}
  if(last&&last.a===a&&Date.now()-last.at<CMD_GAP*60000) return 'dup';
  localStorage.setItem(CMD_KEY,JSON.stringify({a,at:Date.now()}));
  return '';
}
async function runSleepCmd(a){
  if(canSync()){
    if(navigator.onLine){
      msg('他の端末の記録を確認中…');
      try{await Promise.race([sync(true),wait(STOP_WAIT)]);}catch(e){}
    }else if(!confirm('オフラインのため他の端末の記録を確認できません。このまま開始しますか？')){
      render();return;}
  }
  const r=activeRec();
  if(r){render();
    toast(`${r.type==='pn'?'パワーナップ':'睡眠'}を計測中です（${hhmm(new Date(r.start))} 開始）。終わったら「起きた（終了）」を押してください`);
    return;}
  startRec(a);
}

/* ================= 起動 ================= */
let setupNote='',shareNote='';
safe('setup',()=>{
  if(!location.hash.startsWith('#setup=')) return;
  try{const o=JSON.parse(decodeURIComponent(location.hash.slice(7)));
    if(o&&o.u&&o.t){db.settings.url=o.u;db.settings.token=o.t;save();
      setupNote='セットアップしました。この端末に URL とトークンを保存しました';}
    else setupNote='セットアップリンクを読み取れませんでした';
  }catch(e){setupNote='セットアップリンクを読み取れませんでした';}
});
sv('cfgUrl',db.settings.url||'');
sv('cfgToken',db.settings.token||'');
safe('cfg',()=>{cfgRec();save();});

const QS=new URLSearchParams(location.search);
const cmd=QS.get('a');
safe('share',()=>{                       // Android の共有メニューから
  if(!(QS.has('text')||QS.has('url')||QS.has('title'))) return;
  const t=(QS.get('title')||'').trim(),x=(QS.get('text')||'').trim();
  const u=extractUrl(QS.get('url'))||extractUrl(x);
  const title=t||x.replace(u,'').trim()||u;
  if(u&&inboxPending().some(i=>i.url===u)) shareNote='📥 既にインボックスに入っています';
  else if(title||u){const r=addInbox(title,u,'share');
    shareNote=`📥 インボックスに入れました（未処理 ${inboxPending().length}件）：${r.title}`;}
});
history.replaceState(null,'',location.pathname);   // ?a= / 共有 / #setup= を URL から消す

safe('autoClose',()=>{if(typeof autoCloseRoutines==='function')autoCloseRoutines();});
safe('render',()=>render());

let cmdRan=false;
safe('cmd',()=>{
  if(cmd==='sleep'||cmd==='pn'){
    const why=cmdBlock(cmd);
    if(!why){cmdRan=true;runSleepCmd(cmd);}
    else if(why==='pc') msg('パソコンでは睡眠・PNのショートカットは無視します（画面のボタンを使ってください）');
  }
  if(cmd==='anger'&&typeof openAnger==='function') openAnger(null);
  if(cmd==='daily'&&typeof openDaily==='function') openDaily(0);
  if(cmd==='en'&&typeof openEn==='function') openEn();
  if(cmd==='room'&&typeof openRoom==='function') openRoom();
  if(cmd==='report'&&typeof openReport==='function') openReport();
});
if(setupNote) msg(setupNote);
if(shareNote) toast(shareNote+'　— 今は見ずに閉じて大丈夫です');
else if(typeof migNote==='string'&&migNote) toast(migNote);

/* 読み込めていないファイルを知らせる（消えない表示） */
safe('check',()=>{
  const miss=[];
  if(typeof render!=='function')     miss.push('ui.js');
  if(typeof drawEn!=='function')     miss.push('en.js');
  if(typeof openRoom!=='function')   miss.push('room.js');
  if(typeof drawReport!=='function') miss.push('report.js');
  if(!miss.length) return;
  const el=$('toast'); if(!el) return;
  el.textContent=`読み込めていないファイルがあります：${miss.join('、')}（GitHub にあるか確認し、アプリを開き直してください）`;
  el.style.display='';
});

if(!cmdRan) sync(true);

/* 1秒ごとの表示更新（計測中のタイマーなど） */
if(typeof tick==='function') setInterval(()=>{try{tick();}catch(e){}},1000);

/* アプリに戻ってきたとき: 日付の切り替え・自動終了を反映して同期 */
let lastResume=0;
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState!=='visible') return;
  safe('resume',()=>{
    if(typeof autoCloseRoutines==='function') autoCloseRoutines();
    render();
    if(Date.now()-lastResume>15000){lastResume=Date.now();sync(true);}
  });
});
window.addEventListener('online',()=>sync(true));

if(navigator.storage&&navigator.storage.persist) navigator.storage.persist().catch(()=>{});
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js',{updateViaCache:'none'})
    .then(reg=>{reg.update().catch(()=>{});}).catch(()=>{});
}
})();