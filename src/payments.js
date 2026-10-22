// Runs inside the existing app script and uses its state, navigation and dialog helpers.
function paymentSummary(event, students, payments) {
  return students.filter(student => !event.studentIds || event.studentIds.includes(student.id)).map(student => {
    const payment = payments.find(p => p.eventId === event.id && p.studentId === student.id);
    const dueCents = Math.round((payment?.amountDue ?? event.amount) * 100);
    const paidCents = (payment?.installments || []).reduce((sum, p) => sum + Math.round(p.amount * 100), 0);
    return {student, payment, due: dueCents / 100, paid: paidCents / 100, balance: Math.max(0, dueCents - paidCents) / 100, status: paidCents >= dueCents ? 'Paid' : paidCents ? 'Partial' : 'Unpaid'};
  });
}
function paymentMatches(row, status, query) {
  return (status === 'All' || row.status === status) && `${row.student.name} ${row.student.admissionNo || ''}`.toLowerCase().includes(query.trim().toLowerCase());
}
function paymentOverview(rows) {
  const due = rows.reduce((n,r)=>n+Math.round(r.due*100),0)/100;
  const paid = rows.reduce((n,r)=>n+Math.round(r.paid*100),0)/100;
  const balance = rows.reduce((n,r)=>n+Math.round(r.balance*100),0)/100;
  const complete = rows.filter(r=>r.status==='Paid').length;
  return `<section class="payment-summary" aria-label="Collection summary"><div><span>Collected</span><strong>${me(paid)}</strong><small>of ${me(due)} total</small></div><div><span>Pending</span><strong>${me(balance)}</strong><small>${rows.length-complete} students with a balance</small></div><div><span>Fully paid</span><strong>${complete}<em> / ${rows.length}</em></strong><small>students</small></div></section><div class="payment-progress"><label for="collection-progress">Collection progress <strong>${due ? Math.round(paid/due*100) : 0}%</strong></label><progress id="collection-progress" max="100" value="${due ? Math.min(100,paid/due*100) : 0}"></progress></div>`;
}
function paymentAppend(event, row, amount, date) {
  const value=Number(amount), cents=Math.round(value*100);
  if(!Number.isFinite(value)||value<=0||Math.abs(value*100-cents)>0.000001) throw Error('Enter a positive amount with up to two decimal places.');
  if(cents>Math.round(row.balance*100)) throw Error('Payment cannot exceed the remaining balance.');
  const installments=row.payment?.installments||[];
  if(installments.length>=4) throw Error('This record already has four instalments. Use Edit details to adjust the existing payments.');
  const {id,...details}=row.payment||{};
  return {...details,eventId:event.id,studentId:row.student.id,installments:[...installments,{amount:cents/100,date:date||''}]};
}
function paymentPanelMarkup(event,row) {
  const history=row.payment?.installments||[];
  return `<header class="payment-panel-header"><div><p class="muted">${w(event.name)}</p><h2 id="payment-panel-title">${w(row.student.name)}</h2><small>Admission ${w(row.student.admissionNo||'not recorded')}</small></div><button class="btn btn-small" data-panel-close aria-label="Close student payment panel">✕</button></header><div class="payment-panel-content"><div class="payment-panel-balance"><span>Remaining balance</span><strong>${me(row.balance)}</strong><small>${me(row.paid)} paid of ${me(row.due)}</small></div><section class="payment-panel-history"><h3>Payment history <span>${history.length}</span></h3>${history.length?`<ol>${history.map((p,i)=>`<li><div><strong>${me(p.amount)}</strong><small>${p.date?w(Ge(p.date)):'Date not recorded'}</small></div><span>Instalment ${i+1}</span></li>`).join('')}</ol>`:'<p class="muted">No payments recorded yet.</p>'}${row.payment?.notes?`<p class="payment-panel-note">${w(row.payment.notes)}</p>`:''}</section>${row.balance>0&&history.length<4?`<form data-panel-form><h3>Record payment</h3><label class="field">Amount (₹)<input name="amount" type="number" min="0.01" max="${row.balance}" step="0.01" inputmode="decimal" placeholder="0.00" required></label><button class="btn btn-small btn-quiet" type="button" data-panel-full>Use remaining ${me(row.balance)}</button><label class="field">Payment date<input name="date" type="date" value="${G()}"><small>Leave blank if the date is unknown.</small></label><p class="payment-panel-error" role="alert" data-panel-error hidden></p><button class="btn btn-primary payment-panel-save" type="submit">Save payment</button></form>`:`<p class="notice">${row.balance===0?'Fully paid. All payments for this event are recorded.':'Four instalments recorded. Edit existing payments to make adjustments.'}</p>`}<button class="btn btn-quiet payment-panel-edit" data-panel-edit>Edit payment details</button></div>`;
}
function Qt(e) {
  e.setAttribute('data-payment-root','');
  const events=x.events.filter(event=>event.classId===M);
  wt=W;
  const event=events.find(event=>event.id===wt);
  if(!event) {
    e.innerHTML=`<div class="toolbar"><div class="grow"><h2>Event collections</h2><p class="muted">Choose an event to view balances and record payments.</p></div><button class="btn btn-primary" id="add-event">+ Add event</button></div>${events.length?`<div class="payment-events">${events.map(event=>{
      const rows=paymentSummary(event,se(),x.payments), paid=rows.reduce((n,r)=>n+r.paid,0), balance=rows.reduce((n,r)=>n+r.balance,0), total=paid+balance;
      return `<button class="payment-event" data-open-event="${w(event.id)}"><span class="payment-event-title">${w(event.name)} <span aria-hidden="true">→</span></span><span class="muted">${event.dueDate?'Due '+w(Ge(event.dueDate)):'No due date'} · ${me(event.amount)} per student</span><span class="payment-event-amount">${me(paid)} <small>collected</small></span><progress max="100" value="${total?paid/total*100:0}" aria-label="${w(event.name)} collection progress"></progress><span class="payment-event-footer"><span>${rows.filter(r=>r.status==='Paid').length} of ${rows.length} fully paid</span><span>${me(balance)} pending</span></span></button>`;
    }).join('')}</div>`:'<div class="card empty"><strong>Start your first collection</strong><p>Add an event, choose participating students, and set the amount due.</p></div>'}`;
    e.querySelector('#add-event').onclick=()=>jt();
    F(e,'[data-open-event]',button=>at(button.dataset.openEvent));return;
  }
  const rows=paymentSummary(event,se(),x.payments);
  e.innerHTML=`<div class="payment-heading"><div><h2>${w(event.name)}</h2><p class="muted">${me(event.amount)} per student · ${event.dueDate?'Due '+w(Ge(event.dueDate)):'No due date'}</p></div><button class="btn" id="export-payments">Download report</button></div>${event.notes?`<p class="payment-event-note">${w(event.notes)}</p>`:''}${paymentOverview(rows)}<div class="payment-split" data-payment-split><section class="card payment-ledger"><div class="section-title"><h2>Student payments</h2><small>${rows.length} participants</small></div><div class="payment-controls"><label class="payment-search"><span class="sr-only">Search student or admission number</span><input type="search" placeholder="Search student or admission no." data-payment-search></label><div class="payment-filters" role="group" aria-label="Payment status">${['All','Unpaid','Partial','Paid'].map(status=>`<button type="button" aria-pressed="${status==='All'}" data-payment-filter="${status}">${status} <span>${status==='All'?rows.length:rows.filter(r=>r.status===status).length}</span></button>`).join('')}</div></div><p class="sr-only" aria-live="polite" data-payment-count></p><div data-payment-rows></div></section><aside class="payment-side-panel" data-payment-panel id="student-payment-panel" aria-labelledby="payment-panel-title" hidden></aside></div><details class="payment-manage"><summary>Manage event</summary><div class="toolbar"><button class="btn" id="edit-event">Edit event</button><button class="btn btn-danger" id="delete-event">Delete event</button></div></details>`;
  let status='All',query='',selected=null;
  const panel=e.querySelector('[data-payment-panel]');
  const closePanel=()=>{panel.hidden=true;selected=null;e.querySelector('[data-payment-split]').classList.remove('has-selection');render();};
  const openPanel=row=>{
    selected=row.student.id;
    panel.hidden=false;e.querySelector('[data-payment-split]').classList.add('has-selection');
    panel.innerHTML=paymentPanelMarkup(event,row);
    panel.querySelector('[data-panel-close]').onclick=()=>{const id=selected;closePanel();e.querySelector(`[data-payment="${CSS.escape(id)}"]`)?.focus();};
    panel.onkeydown=ev=>{if(ev.key==='Escape')panel.querySelector('[data-panel-close]').click();};
    panel.querySelector('[data-panel-edit]').onclick=()=>Gt(event,row.student);
    const form=panel.querySelector('[data-panel-form]');
    if(form){
      panel.querySelector('[data-panel-full]').onclick=()=>{form.elements.amount.value=row.balance;form.elements.amount.focus();};
      form.onsubmit=async ev=>{
        ev.preventDefault();const error=panel.querySelector('[data-panel-error]'),save=form.querySelector('[type=submit]');
        error.hidden=true;
        try{
          const record=paymentAppend(event,row,form.elements.amount.value,form.elements.date.value);
          save.disabled=true;save.textContent='Saving…';
          await z([U('payments',record,row.payment?.id)]);
          document.querySelector(`[data-payment-root] [data-payment="${CSS.escape(row.student.id)}"]`)?.click();
          oe('Payment recorded');
        }catch(err){error.textContent=err.message;error.hidden=false;save.disabled=false;save.textContent='Save payment';}
      };
    }
    render();panel.querySelector('[data-panel-close]').focus();
  };
  const render=()=>{
    const visible=rows.filter(row=>paymentMatches(row,status,query));
    e.querySelector('[data-payment-count]').textContent=`${visible.length} students shown`;
    e.querySelector('[data-payment-rows]').innerHTML=visible.length?`<div class="table-wrap"><table class="payment-table"><thead><tr><th>Student</th><th>Amount due</th><th>Paid</th><th>Balance</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${visible.map(row=>`<tr data-payment-row="${w(row.student.id)}" class="${selected===row.student.id?'is-selected':''}"><td><button class="payment-student-button" data-payment="${w(row.student.id)}" aria-expanded="${selected===row.student.id}" aria-controls="student-payment-panel">${st(row.student)}</button></td><td class="money">${me(row.due)}</td><td class="money">${me(row.paid)}</td><td class="money">${me(row.balance)}</td><td><span class="payment-status payment-status-${row.status.toLowerCase()}">${row.status}</span></td><td><span aria-hidden="true">→</span></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty"><strong>${rows.length?'No matching students':'No participating students'}</strong><p>${rows.length?'Try another name or payment status.':'Edit the event to choose participants, or add students to this class.'}</p></div>`;
    F(e,'[data-payment-row]',button=>openPanel(rows.find(row=>row.student.id===button.dataset.paymentRow)));
  };
  e.querySelector('[data-payment-search]').oninput=ev=>{query=ev.target.value;render();};
  F(e,'[data-payment-filter]',button=>{status=button.dataset.paymentFilter;for(const b of e.querySelectorAll('[data-payment-filter]'))b.setAttribute('aria-pressed',String(b===button));render();});
  e.querySelector('#edit-event').onclick=()=>jt(event);
  e.querySelector('#delete-event').onclick=()=>nt('events',event.id);
  e.querySelector('#export-payments').onclick=()=>De(`${event.name}-payments.csv`,[['Student','AdmissionNo','Amount due','Paid','Balance','Instalments','Participation','Notes'],...rows.map(r=>[r.student.name,r.student.admissionNo,r.due,r.paid,r.balance,(r.payment?.installments||[]).map(p=>`${p.date||'Date not recorded'}: ${p.amount}`).join('; '),r.payment?.participation||'',r.payment?.notes||''])]);
  render();
}
