import {timingSafeEqual} from 'node:crypto';
import {createCore,readState,readBody,validateMutation,sessionsForDate,ValidationError} from './core.mjs';

const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
const fail=message=>{throw new ValidationError(message);};
const fields=(value,allowed)=>{if(!value||typeof value!=='object'||Array.isArray(value))fail('Expected a JSON object');for(const key of Object.keys(value))if(!allowed.includes(key))fail('Unsupported field: '+key);};
const withoutId=({id,...data})=>data;
const core=createCore({verify:async()=>({email:'integration:attendance-marks'})});

async function authenticated(request,env){
  const expected=env.INTEGRATION_API_KEY_SHA256;
  if(typeof expected!=='string'||! /^[a-f0-9]{64}$/.test(expected))return json({error:'Integration API is not configured'},503);
  const match=/^Bearer ([A-Za-z0-9_-]{32,200})$/i.exec(request.headers.get('Authorization')||'');
  if(!match)return json({error:'Valid Bearer API key required'},401);
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(match[1]));
  const expectedBytes=Uint8Array.from(expected.match(/../g),hex=>parseInt(hex,16));
  return timingSafeEqual(new Uint8Array(hash),expectedBytes)?null:json({error:'Valid Bearer API key required'},401);
}
function context(state,url){
  const {data,revision}=state,classId=url.searchParams.get('classId'),date=url.searchParams.get('date');
  const cls=classId?data.classes.find(c=>c.id===classId):null;
  if(classId&&!cls)fail('Unknown classId');
  const subjects=data.subjects.filter(s=>!classId||s.classId===classId);
  const enrollments=data.enrollments.filter(e=>e.classId===classId&&e.status!=='left');
  if(date&&(!cls||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date))fail('Use classId and a valid date in YYYY-MM-DD format');
  return {revision,classes:data.classes.map(({id,name,yearId,attendanceMode})=>({id,name,yearId,attendanceMode})),years:data.years.map(({id,name,start,end})=>({id,name,start,end})),subjects:subjects.map(({id,name,classId,studentIds})=>({id,name,classId,studentIds})),assessments:data.assessments.filter(a=>subjects.some(s=>s.id===a.subjectId)).map(({id,name,subjectId,type,maxTheory,maxInternal,entryMode,ungraded})=>({id,name,subjectId,type,maxTheory,maxInternal,entryMode,ungraded})),students:data.students.filter(s=>enrollments.some(e=>e.studentId===s.id)).map(({id,name})=>({id,name,rollNo:enrollments.find(e=>e.studentId===id)?.rollNo})),sessions:date?sessionsForDate(date,cls,data.calendarConfigs,data.calendarDays,data.timetable,data.subjects):[]};
}
function mutations(kind,body,data){
  fields(body,['revision','records']);
  if(!Number.isSafeInteger(body.revision)||body.revision<0)fail('A current revision is required');
  if(!Array.isArray(body.records)||!body.records.length||body.records.length>500)fail('Send between 1 and 500 records');
  const seen=new Set();
  return body.records.map(record=>{
    let existing,identity,normalized;
    if(kind==='attendance'){
      fields(record,['classId','studentId','date','session','status','notes']);
      if(!record.classId||!record.studentId||!record.date||!record.status)fail('Attendance requires classId, studentId, date and status');
      const cls=data.classes.find(c=>c.id===record.classId);if(!cls)fail('Unknown classId');
      const sessions=sessionsForDate(record.date,cls,data.calendarConfigs,data.calendarDays,data.timetable,data.subjects);
      const session=record.session||(sessions.length===1?sessions[0].key:null);
      if(!session)fail('Supply a scheduled session key from /v1/context?classId=...&date=...');
      const schedule=sessions.find(s=>s.key===session);
      existing=data.attendance.find(a=>a.classId===cls.id&&a.studentId===record.studentId&&a.date===record.date&&a.session===session);
      normalized={notes:'',...(existing?withoutId(existing):{}),...record,yearId:cls.yearId,session,subjectId:schedule?.subjectId??existing?.subjectId??null};
      identity=[cls.id,record.studentId,record.date,session].join('|');
    }else{
      fields(record,['assessmentId','studentId','status','theory','internal','notes']);
      if(!record.assessmentId||!record.studentId)fail('Marks require assessmentId and studentId');
      const assessment=data.assessments.find(a=>a.id===record.assessmentId);if(!assessment)fail('Unknown assessmentId');
      if(assessment.ungraded)fail('Ungraded submissions are not available through the marks API');
      if(!['theory','internal','status','notes'].some(key=>Object.hasOwn(record,key)))fail('Supply a mark, status or note to update');
      existing=data.marks.find(m=>m.assessmentId===assessment.id&&m.studentId===record.studentId);
      normalized={theory:null,internal:assessment.maxInternal===0?0:null,status:'pending',submitted:false,notes:'',...(existing?withoutId(existing):{}),...record};
      if(!record.status&&Object.hasOwn(record,'theory'))normalized.status=record.theory==null?'pending':'scored';
      if(normalized.status==='scored'&&assessment.maxInternal===0)normalized.internal=0;
      if(normalized.status==='absent'){normalized.theory=null;normalized.internal=null;}
      identity=[record.assessmentId,record.studentId].join('|');
    }
    if(seen.has(identity))fail('Duplicate record identity in batch');seen.add(identity);
    return {kind,id:existing?.id||crypto.randomUUID(),data:normalized};
  });
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/health'&&request.method==='GET')return json({ok:true});
    const auth=await authenticated(request,env);if(auth)return auth;
    const kind=url.pathname==='/v1/attendance'?'attendance':url.pathname==='/v1/marks'?'marks':null;
    if(!kind&&url.pathname!=='/v1/context')return json({error:'Not found'},404);
    if(!['GET','POST'].includes(request.method)||url.pathname==='/v1/context'&&request.method!=='GET')return json({error:'Method not allowed'},405);
    try{
      const state=await readState(env.DB);
      if(request.method==='GET'){
        if(!kind)return json(context(state,url));
        const assessmentId=url.searchParams.get('assessmentId'),classId=url.searchParams.get('classId'),date=url.searchParams.get('date');
        if(kind==='marks'&&!assessmentId||kind==='attendance'&&(!classId||!date))fail(kind==='marks'?'Supply assessmentId':'Supply classId and date');
        const records=state.data[kind].filter(r=>kind==='marks'?r.assessmentId===assessmentId:r.classId===classId&&r.date===date).map(r=>{const allowed=kind==='marks'?['id','assessmentId','studentId','status','theory','internal','submitted','notes']:['id','classId','yearId','studentId','date','session','subjectId','status','notes'];return Object.fromEntries(allowed.filter(k=>r[k]!==undefined).map(k=>[k,r[k]]));});
        return json({revision:state.revision,records});
      }
      const body=await readBody(request);
      fields(body,['revision','records']);
      if(!Number.isSafeInteger(body.revision)||body.revision<0)fail('A current revision is required');
      if(body.revision!==state.revision)return json({error:'Revision conflict. Fetch the current records, reconcile your changes, and retry.'},409);
      const put=mutations(kind,body,state.data);
      if(url.searchParams.get('dryRun')==='true'){
        validateMutation(state.data,{revision:body.revision,put});
        return json({ok:true,dryRun:true,revision:state.revision,validated:put.length});
      }
      const response=await core.fetch(new Request('https://internal.invalid/api/mutate',{method:'POST',headers:{Origin:'https://internal.invalid','Content-Type':'application/json'},body:JSON.stringify({revision:body.revision,put})}),env);
      if(!response.ok)return response;
      const saved=await response.json();
      return json({ok:true,revision:saved.revision,updated:put.length,records:put.map(({id,data})=>({id,studentId:data.studentId,...(kind==='marks'?{assessmentId:data.assessmentId}:{classId:data.classId,date:data.date,session:data.session})}))});
    }catch(error){
      if(error instanceof ValidationError)return json({error:error.message},400);
      if(error.status&&error.status>=400&&error.status<500)return json({error:error.message},error.status);
      console.error('Integration request failed',error.name);return json({error:'Unable to complete request'},500);
    }
  }
};
