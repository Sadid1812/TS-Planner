import test from 'node:test';import assert from 'node:assert/strict';
import {emptyState,tasksFor,stat,patchOccurrence,overdue,validateImport,dayKey,shiftDay} from '../src/model.js';
import {quickParse,reschedule,suggestions,parseBreakdown} from '../src/planning.js';
test('quick entry parses the requested examples and flags ambiguous times',()=>{
 assert.deepEqual(quickParse('Call mom tomorrow 5pm','2026-09-10'),{title:'Call mom',date:'2026-09-11',repeat:'none',start:'17:00',end:'17:30',overnight:false,warning:''});
 assert.equal(quickParse('gym every weekday 7am').repeat,'weekdays');
 assert.equal(quickParse('Read at 7').warning.length>0,true);
});
test('moving a repeating occurrence does not duplicate its original or change future rules',()=>{
 const t={id:'a',title:'Walk',date:dayKey(),repeat:'daily',status:'open',start:'09:00',end:'10:00'};
 const state=reschedule({...emptyState(),tasks:[t]},t,shiftDay(dayKey(),1),'11:00');
 assert.equal(tasksFor(state,dayKey()).length,0);assert.equal(tasksFor(state,shiftDay(dayKey(),1)).length,2);assert.equal(tasksFor(state,shiftDay(dayKey(),2)).length,1);
});
test('suggestions respect occupied blocks, work hours and breaks',()=>{
 const s=emptyState();s.settings.workEnd='10:30';s.tasks=[{id:'a',title:'Busy',date:'2026-09-10',start:'09:00',end:'10:00',status:'open',repeat:'none'},{id:'b',title:'New',date:'2026-09-10',status:'open',repeat:'none'}];
 assert.equal(suggestions(s,'2026-09-10').length,0);s.settings.workEnd='11:00';assert.equal(suggestions(s,'2026-09-10')[0].start,'10:15');
});
test('checklists are independent across recurring occurrences and count only the parent',()=>{
 const s={...emptyState(),tasks:[{id:'a',title:'Study',date:'2026-09-10',repeat:'daily',status:'open',subtasks:[{id:'x',title:'Read',done:false}]}]};
 const changed=patchOccurrence(s,'a','2026-09-10',{subtasks:[{id:'x',title:'Read',done:true}]});
 assert.equal(tasksFor(changed,'2026-09-11')[0].subtasks[0].done,false);assert.equal(stat(changed,'2026-09-10').total,1);
});
test('dismissed old tasks stay out of the inbox',()=>{const s=emptyState(),date=shiftDay(dayKey(),-60);s.tasks=[{id:'old',title:'Old',date,repeat:'none',status:'open'}];s.dismissed=['old:'+date];assert.equal(overdue(s).length,0);});
test('backup validates added settings and local AI output is bounded',()=>{const s=emptyState();s.settings.duration=999;assert.throws(()=>validateImport(s));assert.equal(parseBreakdown({steps:['Read','Write','Review']}).length,3);assert.throws(()=>parseBreakdown({steps:['one']}));});

