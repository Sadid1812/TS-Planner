import {tasksFor,shiftDay,dayKey,parseDay} from './model.js';
const escape=value=>String(value).replaceAll('\\','\\\\').replace(/\r?\n/g,'\\n').replaceAll(';','\\;').replaceAll(',','\\,');
const compact=date=>date.replaceAll('-','');
const stamp=date=>date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
// RFC 5545 folding counts UTF-8 octets, including the continuation space.
function fold(line){let result='',length=0;for(const char of line){const size=new TextEncoder().encode(char).length;if(length+size>75){result+='\r\n ';length=1;}result+=char;length+=size;}return result;}
export function exportCalendar(state,from,until,includeNotes=false){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(until)||until<from||dayKey(parseDay(from))!==from||dayKey(parseDay(until))!==until)throw Error('Choose a valid date range.');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//TS Planner//Calendar Export//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];let days=0,count=0;
 for(let day=from;day<=until;day=shiftDay(day,1)){
  if(++days>366)throw Error('Export up to 366 days at a time.');
  for(const task of tasksFor(state,day).filter(t=>['open','done'].includes(t.status))){
   if(++count>10000)throw Error('Export fewer than 10,000 task occurrences.');
   lines.push('BEGIN:VEVENT','UID:'+encodeURIComponent(task.id)+'-'+compact(day)+'@ts-planner','DTSTAMP:'+stamp(new Date()),'SUMMARY:'+escape(task.title));
   if(task.start&&task.end){lines.push('DTSTART:'+stamp(new Date(day+'T'+task.start)),'DTEND:'+stamp(new Date((task.overnight?shiftDay(day,1):day)+'T'+task.end)));}
   else lines.push('DTSTART;VALUE=DATE:'+compact(day),'DTEND;VALUE=DATE:'+compact(shiftDay(day,1)));
   if(includeNotes){const notes=[task.description,task.taskNotes].filter(Boolean).join('\n\n');if(notes)lines.push('DESCRIPTION:'+escape(notes));}
   lines.push('STATUS:CONFIRMED','TRANSP:OPAQUE','END:VEVENT');
  }
 }
 return lines.concat('END:VCALENDAR').map(fold).join('\r\n')+'\r\n';
}
