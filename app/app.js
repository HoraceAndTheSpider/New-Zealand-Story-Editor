/* P16/P13 disk-only main app. Replaces the P03 baked-map/PNG preview logic.
 * Nothing is drawn, imported or exported until an original Disk.1 is opened.
 * All scenery tiles, maps and palette colours are decoded from that disk.
 * Existing map editor operations and immutable-range export are retained.
 */
(function(){'use strict';
const Core=window.NZSCore,Graphics=window.NZSGraphics,Headers=window.NZSLevelHeaders,stock=window.NZS_STOCK;
if(!Core||!Graphics||!Headers||!stock){alert('Editor scripts missing. Keep all supplied app files together.');return;}
const $=id=>document.getElementById(id);
const mapCanvas=$('mapCanvas'),overlay=$('overlayCanvas'),ctx=mapCanvas.getContext('2d'),ox=overlay.getContext('2d'),mini=$('mini'),mc=mini.getContext('2d'),tileGrid=$('tileGrid'),tg=tileGrid.getContext('2d'),tilePreview=$('tilePreview'),tp=tilePreview.getContext('2d');
for(const c of [ctx,ox,mc,tg,tp])c.imageSmoothingEnabled=false;
const names=stock.levels.map(x=>x.name);
const state={disk:null,level:0,maps:null,baseline:null,header:null,atlases:null,palettes:null,paletteWords:null,dirty:new Set(),undo:[],redo:[],tool:'pencil',selected:0,zoom:1,grid:false,active:true,unknown:true,headerPoint:false,hover:null,drag:null};
const hx=n=>'$'+n.toString(16).toUpperCase().padStart(2,'0');
function loaded(){return !!state.disk;}function lv(){return stock.levels[state.level];}function map(){return state.maps?.[state.level]||null;}function head(){return state.header?.[state.level]||Headers.STOCK_HEADERS[state.level];}
function msg(t){$('message').textContent=t;clearTimeout(msg.timer);msg.timer=setTimeout(()=>$('message').textContent='',4500);}
function same(a,b){if(!a||!b||a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true;}
function nav(){const el=$('levels');el.replaceChildren();let world='';stock.levels.forEach((l,i)=>{
 const w=l.name.split('_')[0];if(w!==world){world=w;const a=document.createElement('div');a.className='world-label';a.textContent='World '+w;el.appendChild(a);}
 const b=document.createElement('button');b.type='button';b.className='level-row';b.title='Open level '+l.name;b.innerHTML=`<span>${l.name.replace('_',' - ')}</span><span><span class="dirty"></span> <span class="level-index">${String(i+1).padStart(2,'0')}</span></span>`;b.addEventListener('click',()=>setLevel(i));el.appendChild(b);
 });}
function refresh(){const l=lv(),h=head(),m=map();$('sourceState').textContent=loaded()?'Disk.1 · decoded graphics':'OPEN Disk.1';$('exportDisk').disabled=!loaded();$('importMap').disabled=!loaded();$('exportMap').disabled=!loaded();$('exportPNG').disabled=!loaded();$('revertLevel').disabled=!loaded();$('undo').disabled=!loaded()||!(state.undo[state.level]?.length);$('redo').disabled=!loaded()||!(state.redo[state.level]?.length);
 $('dirtyFlag').hidden=!state.dirty.has(state.level);$('overviewLevel').textContent=l.name;$('mapName').textContent=`World ${l.name.split('_')[0]} · ${l.name.replace('_','-')}`;
 if(loaded()){const stats=Core.mapStats(m,l.tileCount),out=Headers.countOutsideActive(m,h,l.tileCount);$('mapInfo').textContent=`64 × ${h.height} active · ${stats.unique} tiles · ${out.active} outside bank`;}
 else $('mapInfo').textContent='Open original Disk.1 · nothing cached';
 document.querySelectorAll('.level-row').forEach((b,i)=>{b.classList.toggle('active',i===state.level);b.querySelector('.dirty').textContent=state.dirty.has(i)?'●':'';});
}
function unknown(x,y){ctx.fillStyle='#181d29';ctx.fillRect(x,y,16,16);if(state.unknown){ctx.strokeStyle='#6a526c';ctx.beginPath();ctx.moveTo(x,y+16);ctx.lineTo(x+16,y);ctx.stroke();}}
function drawMap(){ctx.clearRect(0,0,1024,1024);if(loaded()){
 const im=state.atlases[lv().bank],m=map(),cnt=lv().tileCount;
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const id=m[Core.screenIndex(x,y)],dx=x*16,dy=y*16;
  if(id<cnt)ctx.drawImage(im,id%44*16,Math.floor(id/44)*16,16,16,dx,dy,16,16);else unknown(dx,dy);
 }
 }else{ctx.fillStyle='#111821';ctx.fillRect(0,0,1024,1024);ctx.font='bold 26px system-ui';ctx.fillStyle='#86afba';ctx.textAlign='center';ctx.fillText('Open Disk.1 to view maps and graphics',512,515);}
 drawOverlay();drawMini();refresh();}
function drawMini(){mc.clearRect(0,0,256,256);if(loaded())mc.drawImage(mapCanvas,0,0,256,256);updateMini();}
function drawOverlay(){ox.clearRect(0,0,1024,1024);if(!loaded())return;const h=head();
 if(state.active&&h.height<64){const top=(64-h.height)*16;ox.fillStyle='rgba(3,8,14,.78)';ox.fillRect(0,0,1024,top);ox.strokeStyle='#70ded2';ox.lineWidth=2;ox.beginPath();ox.moveTo(0,top);ox.lineTo(1024,top);ox.stroke();}
 if(state.headerPoint){const x=(h.x+.5)*16,y=(63-h.y+.5)*16;ox.beginPath();ox.arc(x,y,9,0,Math.PI*2);ox.fillStyle='#D0A13A';ox.fill();ox.fillStyle='#111821';ox.font='bold 11px sans-serif';ox.textAlign='center';ox.textBaseline='middle';ox.fillText('?',x,y);}
 if(state.grid){ox.strokeStyle='rgba(172,241,245,.24)';ox.lineWidth=1;ox.beginPath();for(let i=0;i<=64;i++){ox.moveTo(i*16+.5,0);ox.lineTo(i*16+.5,1024);ox.moveTo(0,i*16+.5);ox.lineTo(1024,i*16+.5);}ox.stroke();}
 if(state.drag&&!['pencil','fill','pick'].includes(state.drag.tool)){ox.fillStyle='rgba(103,236,201,.28)';for(const [x,y] of shape(state.drag.tool,state.drag.start,state.drag.end))if(x>=0&&x<64&&y>=0&&y<64)ox.fillRect(x*16,y*16,16,16);}
 if(state.hover){ox.strokeStyle='#f8ec91';ox.lineWidth=2;ox.strokeRect(state.hover.x*16+1,state.hover.y*16+1,14,14);}
}
function drawPalette(){const host=$('palette');host.replaceChildren();if(!loaded()){$('paletteCount').textContent='—';return;}const words=state.paletteWords[lv().bank],col=state.palettes[lv().bank];$('paletteCount').textContent=col.length+' colours';col.forEach((c,i)=>{const s=document.createElement('span');s.title=`Native colour ${i} · ${hx(words[i])}`;s.style.background=c;host.appendChild(s);});}
function tilePicker(){tg.clearRect(0,0,288,528);tp.clearRect(0,0,80,80);tg.fillStyle='#121b25';tg.fillRect(0,0,288,528);
 if(!loaded()){$('atlasCount').textContent='—';$('tileNumber').textContent='—';$('tileAvailability').textContent='Open Disk.1';window.NZSTilePropertiesUI?.update(state.level,state.selected);return;}
 const im=state.atlases[lv().bank],cnt=lv().tileCount;
 for(let id=0;id<256;id++){const x=(id%12)*24,y=Math.floor(id/12)*24;
  if(id<cnt)tg.drawImage(im,(id%44)*16,Math.floor(id/44)*16,16,16,x+2,y+2,20,20);
  else{tg.fillStyle='#302539';tg.fillRect(x+2,y+2,20,20);}
  if(id===state.selected){tg.strokeStyle='#b5ffed';tg.lineWidth=2;tg.strokeRect(x+1,y+1,22,22);}
 }
 $('atlasCount').textContent=cnt+'/256';$('selectedIndex').textContent=hx(state.selected);$('tileNumber').textContent=state.selected.toString(16).toUpperCase().padStart(2,'0');$('tileAvailability').textContent=state.selected<cnt?'Original Disk.1 tile':'Outside tile bank';if(state.selected<cnt)tp.drawImage(im,(state.selected%44)*16,Math.floor(state.selected/44)*16,16,16,0,0,80,80);window.NZSTilePropertiesUI?.update(state.level,state.selected);
}
function setLevel(i){if(i<0||i>=stock.levels.length)return;state.level=i;state.hover=null;state.drag=null;drawMap();drawPalette();tilePicker();requestAnimationFrame(scrollActive);}
function setTool(t){state.tool=t;$('toolName').textContent={pencil:'Pencil',fill:'Fill',pick:'Pick',line:'Line',rect:'Rectangle',rectfilled:'Filled rectangle'}[t]||t;document.querySelectorAll('#tools button').forEach(b=>b.classList.toggle('selected',b.dataset.tool===t));drawOverlay();}
function xy(ev){const box=overlay.getBoundingClientRect();return {x:Math.max(0,Math.min(63,Math.floor((ev.clientX-box.left)/box.width*64))),y:Math.max(0,Math.min(63,Math.floor((ev.clientY-box.top)/box.height*64)))}};
function shape(t,a,b){if(t==='line')return Core.linePoints(a.x,a.y,b.x,b.y);if(t==='rect'||t==='rectfilled')return Core.rectanglePoints(a.x,a.y,b.x,b.y,t==='rectfilled');return [];}
function commit(before){if(!same(before,map())){state.undo[state.level].push(before);if(state.undo[state.level].length>80)state.undo[state.level].shift();state.redo[state.level]=[];syncDirty();drawMap();}else refresh();}
function syncDirty(){if(same(state.baseline[state.level],map()))state.dirty.delete(state.level);else state.dirty.add(state.level);refresh();}
function undo(){if(!loaded())return;const h=state.undo[state.level];if(!h.length)return;state.redo[state.level].push(map().slice());state.maps[state.level]=h.pop();syncDirty();drawMap();}
function redo(){if(!loaded())return;const h=state.redo[state.level];if(!h.length)return;state.undo[state.level].push(map().slice());state.maps[state.level]=h.pop();syncDirty();drawMap();}
function down(e){if(!loaded()||(e.button!==0&&e.button!==2))return;e.preventDefault();const p=xy(e);overlay.setPointerCapture(e.pointerId);state.hover=p;
 if(e.button===2||state.tool==='pick'){state.selected=map()[Core.screenIndex(p.x,p.y)];tilePicker();drawOverlay();return;}
 if(state.tool==='fill'){const before=map().slice();Core.floodFill(map(),p.x,p.y,state.selected);commit(before);return;}
 state.drag={tool:state.tool,start:p,end:p,last:p,before:map().slice()};if(state.tool==='pencil'){Core.drawPoints(map(),[[p.x,p.y]],state.selected);drawMap();}else drawOverlay();}
function move(e){if(!loaded())return;const p=xy(e);state.hover=p;$('pointerInfo').textContent=`X ${p.x} · Y ${63-p.y} · ${hx(map()[Core.screenIndex(p.x,p.y)])}`;
 const d=state.drag;if(d){d.end=p;if(d.tool==='pencil'&&(p.x!==d.last.x||p.y!==d.last.y)){Core.drawPoints(map(),Core.linePoints(d.last.x,d.last.y,p.x,p.y),state.selected);drawMap();}d.last=p;}drawOverlay();}
function up(){const d=state.drag;if(!d)return;state.drag=null;if(d.tool!=='pencil')Core.drawPoints(map(),shape(d.tool,d.start,d.end),state.selected);commit(d.before);drawOverlay();}
function save(name,bytes,type='application/octet-stream'){const url=URL.createObjectURL(new Blob([bytes],{type}));const a=document.createElement('a');a.download=name;a.href=url;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
async function loadDisk(f){if(!f)return;if(state.dirty.size&&!confirm('Discard unsaved map changes?'))return;try{
 const disk=new Uint8Array(await f.arrayBuffer());const maps=Core.loadMaps(disk,stock.levels),headers=Headers.readAll(disk,stock.levels),banks=Graphics.BANK_OFFSETS.map((_,i)=>Graphics.decodeBank(disk,i)),atlases=banks.map(Graphics.createAtlas),palette=banks.map(Graphics.bankPalette),words=banks.map(Graphics.bankPaletteWords);
 // Verify original moving graphics as part of atomic import: no partial load.
 if(window.NZSSpriteDisk)window.NZSSpriteDisk.decode(disk);
 const tileProperties=window.NZSTileProperties?.decode(disk);if(window.NZSNativeGenerators)window.NZSNativeGenerators.decode(disk);
 if(tileProperties)window.NZSTilePropertiesUI?.setDecoded(tileProperties);
 state.disk=disk;state.maps=maps;state.baseline=maps.map(m=>m.slice());state.header=headers;state.atlases=atlases;state.palettes=palette;state.paletteWords=words;state.undo=maps.map(()=>[]);state.redo=maps.map(()=>[]);state.dirty.clear();setLevel(state.level);msg('Disk.1 loaded · all graphics generated from source');
 }catch(err){alert('Disk load failed: '+err.message);}}
async function importMap(f){if(!loaded()||!f)return;const b=new Uint8Array(await f.arrayBuffer());if(b.length!==4096){alert('Raw maps must contain 4,096 bytes.');return;}const before=map().slice();state.maps[state.level]=b.slice();commit(before);msg('Map imported');}
function zoom(z){if(!Number.isFinite(z)||z<.2||z>4)return;const v=$('viewport'),old=state.zoom,centerX=(v.scrollLeft+v.clientWidth/2)/old,centerY=(v.scrollTop+v.clientHeight/2)/old;state.zoom=z;const side=1024*z;$('canvasStack').style.width=side+'px';$('canvasStack').style.height=side+'px';requestAnimationFrame(()=>{v.scrollLeft=centerX*z-v.clientWidth/2;v.scrollTop=centerY*z-v.clientHeight/2;updateMini();});}
function scrollActive(){const v=$('viewport'),z=state.zoom,height=state.active?head().height:64;v.scrollLeft=512*z-v.clientWidth/2;v.scrollTop=(64-height/2)*16*z-v.clientHeight/2;updateMini();}
function fit(){const v=$('viewport'),height=state.active?head().height:64,z=Math.max(.2,Math.min(4,Math.min((v.clientWidth-36)/1024,(v.clientHeight-36)/(height*16))));const option=$('customZoom');option.hidden=false;option.value=String(z);option.textContent='Fit '+Math.round(z*100)+'%';$('zoom').value=String(z);zoom(z);requestAnimationFrame(scrollActive);}
function updateMini(){const v=$('viewport'),r=mapCanvas.getBoundingClientRect(),vr=v.getBoundingClientRect(),sx=Math.max(0,(vr.left-r.left)/Math.max(1,r.width)),sy=Math.max(0,(vr.top-r.top)/Math.max(1,r.height)),w=Math.min(1-sx,vr.width/Math.max(1,r.width)),h=Math.min(1-sy,vr.height/Math.max(1,r.height)),f=$('miniFrame');f.style.left=sx*100+'%';f.style.top=sy*100+'%';f.style.width=Math.max(0,w)*100+'%';f.style.height=Math.max(0,h)*100+'%';}
function bind(){
 $('openDisk').onclick=()=>$('diskInput').click();$('importMap').onclick=()=>$('mapInput').click();$('diskInput').onchange=e=>{loadDisk(e.target.files?.[0]);e.target.value='';};$('mapInput').onchange=e=>{importMap(e.target.files?.[0]);e.target.value='';};
 $('exportDisk').onclick=()=>{if(!loaded())return;try{save('Disk.1',Core.exportDisk(state.disk,stock.levels,state.maps));msg('Disk.1 exported (map cells only)');}catch(e){alert(e.message);}};
 $('exportMap').onclick=()=>{if(loaded())save(lv().name+'.map.bin',map());};$('exportPNG').onclick=()=>{if(!loaded())return;mapCanvas.toBlob(b=>{if(b)save(lv().name+'.png',b,'image/png');},'image/png');};
 $('revertLevel').onclick=()=>{if(!loaded())return;const before=map().slice();state.maps[state.level]=state.baseline[state.level].slice();commit(before);};$('undo').onclick=undo;$('redo').onclick=redo;
 $('zoom').onchange=e=>zoom(Number(e.target.value));$('fit').onclick=fit;
 $('toggleActive').onchange=e=>{state.active=e.target.checked;drawOverlay();drawMini();requestAnimationFrame(scrollActive);};$('toggleHeaderPoint').onchange=e=>{state.headerPoint=e.target.checked;drawOverlay();};$('toggleGrid').onchange=e=>{state.grid=e.target.checked;drawOverlay();};$('toggleMissing').onchange=e=>{state.unknown=e.target.checked;drawMap();};
 document.querySelectorAll('#tools button').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
 tileGrid.onclick=e=>{if(!loaded())return;const b=tileGrid.getBoundingClientRect(),col=Math.floor((e.clientX-b.left)/b.width*288/24),row=Math.floor((e.clientY-b.top)/b.height*528/24),id=row*12+col;if(col>=0&&col<12&&id>=0&&id<256){state.selected=id;tilePicker();}};
 mini.onclick=e=>{if(!loaded())return;const r=mini.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*1024,y=(e.clientY-r.top)/r.height*1024,v=$('viewport');v.scrollLeft=x*state.zoom-v.clientWidth/2;v.scrollTop=y*state.zoom-v.clientHeight/2;updateMini();};
 $('viewport').onscroll=updateMini;window.addEventListener('resize',updateMini);overlay.addEventListener('pointerdown',down);overlay.addEventListener('pointermove',move);overlay.addEventListener('pointerup',up);overlay.addEventListener('pointercancel',()=>{if(state.drag){state.maps[state.level]=state.drag.before;state.drag=null;drawMap();}});overlay.addEventListener('pointerleave',()=>{if(!state.drag){state.hover=null;drawOverlay();}});overlay.oncontextmenu=e=>e.preventDefault();
 window.addEventListener('keydown',e=>{if(!loaded()||e.target.closest('input,select,textarea,[contenteditable]'))return;const k=e.key.toLowerCase(),mod=e.ctrlKey||e.metaKey;
  if(mod&&k==='z'){e.preventDefault();e.shiftKey?redo():undo();}else if(mod&&k==='y'){e.preventDefault();redo();}else if(mod||e.altKey)return;
  else if(k==='u')undo();else if(k==='r')redo();else if(k==='g')$('toggleGrid').click();else if(k==='p')setTool('pencil');else if(k==='f')setTool('fill');else if(k==='i')setTool('pick');else if(k==='l')setTool('line');else if(k==='b')setTool(e.shiftKey?'rectfilled':'rect');
 });
}
nav();bind();setLevel(0);requestAnimationFrame(fit);
})();
