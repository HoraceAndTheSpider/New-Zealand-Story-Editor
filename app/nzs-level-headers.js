/* New Zealand Story level headers: 128 bytes immediately before each map.
 * Header starts ASCII "01"; +2 and +4 are big-endian map dimensions.
 * +0E and +10 are coordinate-like big-endian words, NOT proven player/warp positions.
 * Read-only until retail 68000 code establishes semantics.
 */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.NZSLevelHeaders=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const STOCK_HEADERS=Object.freeze([{"name":"1_1","offset":101504,"width":64,"height":14,"x":0,"y":0},{"name":"1_2","offset":107136,"width":64,"height":32,"x":0,"y":0},{"name":"1_3","offset":112768,"width":64,"height":32,"x":33,"y":10},{"name":"1_4","offset":118400,"width":64,"height":64,"x":0,"y":38},{"name":"2_1","offset":140928,"width":64,"height":64,"x":0,"y":11},{"name":"2_2","offset":146560,"width":64,"height":64,"x":44,"y":24},{"name":"2_3","offset":152192,"width":64,"height":64,"x":0,"y":43},{"name":"2_4","offset":157824,"width":64,"height":64,"x":30,"y":55},{"name":"3_1","offset":270464,"width":64,"height":64,"x":0,"y":52},{"name":"3_2","offset":276096,"width":64,"height":64,"x":25,"y":17},{"name":"3_3","offset":281728,"width":64,"height":64,"x":44,"y":55},{"name":"3_4","offset":287360,"width":64,"height":64,"x":42,"y":24},{"name":"4_1","offset":315520,"width":64,"height":64,"x":44,"y":55},{"name":"4_2","offset":321152,"width":64,"height":64,"x":44,"y":39},{"name":"4_3","offset":326784,"width":64,"height":64,"x":7,"y":7},{"name":"4_4","offset":383104,"width":64,"height":48,"x":0,"y":0},{"name":"4_4b","offset":388736,"width":64,"height":48,"x":0,"y":39},{"name":"5_1","offset":445056,"width":64,"height":64,"x":44,"y":55},{"name":"5_2","offset":450688,"width":64,"height":64,"x":38,"y":47},{"name":"5_3","offset":495744,"width":64,"height":64,"x":44,"y":0},{"name":"5_4","offset":501376,"width":64,"height":64,"x":44,"y":0}].map(r=>Object.freeze(r)));
 function readOne(bytes,level){
  const at=level.offset-128;
  if(!(bytes instanceof Uint8Array)||at<0||at+128>bytes.length)throw Error('Level header outside disk image');
  const word=p=>((bytes[at+p]<<8)|bytes[at+p+1]);
  if(bytes[at]!==0x30||bytes[at+1]!==0x31)throw Error(`Unknown level header for ${level.name}`);
  const width=word(2),height=word(4),x=word(14),y=word(16);
  if(width!==64||height<1||height>64||x>=width||y>=height)throw Error(`Invalid map dimensions or position fields for ${level.name}`);
  return Object.freeze({name:level.name,offset:level.offset,width,height,x,y});
 }
 function readAll(bytes,levels){return levels.map(l=>readOne(bytes,l));}
 function countOutsideActive(map,header,tileCount){
  let active=0,inactive=0;
  for(let row=0;row<64;row++)for(let col=0;col<64;col++)if(map[row*64+col]>=tileCount){if(row<header.height)active++;else inactive++;}
  return {active,inactive};
 }
 return Object.freeze({STOCK_HEADERS,readOne,readAll,countOutsideActive});
});
