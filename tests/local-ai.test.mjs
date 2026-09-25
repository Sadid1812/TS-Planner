import {test} from 'node:test';
import assert from 'node:assert/strict';
import {breakdownRequest,requestBreakdown} from '../src/local-ai.js';
test('portable AI sends only the chosen task to a fixed local endpoint',()=>{
 const {url,body}=breakdownRequest({title:'Read',taskNotes:'Chapter one',description:'Not requested',secret:'Never send'}, {aiEngine:'portable',language:'es',name:'Private profile'});
 assert.equal(url,'http://127.0.0.1:11435/v1/chat/completions');
 assert.equal(body.messages[1].content,'Read\nChapter one');assert.match(body.messages[0].content,/Spanish/);
 assert.equal(JSON.stringify(body).includes('Private profile'),false);assert.equal(body.max_tokens,400);
});
test('local AI validates generated steps before exposing them for acceptance',async()=>{
 const fetcher=async()=>({ok:true,json:async()=>({choices:[{message:{content:'{"steps":["Read chapter","Write summary","Review notes"]}'}}]})});
 assert.equal((await requestBreakdown({title:'Read'},{aiEngine:'portable'},undefined,fetcher)).length,3);
 await assert.rejects(()=>requestBreakdown({title:'Read'},{aiEngine:'portable'},undefined,async()=>({ok:true,json:async()=>({choices:[{message:{content:'{"steps":["only one"]}'}}]})})),/3–5 usable/);
});
