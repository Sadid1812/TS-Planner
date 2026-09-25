import {dayKey,shiftDay,parseDay} from './model.js';
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&dayKey(parseDay(d))===d;
const time=d=>`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
export function googleEvents(event,calendarId,from=shiftDay(dayKey(),-30),until=shiftDay(dayKey(),90)){
 if(event.status==='cancelled'||!event.id)return [];
 const allDay=!!event.start?.date;let first,last,start,end;
 if(allDay){first=event.start.date;last=event.end?.date;if(!validDate(first)||!validDate(last)||last<=first)return [];}
 else{start=new Date(event.start?.dateTime);end=new Date(event.end?.dateTime);if(!Number.isFinite(+start)||!Number.isFinite(+end)||end<=start)return [];first=dayKey(start);last=shiftDay(dayKey(new Date(+end-1)),1);}
 const rows=[];
 for(let d=first<from?from:first;d<last&&d<=until;d=shiftDay(d,1)){
  rows.push({id:calendarId+':'+event.id+':'+d,calendarId,title:typeof event.summary==='string'?event.summary.slice(0,300):'Untitled event',date:d,start:allDay?'':d===first?time(start):'00:00',end:allDay?'':d===dayKey(end)?time(end):'24:00',source:'Google Calendar'});
  if(rows.length>=122)break;
 }
 return rows;
}
