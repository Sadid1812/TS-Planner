import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,dayKey,shiftDay} from '../src/model.js';
import {reschedule,suggestions} from '../src/planning.js';
test('completed tasks cannot silently become open when dragged',()=>{
 const s=emptyState(),task={id:'1',date:shiftDay(dayKey(),-1),title:'Done',status:'done',repeat:'none',start:'09:00',end:'10:00'};s.tasks=[task];
 assert.equal(reschedule(s,task,dayKey(),'10:00'),s);
});
test('moving a priority cannot exceed the destination limit',()=>{
 const s=emptyState(),today=dayKey(),tomorrow=shiftDay(today,1);
 const task={id:'1',title:'Work',date:today,status:'open',repeat:'none',priority:true,start:'09:00',end:'10:00'};
 s.tasks=[task,...[2,3,4].map(id=>({...task,id:String(id),date:tomorrow}))];
 assert.equal(reschedule(s,task,tomorrow,'12:00'),s);
});
test('slot suggestions respect read-only external events without importing them',()=>{
 const s=emptyState(),date=dayKey();s.settings.breakMinutes=0;s.tasks=[{id:'1',title:'Read',date,status:'open',repeat:'none'}];
 const events=[{id:'external',date,title:'Meeting',start:'09:00',end:'10:00'}];
 assert.equal(suggestions(s,date,events)[0].start,'10:00');assert.equal(s.tasks.length,1);
});
