// Shared presentation helpers. Academic calculations and persistence stay in the existing app.
function deskScope(data,yearId,classId) {
  const classes=data.classes.filter(c=>c.yearId===yearId&&(!classId||c.id===classId));
  const ids=new Set(classes.map(c=>c.id));
  return {classes:classes.length,students:new Set(data.enrollments.filter(e=>ids.has(e.classId)&&e.status!=='left').map(e=>e.studentId)).size,subjects:data.subjects.filter(s=>ids.has(s.classId)&&s.scope!=='class').length,collections:data.events.filter(e=>ids.has(e.classId)).length};
}
function deskLessonGroups(lessons) {
  const groups=new Map();
  for(const lesson of [...lessons].sort((a,b)=>(a.plannedStart||'9999').localeCompare(b.plannedStart||'9999'))) {
    const key=lesson.plannedStart?.slice(0,7)||'unscheduled';
    if(!groups.has(key))groups.set(key,{key,lessons:[]});
    groups.get(key).lessons.push(lesson);
  }
  return [...groups.values()];
}
function deskStatsMarkup(stats) {
  return `<section class="desk-stats" aria-label="Selected academic year overview">${[['Students',stats.students],['Subjects',stats.subjects],['Collections',stats.collections]].map(([label,count])=>`<div><span>${label}</span><strong>${count}</strong></div>`).join('')}</section>`;
}
function deskStudentMarkup(student,data,yearId,classId) {
  const enrollment=data.enrollments.find(e=>e.studentId===student.id&&e.classId===classId);
  const subjects=data.subjects.filter(s=>s.classId===classId&&s.scope!=='class'&&s.studentIds.includes(student.id));
  const history=data.enrollments.filter(e=>e.studentId===student.id);
  return `<header class="desk-detail-header"><div><p class="desk-eyebrow">Student record</p><h2 id="desk-student-title">${w(student.name)}</h2><small>Admission ${w(student.admissionNo||'not recorded')}</small></div><button class="btn btn-small" data-desk-close aria-label="Close student details">${V('close')}</button></header><div class="desk-detail-body"><div class="desk-detail-facts"><div><span>Roll number</span><strong>${w(enrollment?.rollNo||'—')}</strong></div><div><span>Enrolment</span><strong>${w(enrollment?.status||'Not enrolled')}</strong></div></div><section><h3>Guardian & contact</h3><dl class="desk-definition"><div><dt>Guardian</dt><dd>${w(student.guardian||'Not recorded')}</dd></div><div><dt>Phone</dt><dd>${w(student.phone||'Not recorded')}</dd></div></dl></section><section><h3>Subjects <span class="desk-count">${subjects.length}</span></h3><div class="desk-subject-tags">${subjects.map(s=>`<span>${w(s.name)}</span>`).join('')||'<p class="muted">No subjects assigned.</p>'}</div></section><section><h3>Enrolment history</h3><ol class="desk-record-timeline">${history.map(e=>`<li><strong>${w(data.classes.find(c=>c.id===e.classId)?.name||'Class not recorded')}</strong><span>${w(data.years.find(y=>y.id===e.yearId)?.name||'Year not recorded')}</span><small>Roll ${w(e.rollNo||'—')} · ${w(e.status)}</small></li>`).join('')}</ol></section>${student.notes?`<section><h3>Notes</h3><p class="desk-record-note">${w(student.notes)}</p></section>`:''}<button class="btn btn-primary desk-detail-edit" data-desk-edit>Edit student</button></div>`;
}
function deskAttachStudentPanel(root) {
  const card=root.querySelector('.card');if(!card||root.querySelector('.desk-student-split'))return;
  const split=document.createElement('div');split.className='desk-student-split';card.before(split);split.append(card);
  const panel=document.createElement('aside');panel.className='desk-detail-panel';panel.hidden=true;panel.id='desk-student-panel';panel.setAttribute('aria-labelledby','desk-student-title');split.append(panel);
  let selected='',returnButton=null;
  const close=()=>{panel.hidden=true;split.classList.remove('has-selection');for(const row of card.querySelectorAll('tbody tr'))row.classList.remove('is-selected');returnButton?.setAttribute('aria-expanded','false');returnButton?.focus();selected='';};
  for(const row of card.querySelectorAll('tbody tr')) {
    const id=row.querySelector('[data-edit-student]')?.dataset.editStudent;
    const student=x.students.find(s=>s.id===id);if(!student)continue;
    const cell=row.querySelector('td');const trigger=document.createElement('button');trigger.type='button';trigger.className='desk-student-trigger';trigger.innerHTML=cell.innerHTML;cell.replaceChildren(trigger);
    trigger.setAttribute('aria-controls',panel.id);trigger.setAttribute('aria-expanded','false');
    row.classList.add('desk-selectable-row');
    row.addEventListener('click',ev=>{
      if(ev.target.closest('button,a,input,select,details')&&!trigger.contains(ev.target))return;
      if(selected===id){trigger.focus();return;}
      for(const button of card.querySelectorAll('.desk-student-trigger'))button.setAttribute('aria-expanded','false');
      for(const tr of card.querySelectorAll('tbody tr'))tr.classList.toggle('is-selected',tr===row);
      selected=id;returnButton=trigger;trigger.setAttribute('aria-expanded','true');
      panel.innerHTML=deskStudentMarkup(student,x,P,M);panel.hidden=false;split.classList.add('has-selection');
      panel.querySelector('[data-desk-close]').onclick=close;
      panel.querySelector('[data-desk-edit]').onclick=()=>It(student);
      panel.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();close();}};
      panel.querySelector('[data-desk-close]').focus();
    });
    // Editing remains in the panel; keep history/delete available as secondary table actions.
    const edit=row.querySelector('[data-edit-student]');if(edit)edit.hidden=true;
  }
}
function deskGroupLessonCards(root) {
  const cards=[...root.querySelectorAll(':scope > section.card')];
  const lessons=x.lessons.filter(l=>l.subjectId===K);
  if(cards.length!==lessons.length||!cards.length)return;
  const byId=new Map(lessons.map((lesson,i)=>[lesson.id,cards[i]]));
  for(const {key,lessons:group} of deskLessonGroups(lessons)) {
    const section=document.createElement('section');section.className='desk-lesson-group';
    const title=document.createElement('h2');title.className='desk-group-heading';
    title.textContent=key==='unscheduled'?'Unscheduled':new Date(key+'-01T12:00:00').toLocaleDateString('en-IN',{month:'long',year:'numeric'});
    section.append(title);for(const lesson of group){const card=byId.get(lesson.id);card.classList.add('desk-lesson-card');section.append(card);}root.append(section);
  }
}
function deskRefine() {
  const root=document.querySelector('#view'),shell=document.querySelector('.desk-shell');if(!root||!shell)return;
  shell.dataset.page=q;
  const pane=document.querySelector('.class-pane');
  if(pane){
    const h2=pane.querySelector('.pane-content > h2');if(h2)h2.textContent='Academic year';
    const classNav=pane.querySelector('.class-list');if(classNav&&!classNav.previousElementSibling?.classList.contains('desk-pane-label')){
      const label=document.createElement('p');label.className='desk-pane-label';label.textContent='Classes';classNav.before(label);
    }
  }
  const header=document.querySelector('.workspace-bar');
  if(header&&!header.querySelector('[data-desk-theme]')) {
    const button=document.createElement('button');button.className='desk-theme-toggle';button.dataset.deskTheme='';button.type='button';
    const update=()=>{const light=document.documentElement.dataset.theme==='light';button.textContent=light?'Dark':'Light';button.setAttribute('aria-label',light?'Switch to dark appearance':'Switch to light appearance');button.title=button.getAttribute('aria-label');};
    button.onclick=()=>{const theme=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=theme;try{localStorage.setItem('teachers-desk-appearance',theme);}catch{}update();};update();header.append(button);
  }
  if(q==='home'||q==='class-home'||q==='class-management'||q==='subject-home') {
    const stats=deskScope(x,P,q==='home'?null:M);
    root.insertAdjacentHTML('afterbegin',deskStatsMarkup(stats));
    if(q==='home'){
      const label=document.createElement('h2');label.className='desk-group-heading';label.textContent='Your classes';root.querySelector('.choice-grid')?.before(label);
      const heading=document.querySelector('.heading h1');if(heading)heading.textContent='Your desk';
    }
  }
  if(['subject-home','assessments','projects','terms','lessons'].includes(q)) {
    const tools=document.querySelector('.pane-tools');
    const subjects=x.subjects.filter(s=>s.classId===M&&!_(s));
    if(tools&&subjects.length){const label=document.createElement('label');label.className='desk-subject-select';label.textContent='Subject';const select=document.createElement('select');select.setAttribute('aria-label','Current subject');select.innerHTML=subjects.map(s=>`<option value="${w(s.id)}"${s.id===K?' selected':''}>${w(s.name)}</option>`).join('');select.onchange=()=>{K=select.value;W='';ce(q);};label.append(select);tools.prepend(label);}
  }
  if(q==='students')deskAttachStudentPanel(root);
  if(q==='lessons')deskGroupLessonCards(root);
  if(q==='settings'){
    for(const card of root.querySelectorAll('.card')){
      card.classList.add('desk-settings-section');
      if(card.querySelector('#backup'))card.classList.add('desk-backup-section');
      if(card.querySelector('#rollover'))card.classList.add('desk-rollover-section');
    }
  }
  // Preserve table semantics and make every wide report independently scrollable.
  for(const wrap of root.querySelectorAll('.table-wrap')) {
    if(!wrap.hasAttribute('tabindex'))wrap.tabIndex=0;
    if(!wrap.hasAttribute('role'))wrap.setAttribute('role','region');
    if(!wrap.hasAttribute('aria-label'))wrap.setAttribute('aria-label',(St[q]||'Records')+' table, scroll for more columns');
    const table=wrap.querySelector('table');if(!table)continue;
    for(const th of table.querySelectorAll('thead th'))if(!th.hasAttribute('scope'))th.scope='col';
  }
  // Give disclosure controls a consistent action label without changing any calculations.
  for(const section of root.querySelectorAll('.empty'))section.classList.add('desk-empty-state');
}
// Install shared rendering hooks once; existing page renderers own their data and event handlers.
try{const theme=localStorage.getItem('teachers-desk-appearance');if(theme==='light'||theme==='dark')document.documentElement.dataset.theme=theme;}catch{}
const deskOriginalRender=de;de=function(){deskOriginalRender();deskRefine();};
const deskOriginalStudents=Nt;Nt=function(root){deskOriginalStudents(root);deskAttachStudentPanel(root);};
