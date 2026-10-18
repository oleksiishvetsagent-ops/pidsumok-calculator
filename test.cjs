const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');const context={};vm.createContext(context);vm.runInContext(fs.readFileSync('./calc.js','utf8'),context);const {defaults,calculate,solve}=context.DealCalc;
assert.equal(calculate(80000,40,0,defaults).lines[0].total,808);
assert.equal(calculate(80000,40,0,defaults).buyerTotal,84933);
let r=solve(80000,40,0,defaults);assert(r.buyerTotal<=80000);assert(calculate(r.price+.01,40,0,defaults).buyerTotal>80000);assert.equal(r.lines.find(x=>x.id==='notary').total,250);
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

// Preserve native UAH payments instead of converting rounded USD back to UAH.
const {paymentUah}=context.DealCalc;
let notary=calculate(80000,44.9,0,defaults).lines.find(r=>r.id==='notary');
assert.equal(notary.total,222.72);assert.equal(notary.buyer,111.36);assert.equal(paymentUah(notary,'buyer',44.9),5000);assert.equal(paymentUah(notary,'seller',44.9),5000);
const halfRows=defaults.map(r=>r.id==='notary'?{...r,value:5000.01,payer:'half'}:{...r});
notary=calculate(80000,44.9,0,halfRows).lines.find(r=>r.id==='notary');
assert.equal(paymentUah(notary,'buyer',44.9),2500.01);assert.equal(paymentUah(notary,'seller',44.9),2500);
const usdRows=defaults.map(r=>r.id==='notary'?{...r,value:100,unit:'USD',payer:'buyer'}:{...r});
notary=calculate(80000,44.9,0,usdRows).lines.find(r=>r.id==='notary');assert.equal(paymentUah(notary,'buyer',44.9),4490);
console.log('Passed native UAH display, half payment allocation and USD conversion.');

// Default seller payments do not add to the buyer's total.
const sellerDefaults=calculate(80000,40,0,defaults);
assert.equal(sellerDefaults.lines.find(r=>r.id==='duty').seller,800);
assert.equal(sellerDefaults.lines.find(r=>r.id==='appraisal').seller,25);
assert.equal(sellerDefaults.buyerTotal,84933);
assert.equal(sellerDefaults.sellerFees,950);assert.equal(sellerDefaults.sellerTotal,79050);
console.log('Passed seller defaults: 1% duty, appraisal and half the notary, with buyer total unchanged.');

// Grouped editable amounts preserve decimals and never reinterpret invalid input.
const {formatAmountInput,parseAmountInput}=context.DealCalc;
for(const [raw,formatted,numeric] of [
 ['1100000','1 100 000',1100000],['80000.50','80 000,50',80000.5],
 ['1\u00a0100\u202f000,75','1 100 000,75',1100000.75],['1000,','1 000,',1000],
 ['-1000','-1 000',-1000],['.5',',5',.5],['0000','0 000',0]
]){assert.equal(formatAmountInput(raw),formatted);assert.equal(parseAmountInput(formatted),numeric);assert.equal(formatAmountInput(formatted),formatted)}
for(const invalid of ['',',','1,2,3','80000abc','1e6','1.000.000'])assert(Number.isNaN(parseAmountInput(invalid)));
assert.equal(formatAmountInput('80000abc'),'80000abc');
console.log('Passed grouped amount editing, decimal preservation and strict validation.');
