-- 0003_alerts.sql — alert rules and delivery log (§26). Idempotent.

create table if not exists alert_rules (
  id            uuid primary key default gen_random_uuid(),
  label         text not null default 'Default',
  channel       text not null,                  -- 'telegram'
  destination   text not null,                  -- chat id
  min_heat      numeric not null default 70,
  min_alpha     int,                            -- null => do not require a scan first
  max_risk      text,                           -- 'low'|'medium'|'high' — null => any
  chains        text[],                         -- null/empty => all
  require_alpha boolean not null default false,
  enabled       boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Delivery log doubles as the dedupe key: a target must never alert the same rule twice.
create table if not exists alert_deliveries (
  id           uuid primary key default gen_random_uuid(),
  rule_id      uuid not null references alert_rules(id) on delete cascade,
  target_id    uuid not null references targets(id) on delete cascade,
  heat_at_send numeric not null,
  band_at_send text,
  status       text not null default 'sent',    -- sent | failed
  error        text,
  sent_at      timestamptz not null default now(),
  unique (rule_id, target_id)
);
create index if not exists alert_deliveries_time_idx on alert_deliveries (sent_at desc);

insert into signal_config (key, value, unit, description) values
  ('alerts.max_per_run', 5, 'count', 'Ceiling on alerts sent per run — prevents a burst storm'),
  ('alerts.recheck_hours', 12, 'hours', 'How long before a target may alert the same rule again')
on conflict (key) do nothing;
