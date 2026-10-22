// Attendance is independent of the teaching calendar.
let deskDate=G(),deskDailyClass='';
function deskDailyModel(data,yearId,date,classId=''){
  const year=data.years.find(y=>y.id===yearId),classes=data.classes.filter(c=>c.yearId===yearId&&(!classId||c.id===classId));
  const day=ve(date,yearId,data.calendarConfigs,data.calendarDays);
  const inYear=!!year&&date>=year.start&&date<=year.end;
  const attendance=[],agenda=[],tasks=[];
  const recorded=new Set(data.attendance.filter(a=>a.date===date&&['present','absent','late','half-day','excused'].includes(a.status)).map(a=>[a.classId,a.session,a.studentId].join('|')));
  for(const cls of classes){
    const enrolled=new Set(data.enrollments.filter(e=>e.classId===cls.id&&e.status!=='left').map(e=>e.studentId));
    const sessions=ue(date,cls);
    let missing=0,expected=0;
    for(const session of sessions)for(const studentId of enrolled){
      if(session.subjectId&&!data.subjects.find(s=>s.id===session.subjectId)?.studentIds.includes(studentId))continue;
      expected++;
      if(!recorded.has([cls.id,session.key,studentId].join('|')))missing++;
    }
    if(expected)attendance.push({cls,missing,expected,sessions:sessions.length});
    for(const slot of inYear?ct(date,cls,data.calendarConfigs,data.calendarDays,data.timetable):[]){
      const subject=data.subjects.find(s=>s.id===slot.subjectId);
      if(subject)agenda.push({cls,subject,period:slot.period});
    }
  }
  const subjects=data.subjects.filter(s=>classes.some(c=>c.id===s.classId));
  for(const assessment of data.assessments){
    const subject=subjects.find(s=>s.id===assessment.subjectId);if(!subject)continue;
    const cls=classes.find(c=>c.id===subject.classId);
    const ids=subject.studentIds.filter(id=>data.enrollments.some(e=>e.classId===cls.id&&e.studentId===id&&e.status!=='left'));
    const pending=ids.filter(id=>{const mark=data.marks.find(m=>m.assessmentId===assessment.id&&m.studentId===id);return assessment.ungraded?!mark?.submitted:!(mark?.status==='absent'||mark?.status==='scored'&&mark.theory!=null&&mark.internal!=null);}).length;
    const due=assessment.dueDate||assessment.date;
    if(pending&&(!due||due<=date))tasks.push({page:subject.scope==='class'?'activities':assessment.type==='exam'?'assessments':'projects',cls,subject,detailId:assessment.id,title:assessment.name,description:assessment.ungraded?`${pending} submissions pending`:`${pending} marks to enter`,due});
  }
  for(const lesson of data.lessons){
    const subject=subjects.find(s=>s.id===lesson.subjectId),due=lesson.scheduledEnd||lesson.plannedEnd;
    if(subject&&due&&due<=date&&!['completed','complete','done'].includes(lesson.status))tasks.push({page:'lessons',cls:classes.find(c=>c.id===subject.classId),subject,title:lesson.chapter,description:'Lesson plan needs review',due});
  }
  agenda.sort((a,b)=>a.period.start.localeCompare(b.period.start)||a.cls.name.localeCompare(b.cls.name));
  tasks.sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')||a.title.localeCompare(b.title));
  return {year,classes,day,inYear,attendance,agenda,tasks};
}
function deskAllowNavigation(){
  if(document.querySelector('#attendance-form[data-dirty="true"]'))return confirm('Discard unsaved attendance changes and continue?');
  return !document.querySelector('[data-edit-toggle]:checked')||confirm('Discard unsaved table edits and continue?');
}
function deskGo(page,options={}){
  if(!deskAllowNavigation())return false;
  if(options.classId)M=options.classId;
  if(options.subjectId)K=options.subjectId;
  fe();q=page;W=options.detailId||'';
  O=page==='attendance'?'register':'';
  if(page==='attendance')re=deskDate;
  de();ge();document.querySelector('h1')?.focus();return true;
}
function deskDailyHome(root){
  const model=deskDailyModel(x,P,deskDate,deskDailyClass);if(!model.year)return;
  const future=deskDate>G(),dateLabel=new Date(deskDate+'T12:00:00').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'});
  const section=document.createElement('section');section.dataset.deskToday='';section.className='desk-today';
  const attendance=model.attendance.map(({cls,missing,expected,sessions})=>`<button class="desk-daily-row" data-daily-attendance="${w(cls.id)}"><span class="desk-daily-icon">${V('check')}</span><span><strong>${w(cls.name)}</strong><small>${future?'Open a register for this date':missing?`${missing} student${missing===1?'':'s'}${sessions>1?' / session entries':''} not marked`:`All ${expected} entries recorded`}</small></span><span class="badge">${future?'Open':missing?'Open register':'Recorded'}</span>${V('chevron')}</button>`).join('');
  const noAttendance='No enrolled students in this class. Add students to start a register.';
  section.innerHTML=`<div class="desk-today-title"><div><p class="desk-eyebrow">ATTENDANCE</p><h2>${deskDate===G()?'Class registers':w(dateLabel)}</h2><p class="muted">Choose a class to open or update its register.</p></div><button class="btn" data-daily-calendar>View timetable</button></div><div class="desk-daily-columns"><section class="desk-daily-group" aria-labelledby="daily-attendance-heading"><h3 id="daily-attendance-heading">Your classes</h3>${attendance||`<p class="desk-daily-empty">${noAttendance}</p>`}</section><section class="desk-daily-group" data-daily-agenda aria-labelledby="daily-agenda-heading"><h3 id="daily-agenda-heading">On the timetable</h3>${model.agenda.map((slot,i)=>`<button class="desk-daily-row" data-daily-slot="${i}"><time>${w(slot.period.start)}<small>${w(slot.period.end)}</small></time><span><strong>${w(slot.subject.name)}</strong><small>${w(slot.cls.name)} · ${w(slot.period.label)}</small></span>${V('chevron')}</button>`).join('')||`<p class="desk-daily-empty">${!model.day.config?'Set up periods in the school calendar.':!model.day.working||!model.inYear?'No teaching periods scheduled.':'No timetable entries for this date.'}</p>`}</section></div><section class="desk-daily-group desk-daily-work" aria-labelledby="daily-work-heading"><div class="section-title"><h3 id="daily-work-heading">Needs attention <span class="desk-count">${model.tasks.length}</span></h3>${model.tasks.length>8?'<span class="muted">Showing the first 8 · open Subjects for all work</span>':''}</div>${model.tasks.slice(0,8).map((task,i)=>`<button class="desk-daily-row" data-daily-task="${i}"><span class="desk-daily-icon">${V(task.page==='lessons'?'calendar':'book')}</span><span><strong>${w(task.title)}</strong><small>${w(task.cls.name)} · ${w(task.subject.name)} · ${w(task.description)}</small></span>${task.due?`<span class="desk-daily-due">${task.due<deskDate?'Overdue · ':''}${w(task.due)}</span>`:'<span class="desk-daily-due">No date set</span>'}${V('chevron')}</button>`).join('')||'<p class="desk-daily-empty">No pending marks, submissions or overdue lesson plans in the saved records.</p>'}</section>`;
  root.prepend(section);
  section.querySelectorAll('[data-daily-attendance]').forEach(button=>button.onclick=()=>deskGo('attendance',{classId:button.dataset.dailyAttendance}));
  section.querySelectorAll('[data-daily-slot]').forEach(button=>button.onclick=()=>{const slot=model.agenda[Number(button.dataset.dailySlot)];deskGo('lessons',{classId:slot.cls.id,subjectId:slot.subject.id});});
  section.querySelectorAll('[data-daily-task]').forEach(button=>button.onclick=()=>{const task=model.tasks[Number(button.dataset.dailyTask)];deskGo(task.page,{classId:task.cls.id,subjectId:task.subject.id,detailId:task.detailId});});
  section.querySelector('[data-daily-calendar]').onclick=()=>deskGo('timetable',{classId:M||model.classes[0]?.id});
  const title=document.querySelector('.heading h1');if(title)title.textContent=deskDate===G()?'Today':'Your teaching day';
  const subtitle=document.querySelector('.heading p:last-child');if(subtitle)subtitle.textContent='A clear view of your classes and the work ahead.';
}
function deskContextBar(root){
  if(q==='settings'||!x.years.some(y=>y.id===P))return;
  const classes=x.classes.filter(c=>c.yearId===P),subjects=x.subjects.filter(s=>s.classId===M&&s.scope!=='class');
  const bar=document.createElement('nav');bar.className='desk-context';bar.setAttribute('aria-label','Daily workspace context');
  bar.innerHTML=`<button class="btn btn-small" data-desk-today-link>Today</button><label class="desk-context-field">Class<select data-desk-class><option value="">All classes</option>${classes.map(c=>`<option value="${w(c.id)}"${c.id===(q==='home'?deskDailyClass:M)?' selected':''}>${w(c.name)}</option>`).join('')}</select></label>${!['home','attendance','students','payments','activities','timetable','calendar','class-home','class-management'].includes(q)&&M&&subjects.length?`<label class="desk-context-field">Subject<select data-desk-subject>${subjects.map(s=>`<option value="${w(s.id)}"${s.id===K?' selected':''}>${w(s.name)}</option>`).join('')}</select></label>`:''}${q==='attendance'?'':`<label class="desk-context-field desk-context-date">Date<input data-desk-date type="date" value="${w(deskDate)}"></label>`}`;
  root.before(bar);
  bar.querySelector('[data-desk-today-link]').onclick=()=>{const previous=deskDate;deskDate=G();if(!deskGo('home'))deskDate=previous;};
  bar.querySelector('[data-desk-class]').onchange=event=>{
    if(!deskAllowNavigation()){event.target.value=M;return;}
    if(q==='home'){deskDailyClass=event.target.value;de();ge();return;}
    if(!event.target.value){deskDailyClass='';q='home';W='';de();ge();return;}
    const currentName=x.subjects.find(s=>s.id===K)?.name;
    M=event.target.value;K=x.subjects.find(s=>s.classId===M&&s.name===currentName)?.id||'';
    fe();W='';if(!M)q='home';else if(['subject-home','assessments','projects','terms','lessons'].includes(q)&&!x.subjects.some(s=>s.id===K&&s.classId===M&&s.scope!=='class'))q='subjects';
    de();ge();
  };
  const subject=bar.querySelector('[data-desk-subject]');if(subject)subject.onchange=event=>{const id=event.target.value;if(!deskAllowNavigation()){event.target.value=K;return;}K=id;W='';de();ge();};
  const date=bar.querySelector('[data-desk-date]');if(date)date.onchange=()=>{if(!date.value||!date.checkValidity())return;if(!deskAllowNavigation()){date.value=deskDate;return;}deskDate=date.value;if(q==='attendance'){re=deskDate;ze=deskDate.slice(0,7);}de();ge();};
  if(q==='attendance'&&O==='register'){const controls=root.querySelector('.register-controls'),field=bar.querySelector('[data-desk-class]')?.closest('label');if(controls&&field){field.className='field';controls.prepend(field);bar.remove();}}
}
function deskShortForm(){
  const body=document.querySelector('.modal-body');if(!body||body.querySelector('[data-desk-optional]'))return;
  const names=new Set(['notes',...$e.map(([name])=>name)]);
  const fields=[...body.querySelectorAll('.field')].filter(field=>{const controls=[...field.querySelectorAll('input,textarea,select')];return controls.length===1&&names.has(controls[0].name)&&!controls[0].required;});
  if(!fields.length)return;
  const details=document.createElement('details');details.dataset.deskOptional='';details.className='desk-optional';
  const summary=document.createElement('summary');summary.textContent='Optional details & notes';details.append(summary);
  const group=document.createElement('div');group.className='form-grid';details.append(group);body.append(details);fields.forEach(field=>group.append(field));
  details.open=fields.some(field=>[...field.querySelectorAll('input,textarea,select')].some(control=>control.value.trim()));
  details.addEventListener('invalid',()=>details.open=true,true);
}
