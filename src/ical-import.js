import ICAL from 'ical.js';
import {googleEvents} from './calendar-model.js';
export function readCalendar(text,from,until){
 if(new TextEncoder().encode(text).length>2000000)throw Error('Choose a calendar smaller than 2 MB.');
 const calendar=new ICAL.Component(ICAL.parse(text));
 if(calendar.name!=='vcalendar')throw Error('Choose a valid .ics calendar file.');
 ICAL.TimezoneService.reset();
 for(const zone of calendar.getAllSubcomponents('vtimezone'))ICAL.TimezoneService.register(new ICAL.Timezone(zone));
 const components=calendar.getAllSubcomponents('vevent');if(components.length>5000)throw Error('This calendar has too many events. Export a shorter date range.');
 let iterations=0;const rows=new Map();
 for(const component of components){
  for(const property of component.getAllProperties()){
   const tz=property.getParameter('tzid');
   if(tz&&!ICAL.TimezoneService.has(tz))throw Error('The file is missing its '+tz+' time-zone definition. Export with time zones included or use UTC.');
  }
  if(component.hasProperty('recurrence-id'))continue;
  const event=new ICAL.Event(component);if(!event.startDate||!event.uid)throw Error('An event is missing its date or ID.');
  if(component.getFirstPropertyValue('status')==='CANCELLED')continue;
  for(const rule of component.getAllProperties('rrule'))if(!['DAILY','WEEKLY','MONTHLY','YEARLY'].includes(rule.getFirstValue().freq))throw Error('Sub-daily repeating calendars are not supported. Export expanded events instead.');
  const add=(start,end,item,id)=>{
   if(item.component.getFirstPropertyValue('status')==='CANCELLED')return;
   const converted={id,summary:item.summary||'Untitled event',start:start.isDate?{date:start.toString()}:{dateTime:start.toJSDate().toISOString()},end:end.isDate?{date:end.toString()}:{dateTime:end.toJSDate().toISOString()}};
   for(const row of googleEvents(converted,'ical',from,until)){rows.set(row.id,{...row,source:'Imported calendar'});if(rows.size>10000)throw Error('Too many calendar entries in this range.');}
  };
  if(event.isRecurring()){
   const iterator=event.iterator();let occurrence;
   while((occurrence=iterator.next())){
    if(++iterations>50000)throw Error('This recurring calendar is too large. Export a shorter date range.');
    // Allow a one-day margin for time-zone offsets at the range boundary.
    if(occurrence.toJSDate().getTime()>new Date(until+'T23:59:59').getTime()+86400000)break;
    const detail=event.getOccurrenceDetails(occurrence);add(detail.startDate,detail.endDate,detail.item,event.uid+':'+occurrence.toString());
   }
  }else add(event.startDate,event.endDate,event,event.uid);
 }
 return [...rows.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));
}
