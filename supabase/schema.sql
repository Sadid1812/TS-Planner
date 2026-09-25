-- Run once in a new Supabase project. Enable only the Google auth provider.
-- Integration scaffold: apply and exercise with two test accounts before public launch.
create extension if not exists pgcrypto with schema extensions;
create table public.planner_documents (
 user_id uuid primary key references auth.users(id) on delete cascade,
 document jsonb not null, revision bigint not null default 1, updated_at timestamptz not null default now()
);
create table public.planner_summaries (
 user_id uuid primary key references auth.users(id) on delete cascade,
 name text not null default 'Member', percentage integer check(percentage between 0 and 100),
 title text not null default 'A fresh start', day date, updated_at timestamptz not null default now()
);
create table public.planner_families (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 60),
 owner_id uuid not null references auth.users(id) on delete cascade
);
create table public.planner_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 family_id uuid not null references public.planner_families(id) on delete cascade,
 sharing boolean not null default false
);
create table public.planner_invites (
 token_hash text primary key, family_id uuid not null references public.planner_families(id) on delete cascade,
 expires_at timestamptz not null default now()+interval '7 days'
);
alter table public.planner_documents enable row level security;
alter table public.planner_summaries enable row level security;
alter table public.planner_families enable row level security;
alter table public.planner_members enable row level security;
alter table public.planner_invites enable row level security;
revoke all on public.planner_documents,public.planner_summaries,public.planner_families,public.planner_members,public.planner_invites from anon,authenticated;

create table public.planner_age_confirmations (
 user_id uuid primary key references auth.users(id) on delete cascade,
 confirmed_at timestamptz not null default now(), policy_version integer not null default 1
);
alter table public.planner_age_confirmations enable row level security;
revoke all on public.planner_age_confirmations from public,anon,authenticated;

create function public.planner_identity() returns uuid language plpgsql stable security definer set search_path='' as $$
declare identity_id uuid:=auth.uid();
begin
 if identity_id is null or not exists(select 1 from auth.users u where u.id=identity_id and u.email_confirmed_at is not null and lower(u.email) like '%@gmail.com' and (u.raw_app_meta_data->'providers') ? 'google') then
  raise exception 'Sign in with a verified Gmail account.';
 end if;
 return identity_id;
end $$;
create function public.age_eligibility() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.planner_age_confirmations where user_id=public.planner_identity() and policy_version=1);
$$;
create function public.confirm_age(p_confirmed boolean) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=public.planner_identity();
begin
 if p_confirmed is distinct from true then raise exception 'TS Planner accounts are for ages 13 and up.';end if;
 insert into public.planner_age_confirmations(user_id) values(uid) on conflict(user_id) do update set confirmed_at=now(),policy_version=1;
end $$;
create function public.planner_user() returns uuid language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=public.planner_identity();
begin
 if not public.age_eligibility() then raise exception 'Confirm that you are at least 13 before using cloud planning or Family.';end if;
 return uid;
end $$;
revoke all on function public.planner_identity(),public.age_eligibility(),public.confirm_age(boolean) from public,anon,authenticated;
grant execute on function public.age_eligibility(),public.confirm_age(boolean) to authenticated;
grant select on public.planner_documents to authenticated;
create policy own_planner on public.planner_documents for select to authenticated using(user_id=public.planner_user());

create function public.save_planner(p_document jsonb,p_expected bigint,p_summary jsonb default '{}'::jsonb,p_account uuid default null) returns bigint language plpgsql security definer set search_path='' as $$
declare uid uuid:=public.planner_user(); result bigint;
begin
 if p_account is distinct from uid then raise exception 'Your account changed. Reopen the account menu.';end if;
 if p_expected is null or p_expected<0 then raise exception 'A valid cloud revision is required.';end if;
 if p_document->>'schema' is distinct from '1' or jsonb_typeof(p_document->'tasks') is distinct from 'array' or octet_length(p_document::text)>10000000 then raise exception 'Invalid planner document.';end if;
 -- Serialize all writes for this account, including its first insert.
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select revision into result from public.planner_documents where user_id=uid;
 if coalesce(result,0)<>p_expected then raise exception 'Your cloud plan changed. Sync again before choosing a copy.';end if;
 result:=coalesce(result,0)+1;
 insert into public.planner_documents values(uid,p_document,result,now()) on conflict(user_id) do update set document=excluded.document,revision=excluded.revision,updated_at=excluded.updated_at;
 -- Only this minimal self-reported summary can be shared. Never expose the document to family members.
 insert into public.planner_summaries(user_id,name,percentage,title,day) values(uid,left(coalesce(nullif(p_summary->>'name',''),'Member'),60),(p_summary->>'percentage')::integer,left(coalesce(p_summary->>'title','A fresh start'),80),(p_summary->>'day')::date)
 on conflict(user_id) do update set name=excluded.name,percentage=excluded.percentage,title=excluded.title,day=excluded.day,updated_at=now();
 return result;
end $$;

create function public.get_family() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=public.planner_user(); fid uuid; result jsonb;
begin
 select family_id into fid from public.planner_members where user_id=uid;
 if fid is null then return null;end if;
 select jsonb_build_object('id',f.id,'name',f.name,'sharing',(select sharing from public.planner_members where user_id=uid),'is_owner',f.owner_id=uid,'members',
 (select coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'name',coalesce(s.name,'Member'),'shared',m.sharing,'percentage',case when m.sharing then s.percentage end,'title',case when m.sharing then s.title end,'day',case when m.sharing then s.day end,'updated_at',case when m.sharing then s.updated_at end)),'[]'::jsonb)
 from public.planner_members m left join public.planner_summaries s on s.user_id=m.user_id where m.family_id=fid)) into result from public.planner_families f where f.id=fid;
 return result;
end $$;
create function public.create_family(p_name text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=public.planner_user(); fid uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 if exists(select 1 from public.planner_members where user_id=uid) then raise exception 'Leave your current family first.';end if;
 insert into public.planner_families(name,owner_id) values(trim(p_name),uid) returning id into fid;
 insert into public.planner_members(user_id,family_id) values(uid,fid);
end $$;
create function public.create_family_invite() returns text language plpgsql security definer set search_path='' as $$
declare uid uuid:=public.planner_user(); fid uuid; token text:=encode(extensions.gen_random_bytes(24),'hex');
begin
 select id into fid from public.planner_families where owner_id=uid for update;
 if fid is null then raise exception 'Only the family creator can invite members.';end if;
 delete from public.planner_invites where family_id=fid and expires_at<now();
 if (select count(*) from public.planner_invites where family_id=fid)>=20 then raise exception 'There are already 20 active invitations.';end if;
 insert into public.planner_invites(token_hash,family_id) values(encode(extensions.digest(token,'sha256'),'hex'),fid);
 return token;
end $$;
create function public.join_family(p_token text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=public.planner_user(); fid uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 if exists(select 1 from public.planner_members where user_id=uid) then raise exception 'Leave your current family first.';end if;
 select family_id into fid from public.planner_invites where token_hash=encode(extensions.digest(trim(p_token),'sha256'),'hex') and expires_at>now() for update;
 if fid is null then raise exception 'This invitation is invalid, expired, or already used.';end if;
 perform 1 from public.planner_families where id=fid for update;
 if (select count(*) from public.planner_members where family_id=fid)>=20 then raise exception 'This family has reached 20 members.';end if;
 insert into public.planner_members(user_id,family_id) values(uid,fid);
 delete from public.planner_invites where token_hash=encode(extensions.digest(trim(p_token),'sha256'),'hex');
end $$;
create function public.set_family_sharing(p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$
begin update public.planner_members set sharing=p_enabled where user_id=public.planner_user();end $$;
create function public.leave_family() returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=public.planner_user();
begin
 delete from public.planner_families where owner_id=uid;
 delete from public.planner_members where user_id=uid;
end $$;
revoke all on function public.planner_user(),public.save_planner(jsonb,bigint,jsonb,uuid),public.get_family(),public.create_family(text),public.create_family_invite(),public.join_family(text),public.set_family_sharing(boolean),public.leave_family() from public;
grant execute on function public.planner_user(),public.save_planner(jsonb,bigint,jsonb,uuid),public.get_family(),public.create_family(text),public.create_family_invite(),public.join_family(text),public.set_family_sharing(boolean),public.leave_family() to authenticated;

