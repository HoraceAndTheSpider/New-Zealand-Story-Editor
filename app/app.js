(function(){
'use strict';
const Core=window.NZSCore,Graphics=window.NZSGraphics,Headers=window.NZSLevelHeaders,stock=window.NZS_STOCK;
if(!Core||!Graphics||!Headers||!stock){alert('Editor data is missing. Keep index.html and its app files together.');return;}
const $=id=>document.getElementById(id);
let atlasImages=stock.levels.map((l,i)=>{
 const img=new Image();img.onload=()=>{if(state.level===i){drawMap();drawTilePicker();drawPalette();drawMini();}};
 img.onerror=()=>{if(state.level===i)message('Built-in graphics preview unavailable');};
 img.src='assets/tiles/'+l.name+'.png';return img;
});
const mapCanvas=$('mapCanvas'),overlayCanvas=$('overlayCanvas'),ctx=mapCanvas.getContext('2d'),ox=overlayCanvas.getContext('2d'),mini=$('mini'),mc=mini.getContext('2d');
const tileGrid=$('tileGrid'),tg=tileGrid.getContext('2d'),tilePreview=$('tilePreview'),tp=tilePreview.getContext('2d');
[ctx,ox,mc,tg,tp].forEach(c=>c.imageSmoothingEnabled=false);
const initial=stock.mapsBase64.map(Core.fromBase64);
const state={level:0,maps:initial.map(m=>m.slice()),baseline:initial.map(m=>m.slice()),originalDisk:null,source:'preview',selected:0,tool:'pencil',zoom:1,grid:false,unknown:true,activeBounds:true,headerPoint:false,headers:Headers.STOCK_HEADERS,palettes:Graphics.BANK_OFFSETS.map(()=>Graphics.PALETTE),paletteWords:Graphics.BANK_OFFSETS.map(()=>Graphics.PALETTE_WORDS),hover:null,drag:null,undos:initial.map(()=>[]),redos:initial.map(()=>[]),dirty:new Set()};
const HEX=n=>'$'+(n>>>0).toString(16).toUpperCase().padStart(2,'0');
function message(t){$('message').textContent=t;clearTimeout(message.timeout);message.timeout=setTimeout(()=>$('message').textContent='',4400);}
function atlas(){return atlasImages[state.level];}
function level(){return stock.levels[state.level];}
function map(){return state.maps[state.level];}
function header(){return state.headers[state.level];}
function available(){const im=atlas();return !!im&&(im.naturalWidth||im.width)>0;}
function equal(a,b){if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true;}
function syncDirty(i=state.level){if(equal(state.maps[i],state.baseline[i]))state.dirty.delete(i);else state.dirty.add(i);refreshControls();}
function refreshControls(){
 $('sourceState').textContent=state.source==='disk'?'Disk.1 · native tiles':'Disk.1 · built-in preview';
 $('exportDisk').disabled=!state.originalDisk;
 $('undo').disabled=!state.undos[state.level].length;
 $('redo').disabled=!state.redos[state.level].length;
 $('dirtyFlag').hidden=!state.dirty.has(state.level);
 $('overviewLevel').textContent=level().name;
 $('mapName').textContent=`World ${state.level<17? (state.level<4?1:state.level<8?2:state.level<12?3:4):5} · Level ${level().name.replace('_', '-')}`;
 const stats=Core.mapStats(map(),level().tileCount),out=Headers.countOutsideActive(map(),header(),level().tileCount);
 $('mapInfo').textContent=`64 × ${header().height} active · ${stats.unique} tiles · ${out.active} absent graphics inside bounds`;
 $('mapInfo').title=`Stored grid 64 × 64; ${out.inactive} outside-bank references lie in unused rows. Header +$0E/$10: (${header().x},${header().y}), meaning unknown.`;
 document.querySelectorAll('.level-row').forEach((b,i)=>{b.classList.toggle('active',state.level===i);b.querySelector('.dirty').textContent=state.dirty.has(i)?'●':'';});
}
function createLevelList(){
 const host=$('levels');let currentWorld='';stock.levels.forEach((l,i)=>{
  const world=l.name.split('_')[0];if(world!==currentWorld){currentWorld=world;const h=document.createElement('div');h.className='world-label';h.textContent='World '+world;host.appendChild(h);}
  const b=document.createElement('button');b.type='button';b.className='level-row';b.innerHTML=`<span>${l.name.replace('_',' - ')}</span><span><span class="dirty"></span> <span class="level-index">${String(i+1).padStart(2,'0')}</span></span>`;
  b.title=`Open level ${l.name}`;b.addEventListener('click',()=>setLevel(i));host.appendChild(b);
 });
}
function paintUnknown(c,x,y,tile=0){
 c.fillStyle=state.unknown?'#35253a':'#171c24';c.fillRect(x,y,16,16);
 if(state.unknown){c.strokeStyle='#a16ca7';c.lineWidth=1;c.beginPath();c.moveTo(x,y+16);c.lineTo(x+16,y);c.stroke();}
}
function drawMap(){
 ctx.clearRect(0,0,1024,1024);const im=atlas(),cnt=level().tileCount,arr=map(),ok=available();
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const id=arr[Core.screenIndex(x,y)],dx=x*16,dy=y*16;
  if(id<cnt&&ok)ctx.drawImage(im,id%44*16,Math.floor(id/44)*16,16,16,dx,dy,16,16);
  else paintUnknown(ctx,dx,dy,id);
 }
 drawOverlay();drawMini();refreshControls();
}
function drawMini(){
 mc.clearRect(0,0,256,256);mc.drawImage(mapCanvas,0,0,256,256);
 if(state.activeBounds&&header().height<64){const line=(64-header().height)*4;mc.fillStyle='rgba(4,8,14,.80)';mc.fillRect(0,0,256,line);mc.strokeStyle='#70ded2';mc.beginPath();mc.moveTo(0,line+.5);mc.lineTo(256,line+.5);mc.stroke();}
 updateMiniFrame();
}
function drawPalette(){
 const host=$('palette');host.textContent='';const colours=state.palettes[level().bank],words=state.paletteWords[level().bank];
 $('paletteCount').textContent=colours.length+' colours';
 colours.forEach((c,i)=>{const p=document.createElement('span');p.title=`Indexed colour ${i}: native ${HEX(words[i])} (RGB4 display conversion provisional)`;p.style.background=c;host.appendChild(p);});
}
function drawTilePicker(){
 const img=atlas(),cnt=level().tileCount,ok=available(),cols=12,cell=24;
 tg.clearRect(0,0,288,528);tg.fillStyle='#121b25';tg.fillRect(0,0,288,528);
 for(let id=0;id<256;id++){
  const x=(id%cols)*cell,y=Math.floor(id/cols)*cell;
  if(id<cnt&&ok){tg.drawImage(img,id%44*16,Math.floor(id/44)*16,16,16,x+2,y+2,20,20);}
  else{tg.fillStyle='#2c2537';tg.fillRect(x+2,y+2,20,20);tg.strokeStyle='#66576f';tg.beginPath();tg.moveTo(x+2,y+22);tg.lineTo(x+22,y+2);tg.stroke();}
  if(state.selected===id){tg.strokeStyle='#b5ffed';tg.lineWidth=2;tg.strokeRect(x+1,y+1,22,22);}
 }
 $('atlasCount').textContent=cnt+'/256';
 $('selectedIndex').textContent=HEX(state.selected);
 $('tileNumber').textContent=state.selected.toString(16).toUpperCase().padStart(2,'0');
 $('tileAvailability').textContent=state.selected<cnt?'Disk.1 tile':'Outside native bank';
 tp.clearRect(0,0,80,80);
 if(state.selected<cnt&&ok)tp.drawImage(img,state.selected%44*16,Math.floor(state.selected/44)*16,16,16,0,0,80,80);
 else{tp.fillStyle='#33273b';tp.fillRect(0,0,80,80);tp.fillStyle='#b5a0b5';tp.textAlign='center';tp.font='11px monospace';tp.fillText('No native tile',40,44);}
}
function selectTile(id){state.selected=Math.max(0,Math.min(255,id|0));drawTilePicker();}
function setLevel(i){if(i<0||i>=stock.levels.length)return;state.level=i;state.hover=null;state.drag=null;
 drawMap();drawPalette();drawTilePicker();refreshControls();requestAnimationFrame(scrollToActive);}
function selectTool(t){state.tool=t;const names={pencil:'Pencil',fill:'Fill',pick:'Pick',line:'Line',rect:'Rectangle',rectfilled:'Filled rectangle'};
 $('toolName').textContent=names[t]||t;document.querySelectorAll('#tools button').forEach(b=>b.classList.toggle('selected',b.dataset.tool===t));drawOverlay();}
function pointerTile(ev){
 const rect=overlayCanvas.getBoundingClientRect();const px=(ev.clientX-rect.left)/rect.width*1024,py=(ev.clientY-rect.top)/rect.height*1024;
 return {x:Math.min(63,Math.max(0,Math.floor(px/16))),y:Math.min(63,Math.max(0,Math.floor(py/16)))};
}
function drawOverlay(){
 ox.clearRect(0,0,1024,1024);
 if(state.activeBounds&&header().height<64){const boundary=(64-header().height)*16;ox.fillStyle='rgba(3,8,14,.78)';ox.fillRect(0,0,1024,boundary);ox.strokeStyle='rgba(112,222,210,.85)';ox.lineWidth=2;ox.beginPath();ox.moveTo(0,boundary);ox.lineTo(1024,boundary);ox.stroke();}
 if(state.headerPoint){const h=header(),px=(h.x+.5)*16,py=(63-h.y+.5)*16;ox.beginPath();ox.arc(px,py,9,0,Math.PI*2);ox.fillStyle='rgba(235,193,91,.65)';ox.fill();ox.strokeStyle='#fff0b2';ox.lineWidth=2;ox.stroke();ox.fillStyle='#111821';ox.font='bold 11px sans-serif';ox.textAlign='center';ox.textBaseline='middle';ox.fillText('?',px,py+1);}
 if(state.grid){ox.beginPath();for(let i=0;i<=64;i++){ox.moveTo(i*16+.5,0);ox.lineTo(i*16+.5,1024);ox.moveTo(0,i*16+.5);ox.lineTo(1024,i*16+.5);}ox.strokeStyle='rgba(172,241,245,.24)';ox.lineWidth=1;ox.stroke();}
 if(state.drag&&state.drag.tool!=='pencil'&&state.drag.tool!=='fill'&&state.drag.tool!=='pick'&&state.drag.end){
  const d=state.drag;const points=shapePoints(d.tool,d.start,d.end);ox.fillStyle='rgba(103,236,201,.32)';for(const [x,y] of points)if(x>=0&&x<64&&y>=0&&y<64)ox.fillRect(x*16,y*16,16,16);
 }
 if(state.hover){ox.strokeStyle='#f8ec91';ox.lineWidth=2;ox.strokeRect(state.hover.x*16+1,state.hover.y*16+1,14,14);}
}
function shapePoints(tool,a,b){if(tool==='line')return Core.linePoints(a.x,a.y,b.x,b.y);if(tool==='rect'||tool==='rectfilled')return Core.rectanglePoints(a.x,a.y,b.x,b.y,tool==='rectfilled');return [];}
function beginEdit(){return map().slice();}
function commit(before){if(!equal(before,map())){const h=state.undos[state.level];h.push(before);if(h.length>80)h.shift();state.redos[state.level]=[];syncDirty();drawMap();}else refreshControls();}
function undo(){const h=state.undos[state.level];if(!h.length)return;state.redos[state.level].push(map().slice());state.maps[state.level]=h.pop();syncDirty();drawMap();}
function redo(){const h=state.redos[state.level];if(!h.length)return;state.undos[state.level].push(map().slice());state.maps[state.level]=h.pop();syncDirty();drawMap();}
function handleDown(ev){if(ev.button!==0&&ev.button!==2)return;ev.preventDefault();overlayCanvas.setPointerCapture(ev.pointerId);const p=pointerTile(ev);state.hover=p;
 if(ev.button===2||state.tool==='pick'){selectTile(map()[Core.screenIndex(p.x,p.y)]);drawOverlay();return;}
 if(state.tool==='fill'){const before=beginEdit();Core.floodFill(map(),p.x,p.y,state.selected);commit(before);return;}
 state.drag={tool:state.tool,start:p,end:p,last:p,before:beginEdit()};
 if(state.tool==='pencil'){Core.drawPoints(map(),[[p.x,p.y]],state.selected);drawMap();}else drawOverlay();
}
function handleMove(ev){const p=pointerTile(ev);state.hover=p;$('pointerInfo').textContent=`X ${p.x.toString().padStart(2,'0')} · Y ${(63-p.y).toString().padStart(2,'0')} · ${HEX(map()[Core.screenIndex(p.x,p.y)])}`;
 const d=state.drag;if(d){d.end=p;if(d.tool==='pencil'&&(d.last.x!==p.x||d.last.y!==p.y)){Core.drawPoints(map(),Core.linePoints(d.last.x,d.last.y,p.x,p.y),state.selected);drawMap();}d.last=p;}
 drawOverlay();
}
function handleUp(){const d=state.drag;if(!d)return;state.drag=null;
 if(d.tool!=='pencil')Core.drawPoints(map(),shapePoints(d.tool,d.start,d.end),state.selected);
 commit(d.before);drawOverlay();
}
function saveFile(filename,bytes,type='application/octet-stream'){const url=URL.createObjectURL(new Blob([bytes],{type}));const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
async function openDisk(file){if(!file)return;if(state.dirty.size&&!confirm('Discard unsaved edits and load a new Disk.1?'))return;
 try{const b=new Uint8Array(await file.arrayBuffer());const maps=Core.loadMaps(b,stock.levels);const headers=Headers.readAll(b,stock.levels);const banks=Graphics.BANK_OFFSETS.map((_,i)=>Graphics.decodeBank(b,i));const nativeAtlases=banks.map(Graphics.createAtlas);const nativePalettes=banks.map(Graphics.bankPalette);const paletteWords=banks.map(Graphics.bankPaletteWords);
  state.originalDisk=b;state.headers=headers;state.palettes=nativePalettes;state.paletteWords=paletteWords;atlasImages=stock.levels.map(l=>nativeAtlases[l.bank]);state.maps=maps;state.baseline=maps.map(m=>m.slice());state.source='disk';state.undos=maps.map(()=>[]);state.redos=maps.map(()=>[]);state.dirty.clear();setLevel(state.level);message('Disk.1 loaded');
 }catch(e){alert(e.message);}
}
async function importMap(file){if(!file)return;const b=new Uint8Array(await file.arrayBuffer());if(b.length!==4096){alert('A raw level map must be exactly 4,096 bytes.');return;}
 const before=beginEdit();state.maps[state.level]=b.slice();commit(before);message('Map imported');}
function renderExportDisk(){if(!state.originalDisk)return;try{const bytes=Core.exportDisk(state.originalDisk,stock.levels,state.maps);saveFile('Disk.1',bytes);message('Complete Disk.1 exported');}catch(e){alert(e.message);}}
function renderExportMap(){saveFile(`${level().name}.map.bin`,map());message('Raw map exported');}
function renderExportPNG(){mapCanvas.toBlob(b=>{if(b)saveFile(`${level().name}.png`,b,'image/png');else message('PNG export unavailable');},'image/png');}
function fitMap(){const v=$('viewport'),height=state.activeBounds?header().height:64;const z=Math.max(.2,Math.min(4,Math.min((v.clientWidth-36)/1024,(v.clientHeight-36)/(height*16))));const option=$('customZoom');option.hidden=false;option.value=String(z);option.textContent='Fit '+Math.round(z*100)+'%';$('zoom').value=option.value;setZoom(z);requestAnimationFrame(scrollToActive);}
function scrollToActive(){const v=$('viewport'),z=state.zoom,h=state.activeBounds?header().height:64;v.scrollLeft=512*z-v.clientWidth/2;v.scrollTop=(64-h/2)*16*z-v.clientHeight/2;updateMiniFrame();}
function setZoom(z){if(!Number.isFinite(z)||z<.2||z>4)return;
 const v=$('viewport'),oldRect=mapCanvas.getBoundingClientRect(),oldX=(v.scrollLeft+v.clientWidth/2)/Math.max(1,oldRect.width),oldY=(v.scrollTop+v.clientHeight/2)/Math.max(1,oldRect.height);
 state.zoom=z;const side=1024*z;$('canvasStack').style.width=side+'px';$('canvasStack').style.height=side+'px';requestAnimationFrame(()=>{v.scrollLeft=oldX*side-v.clientWidth/2;v.scrollTop=oldY*side-v.clientHeight/2;updateMiniFrame();});}
function updateMiniFrame(){const v=$('viewport'),cr=mapCanvas.getBoundingClientRect(),vr=v.getBoundingClientRect();const sx=Math.max(0,(vr.left-cr.left)/Math.max(cr.width,1)),sy=Math.max(0,(vr.top-cr.top)/Math.max(cr.height,1));
 const w=Math.min(1-sx,vr.width/Math.max(cr.width,1)),h=Math.min(1-sy,vr.height/Math.max(cr.height,1));const el=$('miniFrame');el.style.left=(sx*100)+'%';el.style.top=(sy*100)+'%';el.style.width=(Math.max(0,w)*100)+'%';el.style.height=(Math.max(0,h)*100)+'%';}
function zoomStep(dir){const options=[.5,.75,1,1.5,2,3,4],i=options.findIndex(v=>v>=state.zoom-.001);const n=options[Math.max(0,Math.min(options.length-1,i+dir))];$('zoom').value=String(n);setZoom(n);}
function bind(){
 $('openDisk').onclick=()=>$('diskInput').click();$('importMap').onclick=()=>$('mapInput').click();$('diskInput').onchange=e=>{openDisk(e.target.files[0]);e.target.value='';};$('mapInput').onchange=e=>{importMap(e.target.files[0]);e.target.value='';};
 $('exportDisk').onclick=renderExportDisk;$('exportMap').onclick=renderExportMap;$('exportPNG').onclick=renderExportPNG;
 $('revertLevel').onclick=()=>{if(!equal(map(),state.baseline[state.level])){const old=beginEdit();state.maps[state.level]=state.baseline[state.level].slice();commit(old);message('Level restored');}};
 $('undo').onclick=undo;$('redo').onclick=redo;$('zoom').onchange=e=>setZoom(Number(e.target.value));$('fit').onclick=fitMap;
 $('toggleActive').onchange=e=>{state.activeBounds=e.target.checked;drawOverlay();drawMini();requestAnimationFrame(scrollToActive);};$('toggleHeaderPoint').onchange=e=>{state.headerPoint=e.target.checked;drawOverlay();};
 $('toggleGrid').onchange=e=>{state.grid=e.target.checked;drawOverlay();};$('toggleMissing').onchange=e=>{state.unknown=e.target.checked;drawMap();};
 document.querySelectorAll('#tools button').forEach(b=>b.onclick=()=>selectTool(b.dataset.tool));
 tileGrid.addEventListener('click',ev=>{const r=tileGrid.getBoundingClientRect(),col=Math.floor((ev.clientX-r.left)/r.width*288/24),row=Math.floor((ev.clientY-r.top)/r.height*528/24);const n=row*12+col;if(col>=0&&col<12&&n<256)selectTile(n);});
 tileGrid.addEventListener('mousemove',ev=>{const r=tileGrid.getBoundingClientRect(),col=Math.floor((ev.clientX-r.left)/r.width*288/24),row=Math.floor((ev.clientY-r.top)/r.height*528/24);const n=row*12+col;tileGrid.title=n<256?`Tile ${HEX(n)} (${n<level().tileCount?'native graphics':'outside tile bank'})`:'';});
 mini.addEventListener('click',ev=>{const mr=mini.getBoundingClientRect(),x=(ev.clientX-mr.left)/mr.width*1024,y=(ev.clientY-mr.top)/mr.height*1024,v=$('viewport');v.scrollLeft=x*state.zoom-v.clientWidth/2;v.scrollTop=y*state.zoom-v.clientHeight/2;updateMiniFrame();});
 $('viewport').addEventListener('scroll',updateMiniFrame);window.addEventListener('resize',updateMiniFrame);
 overlayCanvas.addEventListener('pointerdown',handleDown);overlayCanvas.addEventListener('pointermove',handleMove);
 overlayCanvas.addEventListener('pointerup',handleUp);overlayCanvas.addEventListener('pointercancel',()=>{if(state.drag){state.maps[state.level]=state.drag.before;state.drag=null;drawMap();}});
 overlayCanvas.addEventListener('pointerleave',()=>{if(!state.drag){state.hover=null;$('pointerInfo').textContent='X — · Y —';drawOverlay();}});
 overlayCanvas.addEventListener('contextmenu',e=>e.preventDefault());
 window.addEventListener('keydown',e=>{
  if(e.target.closest('input,select,textarea,[contenteditable]'))return;
  const mod=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
  if(mod&&k==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
  if(mod&&k==='y'){e.preventDefault();redo();return;}
  if(mod&&(k==='+'||k==='='||k==='-')){e.preventDefault();zoomStep(k==='-'?-1:1);return;}
  if(mod||e.altKey)return;
  if(k==='u')undo();else if(k==='r')redo();else if(k==='g'){$('toggleGrid').click();}else if(k==='p')selectTool('pencil');else if(k==='f')selectTool('fill');else if(k==='i')selectTool('pick');else if(k==='l')selectTool('line');else if(k==='b')selectTool(e.shiftKey?'rectfilled':'rect');
 });
}
createLevelList();bind();setLevel(0);drawTilePicker();requestAnimationFrame(fitMap);
})();
