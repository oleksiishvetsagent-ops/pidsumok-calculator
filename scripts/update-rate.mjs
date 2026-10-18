import {writeFile,readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export const sourceUrl='https://garant.money/uk-UA/currency_rates/USD-UAH-kyiv';
export const endpoint='https://garant.money/apiCl/cached/apiV2/get_best_rates_history';
const kyivDate=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export function extractRate(history,now=new Date()){
 if(!Array.isArray(history)||!history.length)throw Error('Empty Garant history');
 const rows=history.filter(r=>r.currency==='USD'&&String(r.currency_type)==='0').sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)));
 const last=rows.at(-1);if(!last)throw Error('No USD graph rate');
 const rate=Number(last.best_bid),sale=Number(last.best_ask),date=last.created_at;
 if(!(rate>0&&sale>=rate&&sale<10000)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||date>kyivDate(now)||date<kyivDate(new Date(now.getTime()-8*86400000)))throw Error('Invalid Garant graph rate');
 // Garant's USD→UAH graph displays the last best_bid, not (buy + sale) / 2.
 return {source:'garant-graph',sourceUrl,rate:Math.round(rate*100)/100,buy:rate,sale,rateDate:date,fetchedAt:now.toISOString()};
}
export function validateStored(data){
 if(data?.source!=='garant-graph'||!(data.rate>0&&data.rate<10000)||!Number.isFinite(Date.parse(data.fetchedAt))||!/^\d{4}-\d{2}-\d{2}$/.test(data.rateDate||''))throw Error('Invalid stored Garant rate');
 return data;
}
async function main(){
 let lastError;
 for(let i=0;i<3;i++){
  try{
   const now=new Date();const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date_from:kyivDate(new Date(now.getTime()-7*86400000)),date_to:kyivDate(now),p_currency:'USD'}),signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error('HTTP '+response.status);
   const rate=extractRate(await response.json(),now);await writeFile('rate.json',JSON.stringify(rate,null,2)+'\n');console.log('Updated Garant USD→UAH graph rate: '+rate.rate);return;
  }catch(e){lastError=e;if(i<2)await new Promise(r=>setTimeout(r,2000));}
 }
 try{
  const response=await fetch('https://oleksiishvetsagent-ops.github.io/pidsumok-calculator/rate.json',{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('No previous deployment');
  const old=validateStored(await response.json());await writeFile('rate.json',JSON.stringify(old,null,2)+'\n');console.warn('::warning::Garant unavailable; preserving the last Garant rate and its timestamp.');
 }catch{
  const old=validateStored(JSON.parse(await readFile('rate.json','utf8')));console.warn('::warning::Using bundled Garant rate from '+old.fetchedAt+'. '+lastError.message);
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
