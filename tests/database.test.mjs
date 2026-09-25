import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('PostgreSQL executes schema and enforces age, isolation, revision and Family permissions',async()=>{
 const db=new PGlite();
 try {
  // Minimal Supabase auth contract. PGlite has no pgcrypto bundle: only its
  // random-byte/digest primitives are substituted; application SQL is unchanged.
  await db.exec(`create role anon;create role authenticated;
   create schema auth;create schema extensions;
   create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_app_meta_data jsonb);
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   grant usage on schema auth to authenticated;
   create function extensions.gen_random_bytes(n integer) returns bytea language sql volatile as $$ select substring(decode(replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),'hex'),1,n) $$;
   create function extensions.digest(value text,algorithm text) returns bytea language sql immutable as $$ select sha256(convert_to(value,'UTF8')) $$;
  `);
  const schema=await fs.readFile('supabase/schema.sql','utf8');
  await db.exec(schema.replace('create extension if not exists pgcrypto with schema extensions;',''));
  await db.exec(await fs.readFile('supabase/verify-access.sql','utf8'));
  const a='b7ed27e1-3554-45be-a281-bfa123001001',b='b7ed27e1-3554-45be-a281-bfa123001002',c='b7ed27e1-3554-45be-a281-bfa123001003';
  await db.query(`insert into auth.users values ($1,'a@gmail.com',now(),'{"providers":["google"]}'),($2,'b@gmail.com',now(),'{"providers":["google"]}'),($3,'c@gmail.com',now(),'{"providers":["google"]}')`,[a,b,c]);
  async function as(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
  async function family(){return (await db.query('select public.get_family() as value')).rows[0].value;}
  await as(a);await db.exec("select public.confirm_age(true);select public.create_family('Our family')");
  const token=(await db.query('select public.create_family_invite() as token')).rows[0].token;
  assert.equal(token.length,48);
  await db.query('select public.save_planner($1,0,$2,$3)',[{schema:1,tasks:[{title:'Private task'}]}, {percentage:75,title:'Finding Rhythm',day:'2026-09-11'},a]);
  await assert.rejects(()=>db.query('select public.save_planner($1,null,$2,$3)',[{schema:1,tasks:[]},{},a]),/valid cloud revision/);
  await as(b);await db.exec('select public.confirm_age(true)');await db.query('select public.join_family($1)',[token]);
  let result=await family();assert.equal(result.members.length,2);assert.equal(result.is_owner,false);
  assert.equal(result.members.find(m=>m.user_id===a).percentage,null);
  assert.equal(JSON.stringify(result).includes('Private task'),false);
  assert.equal((await db.query('select * from public.planner_documents')).rows.length,0);
  await assert.rejects(()=>db.exec('select * from public.planner_summaries'),/permission denied/);
  await assert.rejects(()=>db.exec('select public.create_family_invite()'),/Only the family creator/);
  await as(c);await db.exec('select public.confirm_age(true)');await assert.rejects(()=>db.query('select public.join_family($1)',[token]),/invalid, expired, or already used/);
  assert.equal(await family(),null);
  await as(a);await db.exec('select public.set_family_sharing(true)');
  await as(b);result=await family();assert.equal(result.members.find(m=>m.user_id===a).percentage,75);
  await db.exec('select public.leave_family()');assert.equal(await family(),null);
  await as(a);assert.equal((await family()).members.length,1);await db.exec('select public.leave_family()');assert.equal(await family(),null);
 } finally {await db.close();}
});
