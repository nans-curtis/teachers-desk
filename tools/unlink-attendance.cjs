// Attendance registers are independent of timetable and calendar configuration.
const sessionFunction=name=>`function ${name}(date,cls){if(!cls)return[];const count=({once:1,twice:2,thrice:3})[cls.attendanceMode]||Math.max(1,cls.sessionNames?.length||1),defaults=count===1?["Daily"]:count===2?["Morning","Afternoon"]:["Morning","Midday","Afternoon"];return Array.from({length:count},(_,i)=>({key:"session:"+(i+1),label:cls.sessionNames?.[i]||defaults[i]||"Session "+(i+1),subjectId:null}));}`;
module.exports={
  html(html){const start=html.indexOf('function ue('),end=html.indexOf('function ut(',start);if(start<0||end<0)throw Error('Client attendance sessions boundary missing');return html.slice(0,start)+sessionFunction('ue')+html.slice(end);},
  backend(source){
    const start=source.indexOf('function Pe('),end=source.indexOf('var O=',start);if(start<0||end<0)throw Error('Server attendance sessions boundary missing');
    source=source.slice(0,start)+sessionFunction('Pe')+source.slice(end);
    source=source.replace('f(a.yearId,a.date,"Attendance date")','n(a.date,"Attendance date")');
    const mutation=source.indexOf('function We('),guard=source.indexOf('let m=new WeakMap',mutation),finish=source.indexOf('return i}var Q=',mutation);
    if(guard>=0&&finish>guard)source=source.slice(0,guard)+'return i}'+source.slice(finish+'return i}'.length);
    else if(!source.includes('/* independent-attendance */'))throw Error('Server attendance validation boundary missing');
    if(!source.includes('/* independent-attendance */'))source+='\n/* independent-attendance */';
    return source;
  }
};
