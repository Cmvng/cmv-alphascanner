# Deployment State — Railway

**Last verified:** 2026-08-22, re-checked after the session-5 work. Verified by direct Railway
API query and by Railway's own agent — not assumed.

## Live now

| Service | ID | State |
|---|---|---|
| **`cmv-alphascanner`** | `3b2a45a4-d698-4d66-8f33-1378d50c7051` | ✅ **SUCCESS — running.** Builds from GitHub `claude/project-audit-checkpoint-qwz18w` via Dockerfile. Serves the SPA, the `api/*` handlers and `/api/radar`. Healthcheck `/healthz` passing. |
| Domain | — | `https://cmv-alphascanner-production.up.railway.app` |

The app boots, serves, and **honestly reports `database_unavailable`** on the engine routes —
the degradation path works exactly as designed. No invented data is served.

## ⛔ Blocked: the database has never started

`Postgres-NLnO` (`573e9a60-fbc4-4ac2-a18c-580c3c9cf7cb`) was created from Railway's managed
template with a persistent volume, **but it has never been deployed**. Railway's own API says so:

> *"This service has never been deployed in any environment... no tool here can give an existing
> service its first deployment — attach a source and deploy it from the Railway dashboard."*

That is why `DATABASE_URL` resolves to nothing. **It is not a syntax problem** — the reference
`${{Postgres-NLnO.DATABASE_URL}}` is listed as valid by Railway; there is simply no running
service behind it to resolve against.

**Re-confirmed independently.** Railway's own agent was asked to deploy it and could not:
its deploy endpoint returns *"Service Instance not found"* for that service by both ID and name,
while the environment search shows the service fully configured — image
`ghcr.io/railwayapp-templates/postgres-ssl:18`, every connection variable set, and volume
`dc65671a-…` mounted at `/var/lib/postgresql/data`. The configuration is staged; no service
instance was ever created for it. Committing that is a dashboard action.

The app service confirms the downstream effect on every boot:

```
[server] DATABASE_URL not set — engine routes will report unavailable
[server] listening on :8080 | chains=solana,base,eth | db=false
```

## Why this can't be fixed from here

Four operations are gated behind the Railway dashboard and unavailable to an API/MCP token:

| Operation | Blocker |
|---|---|
| Give an existing service its first deployment | No tool supports it |
| Commit staged template changes | **Requires 2FA** |
| Delete a service | **Requires 2FA** |
| Rename a service | Not supported by the API |

## What to do — 4 clicks, ~2 minutes

In the Railway dashboard, project **`cmv-alpha-engine`** → environment **`production`**:

1. **Delete the broken `Postgres`** (`ab87d783-…`). It is a bare `postgres:16` image with no
   credentials and no volume, and its logs show it crash-looping on
   `Error: Database is uninitialized and superuser password is not specified.` Created by
   mistake, superseded. *This also frees the name.*

   > **Do not "fix" it by setting `POSTGRES_PASSWORD`.** It has no volume, so it would lose every
   > row on each redeploy while looking perfectly healthy — and outcome tracking measures forward
   > over seven days. A database that silently resets under a system built to record history is
   > worse than no database. It would also force `DATABASE_URL` to be composed by hand from a
   > pasted credential, against the reference-variable rule.
2. **Delete the empty `app` service** (`56d05f8e-…`). Never deployed, no source. Leftover.
3. **Deploy `Postgres-NLnO`** — click into it and apply/deploy the staged template. It already has
   the volume (`dc65671a-…` at `/var/lib/postgresql/data`) and all connection variables.
4. **Rename `Postgres-NLnO` → `Postgres`** *(optional but tidier)*. If you do, also update
   `cmv-alphascanner`'s `DATABASE_URL` to `${{Postgres.DATABASE_URL}}`. If you skip the rename,
   leave the variable pointing at `Postgres-NLnO`.

Then redeploy `cmv-alphascanner`. On boot the logs should read:

```
[server] migrations applied
[server] listening on :8080 | chains=solana,base,eth | db=true
[server] scheduler started (10m cadence, no platform cap)
```

The schema applies itself on boot (`db/migrations/0001_alpha_engine.sql` is idempotent), the
ingest job runs ~5s later, and `/api/radar` starts returning targets within one cycle.

## Verify it worked

```
curl https://cmv-alphascanner-production.up.railway.app/healthz
# expect: {"ok":true,"database":true,...}

curl https://cmv-alphascanner-production.up.railway.app/api/radar/status
# expect: health rows for geckoterminal, dexscreener, mintlogs, goplus and provenance,
#         plus the last run of each of the 11 scheduled jobs
```

This is also the **first real verification the engine has ever had.** Everything built so far
typechecks and passes 34 tests, but no provider has been called for real: this sandbox's egress
proxy blocks every provider domain and the Railway domain. The boot logs above and one populated
`/api/radar/status` response are what turn "written" into "observed working".

## Note on the old Vercel deployment

**Untouched and still serving.** Nothing in this migration has been pointed away from it. Cut over
DNS only once the Railway instance is confirmed healthy with a live database.
