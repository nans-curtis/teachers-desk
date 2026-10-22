// Keep exam mark entry focused on marks; submissions belong to projects.
module.exports=function refineExams(html){
  const start=html.indexOf('function gt('),end=html.indexOf('function ',start+12);
  if(start<0||end<0)throw Error('Inline marks renderer missing');
  let code=html.slice(start,end);
  if(code.includes('/* exam-submissions-separated */'))return html;
  const replace=(before,after)=>{if(!code.includes(before))throw Error('Exam patch boundary missing: '+before.slice(0,60));code=code.replace(before,after);};
  replace('r=n,o=xe(r),','r=n,o=xe(r),trackSubmissions=r.type!=="exam",');
  const history='<div class="toolbar"><button class="btn" type="button" data-submission-history aria-expanded="false">Submission history</button></div><div data-submission-history-panel hidden></div>';
  replace(history,'${trackSubmissions?`'+history+'`:""}');
  replace('<th>Submitted</th><th>Latest submitted (IST)</th>','${trackSubmissions?"<th>Submitted</th><th>Latest submitted (IST)</th>":""}');
  const cellStart=code.indexOf('<td><span data-read-cell="submitted"'),cellEnd=code.indexOf('</td>',code.indexOf('data-submission-date',cellStart))+5;
  if(cellStart<0||cellEnd<5)throw Error('Submission cells missing');
  const cells=code.slice(cellStart,cellEnd);replace(cells,'${trackSubmissions?`'+cells+'`:""}');
  replace('submitted:y.elements.namedItem("submitted_"+i.id).checked','submitted:trackSubmissions?y.elements.namedItem("submitted_"+i.id).checked:f(i).submitted');
  replace('$.querySelector("[data-submission-date]").textContent=We(l.find(A=>A.studentId===i.id)?.lastSubmittedAt);','trackSubmissions&&($.querySelector("[data-submission-date]").textContent=We(l.find(A=>A.studentId===i.id)?.lastSubmittedAt));');
  replace('ft(e,r),D(),I(!1)','trackSubmissions&&ft(e,r),D(),I(!1)');
  code=code.replace('function gt(e,n,a){','function gt(e,n,a){/* exam-submissions-separated */');
  return html.slice(0,start)+code+html.slice(end);
};
