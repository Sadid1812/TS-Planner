import {test} from 'node:test';
import assert from 'node:assert/strict';
import {customOccurs,validRule} from '../src/recurrence.js';
import {emptyState,tasksFor,editTask,validateImport} from '../src/model.js';

test('custom daily intervals use calendar days across daylight saving changes',()=>{
 assert.equal(customOccurs('2026-03-07','2026-03-09',{unit:'day',interval:2}),true);
 assert.equal(customOccurs('2026-03-07','2026-03-08',{unit:'day',interval:2}),false);
});
test('custom weekly rules anchor Monday and retain selected weekdays',()=>{
 const rule={unit:'week',interval:2,days:[1,5]};
 assert.equal(customOccurs('2026-09-09','2026-09-11',rule),true);
 assert.equal(customOccurs('2026-09-09','2026-09-14',rule),false);
 assert.equal(customOccurs('2026-09-09','2026-09-21',rule),true);
 assert.equal(customOccurs('2026-09-09','2026-09-22',rule),false);
});
test('monthly recurrence skips absent dates and handles leap years',()=>{
 assert.equal(customOccurs('2026-01-31','2026-02-28',{unit:'month',interval:1}),false);
 assert.equal(customOccurs('2026-01-31','2026-03-31',{unit:'month',interval:1}),true);
 assert.equal(customOccurs('2024-02-29','2028-02-29',{unit:'month',interval:12}),true);
});
test('recurrence end date is inclusive, future edits retain old history and new end',()=>{
 const s=emptyState();s.tasks=[{id:'1',title:'Walk',date:'2026-09-01',repeat:'custom',rule:{unit:'day',interval:2},until:'2026-09-11',status:'open'}];
 assert.equal(tasksFor(s,'2026-09-11').length,1);
 assert.equal(tasksFor(s,'2026-09-13').length,0);
 const changed=editTask(s,'1','2026-09-11',{until:'2026-09-15'},'future');
 assert.equal(tasksFor(changed,'2026-09-09').length,1);
 assert.equal(tasksFor(changed,'2026-09-15').length,1);
 assert.equal(tasksFor(changed,'2026-09-17').length,0);
 assert.equal(validateImport(changed).tasks.length,2);
});
test('invalid recurrence and fractional reminders cannot enter backups',()=>{
 assert.equal(validRule({unit:'week',interval:1,days:[]}),false);
 assert.equal(validRule({unit:'day',interval:0}),false);
 const s=emptyState();s.tasks=[{id:'1',title:'Walk',date:'2026-09-01',repeat:'none',reminder:1.2}];
 assert.throws(()=>validateImport(s));
});
