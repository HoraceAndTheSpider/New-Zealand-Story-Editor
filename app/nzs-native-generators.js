/* P16: The original 19 generator descriptors, decompressed from Disk.1.
 * A script starting with $FC then a nonnegative token requests an actor
 * through the same native factory used for direct placements (RAM $05872).
 * The token is a candidate CHILD ACTOR TYPE, not a sprite or spawn pose.
 */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.NZSNativeGenerators=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const SOURCE_BEGIN=0x85C07,SOURCE_END=0x85DB7,RAM_BASE=0x5C90,EXPECTED_BYTES=0x1B0;
 // Lexical, NOT a runtime simulator. The factory at RAM $05872 consumes two
 // bytes following a positive request token. The generator script interleaves
 // $FC, $FD, $FE (one-byte wait), and $FF separators/restart pointers.
 // Branches, exit conditions and resulting live spawn order remain unproved.
 function scanRequests(b){
  const requests=[],controls=[];let wait=null;
  for(let i=4;i<b.length;){const at=i,v=b[i++];
   if(v===0xFC||v===0xFD){controls.push({at,opcode:v});continue;}
   if(v===0xFE){if(i>=b.length)break;wait=b[i++];controls.push({at,opcode:v,value:wait});continue;}
   if(v===0xFF){if(i+5===b.length&&b[i]===0&&b[i+1]===0&&b[i+2]===0&&b[i+3]>=0x5c&&b[i+3]<0x60){controls.push({at,opcode:v,sourceRestartBytes:[...b.slice(i,i+5)]});i+=5;}else controls.push({at,opcode:v});continue;}
   if(v<=45&&i+1<b.length){requests.push({at,type:v,argX:b[i++],argY:b[i++],precedingWait:wait});wait=null;continue;}
   controls.push({at,opcode:v,unresolved:true});
  }
  return {requests,controls};
 }
 function decode(disk){
  if(!(disk instanceof Uint8Array)||disk.length!==901120)throw Error('Original Disk.1 required');
  const memory=new Uint8Array(EXPECTED_BYTES);let ptr=SOURCE_BEGIN,pos=0;
  while(ptr<SOURCE_END){let b=disk[ptr++],repeat=1;if(b===0x95){if(ptr+2>SOURCE_END)throw Error('Truncated native door script');b=disk[ptr++];repeat=disk[ptr++]+1;}
   if(pos+repeat>EXPECTED_BYTES)throw Error('Generator script overflow');memory.fill(b,pos,pos+repeat);pos+=repeat;}
  if(pos!==EXPECTED_BYTES||ptr!==SOURCE_END)throw Error('Unexpected generator descriptor size');
  const entries=[];
  const starts=Array.from({length:19},(_,v)=>{const j=2+2*v,r=(memory[j]<<8)|memory[j+1];return j+(r>=0x8000?r-0x10000:r);});
  for(let variant=0;variant<19;variant++){
   const row=2+2*variant;const rel=((memory[row]<<8)|memory[row+1]);const offset=(row+(rel>=0x8000?rel-0x10000:rel));
   if(offset<38||offset+6>memory.length||memory[offset+4]!==0xFC)throw Error('Invalid native generator variant '+variant);
   const type=memory[offset+5],rangeX=memory[offset]*256+memory[offset+1],rangeY=memory[offset+2]*256+memory[offset+3];
   if(type>45)throw Error('Unsupported native generated actor type');
   const end=Math.min(...starts.filter(x=>x>offset),EXPECTED_BYTES);
   const descriptor=memory.slice(offset,end);
   const analysis=scanRequests(descriptor);
   if(analysis.requests[0]?.type!==type)throw Error('First generated type not consistent with native $FC token');
   entries.push(Object.freeze({variant,type,rangeX,rangeY,descriptorRAM:RAM_BASE+offset,firstTokenRAM:RAM_BASE+offset+5,
    descriptorBytes:descriptor,requests:Object.freeze(analysis.requests.map(Object.freeze)),controlTokens:Object.freeze(analysis.controls.map(Object.freeze))}));
  }
  return Object.freeze(entries);
 }
 return Object.freeze({SOURCE_BEGIN,SOURCE_END,RAM_BASE,EXPECTED_BYTES,scanRequests,decode});
});
