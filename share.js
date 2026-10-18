/* Local-only JPG export. The prepared File keeps iOS sharing in the click gesture. */
(()=>{
 'use strict';
 const ids={buyer:{card:'buyerCard',button:'shareBuyer',status:'shareBuyerStatus',filename:'pokupets'},seller:{card:'sellerCard',button:'shareSeller',status:'shareSellerStatus',filename:'prodavets'}};
 const files=new Map(),jobs=new Map();let revision=0,timer=0,sharing=false;
 const active=()=>document.getElementById('sellerPanel').hidden?'buyer':'seller';
 const hasReport=payer=>!!document.querySelector('#'+ids[payer].card+' .report-grand');
 function status(payer,message){const el=document.getElementById(ids[payer].status);el.textContent=message;el.hidden=!message}
 function updateButtons(){for(const [payer,config]of Object.entries(ids)){
  const button=document.getElementById(config.button),ready=files.get(payer)?.revision===revision;
  button.disabled=sharing||!hasReport(payer)||!ready;
  button.textContent=hasReport(payer)&&!ready?'Готуємо JPG…':'Поділитися з клієнтом';
 }}
 async function capture(payer,currentRevision){
  await document.fonts.ready;
  const source=document.getElementById(ids[payer].card);
  if(!source.querySelector('.report-grand')||currentRevision!==revision)return;
  if(typeof window.html2canvas!=='function')throw Error('Image renderer unavailable');
  const width=Math.round(source.getBoundingClientRect().width||document.querySelector('.reports-column').getBoundingClientRect().width-2);
  const shell=document.createElement('section');shell.className='report-panel share-export';shell.setAttribute('aria-hidden','true');
  Object.assign(shell.style,{position:'fixed',left:'-10000px',top:'0',width:width+'px',pointerEvents:'none',zIndex:'-1'});
  const clone=source.cloneNode(true);clone.removeAttribute('id');clone.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));
  // Preserve the current article padding and all text, including scrolled-out rows.
  const computed=getComputedStyle(source);clone.style.padding=computed.padding;
  shell.append(clone);document.body.append(shell);
  try{
   const canvas=await window.html2canvas(shell,{scale:Math.min(3,Math.max(2,window.devicePixelRatio||1)),backgroundColor:getComputedStyle(shell).backgroundColor,logging:false,useCORS:true,scrollX:0,scrollY:0});
   const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('Empty JPG')),'image/jpeg',.94));
   if(currentRevision!==revision)return;
   const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   const file=new File([blob],`rozrakhunok-${ids[payer].filename}-${date}.jpg`,{type:'image/jpeg'});
   files.set(payer,{revision:currentRevision,file});status(payer,'');return file;
  }finally{shell.remove()}
 }
 function prepare(payer){
  if(files.get(payer)?.revision===revision)return Promise.resolve(files.get(payer).file);
  if(!hasReport(payer))return Promise.resolve();
  if(jobs.get(payer)?.revision===revision)return jobs.get(payer).promise;
  const currentRevision=revision;
  const promise=capture(payer,currentRevision).catch(error=>{
   if(currentRevision===revision){const b=document.getElementById(ids[payer].button);b.disabled=false;b.textContent='Повторити підготовку JPG';status(payer,'Не вдалося підготувати картинку. Спробуй ще раз.');console.error('JPG export failed',error)}
  }).finally(()=>{
   if(jobs.get(payer)?.revision===currentRevision)jobs.delete(payer);
   if(currentRevision===revision&&files.has(payer))updateButtons();
  });
  jobs.set(payer,{revision:currentRevision,promise});return promise;
 }
 function refresh(){
  revision++;files.clear();clearTimeout(timer);
  for(const payer of Object.keys(ids))status(payer,'');updateButtons();
  timer=setTimeout(()=>prepare(active()),250);
 }
 function download(file){
  const url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download=file.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
 async function share(payer){
  const cached=files.get(payer);
  if(!cached||cached.revision!==revision){await prepare(payer);return}
  if(sharing)return;
  sharing=true;updateButtons();status(payer,'');
  try{
   const file=cached.file;
   if(navigator.share&&navigator.canShare?.({files:[file]})){
    // No rendering, timer or await before this call: retain transient user activation.
    await navigator.share({files:[file]});
   }else{download(file);status(payer,'JPG завантажено — його можна надіслати клієнту.')}
  }catch(error){
   if(error.name!=='AbortError'){
    if(error.name==='NotAllowedError'||error.name==='TypeError'){download(cached.file);status(payer,'Браузер не відкрив меню поширення. JPG завантажено.')}
    else status(payer,'Не вдалося поділитися. Спробуй ще раз.');
   }
  }finally{sharing=false;updateButtons()}
 }
 for(const [payer,config]of Object.entries(ids)){
  document.getElementById(config.button).addEventListener('click',()=>share(payer));
  new MutationObserver(refresh).observe(document.getElementById(config.card),{childList:true,subtree:true,characterData:true});
 }
 document.querySelector('.report-switch').addEventListener('click',()=>{updateButtons();prepare(active())});
 const visualKey=()=>['--paper-bg','--paper-ink','--paper-muted','--paper-line','--paper-tint','--report-bg','--report-soft'].map(k=>document.body.style.getPropertyValue(k)).join('|');
 let previousVisualKey=visualKey();
 new MutationObserver(()=>{const key=visualKey();if(key!==previousVisualKey){previousVisualKey=key;refresh()}}).observe(document.body,{attributes:true,attributeFilter:['style','class']});
 window.addEventListener('resize',refresh);document.fonts.ready.then(refresh);refresh();
})();
