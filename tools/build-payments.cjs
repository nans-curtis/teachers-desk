const fs=require('node:fs'),vm=require('node:vm');
const path='src/worker.js',source=fs.readFileSync(path,'utf8');
const match=source.match(/^var Ce=('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/s);
if(!match)throw Error('HTML bundle not found');
let html=vm.runInNewContext(match[1]);
html=html.replace(/(?:\/\/ Runs inside the existing app script and uses its state, navigation and dialog helpers\.\n)+/g,'');
const begin=html.indexOf('function paymentSummary(')>=0?html.indexOf('function paymentSummary('):html.indexOf('function Qt(');
const end=html.indexOf('function jt(',begin);
if(begin<0||end<0)throw Error('Payment boundaries missing');
html=html.slice(0,begin)+fs.readFileSync('src/payments.js','utf8')+html.slice(end);
const css=fs.readFileSync('src/payments.css','utf8');
html=html.replace(/\/\* payment-redesign-start \*\/[\s\S]*?\/\* payment-redesign-end \*\//,'');
html=html.replace('</style>','/* payment-redesign-start */'+css+'/* payment-redesign-end */</style>');
if(!html.includes('<div class="payment-dialog-summary">')) {
  const start=html.indexOf('function Gt('),end=html.indexOf('function Xt(',start);
  let form=html.slice(start,end);
  form=form.replace('`<p class="muted">Leave dates', '`<div class="payment-dialog-summary"><span>Remaining balance</span><br><strong>${me(Math.max(0,Math.round(((a?.amountDue??e.amount)-(a?.installments||[]).reduce((total,p)=>total+p.amount,0))*100)/100))}</strong><small>${me((a?.installments||[]).reduce((total,p)=>total+p.amount,0))} paid of ${me(a?.amountDue??e.amount)}</small></div><p class="muted">Leave dates');
  form=form.replace('`Instalment ${t+1} (\\u20B9)`','`${t===(a?.installments.length||0)?"Next payment":"Instalment "+(t+1)} (\\u20B9)`');
  // Preserve every existing instalment and the backend four-instalment limit.
  html=html.slice(0,start)+form+html.slice(end);
}
fs.writeFileSync(path,'var Ce='+JSON.stringify(html)+source.slice(match[0].length));
fs.writeFileSync('/tmp/teachers-desk-redesign.html',html);
console.log('Payment UI embedded; server code preserved');
