(function(root){
const defaults = [
{id:'pension',name:'Пенсійний фонд',value:1,unit:'%',payer:'buyer',bank:true,base:'valuation'},
{id:'agency',name:'Послуги агенції',value:5,unit:'%',payer:'buyer',bank:false,base:'price'},
{id:'notary',name:'Нотаріальні послуги',value:5000,unit:'UAH',payer:'buyer',bank:false,base:'price'},
{id:'income',name:'ПДФО',value:5,unit:'%',payer:'none',bank:true,base:'max'},
{id:'military',name:'Військовий збір',value:5,unit:'%',payer:'none',bank:true,base:'max'},
{id:'duty',name:'Державне мито',value:1,unit:'%',payer:'none',bank:false,base:'price'},
{id:'appraisal',name:'Експертна оцінка',value:1000,unit:'UAH',payer:'none',bank:false,base:'price'},
{id:'bti',name:'Довідка БТІ',value:2300,unit:'UAH',payer:'none',bank:false,base:'price'},
{id:'passport',name:'Новий технічний паспорт',value:2500,unit:'UAH',payer:'none',bank:false,base:'price'},
{id:'other',name:'Інші платежі за оформлення',value:0,unit:'UAH',payer:'none',bank:false,base:'price'}];
const cents=n=>Math.round(n*100+1e-7);
function calculate(price,fx,valuation,rows){price=cents(price)/100;let buyer=0,seller=0,bankBuyer=0;const lines=rows.map(row=>{const base=row.base==='valuation'?(valuation>0?valuation:price):row.base==='max'?Math.max(price,valuation||0):price;const tax=cents(row.unit==='%'?base*row.value/100:row.unit==='UAH'?row.value/fx:row.value);const bank=row.bank?Math.round(tax*.01):0;const total=tax+bank;const b=row.payer==='buyer'?total:row.payer==='half'?Math.ceil(total/2):0;const s=row.payer==='seller'?total:row.payer==='half'?total-b:0;buyer+=b;seller+=s;bankBuyer+=row.payer==='buyer'?bank:row.payer==='half'?Math.ceil(bank/2):0;return{...row,tax:tax/100,bank:bank/100,total:total/100,buyer:b/100,seller:s/100}});return{price,buyerFees:buyer/100,sellerFees:seller/100,buyerTotal:(cents(price)+buyer)/100,sellerTotal:(cents(price)-seller)/100,bankBuyer:bankBuyer/100,lines};}
function solve(budget,fx,valuation,rows){if(calculate(0,fx,valuation,rows).buyerTotal>budget)return null;let lo=0,hi=cents(budget);while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(cents(calculate(mid/100,fx,valuation,rows).buyerTotal)<=cents(budget))lo=mid;else hi=mid-1}return calculate(lo/100,fx,valuation,rows)}
root.DealCalc={defaults,calculate,solve};if(typeof module!=='undefined')module.exports=root.DealCalc;
})(typeof window==='undefined'?globalThis:window);
