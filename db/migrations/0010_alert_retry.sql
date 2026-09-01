-- 0010_alert_retry.sql — make a failed alert retryable. Idempotent.
--
-- `alert_deliveries` doubled as the dedupe key via `unique (rule_id, target_id)`, and the
-- dispatcher's NOT EXISTS check did not look at `status`. A row was therefore written whether the
-- send succeeded or failed, which meant **every alert attempted while Telegram was unreachable —
-- or before TELEGRAM_BOT_TOKEN was configured — was recorded as handled and never retried.**
-- Silently dropping notifications is the one failure a notification system must not have.
--
-- Two things were also configured but never honoured: `alerts.recheck_hours` promised a target
-- could alert the same rule again after a cooldown, and the code made it never.

alter table alert_deliveries add column if not exists attempts int not null default 1;
-- Set once the message actually goes out. NULL means it never has — which is what makes
-- "delivered" answerable separately from "we have a row for it".
alter table alert_deliveries add column if not exists delivered_at timestamptz;

-- Existing rows: trust the status they were written with.
update alert_deliveries set delivered_at = sent_at
 where delivered_at is null and status = 'sent';

create index if not exists alert_deliveries_retry_idx
  on alert_deliveries (rule_id, target_id) where delivered_at is null;

insert into signal_config (key, value, unit, description) values
  ('alerts.max_attempts', 3, 'count', 'Give up on a failing delivery after this many tries')
on conflict (key) do nothing;
