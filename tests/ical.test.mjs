import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readCalendar} from '../src/ical-import.js';
import {exportCalendar} from '../src/ical-export.js';
import {emptyState} from '../src/model.js';
const wrap=events=>'BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'+events+'END:VCALENDAR\r\n';
const event=(extra='')=>'BEGIN:VEVENT\r\nUID:qa\r\nDTSTART;VALUE=DATE:20260911\r\nDTEND;VALUE=DATE:20260912\r\nSUMMARY:Family meeting\r\n'+extra+'END:VEVENT\r\n';
test('calendar import expands recurring events and excludes cancelled dates',()=>{
 const rows=readCalendar(wrap(event('RRULE:FREQ=DAILY;COUNT=3\r\nEXDATE;VALUE=DATE:20260912\r\n')),'2026-09-01','2026-09-30');
 assert.deepEqual(rows.map(e=>e.date),['2026-09-11','2026-09-13']);assert.equal(rows[0].source,'Imported calendar');
 assert.equal(readCalendar(wrap(event('STATUS:CANCELLED\r\n')),'2026-09-01','2026-09-30').length,0);
});
test('calendar recurrence exceptions replace the original occurrence',()=>{
 const moved='BEGIN:VEVENT\r\nUID:qa\r\nRECURRENCE-ID;VALUE=DATE:20260912\r\nDTSTART;VALUE=DATE:20260914\r\nDTEND;VALUE=DATE:20260915\r\nSUMMARY:Moved meeting\r\nEND:VEVENT\r\n';
 const rows=readCalendar(wrap(event('RRULE:FREQ=DAILY;COUNT=2\r\n')+moved),'2026-09-01','2026-09-30');
 assert.deepEqual(rows.map(e=>e.date),['2026-09-11','2026-09-14']);assert.equal(rows[1].title,'Moved meeting');
});
test('calendar import fails closed on unknown time zones and unsupported rapid repeats',()=>{
 assert.throws(()=>readCalendar(wrap(event().replace('DTSTART;VALUE=DATE:20260911','DTSTART;TZID=Unknown/Place:20260911T090000')),'2026-09-01','2026-09-30'),/time-zone definition/);
 assert.throws(()=>readCalendar(wrap(event('RRULE:FREQ=SECONDLY\r\n')),'2026-09-01','2026-09-30'),/Sub-daily/);
});
test('calendar export round-trips Unicode, escaping and excludes private notes by default',()=>{
 const s=emptyState();s.tasks=[{id:'1',title:'পড়াশোনা, review; plan\\next',taskNotes:'Private detail',date:'2026-09-11',repeat:'none',status:'open'}];
 const plain=exportCalendar(s,'2026-09-11','2026-09-12');assert.equal(plain.includes('Private detail'),false);
 assert.equal(readCalendar(plain,'2026-09-11','2026-09-12')[0].title,s.tasks[0].title);
 assert.equal(exportCalendar(s,'2026-09-11','2026-09-12',true).includes('Private detail'),true);
 s.tasks[0].title='লেখা'.repeat(40);const folded=exportCalendar(s,'2026-09-11','2026-09-12');
 assert.ok(folded.split('\r\n').every(line=>Buffer.byteLength(line)<=75));
});
test('calendar export rejects invalid or excessive date ranges',()=>{
 assert.throws(()=>exportCalendar(emptyState(),'2026-02-31','2026-03-01'));
 assert.throws(()=>exportCalendar(emptyState(),'2026-01-01','2028-01-01'),/366/);
});
