-- Supabase Scheduled Job Setup (No Vercel cron)
-- Prerequisites:
-- 1) Enable pg_net extension in your Supabase project.
-- 2) Set app.settings.lexis_api_url and app.settings.lexis_cron_secret.
-- 3) Enable pg_cron extension in Supabase.

create extension if not exists pg_net;
create extension if not exists pg_cron;

alter database postgres set app.settings.lexis_api_url = 'https://your-site-domain.com';
alter database postgres set app.settings.lexis_cron_secret = 'replace-with-strong-cron-secret';

create or replace function public.run_lexis_daily_broadcast_job()
returns void
language plpgsql
security definer
as $$
declare
  api_url text;
  cron_secret text;
begin
  api_url := current_setting('app.settings.lexis_api_url', true);
  cron_secret := current_setting('app.settings.lexis_cron_secret', true);

  if api_url is null or api_url = '' then
    raise exception 'app.settings.lexis_api_url is not configured';
  end if;
  if cron_secret is null or cron_secret = '' then
    raise exception 'app.settings.lexis_cron_secret is not configured';
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

-- Run daily at 07:00 UTC
select cron.schedule(
  'lexis-daily-broadcast',
  '0 7 * * *',
  $$select public.run_lexis_daily_broadcast_job();$$
);
