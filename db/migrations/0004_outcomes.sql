-- 0004_outcomes.sql — outcome tracking and signal performance (§28, §29, §51). Idempotent.
--
-- The point of this table is to let the engine answer "were the discoveries any good?" with
-- measurement rather than assertion. It is NOT a promise of returns — it records what happened
-- after a signal fired, so the product can report base rates instead of predictions (§53).

create table if not exists signal_outcomes (
  id                uuid primary key default gen_random_uuid(),
  target_id         uuid not null references targets(id) on delete cascade,

  -- Snapshot at the moment of detection. Written ONCE and never updated, because a backtest
  -- that reads today's values for a past decision has look-ahead bias (§50).
  detected_at       timestamptz not null,
  heat_at_detect    numeric not null,
  band_at_detect    text,
  alpha_at_detect   int,
  risk_at_detect    text,
  liquidity_at_detect numeric,
  market_cap_at_detect numeric,
  volume_at_detect  numeric,
  -- Which signal families produced it, so performance can be attributed per source (§29).
  sources_at_detect text[],
  event_types_at_detect text[],

  -- Forward measurements. NULL means NOT YET MEASURED — never treat as zero.
  mcap_1h  numeric, mcap_6h  numeric, mcap_24h numeric, mcap_3d numeric, mcap_7d numeric,
  liq_1h   numeric, liq_6h   numeric, liq_24h  numeric, liq_3d  numeric, liq_7d  numeric,
  measured_1h  timestamptz, measured_6h timestamptz, measured_24h timestamptz,
  measured_3d  timestamptz, measured_7d timestamptz,

  -- Did liquidity collapse? A separate, important outcome from "price went down".
  liquidity_collapsed boolean,
  complete          boolean not null default false,
  created_at        timestamptz not null default now(),
  unique (target_id, detected_at)
);
create index if not exists signal_outcomes_pending_idx on signal_outcomes (complete, detected_at)
  where complete = false;
create index if not exists signal_outcomes_target_idx on signal_outcomes (target_id);

insert into signal_config (key, value, unit, description) values
  ('outcomes.snapshot_min_heat', 40, 'heat', 'Heat at which a detection snapshot is recorded'),
  ('outcomes.max_measure_per_run', 40, 'count', 'Ceiling on forward measurements per run')
on conflict (key) do nothing;
