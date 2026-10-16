/* LIFE LOG — report.js（エクスポート＝Obsidian 用 Markdown ／ レポート）
   読み込み順: core → ui → en → report → main。
   このファイルで作る名前（他のファイルで同じ名前を作らないこと）:
     WD wdOf sgn avg mdTxt ilink markSym angBrk actLabelsIn actRows actBrief
     dayData mdDay mdWeek
     ep eCapped rangeDef rangeKeys periodKeys EXP_TITLE drawExport openExport
     MARK keysBetween repId repAll repRec prevRep activeExp hm dm pct
     repStats dayRate insights reviewHints numRows diffTxt
     rp rpKs rpS rpP rpKeys rpA rpB drawReport repSave repMd openReport
   core.js の forPush（同期）が keysBetween repStats hm dm insights reviewHints MARK を使うので、名前を変えないこと。
   週の区切り: 日曜始まり・土曜終わり。「期間」は開くたびに直近 RANGE_DEF 日（core.js）から始まる。 */

/* ---------- 共通 ---------- */
const WD=['日','月','火','水','木','金','土'];
const wdOf=k=>WD[new Date(k+'T12:00:00').getDay()];
const sgn=n=>(n>=0?'+':'')+n;
const avg=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):null;
const mdTxt=s=>String(s||'').replace(/[\[\]|]/g,' ').replace(/\s+/g,' ').trim();
const ilink=i=>i.url?`[${mdTxt(i.title)||'link'}](${i.url})`:mdTxt(i.title);
function markSym(r){
  if(r.v===undefined) return '未';
  if(r.v==='na') return '−';
  if(r.v==='ok') return '✓';
  if(r.v==='ng') return '✗';
  return `${r.v}/${r.ty.n}`;
}
function angBrk(A){const c={};
  A.forEach(a=>{const l=lvDef(a),k=l.icon||l.label;c[k]=(c[k]||0)+1;});
  return Object.keys(c).map(k=>k+c[k]).join(' ');}

/* 鍛錬・作業: 対象の日に出すメニュー（今のメニュー＋外したメニューでも記録がある日はそれも） */
function actLabelsIn(ks){
  const L=actDefs().map(m=>m.label);
  live().filter(i=>i.kind==='act'&&ks.includes(i.dateKey)&&liveTaps(i).length)
    .forEach(r=>{if(r.label&&!L.includes(r.label))L.push(r.label);});
  return L;
}
const actRows=k=>actLabelsIn([k]).map(lb=>actProg(lb,k));
const actBrief=A=>{                         // 表用: 目標のあるメニューのうち達成した数
  const g=A.filter(p=>p.ty.goal>0);
  return g.length?`${g.filter(p=>p.done).length}/${g.length}`:'—';
};

/* ---------- 1日分のデータ ---------- */
function dayData(k){
  const s=live().filter(i=>i.kind==='sleep'&&i.type==='sleep'&&i.end&&sleepKey(i)===k)
    .sort((a,b)=>mins(b)-mins(a))[0]||null;           // 分割睡眠は長い方をその朝のメイン睡眠に
  const pn=live().filter(i=>i.kind==='sleep'&&i.type==='pn'&&i.end&&sleepKey(i)===k)
    .sort((a,b)=>new Date(a.start)-new Date(b.start));
  const r=rtRec(k)||null,mt=r?rtMetrics(r):null,e=dailyEval(k);
  const dr=dailyRec(k,false),br=(dr&&!dr.deleted&&dr.brave)||null;
  const ang=live().filter(i=>i.kind==='anger'&&i.dateKey===k)
    .sort((a,b)=>new Date(a.start)-new Date(b.start));
  const inA=inboxAll().filter(i=>dayKeyOf(new Date(i.start))===k);
  const inD=inboxAll().filter(i=>i.eval&&i.doneAt&&dayKeyOf(new Date(i.doneAt))===k);
  const ph=phAll().filter(p=>p.dateKey===k).sort((a,b)=>new Date(a.start)-new Date(b.start));
  const pc=pcAll().filter(x=>x.dateKey===k);
  const act=actRows(k);
  const wakeDiff=s?Math.round((new Date(s.end)-rtTarget(k))/60000):null;
  return {k,s,pn,r,mt,e,br,ang,inA,inD,ph,pc,act,wakeDiff};
}

/* ---------- 1日分の Markdown（デイリーノートに貼る） ---------- */
function mdDay(d,inc,h,withInbox){
  const L=[`${h} LIFE LOG ${d.k}（${wdOf(d.k)}）`];
  const s=d.s;
  if(s){
    const tg=(s.tags||[]).join(' ');
    const sd=new Date(s.start),pre=dkey(sd)!==d.k?md(sd)+' ':'';
    L.push(`- 睡眠（今朝まで）: ${pre}${hhmm(sd)}→${hhmm(new Date(s.end))} ${durText(mins(s))}${tg?' ／ '+tg:''}${s.note?' ／ '+mdTxt(s.note):''}`);
    L.push(`- 起床: ${hhmm(new Date(s.end))}（目標${sgn(d.wakeDiff)}分）`);
  }else L.push('- 睡眠: 記録なし');
  if(d.r){
    const r=d.r,mt=d.mt;
    L.push(`- 朝ルーティン: ${hhmm(new Date(r.start))}→${r.end?hhmm(new Date(r.end)):mt.status}`+
      `${mt.totalMin!==''?' '+durText(mt.totalMin):''}`+
      `${mt.toiletMin!==''?' ／ トイレ滞在 '+mt.toiletMin+'分':''}`+
      `${r.yt?' ／ YouTube '+mt.ytText:''}`);
    const st=r.steps||{};
    const steps=stepDefs().filter(x=>x.opt!=='wake'&&x.opt!=='end'&&st[x.label])
      .map(x=>`${x.label} ${hhmm(new Date(st[x.label]))}`);
    if(steps.length) L.push('  - '+steps.join(' / '));
    if(r.note) L.push('  - メモ: '+mdTxt(r.note));
  }else L.push('- 朝ルーティン: 記録なし');
  if(d.pn.length){
    const sum=d.pn.reduce((a,p)=>a+mins(p),0);
    L.push(`- PN: ${d.pn.length}回 計${durText(sum)}（${d.pn.map(p=>hhmm(new Date(p.start))+' '+mins(p)+'分').join(', ')}）`);
  }
  L.push(`- 日次 ${d.e.done}/${d.e.total}: `+d.e.rows.map(x=>markSym(x)+' '+x.it.label).join(' ／ '));
  const A=d.act.filter(p=>p.sets||p.ty.goal>0);
  if(A.length){
    if(A.some(p=>p.sets))
      L.push('- 鍛錬・作業: '+A.map(p=>`${p.m.icon||''}${p.m.label} ${progText(p)}${p.done?' ✓':''}${p.run?' 計測中':''}`).join(' ／ '));
    else L.push('- 鍛錬・作業: 記録なし');
  }
  if(d.br) L.push(`- Brave: ${d.br.n??'-'}回 ・ ${d.br.min==null?'-':durText(d.br.min)}`);
  if(d.ph.length||d.pc.length){
    L.push(`- EN: 拾った ${d.ph.length}`+(d.pc.length?' ／ '+d.pc.map(pieceText).join(' ／ '):''));
    d.ph.forEach(p=>L.push(`  - ${p.en?mdTxt(p.en):'（未添削）'+mdTxt(p.raw)}`));
  }
  if(inc&&d.ang.length){
    L.push(`- ${C().title}: ${d.ang.length}件`);
    d.ang.forEach(a=>{const l=lvDef(a);
      L.push(`  - ${hhmm(new Date(a.start))} ${l.icon||''} ${l.label}${a.who?' ／ '+a.who:''}`+
        `${(a.trig||[]).length?' ／ '+a.trig.join('/'):''}${a.note?' ／ '+mdTxt(a.note):''}`);});
  }
  if(withInbox&&(d.inA.length||d.inD.length)){
    L.push(`- インボックス: 追加${d.inA.length} ／ 処理${d.inD.length}`);
    d.inD.forEach(i=>L.push(`  - ${evDef(i.eval).icon||''}${i.eval} ${ilink(i)}${i.note?' — '+mdTxt(i.note):''}`));
  }
  return L.join('\n');
}

/* ---------- 複数日の Markdown（週次・期間） ---------- */
function mdWeek(ks,inc,title){
  const D=ks.map(dayData),rt=C().rt;
  const L=[`## ${title} ${ks[0]}〜${ks[ks.length-1]}（${ks.length}日）`,'',
    '> LIFE LOG アプリの自動出力。睡眠・PNは「起きた日」に計上（前夜に寝た分はその朝の日付）。日次チェック・朝ルーティン・鍛錬・ENの1日の区切りは 3:00。週は日曜始まり・土曜終わり。'+
    '日次チェックの記号: ✓＝できた、✗＝やるつもりだったができなかった、n/3＝回数、−＝対象外（その日は予定なし・達成率の分母から除外）、未＝未記入（できなかった、ではない）。'+
    '鍛錬は「目標に届いたメニュー数/目標のあるメニュー数」。Brave はその日のデジタルウェルビーイングの値。',''];
  const hd=['日付','起床','睡眠','PN','朝RT','トイレ','YT','日次','鍛錬','Brave'].concat(inc?[C().title]:[]);
  L.push('| '+hd.join(' | ')+' |');
  L.push('|'+hd.map(()=>'---').join('|')+'|');
  D.forEach(d=>{
    const pm=d.pn.reduce((a,p)=>a+mins(p),0);
    const c=[`${d.k.slice(5)}(${wdOf(d.k)})`,
      d.s?`${hhmm(new Date(d.s.end))}(${sgn(d.wakeDiff)})`:'—',
      d.s?durText(mins(d.s)):'—',
      d.pn.length?`${d.pn.length}回${pm}分`:'—',
      d.r?(d.mt.totalMin!==''?d.mt.totalMin+'分':d.mt.status):'—',
      d.mt&&d.mt.toiletMin!==''?d.mt.toiletMin+'分':'—',
      d.r&&d.r.yt?ytIcon(d.r.yt):'—',
      `${d.e.done}/${d.e.total}`,
      actBrief(d.act),
      d.br?`${d.br.n??'-'}回/${d.br.min??'-'}分`:'—'];
    if(inc) c.push(d.ang.length?angBrk(d.ang):'—');
    L.push('| '+c.map(mdTxt).join(' | ')+' |');
  });

  L.push('','### 集計');
  const W=D.filter(d=>d.s);
  const aw=avg(W.map(d=>{const e=new Date(d.s.end);return e.getHours()*60+e.getMinutes();}));
  L.push(`- 起床: 記録 ${W.length}/${D.length}日 ／ 平均 ${aw==null?'—':pad(Math.floor(aw/60))+':'+pad(aw%60)}`+
    ` ／ 目標±${rt.tol}分以内 ${W.filter(d=>Math.abs(d.wakeDiff)<=(+rt.tol||0)).length}日`);
  const sl=avg(W.map(d=>mins(d.s)));
  L.push(`- 睡眠: 平均 ${sl==null?'—':durText(sl)} ／ PN 計 ${D.reduce((a,d)=>a+d.pn.length,0)}回`);
  const R=D.filter(d=>d.r);
  const tt=avg(R.filter(d=>d.mt.totalMin!=='').map(d=>d.mt.totalMin));
  const tm=R.filter(d=>d.mt.toiletMin!=='').map(d=>d.mt.toiletMin),ta=avg(tm);
  L.push(`- 朝ルーティン: 記録 ${R.length}日（完了 ${R.filter(d=>d.r.closed==='done').length}） ／ 平均所要 ${tt==null?'—':durText(tt)}`+
    ` ／ トイレ滞在 平均 ${ta==null?'—':ta+'分'}（${rt.toilet}分以内 ${tm.filter(x=>x<=(+rt.toilet||0)).length}/${tm.length}日）`);
  const yc={};R.forEach(d=>{if(d.r.yt)yc[d.r.yt]=(yc[d.r.yt]||0)+1;});
  const yn=R.filter(d=>!d.r.yt).length;
  L.push(`- YouTube 申告: ${Object.keys(yc).length?Object.keys(yc).map(k=>ytIcon(k)+k+' '+yc[k]).join(' ／ '):'—'}（未申告 ${yn}）`);
  L.push('- 日次チェック（達成 / 記録した日（対象外を除く） / 対象外 / 未記入）:');
  dItems().forEach(it=>{
    let ok=0,rec=0,na=0,no=0;const cnt=[];
    D.forEach(d=>{const r=d.e.rows.find(x=>x.it.label===it.label); if(!r)return;
      if(r.v===undefined) no++;
      else if(r.v==='na') na++;
      else{rec++; if(r.ok) ok++; if(r.ty.t==='count') cnt.push(+r.v||0);}});
    L.push(`  - ${it.icon||''} ${it.label}: ${ok} / ${rec} / ${na} / ${no}`+
      (cnt.length?`（平均 ${(cnt.reduce((a,b)=>a+b,0)/cnt.length).toFixed(1)}回）`:''));
  });
  const AL=actLabelsIn(ks);
  if(AL.length){
    L.push('- 鍛錬・作業（合計 / 目標達成した日 / 記録した日）:');
    AL.forEach(lb=>{
      let val=0,done=0,days=0,m=null,ty=null;
      ks.forEach(k=>{const p=actProg(lb,k);m=p.m;ty=p.ty;val+=p.val;if(p.sets)days++;if(p.done)done++;});
      const v=ty.t==='time'?durText(val):val+'回';
      L.push(`  - ${m.icon||''} ${lb}: ${v} / ${ty.goal>0?done+'日':'目標なし'} / ${days}日`);
    });
  }
  const B=D.filter(d=>d.br);
  const bn=avg(B.filter(d=>d.br.n!=null).map(d=>d.br.n)),bm=avg(B.filter(d=>d.br.min!=null).map(d=>d.br.min));
  L.push(`- Brave: 記録 ${B.length}日 ／ 平均 ${bn??'—'}回・${bm==null?'—':durText(bm)}`);
  const PH=D.flatMap(d=>d.ph),PC=D.flatMap(d=>d.pc);
  const pw=PC.filter(x=>x.type!=='speak'),psp=PC.filter(x=>x.type==='speak');
  L.push(`- EN: 拾った ${PH.length}（整えた ${PH.filter(p=>p.en).length}） ／ 書いた ${pw.length}本・${pw.reduce((a,x)=>a+(+x.words||0),0)}語`+
    ` ／ 話した ${psp.length}回・${psp.reduce((a,x)=>a+(+x.mins||0),0)}分 ／ 使ったフレーズ ${new Set(PC.flatMap(x=>x.phrases||[])).size}`);
  if(inc){const A=D.flatMap(d=>d.ang);L.push(`- ${C().title}: 計 ${A.length}件 ${A.length?angBrk(A):''}`);}
  const IA=D.flatMap(d=>d.inA),ID=D.flatMap(d=>d.inD),ec={};
  ID.forEach(i=>{ec[i.eval]=(ec[i.eval]||0)+1;});
  L.push(`- インボックス: 追加 ${IA.length} ／ 処理 ${ID.length}`+
    (ID.length?'（'+Object.keys(ec).map(k=>(evDef(k).icon||'')+k+' '+ec[k]).join(' ／ ')+'）':'')+
    ` ／ 現在の未処理 ${inboxPending().length}`);
  if(ID.length){
    L.push('','### インボックスの処理');
    ID.forEach(i=>L.push(`- ${evDef(i.eval).icon||''}${i.eval} ${ilink(i)}${i.note?' — '+mdTxt(i.note):''}`));
  }
  L.push('','### 日別');
  D.forEach(d=>{L.push('');L.push(mdDay(d,inc,'####',false));});
  return L.join('\n');
}

/* ---------- 期間 ---------- */
let ep='today',eCapped=false;
function rangeDef(){                    // 「期間」の既定: 直近 RANGE_DEF 日（今日を含む）
  const T=dayKeyOf(new Date());
  return {a:shiftKey(T,-(RANGE_DEF-1)),b:T};
}
function rangeKeys(){
  const df=rangeDef();
  let a=$('eFrom').value||df.a,b=$('eTo').value||df.b;
  if(a>b){const x=a;a=b;b=x;}
  const out=[];eCapped=false;
  for(let k=a;k<=b;k=shiftKey(k,1)){
    if(out.length>=EXP_MAX){eCapped=true;break;}
    out.push(k);
  }
  return out;
}
function periodKeys(p){
  const T=dayKeyOf(new Date());
  if(p==='today') return [T];
  if(p==='yest') return [shiftKey(T,-1)];
  if(p==='d7') return Array.from({length:7},(_,i)=>shiftKey(T,i-6));
  if(p==='range') return rangeKeys();
  /* 先週 = 日曜始まり・土曜終わり。今週の日曜から7日戻った日曜〜その土曜 */
  const sun=shiftKey(T,-new Date(T+'T12:00:00').getDay()-7);
  return Array.from({length:7},(_,i)=>shiftKey(sun,i));
}

/* ---------- エクスポート ---------- */
const EXP_TITLE={d7:'直近7日のログ',lastw:'週次ログ（日〜土）',range:'期間ログ'};
function drawExport(){
  ['today','yest','d7','lastw','range'].forEach(p=>{const b=$('e_'+p);
    if(b) b.className='small seg'+(ep===p?' on':'');});
  $('eRange').style.display=ep==='range'?'':'none';
  const inc=$('eAng').checked,ks=periodKeys(ep);
  $('eOut').value=ks.length===1?mdDay(dayData(ks[0]),inc,'##',true):mdWeek(ks,inc,EXP_TITLE[ep]||'ログ');
  $('eMsg').textContent=ep==='range'&&eCapped?`長すぎるため先頭から${EXP_MAX}日分だけ出力しています`:'';
}
function openExport(){
  const df=rangeDef();
  ep=new Date().getHours()>=12?'today':'yest';
  $('eAng').checked=db.settings.expAng!==false;
  $('eFrom').value=df.a;$('eTo').value=df.b;       // 開くたびに直近10日から
  drawExport();
  if(!$('edlg').open) $('edlg').showModal();
}
on('btnExp','click',openExport);
['today','yest','d7','lastw','range'].forEach(p=>on('e_'+p,'click',()=>{ep=p;drawExport();}));
['eFrom','eTo'].forEach(id=>on(id,'change',()=>{if(ep==='range')drawExport();}));
on('eAng','change',()=>{db.settings.expAng=$('eAng').checked;save();drawExport();});
on('eClose','click',()=>$('edlg').close());
on('eCopy','click',async()=>{
  const t=$('eOut').value;
  try{await navigator.clipboard.writeText(t);$('eMsg').textContent='コピーしました。Obsidian に貼り付けてください';}
  catch(e){$('eOut').select();$('eMsg').textContent='選択しました。長押しでコピーしてください';}
});

/* ---------- レポート（kind='report'・期間ごとに1件） ---------- */
const MARK={ok:'✓ できた',part:'△ 一部',ng:'✗ できなかった'};
const keysBetween=(a,b)=>{const o=[];for(let k=a;k<=b&&o.length<EXP_MAX;k=shiftKey(k,1))o.push(k);return o;};
const repId=(a,b)=>'RP-'+a.replace(/-/g,'')+'-'+b.replace(/-/g,'');
const repAll=()=>live().filter(i=>i.kind==='report');
function repRec(a,b,create){
  let r=db.items.find(i=>i.id===repId(a,b));
  if(!r&&create){
    r={id:repId(a,b),kind:'report',from:a,to:b,dateKey:b,
      start:new Date(b+'T12:00:00').toISOString(),end:null,
      exp:'',mark:'',result:'',memo:'',memoAt:null,updatedAt:now(),synced:false};
    db.items.push(r);
  }
  if(r&&r.deleted){if(create)r.deleted=false;else return null;}
  return r||null;
}
const prevRep=a=>repAll().filter(r=>r.to<a&&r.exp)
  .sort((x,y)=>x.to.localeCompare(y.to)||(x.updatedAt||'').localeCompare(y.updatedAt||'')).pop()||null;
function activeExp(){
  const T=dayKeyOf(new Date());
  return repAll().filter(r=>r.exp&&T<=shiftKey(r.to,EXP_SHOW))
    .sort((x,y)=>x.to.localeCompare(y.to)||(x.updatedAt||'').localeCompare(y.updatedAt||'')).pop()||null;
}
const hm=v=>v==null?'—':pad(Math.floor(v/60))+':'+pad(v%60);
const dm=v=>v==null?'—':durText(v);
const pct=x=>Math.round(x*100)+'%';
function repStats(ks){
  const D=ks.map(dayData),tol=+C().rt.tol||0,yt0=(C().rt.yt[0]||{}).label;
  const W=D.filter(d=>d.s),wd=W.map(d=>d.wakeDiff);
  let sdv=null;
  if(wd.length>=2){const m=wd.reduce((x,y)=>x+y,0)/wd.length;
    sdv=Math.round(Math.sqrt(wd.reduce((x,y)=>x+(y-m)**2,0)/wd.length));}
  const R=D.filter(d=>d.r&&d.mt.totalMin!==''),Y=D.filter(d=>d.r&&d.r.yt);
  let ok=0,tot=0;const items={};
  dItems().forEach(it=>{items[it.label]={ok:0,n:0,no:0,auto:dType(it).t==='auto'};});
  D.forEach(d=>d.e.rows.forEach(r=>{const x=items[r.it.label]; if(!x)return;
    if(r.v===undefined){x.no++;return;}
    if(r.v==='na')return;
    x.n++;tot++; if(r.ok){x.ok++;ok++;}}));
  const B=D.filter(d=>d.br&&d.br.min!=null);
  const A=D.flatMap(d=>d.ang),wc={};
  A.forEach(a=>{if(a.who)wc[a.who]=(wc[a.who]||0)+1;});
  const topWho=Object.keys(wc).sort((a,b)=>wc[b]-wc[a])[0]||'';
  const acts={};                                  // 鍛錬・作業: メニューごとの合計
  actLabelsIn(ks).forEach(lb=>{
    let val=0,done=0,days=0,m=null,ty=null;
    ks.forEach(k=>{const p=actProg(lb,k);m=p.m;ty=p.ty;val+=p.val;if(p.sets)days++;if(p.done)done++;});
    acts[lb]={m,ty,val,done,days};
  });
  return {D,days:ks.length,
    wake:avg(W.map(d=>{const e=new Date(d.s.end);return e.getHours()*60+e.getMinutes();})),
    wakeSd:sdv,wakeOk:W.length?W.filter(d=>Math.abs(d.wakeDiff)<=tol).length:null,wakeN:W.length,
    sleep:avg(W.map(d=>mins(d.s))),
    pn:D.reduce((a,d)=>a+d.pn.length,0),
    rt:avg(R.map(d=>d.mt.totalMin)),
    detour:Y.length?Math.round(Y.filter(d=>d.r.yt!==yt0).length/Y.length*100):null,
    rate:tot?Math.round(ok/tot*100):null,items,acts,
    brave:avg(B.map(d=>d.br.min)),
    ang:A.length,topWho,topWhoN:wc[topWho]||0,
    ph:D.reduce((a,d)=>a+d.ph.length,0)};
}
function dayRate(d,skipWake){
  const rs=d.e.rows.filter(r=>r.v!==undefined&&r.v!=='na'&&!(skipWake&&r.ty.t==='auto'&&r.ty.key==='wake'));
  return rs.length?rs.filter(r=>r.ok).length/rs.length:null;
}
function insights(S,P){
  const out=[],tol=+C().rt.tol||0,D=S.D,mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
  const grp=f=>{const a=[],b=[];D.forEach(d=>{const g=f(d),r=dayRate(d,true);
    if(g===null||r===null)return;(g?a:b).push(r);});return [a,b];};
  let [a,b]=grp(d=>d.s?Math.abs(d.wakeDiff)<=tol:null);
  if(a.length>=2&&b.length>=2) out.push(`起床が目標どおりだった日は日次チェックの達成率 ${pct(mean(a))}、外れた日は ${pct(mean(b))}（${a.length}日 / ${b.length}日）`);
  [a,b]=grp(d=>d.s?mins(d.s)<SHORT_SLEEP:null);
  if(a.length>=2&&b.length>=2) out.push(`睡眠${SHORT_SLEEP/60}時間未満の日の達成率 ${pct(mean(a))}、それ以上の日は ${pct(mean(b))}`);
  const sa=D.filter(d=>d.s),s1=sa.filter(d=>mins(d.s)<SHORT_SLEEP),s2=sa.filter(d=>mins(d.s)>=SHORT_SLEEP);
  if(S.ang&&s1.length>=2&&s2.length>=2){
    const f=x=>(x.reduce((p,d)=>p+d.ang.length,0)/x.length).toFixed(1);
    out.push(`${C().title}は、睡眠が短い日 平均${f(s1)}件、それ以外の日 ${f(s2)}件`);
  }
  const yt0=(C().rt.yt[0]||{}).label,R=D.filter(d=>d.r&&d.r.yt&&d.mt.totalMin!=='');
  const y1=R.filter(d=>d.r.yt===yt0),y2=R.filter(d=>d.r.yt!==yt0);
  if(y1.length>=2&&y2.length>=2)
    out.push(`朝ルーティンの所要は、YouTube 寄り道なしの日 平均${avg(y1.map(d=>d.mt.totalMin))}分、寄り道した日 ${avg(y2.map(d=>d.mt.totalMin))}分`);
  const rated=D.map(d=>({d,r:dayRate(d,false)})).filter(x=>x.r!==null);
  if(rated.length>=3){const w=rated.reduce((p,x)=>x.r<p.r?x:p);
    out.push(`いちばん崩れたのは ${w.d.k.slice(5)}（${wdOf(w.d.k)}）達成率 ${pct(w.r)}`);}
  if(P) Object.keys(S.items).forEach(l=>{const x=S.items[l],y=P.items[l];
    if(!y||x.n<2||y.n<2)return;
    const d=Math.round((x.ok/x.n-y.ok/y.n)*100);
    if(Math.abs(d)>=30) out.push(`${l}: 前期から ${sgn(d)}ポイント（${pct(y.ok/y.n)}→${pct(x.ok/x.n)}）`);});
  if(S.topWho&&S.topWhoN>=2) out.push(`${C().title}でよく出る相手: ${S.topWho}（${S.topWhoN}件 / 全${S.ang}件）`);
  return out;
}
function reviewHints(S){
  const out=[];
  Object.keys(S.items).forEach(l=>{const x=S.items[l];
    if(x.n>=4&&x.ok===x.n&&!x.auto) out.push(`✅ ${l}: ずっと100% → 習慣になったので外す候補`);
    else if(x.n>=4&&x.ok===0) out.push(`🔧 ${l}: ずっと0% → やり方を見直す候補`);
    if(x.no>=Math.ceil(S.days/2)) out.push(`❓ ${l}: 未記入 ${x.no}/${S.days}日 → 本当に必要か確認`);});
  if(dItems().length>9) out.push(`📋 日次チェックが ${dItems().length} 項目あります（目安 7〜9）`);
  return out;
}
function numRows(S,P){
  const mk=(l,k,f,dir,unit)=>({l,c:S[k],p:P?P[k]:null,f,dir,unit});
  const rows=[
    mk('起床 平均','wake',hm,0,'分'),
    mk('起床のブレ（標準偏差）','wakeSd',v=>v==null?'—':v+'分',-1,'分'),
    mk(`起床 目標±${C().rt.tol}分以内`,'wakeOk',v=>v==null?'—':v+'日',1,'日'),
    mk('睡眠 平均','sleep',dm,1,'分'),
    mk('PN 回数','pn',v=>v==null?'—':v+'回',0,'回'),
    mk('朝ルーティン 平均所要','rt',dm,-1,'分'),
    mk('YouTube 寄り道の割合','detour',v=>v==null?'—':v+'%',-1,'pt'),
    mk('日次チェック 達成率','rate',v=>v==null?'—':v+'%',1,'pt'),
    mk('Brave 平均','brave',dm,-1,'分'),
    mk(C().title+' 件数','ang',v=>v==null?'—':v+'件',0,'件'),
    mk('EN 拾ったフレーズ','ph',v=>v==null?'—':v+'件',1,'件')];
  Object.keys(S.acts||{}).forEach(l=>{const x=S.acts[l],y=P&&P.acts?P.acts[l]:null;
    const time=x.ty.t==='time';
    rows.push({l:`${x.m.icon||'💪'} ${l} 合計`,c:x.val,p:y?y.val:null,
      f:v=>v==null?'—':(time?durText(v):v+'回'),dir:1,unit:time?'分':'回'});});
  Object.keys(S.items).forEach(l=>{const x=S.items[l],y=P&&P.items[l];
    rows.push({l:'　'+l,c:x.n?Math.round(x.ok/x.n*100):null,
      p:y&&y.n?Math.round(y.ok/y.n*100):null,f:v=>v==null?'—':v+'%',dir:1,unit:'pt'});});
  return rows;
}
function diffTxt(r){
  if(r.c==null||r.p==null) return {t:'',c:''};
  const d=r.c-r.p; if(!d) return {t:'±0',c:''};
  return {t:sgn(d)+r.unit,c:r.dir?(d*r.dir>0?'good':'bad'):''};
}
let rp='lastw',rpKs=[],rpS=null,rpP=null;
function rpKeys(){
  if(rp==='range'){
    const df=rangeDef();
    let a=$('rpFrom').value||df.a,b=$('rpTo').value||df.b;
    if(a>b){const x=a;a=b;b=x;}
    return keysBetween(a,b);
  }
  return periodKeys(rp);
}
const rpA=()=>rpKs[0],rpB=()=>rpKs[rpKs.length-1];
function drawReport(){
  ['lastw','d7','range'].forEach(p=>{const b=$('rp_'+p);if(b)b.className='small seg'+(rp===p?' on':'');});
  $('rpRangeBox').style.display=rp==='range'?'':'none';
  rpKs=rpKeys();
  const a=rpA(),b=rpB(),n=rpKs.length;
  rpS=repStats(rpKs);rpP=repStats(keysBetween(shiftKey(a,-n),shiftKey(a,-1)));
  $('rpRange').textContent=`${a}〜${b}（${n}日）`;
  const rec=repRec(a,b,false);

  const box=$('rpPrev');box.innerHTML='';
  const pv=prevRep(a);
  if(pv){
    const el=document.createElement('div');el.className='exp mt';
    el.innerHTML=`<div class="mini">前回の実験（${esc(pv.from.slice(5))}〜${esc(pv.to.slice(5))}）</div><div style="margin:4px 0 8px">🧪 ${esc(pv.exp)}</div>`;
    const cs=document.createElement('div');cs.className='chips';
    Object.keys(MARK).forEach(k=>{
      const c=document.createElement('button');c.className='chip'+(pv.mark===k?' on':'');
      c.textContent=MARK[k];
      c.addEventListener('click',()=>{pv.mark=pv.mark===k?'':k;touch(pv);save();drawReport();});
      cs.appendChild(c);
    });
    el.appendChild(cs);
    const inp=document.createElement('input');inp.className='mt';inp.style.marginBottom='0';
    inp.placeholder='どうだったか（ひとこと・任意）';inp.value=pv.result||'';
    inp.addEventListener('change',()=>{pv.result=inp.value.trim();touch(pv);save();});
    el.appendChild(inp);box.appendChild(el);
  }

  let h=`<div class="rpr hd"><span></span><span class="v">今期</span><span class="p">前期</span><span class="d">差</span></div>`;
  numRows(rpS,rpP).forEach(r=>{const d=diffTxt(r);
    h+=`<div class="rpr"><span>${esc(r.l)}</span><span class="v">${esc(r.f(r.c))}</span><span class="p">${esc(r.f(r.p))}</span><span class="d ${d.c}">${esc(d.t)}</span></div>`;});
  $('rpNums').innerHTML=h;

  const ins=insights(rpS,rpP),hints=reviewHints(rpS);
  let ih=ins.length?ins.map(t=>`<div class="ins">💡 ${esc(t)}</div>`).join('')
    :'<div class="sub">まだ比べられるだけの記録がありません（比べる両側に2日以上必要）</div>';
  if(hints.length) ih+='<div class="rgh">チェック項目の見直し</div>'+hints.map(t=>`<div class="ins">${esc(t)}</div>`).join('');
  $('rpIns').innerHTML=ih;

  $('rpExp').value=rec?rec.exp||'':'';
  $('rpMemo').value=rec?rec.memo||'':'';
  $('rpMemoAt').textContent=rec&&rec.memoAt?`保存済み ${fmt(rec.memoAt)}`:'';

  const rh=$('rpHist');
  if(rh){
    rh.innerHTML='';
    const past=repAll().filter(x=>x.exp||x.memo||x.mark||x.result)
      .sort((x,y)=>y.to.localeCompare(x.to)).slice(0,20);
    if(!past.length) rh.innerHTML='<div class="sub">まだ保存されたレポートはありません</div>';
    past.forEach(x=>{
      const row=document.createElement('div');row.className='hist';
      const mk=x.mark?`［${MARK[x.mark]}］`:'';
      row.innerHTML=`<span><span class="mini">${esc(x.from.slice(5))}〜${esc(x.to.slice(5))}</span> ${x.exp?'🧪 '+esc(x.exp):'（実験なし）'} <span class="mini">${esc(mk)}</span>${x.memo?' 📝':''}</span><span>${x.synced?'':'<span class="dot"></span>'}</span>`;
      row.addEventListener('click',()=>{
        repSave('exp',$('rpExp').value.trim());
        $('rpFrom').value=x.from;$('rpTo').value=x.to;
        rp='range';drawReport();
      });
      rh.appendChild(row);
    });
  }
}
function repSave(field,val){
  if(!rpKs.length) return false;
  const cur=repRec(rpA(),rpB(),false);
  if((cur?cur[field]||'':'')===val) return false;
  if(!cur&&!val) return false;
  const r=repRec(rpA(),rpB(),true);
  r[field]=val; if(field==='memo') r.memoAt=val?now():null;
  touch(r);save();return true;
}
function repMd(){
  const a=rpA(),b=rpB(),n=rpKs.length,pv=prevRep(a),rec=repRec(a,b,false);
  const L=['以下は私のライフログ（LIFE LOG アプリ）の集計です。これをもとに振り返りレポートを書いてください。',
    '条件: 日本語で／数字（事実）と解釈を分ける／うまくいったこと2つと崩れたパターン2つ／前回の実験の評価／チェック項目で外す・見直すべきものがあれば指摘／来週の実験を1つだけ提案（小さく・具体的・測れる形）／800字程度。','',
    `## 期間 ${a}〜${b}（${n}日。前期は ${shiftKey(a,-n)}〜${shiftKey(a,-1)}）`];
  if(pv) L.push('','## 前回の実験',`- ${pv.exp} → ${MARK[pv.mark]||'未評価'}${pv.result?' ／ '+pv.result:''}`);
  L.push('','## 数字（今期 / 前期 / 差）');
  numRows(rpS,rpP).forEach(r=>L.push(`- ${r.l.trim()}: ${r.f(r.c)} / ${r.f(r.p)} ${diffTxt(r).t}`));
  const ins=insights(rpS,rpP),hints=reviewHints(rpS);
  if(ins.length){L.push('','## アプリが出した気づき');ins.forEach(t=>L.push('- '+t));}
  if(hints.length){L.push('','## チェック項目の見直し候補');hints.forEach(t=>L.push('- '+t));}
  if(rec&&rec.exp) L.push('','## 自分で決めた次の実験','- '+rec.exp);
  L.push('',mdWeek(rpKs,db.settings.expAng!==false,'レポート期間のログ'));
  return L.join('\n');
}
function openReport(){
  const df=rangeDef();
  rp='lastw';
  $('rpFrom').value=df.a;$('rpTo').value=df.b;     // 「期間」を押したときは直近10日から
  $('rpMsg').textContent='';$('rpOut').style.display='none';
  drawReport();
  if(!$('rpdlg').open) $('rpdlg').showModal();
}
on('btnRep','click',openReport);
['lastw','d7','range'].forEach(p=>on('rp_'+p,'click',()=>{
  repSave('exp',$('rpExp').value.trim());rp=p;drawReport();}));
['rpFrom','rpTo'].forEach(id=>on(id,'change',()=>{if(rp==='range') drawReport();}));
on('rpExp','change',()=>{if(repSave('exp',$('rpExp').value.trim()))$('rpMsg').textContent='実験を保存しました';});
on('rpMemoSave','click',()=>{
  repSave('memo',$('rpMemo').value.trim());
  const r=repRec(rpA(),rpB(),false);
  $('rpMemoAt').textContent=r&&r.memoAt?`保存済み ${fmt(r.memoAt)}`:'';
  $('rpMsg').textContent='振り返りメモを保存しました';
  drawReport();sync(true);
});
on('rpCopy','click',async()=>{
  repSave('exp',$('rpExp').value.trim());
  const t=repMd();
  try{await navigator.clipboard.writeText(t);
    $('rpMsg').textContent='コピーしました。Claude に貼り付けて、返事を下の欄に貼ってください';}
  catch(e){const o=$('rpOut');o.value=t;o.style.display='';o.select();
    $('rpMsg').textContent='下の欄を長押ししてコピーしてください';}
});
on('rpClose','click',()=>$('rpdlg').close());
on('rpdlg','close',()=>{
  if(rpKs.length){repSave('exp',$('rpExp').value.trim());repSave('memo',$('rpMemo').value.trim());}
  render();sync(true);
});