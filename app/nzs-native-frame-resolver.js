/* P19/P20 (editor v0.11): native animation image words are ONE-BASED. The original renderer
 * performs SUBQ.W #1,D1 at RAM $0BF80 / Disk $8BEE0 before the $0BF94
 * image-directory lookup (16-byte records). $0000 is NOT bitmap $000.
 * All content is read from selected Disk.1; this module has no game art.
 */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.NZSFrameResolver=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const SUBQ_RAM=0xBF80,SUBQ_DISK=0x8BEE0,IMAGE_COUNT=289;
 function validate(disk){
  if(!(disk instanceof Uint8Array)||disk.length!==901120)throw Error('Original Disk.1 required');
  // SUBQ.W #1,D1; LEA PC-displacement,A5; BSR.W to image lookup.
  const signature=[0x53,0x41,0x4B,0xFA,0x1C,0xBE,0x61,0x00,0x00,0x0C];
  if(signature.some((b,i)=>disk[SUBQ_DISK+i]!==b))throw Error('Native one-based graphics resolver differs from research baseline');
  return true;
 }
 function toBitmap(scriptWord){return Number.isInteger(scriptWord)&&scriptWord>=1&&scriptWord<=IMAGE_COUNT?scriptWord-1:null;}
 function bitmapFrames(scriptWords){const seen=new Set(),out=[];for(const word of scriptWords||[]){const id=toBitmap(word);if(id!==null&&!seen.has(id)){seen.add(id);out.push(id);}}return out;}
 function generatorPhases(tokens){
  const phases=[[],[]];let part=0;
  for(const t of tokens||[]){
   if(part>=2)break;
   if(t.kind==='command'&&t.word===0x8048){part++;continue;}
   if(t.kind==='frame'){
    const id=toBitmap(t.frame);if(id!==null)phases[part].push(id);
   }else if(t.kind==='unknown'||t.kind==='command'&&t.word===0x8000)break;
  }
  // Exact original script sequence $A6..$A1, $A1..$A6;
  // do not reconstruct an animation from adjacent bitmap IDs.
  if(!phases[0].length||!phases[1].length)throw Error('Generator animation phases could not be resolved');
  return Object.freeze({open:Object.freeze(phases[0]),close:Object.freeze(phases[1])});
 }
 // Generator raw script: A6 A6 A5 A4 A3 A2 / $8048 /
 // A1 A1 A2 A3 A4 A5 A6 / $8048. Native $8048 clears
 // actor +$20 and +$1E, then advances script cursor +$22; it is NOT a wait.
 // Source timing is unknown: only our preview's delays are adjustable.
 const GENERATOR_FRAME_MS=105,GENERATOR_A0_HOLD_MS=350,GENERATOR_CLOSED_HOLD_MS=310;
 function generatorPose(phases,elapsedMs){
  if(!phases)return null;
  const open=phases.open,close=phases.close;
  if(!open?.length||!close?.length)return null;
  const ordinaryMs=(open.length+close.length)*GENERATOR_FRAME_MS;
  const cycleMs=ordinaryMs+GENERATOR_A0_HOLD_MS+GENERATOR_CLOSED_HOLD_MS;
  let ms=((Math.floor(elapsedMs)%cycleMs)+cycleMs)%cycleMs;
  const holdStart=(open.length+2)*GENERATOR_FRAME_MS;
  if(ms>=holdStart&&ms<holdStart+GENERATOR_A0_HOLD_MS){
   return {frame:close[1],segment:'open',holding:true};
  }
  if(ms>=holdStart+GENERATOR_A0_HOLD_MS)ms-=GENERATOR_A0_HOLD_MS;
  if(ms>=ordinaryMs){return {frame:close[close.length-1],segment:'closed',holding:true};}
  const index=Math.floor(ms/GENERATOR_FRAME_MS);
  return index<open.length?
   {frame:open[index],segment:'opening',holding:false}:
   {frame:close[index-open.length],segment:'closing',holding:false};
 }
 function generatorFrame(phases,elapsedMs){return generatorPose(phases,elapsedMs)?.frame??null;}
 function validateGeneratorCommand(disk){
  if(!(disk instanceof Uint8Array))throw Error('Original Disk.1 required');
  const sig=[0x42,0x6D,0,0x20,0x42,0x6D,0,0x1E,0x54,0x6D,0,0x22];
  if(sig.some((b,i)=>disk[0x8B58E+i]!==b))throw Error('Native $8048 handler differs from research baseline');
  return true;
 }
 return Object.freeze({SUBQ_RAM,SUBQ_DISK,IMAGE_COUNT,validate,toBitmap,bitmapFrames,generatorPhases,generatorPose,generatorFrame,validateGeneratorCommand});
});
