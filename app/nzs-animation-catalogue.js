/* P19 — original Disk.1 one-based animation image WORD reader, read-only.
 * The only built-in per-type content is a verified SOURCE ADDRESS (not frames).
 * v0.12: recovered type $26 (38 decimal) at Disk $8AF90 from live RAM
 * $0B006, 64-byte RLE match. First word $005E draws bird bitmap $05D.
 * Source->actor pairing with rider type $11 remains unproved.
 * Raw words and their pixel artwork are always read from the user's Disk.1.
 * Interpreter jump-table: game RAM $0B430, source Disk $8B398;
 * values $8000..$804C are commands (not images), with known operand lengths.
 * Branch/jump control is NOT simulated. For types $04/$05/$06 only,
 * complete native source DATA envelopes are bounded by the next proven code
 * or independent stream (RAM $08120, $08E2C, $08398 respectively).
 * This allows indexing non-linear image references WITHOUT pretending that
 * contiguous image IDs necessarily depict the same creature.
 */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.NZSAnimations=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const SOURCE=Object.freeze({
  0:0x8AEE6,1:0x8AEAE,2:0x8AEAE,3:0x86121,4:0x8804E,5:0x88D50,6:0x882A2,
  7:0x88096,9:0x87FAD,10:0x88168,11:0x88206,12:0x88198,13:0x88138,14:0x88236,
  15:0x87F0F,16:0x87F9F,17:0x880DA,18:0x881DA,19:0x8810A,20:0x88016,
  21:0x87F2F,22:0x880C0,23:0x87ADE,24:0x8796E,25:0x87994,26:0x87F99,
  31:0x874CE,32:0x87518,33:0x8AFD8,34:0x8AFE0,35:0x8AFE8,
  37:0x8AFF0,38:0x8AF90,39:0x8AFFA,40:0x8B030,41:0x8B028,42:0x880CE,
  43:0x8AF84,44:0x8AF88,45:0x8AF8C
 });
 // Confirmed via the 20 × BRA.W interpreter jump table and handlers in original RAM.
 // Opcode consumes N whole WORD arguments in addition to its opcode word.
 const ARGS=Object.freeze({
  0x8000:0,0x8004:1,0x8008:1,0x800C:1,0x8010:1,0x8014:1,0x8018:1,
  0x801C:2,0x8020:1,0x8024:0,0x8028:1,0x802C:1,0x8030:1,0x8034:1,
  0x8038:1,0x803C:0,0x8040:0,0x8044:2,0x8048:0,0x804C:2
 });
 // Proved in owner's RAM: type $04 source stream $080D8..$0811F,
 // type $05 $08DD8..$08E2B, type $06 $0832A..$08397. These are full
 // allocated DATA envelopes, NOT a guarantee every contained branch executes.
 const NATIVE_ENVELOPES=Object.freeze({4:0x48,5:0x54,6:0x6E});
 // Owner visual identification of the frame preceding each native script's
 // first ordinary image. This is human identification, NOT a traced opcode.
 const OWNER_LEADING=Object.freeze({4:0x6E,5:0x78,6:0x81});
 const u16=(data,at)=>data[at]*256+data[at+1];
 function expandPrefix(disk,at,minBytes=320){
  if(!(disk instanceof Uint8Array)||disk.length!==901120||at<0||at>=disk.length)throw Error('Original Disk.1 is required');
  const result=[];let p=at;
  while(result.length<minBytes){
   if(p>=disk.length||p-at>1024)throw Error('Animation source outside disk or unreasonable length');
   const b=disk[p++];
   if(b!==0x95)result.push(b);
   else{if(p+2>disk.length)throw Error('Incomplete animation RLE');
    const v=disk[p++],n=disk[p++]+1;
    for(let k=0;k<n;k++)result.push(v);
   }
   if(result.length>2048)throw Error('Invalid animation RLE');
  }
  return {bytes:Uint8Array.from(result),sourceEnd:p};
 }
 function decodeSegment(raw,frameCount=289,maxWords=120){
  if(!(raw instanceof Uint8Array))throw Error('Expected native animation bytes');
  const tokens=[],frames=[];let p=0,reason='budget';
  for(let i=0;i<maxWords&&p+1<raw.length;i++){
   const address=p,w=u16(raw,p);p+=2;
   if(w<0x8000){
    if(w===0){reason='zero-word';tokens.push({kind:'zero-word',at:address,word:w});break;}
    if(w>frameCount){reason='non-image-word';tokens.push({kind:'unknown',at:address,word:w});break;}
    frames.push(w);tokens.push({kind:'frame',at:address,frame:w});continue;
   }
   const n=ARGS[w];
   if(n===undefined){reason='unknown-control';tokens.push({kind:'unknown',at:address,word:w});break;}
   if(p+2*n>raw.length){reason='truncated-arguments';break;}
   const values=[];for(let j=0;j<n;j++){values.push(u16(raw,p));p+=2;}
   tokens.push({kind:'command',at:address,word:w,arguments:values});
   if(w===0x8000){reason='reset';break;}
   if(w===0x801C||w===0x804C){reason='branch';break;}
  }
  return {tokens,frames,uniqueFrames:[...new Set(frames)],reason,decodedBytes:p};
 }
 // Enumerate every raw image word in a *bounded native stream*. Execution
 // control is explicitly not followed; reset/branch delimiters are kept.
 function decodeBoundedType(disk,type){
  const n=NATIVE_ENVELOPES[type],at=SOURCE[type];if(!n||at===undefined)return null;
  const raw=expandPrefix(disk,at,n).bytes.subarray(0,n);
  const tokens=[],frames=[],sections=[];let p=0,start=0,section=0;
  while(p+1<raw.length){
   const wordAt=p,w=u16(raw,p);p+=2;
   if(w===0){tokens.push({kind:'zero-word-ambiguous',at:wordAt,section});continue;}
   if(w<=289){frames.push(w);tokens.push({kind:'frame',at:wordAt,frame:w,section});continue;}
   const argc=ARGS[w];
   if(argc===undefined||p+2*argc>raw.length)throw Error('Unrecognised command within verified native actor stream $'+type.toString(16)+' at +$'+wordAt.toString(16));
   const args=[];for(let j=0;j<argc;j++){args.push(u16(raw,p));p+=2;}
   const boundary=w===0x8000?'reset':(w===0x801C||w===0x804C)?'branch':null;
   tokens.push({kind:'command',at:wordAt,word:w,arguments:args,section,boundary});
   if(boundary){sections.push({section,start,end:p,boundary});start=p;section++;}
  }
  if(p!==n)throw Error('Native stream ends on an incomplete word');
  if(start<n)sections.push({section,start,end:n,boundary:'native envelope end'});
  return {type,source:at,byteLength:n,tokens,sections,frames,uniqueFrames:[...new Set(frames)],
   confidence:'Native source words verified; references are not confirmed poses or gameplay timings.'};
 }
 function decodeType(disk,type){
  const at=SOURCE[type];if(at===undefined)return null;
  const bytes=expandPrefix(disk,at).bytes;
  const segment=decodeSegment(bytes);
  return {...segment,type,source:at,bounded:decodeBoundedType(disk,type)};
 }
 function decodeAll(disk){const out={};for(const t of Object.keys(SOURCE))out[t]=decodeType(disk,Number(t));return out;}
 // The first 17 WORDS are a lookup with a *non-numeric image ordering*.
 // This is a sequence table, not a proved placement-parameter -> image formula.
 function collectibleSlots(disk){
  const raw=expandPrefix(disk,SOURCE[31],64).bytes;
  const frames=Array.from({length:17},(_,i)=>u16(raw,i*2));
  if(frames.some(x=>x===0||x>289))throw Error('Unexpected $1F indexed image table');
  return frames;
 }
 return Object.freeze({SOURCE,ARGS,NATIVE_ENVELOPES,OWNER_LEADING,expandPrefix,decodeSegment,decodeBoundedType,decodeType,decodeAll,collectibleSlots});
});
