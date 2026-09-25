import test from 'node:test';import assert from 'node:assert/strict';
import {fingerprint,syncDecision,verifiedGmail} from '../src/sync-model.js';
const a={tasks:[{id:'a',title:'Old'}],notes:{},revision:1},b={...a,tasks:[{id:'a',title:'Changed'}]};
const base={revision:3,fingerprint:fingerprint(a)};
test('sync distinguishes clean, local-only, remote-only and concurrent changes',()=>{
 assert.equal(syncDecision(a,{document:a,revision:3},base),'equal');
 assert.equal(syncDecision(b,{document:a,revision:3},base),'push');
 assert.equal(syncDecision(a,{document:b,revision:4},base),'pull');
 assert.equal(syncDecision({...a,notes:{today:'new'}},{document:b,revision:4},base),'conflict');
});
test('first sync never overwrites an unknown cloud plan',()=>{
 assert.equal(syncDecision(a,null,null),'push');
 assert.equal(syncDecision(a,{document:b,revision:4},null),'conflict');
 assert.equal(syncDecision(a,null,base),'conflict');
});
test('fingerprint ignores bookkeeping but preserves user changes',()=>{
 assert.equal(fingerprint(a),fingerprint({...a,revision:99,updatedAt:'new',sync:base}));
 assert.notEqual(fingerprint(a),fingerprint(b));
});
test('Gmail identity gate rejects unverified and non-Google identities',()=>{
 const user={email:'person@gmail.com',email_confirmed_at:'2026-09-10',app_metadata:{providers:['google']}};
 assert.equal(verifiedGmail(user),true);
 for(const patch of [{email:'person@example.com'},{email_confirmed_at:null},{app_metadata:{providers:['email']}}])assert.equal(verifiedGmail({...user,...patch}),false);
});
