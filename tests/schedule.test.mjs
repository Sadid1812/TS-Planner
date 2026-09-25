import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduleLayout} from '../src/model.js';
test('overlapping tasks receive separate columns and adjacent tasks reuse space',()=>{
 const task=(key,start,end)=>({key,start,end,status:'open'});
 const result=scheduleLayout([task('a','09:00','10:00'),task('b','09:30','10:30'),task('c','10:00','11:00'),task('d','11:00','12:00')]);
 assert.equal(result.a.columns,2);assert.notEqual(result.a.lane,result.b.lane);
 assert.equal(result.a.lane,result.c.lane);assert.equal(result.d.columns,1);
});
