-- Test helpers (superuser-owned schema "t"). Loaded before *.test.sql files.
create schema if not exists t;
create or replace function t.login(p_uid uuid) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', p_uid::text, false);
  perform set_config('request.jwt.claim.role', 'authenticated', false);
  execute 'set role authenticated';
end $$;
create or replace function t.anon() returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', '', false);
  perform set_config('request.jwt.claim.role', 'anon', false);
  execute 'set role anon';
end $$;
create or replace function t.root() returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', '', false);
end $$;
create or replace function t.ok(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if p_cond is not true then raise exception 'ASSERTION FAILED: %', p_msg; end if;
  raise notice 'ok - %', p_msg;
end $$;
create or replace function t.eq(p_actual anyelement, p_expected anyelement, p_msg text) returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'ASSERTION FAILED: % (expected %, got %)', p_msg, p_expected, p_actual;
  end if;
  raise notice 'ok - %', p_msg;
end $$;
-- Runs statement as current role; passes only if it raises and the message matches (ILIKE).
create or replace function t.throws(p_sql text, p_like text, p_msg text) returns void language plpgsql as $$
declare v_err text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_err = message_text;
    if v_err ilike p_like then raise notice 'ok - % (%)', p_msg, v_err; return; end if;
    raise exception 'ASSERTION FAILED: % – wrong error: %', p_msg, v_err;
  end;
  raise exception 'ASSERTION FAILED: % – statement did not fail', p_msg;
end $$;
grant usage on schema t to public;
grant execute on all functions in schema t to public;
