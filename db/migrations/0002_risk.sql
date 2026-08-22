-- 0002_risk.sql — risk assessments (§21, §60 #7). Idempotent.

create table if not exists risk_assessments (
  target_id      uuid primary key references targets(id) on delete cascade,
  -- Full per-check detail, INCLUDING checks that could not run. The UI must be able to say
  -- "12 of 15 checked" rather than implying silence means safe.
  checks         jsonb not null,
  summary        jsonb not null,          -- counts by severity — never a verdict word
  checked_count  int not null default 0,
  total_count    int not null default 0,
  source         text not null default 'goplus',
  assessed_at    timestamptz not null default now()
);
create index if not exists risk_assessments_time_idx on risk_assessments (assessed_at desc);

-- `risk_level` on targets is a coarse rollup for list views only. NULL means NOT ASSESSED,
-- which the UI must render differently from 'low'.
insert into signal_config (key, value, unit, description) values
  ('risk.reassess_hours', 24, 'hours', 'Minimum age before a target is re-assessed'),
  ('risk.max_per_run',    25, 'count', 'Ceiling on risk assessments per run')
on conflict (key) do nothing;
