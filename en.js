/* LIFE LOG — en.js（EN：言える島を広げる）
   読み込み順: core → ui → en → report → main。
   このファイルで作る名前（他のファイルで同じ名前を作らないこと）:
     renderEnSum nFilter curIsl islChips ankiLine openEn drawEn copyText
     fixTargets fixPrompt tsvTargets
     phCur openPhrase drawPhIsl closePhrase
     pcCur pcNew openPiece drawPiece numv closePiece
     enWeekMd
   core.js の ST stageOf oneLine wordCount addPhrase relink enStats pieceText
   islDefs islDef islName phAll pcAll を使う（ここでは作らない）。
   mdWeek・mdTxt は report.js にある。押したときにだけ使うので、読み込み順の問題はない。 */

/* ---------- メイン画面の EN カード ---------- */
function renderEnSum(){
  const s=enStats();
  $('enSum').innerHTML=`EN　今日 拾った ${s.today} ／ 未添削 ${s.raw}
    <br><span class="mini">7日: 書いた ${s.wWrite}本・${s.wWords}語 ／ 話した ${s.wSpeak}回 ／ 使えた計 ${s.used}</span>`;
}

/* ---------- EN 画面 ---------- */
let nFilter='raw';
function curIsl(){const v=db.settings.enIsl||'';return islDefs().some(x=>x.label===v)?v:'';}
function islChips(box,val,fn){
  if(!box)return;
  box.innerHTML='';
  const defs=islDefs().slice();
  if(val&&!defs.some(x=>x.label===val)) defs.push(islDef(val));
  defs.forEach(x=>{
    const b=document.createElement('button');
    b.className='chip'+(val===x.label?' on a':'');
    b.textContent=`${x.icon||''} ${x.label}`;
    b.addEventListener('click',()=>fn(val===x.label?'':x.label));
    box.appendChild(b);
  });
}
function ankiLine(){
  const T=dayKeyOf(new Date()),ks=Array.from({length:7},(_,i)=>shiftKey(T,i-6));
  const its=dItems().filter(it=>dType(it).t==='count'&&/anki/i.test(it.label));
  if(!its.length) return '';
  const E=ks.map(k=>dailyEval(k));
  return 'Anki（直近7日・記録した日の平均）: '+its.map(it=>{
    const v=E.map(e=>e.rows.find(r=>r.it.label===it.label))
      .filter(r=>r&&typeof r.v==='number').map(r=>r.v);
    return `${it.label.replace(/^Anki\s*/i,'')} ${v.length?(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1)+'回':'—'}`;
  }).join(' ／ ');
}
function openEn(){
  $('nMsg').textContent='';$('nOut').style.display='none';
  drawEn();
  if(!$('ndlg').open) $('ndlg').showModal();
}
function drawEn(){
  $('nDate').textContent=dayKeyOf(new Date());
  islChips($('nIsl'),curIsl(),v=>{db.settings.enIsl=v;save();drawEn();});
  const s=enStats();
  const cell=(n,l,key)=>`<div class="${key?'key':''}"><b>${n}</b><span class="mini">${l}</span></div>`;
  $('nFun').innerHTML=cell(s.total,'①拾った')+cell(s.fixed,'②整えた')+cell(s.anki,'③Anki')+
    cell(s.used,'④使えた',true)+cell(s.spoken,'⑤話せた',true);
  $('nFunSub').textContent=`直近7日: 書いた ${s.wWrite}本・${s.wWords}語 ／ 話した ${s.wSpeak}回・${s.wMin}分`;
  const by={};
  s.A.forEach(p=>{const k=p.island||'';by[k]=by[k]||{n:0,u:0};by[k].n++;
    if((p.usedIn||[]).length) by[k].u++;});
  const keys=islDefs().map(x=>x.label)
    .concat(Object.keys(by).filter(k=>!islDefs().some(x=>x.label===k)));
  const mx=Math.max(1,...keys.map(k=>(by[k]||{n:0}).n));
  $('nBars').innerHTML=keys.map(k=>{const b=by[k]||{n:0,u:0};
    return `<div class="mini" style="display:flex;justify-content:space-between"><span>${esc(islName(k))}</span><span>使えた ${b.u} / ${b.n}</span></div>
      <div class="bar"><i style="width:${b.n/mx*100}%"><i style="width:${b.n?b.u/b.n*100:0}%"></i></i></div>`;
  }).join('');
  $('nAnki').textContent=ankiLine();
  $('nCopyFix').textContent=`未添削をコピー（${s.raw}）`;
  $('nTsv').textContent=`Anki 用 TSV をダウンロード（${tsvTargets().length}件）`;

  const cnt={raw:0,fixed:0,anki:0,used:0};s.A.forEach(p=>cnt[stageOf(p)]++);
  const F=$('nFilt');F.innerHTML='';
  ['raw','fixed','anki','used','all'].forEach(k=>{
    const b=document.createElement('button');
    b.className='chip'+(nFilter===k?' on':'');
    b.textContent=k==='all'?`すべて ${s.total}`:`${ST[k]} ${cnt[k]}`;
    b.addEventListener('click',()=>{nFilter=k;drawEn();});
    F.appendChild(b);
  });
  const L=$('nList');L.innerHTML='';
  const list=s.A.filter(p=>nFilter==='all'||stageOf(p)===nFilter)
    .sort((a,b)=>new Date(b.start)-new Date(a.start)).slice(0,60);
  if(!list.length) L.innerHTML='<div class="sub center mt">ありません</div>';
  list.forEach(p=>{
    const el=document.createElement('div');el.className='prow';
    const dot=p.synced?'':'<span class="dot"></span>';
    el.innerHTML=`<div><span class="tag t-en">${ST[stageOf(p)]}</span><span class="mini">${md(new Date(p.start))} ${esc(islName(p.island))}</span>${dot}</div>
      <div>${esc(p.en||p.raw)}</div>${p.en?`<div class="mini">${esc(p.raw)}</div>`:''}`;
    el.addEventListener('click',()=>openPhrase(p.id));
    L.appendChild(el);
  });
  const PL=$('nPieces');PL.innerHTML='';
  const ps=s.P.slice().sort((a,b)=>String(b.dateKey).localeCompare(String(a.dateKey))||new Date(b.start)-new Date(a.start)).slice(0,30);
  if(!ps.length) PL.innerHTML='<div class="sub">ありません</div>';
  ps.forEach(x=>{const el=document.createElement('div');el.className='hist';
    el.innerHTML=`<span><span class="mini">${esc(String(x.dateKey||'').slice(5))}</span> ${esc(pieceText(x))}</span><span>${x.synced?'':'<span class="dot"></span>'}</span>`;
    el.addEventListener('click',()=>openPiece(x.id,null));PL.appendChild(el);});
}
/* コピー（できなければ下の欄に出して長押しコピー） */
async function copyText(t,msgEl){
  try{await navigator.clipboard.writeText(t);if(msgEl)msgEl.textContent='コピーしました';return true;}
  catch(e){const o=$('nOut');if(o){o.value=t;o.style.display='';o.select();}
    if(msgEl)msgEl.textContent='下の欄を長押ししてコピーしてください';return false;}
}
on('btnEn','click',openEn);
on('nAdd','click',()=>{
  const v=$('nRaw').value.trim();
  if(!v){$('nMsg').textContent='言いたいことを入れてください';return;}
  addPhrase(v,curIsl());$('nRaw').value='';
  $('nMsg').textContent=`拾いました（未添削 ${phAll().filter(p=>!p.en).length}）`;
  drawEn();renderEnSum();sync(true);
});
on('nClose','click',()=>$('ndlg').close());
on('ndlg','close',()=>{
  const v=$('nRaw').value.trim(); if(v){addPhrase(v,curIsl());$('nRaw').value='';}
  render();sync(true);
});

/* ② 整える：Claude 用の指示文を作る／返答を取り込む */
const fixTargets=()=>phAll().filter(p=>!p.en)
  .sort((a,b)=>new Date(a.start)-new Date(b.start)).slice(0,FIX_MAX);
function fixPrompt(){
  const T=fixTargets(); if(!T.length) return '';
  return ['以下は、私が英語で言いたいことのメモです（日本語と英語が混ざっています）。',
    'それぞれを、私が実際の会話や文章でそのまま使える自然な英語に整えてください。',
    '条件: 意味を変えない／教科書的すぎず、ネイティブが日常的に使う言い方／1〜2文に収める。',
    '出力は下の形式だけにして、1行に1件、説明は書かないでください（「 | 」区切り）:',
    'ID | 英語 | 日本語の意味（短く） | ひとことメモ（言い換え・注意点。なければ空）','',
    ...T.map(p=>`${p.id} | ${oneLine(p.raw)}${p.island?'  ［話題: '+p.island+'］':''}`)].join('\n');
}
on('nCopyFix','click',()=>{
  const t=fixPrompt();
  if(!t){$('nMsg').textContent='未添削はありません';return;}
  copyText(t,$('nMsg'));
});
on('nImpOpen','click',()=>{const b=$('nImpBox');b.style.display=b.style.display==='none'?'':'none';});
on('nImpGo','click',()=>{
  let n=0,miss=0;
  $('nImp').value.split('\n').forEach(line=>{
    const m=line.replace(/^[\s\-*>|`]+/,'').match(/^(PH[0-9a-z]+)\s*[|｜\t]\s*(.*)$/i); if(!m)return;
    const p=db.items.find(i=>i.id===m[1]&&i.kind==='phrase'&&!i.deleted); if(!p){miss++;return;}
    const f=m[2].split(/\s*[|｜\t]\s*/).map(x=>x.trim().replace(/^\*+|\*+$/g,''));
    if(!f[0])return;
    p.en=f[0];p.ja=f[1]||p.ja||'';p.tip=f[2]||'';p.fixedAt=now();touch(p);n++;
  });
  save();
  if(n){$('nImp').value='';$('nImpBox').style.display='none';}
  $('nMsg').textContent=n?`${n}件を取り込みました${miss?'（見つからないID '+miss+'件）':''}`
    :'取り込める行がありませんでした（「ID | 英語 | 日本語」の形か確認してください）';
  drawEn();sync(true);
});

/* ③ Anki 用 TSV */
const tsvTargets=()=>phAll().filter(p=>p.en&&!p.ankiAt);
on('nTsv','click',()=>{
  const T=tsvTargets();
  if(!T.length){$('nMsg').textContent='Anki に出すフレーズはありません（整えたものだけが対象）';return;}
  const tg=s=>String(s||'').replace(/\s+/g,'_');
  const h=s=>esc(oneLine(s));
  const body=T.map(p=>[h(p.ja||p.raw),h(p.en)+(p.tip?'<br><small>'+h(p.tip)+'</small>':''),
    'EN'+(p.island?' '+tg('島::'+p.island):'')].join('\t')).join('\n');
  const blob=new Blob(['#separator:tab\n#html:true\n#tags column:3\n'+body+'\n'],{type:'text/plain'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`anki-en-${dayKeyOf(new Date())}.txt`;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),5000);
  const t=now();T.forEach(p=>{p.ankiAt=t;touch(p);});save();
  $('nMsg').textContent=`${T.length}件をダウンロードしました（Anki済みにしました）`;
  drawEn();sync(true);
});

/* ---------- フレーズの修正（保存で確定） ---------- */
let phCur=null;
function openPhrase(id){
  const src=db.items.find(i=>i.id===id); if(!src)return;
  phCur=clone(src);
  $('phRaw').value=phCur.raw||'';$('phEn').value=phCur.en||'';
  $('phJa').value=phCur.ja||'';$('phTip').value=phCur.tip||'';
  $('phAnki').checked=!!phCur.ankiAt;$('phMsg').textContent='';
  $('phStage').textContent=ST[stageOf(phCur)]+' ／ '+fmt(phCur.start);
  $('phUsed').textContent=(phCur.usedIn||[]).length?`使った記録 ${phCur.usedIn.length}件`:'';
  drawPhIsl();
  if(!$('phdlg').open) $('phdlg').showModal();
}
function drawPhIsl(){islChips($('phIsl'),phCur.island||'',v=>{phCur.island=v;drawPhIsl();});}
function closePhrase(){phCur=null;$('phdlg').close();}
on('phCancel','click',closePhrase);
on('phdlg','cancel',e=>{e.preventDefault();closePhrase();});
on('phSave','click',()=>{
  if(!phCur)return;
  const raw=$('phRaw').value.trim(),en=$('phEn').value.trim();
  if(!raw&&!en){$('phMsg').textContent='元メモか英語のどちらかが必要です';return;}
  const t=db.items.find(i=>i.id===phCur.id); if(!t){closePhrase();return;}
  const changed=en&&en!==(t.en||'');
  Object.assign(t,{raw,en,ja:$('phJa').value.trim(),tip:$('phTip').value.trim(),
    island:phCur.island||'',
    ankiAt:$('phAnki').checked?(t.ankiAt||now()):null,
    fixedAt:en?(changed?now():t.fixedAt):null});
  touch(t);save();closePhrase();
});
on('phDel','click',()=>{
  if(!phCur||!confirm('このフレーズを削除しますか？'))return;
  const t=db.items.find(i=>i.id===phCur.id); if(t)drop(t);
  closePhrase();
});
on('phdlg','close',()=>{if($('ndlg').open)drawEn();render();sync(true);});

/* ---------- ④⑤ 書いた・話した（保存で確定） ---------- */
let pcCur=null,pcNew=false;
function openPiece(id,type){
  if(id){const s=db.items.find(i=>i.id===id); if(!s)return; pcCur=clone(s);pcNew=false;}
  else{const s=now();
    pcCur={id:'PC'+uid(),kind:'piece',type,start:s,end:null,dateKey:dayKeyOf(new Date()),
      island:curIsl(),words:null,mins:null,stuck:null,jp:null,phrases:[],text:'',
      updatedAt:s,synced:false};
    pcNew=true;}
  pcCur.phrases=pcCur.phrases||[];
  $('pcDate').value=pcCur.dateKey;$('pcText').value=pcCur.text||'';
  $('pcWords').value=pcCur.words??'';$('pcMin').value=pcCur.mins??'';
  $('pcStuck').value=pcCur.stuck??'';$('pcJp').value=pcCur.jp??'';
  $('pcMsg').textContent='';$('pcDel').style.display=pcNew?'none':'';
  drawPiece();
  if(!$('pcdlg').open) $('pcdlg').showModal();
}
function drawPiece(){
  const sp=pcCur.type==='speak';
  $('pcHead').textContent=(sp?'🎙 話した':'✍️ 書いた')+(pcNew?'（新規）':'');
  $('pcW').className='small seg'+(sp?'':' on');
  $('pcS').className='small seg'+(sp?' on':'');
  $('pcWBox').style.display=sp?'none':'';
  $('pcSBox').style.display=sp?'':'none';
  islChips($('pcIsl'),pcCur.island||'',v=>{pcCur.island=v;drawPiece();});
  const box=$('pcPh');box.innerHTML='';
  const sel=pcCur.phrases;
  const cand=phAll().filter(p=>p.en&&(!pcCur.island||p.island===pcCur.island||sel.includes(p.id)))
    .sort((a,b)=>(sel.includes(b.id)-sel.includes(a.id))||new Date(b.start)-new Date(a.start))
    .slice(0,40);
  if(!cand.length) box.innerHTML='<div class="mini">整えたフレーズがまだありません</div>';
  cand.forEach(p=>{
    const b=document.createElement('button');
    b.className='chip'+(sel.includes(p.id)?' on a':'');
    b.textContent=String(p.en).slice(0,60);
    b.addEventListener('click',()=>{
      pcCur.phrases=sel.includes(p.id)?sel.filter(x=>x!==p.id):sel.concat(p.id);drawPiece();});
    box.appendChild(b);
  });
}
const numv=id=>{const v=$(id).value;return v===''||isNaN(+v)?null:+v;};
function closePiece(){pcCur=null;$('pcdlg').close();}
on('nWrite','click',()=>openPiece(null,'write'));
on('nSpeak','click',()=>openPiece(null,'speak'));
on('pcW','click',()=>{if(pcCur){pcCur.type='write';drawPiece();}});
on('pcS','click',()=>{if(pcCur){pcCur.type='speak';drawPiece();}});
on('pcCount','click',()=>{$('pcWords').value=wordCount($('pcText').value)||'';});
on('pcCancel','click',closePiece);
on('pcdlg','cancel',e=>{e.preventDefault();closePiece();});
on('pcSave','click',()=>{
  if(!pcCur)return;
  const sp=pcCur.type==='speak',txt=$('pcText').value;
  Object.assign(pcCur,{dateKey:$('pcDate').value||pcCur.dateKey,text:txt,
    words:sp?null:(numv('pcWords')??(wordCount(txt)||null)),
    mins:sp?numv('pcMin'):null,stuck:sp?numv('pcStuck'):null,jp:sp?numv('pcJp'):null});
  if(!sp&&!pcCur.words&&!txt.trim()&&!pcCur.phrases.length){
    $('pcMsg').textContent='語数・本文・フレーズのどれかを入れてください';return;}
  if(sp&&pcCur.mins==null&&!pcCur.phrases.length){
    $('pcMsg').textContent='話した時間か、使ったフレーズを入れてください';return;}
  let old=[];
  if(pcNew){pcCur.updatedAt=now();pcCur.synced=false;db.items.push(pcCur);}
  else{const t=db.items.find(i=>i.id===pcCur.id);
    if(t){old=t.phrases||[];Object.assign(t,pcCur);touch(t);}}
  relink([...new Set(old.concat(pcCur.phrases))]);
  save();closePiece();
});
on('pcDel','click',()=>{
  if(!pcCur||pcNew){closePiece();return;}
  if(!confirm('この記録を削除しますか？'))return;
  const t=db.items.find(i=>i.id===pcCur.id),ids=(t&&t.phrases)||[];
  if(t)drop(t);
  relink(ids);save();closePiece();
});
on('pcdlg','close',()=>{if($('ndlg').open)drawEn();render();sync(true);});

/* ---------- 週次振り返りの素材（英語で書く用） ---------- */
function enWeekMd(){
  const T=dayKeyOf(new Date()),ks=Array.from({length:7},(_,i)=>shiftKey(T,i-6));
  const inK=k=>k>=ks[0]&&k<=T;
  const tx=s=>typeof mdTxt==='function'?mdTxt(s):oneLine(s);
  const A=phAll().filter(p=>inK(p.dateKey)),P=pcAll().filter(x=>inK(x.dateKey));
  const L=[`## Weekly reflection material ${ks[0]}〜${T}`,'',
    `> これを見ながら英語で約${C().en.goal}語の振り返りを書く。書けたら EN 画面の「✍️ 書いた」で記録し、使ったフレーズを選ぶ。`,'',
    '### Prompts',
    '- What went well this week, and why?',
    '- What did not go as planned? What got in the way?',
    '- What did I notice about my sleep, my mornings, and my faith?',
    '- One thing I will try next week.','',
    "### This week's phrases"];
  const F=A.filter(p=>p.en);
  if(F.length) F.forEach(p=>L.push(`- ${tx(p.en)}${p.ja?' — '+tx(p.ja):''}`));
  else L.push('- （なし）');
  const R=A.filter(p=>!p.en);
  if(R.length){L.push('','### Not yet in English（まだ英語にしていないこと）');
    R.forEach(p=>L.push('- '+tx(p.raw)));}
  if(P.length){L.push('','### Output this week');
    P.forEach(x=>L.push(`- ${String(x.dateKey).slice(5)} ${pieceText(x)}`));}
  if(typeof mdWeek==='function'){
    L.push('','### Life log（要点）');
    L.push(mdWeek(ks,false,'直近7日のログ').split('\n### 日別')[0]);
  }
  return L.join('\n');
}
on('nWeek','click',()=>copyText(enWeekMd(),$('nMsg')));