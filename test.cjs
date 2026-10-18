const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');const context={};vm.createContext(context);vm.runInContext(fs.readFileSync('./calc.js','utf8'),context);const {defaults,calculate,solve}=context.DealCalc;
assert.equal(calculate(80000,40,0,defaults).lines[0].total,808);
assert.equal(calculate(80000,40,0,defaults).buyerTotal,84933);
let r=solve(80000,40,0,defaults);assert(r.buyerTotal<=80000);assert(calculate(r.price+.01,40,0,defaults).buyerTotal>80000);assert.equal(r.lines.find(x=>x.id==='notary').total,125);
assert.equal(solve(100,40,0,defaults),null);
// Pension uses the appraisal when provided, including an appraisal below the price.
assert.equal(calculate(80000,40,100000,defaults).lines[0].total,1010);
assert.equal(calculate(80000,40,60000,defaults).lines[0].total,606);
assert.equal(calculate(80000,40,0,defaults).lines[0].total,808);
const assessedBudget=solve(80000,40,100000,defaults);
assert(assessedBudget.buyerTotal<=80000);
assert(calculate(assessedBudget.price+.01,40,100000,defaults).buyerTotal>80000);
for(let i=0;i<1000;i++){const rows=defaults.map(r=>({...r}));rows[3].payer=['none','buyer','seller','half'][i%4];rows[4].payer=['buyer','none','half','seller'][i%4];rows[1].payer=i%3===0?'half':'buyer';const budget=10000+i*71.19,fx=36+i/100,valuation=i%2?110000:0;const x=solve(budget,fx,valuation,rows);assert(x);assert(x.buyerTotal<=budget+.0001);assert(calculate(x.price+.01,fx,valuation,rows).buyerTotal>budget-.0001);for(const line of x.lines)if(line.payer!=='none')assert(Math.abs(line.buyer+line.seller-line.total)<.0001);}
console.log('Passed bank surcharge, reverse budget, insufficient budget, 1000 varied cases.');

// A displayed hryvnia budget round-trips without losing a cent in USD.
const {budgetInUsd}=context.DealCalc;
assert.equal(budgetInUsd(3812879.26,44.9,'UAH'),84919.36);
assert.equal(budgetInUsd(1000.22,44.9,'UAH'),22.27);
for(let i=0;i<1000;i++){
 const uah=100000+i*139.17,fx=38+i/1000;
 const usd=budgetInUsd(uah,fx,'UAH');
 assert(Math.round(usd*fx*100)<=Math.round(uah*100));
 assert(Math.round((usd+.01)*fx*100)>Math.round(uah*100));
 const deal=solve(usd,fx,0,defaults);assert(deal);
 assert(Math.round(deal.buyerTotal*fx*100)<=Math.round(uah*100));
}
console.log('Passed UAH budget round-trip and 1000 currency budget bounds.');
