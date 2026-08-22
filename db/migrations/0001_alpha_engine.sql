-- 0001_alpha_engine.sql
-- Alpha Engine schema. Lives in Railway Postgres, NOT Supabase — the engine owns its own
-- database, so no Supabase service-role key is needed and there is no anon write path.
-- Supabase keeps only the existing `scans` table.
--
-- Idempotent: safe to re-run.

create extension if not exists "pgcrypto";

-- ── provider health (§31) ────────────────────────────────────────────────────
create table if not exists signal_sources (
  id                  text primary key,          -- 'geckoterminal' | 'dexscreener'
  display_name        text not null,
  status              text not null default 'unknown',   -- ok | degraded | down | unknown
  last_ok_at          timestamptz,
  last_error          text,
  consecutive_errors  int  not null default 0,
  latency_ms          int,
  rate_limit_per_min  int,
  updated_at          timestamptz not null default now()
);

-- ── thresholds are DATA, not constants ───────────────────────────────────────
-- 985monitor exposes both k and the window to the user, which is a tacit admission that the
-- right threshold is regime-dependent. Tunable without a deploy.
create table if not exists signal_config (
  key          text primary key,
  value        numeric not null,
  unit         text,
  description  text,
  updated_at   timestamptz not null default now()
);

-- ── canonical discovered things (§5) ─────────────────────────────────────────
create table if not exists targets (
  id                uuid primary key default gen_random_uuid(),
  kind              text not null,               -- 'token' | 'x_account' | 'nft_collection'
  chain             text,
  contract_address  text,
  x_handle          text,
  name              text,
  symbol            text,

  -- obscurity inputs: the smaller these are, the higher the novelty bonus (§14)
  audience_size     bigint,
  liquidity_usd     numeric,
  market_cap_usd    numeric,
  volume_24h_usd    numeric,
  pool_created_at   timestamptz,

  first_seen_at     timestamptz not null default now(),
  last_event_at     timestamptz,

  heat              numeric not null default 0,
  heat_components   jsonb,                       -- every term, so the UI can answer "why?" (§15)
  heat_band         text,                        -- cold | warm | hot | critical (§26 graded alerts)

  alpha_score       int,                         -- from the existing scanner, once it runs
  alpha_scanned_at  timestamptz,
  risk_level        text,
  confidence        numeric,

  status            text not null default 'new', -- new | scanned | muted
  updated_at        timestamptz not null default now()
);

-- One row per real-world thing. Partial uniques because a target has either an address or a handle.
create unique index if not exists targets_contract_uniq
  on targets (kind, chain, lower(contract_address)) where contract_address is not null;
create unique index if not exists targets_handle_uniq
  on targets (kind, lower(x_handle)) where x_handle is not null;

create index if not exists targets_rank_idx      on targets (heat desc, last_event_at desc nulls last);
create index if not exists targets_first_seen_idx on targets (first_seen_at desc);
create index if not exists targets_chain_idx      on targets (chain);
create index if not exists targets_status_idx     on targets (status) where status = 'new';

-- ── the normalized event bus (§4) ────────────────────────────────────────────
create table if not exists signal_events (
  id            uuid primary key default gen_random_uuid(),
  target_id     uuid not null references targets(id) on delete cascade,
  entity_id     uuid,                            -- null until Phase 2/3 adds wallets and KOLs
  source        text not null references signal_sources(id),
  event_type    text not null,                   -- new_pool | volume_spike | liquidity_spike | boosted
  occurred_at   timestamptz not null,
  ingested_at   timestamptz not null default now(),
  confidence    numeric not null default 0.5,
  weight        numeric not null default 1.0,    -- independence-adjusted contribution (§18)
  dedupe_key    text not null,                   -- deterministic; see src/lib/dedupe.ts (§39)
  raw           jsonb,
  raw_reference text                             -- provenance URL (§36)
);

-- Idempotency: a repeated cron run cannot double-write the same observation.
create unique index if not exists signal_events_dedupe_uniq on signal_events (dedupe_key);
create index if not exists signal_events_target_idx on signal_events (target_id, occurred_at desc);
create index if not exists signal_events_recent_idx on signal_events (occurred_at desc);
create index if not exists signal_events_source_idx on signal_events (source, occurred_at desc);

-- ── heat time series (§25) ───────────────────────────────────────────────────
create table if not exists heat_history (
  target_id    uuid not null references targets(id) on delete cascade,
  heat         numeric not null,
  components   jsonb,
  computed_at  timestamptz not null default now(),
  primary key (target_id, computed_at)
);
create index if not exists heat_history_time_idx on heat_history (computed_at desc);

-- ── job observability + locking (§38, §39) ───────────────────────────────────
create table if not exists cron_runs (
  id             uuid primary key default gen_random_uuid(),
  job            text not null,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  status         text not null default 'running',  -- running | ok | error
  events_written int not null default 0,
  targets_seen   int not null default 0,
  errors         jsonb,
  lock_key       text unique                       -- released on completion
);
create index if not exists cron_runs_job_idx on cron_runs (job, started_at desc);

-- ── seeds ────────────────────────────────────────────────────────────────────
insert into signal_sources (id, display_name, rate_limit_per_min) values
  ('geckoterminal', 'GeckoTerminal', 30),
  ('dexscreener',   'DexScreener',   60)
on conflict (id) do nothing;

insert into signal_config (key, value, unit, description) values
  -- per-type half-lives (§16): not every signal decays at the same rate
  ('halflife.new_pool',          3,  'hours',  'New pool / first liquidity'),
  ('halflife.liquidity_spike',   3,  'hours',  'Sudden liquidity growth'),
  ('halflife.volume_spike',      4,  'hours',  'Sudden volume growth'),
  ('halflife.boosted',           6,  'hours',  'Promotion signal — weakest evidence'),
  ('halflife.wallet_buy',        4,  'hours',  'Reserved for Phase 2'),
  ('halflife.social_follow',     6,  'hours',  'Reserved for Phase 3'),
  ('halflife.funding',          24,  'hours',  'Funding announcements age slowly'),

  -- qualification floors: applied at INGEST time so the events table never fills with dust.
  -- This is the cost lever that makes a 10-minute cadence affordable.
  ('floor.liquidity_usd',    5000,  'usd',    'Minimum pool liquidity to admit a target'),
  ('floor.volume_24h_usd',   1000,  'usd',    'Minimum 24h volume to admit a target'),
  ('floor.max_age_hours',     168,  'hours',  'Ignore pools older than this on discovery'),

  -- convergence (§7): k distinct sources inside window w
  ('convergence.k',             2,  'count',  'Distinct sources needed before convergence counts'),
  ('convergence.window_hours',  6,  'hours',  'Window in which touches count as converging'),

  -- obscurity (§14): the differentiator. Bigger audience => smaller multiplier.
  ('obscurity.reference_mcap', 50000000, 'usd', 'Market cap at which the obscurity bonus is 1.0'),
  ('obscurity.max_multiplier',  3.0, 'x',      'Cap on the obscurity bonus'),

  -- graded bands (§26): escalate by severity rather than firing one binary threshold
  ('band.warm',                40,  'heat',   'Lower bound of the warm band'),
  ('band.hot',                 65,  'heat',   'Lower bound of the hot band'),
  ('band.critical',            85,  'heat',   'Lower bound of the critical band'),
  ('autoscan.min_heat',        70,  'heat',   'Heat at which the alpha scanner runs automatically'),
  ('autoscan.max_per_run',      3,  'count',  'Hard ceiling on automatic scans per run — bounds LLM spend')
on conflict (key) do nothing;
