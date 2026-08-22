-- 0009_watchlist.sql — watchlist and operator feedback (§27). Idempotent.
--
-- There are no user accounts in this product, and inventing one for a watchlist would be the
-- wrong trade. What exists is an operator, already authenticated by the admin session. So the
-- watchlist is owner-scoped: one list, gated by the same HMAC token that gates deletes. That
-- keeps the standing rule intact — no new unauthenticated route that writes data.

create table if not exists watchlist (
  target_id  uuid primary key references targets(id) on delete cascade,
  note       text,
  added_at   timestamptz not null default now()
);
create index if not exists watchlist_added_idx on watchlist (added_at desc);

-- Feedback is APPEND-ONLY. Overwriting would destroy the thing that makes it useful: whether a
-- judgement changed after the fact. "Looked like noise on day one, turned out to matter" is a
-- different and more informative record than a single final verdict.
create table if not exists target_feedback (
  id          uuid primary key default gen_random_uuid(),
  target_id   uuid not null references targets(id) on delete cascade,
  -- Deliberately about the SIGNAL, not about the token. "Was surfacing this worth your
  -- attention?" is answerable; "was this a good investment?" is not, and asking it would drag
  -- price prediction back into a system built to avoid it.
  verdict     text not null check (verdict in ('useful', 'noise', 'already_knew', 'wrong_risk')),
  note        text,
  -- Snapshot of what the engine believed AT THE MOMENT of the judgement. Without this the
  -- feedback cannot be compared against anything later — the scores it referred to will have
  -- moved on (§50, no look-ahead).
  heat_at     numeric,
  alpha_at    int,
  sources_at  text[],
  created_at  timestamptz not null default now()
);
create index if not exists target_feedback_target_idx on target_feedback (target_id, created_at desc);
create index if not exists target_feedback_verdict_idx on target_feedback (verdict, created_at desc);
