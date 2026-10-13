/* P11.1: collapsible Worlds. Works with stock P03 app.js, file:// and the P11 viewer. */
(function(root,factory){
 'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 root.NZSWorldNavigation=api;
 if(typeof document==='undefined')return;
 function setup(){
  const host=document.getElementById('levels'),title=document.getElementById('mapName'),stage=document.getElementById('overviewLevel');
  if(!host||!title||!stage||!root.NZS_STOCK)return;
  const names=api.WORLDS;let groups=[];
  for(const element of Array.from(host.children)){
   if(element.classList.contains('world-label')){
    const world=groups.length+1;
    const details=document.createElement('details');details.className='world-fold';details.dataset.world=String(world);
    const heading=document.createElement('summary');heading.textContent=api.worldLabel(world);heading.title='Expand or collapse '+api.worldLabel(world);
    heading.setAttribute('aria-label','Toggle '+api.worldLabel(world));
    const list=document.createElement('div');list.className='world-levels';
    details.append(heading,list);host.replaceChild(details,element);groups.push({details,list,heading});
   }else if(element.classList.contains('level-row')&&groups.length){groups[groups.length-1].list.appendChild(element);}
  }
  if(groups.length!==5)return;
  const counts=groups.map(g=>g.list.querySelectorAll('.level-row').length);
  groups.forEach((g,i)=>{
   const n=document.createElement('small');n.textContent=String(counts[i]);n.title=counts[i]+' maps';g.heading.appendChild(n);
   g.details.addEventListener('toggle',()=>{
    if(!g.details.open)return;
    groups.forEach(other=>{if(other!==g)other.details.open=false;});
   });
  });
  function sync(){
   const value=String(stage.textContent||'').trim(),world=api.worldForLevel(value);
   if(!world)return;
   const group=groups[world-1];
   if(!groups.some(g=>g.details.open))group.details.open=true;
   const level=value.split('_')[1],s=api.worldLabel(world)+' · Level '+(level==='4b'?'4b':String(Number(level)));
   if(title.textContent!==s)title.textContent=s;
  }
  // app.js refreshControls() overwrites the map title after editing. Reapply
  // the world name via a guarded mutation observer, without modifying P03.
  const observer=new MutationObserver(sync);
  observer.observe(stage,{childList:true,subtree:true,characterData:true});
  observer.observe(title,{childList:true});
  sync();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';const WORLDS=Object.freeze(['Auckland','Rotorua','Waitomo Caves','Strait Cook','Mt. Cook']);
 const LEVELS=Object.freeze(['1_1','1_2','1_3','1_4','2_1','2_2','2_3','2_4','3_1','3_2','3_3','3_4','4_1','4_2','4_3','4_4','4_4b','5_1','5_2','5_3','5_4']);
 function worldLabel(n){if(!Number.isInteger(n)||n<1||n>5)throw RangeError('Invalid world');return `World ${n} - ${WORLDS[n-1]}`;}
 function worldForLevel(level){if(typeof level!=='string')return 0;const n=Number(level.split('_')[0]);return /^[1-5]_(?:[1-4]|4b)$/.test(level)&&n>=1&&n<=5?n:0;}
 return Object.freeze({WORLDS,LEVELS,worldLabel,worldForLevel});
});
