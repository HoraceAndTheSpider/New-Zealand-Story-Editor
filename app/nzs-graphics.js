/* New Zealand Story — authentic disk tile banks.
 * Native graphics are RLE packed and consist of 128 bytes of metadata followed
 * by 16×16 4-bitplane tiles (128 bytes/tile, row-interleaved big-endian words).
 * A static reference palette is used until game code colour registers are traced.
 * Documented in wiki/02-maps-and-tiles.md.
 */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.NZSGraphics=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const BANK_OFFSETS=Object.freeze([0x2c00,0x8400,0xf200,0x13400,0x1e400,0x27e00,0x2ec00,0x35a00,0x3c800,0x47800,0x51200,0x56a00,0x60400,0x65c00,0x6f600,0x73800]);
 const EXPECTED_COUNTS=Object.freeze([173,198,134,189,107,219,205,219,192,158,157,256,191,219,117,200]);
 const LEVEL_BANKS=Object.freeze([0,1,2,3,4,4,4,4,5,6,7,8,9,9,9,10,11,12,13,14,15]);
 // The 16 native colour words are at decompressed metadata offsets +$02..+$21,
 // after the two-byte '01' signature, identical across all sixteen stock banks.
 // Each component is 0..7; doubled to Amiga RGB4 for provisional display.
 // Register writes have NOT yet been traced, so this conversion is provisional.
 const PALETTE_WORDS=Object.freeze([0x0000,0x0307,0x0111,0x0521,0x0640,0x0430,0x0030,0x0555,0x0300,0x0007,0x0700,0x0157,0x0740,0x0662,0x0070,0x0777]);
 function rgbWordToCss(word){
  if((word&0x8888)!==0)throw Error('Native 3-bit colour word exceeds range');
  const n=x=>(x*34).toString(16).padStart(2,'0').toUpperCase();
  return '#'+n((word>>8)&7)+n((word>>4)&7)+n(word&7);
 }
 const PALETTE=Object.freeze(PALETTE_WORDS.map(rgbWordToCss));
 function bankPaletteWords(bank){
  if(!bank||!(bank.metadata instanceof Uint8Array)||bank.metadata.length!==128)throw Error('Native bank metadata missing');
  if(bank.metadata[0]!==0x30||bank.metadata[1]!==0x31)throw Error('Unknown native bank signature');
  return Array.from({length:16},(_,i)=>((bank.metadata[2+i*2]<<8)|bank.metadata[3+i*2]));
 }
 function bankPalette(bank){return bankPaletteWords(bank).map(rgbWordToCss);}

 function decodeBank(disk,index){
  if(!(disk instanceof Uint8Array))throw Error('Open a valid Disk.1 before decoding graphics.');
  if(!Number.isInteger(index)||index<0||index>=BANK_OFFSETS.length)throw RangeError('Invalid tile bank');
  const offset=BANK_OFFSETS[index];
  const read32=(p)=>((disk[p]*0x1000000)+(disk[p+1]<<16)+(disk[p+2]<<8)+disk[p+3])>>>0;
  if(offset+9>disk.length)throw Error('Tile bank is outside Disk.1');
  const unpacked=read32(offset)+1,packed=read32(offset+4)+1,escape=disk[offset+8];
  if(unpacked!==128*(EXPECTED_COUNTS[index]+1)||packed<10||offset+packed>disk.length)throw Error(`Tile bank ${index} has an unexpected size`);
  const raw=new Uint8Array(unpacked);let input=offset+9,out=0;const end=offset+packed;
  while(input<end){
   const byte=disk[input++];
   if(byte===escape){
    if(input+2>end)throw Error(`Tile bank ${index}: incomplete RLE repeat`);
    const value=disk[input++],repeats=disk[input++]+1;
    if(out+repeats>unpacked)throw Error(`Tile bank ${index}: repeat exceeds output`);
    raw.fill(value,out,out+repeats);out+=repeats;
   }else{
    if(out>=unpacked)throw Error(`Tile bank ${index}: output overflow`);
    raw[out++]=byte;
   }
  }
  if(input!==end||out!==unpacked||raw[0]!==0x30||raw[1]!==0x31)throw Error(`Tile bank ${index}: invalid decoding result`);
  const bank={index,offset,packed,unpacked,escape,tileCount:EXPECTED_COUNTS[index],metadata:raw.slice(0,128),planar:raw.subarray(128)};
  bankPaletteWords(bank); // validate native palette payload can be interpreted
  return bank;
 }
 function pixelIndices(bank){
  const {planar,tileCount}=bank;
  if(planar.length!==tileCount*128)throw Error('Unexpected planar graphics size');
  const pixels=new Uint8Array(tileCount*256);
  for(let tile=0;tile<tileCount;tile++)for(let y=0;y<16;y++)for(let bit=0;bit<4;bit++){
   const p=tile*128+y*8+bit*2,word=(planar[p]<<8)|planar[p+1];
   for(let x=0;x<16;x++)pixels[tile*256+y*16+x]|=((word>>>(15-x))&1)<<bit;
  }
  return pixels;
 }
 function createAtlas(bank){
  if(typeof document==='undefined')throw Error('Canvas is required to create the graphics atlas');
  const pixels=pixelIndices(bank),height=Math.ceil(bank.tileCount/44)*16;
  const canvas=document.createElement('canvas');canvas.width=704;canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:false}),rgba=ctx.createImageData(704,height);
  const colours=bankPalette(bank).map(s=>[parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16)]);
  for(let t=0;t<bank.tileCount;t++)for(let y=0;y<16;y++)for(let x=0;x<16;x++){
   const col=colours[pixels[t*256+y*16+x]],dest=((Math.floor(t/44)*16+y)*704+(t%44)*16+x)*4;
   rgba.data[dest]=col[0];rgba.data[dest+1]=col[1];rgba.data[dest+2]=col[2];rgba.data[dest+3]=255;
  }
  ctx.putImageData(rgba,0,0);return canvas;
 }
 function decodeAtlases(disk){return BANK_OFFSETS.map((_,i)=>createAtlas(decodeBank(disk,i)));}
 return Object.freeze({BANK_OFFSETS,EXPECTED_COUNTS,LEVEL_BANKS,PALETTE_WORDS,PALETTE,bankPaletteWords,bankPalette,decodeBank,pixelIndices,createAtlas,decodeAtlases});
});
