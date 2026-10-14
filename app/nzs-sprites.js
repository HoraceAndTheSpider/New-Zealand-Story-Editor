/* P17 — source-backed animation gallery, read-only sprite overlays, and
 * per-placement pose review. No images/map content or sprite tables bundled.
 * All displayed pixels, records and animation words come from selected Disk.1.
 * A selected pose is an observational note, NOT a native runtime assertion.
 */
(function(root){'use strict';
const Loader=root.NZSSpriteDisk,Entities=root.NZSEntities,Anim=root.NZSAnimations,Generators=root.NZSNativeGenerators,Resolver=root.NZSFrameResolver||(typeof module==='object'&&module.exports?require('./nzs-native-frame-resolver.js'):null);
const h=n=>'$'+n.toString(16).toUpperCase().padStart(3,'0');
const hw=n=>'$'+n.toString(16).toUpperCase().padStart(5,'0');
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
 // Classification labels are original-code references + user observation only.
 // No bitmap data is embedded; everything below is a set of index labels.
 // Curated visual groupings reflect owner identification, NOT modifications to
 // native actor scripts. Script $03 really references $A6, $A5, etc.; that
 // source record stays available below as a separate raw-code grouping.
 const OWNER_GROUPS=[
  ['owner-03','Generator · native door images $A0–$A5',range(0xA0,0xA5)],
  ['owner-04','Type $04 · movement $6E–$70',range(0x6E,0x70)],
  ['owner-04-fire','Type $04 · firing $71–$72',range(0x71,0x72)],
  ['owner-04-death','Type $04 · death $73–$74',range(0x73,0x74)],
  ['owner-04-effect','Type $04 · weapon / effect $75–$77',range(0x75,0x77)],
  ['owner-05-all','Type $05 · complete reviewed sequence $78–$80',range(0x78,0x80)],
  ['owner-05','Type $05 · movement $78–$7C',range(0x78,0x7C)],
  ['owner-05-death','Type $05 · death / explosion $7D–$7E',range(0x7D,0x7E)],
  ['owner-05-fire','Type $05 · fired projectiles $7F–$80',range(0x7F,0x80)],
  ['owner-06','Type $06 · character / action $81–$8A',range(0x81,0x8A)],
  ['native-06-child','Type $06 · secondary images $8B–$8E',range(0x8B,0x8E)],
  ['rider-transport','Rider / bird · separate original actors $3F,$40,$5D',[0x3F,0x40,0x5D]]
 ];
 const itemImages=range(0xAF,0xC8);
 const letterImages=range(0xC9,0xCE);
 const BASE_GROUPS=[
  ['all','All graphics · 289',null],
  ['player','Tiki · idle $000 / source animation $001…',range(0x00,0x27)],
  ['warp','Warp · 2-frame animation $028/$029',[0x28,0x29]],
  ['kiwi','Kiwi · caged $0D9 / later frames',range(0xD9,0xDC)],
  ['items','Collectibles · native item images $AF–$C8',itemImages],
  ['letters','Collectibles · script-linked bonus $C9–$CE',letterImages],
  ['unlinked','Other images (not in first linear script segments)',null]
 ];
let currentAnalysis=null,currentDecoded=null,currentGenerators=null,currentGeneratorPhases=null;
const api={
 get groups(){return BASE_GROUPS.concat(OWNER_GROUPS);},
 decode(disk){Resolver.validate(disk);Resolver.validateGeneratorCommand(disk);currentAnalysis=Anim.decodeAll(disk);currentAnalysis.collectibleSlots=Anim.collectibleSlots(disk);currentDecoded=Loader.decode(disk);currentGenerators=Generators?.decode(disk)||null;currentGeneratorPhases=Resolver.generatorPhases(currentAnalysis[3].tokens);return {analysis:currentAnalysis,decoded:currentDecoded,generators:currentGenerators};},
 reset(){currentAnalysis=null;currentDecoded=null;currentGenerators=null;currentGeneratorPhases=null;},
 get generatorPhases(){return currentGeneratorPhases;},
 get generators(){return currentGenerators;},
 hasArtwork(type,record){if(!currentDecoded||!currentAnalysis)return false;
  if(type===3)return !!currentGeneratorPhases?.open.length;
  return type===31||type===32||type===1||type===2||type===0||currentAnalysis[type]?.uniqueFrames?.length>0;
 },
 associatedFrame(record){
  if(!record)return null;
  // Native $03 draws its own opening/closing door graphics, NOT its first spawned enemy.
  if(record.type===3)return currentGeneratorPhases?.open[0]??null;
  // Source-backed table values, but parameter -> image identity remains UNPROVED.
  // Owner-confirmed art: $D9 is the caged kiwi; $DA onward is rescue/end animation.
  // Native $01/$02 script starts at $DA, which draws bitmap $D9.
  if(record.type===0)return Resolver.toBitmap(currentAnalysis?.[0]?.uniqueFrames?.[0])??0;
  if(record.type===1||record.type===2)return Resolver.toBitmap(currentAnalysis?.[record.type]?.uniqueFrames?.[0])??null;
  if(record.type===31){const slot=record.parameter&0x3F;const a=currentAnalysis?.collectibleSlots;
   return slot<=16&&a?Resolver.toBitmap(a[slot]):null;}
  if(record.type===32){const a=currentAnalysis?.[32]?.uniqueFrames;return record.parameter<=5?Resolver.toBitmap(a?.[record.parameter]):null;}
  return Resolver.toBitmap(currentAnalysis?.[record.type]?.uniqueFrames?.[0])??(Anim.OWNER_LEADING[record.type]??null);
 },
 getSourceFrameCandidates(type){if(type===3)return currentGeneratorPhases?[...new Set([...currentGeneratorPhases.open,...currentGeneratorPhases.close])]:[];if(type===0)return Resolver.bitmapFrames(currentAnalysis?.[0]?.uniqueFrames);if(type===31)return Resolver.bitmapFrames(currentAnalysis?.collectibleSlots);return Resolver.bitmapFrames(currentAnalysis?.[type]?.uniqueFrames);},
 getNativeFrameReferences(type){return currentAnalysis?.[type]?.bounded?.uniqueFrames||currentAnalysis?.[type]?.uniqueFrames||[];},
 resolveBitmap:Resolver.toBitmap,
 hasWarpArtwork(){return !!currentDecoded&&!!root.document?.getElementById('p12ShowArt')?.checked&&!!root.document?.getElementById('p17WarpArt')?.checked;}

};
root.NZSSprites=api;if(typeof module==='object'&&module.exports)module.exports=api;
if(typeof document==='undefined'||!Loader||!Entities||!Anim)return;
const $=id=>document.getElementById(id);
function init(){
 const stack=$('canvasStack'),panel=$('p12SpriteBrowser'),input=$('diskInput'),left=$('p11EntityToggles'),overlay=$('overlayCanvas');
 if(!stack||!panel||!input||!left||!overlay)return;
 const canvas=document.createElement('canvas');canvas.id='p12SpriteCanvas';canvas.width=canvas.height=1024;canvas.style.pointerEvents='none';stack.appendChild(canvas);
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 const toggle=document.createElement('label');toggle.className='checkbox';toggle.title='Native Disk.1 artwork. Per-placement pose is provisional; choose exact frame for non-exportable review.';
 toggle.innerHTML='<input id="p12ShowArt" type="checkbox" checked> Original graphics on map';left.appendChild(toggle);
 const warpToggle=document.createElement('label');warpToggle.className='checkbox';
 warpToggle.title='Show authentic $28/$29 original two-frame warp artwork on outgoing warp source locations. Hotspot/trigger alignment is provisional.';
 warpToggle.innerHTML='<input id="p17WarpArt" type="checkbox" checked> Animated warp artwork';left.appendChild(warpToggle);
 const transport=document.createElement('label');transport.className='checkbox';
 transport.title='Experimental: pair source-linked type $11 rider artwork with the separate $5D bird bitmap. Native type $2B selects $5D; the game-code link between $11 and $2B and exact relative position are NOT established. Does not alter Disk.1.';
 transport.innerHTML='<input id="p18TransportFrame" type="checkbox" checked> Show candidate flying transports';left.appendChild(transport);
 const generated=document.createElement('label');generated.className='p20-chain-control';
 generated.title='Animate source-listed child requests on their parent generator. This is an illustrative sequence, NOT verified spawn timing or child positions.';
 generated.innerHTML='<span>Generator enemies</span> <select id="p20ChildMode" aria-label="Generator enemy overlay"><option value="off">Off</option><option value="cycle">Cycle requests</option><option value="selected">Selected request</option></select>';
 left.appendChild(generated);
 const calibration=document.createElement('div');calibration.className='p19-calibration';
 calibration.innerHTML='<label title="Display-only artwork X nudge; native entity markers never move">Art X <select id="p19ArtX"><option value="0">0</option><option value="4" selected>+4</option><option value="8">+8</option><option value="-4">−4</option><option value="-8">−8</option></select></label>'+ 
  '<label title="Display-only artwork Y nudge; native entity markers never move">Y <select id="p19ArtY"><option value="0" selected>0</option><option value="4">+4</option><option value="8">+8</option><option value="-4">−4</option><option value="-8">−8</option></select></label>';
 left.appendChild(calibration);
 panel.innerHTML='<div class="section-heading">ORIGINAL GRAPHICS <span id="p12Total">OPEN DISK</span></div>'+
  '<div class="p12-controls"><select id="p12Family" aria-label="Original image/animation family" disabled></select></div>'+
  '<details id="p19Technical" class="p19-technical"><summary>Frame evidence</summary><div id="p14SourceEvidence" class="p14-note">Select Disk.1</div><div id="p15FrameUsage" class="p14-note"></div></details>'+
  '<div id="p12SpriteGrid" class="p12-sprite-grid"></div><div id="p12SpriteSelected" class="p12-sprite-selected"></div>'+
  '<div id="p19GeneratorReview" class="p19-generator-review" hidden></div>'+
  '<div id="p14EntityPose" class="p14-entity-pose"><div class="section-heading compact">FRAME REVIEW</div>'+
  '<div id="p14InstanceInfo" class="p14-note">Use “Inspect entities”, then click a visible placement to investigate its artwork.</div>'+
  '<div class="p12-ghost-actions"><button id="p14Assign" disabled title="Draw the highlighted frame at the selected original placement, in the browser only">Preview selected frame</button>'+
  '<button id="p14Restore" disabled>Restore candidate</button></div>'+
  '<div class="p12-ghost-actions"><button id="p21Companion" disabled title="Preview selected gallery image as a separate layer under this entity or selected generator child; view-only">Add companion art</button>'+
  '<button id="p21CompanionClear" disabled>Clear companion</button></div>'+
  '<label class="p21-carrier-offset" title="Experimental vertical separation for layered art, NOT a traced retail attachment offset">Companion Y <select id="p21CarrierY"><option value="0">0</option><option value="8">+8</option><option value="4" selected>+4</option><option value="8">+8</option><option value="12">+12</option><option value="16">+16</option><option value="20">+20</option></select></label>'+
  '<div class="p12-ghost-actions"><button id="p14Export" disabled>Export review JSON</button><button id="p14Clear">Clear all reviews</button></div></div>'+
  '<div class="p12-ghost-actions"><button id="p12Ghost" disabled>Preview graphic on map</button><button id="p12GhostClear" disabled>Clear preview</button></div>';
 const family=$('p12Family'),grid=$('p12SpriteGrid'),selection=$('p12SpriteSelected');
 let disk=null,decoded=null,placed=null,colourWords=null,selected=0,selectedRecord=null,thumbs=new Map(),overrides=new Map(),companions=new Map(),ghost=null,ghostMode=false;
 let groups=[],named=new Set(),highlight06=false,warpPhase=0,generatorTick=0,requestStep=0;
 const recordKey=r=>r?`${r.name}:${r.ordinal}:${r.disk}`:'';
 // Generator companions belong to the SELECTED REQUEST, not every child in a chain.
 const companionKey=(r,slot=0)=>r?.type===3?`${recordKey(r)}#${slot}`:recordKey(r);
 const companionFor=(r,childType=null,slot=0,frameId=null)=>{
  const manual=companions.get(companionKey(r,slot));if(manual!==undefined)return manual;
  // $11 native actor script begins with one-based $40 => bitmap $3F; the
  // separate type $2B first word $5E draws bird bitmap $5D. PAIRING IS EXPERIMENTAL.
  const t=childType===null?r?.type:childType;return $('p18TransportFrame')?.checked&&t===0x11&&frameId>=0x3F&&frameId<=0x43?0x5D:null;
 }; 
 const checkboxOn=r=>!!left.querySelector(`input[data-entity="${r.kind}"]:checked`);
 const currentLevel=()=>Entities.NAMES.indexOf(String($('overviewLevel')?.textContent||'').trim());
 const height=i=>{const off=root.NZS_STOCK.levels[i].offset-128;return (disk[off+4]<<8)|disk[off+5];};
 function viewImage(id){if(thumbs.has(id))return thumbs.get(id);const f=decoded?.frames[id];if(!f)return null;
  const im=Loader.makeCanvas(f,colourWords);thumbs.set(id,im);return im;}
 function buildGroups(){
  const native=Object.entries(currentAnalysis||{}).filter(([_,a])=>a?.uniqueFrames?.length)
   .map(([t,a])=>["script-"+t,`Script $${Number(t).toString(16).toUpperCase().padStart(2,'0')} · ${a.uniqueFrames.length} references (−1 resolved)`,Resolver.bitmapFrames(a.uniqueFrames)]);
  // Separate visually identified creatures from later script fragments/effects.
  // Native bounded groups list what the code stores, not a single species.
  const spawnTypes=[...new Set((currentGenerators||[]).map(r=>r.type))];
  const generatedGroups=spawnTypes.map(t=>{const a=currentAnalysis?.[t];return a?.uniqueFrames?.length?['generated-'+t,`Generated type $${t.toString(16).toUpperCase().padStart(2,'0')} · candidate frames`,Resolver.bitmapFrames(a.uniqueFrames)]:null;}).filter(Boolean);
  const transportRefs=Resolver.bitmapFrames([33,34,35,37,39].flatMap(t=>currentAnalysis?.[t]?.uniqueFrames||[]));
  if(transportRefs.length)generatedGroups.push(['transport-script', 'Source $21–$27 · indexed bitmap frames', [...new Set(transportRefs)]]);
  const bounded=[4,5,6].map(t=>{const a=currentAnalysis?.[t]?.bounded;return a?
   ['bounded-'+t,`Type $${t.toString(16).toUpperCase().padStart(2,'0')} · ${a.uniqueFrames.length} referenced frames`,Resolver.bitmapFrames(a.uniqueFrames)]:null;}).filter(Boolean);
  groups=[...BASE_GROUPS.slice(0,-1),...OWNER_GROUPS,...generatedGroups,...bounded,...native,BASE_GROUPS.at(-1)];
  named=new Set(groups.filter(g=>g[0]!=='all'&&g[0]!=='unlinked').flatMap(g=>g[2]||[]));
  family.replaceChildren();let section='';let og=null;
  for(const [id,title] of groups){const head=id==='all'||id==='player'||id==='warp'||id==='kiwi'||id==='items'||id==='letters'?'Image families':id==='unlinked'?'Outside first segments':'Source animation sequences';
   if(head!==section){section=head;og=document.createElement('optgroup');og.label=head;family.appendChild(og);}
   const o=document.createElement('option');o.value=id;o.textContent=title;og.appendChild(o);
  }
 }
 function frameList(){if(!decoded)return [];const g=groups.find(x=>x[0]===family.value);if(!g||family.value==='all')return decoded.frames.map(f=>f.id);
  if(family.value==='unlinked')return decoded.frames.map(f=>f.id).filter(x=>!named.has(x));return g[2]||[];}
 function description(){const id=family.value,link=id.startsWith('script-')?currentAnalysis?.[Number(id.slice(7))]:null;
  if(!decoded)return 'All images are decoded from your original Disk.1; no graphics are bundled.';
  if(link)return `RAW original source at Disk ${hw(link.source)}. ${link.uniqueFrames.length} one-based script IDs (displayed as bitmap index −1) from its first segment (${link.reason}). This is a code listing, NOT a visual species/state grouping. Script $A6 draws bitmap $A5; generator image phases $A5→$A0→$A5.`;
  if(id==='items')return `Original $1F script references $B0–$C9; displayed bitmaps are $AF–$C8. The native table has non-numeric order (slot 8 contains script $BD → bitmap $BC); placement parameter→slot mapping is unconfirmed.`;
  if(id==='letters')return `The original $20 script references $CA–$CF, which the renderer resolves to bitmap $C9–$CE from Disk $87518. The visual family is not an exact parameter mapping.`;
  if(id==='warp')return 'Two original warp images $28 and $29. Displayed on outgoing warp positions with alternating frames; draw offsets are native, placement alignment is provisional.';
  if(id==='kiwi')return 'Caged kiwi artwork is $D9. Rescue/end animation begins at $DA. This owner-confirmed visual distinction does not change the native actor $01/$02 scripts.';
  if(id.startsWith('owner-'))return 'Owner-reviewed graphical grouping. Native scripts are listed separately as RAW source streams; they may mix walking, attack, death and other effects.';
  if(id==='native-06-child')return 'Code-backed secondary object: type $06 handler assigns RAM $0838E to its child; the stream contains $8C–$8F including $8D. Not a collectible.';
  if(id.startsWith('generated-'))return 'Source-linked first actor request from the native generator descriptor. Thumbnail pose and draw location are PROVISIONAL; spawned children move at runtime.';
  if(id.startsWith('bounded-'))return 'Every image word from this type’s source-matched DATA envelope, including alternate branches. These do not all identify the same creature or a verified in-game pose.';
  if(id==='rider-transport')return 'Type $11 uses script $40 → purple bitmap $3F. Separate direct type $2B uses script $5E → bird bitmap $5D. Optional layering is an adjustable visual REVIEW, not proven in-game attachment.';
  if(id==='transport-script')return 'The scripts contain the ONE-BASED word $5D, which draws bitmap $5C (not the $5D bird). The bird is selected by source word $5E in a DIFFERENT actor family. These are not a proven composite.';
  if(id==='player')return 'Tiki: $000 is the owner-identified standing image. The native player script first segment references $001,$002,$003 (bitmaps $000–$002); the idle selection branch remains to be traced.';
  if(id==='unlinked')return 'Not referenced in the first linear script segment; may be used later or elsewhere.';
  return 'All 289 native images. Each pixel, mask and hotspot is decoded live from Disk.1.';
 }
 function choose(id){if(!decoded?.frames[id])return;if(id!==0x8D&&highlight06){highlight06=false;redraw();}selected=id;const f=decoded.frames[id];selection.replaceChildren();
  const row=document.createElement('div');row.className='p12-sprite-detail';
  const big=document.createElement('canvas');big.width=f.width;big.height=f.height;big.style.cssText=`width:${Math.min(180,f.width*3)}px;height:${Math.min(140,f.height*3)}px;image-rendering:pixelated;object-fit:contain`;
  big.getContext('2d').drawImage(viewImage(id),0,0);const label=document.createElement('span');label.textContent=`${h(id)} · ${f.width}×${f.height} · hotspot ${f.dx},${f.dy}`;
  const addr=document.createElement('small');addr.textContent=`Disk bitmap RLE $A099A + native bitmap offset $${f.offset.toString(16).toUpperCase()}`;row.append(big,label,addr);selection.appendChild(row);
  const usage=$('p15FrameUsage');usage.replaceChildren();
  if(id===0x8D){
   const blurb=document.createElement('div');blurb.textContent='Original source use: type $06 creates a secondary object and assigns the $8C–$8F animation (includes $8D). $8D is not in the native $1F/$20 collectible tables.';usage.appendChild(blurb);
   if(placed){const stock=placed.levels.flat().filter(r=>r.type===6);const hit=stock.filter(r=>r.stage===0);
    const b=document.createElement('button');b.type='button';b.textContent=`Locate ${hit.length} related $06 placements on 1-1`;
    b.title='Show original type-$06 parent actors. The $8D effect is dynamic and may appear elsewhere, not necessarily at their anchors.';
    b.onclick=()=>{selectedRecord=null;enable();refreshInstance();const first=$('levels')?.querySelector('.level-row');first?.click();highlight06=true;redraw();};usage.appendChild(b);
   }
  }else if([0x6E,0x78,0x81,0x00,0x01,0xD9].includes(id)){
   usage.textContent=id===0x00?'Tiki: script image $001 → bitmap $000.':id===0xD9?'Kiwi: script image $DA → bitmap $D9.':id===0x01?'Player script $002 → bitmap $001.':'One-based script reference is drawn as bitmap index −1.';
  }else usage.textContent='Image pixels and native drawing offsets generated directly from the opened Disk.1.';
  for(const el of grid.children)el.classList.toggle('selected',+el.dataset.frame===id);
  $('p14Assign').disabled=!selectedRecord;refreshInstance();
 }
 function refreshGrid(){grid.replaceChildren();if(!decoded){selection.textContent='Open Disk.1 to generate all native graphics.';$('p14SourceEvidence').textContent=description();return;}
  const list=frameList(),frag=document.createDocumentFragment();
  for(const i of list){const f=decoded.frames[i];if(!f)continue;const b=document.createElement('button');b.type='button';b.dataset.frame=String(i);b.className='p12-sprite-thumb';b.title=`Original image ${h(i)} · ${f.width}×${f.height}`;
   const cn=document.createElement('canvas');cn.width=f.width;cn.height=f.height;cn.getContext('2d').drawImage(viewImage(i),0,0);
   const lbl=document.createElement('span');lbl.textContent=h(i);b.append(cn,lbl);b.onclick=()=>choose(i);frag.appendChild(b);
  }grid.appendChild(frag);$('p14SourceEvidence').textContent=description();choose(list.includes(selected)?selected:list[0]??0);
 }
 function refreshInstance(){const b=$('p14InstanceInfo');
  if(!selectedRecord){b.textContent='Use “Inspect entities”, then click a placement. Choosing a new preview frame never writes to Disk.1.';$('p14Restore').disabled=true;return;}
  const r=selectedRecord,key=recordKey(r),native=api.associatedFrame(r),review=overrides.get(key);
  const gen=r.type===3?currentGenerators?.[r.parameter]:null;
  b.textContent=`${r.name} · #${r.ordinal} · type $${r.type.toString(16).toUpperCase().padStart(2,'0')} / param $${r.parameter.toString(16).toUpperCase().padStart(2,'0')} · ${review===undefined?'Original candidate':`Preview ${h(review)}`}.`;
  $('p21CompanionClear').disabled=!companions.has(companionKey(r,requestStep));
  const reviewPanel=$('p19GeneratorReview');reviewPanel.replaceChildren();reviewPanel.hidden=!gen;
  if(gen){
   const name=document.createElement('strong');name.textContent=`Generator · ${gen.rangeX}×${gen.rangeY} activation`;
   const phases=document.createElement('div');phases.className='p19-sequence';
   const addSeq=(label,images)=>{const line=document.createElement('div');line.className='p19-sequence-line';const n=document.createElement('span');n.textContent=label;line.appendChild(n);for(const id of [...new Set(images)]){if(!decoded.frames[id])continue;const cn=document.createElement('canvas'),f=decoded.frames[id];cn.width=f.width;cn.height=f.height;cn.title=h(id);cn.getContext('2d').drawImage(viewImage(id),0,0);line.appendChild(cn);}phases.append(line);};
   addSeq('Opening',currentGeneratorPhases.open);addSeq('Closing',currentGeneratorPhases.close);
   const title=document.createElement('div');title.textContent='Generated enemy previews';title.className='p19-review-caption';
   const controls=document.createElement('div');controls.className='p20-chain-actions';
   const play=document.createElement('button');play.type='button';
   play.textContent=$('p20ChildMode').value==='cycle'?'◼ Stop cycle':'▶ Cycle on map';
   play.title='Animate each source-listed request in succession, on the parent generator';
   play.onclick=()=>{$('p20ChildMode').value=$('p20ChildMode').value==='cycle'?'off':'cycle';refreshInstance();redraw();};
   const hold=document.createElement('button');hold.type='button';hold.textContent='Show selected';
   hold.title='Only preview the selected request on the selected generator';
   hold.onclick=()=>{$('p20ChildMode').value='selected';refreshInstance();redraw();};
   controls.append(play,hold);
   const stepper=document.createElement('div');stepper.className='p19-request-steps';
   gen.requests.forEach((q,index)=>{const b=document.createElement('button');b.type='button';b.className=index===requestStep?'selected':'';b.textContent=`${index+1}: $${q.type.toString(16).toUpperCase().padStart(2,'0')}${q.precedingWait===null?'':` · FE ${q.precedingWait}`}`;b.title=`Original descriptor token +$${q.at.toString(16)}, parameters ${q.argX},${q.argY}.${q.precedingWait===null?'':` Previous $FE argument ${q.precedingWait} (native time unit unknown).`} Lexical request order, not proved runtime emission order.`;b.onclick=()=>{requestStep=index;$('p20ChildMode').value='selected';refreshInstance();redraw();};stepper.append(b);});
   const q=gen.requests[Math.min(requestStep,gen.requests.length-1)];if(q){const fr=api.getSourceFrameCandidates(q.type).slice(0,8);if(fr.length)addSeq('Selected enemy frames',fr);}
   const carrierInfo=document.createElement('small');carrierInfo.textContent=q?.type===17?'Possible $3F rider + $5D bird: layered preview only (offset adjustable).':'Use “Add companion art” to compare multi-sprite compositions.';phases.append(carrierInfo);
   const live=document.createElement('div');live.id='p20LiveRequest';live.className='p20-live-request';live.setAttribute('aria-live','off');
   const note=document.createElement('small');note.className='p20-native-note';note.textContent='Source request order · preview timing and spawn positions unverified';
   reviewPanel.append(name,phases,title,controls,live,stepper,note);
  }
  $('p14Restore').disabled=review===undefined;
 }
 function redraw(){ctx.clearRect(0,0,1024,1024);if(!disk||!decoded||!placed)return;const i=currentLevel();if(i<0)return;
  const live=$('p20LiveRequest');
  if(live&&selectedRecord?.type===3){
   const requests=currentGenerators?.[selectedRecord.parameter]?.requests||[];
   const mode=$('p20ChildMode').value;
   const slot=requests.length?(mode==='cycle'?Math.floor(generatorTick/1750)%requests.length:requestStep%requests.length):0;
   live.textContent=mode==='off'?'Preview off':requests.length?`On map · ${slot+1}/${requests.length} · type $${requests[slot].type.toString(16).toUpperCase().padStart(2,'0')}`:'No child requests';
   document.querySelectorAll('#p19GeneratorReview .p19-request-steps button').forEach((btn,j)=>btn.classList.toggle('selected',j===slot));
  }
  if($('p12ShowArt').checked){const hh=height(i);
   const artX=Number($('p19ArtX')?.value||0),artY=Number($('p19ArtY')?.value||0);
   const carrierY=Number($('p21CarrierY')?.value||0);
   function drawCompanion(r,frameId,slot=0,childType=null){
    const companion=companionFor(r,childType,slot,frameId);
    if(companion===null||companion===undefined||!decoded.frames[companion])return;
    const c=decoded.frames[companion],x=Entities.canvasX(r),y=Entities.canvasY(r,hh);
    ctx.save();ctx.globalAlpha=0.85;
    // These two sprites have DIFFERENT native actors. Their relative layout is
    // an adjustable REVIEW COMPOSITE, not a native game-code attachment rule.
    ctx.drawImage(viewImage(companion),x+c.dx+artX,y+c.dy+artY+carrierY);
    ctx.restore();
   }
   for(const r of placed.levels[i]){if(!checkboxOn(r))continue;
    let id=overrides.get(recordKey(r))??api.associatedFrame(r);
    if(r.type===3&&!overrides.has(recordKey(r)))id=Resolver.generatorFrame(currentGeneratorPhases,generatorTick);
    if(id===null||id===undefined||!decoded.frames[id])continue;
    const f=decoded.frames[id];if(r.type!==3)drawCompanion(r,id);ctx.save();if(r.type===3)ctx.globalAlpha=0.92;
    ctx.drawImage(viewImage(id),Entities.canvasX(r)+f.dx+artX,Entities.canvasY(r,hh)+f.dy+artY);ctx.restore();
    if(r.type===3&&$('p20ChildMode').value!=='off'){
     const d=currentGenerators?.[r.parameter];const requests=d?.requests||[];
     if(requests.length&&($('p20ChildMode').value==='cycle'||(selectedRecord&&recordKey(selectedRecord)===recordKey(r)))){
      const slot=$('p20ChildMode').value==='cycle'?Math.floor(generatorTick/1750)%requests.length:requestStep%requests.length;
      const frames=api.getSourceFrameCandidates(requests[slot].type);
      const candidate=frames.length?frames[Math.floor(generatorTick/170)%Math.min(frames.length,8)]:null;
      if(candidate!=null&&decoded.frames[candidate]){
       const f2=decoded.frames[candidate];
       drawCompanion(r,candidate,slot,requests[slot].type);
       ctx.save();ctx.globalAlpha=.86;
       // Show the child at its parent's native anchor; no invented +18px spawn offset.
       ctx.drawImage(viewImage(candidate),Entities.canvasX(r)+f2.dx+artX,Entities.canvasY(r,hh)+f2.dy+artY);
       // Subtle surround distinguishes a sequence candidate from a stock actor placement.
       ctx.strokeStyle='rgba(112,220,242,.65)';ctx.lineWidth=1;
       ctx.strokeRect(Entities.canvasX(r)+artX-6,Entities.canvasY(r,hh)+artY-6,12,12);ctx.restore();
      }
     }
    }
   }
   // Draw only outgoing warp source artwork: incoming destinations are approximate
   // positions and should retain their navigational markers.
   if($('p17WarpArt').checked&&checkboxOn({kind:'out'})){
    const frameId=warpPhase?0x29:0x28,frame=decoded.frames[frameId];
    if(frame){const sprite=viewImage(frameId);
     for(const [source,x,y] of placed.warps){if(source!==i)continue;
      const px=x*16+8,py=(64-hh+y)*16+8;
      ctx.drawImage(sprite,px+frame.dx,py+frame.dy);
     }
    }
   }
  }
  if(selectedRecord&&selectedRecord.stage===i){const r=selectedRecord;
   const px=Entities.canvasX(r),py=Entities.canvasY(r,height(i));ctx.save();ctx.strokeStyle='#FCF09C';ctx.lineWidth=1.5;
   ctx.strokeRect(px-7,py-7,14,14);ctx.beginPath();ctx.moveTo(px-11,py);ctx.lineTo(px+11,py);ctx.moveTo(px,py-11);ctx.lineTo(px,py+11);ctx.stroke();ctx.restore();
  }
  if(highlight06&&i===0){
   ctx.save();ctx.strokeStyle='#FFD65A';ctx.lineWidth=2;ctx.font='bold 13px monospace';
   for(const r of placed.levels[0]){if(r.type!==6)continue;const x=Entities.canvasX(r),y=Entities.canvasY(r,height(0));
    ctx.strokeRect(x-13,y-14,26,28);ctx.fillStyle='#FFD65A';ctx.fillText('$06',x+15,y-10);}
   ctx.restore();
  }
  if(ghost&&i===ghost.level){const f=decoded.frames[ghost.id];ctx.drawImage(viewImage(ghost.id),ghost.x+f.dx,ghost.y+f.dy);
   ctx.strokeStyle='#FAD85A';ctx.setLineDash([4,3]);ctx.strokeRect(ghost.x+f.dx,ghost.y+f.dy,f.width,f.height);ctx.setLineDash([]);
   ctx.fillStyle='#FAD85A';ctx.font='11px sans-serif';ctx.fillText('PREVIEW ONLY',Math.max(0,ghost.x-35),ghost.y+16);
  }
 }
 function enable(){family.disabled=!decoded;$('p12Ghost').disabled=!decoded;$('p12GhostClear').disabled=!ghost;
  $('p14Export').disabled=!(overrides.size||companions.size);$('p14Assign').disabled=!selectedRecord;
  $('p21Companion').disabled=!selectedRecord;$('p21CompanionClear').disabled=!selectedRecord||!companions.has(companionKey(selectedRecord,requestStep));
  $('p12Total').textContent=decoded?String(decoded.frames.length):'OPEN DISK';}
 function download(name,bytes,mime){const url=URL.createObjectURL(new Blob([bytes],{type:mime})),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
 input.addEventListener('change',async ev=>{const file=ev.target.files?.[0];if(!file)return;
  try{const b=new Uint8Array(await file.arrayBuffer());const p=Entities.parseDisk(b);const result=api.decode(b);
   disk=b;decoded=result.decoded;placed=p;currentAnalysis=result.analysis;colourWords=Loader.paletteWords(b);
   thumbs.clear();overrides.clear();companions.clear();ghost=null;ghostMode=false;highlight06=false;selectedRecord=null;selected=0;buildGroups();family.value='all';enable();refreshGrid();refreshInstance();redraw();
   root.dispatchEvent(new Event('nzs:art-toggle'));
   root.dispatchEvent(new CustomEvent('nzs:disk-loaded',{detail:{source:'Disk.1',sprites:decoded.frames.length}}));
  }catch(err){disk=null;decoded=null;placed=null;api.reset();currentAnalysis=null;thumbs.clear();selectedRecord=null;buildGroups();enable();refreshGrid();redraw();console.error('Original graphics load failed',err);}
 },true);
 family.addEventListener('change',refreshGrid);$('p12ShowArt').onchange=()=>{redraw();root.dispatchEvent(new Event('nzs:art-toggle'));};
 $('p14Assign').onclick=()=>{if(!selectedRecord||!decoded)return;overrides.set(recordKey(selectedRecord),selected);enable();refreshInstance();redraw();};
 $('p14Restore').onclick=()=>{if(!selectedRecord)return;overrides.delete(recordKey(selectedRecord));enable();refreshInstance();redraw();};
 warpToggle.addEventListener('change',()=>{redraw();root.dispatchEvent(new Event('nzs:art-toggle'));});
 setInterval(()=>{if(decoded&&$('p12ShowArt').checked&&$('p17WarpArt').checked){warpPhase^=1;redraw();}},190);
 setInterval(()=>{if(decoded&&$('p12ShowArt').checked&&!document.hidden){generatorTick+=105;redraw();}},105);
 $('p21Companion').onclick=()=>{if(!selectedRecord||!decoded)return;companions.set(companionKey(selectedRecord,requestStep),selected);enable();refreshInstance();redraw();};
 $('p21CompanionClear').onclick=()=>{if(!selectedRecord)return;companions.delete(companionKey(selectedRecord,requestStep));enable();refreshInstance();redraw();};
 $('p21CarrierY').onchange=redraw;
 $('p14Clear').onclick=()=>{overrides.clear();companions.clear();selectedRecord=null;enable();refreshInstance();redraw();};
 $('p14Export').onclick=()=>{if(!overrides.size&&!companions.size)return;
  const rows=[];for(const r of placed.levels.flat()){const key=recordKey(r),previewFrame=overrides.get(key);
   const comp=[...companions.entries()].filter(([k])=>k===key||k.startsWith(key+'#')).map(([k,frame])=>({generatorRequest:k.includes('#')?Number(k.split('#').at(-1)):null,frame}));
   if(previewFrame!==undefined||comp.length)rows.push({level:r.name,ordinal:r.ordinal,sourceDiskOffset:r.disk,type:r.type,parameter:r.parameter,xTile:r.x,yTile:r.y,...(previewFrame!==undefined?{previewFrame}:{}),...(comp.length?{companionFrames:comp}:{})});}
  download('nzs-original-graphics-review.json',JSON.stringify({format:'NZS preview observations v0.12',NOT_GAME_DATA:true,sourceDiskSize:disk.length,companionYOffset:Number($('p21CarrierY').value),pairingVerified:false,rows},null,2)+'\n','application/json');};
 $('p12Ghost').onclick=()=>{if(!decoded)return;
  if($('p11Inspect')?.classList.contains('selected'))$('p11Inspect').click(); // preview mode must receive next map click
  ghostMode=true;$('p12Ghost').classList.add('selected');$('p12Ghost').textContent=`Click current map for ${h(selected)}`;};
 $('p12GhostClear').onclick=()=>{ghost=null;ghostMode=false;$('p12Ghost').classList.remove('selected');$('p12Ghost').textContent='Preview graphic on map';enable();redraw();if($('p19EntityMode')?.getAttribute('aria-selected')==='true'&&!$('p11Inspect')?.classList.contains('selected'))$('p11Inspect')?.click();};
 overlay.addEventListener('pointerdown',ev=>{if(!ghostMode||ev.button!==0)return;ev.preventDefault();ev.stopImmediatePropagation();
  const rect=overlay.getBoundingClientRect(),x=Math.floor((ev.clientX-rect.left)/rect.width*1024),y=Math.floor((ev.clientY-rect.top)/rect.height*1024);
  ghost={id:selected,x,y,level:currentLevel()};ghostMode=false;$('p12Ghost').classList.remove('selected');$('p12Ghost').textContent='Preview graphic on map';enable();redraw();
  if($('p19EntityMode')?.getAttribute('aria-selected')==='true'&&!$('p11Inspect')?.classList.contains('selected'))$('p11Inspect')?.click();
 },true);
 root.addEventListener('nzs:entity-selected',ev=>{const r=ev.detail?.record;if(!r||!decoded)return;selectedRecord=r;
  const child=r.type===3?currentGenerators?.[r.parameter]?.type:null;
  const wanted=r.type===3?'owner-03':r.type===31?'items':r.type===32?'letters':(r.type===1||r.type===2)?'kiwi':r.type===0?'player':r.type===4?'owner-04':r.type===5?'owner-05-all':r.type===6?'owner-06':'script-'+r.type;
  requestStep=0;if(groups.some(g=>g[0]===wanted))family.value=wanted;else family.value='all';
  refreshGrid();const id=overrides.get(recordKey(r))??api.associatedFrame(r);if(id!==null&&id!==undefined)choose(id);
  enable();refreshInstance();redraw();});
 for(const el of calibration.querySelectorAll('select'))el.addEventListener('change',redraw);
 transport.addEventListener('change',redraw);
 new MutationObserver(redraw).observe($('overviewLevel'),{childList:true,subtree:true,characterData:true});
 left.addEventListener('change',redraw);generated.querySelector('select').addEventListener('change',()=>{if(selectedRecord?.type===3)refreshInstance();root.dispatchEvent(new Event('nzs:art-toggle'));});enable();buildGroups();refreshGrid();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(typeof window!=='undefined'?window:globalThis);
