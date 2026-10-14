/* New Zealand Story — P13 source-derived sprite loader. No sprites, descriptors
 * or pixels are bundled. Both blocks are expanded directly from opened Disk.1.
 * Source data RLE: $95 value countMinusOne; 5 planes, image rows organised
 * WORD FIRST then mask/planes. Descriptor record size 16 bytes, last four
 * source bytes zero (loader fills repeated draw offset fields at runtime).
 */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.NZSSpriteDisk=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const IMAGE_SRC=0xA099A,IMAGE_END=0xB42CF,IMAGE_UNPACKED=0x17000;
 const DIRECTORY_SRC=IMAGE_END,FRAME_COUNT=289,DESCRIPTOR_BYTES=16;
 
 function rle(disk,start,minimum,maxBytes=250000){
  let p=start;const out=[];
  while(out.length<minimum){
   if(p>=disk.length||p-start>maxBytes)throw Error('Sprite source RLE ended unexpectedly');
   const byte=disk[p++];
   if(byte===0x95){if(p+2>disk.length)throw Error('Truncated $95 run');const value=disk[p++],repeat=disk[p++]+1;
    if(out.length+repeat>300000)throw Error('Sprite source RLE overflow');for(let j=0;j<repeat;j++)out.push(value);
   }else out.push(byte);
  }
  return {bytes:new Uint8Array(out),end:p};
 }
 function u16(a,p){return a[p]*256+a[p+1];}
 function s16(a,p){const v=u16(a,p);return v&0x8000?v-65536:v;}
 function u32(a,p){return a[p]*0x1000000+a[p+1]*65536+a[p+2]*256+a[p+3];}
 function pixelIndices(pool,offset,width,height){
  const ww=Math.ceil(width/16),size=ww*10*height;
  if(offset+4+size>pool.length||u16(pool,offset)!==ww||u16(pool,offset+2)!==height)throw Error('Native sprite record header differs from indexed descriptor');
  const pixels=new Uint8Array(width*height),alpha=new Uint8Array(width*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const bitMask=1<<(7-(x&7));let col=0,mask=0;
   for(let band=0;band<5;band++){
    const pos=offset+4+y*ww*10+Math.floor(x/16)*10+band*2+((x&15)>>3);
    const bit=(pool[pos]&bitMask)?1:0;
    if(!band)mask=bit;else col|=bit<<(band-1);
   }
   const n=y*width+x;pixels[n]=col;alpha[n]=mask;
  }
  return {pixels,alpha};
 }
 function decode(disk){
  if(!(disk instanceof Uint8Array)||disk.length!==901120||disk[0]!==0x44||disk[1]!==0x4F||disk[2]!==0x53)throw Error('Open original-format Disk.1 first');
  const image=rle(disk,IMAGE_SRC,IMAGE_UNPACKED);
  if(image.end!==IMAGE_END||image.bytes.length!==IMAGE_UNPACKED)throw Error('Native sprite source boundary differs from stock');
  const dir=rle(disk,DIRECTORY_SRC,(FRAME_COUNT+1)*DESCRIPTOR_BYTES);
  const frames=[];
  for(let i=0;i<FRAME_COUNT;i++){
   const d=i*DESCRIPTOR_BYTES,offset=u32(dir.bytes,d),dx=s16(dir.bytes,d+4),dy=s16(dir.bytes,d+6),width=u16(dir.bytes,d+8),height=u16(dir.bytes,d+10);
   if(width<1||width>160||height<1||height>160||dir.bytes.slice(d+12,d+16).some(x=>x!==0))throw Error('Unexpected native sprite directory entry $'+i.toString(16));
   const {pixels,alpha}=pixelIndices(image.bytes,offset,width,height);
   frames.push({id:i,width,height,dx,dy,offset,pixels,alpha,source:'Disk.1 $A099A bitmap / $B42CF directory'});
  }
  if(dir.bytes.slice(FRAME_COUNT*16,FRAME_COUNT*16+16).some(x=>x!==0))throw Error('No native sprite directory sentinel');
  return Object.freeze({frames:Object.freeze(frames),sourceImage:IMAGE_SRC,sourceDirectory:DIRECTORY_SRC,bytes:image.bytes.length,sourceEnd:dir.end});
 }
 function paletteWords(disk){ // Palette is the first authentic native tile bank metadata, decoded from Disk.1.
  const gfx=typeof window!=='undefined'?window.NZSGraphics:typeof globalThis!=='undefined'?globalThis.NZSGraphics:null;
  if(gfx?.decodeBank&&gfx.bankPaletteWords){return gfx.bankPaletteWords(gfx.decodeBank(disk,0));}
  throw Error('Native tile palette decoder unavailable. Load nzs-graphics.js.');
 }
 function makeCanvas(frame,words){
  if(typeof document==='undefined')throw Error('Native sprite canvas requires a browser');
  const cvs=document.createElement('canvas');cvs.width=frame.width;cvs.height=frame.height;
  const ctx=cvs.getContext('2d');const im=ctx.createImageData(frame.width,frame.height);
  for(let p=0;p<frame.pixels.length;p++){
   const word=words[frame.pixels[p]],a=p*4;
   im.data[a]=((word>>8)&7)*34;im.data[a+1]=((word>>4)&7)*34;im.data[a+2]=(word&7)*34;im.data[a+3]=frame.alpha[p]?255:0;
  }
  ctx.putImageData(im,0,0);return cvs;
 }
 return Object.freeze({IMAGE_SRC,IMAGE_END,IMAGE_UNPACKED,DIRECTORY_SRC,FRAME_COUNT,decode,rle,paletteWords,makeCanvas,pixelIndices});
});
