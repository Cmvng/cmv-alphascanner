-- 0008_provenance.sql — project provenance checks (§22). Idempotent.
--
-- "Scam/LARP detection" in the spec, built the only way that is defensible: as OBSERVATIONS
-- about how long a project's public footprint has existed, never as an accusation. A domain
-- registered three days ago is a fact. "This is a scam" is a claim about intent that no free
-- data source can support, so nothing here says it.
--
-- Both sources are free and keyless: RDAP (the successor to WHOIS) for registration dates, and
-- crt.sh's Certificate Transparency mirror for when the domain first held a public certificate.

-- Provenance needs a domain, and nothing was storing one. DexScreener pair metadata carries it
-- alongside the socials we already mine for the X handle.
alter table targets add column if not exists website text;

-- risk_assessments held one row per target, which assumed a single risk source. Provenance is a
-- second, independent source with its own availability — folding it into the GoPlus row would
-- make one source's timeout look like the other's silence, which is exactly the confusion the
-- checked/unchecked rule exists to prevent. One row per (target, source) instead.
do $$
begin
  if not exists (
    select 1
      from pg_index i
      join pg_class c on c.oid = i.indexrelid
     where c.relname = 'risk_assessments_pkey'
       and i.indnatts = 2
  ) then
    alter table risk_assessments drop constraint if exists risk_assessments_pkey;
    alter table risk_assessments
      add constraint risk_assessments_pkey primary key (target_id, source);
  end if;
end $$;

insert into signal_config (key, value, unit, description) values
  ('provenance.reassess_hours', 168, 'hours', 'Domain registration barely changes — re-check weekly'),
  ('provenance.max_per_run',     15, 'count', 'Ceiling on provenance assessments per run'),
  ('provenance.new_domain_days',  7, 'days',  'Age below which a domain is reported as newly registered'),
  ('provenance.young_domain_days', 30, 'days', 'Age below which a domain is reported as young')
on conflict (key) do nothing;

-- Risk sources were never registered in signal_sources, so /radar/status could only ever show
-- discovery providers. Both risk sources could be down for a week and every row would read green.
insert into signal_sources (id, display_name, rate_limit_per_min) values
  ('goplus',     'Contract analysis',  30),
  ('provenance', 'Domain provenance',  10)
on conflict (id) do nothing;
