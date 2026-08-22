-- 0007_costs.sql — API cost observability (§44). Idempotent.
--
-- "Free" providers are still worth counting: a rate-limit breach costs availability even when it
-- costs no money, and the only way to know whether the engine is spending sensibly is to measure
-- cost per qualified signal rather than cost per call.

create table if not exists provider_calls (
  provider     text not null,
  day          date not null default current_date,
  calls        int  not null default 0,
  errors       int  not null default 0,
  -- Unit cost in USD. Zero for the free providers, real for Anthropic.
  unit_cost_usd numeric not null default 0,
  est_cost_usd numeric not null default 0,
  primary key (provider, day)
);
create index if not exists provider_calls_day_idx on provider_calls (day desc);

insert into signal_config (key, value, unit, description) values
  -- Rough blended cost of one auto-scan on Haiku: ~4k in + ~2k out. Adjust if the model changes.
  ('cost.per_alpha_scan_usd', 0.004, 'usd', 'Estimated cost of one automatic alpha scan')
on conflict (key) do nothing;
