-- Run against a NEW TEST project after schema.sql, in its SQL editor as postgres.
-- Synthetic accounts and all writes are rolled back. Never use real account IDs.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data)
values ('b7ed27e1-3554-45be-a281-bfa123001001','planner-qa-a@gmail.com',now(),'{"providers":["google"]}'),
       ('b7ed27e1-3554-45be-a281-bfa123001002','planner-qa-b@gmail.com',now(),'{"providers":["google"]}');
select set_config('request.jwt.claim.sub','b7ed27e1-3554-45be-a281-bfa123001001',true);
set local role authenticated;
do $$
declare rejected boolean:=false;
begin
 begin perform public.get_family();exception when others then rejected:=true;end;
 if not rejected then raise exception 'FAIL: Family allowed before age confirmation';end if;
 rejected:=false;
 begin perform public.confirm_age(false);exception when others then rejected:=true;end;
 if not rejected then raise exception 'FAIL: false age confirmation accepted';end if;
 perform public.confirm_age(true);
 if not public.age_eligibility() then raise exception 'FAIL: confirmation not persisted';end if;
 perform public.save_planner('{"schema":1,"tasks":[]}',0,'{}','b7ed27e1-3554-45be-a281-bfa123001001');
 rejected:=false;
 begin perform public.save_planner('{"schema":1,"tasks":[]}',0,'{}','b7ed27e1-3554-45be-a281-bfa123001001');exception when others then rejected:=true;end;
 if not rejected then raise exception 'FAIL: stale write accepted';end if;
 rejected:=false;
 begin perform public.save_planner('{"schema":1,"tasks":[]}',1,'{}','b7ed27e1-3554-45be-a281-bfa123001002');exception when others then rejected:=true;end;
 if not rejected then raise exception 'FAIL: different account target accepted';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','b7ed27e1-3554-45be-a281-bfa123001002',true);
set local role authenticated;
do $$
begin
 if public.age_eligibility() then raise exception 'FAIL: another account inherited confirmation';end if;
 perform public.confirm_age(true);
end $$;
-- Separate statements mirror the confirmation RPC followed by a document read.
do $$
begin
 if exists(select 1 from public.planner_documents) then raise exception 'FAIL: another account can read private planner';end if;
end $$;
reset role;
rollback;
-- No exception above means this subset of access checks passed.
