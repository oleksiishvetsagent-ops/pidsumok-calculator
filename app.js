'use strict';
const $=id=>document.getElementById(id), currency=(n,c='USD',digits=0)=>new Intl.NumberFormat('uk-UA',{style:'currency',currency:c,currencyDisplay:'narrowSymbol',minimumFractionDigits:digits,maximumFractionDigits:digits}).format(n), fmt=n=>new Intl.NumberFormat('uk-UA',{maximumFractionDigits:2}).format(n), fmtWhole=n=>new Intl.NumberFormat('uk-UA',{maximumFractionDigits:0}).format(n);
let reportPayer='buyer',amountUnit='USD';
const amountToUsd=(value,fx)=>amountUnit==='UAH'?value/fx:value;
const amountFromUsd=(value,fx)=>amountUnit==='UAH'?value*fx:value;
const amountInputValue=value=>DealCalc.formatAmountInput(String(Number(value.toFixed(2))));
let rows=DealCalc.defaults.map(r=>({...r})),mode='price',result=null,rateMeta=null,manual=false,fetching=false,editVersion=0;
const readStore=k=>{try{return JSON.parse(localStorage.getItem(k))}catch{return null}},saveStore=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
if(readStore('deal-theme')==='dark')document.body.classList.add('dark');
const todayText=new Intl.DateTimeFormat('uk-UA',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Kyiv'}).format(new Date());
$('theme').onclick=()=>{document.body.classList.toggle('dark');saveStore('deal-theme',document.body.classList.contains('dark')?'dark':'light');applyAppearance()};
function buildRows(){ $('rows').innerHTML=rows.map(r=>`<tr data-row="${r.id}" class="${r.payer==='none'?'disabled-row':''}"><td>${r.name}${r.bank?'<span class="fee-caption">+ 1% банку від суми збору</span>':''}</td><td><div class="fee-edit"><input aria-label="${r.name}: ставка або сума" type="number" min="0" max="1000000000" step="0.01" value="${r.value}" data-field="value"><select class="unit-select" aria-label="${r.name}: одиниця" data-field="unit">${[['%','%'],['UAH','₴'],['USD','$']].map(([v,t])=>`<option value="${v}" ${r.unit===v?'selected':''}>${t}</option>`).join('')}</select></div></td><td><div class="payer-control ${r.payer==='seller'?'is-seller':''}"><select aria-label="${r.name}: платник" data-field="payer">${[['none','Не враховувати'],['buyer','Покупець'],['seller','Продавець'],['half','Навпіл']].map(([v,t])=>`<option value="${v}" ${r.payer===v?'selected':''}>${t}</option>`).join('')}</select><svg class="payer-house" aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="m2 9 8-7 8 7M4 8v10h12V8M8 18v-6h4v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div></td><td class="right" id="fee-${r.id}">—</td></tr>`).join(''); }
buildRows();
$('rows').addEventListener('input',e=>{const field=e.target.dataset.field;if(!field)return;const row=rows.find(r=>r.id===e.target.closest('tr').dataset.row);row[field]=field==='value'?(e.target.value===''?NaN:Number(e.target.value)):e.target.value;e.target.closest('tr').classList.toggle('disabled-row',row.payer==='none');e.target.closest('tr').querySelector('.payer-control').classList.toggle('is-seller',row.payer==='seller');render()});
function setMode(next){if(next===mode)return;if(result)$('amount').value=amountInputValue(amountFromUsd(next==='budget'?result.buyerTotal:result.price,Number($('fx').value)));mode=next;for(const [id,val]of [['modePrice','price'],['modeBudget','budget']]){$(id).classList.toggle('active',mode===val);$(id).setAttribute('aria-pressed',String(mode===val))}$('amountLabel').textContent=mode==='price'?'Ціна квартири':'Загальний бюджет покупця';$('modeHint').textContent=mode==='price'?'Без оформлення та супроводу':'З оформленням та супроводом';render()}
$('modePrice').onclick=()=>setMode('price');$('modeBudget').onclick=()=>setMode('budget');
function invalid(msg){
 result=null;$('error').hidden=!msg;$('error').textContent=msg;$('amountUah').textContent='—';$('budgetNote').hidden=true;
 for(const r of rows)$('fee-'+r.id).textContent='—';
 $('pdfBuyer').disabled=$('pdfSeller').disabled=true;
 for(const [id,label]of [['buyerCard','ПОКУПЦЯ'],['sellerCard','ПРОДАВЦЯ']])$(id).innerHTML=`<div class="report-audience">РОЗРАХУНОК ДЛЯ ${label}</div><p>Вкажи коректні параметри угоди, щоб побачити звіт.</p>`;
}
function render(){
 const enteredAmount=DealCalc.parseAmountInput($('amount').value),fx=Number($('fx').value),valuation=Number($('valuation').value),amount=amountToUsd(enteredAmount,fx);
 if($('amount').value===''){invalid('');return}
 if(!Number.isFinite(fx)||fx<=0||fx>10000){invalid(fetching?'':'Вкажи додатний курс долара або натисни ↻ для оновлення.');return}
 if($('amount').value===''||!Number.isFinite(enteredAmount)||enteredAmount<0||enteredAmount>1e9||!Number.isFinite(valuation)||valuation<0||valuation>1e9||rows.some(r=>!Number.isFinite(r.value)||r.value<0||r.value>1e9)){invalid('Введи невід’ємні суми та ставки (до 1 000 000 000).');return}
 result=mode==='price'?DealCalc.calculate(Math.round(amount*100)/100,fx,valuation,rows):DealCalc.solve(DealCalc.budgetInUsd(enteredAmount,fx,amountUnit),fx,valuation,rows);
 if(!result){invalid('Бюджет менший за обов’язкові платежі. Збільш бюджет або зміни умови оформлення.');return}
 $('error').hidden=true;$('pdfBuyer').disabled=$('pdfSeller').disabled=false;$('amountUah').textContent=amountUnit==='USD'?currency(amount*fx,'UAH'):currency(amount);
 $('budgetNote').hidden=mode!=='budget';$('budgetNote').textContent='Ціну квартири підібрано в межах бюджету. Залишок після округлення: '+currency(amount-result.buyerTotal)+'.';
 for(const r of result.lines){$('fee-'+r.id).textContent=r.payer==='none'?'—':fmtWhole(r.total)+'\u00a0$';$('fee-'+r.id).title=r.bank?`Збір ${currency(r.tax)} + банк ${currency(r.bank)}`:currency(r.total)}
 renderDetailCard('buyer');renderDetailCard('seller');
}
function notaryUah(r,payer='buyer'){return DealCalc.paymentUah(r,payer,Number($('fx').value))}
function selectReport(payer){
 reportPayer=payer;
 $('buyerPanel').hidden=payer!=='buyer';$('sellerPanel').hidden=payer!=='seller';
 for(const [id,value]of [['showBuyer','buyer'],['showSeller','seller']]){$(id).classList.toggle('active',payer===value);$(id).setAttribute('aria-pressed',String(payer===value))}
 updateParallax();
}
$('showBuyer').onclick=()=>selectReport('buyer');$('showSeller').onclick=()=>selectReport('seller');
function renderDetailCard(payer){
 if(!result)return;
 const buyer=payer==='buyer',active=result.lines.filter(r=>r[payer]>0),fx=Number($('fx').value),total=buyer?result.buyerTotal:result.sellerTotal;
 $(buyer?'buyerCard':'sellerCard').innerHTML=`<div class="report-meta"><h2 class="report-audience">РОЗРАХУНОК ДЛЯ ${buyer?'ПОКУПЦЯ':'ПРОДАВЦЯ'}</h2><div class="report-date">${todayText} · Курс ${fmt(fx)} грн / $${manual?' · вручну':''}</div></div><div class="report-grand"><span>${buyer?'Загальна сума з усіма витратами':'Продавець отримує чистими'}</span><div class="report-amounts"><strong>${currency(total,'USD',buyer?0:2)}</strong><small>(${fmtWhole(total*fx)+' грн'})</small></div></div><div class="report-price"><span>Вартість квартири</span><strong>${currency(result.price)}</strong></div><div class="report-fees"><span>Податки та оформлення угоди:</span><strong>${buyer?'+':'−'} ${currency(buyer?result.buyerFees:result.sellerFees)}</strong></div><div class="report-section-label">ДЕТАЛЬНО:</div><dl class="report-lines">${active.map(r=>`<div><dt>${r.name}${r.payer==='half'&&r.id!=='notary'?`<small>Частка ${buyer?'покупця':'продавця'} — 50%</small>`:''}${r.bank?'<small>+ 1% — комісію банку вже враховано</small>':''}</dt><dd>${currency(r[payer])}${r.id==='notary'?`<small class="notary-uah">(${fmtWhole(notaryUah(r,payer))} грн)</small>`:''}</dd></div>`).join('')||'<div class="no-payments">Окремі платежі за оформлення не обрано.</div>'}</dl>`;
}
$('amountCurrency').onclick=()=>{
 const fx=Number($('fx').value),value=$('amount').value;
 if(!Number.isFinite(fx)||fx<=0||fx>10000){$('error').hidden=false;$('error').textContent='Спочатку вкажи коректний курс долара.';return}
 const usd=value===''?null:amountToUsd(DealCalc.parseAmountInput(value),fx);
 amountUnit=amountUnit==='USD'?'UAH':'USD';
 $('amountCurrency').textContent=amountUnit==='USD'?'$':'₴';
 $('amountCurrency').setAttribute('aria-label',amountUnit==='USD'?'Валюта суми: долари. Перемкнути на гривні':'Валюта суми: гривні. Перемкнути на долари');
 if(usd!==null&&Number.isFinite(usd))$('amount').value=amountInputValue(amountFromUsd(usd,fx));
 render();
};
function formatAmountField(){
 const field=$('amount'),raw=field.value,start=field.selectionStart,end=field.selectionEnd;
 const logical=position=>raw.slice(0,position).replace(/\s/g,'').length;
 const from=logical(start),to=logical(end),formatted=DealCalc.formatAmountInput(raw);
 if(formatted===raw)return;
 const position=count=>{let digits=0,index=0;while(index<formatted.length&&digits<count){if(!/\s/.test(formatted[index]))digits++;index++}return index};
 field.value=formatted;field.setSelectionRange(position(from),position(to));
}
$('amount').oninput=()=>{formatAmountField();render()};
$('amount').addEventListener('beforeinput',event=>{
 const field=event.target,start=field.selectionStart,end=field.selectionEnd,back=event.inputType==='deleteContentBackward',forward=event.inputType==='deleteContentForward';
 if(start!==end||(!back&&!forward))return;
 // Deleting next to a grouping space should remove a digit, not get stuck on the space.
 if(back&&start>1&&/\s/.test(field.value[start-1])){
  event.preventDefault();field.setRangeText('',start-2,start,'start');formatAmountField();render();
 }else if(forward&&/\s/.test(field.value[start]||'x')){
  event.preventDefault();field.setRangeText('',start,start+2,'start');formatAmountField();render();
 }
});
$('valuation').oninput=render;
$('fx').oninput=()=>{manual=true;editVersion++;$('rateStatus').textContent='Курс введено вручну';render()};
const garantSource='https://garant.money/uk-UA/currency_rates/USD-UAH-kyiv';
function validGarantRate(meta){return meta?.source==='garant-graph'&&Number.isFinite(meta.rate)&&meta.rate>0&&meta.rate<10000&&Number.isFinite(Date.parse(meta.fetchedAt))&&/^\d{4}-\d{2}-\d{2}$/.test(meta.rateDate||'')}
function showRate(meta,cached=false){
 const time=new Intl.DateTimeFormat('uk-UA',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Kyiv'}).format(new Date(meta.fetchedAt));
 $('rateStatus').textContent=(Date.now()-Date.parse(meta.fetchedAt)>2*60*60*1000?'Курс старший за 2 год · ':cached?'Збережений курс · ':'Оновлено · ')+time;
}
async function updateRate(){
 if(fetching)return;fetching=true;const version=editVersion;$('refresh').disabled=true;$('rateStatus').textContent='Отримуємо курс…';
 try{
  const response=await fetch('rate.json',{signal:AbortSignal.timeout(12000),cache:'no-store'});if(!response.ok)throw Error('HTTP');
  const meta=await response.json();if(!validGarantRate(meta))throw Error('Invalid Garant rate');
  saveStore('deal-garant-rate',meta);
  if(version===editVersion){rateMeta=meta;manual=false;$('fx').value=meta.rate.toFixed(2);showRate(meta)}
 }catch{
  if(version===editVersion){
   if(manual)$('rateStatus').textContent='Оновлення недоступне · залишено ручний курс';
   else if(rateMeta){showRate(rateMeta,true);$('rateStatus').textContent+=' · оновлення не вдалося'}
   else $('rateStatus').textContent='Курс Гаранта недоступний · введи вручну';
  }
 }finally{fetching=false;$('refresh').disabled=false;render()}
}
$('refresh').onclick=updateRate;
const cached=readStore('deal-garant-rate');if(validGarantRate(cached)){rateMeta=cached;$('fx').value=cached.rate;showRate(cached,true)}
$('quickCalculate').onclick=()=>{
 render();if(!result){$('error').hidden=false;$('error').textContent=$('amount').value===''?'Введи ціну квартири, щоб порахувати.':$('error').textContent;$('amount').focus();return}
 $('amount').blur();$('valuation').blur();$('fx').blur();selectReport('buyer');
 requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo({top:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),behavior:motionPreference.matches?'auto':'smooth'})));
};
function printReport(payer){
 if(!result)return;
 const fx=Number($('fx').value),buyer=payer==='buyer',active=result.lines.filter(r=>r[payer]>0);
 const rateText=manual?'Курс введено вручну':rateMeta?'Курс графіка обмінника Гарант; отримано '+new Date(rateMeta.fetchedAt).toLocaleString('uk-UA',{timeZone:'Europe/Kyiv'}):'Курс введено вручну';
 $('printReport').innerHTML=`<div class="print-header"><span>${todayText}</span><span>Калькулятор угоди</span></div><h1>${buyer?'Покупець':'Продавець'} — деталізація</h1><p>Курс: ${fmt(fx)} грн / $ · ${rateText}<br>Оцінка: ${currency(Number($('valuation').value)||result.price)}</p><table><thead><tr><th>Стаття</th><th>Ставка / сума</th><th>Частка</th><th>Сума, $</th><th>Сума, грн</th></tr></thead><tbody><tr><td>Ціна квартири</td><td>${currency(result.price)}</td><td>100%</td><td>${fmtWhole(result.price)}</td><td>${fmtWhole(result.price*fx)}</td></tr>${active.map(r=>`<tr><td>${r.name}${r.id==='notary'?`<br><small>(${fmtWhole(notaryUah(r,payer))} грн)</small>`:''}${r.bank?'<br><small>1% банку від збору враховано</small>':''}</td><td>${r.id==='notary'?fmtWhole(notaryUah(r,payer))+' грн':(r.unit==='%'?fmt(r.value):fmtWhole(r.value))+' '+(r.unit==='UAH'?'грн':r.unit==='USD'?'$':'%')}</td><td>${r.id==='notary'?'—':r.payer==='half'?'50%':'100%'}</td><td>${fmtWhole(r[payer])}</td><td>${fmtWhole(DealCalc.paymentUah(r,payer,fx))}</td></tr>`).join('')}</tbody></table><p class="print-total">${buyer?'Загальна сума з усіма витратами':'Чистими на руки'}: ${currency(buyer?result.buyerTotal:result.sellerTotal,'USD',buyer?0:2)}</p><p>${currency((buyer?result.buyerTotal:result.sellerTotal)*fx,'UAH')}</p><small>Комісія агентства у цьому розрахунку — від фактичної ціни квартири.<br>ПДФО, пенсійний фонд та військовий збір — від більшої з двох сум: ціни квартири та оцінки. Банківська комісія становить 1% суми відповідного збору та врахована в підсумку. Суми відображено з округленням до долара та гривні; чиста сума продавця — до центів.</small>`;
 window.print();
}
$('pdfBuyer').onclick=()=>printReport('buyer');$('pdfSeller').onclick=()=>printReport('seller');
render();updateRate();setInterval(()=>{if(!manual&&!document.hidden)updateRate()},15*60*1000);

const backgroundPalette=[
 ['linen','Льон','#f6f5f0','#22251f'],['sage','Шавлія','#edf2e9','#1e2921'],['mint','М’ята','#eaf5ef','#1b2b27'],['pistachio','Фісташка','#f1f4e5','#282c1e'],['sky','Небесний','#edf5fa','#1b2730'],['ice','Крижаний','#eaf3f4','#1a2b2d'],['sand','Пісочний','#f6f0e5','#2d271e'],['lavender','Лаванда','#f1edf8','#282231'],['lilac','Бузок','#f6eef5','#2d222c']
];
const reportPalette=[['forest','Лісовий','#1c4237'],['pine','Хвойний','#254f49'],['olive','Оливковий','#414b32'],['ocean','Океан','#25475e'],['slate','Блакитний сланець','#3c5065'],['cocoa','Какао','#544638'],['plum','Сливовий','#4c3659'],['violet','Фіолетовий','#45416a']];
const patternPalette=[['dollar','Долари','$'],['home','Будиночки','⌂'],['dots','Крапки','···'],['none','Без патерну','—']];
const surfacePalette=[['classic','Класичний'],['liquid','Рідке скло']];
const motionPalette=[['auto','Як у системі'],['slow','Повільний'],['still','Без руху']];
const defaultAppearance={motion:'slow',surface:'liquid',background:'pistachio',report:'forest',pattern:'none'};
const savedAppearance=readStore('deal-appearance')||{};
let appearance={...defaultAppearance};
for(const [key,palette]of [['motion',motionPalette],['surface',surfacePalette],['background',backgroundPalette],['report',reportPalette],['pattern',patternPalette]])if(palette.some(p=>p[0]===savedAppearance[key]))appearance[key]=savedAppearance[key];
function patternImage(kind,dark){
 const color=dark?'#d9e5df':'#315c4d';const opacity=dark?'.07':'.065';
 const dollar=`<g fill="${color}" fill-opacity="${opacity}" font-family="Georgia,serif" font-size="40"><text x="27" y="53" transform="rotate(-18 40 40)">$</text><text x="107" y="133" transform="rotate(-18 120 120)">$</text></g>`;
 const house=`<g fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="2"><path d="M22 45 40 29 58 45M27 42v22h26V42M36 64V51h8v13M102 125l18-16 18 16m-31-3v22h26v-22m-17 22v-13h8v13"/></g>`;
 const dots=`<g fill="${color}" fill-opacity="${dark?'.13':'.10'}"><circle cx="20" cy="20" r="2"/><circle cx="60" cy="60" r="2"/><circle cx="100" cy="20" r="2"/><circle cx="140" cy="60" r="2"/><circle cx="20" cy="100" r="2"/><circle cx="60" cy="140" r="2"/><circle cx="100" cy="100" r="2"/><circle cx="140" cy="140" r="2"/></g>`;
 if(kind==='none')return 'none';
 return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">${kind==='home'?house:kind==='dots'?dots:dollar}</svg>`)}")`;
}
function mixColor(hex,other,amount){
 const a=hex.slice(1).match(/../g).map(n=>parseInt(n,16)),b=other.slice(1).match(/../g).map(n=>parseInt(n,16));
 return '#'+a.map((n,i)=>Math.round(n+(b[i]-n)*amount).toString(16).padStart(2,'0')).join('');
}
function colorHue(hex){
 const [r,g,b]=hex.slice(1).match(/../g).map(n=>parseInt(n,16)/255),hi=Math.max(r,g,b),lo=Math.min(r,g,b),d=hi-lo;
 if(!d)return 156;
 return ((hi===r?(g-b)/d:hi===g?(b-r)/d+2:(r-g)/d+4)*60+360)%360;
}
const motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
let parallaxFrame=0,parallaxPosition=0;
function updateParallax(){if(!parallaxFrame)parallaxFrame=requestAnimationFrame(animateParallax)}
function animateParallax(){
 parallaxFrame=0;
 const enabled=document.body.classList.contains('liquid-surface')&&appearance.motion!=='still'&&(appearance.motion==='slow'||!motionPreference.matches);
 const room=Math.min(144,Math.max(80,innerHeight*.15));
 const range=Math.max(1,document.documentElement.scrollHeight-innerHeight);
 const target=enabled?(.5-Math.max(0,Math.min(1,scrollY/range)))*room*1.4:0;
 parallaxPosition=enabled?parallaxPosition+(target-parallaxPosition)*.08:0;
 if(Math.abs(target-parallaxPosition)<.1)parallaxPosition=target;
 document.body.style.setProperty('--liquid-shift',parallaxPosition.toFixed(2)+'px');
 if(parallaxPosition!==target)parallaxFrame=requestAnimationFrame(animateParallax);
}
window.addEventListener('scroll',updateParallax,{passive:true});
window.addEventListener('resize',updateParallax);
window.addEventListener('load',updateParallax);
motionPreference.addEventListener('change',updateParallax);
function applyAppearance(){
 const dark=document.body.classList.contains('dark'),bg=backgroundPalette.find(p=>p[0]===appearance.background),report=reportPalette.find(p=>p[0]===appearance.report);
 document.body.classList.toggle('liquid-surface',appearance.surface==='liquid');
 document.body.classList.toggle('motion-explicit',appearance.motion==='slow');
 $('motionFieldset').hidden=appearance.surface!=='liquid';
 $('motionChoices').innerHTML=motionPalette.map(p=>`<button type="button" class="motion-option" data-appearance="motion" data-choice="${p[0]}" aria-pressed="${appearance.motion===p[0]}" aria-label="Рух фону: ${p[1]}">${p[1]}</button>`).join('');
 $('backgroundFieldset').hidden=$('patternFieldset').hidden=appearance.surface==='liquid';
 $('surfaceChoices').innerHTML=surfacePalette.map(p=>`<button type="button" class="surface-option surface-${p[0]}" data-appearance="surface" data-choice="${p[0]}" aria-pressed="${appearance.surface===p[0]}" aria-label="Стиль фону: ${p[1]}"><span class="surface-thumbnail" aria-hidden="true"></span><span>${p[1]}</span></button>`).join('');
 document.body.style.setProperty('--bg',bg[dark?3:2]);
 const tone=report[2],white='#ffffff',black='#000000';
 const tokens=dark?{
  '--card':mixColor(tone,black,.50),'--ink':mixColor(tone,white,.91),'--muted':mixColor(tone,white,.68),
  '--line':mixColor(tone,white,.19),'--accent':mixColor(tone,white,.74),'--tint':mixColor(tone,black,.20),
  '--input':mixColor(tone,black,.33),'--active-row':mixColor(tone,white,.08)
 }:{
  '--card':mixColor(tone,white,.98),'--ink':mixColor(tone,black,.24),'--muted':mixColor(tone,white,.24),
  '--line':mixColor(tone,white,.81),'--accent':tone,'--tint':mixColor(tone,white,.91),
  '--input':mixColor(tone,white,.96),'--active-row':mixColor(tone,white,.88)
 };
 Object.assign(tokens,{'--report-bg':tone,'--report-muted':mixColor(tone,white,.70),'--report-soft':mixColor(tone,white,.86),
 '--report-total-bg':mixColor(tone,white,.86),'--report-total-ink':mixColor(tone,black,.17),
 '--liquid-base':mixColor(tone,black,.77),'--liquid-hue':(colorHue(tone)-156).toFixed(1)+'deg'});
 Object.assign(tokens,{'--paper-bg':mixColor(tone,white,.985),'--paper-ink':mixColor(tone,black,.24),'--paper-muted':mixColor(tone,white,.24),'--paper-line':mixColor(tone,white,.82),'--paper-tint':mixColor(tone,white,.96)});
 const chevron=color=>`url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8"><path d="m1 1 5 5 5-5" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`)}")`;
 tokens['--select-chevron']=chevron(tokens['--ink']);tokens['--payer-chevron']=chevron('#f8faf3');
 const glow=mixColor(tone,white,.45).slice(1).match(/../g).map(n=>parseInt(n,16));
 tokens['--buyer-glow']=glow.join(' ');
 for(const [key,value]of Object.entries(tokens))document.body.style.setProperty(key,value);
 document.body.style.setProperty('--money-pattern',patternImage(appearance.pattern,dark).replaceAll(encodeURIComponent(dark?'#d9e5df':'#315c4d'),encodeURIComponent(dark?tokens['--report-soft']:tone)));
 updateParallax();
 for(const [id,key,palette]of [['backgroundChoices','background',backgroundPalette],['reportChoices','report',reportPalette],['patternChoices','pattern',patternPalette]]){
  $(id).innerHTML=palette.map(p=>`<button type="button" data-appearance="${key}" data-choice="${p[0]}" aria-pressed="${appearance[key]===p[0]}" aria-label="${key==='background'?'Фон':key==='report'?'Звіт':'Патерн'}: ${p[1]}" class="${key==='pattern'?'pattern-option':'swatch-option'}">${key==='pattern'?`<span class="pattern-symbol">${p[2]}</span>`:`<span class="color-dot" style="background:${p[2]}"></span>`}<span>${p[1]}</span></button>`).join('');
 }
}
$('appearanceButton').onclick=()=>$('appearanceDialog').showModal();
$('closeAppearance').onclick=$('doneAppearance').onclick=()=>$('appearanceDialog').close();
$('appearanceDialog').addEventListener('click',e=>{const button=e.target.closest('[data-appearance]');if(!button)return;appearance[button.dataset.appearance]=button.dataset.choice;saveStore('deal-appearance',appearance);const label=button.getAttribute('aria-label');applyAppearance();Array.from($('appearanceDialog').querySelectorAll('[data-appearance]')).find(b=>b.getAttribute('aria-label')===label)?.focus()});
$('resetAppearance').onclick=()=>{appearance={...defaultAppearance};document.body.classList.remove('dark');saveStore('deal-theme','light');saveStore('deal-appearance',appearance);applyAppearance()};
applyAppearance();

// Keep optional fee editing out of the initial desktop view.
const expenseDesktop=window.matchMedia('(min-width: 861px)');
let expensesExpanded=false;
function syncExpensePanel(){
 const desktop=expenseDesktop.matches,open=!desktop||expensesExpanded;
 $('expenseDetails').hidden=!open;
 $('expensesCard').classList.toggle('is-expanded',open);
 $('expensesCard').closest('.workspace').classList.toggle('fees-collapsed',desktop&&!expensesExpanded);
 $('toggleExpenses').hidden=!desktop;
 $('toggleExpenses').setAttribute('aria-expanded',String(open));
 $('toggleExpenses').textContent=expensesExpanded?'Згорнути витрати':'Уточнити витрати';
 updateParallax();
}
$('toggleExpenses').onclick=()=>{expensesExpanded=!expensesExpanded;syncExpensePanel()};
expenseDesktop.addEventListener('change',syncExpensePanel);
syncExpensePanel();
