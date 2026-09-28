-- Read-only inventory for an existing installation. Safe to rerun.
-- This does not replace behavioral access checks or compare function bodies.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and c.relname like 'planner\_%' escape '\'
order by c.relname;

select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name like 'planner\_%' escape '\'
order by table_name, ordinal_position;

select p.proname, pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer, p.proconfig as settings, p.proacl as permissions
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;

select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename like 'planner\_%' escape '\'
order by tablename, policyname;

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name like 'planner\_%' escape '\'
order by table_name, grantee, privilege_type;
