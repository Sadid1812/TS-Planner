import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,sampleState,validateImport,editTask,dayKey,shiftDay,tasksFor} from '../src/model.js';
test('backup rejects malformed notes and impossible dates before replacement',()=>{
 const state=sampleState();assert.equal(validateImport(state).tasks.length,5);
 assert.throws(()=>validateImport({...state,notes:null}));
 assert.throws(()=>validateImport({...state,notes:{[dayKey()]:42}}));
 const bad=structuredClone(state);bad.tasks[0].date='2026-02-31';assert.throws(()=>validateImport(bad));
});
test('entire-series edits retain the series start and historical occurrences',()=>{
 let s=emptyState();const yesterday=shiftDay(dayKey(),-1);
 s.tasks=[{id:'repeat',title:'Original',date:yesterday,repeat:'daily',status:'open',exceptions:{}}];
 s=editTask(s,'repeat',dayKey(),{title:'Updated',date:dayKey()},'all');
 assert.equal(s.tasks[0].date,yesterday);
 assert.equal(tasksFor(s,yesterday)[0].title,'Original');
 assert.equal(tasksFor(s,dayKey())[0].title,'Updated');
});
