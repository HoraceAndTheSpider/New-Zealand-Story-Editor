/* P16: original Disk.1 tile classification, displayed but never written.
 * Disk $8CA5E..$8CFE3 expands with native $95 escape-RLE into
 * game RAM $0CBA0..$0D291. Source backing was byte-checked against
 * Stage 1_1.uss; all 21 stage pointers are structure metadata, NOT
 * embedded property/graphics values. Each 16-bit classification expands
 * to 4 native 4-bit property BYTES at the 2x2 positions.
 */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.NZSTileProperties=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const BEGIN=0x8CA5E,END=0x8CFE4,ORIGIN=0xCBA0,OUTPUT_SIZE=0x6F2;
 // Positions are SOURCE-MATCHED stage-catalogue first pointer values,
 // with the special 4-4b classification pointer inserted at index 16.
 const POINTERS=Object.freeze([0xCBA4,0xCBC4,0xCBE8,0xCC22,0xCC80,0xCC80,0xCC80,0xCC80,
  0xCD22,0xCD90,0xCE24,0xCEBE,0xCF30,0xCF30,0xCF30,0xCF98,0xCFC2,
  0xD038,0xD0AA,0xD198,0xD20C]);
 function rle(disk,start,end,outSize){
  if(!(disk instanceof Uint8Array)||disk.length!==901120)throw Error('Open a 901,120-byte Disk.1 first');
  const out=new Uint8Array(outSize);let src=start,pos=0;
  while(src<end){let b=disk[src++],rep=1;
   if(b===0x95){if(src+1>=end)throw Error('Truncated native classification RLE');b=disk[src++];rep=disk[src++]+1;}
   if(pos+rep>outSize)throw Error('Native classification exceeds decoded bounds');out.fill(b,pos,pos+rep);pos+=rep;
  }
  if(src!==end||pos!==outSize)throw Error('Native classification source size changed');return out;
 }
 function wordToBytes(word){if(!Number.isInteger(word)||word<0||word>0xFFFF)throw RangeError('Invalid classification word');return [(word>>>12)&15,(word>>>8)&15,(word>>>4)&15,word&15];}
 function decode(disk){
  const raw=rle(disk,BEGIN,END,OUTPUT_SIZE),tables=[];
  for(const p of POINTERS){const start=p-ORIGIN;if(start<0||start>=raw.length)throw Error('Invalid tile-property pointer');
   const words=[];let done=false;
   for(let at=start;at+1<raw.length;at+=2){const w=raw[at]*256+raw[at+1];if(w===0xAAAA){done=true;break;}words.push(w);}
   if(!done||words.length===0||words.length>256)throw Error('Original property table lacks safe sentinel');
   tables.push(Object.freeze(words));
  }
  return Object.freeze({raw,tables:Object.freeze(tables)});
 }
 function tile(decoded,level,tileID){
  if(!decoded||!Number.isInteger(level)||level<0||level>=21||!Number.isInteger(tileID)||tileID<0||tileID>255)throw RangeError('Tile/property selection outside valid range');
  const table=decoded.tables[level],fallback=tileID>=table.length;
  const word=table[fallback?0:tileID];return {level,tileID,word,bytes:wordToBytes(word),fallback,tableSize:table.length,
   source:BEGIN,sourceEnd:END,ramPointer:POINTERS[level]};
 }
 return Object.freeze({BEGIN,END,ORIGIN,OUTPUT_SIZE,POINTERS,rle,decode,tile,wordToBytes});
});
/* UI deliberately attaches to the existing selection card; no P03 edit writers touched. */
(function(root){'use strict';if(typeof document==='undefined')return;
 const API=root.NZSTileProperties;let decoded=null,host=null;
 const hex=(n,w=2)=>'$'+n.toString(16).toUpperCase().padStart(w,'0');
 function init(){const tileCard=document.querySelector('.selection-card');if(!tileCard)return;
  const section=document.createElement('section');section.id='p16TileMask';section.className='p16-tile-mask';section.setAttribute('aria-label','Native tile property mask');
  section.innerHTML='<div class="section-heading compact">TILE MASK <span id="p16MaskWord">—</span></div>'+
   '<div id="p16MaskGrid" class="p16-mask-grid" aria-label="2 by 2 property bytes"><div>—</div><div>—</div><div>—</div><div>—</div></div>'+
   '<div id="p16MaskBytes" class="p16-mask-bytes">Open Disk.1</div>'+
   '<div id="p16MaskHint" class="p16-mask-hint" title="Classification byte semantics are not yet verified by native gameplay consumers">Four original property bytes · meanings unverified</div>';
  tileCard.insertAdjacentElement('afterend',section);host=section;
 }
 function update(level,id){if(!host)return;const cells=host.querySelectorAll('#p16MaskGrid > div');if(!decoded){
  host.querySelector('#p16MaskWord').textContent='—';host.querySelector('#p16MaskBytes').textContent='Open Disk.1';host.querySelector('#p16MaskHint').textContent='Source-derived property grid';cells.forEach(c=>{c.textContent='—';c.title='';});return;}
  const info=API.tile(decoded,level,id);host.querySelector('#p16MaskWord').textContent=hex(info.word,4);
  info.bytes.forEach((n,i)=>{cells[i].textContent=hex(n);cells[i].title=['Top-left','Top-right','Bottom-left','Bottom-right'][i]+' property byte '+hex(n);});
  host.querySelector('#p16MaskBytes').textContent='Bytes: '+info.bytes.map(n=>hex(n)).join('  ');
  host.querySelector('#p16MaskHint').textContent=info.fallback?`Tile ${hex(id)} uses fallback entry 0 (table has ${info.tableSize} words)`:
   `Tile ${hex(id)} · entry ${id+1}/${info.tableSize} · meaning not yet verified`;
 }
 root.NZSTilePropertiesUI={init,load:disk=>{decoded=API.decode(disk);return decoded;},setDecoded:data=>{decoded=data;return data;},update};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(typeof window!=='undefined'?window:globalThis);
