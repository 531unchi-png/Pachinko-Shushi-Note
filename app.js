
const KEY='shushicho.v1.records';
let records=JSON.parse(localStorage.getItem(KEY)||'[]'), range='year';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const yen=n=>(n<0?'-':'')+'¥'+Math.abs(Math.round(n)).toLocaleString('ja-JP');
const net=r=>(+r.return||0)-(+r.invest||0);
const cls=n=>n>0?'pos':n<0?'neg':'';
const today=()=>new Date().toISOString().slice(0,10);
function save(){localStorage.setItem(KEY,JSON.stringify(records));render()}
function scope(kind=range){
 let now=new Date(), y=now.getFullYear(), m=String(now.getMonth()+1).padStart(2,'0');
 if(kind==='month')return records.filter(r=>r.date.startsWith(`${y}-${m}`));
 if(kind==='year')return records.filter(r=>r.date.startsWith(`${y}-`));
 return records;
}
function sum(a,f){return a.reduce((s,r)=>s+(f?f(r):net(r)),0)}
function metrics(a){
 let inv=sum(a,r=>+r.invest||0), ret=sum(a,r=>+r.return||0), n=ret-inv, wins=a.filter(r=>net(r)>0).length;
 return {inv,ret,n,wins,rate:a.length?wins/a.length*100:0,roi:inv?ret/inv*100:0}
}
function stat(label,value,sub='',c=''){return `<div class="stat"><span>${label}</span><strong class="${c}">${value}</strong><small>${sub}</small></div>`}
function render(){
 let y=metrics(scope('year')),m=metrics(scope('month')),a=metrics(records);
 $('#yearNet').textContent=yen(y.n);$('#yearNet').className=cls(y.n);
 $('#monthNet').textContent=yen(m.n);$('#monthNet').className=cls(m.n);
 $('#allNet').textContent=yen(a.n);$('#allNet').className=cls(a.n);
 let s=scope(),x=metrics(s);
 $('#summary').innerHTML=
  stat('対象期間の収支',yen(x.n),`${s.length}件`,cls(x.n))+
  stat('総投資',yen(x.inv),'')+stat('総回収',yen(x.ret),`回収率 ${x.roi.toFixed(1)}%`)+stat('勝率',x.rate.toFixed(1)+'%',`${x.wins}勝 / ${s.length}回`);
 renderRecent();renderHistory();renderAnalysis();drawChart(s);updatePlaces();
}
function renderRecent(){
 let a=[...records].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
 $('#recent').innerHTML=a.length?a.map(row).join(''):'<div class="empty">まだ記録がありません。<br>＋から最初の収支を登録できます。</div>';
}
function row(r){let n=net(r);return `<div class="row" data-id="${r.id}"><div><b>${r.type}｜${r.title||'記録'}</b><small>${r.date}　${r.place||''}</small></div><div class="money ${cls(n)}">${yen(n)}<small>投資 ${yen(+r.invest||0)}</small></div></div>`}
function renderHistory(){
 let type=$('#filterType').value, mon=$('#filterMonth').value;
 let a=[...records].filter(r=>(!type||r.type===type)&&(!mon||r.date.startsWith(mon))).sort((a,b)=>b.date.localeCompare(a.date));
 $('#historyList').innerHTML=a.length?a.map(row).join(''):'<div class="empty">条件に一致する記録はありません。</div>';
}
function renderAnalysis(){
 let a=records,x=metrics(a), vals=a.map(net);
 $('#analysisCards').innerHTML=stat('累計収支',yen(x.n),'',cls(x.n))+stat('累計回収率',x.roi.toFixed(1)+'%','')+
 stat('最大勝ち',yen(vals.length?Math.max(...vals):0),'','pos')+stat('最大負け',yen(vals.length?Math.min(...vals):0),'','neg');
 let groups={};a.forEach(r=>{let k=r.place||'未入力';(groups[k]??=[]).push(r)});
 $('#placeStats').innerHTML=Object.entries(groups).sort((A,B)=>sum(B[1])-sum(A[1])).map(([k,v])=>`<div class="row"><div><b>${k}</b><small>${v.length}回 / 勝率 ${metrics(v).rate.toFixed(1)}%</small></div><div class="money ${cls(sum(v))}">${yen(sum(v))}</div></div>`).join('')||'<div class="empty">データなし</div>';
 let months={};a.forEach(r=>{let k=r.date.slice(0,7);(months[k]??=[]).push(r)});
 $('#monthlyStats').innerHTML=Object.entries(months).sort((a,b)=>b[0].localeCompare(a[0])).map(([k,v])=>`<div class="row"><div><b>${k.replace('-','年')}月</b><small>${v.length}回</small></div><div class="money ${cls(sum(v))}">${yen(sum(v))}</div></div>`).join('')||'<div class="empty">データなし</div>';
}
function drawChart(a){
 let c=$('#chart'),dpr=devicePixelRatio||1,w=c.clientWidth,h=190;c.width=w*dpr;c.height=h*dpr;let g=c.getContext('2d');g.scale(dpr,dpr);g.clearRect(0,0,w,h);
 let sorted=[...a].sort((a,b)=>a.date.localeCompare(b.date)), vals=[0],run=0;sorted.forEach(r=>vals.push(run+=net(r)));
 let min=Math.min(...vals),max=Math.max(...vals);if(max===min){max+=1;min-=1}
 let X=i=>10+(w-20)*i/(vals.length-1||1),Y=v=>10+(h-20)*(max-v)/(max-min);
 g.strokeStyle='#3b3b3f';g.lineWidth=1;let zero=Y(0);g.beginPath();g.moveTo(8,zero);g.lineTo(w-8,zero);g.stroke();
 g.strokeStyle='#d7ad53';g.lineWidth=2.5;g.beginPath();vals.forEach((v,i)=>i?g.lineTo(X(i),Y(v)):g.moveTo(X(i),Y(v)));g.stroke();
}
function openEditor(r){
 $('#editId').value=r?.id||'';$('#date').value=r?.date||today();$('#type').value=r?.type||'パチンコ';$('#place').value=r?.place||'';$('#title').value=r?.title||'';$('#invest').value=r?.invest||0;$('#return').value=r?.return||0;$('#memo').value=r?.memo||'';
 $('#deleteBtn').classList.toggle('hidden',!r);$('#formTitle').textContent=r?'記録を編集':'収支を記録';typeLabel();preview();$('#editor').showModal();
}
function typeLabel(){ $('#placeLabel').childNodes[0].nodeValue=$('#type').value==='競馬'?'競馬場':'店舗';$('#place').placeholder=$('#type').value==='競馬'?'競馬場名':'店舗名'}
function preview(){let n=(+$('#return').value||0)-(+$('#invest').value||0);$('#previewNet').textContent=yen(n);$('#previewNet').className=cls(n)}
function updatePlaces(){let p=[...new Set(records.map(r=>r.place).filter(Boolean))];$('#places').innerHTML=p.map(x=>`<option value="${x.replaceAll('"','&quot;')}">`).join('')}
$$('nav [data-page]').forEach(b=>b.onclick=()=>{$$('.page').forEach(p=>p.classList.remove('active'));$('#'+b.dataset.page).classList.add('active');$$('nav [data-page]').forEach(x=>x.classList.toggle('on',x===b));render()});
$$('.seg button').forEach(b=>b.onclick=()=>{range=b.dataset.range;$$('.seg button').forEach(x=>x.classList.toggle('on',x===b));render()});
$('#addTop').onclick=$('#addNav').onclick=()=>openEditor();$('#close').onclick=()=>$('#editor').close();
$('#type').onchange=typeLabel;$('#invest').oninput=$('#return').oninput=preview;$('#filterType').onchange=$('#filterMonth').onchange=renderHistory;
$('#form').onsubmit=e=>{e.preventDefault();let id=$('#editId').value||String(Date.now());let r={id,date:$('#date').value,type:$('#type').value,place:$('#place').value.trim(),title:$('#title').value.trim(),invest:+$('#invest').value||0,return:+$('#return').value||0,memo:$('#memo').value.trim()};
 let i=records.findIndex(x=>x.id===id);i>=0?records[i]=r:records.push(r);save();$('#editor').close()};
$('#deleteBtn').onclick=()=>{let id=$('#editId').value;if(confirm('この記録を削除しますか？')){records=records.filter(r=>r.id!==id);save();$('#editor').close()}};
document.addEventListener('click',e=>{let el=e.target.closest('.row[data-id]');if(el){let r=records.find(x=>x.id===el.dataset.id);if(r)openEditor(r)}});
$('#exportBtn').onclick=()=>{let blob=new Blob([JSON.stringify({app:'パチンコ・パチスロ収支帳',version:1,records},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='収支帳バックアップ-'+today()+'.json';a.click();URL.revokeObjectURL(a.href)};
$('#importFile').onchange=async e=>{try{let j=JSON.parse(await e.target.files[0].text());if(!Array.isArray(j.records))throw 0;if(confirm(`${j.records.length}件の記録で現在のデータを置き換えますか？`)){records=j.records;save()}}catch{alert('バックアップファイルを読み込めませんでした。')}e.target.value=''};
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
render();
