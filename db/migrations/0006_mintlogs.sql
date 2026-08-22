-- 0006_mintlogs.sql — register the mint-log signal family. Idempotent.
--
-- This is the first entity that is not a price API, which is what makes convergence mean
-- "different kinds of evidence agreed" rather than "two price feeds agreed".

insert into signal_sources (id, display_name, rate_limit_per_min) values
  ('mintlogs', 'Onchain mint logs', 20)
on conflict (id) do nothing;

insert into signal_entities (kind, identifier, display_name, trust_weight, trust_source) values
  ('provider', 'mintlogs', 'Onchain mint logs', 0.55, 'seed')
on conflict do nothing;

insert into signal_config (key, value, unit, description) values
  ('halflife.mint_velocity', 2, 'hours', 'Mint velocity decays fast — a mint can complete in minutes')
on conflict (key) do nothing;
