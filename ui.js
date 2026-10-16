/* LIFE LOG — ui.js（メイン画面と各ダイアログ：睡眠・朝ルーティン・場面ログ・鍛錬・日次チェック・インボックス）
   読み込み順: core → ui → en → report → main。
   このファイルで作る名前（他のファイルで同じ名前を作らないこと）:
     render renderRoutineCard endRoutine drawYt renderAct renderDaySum renderAng renderHist
     kindName renderTrash hms tick
     cur openEdit drawDlg drawTags shift setTime
     rcur openRoutine drawRoutine
     acur aNew openAnger drawATime setAStart shiftA setADay drawAnger closeAnger
     ak openActDlg drawActDlg acIso
     dk openDaily drawDaily setDaily drawBrave setBrave
     iSeen openInbox inboxRow drawInbox addManual
   en.js / report.js の関数（renderEnSum・activeExp）は、あるときだけ呼ぶ。
   setInterval(tick) と visibilitychange は main.js で登録する。 */

/* ---------- メイン画面 ---------- */
function render(){
  autoCloseRoutines();
  const m=$('main'),a=activeRec(),r=activeRt(),pn=pnToday();
  $('today').textContent=`${dkey(new Date())} ／ PN ${pn}/${PN_LIMIT}`;
  $('warn').style.display=canSync()?'none':'';
  if(a){
    const n=actives().length;
    m.innerHTML=`${n>1?`<div class="warn">計測中の記録が${n}件あります。下の履歴で不要な方を開いて削除してください（ここでは一番新しいものを表示）</div>`:''}
      <div class="center sub">${a.type==='pn'?'パワーナップ':'睡眠'}中　開始 ${hhmm(new Date(a.start))}</div>
      <div class="timer" id="tmr">00:00:00</div>
      <button class="big stop" id="bStop"${stopping?' disabled':''}>${stopping?'他の端末の記録を確認中…':'起きた（終了）'}</button>
      <div class="row"><button class="small" id="bCancel">開始を取り消す</button></div>`;
    on('bStop','click',stopRec);
    on('bCancel','click',()=>{if(confirm('この計測を破棄しますか？')){drop(a);render();sync(true);}});
  }else if(r){
    renderRoutineCard(m,r);
  }else{
    const last=live().filter(i=>i.kind==='sleep'&&i.end)
      .sort((x,y)=>new Date(x.end)-new Date(y.end)).pop();
    const tr=rtRec(rtKeyOf(new Date()));
    let rtBtn='🌅 朝ルーティンを始める';
    if(tr){const mt=rtMetrics(tr);
      rtBtn=`🌅 今朝のルーティン：${mt.status}${mt.totalMin!==''?' '+durText(mt.totalMin):''}${mt.toiletMin!==''?' ／ 🚽'+mt.toiletMin+'分':''}`;}
    m.innerHTML=`<button class="big sleep" id="bS">😴 睡眠を開始</button>
      <button class="big pn" id="bP">⚡ パワーナップ開始${pn>=PN_LIMIT?'（本日上限）':`（残り${PN_LIMIT-pn}）`}</button>
      <div class="center sub">${last?`直近: ${last.type==='pn'?'PN':'睡眠'} ${durText(mins(last))}（${hhmm(new Date(last.start))}→${hhmm(new Date(last.end))}）`:'まだ記録がありません'}</div>
      <button class="small mt" id="bRt" style="width:100%">${rtBtn}</button>`;
    on('bS','click',()=>startRec('sleep'));
    on('bP','click',()=>{if(pn>=PN_LIMIT&&!confirm(`本日のPNは既に${PN_LIMIT}回です。続けますか？`))return;
      startRec('pn');});
    on('bRt','click',()=>{
      if(tr){openRoutine(tr.id);return;}
      startRoutine(now(),null);render();sync(true);});
  }
  $('btnAng').textContent=C().title+'を記録';
  renderAct();
  renderDaySum();
  if(typeof renderEnSum==='function'){try{renderEnSum();}catch(e){console.warn(e);}}
  renderAng();renderHist();renderTrash();
  const p=db.items.filter(i=>!i.synced).length;
  $('syncmsg').textContent=p?`未同期 ${p} 件`:'すべて同期済み';
  tick();
}
function renderRoutineCard(m,r){
  const rt=C().rt,wd=rtMetrics(r).wakeDiff;
  m.innerHTML=`<div class="center sub">🌅 朝ルーティン　起床 ${hhmm(new Date(r.start))}（目標${wd>=0?'+':''}${wd}分）</div>
    <div class="timer" id="rtTmr">00:00:00</div>
    <div class="center sub" id="rtToilet" style="min-height:16px;font-size:14px"></div>
    <div id="rtSteps" class="mt"></div>
    <div class="mini mt" style="margin-bottom:6px">YouTube（任意・もう一度タップで解除）</div>
    <div class="chips" id="rtYt"></div>
    <a class="linkbtn" id="rtLink">🎧 ${esc(rt.linkName||'リンク')} を開く</a>
    <div class="row mt"><button class="small" id="rtEdit">時刻を修正</button>
      <button class="small" id="rtAbort">未完で閉じる</button></div>
    <div class="row mt"><button class="small sleep" id="rtS">😴 睡眠</button>
      <button class="small pn" id="rtP">⚡ PN</button></div>`;
  const box=$('rtSteps'),st=r.steps||{};
  const addBtn=(icon,label,time,done,fn)=>{
    const b=document.createElement('button');
    b.className='lvbtn step'+(done?' done':'');
    b.innerHTML=`<span class="lvic">${esc(icon)}</span><span>${esc(label)}</span><span class="tm">${time||'—'}</span>`;
    b.addEventListener('click',fn);box.appendChild(b);
  };
  const defs=stepDefs();
  defs.forEach(d=>{
    if(d.opt==='wake'){addBtn(d.icon,d.label,hhmm(new Date(r.start)),true,()=>openRoutine(r.id));return;}
    if(d.opt==='end'){addBtn(d.icon,d.label,'',false,()=>endRoutine(r));return;}
    addBtn(d.icon,d.label,st[d.label]?hhmm(new Date(st[d.label])):'',!!st[d.label],()=>{
      r.steps=r.steps||{};
      if(r.steps[d.label]) delete r.steps[d.label]; else r.steps[d.label]=now();
      touch(r);save();render();sync(true);
    });
  });
  if(!defs.some(d=>d.opt==='end')) addBtn('🏁','ルーティン終了','',false,()=>endRoutine(r));
  drawYt($('rtYt'),r,()=>{render();sync(true);});
  const lk=$('rtLink');
  if(lk){
    if(rt.link){lk.href=linkHref(rt.link);
      if(!isAndroid){lk.target='_blank';lk.rel='noopener';}}
    else lk.style.display='none';
  }
  on('rtEdit','click',()=>openRoutine(r.id));
  on('rtAbort','click',()=>{
    if(!confirm('未完として閉じますか？（あとで時刻の修正・再開ができます）'))return;
    r.closed='auto';touch(r);save();render();sync(true);});
  on('rtS','click',()=>startRec('sleep'));
  on('rtP','click',()=>startRec('pn'));
}
function endRoutine(r){r.end=now();r.closed='done';touch(r);save();render();sync(true);}
function drawYt(box,r,after){
  if(!box)return;
  box.innerHTML='';
  C().rt.yt.filter(y=>!y.off||y.label===r.yt).forEach(y=>{
    const b=document.createElement('button');
    b.className='chip'+(r.yt===y.label?' on a':'');
    b.textContent=`${y.icon||''} ${y.label}`;
    b.addEventListener('click',()=>{r.yt=(r.yt===y.label?'':y.label);touch(r);save();after();});
    box.appendChild(b);
  });
}

/* ---------- 鍛錬・作業カード ---------- */
function renderAct(){
  const card=$('actCard'),box=$('actBox'); if(!card||!box)return;
  const defs=actDefs();
  card.style.display=defs.length?'':'none';
  box.innerHTML='';
  const k=dayKeyOf(new Date()),run=activeSess();
  defs.forEach(m=>{
    const p=actProg(m.label,k),ty=p.ty;
    const b=document.createElement('button');
    b.style.marginBottom='6px';
    if(ty.t==='time'){
      const isRun=!!(run&&run.r.label===m.label);
      b.className='lvbtn'+(isRun?' run':p.done?' done':'');
      const g=ty.goal?`${p.val}/${ty.goal}分`:`${p.val}分`;
      b.innerHTML=`<span class="lvic">${esc(m.icon||'⏱')}</span>`+
        `<span>${esc(m.label)} ${isRun?'<b>■ 停止</b>':'<b>▶</b>'}</span>`+
        `<span class="tm">${isRun?`<span class="actRunT" data-s="${new Date(run.t.t).getTime()}"></span> ／ `:''}${esc(g)}</span>`;
      b.addEventListener('click',()=>tapMenu(m.label,0));
      box.appendChild(b);
    }else if(ty.t==='rep'){
      const n=repN(m.label);
      const row=document.createElement('div');row.className='row';row.style.alignItems='stretch';
      b.className='lvbtn'+(p.done?' done':'');b.style.flex='1 1 auto';
      b.innerHTML=`<span class="lvic">${esc(m.icon||'')}</span><span>${esc(m.label)} <b>＋${n}</b></span><span class="tm">${esc(progText(p))}</span>`;
      b.addEventListener('click',()=>tapMenu(m.label,repN(m.label)));
      const mk=(t,d)=>{const x=document.createElement('button');x.className='small';x.textContent=t;
        x.style.cssText='flex:0 0 44px;margin-bottom:6px;padding:0';
        x.addEventListener('click',()=>{setRepN(m.label,repN(m.label)+d);renderAct();});return x;};
      row.appendChild(mk('−',-1));row.appendChild(b);row.appendChild(mk('＋',1));
      box.appendChild(row);
    }else{
      b.className='lvbtn'+(p.done?' done':'');
      b.innerHTML=`<span class="lvic">${esc(m.icon||'')}</span><span>${esc(m.label)}</span><span class="tm">${esc(progText(p))}</span>`;
      b.addEventListener('click',()=>tapMenu(m.label,1));
      box.appendChild(b);
    }
  });
}
on('actUndo','click',()=>{
  const x=lastTapToday();
  if(!x){toast('今日の鍛錬・作業の記録はまだありません');return;}
  if(!confirm(`${x.r.label}　${tapLabel(x.t,x.r.typ)} を取り消しますか？`))return;
  delTap(x.r,x.t.id);render();sync(true);
});
on('actOpen','click',()=>openActDlg(0));

function renderDaySum(){
  const T=dayKeyOf(new Date()),e=dailyEval(T),y=dailyEval(shiftKey(T,-1));
  let ex=null;
  if(typeof activeExp==='function'){try{ex=activeExp();}catch(err){console.warn(err);}}
  $('daySum').innerHTML=`日次チェック　今日 ${e.done}/${e.total}
    <br><span class="mini">昨日 ${y.done}/${y.total}（未記入 ${y.rows.length-y.filled}）</span>`+
    (ex?`<br><span class="mini" style="color:#a8e0bf">🧪 実験: ${esc(ex.exp)}</span>`:'');
  $('btnInbox').textContent=`📥 インボックス ${inboxPending().length}`;
}
function renderAng(){
  const t=dkey(new Date()),d7=new Date();d7.setDate(d7.getDate()-6);
  const wk=live().filter(i=>i.kind==='anger'&&i.dateKey>=dkey(d7));
  const cnt={};
  wk.forEach(r=>{const d=lvDef(r);cnt[d.icon+d.label]=(cnt[d.icon+d.label]||0)+1;});
  const brk=C().levels.filter(l=>cnt[l.icon+l.label])
    .map(l=>`${l.icon}${cnt[l.icon+l.label]}`).join('  ');
  $('angSum').innerHTML=`${esc(C().title)}　今日 ${wk.filter(i=>i.dateKey===t).length}件 / 7日 ${wk.length}件
    <br><span style="font-size:15px">${brk||'—'}</span>`;
}
function renderHist(){
  const hk=live().filter(i=>i.kind==='sleep'||i.kind==='anger'||i.kind==='routine');
  const keys=[...new Set(hk.map(keyOf))].sort().reverse().slice(0,7);
  const h=$('hist'); h.innerHTML=keys.length?'':'<div class="sub">—</div>';
  keys.forEach(k=>{
    const rs=hk.filter(i=>keyOf(i)===k).sort((a,b)=>new Date(a.start)-new Date(b.start));
    const tot=rs.filter(i=>i.kind==='sleep').reduce((s,r)=>s+mins(r),0);
    h.insertAdjacentHTML('beforeend',
      `<div class="hist" style="border-bottom:0;padding-bottom:2px">
         <b>${k.slice(5)}</b><span class="sub">睡眠計 ${durText(tot)}</span></div>`);
    rs.forEach(r=>{
      const el=document.createElement('div'); el.className='hist';
      const dot=r.synced?'':'<span class="dot"></span>';
      if(r.kind==='sleep'){
        const sd=new Date(r.start),pre=dkey(sd)!==k?md(sd)+' ':'';
        el.innerHTML=`<span><span class="tag ${r.type==='pn'?'t-pn':'t-sleep'}">${r.type==='pn'?'PN'+pnIndexOf(r):'睡眠'}</span>
          ${pre}${hhmm(sd)}→${r.end?hhmm(new Date(r.end)):'計測中'}
          <span class="mini">${esc((r.tags||[]).map(tg=>tagDef(tg).icon||'').join(''))}${r.note?' 📝':''}</span></span>
          <span>${r.end?durText(mins(r)):''}${dot}</span>`;
        el.addEventListener('click',()=>openEdit(r.id));
      }else if(r.kind==='routine'){
        const mt=rtMetrics(r);
        el.innerHTML=`<span><span class="tag t-rt">朝</span>${hhmm(new Date(r.start))}→${r.end?hhmm(new Date(r.end)):mt.status}
          <span class="mini">${mt.toiletMin!==''?' 🚽'+mt.toiletMin+'分':''}${mt.padletText?' 📌':''}${r.note?' 📝':''}</span></span>
          <span>${mt.totalMin!==''?durText(mt.totalMin):''}${dot}</span>`;
        el.addEventListener('click',()=>openRoutine(r.id));
      }else{
        const l=lvDef(r);
        el.innerHTML=`<span><span class="tag t-ang">場面</span>${hhmm(new Date(r.start))}
          ${esc(l.icon)} ${esc(l.label)}<span class="mini"> ${esc(r.who||'')} ${esc((r.trig||[]).join('/'))}</span></span>
          <span>${dot}</span>`;
        el.addEventListener('click',()=>openAnger(r.id));
      }
      h.appendChild(el);
    });
  });
}
function kindName(r){
  if(r.kind==='anger') return '場面 '+lvDef(r).label;
  if(r.kind==='sleep') return r.type==='pn'?'PN':'睡眠';
  if(r.kind==='daily') return '日次 '+(r.dateKey||'');
  if(r.kind==='routine') return '朝ルーティン '+(r.dateKey||'');
  if(r.kind==='inbox') return '📥 '+(r.title||'');
  if(r.kind==='phrase') return '🗣 '+String(r.en||r.raw||'').slice(0,40);
  if(r.kind==='piece') return '🗣 '+(r.type==='speak'?'話した ':'書いた ')+(r.dateKey||'');
  if(r.kind==='report') return '📊 レポート '+(r.from||'')+'〜'+(r.to||'');
  if(r.kind==='act') return '💪 '+(r.label||'')+' '+(r.dateKey||'');
  return r.kind||'?';
}
function renderTrash(){
  const t=$('trash'),ds=db.items.filter(i=>i.deleted)
    .sort((a,b)=>new Date(b.start||0)-new Date(a.start||0)).slice(0,30);
  t.innerHTML=ds.length?'':'<div class="sub">ありません</div>';
  ds.forEach(r=>{
    const el=document.createElement('div');el.className='hist';
    el.innerHTML=`<span class="mini">${r.start?fmt(r.start):''}　${esc(kindName(r))}</span>`;
    const b=document.createElement('button');b.className='small';b.textContent='復元';
    b.style.flex='0 0 auto';
    b.addEventListener('click',()=>{r.deleted=false;touch(r);
      if(r.kind==='piece') relink(r.phrases||[]);
      if(r.kind==='phrase') relink([r.id]);
      save();render();sync(true);});
    el.appendChild(b);t.appendChild(el);
  });
}
const hms=s=>`${pad(Math.floor(s/3600))}:${pad(Math.floor(s/60)%60)}:${pad(s%60)}`;
function tick(){
  const a=activeRec(),el=$('tmr');
  if(a&&el) el.textContent=hms(Math.floor((Date.now()-new Date(a.start))/1000));
  const r=activeRt(),t2=$('rtTmr');
  if(r&&t2) t2.textContent=hms(Math.max(0,Math.floor((Date.now()-new Date(r.start))/1000)));
  const tw=$('rtToilet');
  if(r&&tw){
    const T=stepLabel('toilet'),b=T&&r.steps&&r.steps[T];
    tw.textContent=b?`🚽 入室から ${Math.max(0,Math.floor((Date.now()-new Date(b))/60000))}分（目安 ${C().rt.toilet}分）`:'';
  }
  document.querySelectorAll('.actRunT').forEach(x=>{
    const s=+x.dataset.s; if(!s)return;
    x.textContent='⏱ '+hms(Math.max(0,Math.floor((Date.now()-s)/1000)));
  });
}

/* ---------- 睡眠 / PN 編集（即時反映） ---------- */
let cur=null;
function openEdit(id){
  cur=db.items.find(i=>i.id===id); if(!cur)return;
  $('dlgTitle').textContent=(cur.type==='pn'?'パワーナップ':'睡眠')+' の記録';
  $('dlgNote').value=cur.note||'';
  drawTags();drawDlg();
  if(!$('dlg').open) $('dlg').showModal();
}
function drawDlg(){
  $('dlgStartT').textContent=fmt(cur.start);
  $('dlgEndT').textContent=cur.end?fmt(cur.end):'（計測中）';
  $('dlgDur').textContent=cur.end?durText(mins(cur)):'計測中';
  $('inS').value=hhmm(new Date(cur.start));
  $('inE').value=cur.end?hhmm(new Date(cur.end)):'';
  $('dlgUndo').style.display=canUndo(cur)?'':'none';
}
function drawTags(){
  const c=$('dlgTags'); c.innerHTML='';
  const defs=C().tags.filter(t=>!t.off);
  (cur.tags||[]).forEach(lb=>{                       // 非表示・定義から消えたタグも表示
    if(!defs.some(t=>t.label===lb)) defs.push(tagDef(lb));});
  defs.forEach(t=>{
    const b=document.createElement('button');
    b.className='chip'+((cur.tags||[]).includes(t.label)?' on':'');
    b.textContent=`${t.icon||''} ${t.label}`;
    b.addEventListener('click',()=>{
      cur.tags=cur.tags||[];
      const isOn=cur.tags.includes(t.label);
      cur.tags=t.group
        ? cur.tags.filter(k=>tagDef(k).group!==t.group)   // 同グループは排他
        : cur.tags.filter(k=>k!==t.label);                // それ以外は自分を外す
      if(!isOn) cur.tags.push(t.label);
      touch(cur);save();drawTags();renderHist();
    });
    c.appendChild(b);
  });
}
function shift(f,n){
  const t=new Date(f==='s'?cur.start:(cur.end||new Date()));
  t.setMinutes(t.getMinutes()+n);
  if(f==='s') cur.start=t.toISOString();
  else cur.end=t.toISOString();
  cur.dateKey=sleepKey(cur);
  touch(cur);drawDlg();
}
function setTime(f,v){
  if(!v||!cur)return; const [H,M]=v.split(':').map(Number);
  const base=new Date(f==='s'?cur.start:(cur.end||cur.start));
  base.setHours(H,M,0,0);
  if(f==='s') cur.start=base.toISOString();
  else{if(base<new Date(cur.start))base.setDate(base.getDate()+1);cur.end=base.toISOString();}
  cur.dateKey=sleepKey(cur);
  touch(cur);save();drawDlg();renderHist();
}
on('inS','change',e=>setTime('s',e.target.value));
on('inE','change',e=>setTime('e',e.target.value));
on('dlgNote','change',e=>{if(cur){cur.note=e.target.value;touch(cur);save();renderHist();}});
on('dlgClose','click',()=>$('dlg').close());
on('dlgDel','click',()=>{if(!cur||!confirm('この記録を削除しますか？'))return;
  drop(cur);cur=null;$('dlg').close();});
/* 終了の取り消し: 記録は残し、終了時刻だけを消して計測中に戻す */
on('dlgUndo','click',()=>{
  if(!canUndo(cur))return;
  const other=actives().some(i=>i.id!==cur.id);
  if(!confirm(other?'他にも計測中の記録があります。それでもこの記録を計測中に戻しますか？'
                   :'終了を取り消して計測中に戻しますか？'))return;
  cur.end=null;cur.dateKey=sleepKey(cur);touch(cur);
  const r=live().find(i=>i.kind==='routine'&&i.sleepId===cur.id&&!i.end
    &&!Object.keys(i.steps||{}).length);          // 自動で始まった空のルーティンは消す
  if(r) drop(r);
  pendingRt=null;save();$('dlg').close();
});
on('dlg','close',()=>{
  if(cur){const v=$('dlgNote').value;
    if(v!==(cur.note||'')){cur.note=v;touch(cur);save();}
    followSleep(cur);}
  if(pendingRt){                                   // 朝の「起きた」→ ルーティン開始
    const s=db.items.find(i=>i.id===pendingRt);pendingRt=null;
    if(s&&!s.deleted&&s.type==='sleep'&&s.end&&inRtWin(s.end)) startRoutine(s.end,s.id);
  }
  cur=null;render();sync(true);});

/* ---------- 朝ルーティンの修正（即時反映） ---------- */
let rcur=null;
function openRoutine(id){
  rcur=db.items.find(i=>i.id===id); if(!rcur)return;
  $('rNote').value=rcur.note||'';$('rMsg').textContent='';
  drawRoutine();
  if(!$('rdlg').open) $('rdlg').showModal();
}
function drawRoutine(){
  const r=rcur; if(!r)return;
  const mt=rtMetrics(r);
  $('rDate').textContent=r.dateKey;
  $('rStat').textContent=`${mt.status}　所要 ${mt.totalMin===''?'—':durText(mt.totalMin)}　トイレ滞在 ${mt.toiletMin===''?'—':mt.toiletMin+'分'}`;
  const body=$('rBody');body.innerHTML='';
  const addRow=(label,iso,onSet,onClear)=>{
    const el=document.createElement('div');el.className='rrow';
    const sp=document.createElement('span');sp.style.cssText='flex:1;font-size:14px';sp.textContent=label;
    el.appendChild(sp);
    const inp=document.createElement('input');inp.type='time';
    inp.value=iso?hhmm(new Date(iso)):'';
    inp.addEventListener('change',()=>{if(!inp.value)return;
      onSet(inp.value);touch(r);save();drawRoutine();renderHist();});
    el.appendChild(inp);
    const b=document.createElement('button');b.className='small';b.textContent='消す';
    b.style.flex='0 0 auto';
    if(onClear&&iso) b.addEventListener('click',()=>{onClear();touch(r);save();drawRoutine();renderHist();});
    else b.style.visibility='hidden';
    el.appendChild(b);body.appendChild(el);
  };
  addRow('⏰ 起床（開始）',r.start,v=>{r.start=atTime(r.start,v,false);},null);
  const st=r.steps||(r.steps={});
  const labels=[];
  stepDefs().filter(d=>d.opt!=='wake'&&d.opt!=='end').forEach(d=>{
    labels.push(d.label);
    addRow(`${d.icon||''} ${d.label}`,st[d.label],
      v=>{st[d.label]=atTime(r.start,v,true);},()=>{delete st[d.label];});
  });
  Object.keys(st).filter(l=>!labels.includes(l)).forEach(l=>
    addRow(l,st[l],v=>{st[l]=atTime(r.start,v,true);},()=>{delete st[l];}));
  addRow('🏁 退出（終了）',r.end,v=>{r.end=atTime(r.start,v,true);r.closed='done';},
    ()=>{r.end=null;r.closed='';});
  drawYt($('rYt'),r,drawRoutine);
  $('rReopen').style.display=(r.end||r.closed)?'':'none';
}
on('rNote','change',e=>{if(rcur){rcur.note=e.target.value;touch(rcur);save();}});
on('rClose','click',()=>$('rdlg').close());
on('rReopen','click',()=>{
  const r=rcur; if(!r)return;
  const mh=+C().rt.maxH||6;
  if(Date.now()-new Date(r.start)>mh*3600000){
    $('rMsg').textContent=`開始から${mh}時間を過ぎているため再開できません（時刻の修正はできます）`;return;}
  r.end=null;r.closed='';touch(r);save();$('rdlg').close();
});
on('rDel','click',()=>{if(!rcur||!confirm('このルーティンの記録を削除しますか？'))return;
  drop(rcur);rcur=null;$('rdlg').close();});
on('rdlg','close',()=>{
  if(rcur){const v=$('rNote').value;
    if(v!==(rcur.note||'')){rcur.note=v;touch(rcur);save();}}
  rcur=null;render();sync(true);});

/* ---------- 場面ログ（保存を押すまで確定しない） ---------- */
let acur=null,aNew=false;
function openAnger(id){
  if(id){const src=db.items.find(i=>i.id===id); if(!src)return;
    acur=clone(src); aNew=false;}
  else{const s=now();
    acur={id:uid(),kind:'anger',start:s,end:s,loggedAt:s,dateKey:dkey(new Date()),
      level:null,levelKey:'',who:'',trig:[],note:'',updatedAt:s,synced:false};
    aNew=true;}
  $('aHead').textContent=C().title;
  $('aNote').value=acur.note||'';
  $('aMsg').textContent='';
  $('aDel').style.display=aNew?'none':'';
  $('aSame').style.display=aNew?'':'none';
  drawATime();drawAnger();
  if(!$('adlg').open) $('adlg').showModal();
}
function drawATime(){
  if(!acur)return;
  const d=new Date(acur.start),t=dkey(new Date()),y=shiftKey(t,-1),k=dkey(d);
  $('aTime').textContent=fmt(acur.start);
  $('aInT').value=hhmm(d);
  $('aDayT').className='small seg'+(k===t?' on':'');
  $('aDayY').className='small seg'+(k===y?' on':'');
  $('aTimeNote').textContent=d>new Date()?'　※未来の時刻です':'';
}
function setAStart(d){
  acur.start=d.toISOString();acur.end=acur.start;acur.dateKey=dkey(d);drawATime();}
function shiftA(n){const d=new Date(acur.start);d.setMinutes(d.getMinutes()+n);setAStart(d);}
function setADay(off){
  if(!acur)return;
  const d=new Date(acur.start),t=new Date();t.setDate(t.getDate()+off);
  d.setFullYear(t.getFullYear(),t.getMonth(),t.getDate());setAStart(d);
}
on('aDayT','click',()=>setADay(0));
on('aDayY','click',()=>setADay(-1));
on('aInT','change',e=>{
  if(!acur||!e.target.value)return;
  const [H,M]=e.target.value.split(':').map(Number);
  const d=new Date(acur.start);d.setHours(H,M,0,0);setAStart(d);
});
function drawAnger(){
  const lv=$('aLv');lv.innerHTML='';
  C().levels.forEach((l,i)=>{
    if(l.off&&acur.levelKey!==l.label)return;
    const b=document.createElement('button');
    b.className='lvbtn'+(acur.levelKey===l.label?' on':'');
    b.innerHTML=`<span class="lvic">${esc(l.icon||'')}</span><span>${esc(l.label)}</span>`;
    b.addEventListener('click',()=>{
      if(acur.levelKey===l.label){acur.levelKey='';acur.level=null;}
      else{acur.levelKey=l.label;acur.level=i;}
      drawAnger();});
    lv.appendChild(b);
  });
  const w=$('aWho');w.innerHTML='';
  const whos=C().who.filter(x=>!isOffStr(x));
  if(acur.who&&!whos.includes(acur.who)) whos.push(acur.who);
  whos.forEach(x=>{const b=document.createElement('button');
    b.className='chip'+(acur.who===x?' on a':'');b.textContent=x;
    b.addEventListener('click',()=>{acur.who=(acur.who===x?'':x);drawAnger();});
    w.appendChild(b);});
  const g=$('aTrig');g.innerHTML='';
  const trigs=[...new Set(C().trig.filter(x=>!isOffStr(x)))];
  (acur.trig||[]).forEach(x=>{if(!trigs.includes(x))trigs.push(x);});
  trigs.forEach(x=>{const b=document.createElement('button');
    b.className='chip'+((acur.trig||[]).includes(x)?' on a':'');b.textContent=x;
    b.addEventListener('click',()=>{acur.trig=acur.trig||[];
      acur.trig=acur.trig.includes(x)?acur.trig.filter(y=>y!==x):acur.trig.concat(x);
      drawAnger();});
    g.appendChild(b);});
}
function closeAnger(){acur=null;$('adlg').close();render();sync(true);}
on('btnAng','click',()=>openAnger(null));
on('aCancel','click',closeAnger);
on('adlg','cancel',e=>{e.preventDefault();closeAnger();});
on('aSame','click',()=>{
  const prev=live().filter(i=>i.kind==='anger')
    .sort((a,b)=>new Date(a.start)-new Date(b.start)).pop();
  if(!prev){$('aMsg').textContent='前回の記録がありません';return;}
  acur.who=prev.who||'';acur.trig=(prev.trig||[]).slice();drawAnger();
});
on('aSave','click',()=>{
  if(!acur)return;
  if(!acur.levelKey){$('aMsg').textContent='「自分の反応」を選んでください';return;}
  acur.note=$('aNote').value;
  if(aNew){acur.updatedAt=now();acur.synced=false;db.items.push(acur);}
  else{const t=db.items.find(i=>i.id===acur.id);
    if(t){Object.assign(t,acur);touch(t);}}
  save();closeAnger();
});
on('aDel','click',()=>{
  if(!acur||aNew){closeAnger();return;}
  if(!confirm('この記録を削除しますか？'))return;
  const t=db.items.find(i=>i.id===acur.id); if(t)drop(t);
  closeAnger();
});

/* ±ボタン（睡眠: data-f=s/e、場面: data-f=a）長押しで連続 */
document.querySelectorAll('.adj').forEach(b=>{
  const f=b.dataset.f,n=+b.dataset.n; let t1,t2;
  const go=()=>{
    if(f==='a'){if(acur)shiftA(n);}
    else if(cur)shift(f,n);
  };
  b.addEventListener('pointerdown',e=>{e.preventDefault();go();
    t1=setTimeout(()=>{t2=setInterval(go,80)},400);});
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>
    b.addEventListener(ev,()=>{clearTimeout(t1);clearInterval(t2);
      if(f!=='a'&&cur){save();renderHist();}}));
});

/* ---------- 鍛錬・作業の記録（タップで即時反映） ---------- */
let ak=null;
function openActDlg(off){
  const T=dayKeyOf(new Date());
  ak=off?shiftKey(T,-1):T;
  drawActDlg();
  if(!$('acdlg').open) $('acdlg').showModal();
}
function acIso(v){                     // 表示中の日（3:00区切り）の時刻 → ISO。0:00〜2:59 は翌日の暦日
  const [H,M]=v.split(':').map(Number);
  const d=new Date(ak+'T00:00:00');d.setHours(H,M,0,0);
  if(H<DAY_CUT) d.setDate(d.getDate()+1);
  return d.toISOString();
}
function drawActDlg(){
  if(!ak)return;
  const T=dayKeyOf(new Date());
  $('acDate').textContent=ak;
  $('acToday').className='small seg'+(ak===T?' on':'');
  $('acYest').className='small seg'+(ak===shiftKey(T,-1)?' on':'');
  const L=$('acList');L.innerHTML='';
  const labels=actDefs().map(m=>m.label);
  live().filter(i=>i.kind==='act'&&i.dateKey===ak&&liveTaps(i).length)
    .forEach(r=>{if(!labels.includes(r.label))labels.push(r.label);});   // 外したメニューの記録も出す
  if(!labels.length){L.innerHTML='<div class="sub center mt">メニューがありません（「項目をカスタマイズ」で追加）</div>';return;}
  labels.forEach(lb=>{
    const p=actProg(lb,ak),ty=p.ty.t;
    const el=document.createElement('div');el.className='drow';
    el.innerHTML=`<div class="dlab">${esc(p.m.icon||'')} ${esc(lb)} <span class="mini">${esc(progText(p))}${p.done?' ✓':''}</span></div>`;
    const cs=document.createElement('div');cs.className='chips';
    if(!p.ts.length) cs.innerHTML='<span class="mini">記録なし</span>';
    p.ts.forEach(t=>{
      const c=document.createElement('button');c.className='chip';
      c.textContent=tapLabel(t,ty)+'  ×';
      c.addEventListener('click',()=>{
        if(!confirm(`${lb}　${tapLabel(t,ty)} を取り消しますか？`))return;
        delTap(p.r,t.id);drawActDlg();render();
      });
      cs.appendChild(c);
    });
    el.appendChild(cs);
    const row=document.createElement('div');row.className='row mt';row.style.alignItems='center';
    const tm=document.createElement('input');tm.type='time';
    tm.value=ak===T?hhmm(new Date()):'12:00';
    row.appendChild(tm);
    let num=null;
    if(ty==='rep'||ty==='time'){
      num=document.createElement('input');num.type='number';num.className='num';num.inputMode='numeric';
      num.value=ty==='rep'?repN(lb):(p.ty.goal||15);
      row.appendChild(num);
      const u=document.createElement('span');u.className='mini';u.style.flex='0 0 auto';
      u.textContent=ty==='rep'?'回':'分';row.appendChild(u);
    }
    const add=document.createElement('button');add.className='small okb';add.textContent='＋追加';
    add.style.flex='0 0 auto';
    add.addEventListener('click',()=>{
      if(!tm.value){toast('時刻を入れてください');return;}
      const iso=acIso(tm.value);
      if(ty==='time'){
        const mn=Math.round(+num.value||0);
        if(mn<=0){toast('分を入れてください');return;}
        addTap(lb,0,iso,ak,new Date(new Date(iso).getTime()+mn*60000).toISOString());
      }else if(ty==='rep'){
        const n=Math.round(+num.value||0);
        if(n<=0){toast('回数を入れてください');return;}
        addTap(lb,n,iso,ak);
      }else addTap(lb,1,iso,ak);
      drawActDlg();render();
    });
    row.appendChild(add);
    el.appendChild(row);
    L.appendChild(el);
  });
}
on('acToday','click',()=>{ak=dayKeyOf(new Date());drawActDlg();});
on('acYest','click',()=>{ak=shiftKey(dayKeyOf(new Date()),-1);drawActDlg();});
on('acClose','click',()=>$('acdlg').close());
on('acdlg','close',()=>{
  if($('ddlg').open) drawDaily();
  render();sync(true);
});

/* ---------- 日次チェック（タップで即時反映） ---------- */
let dk=null;
function openDaily(off){
  const T=dayKeyOf(new Date());
  dk=off?shiftKey(T,-1):T;
  drawDaily();drawBrave();
  if(!$('ddlg').open) $('ddlg').showModal();
}
function drawDaily(){
  if(!dk)return;
  const T=dayKeyOf(new Date());
  $('dDate').textContent=dk;
  $('dToday').className='small seg'+(dk===T?' on':'');
  $('dYest').className='small seg'+(dk===shiftKey(T,-1)?' on':'');
  const e=dailyEval(dk),list=$('dList');list.innerHTML='';
  e.rows.forEach(r=>{
    const el=document.createElement('div');el.className='drow';
    let sub='';
    if(r.ty.t==='auto') sub=(r.auto?`自動: ${r.auto.text}`:'自動: データなし')+(r.manual?' ／ ✎手動':'');
    if(r.ty.t==='count') sub=`${r.ty.n}回で達成`;
    el.innerHTML=`<div class="dlab">${esc(r.it.icon||'')} ${esc(r.it.label)} <span class="mini">${esc(sub)}</span></div>`;
    const cs=document.createElement('div');cs.className='chips';
    const opts=r.ty.t==='count'
      ? [[0,'✗ 0回']].concat(Array.from({length:r.ty.n},(_,i)=>[i+1,`${i+1}回`])).concat([['na','− 対象外']])
      : [['ok','✓ できた'],['ng','✗ できなかった'],['na','− 対象外']];
    opts.forEach(([val,txt])=>{
      const b=document.createElement('button'),isOn=r.v===val;
      b.className='chip'+(isOn?' on':'')+(isOn&&r.ty.t==='auto'&&!r.manual?' auto':'');
      b.textContent=txt;
      b.addEventListener('click',()=>setDaily(r,val));
      cs.appendChild(b);
    });
    el.appendChild(cs);list.appendChild(el);
  });
  $('dSum').textContent=`達成 ${e.done}/${e.total}　未記入 ${e.rows.length-e.filled}`;
  $('dInbox').textContent=`📥 インボックス ${inboxPending().length}件を処理`;
}
function setDaily(r,val){
  const rec=dailyRec(dk,true),L=r.it.label;
  rec.checks=rec.checks||{};rec.ovr=rec.ovr||{};
  if(r.ty.t==='auto'){
    if(r.manual&&rec.ovr[L]===val) delete rec.ovr[L];   // もう一度で自動に戻す
    else rec.ovr[L]=val;
  }else{
    if(rec.checks[L]===val) delete rec.checks[L];        // もう一度で解除
    else rec.checks[L]=val;
  }
  snapAuto(rec);touch(rec);save();drawDaily();
}
/* Brave は表示中の日（dk）の記録に保存。夜のチェックでその日の値を入れる */
function drawBrave(){
  const rec=dailyRec(dk,false),b=(rec&&!rec.deleted&&rec.brave)||{};
  $('dBn').value=b.n==null?'':b.n;
  $('dBh').value=b.min==null?'':Math.floor(b.min/60);
  $('dBm').value=b.min==null?'':b.min%60;
}
function setBrave(){
  const n=$('dBn').value,h=$('dBh').value,m=$('dBm').value;
  const empty=n===''&&h===''&&m==='';
  const rec=dailyRec(dk,!empty); if(!rec)return;
  rec.brave=empty?null:{n:n===''?null:+n,
    min:(h===''&&m==='')?null:(+h||0)*60+(+m||0)};
  touch(rec);save();
}
['dBn','dBh','dBm'].forEach(id=>on(id,'input',setBrave));
on('btnDay','click',()=>openDaily(0));
on('dToday','click',()=>{dk=dayKeyOf(new Date());drawDaily();drawBrave();});
on('dYest','click',()=>{dk=shiftKey(dayKeyOf(new Date()),-1);drawDaily();drawBrave();});
on('dInbox','click',()=>openInbox());
on('dClose','click',()=>$('ddlg').close());
on('ddlg','close',()=>{
  const rec=dk&&dailyRec(dk,false);
  if(rec&&!rec.deleted&&snapAuto(rec)){touch(rec);save();}
  render();sync(true);
});

/* ---------- インボックス画面（タップで即時反映） ---------- */
let iSeen=new Set();                 // この画面で評価した項目は閉じるまで一覧に残す（解除できるように）
function openInbox(){iSeen=new Set();$('iAdd').value='';drawInbox();
  if(!$('idlg').open) $('idlg').showModal();}
function inboxRow(r){
  const el=document.createElement('div');el.className='ibox';
  const head=document.createElement('div');head.className='dlab';
  if(r.url){const a=document.createElement('a');a.href=r.url;a.target='_blank';a.rel='noopener';
    a.className='ilink';a.textContent=r.title||r.url;head.appendChild(a);}
  else head.textContent=r.title;
  el.appendChild(head);
  const meta=document.createElement('div');meta.className='mini';meta.style.marginBottom='6px';
  meta.textContent=`追加 ${fmt(r.start)}${r.doneAt?' ／ 処理 '+fmt(r.doneAt):''}`;
  el.appendChild(meta);
  const cs=document.createElement('div');cs.className='chips';
  C().ievals.filter(x=>!x.off||x.label===r.eval).forEach(x=>{
    const b=document.createElement('button');
    b.className='chip'+(r.eval===x.label?' on':'');
    b.textContent=`${x.icon||''} ${x.label}`;
    b.addEventListener('click',()=>{
      if(r.eval===x.label){r.eval='';r.doneAt=null;}
      else{r.eval=x.label;r.doneAt=now();}
      iSeen.add(r.id);touch(r);save();drawInbox();
    });
    cs.appendChild(b);
  });
  const del=document.createElement('button');del.className='chip';del.textContent='× 誤登録';
  del.addEventListener('click',()=>{if(!confirm('この項目を削除しますか？（評価の記録も残りません）'))return;
    drop(r);drawInbox();});
  cs.appendChild(del);
  el.appendChild(cs);
  const nt=document.createElement('input');nt.className='mt';nt.placeholder='ひとことメモ（Obsidian のノート名など・任意）';
  nt.value=r.note||'';
  nt.addEventListener('change',()=>{r.note=nt.value;touch(r);save();});
  el.appendChild(nt);
  return el;
}
function drawInbox(){
  const all=inboxAll().sort((a,b)=>new Date(b.start)-new Date(a.start));
  const pend=all.filter(i=>!i.eval||iSeen.has(i.id));
  const lim=Date.now()-14*86400000;
  const done=all.filter(i=>i.eval&&!iSeen.has(i.id)&&i.doneAt&&new Date(i.doneAt)>lim)
    .sort((a,b)=>new Date(b.doneAt)-new Date(a.doneAt));
  $('iCount').textContent=`未処理 ${inboxPending().length}件`;
  const L=$('iList');L.innerHTML='';
  if(!pend.length) L.innerHTML='<div class="sub center">未処理はありません</div>';
  pend.forEach(r=>L.appendChild(inboxRow(r)));
  const D=$('iDone');D.innerHTML='';
  if(!done.length) D.innerHTML='<div class="sub">ありません</div>';
  done.forEach(r=>D.appendChild(inboxRow(r)));
}
function addManual(){
  const v=$('iAdd').value.trim(); if(!v)return;
  const u=extractUrl(v),t=v.replace(u,'').trim()||u;
  addInbox(t,u,'manual');$('iAdd').value='';drawInbox();
}
on('btnInbox','click',openInbox);
on('iAddBtn','click',addManual);
on('iAdd','keydown',e=>{if(e.key==='Enter'){e.preventDefault();addManual();}});
on('iClose','click',()=>$('idlg').close());
on('idlg','close',()=>{
  const v=$('iAdd').value.trim(); if(v) addManual();
  if($('ddlg').open) drawDaily();
  render();sync(true);
});