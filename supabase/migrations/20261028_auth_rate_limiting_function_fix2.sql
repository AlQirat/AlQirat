create or replace function public.consume_auth_rate_limit(
  p_email_key text,
  p_ip_key text,
  p_email_limit integer,
  p_ip_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  now_at timestamptz := pg_catalog.clock_timestamp();
  email_rate public.auth_rate_limit_counters%rowtype;
  ip_rate public.auth_rate_limit_counters%rowtype;
  email_rate_key text := 'email:' || p_email_key;
  ip_rate_key text := 'ip:' || p_ip_key;
  email_retry integer := 0;
  ip_retry integer := 0;
begin
  if p_email_key is null or p_ip_key is null or p_email_limit < 1 or p_ip_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid authentication rate-limit parameters.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(email_rate_key || ':' || ip_rate_key, 0));

  insert into public.auth_rate_limit_counters (rate_key) values (email_rate_key), (ip_rate_key)
  on conflict (rate_key) do nothing;

  update public.auth_rate_limit_counters
  set window_started_at = now_at,
      request_count = 0,
      updated_at = now_at
  where rate_key in (email_rate_key, ip_rate_key)
    and window_started_at + pg_catalog.make_interval(secs => p_window_seconds) <= now_at;

  select * into email_rate from public.auth_rate_limit_counters where rate_key = email_rate_key for update;
  select * into ip_rate from public.auth_rate_limit_counters where rate_key = ip_rate_key for update;

  if email_rate.request_count >= p_email_limit then
    email_retry := greatest(1, pg_catalog.ceil(extract(epoch from (email_rate.window_started_at + pg_catalog.make_interval(secs => p_window_seconds) - now_at)))::integer);
  end if;
  if ip_rate.request_count >= p_ip_limit then
    ip_retry := greatest(1, pg_catalog.ceil(extract(epoch from (ip_rate.window_started_at + pg_catalog.make_interval(secs => p_window_seconds) - now_at)))::integer);
  end if;

  if email_retry > 0 or ip_retry > 0 then
    update public.auth_rate_limit_counters
    set updated_at = now_at
    where rate_key in (email_rate_key, ip_rate_key);
    return query select false, greatest(email_retry, ip_retry);
    return;
  end if;

  update public.auth_rate_limit_counters
  set request_count = request_count + 1,
      updated_at = now_at
  where rate_key in (email_rate_key, ip_rate_key);

  return query select true, 0;
end;
$$;

revoke all on function public.consume_auth_rate_limit(text, text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_auth_rate_limit(text, text, integer, integer, integer) to service_role;
