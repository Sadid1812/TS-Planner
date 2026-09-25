import test from 'node:test';import assert from 'node:assert/strict';
import {googleEvents} from '../src/calendar-model.js';
import {emptyState,tasksFor,dayKey,shiftDay,moveOccurrence,conflicts} from '../src/model.js';
import {reschedule,quickParse} from '../src/planning.js';
test('all-day events honor exclusive end dates',()=>{
 const rows=googleEvents({id:'a',start:{date:'2026-09-10'},end:{date:'2026-09-12'}},'one','2026-09-01','2026-09-30');
 assert.deepEqual(rows.map(x=>x.date),['2026-09-10','2026-09-11']);assert.equal(rows[0].start,'');
});
test('overnight timed events are split into local days',()=>{
 const rows=googleEvents({id:'a',start:{dateTime:'2026-09-10T23:00:00'},end:{dateTime:'2026-09-11T01:00:00'}},'one','2026-09-01','2026-09-30');
 assert.deepEqual(rows.map(x=>[x.date,x.start,x.end]),[['2026-09-10','23:00','24:00'],['2026-09-11','00:00','01:00']]);
});
test('invalid and cancelled calendar events are ignored',()=>{
 assert.equal(googleEvents({id:'a',status:'cancelled'},'one').length,0);
 assert.equal(googleEvents({id:'a',start:{dateTime:'bad'}},'one').length,0);
});
test('rescheduling a past occurrence preserves the missed day and removes the old series end from its copy',()=>{
 const old=shiftDay(dayKey(),-2),today=dayKey(),task={id:'a',title:'Walk',date:old,until:old,repeat:'daily',status:'open',start:'09:00',end:'10:00'};
 const s={...emptyState(),tasks:[task]},next=reschedule(s,task,today,'11:00');
 assert.equal(tasksFor(next,old)[0].status,'moved');assert.equal(tasksFor(next,today).length,1);assert.equal(tasksFor(next,today)[0].start,'11:00');
 assert.equal(tasksFor(moveOccurrence(s,'a',old,today),today).length,1);
});
test('quick entry accepts mixed-case recurrence words',()=>{assert.equal(quickParse('Walk EVERY WEEKDAY 7AM').repeat,'weekdays');});
test('moving a repeated task checks the independent occurrence on its destination day',()=>{
 const s={...emptyState(),tasks:[{id:'a',title:'Daily walk',date:'2026-09-10',repeat:'daily',status:'open',start:'09:00',end:'10:00'}]};
 assert.equal(conflicts(s,{id:'a',date:'2026-09-11',excludeDate:'2026-09-10',start:'09:00',end:'10:00'}).length,1);
});
