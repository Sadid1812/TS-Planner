import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkCloudReadiness} from '../scripts/cloud-readiness.mjs';
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status});
test('public deployment rejects missing schema and disabled Google sign-in', async()=>{
  const request=async url=>url.endsWith('/settings')?reply({external:{google:false,email:true}}):reply({code:'PGRST205'},404);
  await assert.rejects(checkCloudReadiness('https://test.supabase.co','public',request),error=>error.message.includes('Enable the Google')&&error.message.includes('missing planner_documents'));
});
test('public deployment rejects tables readable without a signed-in account', async()=>{
  const request=async url=>url.endsWith('/settings')?reply({external:{google:true,email:false}}):reply([]);
  await assert.rejects(checkCloudReadiness('https://test.supabase.co','public',request),/anonymous access is denied/);
});
test('readiness checks use bounded zero-row requests and require permission denial',async()=>{
  let tables=0;
  const request=async (url,options)=>{
    assert.equal(options.headers.apikey,'public');
    if(url.endsWith('/settings'))return reply({external:{google:true,email:false},disable_signup:false});
    tables++;assert.ok(url.endsWith('?select=*&limit=0'));
    return reply({code:'42501'},401);
  };
  assert.match(await checkCloudReadiness('https://test.supabase.co','public',request),/Live signed-in tests are still required/);
  assert.equal(tables,6);
});
