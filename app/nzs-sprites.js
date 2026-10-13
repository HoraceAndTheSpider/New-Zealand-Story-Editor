/* P12: original 68000 image-directory browser + optional, explicitly approximate
 * entity-family sprite previews. 289 bitmap records recovered from stock savestate.
 * Does not alter P03 map editor or Disk.1. See wiki/04 and wiki/07.
 */
(function(root){
'use strict';
const data=root.NZSSpriteData,Entities=root.NZSEntities;
if(!data)return;
const FAMILIES=Object.freeze({4:0x6F,5:0x79,6:0x82,31:0xB0,32:0xCA});
function getFamilyFrame(type){return FAMILIES[type]??null;}
const api=Object.freeze({getFamilyFrame, frameMeta:data.describe, frameCount:data.FRAMES.length});
root.NZSSprites=api;
if(typeof module==='object'&&module.exports)module.exports=api;
if(typeof document==='undefined')return;
const $=id=>document.getElementById(id);
function init(){
 const canvasStack=$('canvasStack'),browser=$('p12SpriteBrowser'),left=$('p11EntityToggles'),input=$('diskInput');
 if(!canvasStack||!browser||!left||!input)return;
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;canvas.id='p12SpriteCanvas';canvas.style.pointerEvents='none';canvasStack.appendChild(canvas);
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 const check=document.createElement('label');check.className='checkbox';check.title='Draw representative original sprite artwork at native code-derived positions. Pose/variant for each placed actor is not yet proved. Display only.';
 check.innerHTML='<input id="p12ShowArt" type="checkbox"> Native art previews';left.appendChild(check);
 browser.innerHTML='<div class="section-heading">STOCK SPRITES <span>289</span></div><div class="p12-controls"><select id="p12Family" title="Filter recovered original game sprite frames"></select></div><div id="p12SpriteGrid" class="p12-sprite-grid"></div><div id="p12SpriteSelected" class="p12-sprite-selected"></div>';
 const grid=$('p12SpriteGrid'),filter=$('p12Family'),preview=$('p12SpriteSelected');
 const categories=['Tiki','Actor $04','Actor $05','Actor $06','Actor $1F','Actor $20','All frames'];
 for(const name of categories){const option=document.createElement('option');option.value=name;option.textContent=name;filter.appendChild(option);}
 const cache=new Map();let selected=0,parsed=null,disk=null,loaded=false;
 function imageAt(i){
  if(cache.has(i))return cache.get(i);
  const img=new Image();img.decoding='async';img.src='assets/sprites/'+data.describe(i).filename;
  img.addEventListener('load',drawArt,{once:true});cache.set(i,img);return img;
 }
 function showSelection(i){
  selected=i;const m=data.describe(i),img=imageAt(i);
  preview.textContent='';const line=document.createElement('div');line.className='p12-sprite-detail';
  const big=document.createElement('img');big.src=img.src;big.alt='Native image $'+i.toString(16).toUpperCase();big.width=Math.min(m.width*3,192);big.height=Math.min(m.height*3,160);
  const info=document.createElement('span');info.textContent=`$${i.toString(16).toUpperCase()}  ${m.width}×${m.height} · anchor ${m.dx},${m.dy}`;
  const addr=document.createElement('small');addr.textContent=`Bitmap RAM $${m.bitmapRAM.toString(16).toUpperCase()} · descriptor $${m.descriptorRAM.toString(16).toUpperCase()}`;
  line.append(big,info,addr);preview.appendChild(line);
  for(const el of grid.children)el.classList.toggle('selected',Number(el.dataset.frame)===i);
 }
 function refreshGrid(){
  grid.replaceChildren();const kind=filter.value;
  const frames=kind==='All frames'?Array.from({length:data.FRAMES.length},(_,i)=>i):(data.FAMILIES[kind]||[]);
  const fragment=document.createDocumentFragment();
  for(const i of frames){
   const b=document.createElement('button');b.type='button';b.dataset.frame=String(i);b.className='p12-sprite-thumb';b.title=`Original sprite $${i.toString(16).toUpperCase()} · ${data.describe(i).width}×${data.describe(i).height} · browse only`;
   const img=document.createElement('img');img.src='assets/sprites/'+data.describe(i).filename;img.alt='';img.loading='lazy';const text=document.createElement('span');text.textContent='$'+i.toString(16).toUpperCase().padStart(2,'0');
   b.append(img,text);b.addEventListener('click',()=>showSelection(i));fragment.appendChild(b);
  }
  grid.appendChild(fragment);showSelection(frames.includes(selected)?selected:frames[0]||0);
 }
 function getLevel(){const i=Entities?.NAMES.indexOf(($('overviewLevel')?.textContent||'').trim());return i<0?0:i;}
 function heightOf(i){if(!disk||!root.NZS_STOCK)return 64;const off=root.NZS_STOCK.levels[i].offset-128;return disk[off+4]*256+disk[off+5];}
 function drawArt(){
  ctx.clearRect(0,0,1024,1024);
  if(!parsed||!loaded||!$('p12ShowArt').checked||!Entities)return;
  const i=getLevel(),hh=heightOf(i);
  for(const e of parsed.levels[i]){
   const frame=getFamilyFrame(e.type);if(frame===null)continue;
   const m=data.describe(frame),img=imageAt(frame);
   if(!img.complete||!img.naturalWidth)continue;
   // Representative species/family ONLY; individual record variant and pose not
   // yet proven. Apply ORIGINAL decoded hotspot, never rewrite disk placement.
   const x=Entities.canvasX(e,0)+m.dx,y=Entities.canvasY(e,hh,0)+m.dy;
   ctx.drawImage(img,x,y);
  }
 }
 const observer=new MutationObserver(drawArt);observer.observe($('overviewLevel'),{childList:true,subtree:true,characterData:true});
 $('p12ShowArt').addEventListener('change',drawArt);
 input.addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{const b=new Uint8Array(await file.arrayBuffer());const p=Entities.parseDisk(b);disk=b;parsed=p;loaded=true;drawArt();}
  catch(err){loaded=false;disk=null;parsed=null;drawArt();}
 },true);
 filter.addEventListener('change',refreshGrid);
 refreshGrid();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(typeof window!=='undefined'?window:globalThis);
