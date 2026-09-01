-- 0005_entities.sql — the signal network and derived trust (§6, §30). Idempotent.
--
-- Until now convergence was measured over `source`, which with two providers is nearly
-- meaningless: "two APIs agreed" is not "k independent entities touched the same target".
-- Entities are the thing convergence is actually supposed to count.

create table if not exists signal_entities (
  id                uuid primary key default gen_random_uuid(),
  kind              text not null,          -- 'provider' | 'wallet' | 'x_account' | 'deployer'
  identifier        text not null,          -- provider id, wallet address, or handle
  chain             text,
  display_name      text,
  category          text,                   -- specialisation, e.g. 'solana_memecoin', 'defi'

  -- Seeded by hand, then LEARNED. 985monitor derives its trusted set hourly from realized PnL
  -- rather than curating it; a hand-picked list is a bootstrap, not the destination.
  trust_weight      numeric not null default 0.5,
  trust_source      text not null default 'seed',   -- 'seed' | 'derived'

  -- Populated by update-trust from recorded outcomes.
  signals_total     int not null default 0,
  signals_measured  int not null default 0,
  hit_rate          numeric,                -- null => not enough data to say
  median_multiple   numeric,
  median_lead_hours numeric,
  last_evaluated_at timestamptz,

  active            boolean not null default true,
  created_at        timestamptz not null default now()
);
-- One row per real-world entity. This MUST be a unique INDEX, not a table constraint:
-- PostgreSQL forbids expressions like lower()/coalesce() inside a table-level UNIQUE, and the
-- constraint form failed the whole migration at boot — taking 0006+ down with it, silently,
-- because migrate() logs the failure and the engine then runs against a half-built schema.
-- The bare `on conflict do nothing` on the seed inserts matches unique indexes just the same.
create unique index if not exists signal_entities_identity_uniq
  on signal_entities (kind, lower(identifier), coalesce(chain, ''));
create index if not exists signal_entities_active_idx on signal_entities (kind, active);

-- Trust history, so a weight change is auditable rather than silently overwritten.
create table if not exists trust_scores (
  entity_id     uuid not null references signal_entities(id) on delete cascade,
  trust_weight  numeric not null,
  hit_rate      numeric,
  sample_size   int not null,
  computed_at   timestamptz not null default now(),
  primary key (entity_id, computed_at)
);

-- Providers are entities too — that keeps one code path for convergence instead of two.
insert into signal_entities (kind, identifier, display_name, trust_weight, trust_source) values
  ('provider', 'geckoterminal', 'GeckoTerminal', 0.60, 'seed'),
  ('provider', 'dexscreener',   'DexScreener',   0.35, 'seed')
on conflict do nothing;

insert into signal_config (key, value, unit, description) values
  ('trust.min_sample',      12, 'count', 'Measured outcomes required before trust is derived'),
  ('trust.floor',          0.1, 'weight', 'Lowest weight a poor entity can fall to'),
  ('trust.ceiling',        1.0, 'weight', 'Highest weight a strong entity can reach'),
  ('trust.blend',          0.7, 'ratio',  'How far derived trust moves from the seed value')
on conflict (key) do nothing;
