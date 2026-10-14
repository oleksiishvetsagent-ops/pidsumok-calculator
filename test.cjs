const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');const context={};vm.createContext(context);vm.runInContext(fs.readFileSync('./calc.js','utf8'),context);const {defaults,calculate,solve}=context.DealCalc;
assert.equal(calculate(80000,40,0,defaults).lines[0].total,808);
assert.equal(calculate(80000,40,0,defaults).buyerTotal,84933);
let r=solve(80000,40,0,defaults);assert(r.buyerTotal<=80000);assert(calculate(r.price+.01,40,0,defaults).buyerTotal>80000);assert.equal(r.lines.find(x=>x.id==='notary').total,125);
assert.equal(solve(100,40,0,defaults),null);
for(let i=0;i<1000;i++){const rows=defaults.map(r=>({...r}));rows[3].payer=['none','buyer','seller','half'][i%4];rows[4].payer=['buyer','none','half','seller'][i%4];rows[1].payer=i%3===0?'half':'buyer';const budget=10000+i*71.19,fx=36+i/100,valuation=i%2?110000:0;const x=solve(budget,fx,valuation,rows);assert(x);assert(x.buyerTotal<=budget+.0001);assert(calculate(x.price+.01,fx,valuation,rows).buyerTotal>budget-.0001);for(const line of x.lines)if(line.payer!=='none')assert(Math.abs(line.buyer+line.seller-line.total)<.0001);}
console.log('Passed bank surcharge, reverse budget, insufficient budget, 1000 varied cases.');
