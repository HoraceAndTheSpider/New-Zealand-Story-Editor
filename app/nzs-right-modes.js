/* P19: Tile and Entity are mutually exclusive workspace panels.
 * Reparents existing live DOM nodes; no editor state or map data is duplicated.
 */
(function(root){'use strict';if(typeof document==='undefined')return;
 function init(){
  const right=document.querySelector('.side.right');if(!right)return;
  const all=[...right.children],tile=document.createElement('div'),entity=document.createElement('div');
  tile.id='p19TilePanel';tile.className='p19-side-pane';entity.id='p19EntityPanel';entity.className='p19-side-pane';
  for(const el of all)(el.id==='p11EntityInspector'||el.id==='p12SpriteBrowser'?entity:tile).append(el);
  const nav=document.createElement('div');nav.className='p19-mode-switch';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Editor mode');
  nav.innerHTML='<button type="button" id="p19TileMode" role="tab" aria-controls="p19TilePanel">Tiles</button><button type="button" id="p19EntityMode" role="tab" aria-controls="p19EntityPanel">Entities</button>';
  right.append(nav,tile,entity);
  const tileBtn=nav.querySelector('#p19TileMode'),entityBtn=nav.querySelector('#p19EntityMode');
  let mode='tile';
  function select(m){mode=m;
   const e=m==='entity';tile.hidden=e;entity.hidden=!e;
   tileBtn.classList.toggle('selected',!e);entityBtn.classList.toggle('selected',e);
   tileBtn.setAttribute('aria-selected',String(!e));entityBtn.setAttribute('aria-selected',String(e));
   if(e&&!document.getElementById('p11Inspect')?.classList.contains('selected'))document.getElementById('p11Inspect')?.click();
   if(!e&&document.getElementById('p11Inspect')?.classList.contains('selected'))document.getElementById('p11Inspect')?.click();
   right.scrollTop=0;
   root.dispatchEvent(new CustomEvent('nzs:editor-mode',{detail:{mode:m}}));
  }
  tileBtn.onclick=()=>select('tile');entityBtn.onclick=()=>select('entity');
  document.getElementById('p11Inspect')?.addEventListener('click',()=>{
   const inspect=document.getElementById('p11Inspect');
   if(mode==='tile'&&inspect.classList.contains('selected'))select('entity');
   else if(mode==='entity'&&!inspect.classList.contains('selected')){
    queueMicrotask(()=>{if(mode==='entity'&&!inspect.classList.contains('selected')&&!document.getElementById('p12Ghost')?.classList.contains('selected'))inspect.click();});
   }
  });
  root.addEventListener('nzs:entity-selected',()=>{if(mode!=='entity')select('entity');});
  select('tile');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(typeof window!=='undefined'?window:globalThis);
