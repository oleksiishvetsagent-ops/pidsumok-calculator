import {writeFile,readFile} from 'node:fs/promises';
const endpoint='https://api.privatbank.ua/p24api/pubinfo?json&exchange&coursid=5';
export function validate(data){const usd=Array.isArray(data)?data.find(r=>r.ccy==='USD'&&r.base_ccy==='UAH'):null;if(!usd||!(Number(usd.buy)>0&&Number(usd.sale)>=Number(usd.buy)&&Number(usd.sale)<10000))throw Error('Invalid USD rate');return usd;}
let lastError;
for(let i=0;i<3;i++){
 try{const response=await fetch(endpoint,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('HTTP '+response.status);const usd=validate(await response.json());await writeFile('rate.json',JSON.stringify({rates:[usd],fetchedAt:new Date().toISOString()},null,2)+'\n');console.log('Updated official cash USD rate.');process.exit(0)}catch(e){lastError=e;if(i<2)await new Promise(r=>setTimeout(r,2000));}
}
// Preserve the last successfully published rate if the bank is temporarily offline.
try{const response=await fetch('https://oleksiishvetsagent-ops.github.io/pidsumok-calculator/rate.json',{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('No previous deployment');const old=await response.json();validate(old.rates);if(!Number.isFinite(Date.parse(old.fetchedAt)))throw Error('Invalid timestamp');await writeFile('rate.json',JSON.stringify(old,null,2)+'\n');console.warn('::warning::Bank unavailable; preserving previously published rate and timestamp.');}catch{const old=JSON.parse(await readFile('rate.json','utf8'));validate(old.rates);console.warn('::warning::Using bundled fallback rate with original timestamp. '+lastError.message);}
