/* NZS P11–P12: read-only native placement and ordinary-transition inspector.
 * Real sprite art is indexed through separate original savestate image catalogue.
 * Disk offsets and typed roles: canonical wiki/03 and wiki/04 (P10/P09 evidence).
 */
(function(root){
'use strict';
const NAMES=['1_1','1_2','1_3','1_4','2_1','2_2','2_3','2_4','3_1','3_2','3_3','3_4','4_1','4_2','4_3','4_4','4_4b','5_1','5_2','5_3','5_4'];
// Disk offsets of two-byte placement-preface words. Each record begins at +2.
const START=[577508,577564,577660,577744,577888,578060,578240,578384,578532,578680,578796,578928,579068,579208,579280,579376,579468,579592,579700,579812,579904];
const COUNT=[13,23,20,35,42,44,35,36,36,28,32,34,34,17,23,22,30,26,27,22,20];
const ANIM={4:'RAM $080D8 / Disk $8804E',5:'RAM $08DD8 / Disk $88D50',6:'RAM $0832A / Disk $882A2',31:'RAM $07558 / Disk $874CE · $B0…',32:'RAM $075A6 / Disk $87518 · $CA–$CF'};
// P09 ordinary transition rows are compressed at Disk $84B14–$84B7F, not a
// fixed eight-byte array on disk. Source $95 <value> <count-minus-one>.
const WARPS_OFFSET=0x84b14, WARPS_END=0x84b80;
function normalToStage(i){return i>=16?i+1:i;} // 4_4b has its own special loader
function decodeWarps(disk){
 const out=[];let off=WARPS_OFFSET;
 while(off<WARPS_END){
  const n=disk[off++];if(n!==0x95)out.push(n);else{
   if(off+2>WARPS_END)throw Error('Incomplete native warp RLE');
   const v=disk[off++],repeat=disk[off++]+1;
   for(let i=0;i<repeat;i++)out.push(v);
  }
  if(out.length>160)throw Error('Native warp RLE exceeds 160 bytes');
 }
 if(off!==WARPS_END||out.length!==160)throw Error('Native warp table length mismatch');
 const warps=[];
 for(let row=0;row<20;row++){
  const pos=row*8,v=out.slice(pos,pos+8);
  if(v.every(n=>n===0))continue;
  const code=v[2]*256+v[3];
  if(code%16||code>19*16)throw Error('Unexpected native destination-stage code');
  warps.push([normalToStage(row),v[0],v[1],normalToStage(code/16),v[4]*256+v[5],v[6]*256+v[7]]);
 }
 return warps;
}
function hx(n,d=2){return '$'+n.toString(16).toUpperCase().padStart(d,'0');}
function classify(type){if(type===0)return 'entry';if(type===1||type===2)return 'objective';if(type===3)return 'generator';if(type===31)return 'type1f';if(type===32)return 'type20';return 'direct';}
function role(type){return type===0?'Entry candidate':type===1?'Ordinary objective candidate':type===2?'Boss objective candidate':type===3?'Native actor generator':type===31?'Fruit / item family $1F (instance unverified)':type===32?'Bonus-letter family $20 (instance unverified)':'Direct actor (identity unknown)';}
function parseDisk(disk){
 if(!(disk instanceof Uint8Array)||disk.length!==901120||disk[0]!==0x44||disk[1]!==0x4f||disk[2]!==0x53)throw Error('Expected original-format 901,120-byte Disk.1');
 const levels=NAMES.map((name,stage)=>{
  const records=[];for(let i=0;i<COUNT[stage];i++){
   const at=START[stage]+2+i*4;
   records.push({stage,name,ordinal:i,disk:at,type:disk[at],x:disk[at+1],y:disk[at+2],parameter:disk[at+3],kind:classify(disk[at])});
  }return records;
 });
 // Explicit sanity checks against the owner-confirmed P10 stock manifest.
 const all=levels.flat(),g=all.filter(r=>r.type===3).length,t1f=all.filter(r=>r.type===31).length,t20=all.filter(r=>r.type===32).length;
 const warps=decodeWarps(disk);
 const stock=all.length===599&&g===298&&t1f===29&&t20===30&&levels.every(rows=>rows[0].type===0);
 return {levels,warps,stock,counts:{records:all.length,generators:g,type1f:t1f,type20:t20}};
}
function canvasX(record,shiftTiles=0){
 // Native factory RAM $05872 and generator RAM $0B71C: Xcell*16+4.
 // Extra full-tile correction is an explicitly unverified view option.
 return record.x*16+4+shiftTiles*16;
}
function canvasY(record,height,shiftTiles=0){
 // Native factory and generator Y=Ycell*16; grid is bottom-up, placements stage-local.
 // No +8 tile-centre offset: that was a P11 marker error, not native geometry.
 if(!Number.isInteger(height)||height<1||height>64)throw RangeError('Invalid active height');
 return (64-height+record.y+shiftTiles)*16;
}
const API=Object.freeze({NAMES,START,COUNT,decodeWarps,parseDisk,canvasX,canvasY,classify,role});
root.NZSEntities=API;
if(typeof module==='object'&&module.exports)module.exports=API;
if(typeof document==='undefined')return;
const $=id=>document.getElementById(id);
function setup(){
 if(!$('overlayCanvas')||!$('canvasStack')||!$('p11EntityToggles')||!root.NZS_STOCK)return;
 const parent=$('p11EntityToggles'),inspector=$('p11EntityInspector'),overlay=$('overlayCanvas');
 const cvs=document.createElement('canvas');cvs.id='p11EntityCanvas';cvs.width=cvs.height=1024;cvs.style.pointerEvents='none';
 $('canvasStack').appendChild(cvs);const ctx=cvs.getContext('2d');
 ctx.imageSmoothingEnabled=false;
 const colors={entry:'#c5f9e0',objective:'#ffc46a',generator:'#b598f6',direct:'#c9deeb',type1f:'#ed9fcc',type20:'#a8f4b7',out:'#ffd073',incoming:'#71d9f9'};
 const groups=[['entry','Entry'],['objective','Objectives'],['generator','$03 generators'],['direct','Other direct'],['type1f','$1F actors'],['type20','$20 candidates'],['out','Warp out'],['incoming','Warp in']];
 let parsed=null,inspect=false,selected=null,shiftX=0,shiftY=0,levelIndex=0;
 const header=document.createElement('div');header.className='section-heading compact';header.innerHTML='ENTITIES <span id="p11Count">—</span>';parent.appendChild(header);
 for(const [key,label] of groups){const el=document.createElement('label');el.className='checkbox';el.title=key==='out'||key==='incoming'?'Native P09 ordinary transition only; pixel projection provisional':'Read-only source placements';
  el.innerHTML=`<input type="checkbox" data-entity="${key}" ${key==='generator'?'':'checked'}>${label}`;parent.appendChild(el);}
 const offsetLabel=document.createElement('label');offsetLabel.className='checkbox';offsetLabel.title='White cross shows code-backed native source X/Y. Separate X/Y adjustments affect preview only; neither changes Disk.1.';
 offsetLabel.innerHTML='<input type="checkbox" id="p11Compare" checked>Show source anchor';parent.appendChild(offsetLabel);
 const offsets=document.createElement('div');offsets.className='p11-coordinates';
 offsets.innerHTML='<label title="Unverified horizontal view correction. Native base is Xtile×16+4">X <select id="p11ShiftX"><option value="-1">−16</option><option value="0" selected>0</option><option value="1">+16</option></select></label><label title="Unverified vertical view correction. Native base is Ytile×16">Y <select id="p11ShiftY"><option value="-1">−16</option><option value="0" selected>0</option><option value="1">+16</option></select></label>';
 parent.appendChild(offsets);
 const box=document.createElement('div');box.style.padding='9px 12px';box.style.display='flex';box.style.gap='5px';
 box.innerHTML='<button id="p11Inspect" type="button" style="width:100%" title="Inspect a nearby object by clicking its marker. Painting is suspended in this mode.">Inspect entities</button>';
 inspector.appendChild(document.createElement('div')).outerHTML='<div class="section-heading">ENTITIES <span id="p11Active">PAINT</span></div>';
 inspector.appendChild(box);
 const details=document.createElement('div');details.id='p11Detail';details.style.cssText='padding:8px 12px 12px;color:#aabfca;font:11px/1.5 ui-monospace,monospace;min-height:64px;word-break:break-word;';inspector.appendChild(details);
 const setDetail=(lines)=>{details.replaceChildren(...lines.map(line=>{const div=document.createElement('div');div.textContent=line;return div;}));};
 const chosen=()=>new Set(Array.from(parent.querySelectorAll('input[data-entity]:checked')).map(el=>el.dataset.entity));
 const stage=()=>{const target=String($('overviewLevel').textContent||'').trim();let i=NAMES.indexOf(target);if(i<0){const name=root.NZS_STOCK.levels.findIndex(x=>x.name===target);i=name;}return i<0?0:i;};
 const height=i=>{if($('toggleActive')){const stock=root.NZS_STOCK.levels[i];const h=root.NZSLevelHeaders?.STOCK_HEADERS?.[i];return h?.height||stock?.height||64;}return 64;};
 // P03 preview's header is available; after opening a different Disk.1 the
 // source header height can change. Read it from the source disk if present.
 let disk=null;
 function currentHeight(i){const off=root.NZS_STOCK.levels[i].offset-128;return disk?((disk[off+4]<<8)|disk[off+5]):height(i);}
 function point(r,i){return {x:canvasX(r,shiftX),y:canvasY(r,currentHeight(i),shiftY)};}
 function records(){return parsed?.levels[levelIndex]||[];}
 function collectPoints(){
  const enabled=chosen(),p=[];for(const r of records())if(enabled.has(r.kind))p.push({r,group:r.kind,...point(r,levelIndex)});
  for(const [source,x,y,target,dx,dy] of parsed.warps){
   if(source===levelIndex&&enabled.has('out'))p.push({r:{kind:'out',source,x,y,target,dx,dy},group:'out',x:x*16+8,y:(64-currentHeight(source)+y)*16+8});
   if(target===levelIndex&&enabled.has('incoming'))p.push({r:{kind:'incoming',source,x,y,target,dx,dy},group:'incoming',x:dx,y:1024-dy});
  }return p;
 }
 function mark(x,y,group,active){
  if(x<0||x>1024||y<0||y>1024)return;const rad=group==='generator'?3.5:group==='direct'?4:6;
  ctx.beginPath();ctx.arc(x,y,rad,0,Math.PI*2);ctx.fillStyle=colors[group]||'#fff';ctx.globalAlpha=.85;ctx.fill();ctx.globalAlpha=1;
  ctx.lineWidth=active?3:1.2;ctx.strokeStyle=active?'white':'#102029';ctx.stroke();
  if(group==='out'||group==='incoming'){ctx.beginPath();ctx.moveTo(x-9,y);ctx.lineTo(x+9,y);ctx.moveTo(x,y-9);ctx.lineTo(x,y+9);ctx.strokeStyle=colors[group];ctx.lineWidth=1;ctx.stroke();}
 }
 function redraw(){
  levelIndex=stage();ctx.clearRect(0,0,1024,1024);
  if(!parsed){$('p11Count').textContent='OPEN DISK';setDetail(['Open Disk.1 to inspect native objects.']);return;}
  $('p11Count').textContent=String(records().length);
  const ps=collectPoints();for(const p of ps){
   if(p.r.type!==undefined&&$('p11Compare').checked){
    const rawX=canvasX(p.r,0),rawY=canvasY(p.r,currentHeight(levelIndex),0);
    ctx.lineWidth=1;ctx.strokeStyle='rgba(255,255,255,.8)';
    ctx.beginPath();ctx.moveTo(rawX-4,rawY);ctx.lineTo(rawX+4,rawY);ctx.moveTo(rawX,rawY-4);ctx.lineTo(rawX,rawY+4);ctx.stroke();
    if(rawX!==p.x||rawY!==p.y){ctx.beginPath();ctx.setLineDash([2,3]);ctx.moveTo(rawX,rawY);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.setLineDash([]);}
   }
   mark(p.x,p.y,p.group,selected===p.r);
  }
 }
 function detailsFor(r){if(!r)return ['Click an entity marker to inspect.'];
  if(r.kind==='out'||r.kind==='incoming')return [`${r.kind==='out'?'Outgoing':'Incoming'} ordinary warp`,`${NAMES[r.source]} → ${NAMES[r.target]}`,`OUT tile ${r.x},${r.y} / IN raw ${r.dx},${r.dy}`,'Arrival projection not verified'];
  return [`${role(r.type)}`,`Type ${hx(r.type)} · Parameter ${hx(r.parameter)}`,`Source ${NAMES[r.stage]} #${r.ordinal} · Disk ${hx(r.disk,6)}`,`Source (${r.x}, ${r.y}); native (${canvasX(r)}, ${canvasY(r,currentHeight(r.stage))})`, `View shift X ${shiftX*16}px · Y ${shiftY*16}px`, ANIM[r.type]?`Sequence ${ANIM[r.type]}`:'Graphic sequence not identified','No native image has been verified'];
 }
 $('p11Inspect').onclick=()=>{inspect=!inspect;$('p11Inspect').classList.toggle('selected',inspect);$('p11Active').textContent=inspect?'VIEW ONLY':'PAINT';};
 $('p11ShiftX').onchange=e=>{shiftX=Number(e.target.value);selected=null;redraw();setDetail(['Horizontal display shift '+shiftX*16+'px · unverified.']);};
 $('p11ShiftY').onchange=e=>{shiftY=Number(e.target.value);selected=null;redraw();setDetail(['Vertical display shift '+shiftY*16+'px · unverified.']);};
 parent.addEventListener('change',redraw);
 overlay.addEventListener('pointerdown',ev=>{
  if(!inspect||ev.button!==0)return;
  ev.preventDefault();ev.stopImmediatePropagation();const box=overlay.getBoundingClientRect();const x=(ev.clientX-box.left)/box.width*1024,y=(ev.clientY-box.top)/box.height*1024;
  const ps=collectPoints().map(p=>({...p,d:Math.hypot(p.x-x,p.y-y)})).filter(p=>p.d<14).sort((a,b)=>a.d-b.d);
  selected=ps[0]?.r||null;setDetail(detailsFor(selected));redraw();
 },true);
 overlay.addEventListener('pointermove',ev=>{
  if(!inspect||!parsed)return;const box=overlay.getBoundingClientRect();const x=(ev.clientX-box.left)/box.width*1024,y=(ev.clientY-box.top)/box.height*1024;
  const hit=collectPoints().find(p=>Math.abs(p.x-x)<7&&Math.abs(p.y-y)<7);
  if(hit){overlay.title=hit.r.type===undefined?`Ordinary warp ${NAMES[hit.r.source]} → ${NAMES[hit.r.target]}`:`${role(hit.r.type)} · ${hx(hit.r.type)} · ${hit.r.x},${hit.r.y} · Disk ${hx(hit.r.disk,6)}`;}
  else overlay.title='';
 });
 const observer=new MutationObserver(()=>{if(parsed)redraw();});observer.observe($('overviewLevel'),{childList:true,characterData:true,subtree:true});
 $('diskInput').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{const b=new Uint8Array(await file.arrayBuffer());const p=parseDisk(b);disk=b;parsed=p;selected=null;
   if(!p.stock){$('p11Count').title='Native record distribution differs from P10 stock manifest';setDetail(['Warning: record counts do not match stock.',`Records ${p.counts.records}; $03 ${p.counts.generators}`,`$1F ${p.counts.type1f}; $20 ${p.counts.type20}`]);}
   else setDetail(['599 records · stock layout matched.','Select a point to inspect.']);redraw();
  }catch(err){parsed=null;disk=null;setDetail(['Entity load failed: '+err.message]);redraw();}
 },true);
 setDetail(['Open Disk.1 to inspect native objects.']);redraw();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})(typeof window!=='undefined'?window:globalThis);
