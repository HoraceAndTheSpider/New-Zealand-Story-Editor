/* New Zealand Story binary map model. Raw-layout fields are documented in wiki.
 * Geometry functions derive from the resource-neutral approach in the owner's
 * Indy Heat app/layer-tools.js; no Indy Heat game-specific globals are required.
 */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.NZSCore=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const MAP_SIDE=64,MAP_BYTES=4096,TILE_SIZE=16,DISK_BYTES=901120;
 function assertMap(map){if(!(map instanceof Uint8Array)||map.length!==MAP_BYTES)throw new Error('Expected one 4,096-byte raw map');}
 function index(x,y){if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=64||y<0||y>=64)throw new RangeError('Tile coordinate outside map');return y*64+x;}
 function screenIndex(x,topY){return index(x,63-topY);}
 function fromBase64(s){const binary=atob(s);const out=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i);return out;}
 function validDisk(bytes){return bytes instanceof Uint8Array&&bytes.length===DISK_BYTES&&bytes[0]===0x44&&bytes[1]===0x4f&&bytes[2]===0x53;}
 function loadMaps(bytes,levelRecords){if(!validDisk(bytes))throw new Error('This is not a recognised 901,120-byte Amiga Disk.1 (DOS header expected).');return levelRecords.map(l=>bytes.slice(l.offset,l.offset+MAP_BYTES));}
 function exportDisk(bytes,levelRecords,maps){if(!validDisk(bytes))throw new Error('Load Disk.1 before exporting a disk.');if(maps.length!==levelRecords.length)throw new Error('Map count mismatch');const result=bytes.slice();maps.forEach((m,i)=>{assertMap(m);result.set(m,levelRecords[i].offset);});return result;}
 function linePoints(x0,y0,x1,y1){ // Adapted from Indy Heat's shared resource-neutral raster core.
  x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
  const out=[],dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;
  let err=dx+dy;
  while(true){out.push([x0,y0]);if(x0===x1&&y0===y1)break;const e2=err*2;if(e2>=dy){err+=dy;x0+=sx;}if(e2<=dx){err+=dx;y0+=sy;}}
  return out;
 }
 function rectanglePoints(x0,y0,x1,y1,filled=false){
  x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
  const l=Math.min(x0,x1),r=Math.max(x0,x1),t=Math.min(y0,y1),b=Math.max(y0,y1),out=[];
  if(filled){for(let y=t;y<=b;y++)for(let x=l;x<=r;x++)out.push([x,y]);}
  else{out.push(...linePoints(l,t,r,t),...linePoints(r,t,r,b),...linePoints(r,b,l,b),...linePoints(l,b,l,t));}
  return out;
 }
 function drawPoints(map,points,value){assertMap(map);let changes=0;const visited=new Set();for(const [x,y] of points){if(x<0||x>63||y<0||y>63)continue;const pos=screenIndex(x,y);if(visited.has(pos))continue;visited.add(pos);if(map[pos]!==value){map[pos]=value;changes++;}}return changes;}
 function floodFill(map,x,topY,newTile){assertMap(map);if(x<0||x>=64||topY<0||topY>=64)return 0;const orig=map[screenIndex(x,topY)];if(orig===newTile)return 0;const todo=[[x,topY]];let changed=0;
  while(todo.length){const [px,py]=todo.pop();if(px<0||px>=64||py<0||py>=64)continue;const idx=screenIndex(px,py);if(map[idx]!==orig)continue;map[idx]=newTile;changed++;todo.push([px+1,py],[px-1,py],[px,py+1],[px,py-1]);}
  return changed;
 }
 function mapStats(map,tileCount){assertMap(map);let missing=0;const used=new Set();for(const id of map){used.add(id);if(id>=tileCount)missing++;}return {missing,unique:used.size};}
 return Object.freeze({MAP_SIDE,MAP_BYTES,TILE_SIZE,DISK_BYTES,index,screenIndex,fromBase64,validDisk,loadMaps,exportDisk,linePoints,rectanglePoints,drawPoints,floodFill,mapStats});
});
