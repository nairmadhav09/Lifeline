# send-reminders (email reminders scaffold)

Runs once a day, finds bills whose due date matches one of their
`reminder_days_before` values (in each user's timezone), and builds a digest
per user. **Sending is a TODO**: the function only logs what it would send.

## Finish it

1. Pick an email provider (Resend, Postmark, SES…) and implement `sendDigest`
   in `index.ts`.
2. Set secrets:
   ```bash
   npx supabase secrets set REMINDERS_CRON_SECRET=<long-random-string>
   # plus your email provider's API key
   ```
3. Deploy: `npx supabase functions deploy send-reminders --no-verify-jwt`

## Schedule it (pg_cron)

In the Supabase SQL editor, after enabling the `pg_cron` and `pg_net`
extensions (Database → Extensions):

```sql
-- TODO: replace <project-ref> and <REMINDERS_CRON_SECRET>.
select cron.schedule(
  'lifeline-daily-reminders',
  '0 13 * * *',  -- 13:00 UTC daily
  $$
  select net.http_post(
    url     := 'https://<project-ref>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer <REMINDERS_CRON_SECRET>')
  );
  $$
);
```

To stop it: `select cron.unschedule('lifeline-daily-reminders');`
