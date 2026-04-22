-- Supabase Scheduled Job Setup (No Vercel cron)
-- Permission-safe variant:
-- - Does NOT require ALTER DATABASE privileges.
-- - Stores scheduler config in a table.
-- - Safely re-creates schedule without failing if job does not exist.
--
-- Usage:
-- 1) Replace placeholder values in the INSERT below.
-- 2) Run this script in Supabase SQL Editor.
-- 3) Optionally trigger manually:
--      select public.run_lexis_daily_broadcast_job();

create extension if not exists pg_net;
create extension if not exists pg_cron;

create table if not exists public.job_config (
  key text primary key,
  value text not null
);

insert into public.job_config (key, value) values
  ('lexis_api_url', 'https://your-site-domain.com'),
  ('lexis_cron_secret', 'replace-with-strong-cron-secret')
on conflict (key) do update set value = excluded.value;

create or replace function public.run_lexis_daily_broadcast_job()
returns void
language plpgsql
security definer
as $$
declare
  api_url text;
  cron_secret text;
begin
  select jc.value into api_url
  from public.job_config jc
  where jc.key = 'lexis_api_url';

  select jc.value into cron_secret
  from public.job_config jc
  where jc.key = 'lexis_cron_secret';

  if api_url is null or api_url = '' then
    raise exception 'lexis_api_url is not configured in public.job_config';
  end if;

  if cron_secret is null or cron_secret = '' then
    raise exception 'lexis_cron_secret is not configured in public.job_config';
  end if;

  perform net.http_post(
    url := api_url || '/api/v2/notifications/daily-broadcast',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', cron_secret
    ),
    body := '{}'::jsonb
  );
end;
$$;

do $$
declare
  existing_job_id bigint;
begin
  select cj.jobid into existing_job_id
  from cron.job cj
  where cj.jobname = 'lexis-daily-broadcast'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end $$;

-- Run daily at 07:00 UTC
select cron.schedule(
  'lexis-daily-broadcast',
  '0 7 * * *',
  $$select public.run_lexis_daily_broadcast_job();$$
);
