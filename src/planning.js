import {dayKey,shiftDay,parseDay,minutes,clock,tasksFor,conflicts,patchOccurrence,moveOccurrence,uid} from './model.js';
export const planningDefaults={workStart:'09:00',workEnd:'18:00',duration:30,breakMinutes:5,autoSchedule:false,digest:false,digestTime:'08:00',aiEnabled:false,aiModel:''};
export function quickParse(input,today=dayKey(),duration=30){
 let title=input.trim(),date=today,repeat='none',start='',warning='';
 const replace=(re,fn)=>{title=title.replace(re,(...m)=>{fn(...m);return ' ';});};
 replace(/\bevery\s+(weekday|weekend|day|week)s?\b/i,(_,v)=>repeat={weekday:'weekdays',weekend:'weekends',day:'daily',week:'weekly'}[v.toLowerCase()]);
 replace(/\b(today|tomorrow)\b/i,(_,v)=>date=v.toLowerCase()==='tomorrow'?shiftDay(today,1):today);
 replace(/\b(hoy|mañana)\b/i,(_,v)=>date=v.toLowerCase()==='mañana'?shiftDay(today,1):today);
 replace(/\bcada\s+(d[ií]a laborable|fin de semana|d[ií]a|semana)\b/i,(_,v)=>repeat=/laborable/i.test(v)?'weekdays':/fin/i.test(v)?'weekends':/semana/i.test(v)?'weekly':'daily');
 replace(/\b(\d{4}-\d{2}-\d{2})\b/,(_,v)=>{if(dayKey(parseDay(v))===v)date=v;else warning='That date is invalid. Choose a date below.';});
 replace(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i,(_,h,m='00',ap)=>{if(+h<1||+h>12||+m>59)warning='Choose a valid time below.';else start=clock((+h%12+(ap.toLowerCase()==='pm'?12:0))*60+(+m));});
 if(!start)replace(/\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/,(_,h,m)=>start=clock(+h*60+(+m)));
 if(/\b(?:at\s+\d|next\s+|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(title))warning='Some date or time words need review. Set the fields before saving.';
 return {title:title.replace(/\s+/g,' ').trim(),date,repeat,start,end:start?clock(minutes(start)+duration):'',overnight:!!start&&minutes(start)+duration>=1440,warning};
}
export function reschedule(s,item,date,start){
 if(item.status&&item.status!=='open')return s;
 if(item.priority&&item.date!==date&&item.date>=dayKey()&&tasksFor(s,date).filter(t=>t.priority&&t.status==='open').length>=3)return s;
 const duration=item.start?minutes(item.end)-minutes(item.start)+(item.overnight?1440:0):s.settings.duration||30;
 const patch={date,start,end:clock(minutes(start)+duration),overnight:minutes(start)+duration>=1440};
 if(!start)return s;
 if(item.date<dayKey()&&date!==item.date){const next=moveOccurrence(s,item.id,item.date,date);const copy=next.tasks.at(-1);return patchOccurrence(next,copy.id,date,patch);}
 if(!item.repeat||item.repeat==='none')return patchOccurrence(s,item.id,item.date,patch);
 if(date===item.date)return patchOccurrence(s,item.id,item.date,patch);
 const next=patchOccurrence(s,item.id,item.date,{hidden:true,rescheduledTo:date});
 const copy={...item,...patch,id:uid(),repeat:'none',exceptions:{},movedFrom:item.date};
 delete copy.key;delete copy.seriesId;delete copy.until;next.tasks.push(copy);return next;
}
export function withCalendar(s,events=[]){return {...s,tasks:[...s.tasks,...events.filter(e=>e.start).map(e=>({...e,id:'external:'+e.id,repeat:'none',status:'open',exceptions:{}}))]};}
export function suggestions(s,date,events=[]){
 const prefs={...planningDefaults,...s.settings},out=[];let working=structuredClone(withCalendar(s,events));
 for(const task of tasksFor(s,date).filter(t=>!t.start&&t.status==='open').sort((a,b)=>({high:0,medium:1,low:2}[a.level||'medium']-({high:0,medium:1,low:2}[b.level||'medium'])))){
  for(let m=minutes(prefs.workStart);m+prefs.duration<=minutes(prefs.workEnd);m+=15){
   const candidate={...task,start:clock(m),end:clock(m+prefs.duration),overnight:false};
   const padded={...candidate,start:clock(Math.max(0,m-prefs.breakMinutes)),end:clock(Math.min(1439,m+prefs.duration+prefs.breakMinutes))};
   if(!conflicts(working,padded).length){out.push(candidate);working=patchOccurrence(working,task.id,date,candidate);break;}
  }
 }
 return out;
}
export function parseBreakdown(value){const x=typeof value==='string'?JSON.parse(value):value;const steps=x.steps;if(!Array.isArray(steps)||steps.length<3||steps.length>5||steps.some(s=>typeof s!=='string'||!s.trim()||s.length>180))throw Error('The model did not return 3–5 usable steps. Try again or write your own.');return steps.map(title=>({id:uid(),title:title.trim(),done:false}));}
