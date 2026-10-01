"""Video brief: the day's singles in the exact format the cmvng video tool reads.

Drop this file next to app.py and add these two lines to app.py, after
_fl4_match_ids722 and _fl4_leg_mid722 are defined:

    import video_brief
    video_brief.register(app, get_db, require_admin, _fl4_match_ids722, _fl4_leg_mid722)

It adds one admin page, /admin/video-brief, with two tabs:

  Picks    after the morning (or evening) session: every published single with
           its price, our %, home/draw/away %, expected goals, form and goals
           a game. Copy it, then make the picks video.
  Results  after settlement: the same singles plus won/lost/void and the final
           score, with the stake split shown in dollars or naira.

It only reads. It never writes to the database and never changes settings.
Anything missing for a match is simply left out, and the video skips that line.
"""
import datetime
import html
import json

LAGOS = datetime.timezone(datetime.timedelta(hours=1))   # WAT, no daylight saving
MORNING_BEFORE_HOUR = 11                                   # same cut as _fb_session_of


def _num(v):
    try:
        f = float(v)
        return f if f == f else None
    except (TypeError, ValueError):
        return None


def _first(d, *keys):
    for k in keys:
        v = _num((d or {}).get(k))
        if v is not None:
            return v
    return None


def _pct(v):
    """0-1 or 0-100 -> 0-100, one decimal."""
    v = _num(v)
    if v is None:
        return None
    return round(v * 100 if v <= 1 else v, 1)


def _seconds(ts):
    v = _num(ts)
    if v is None:
        return None
    return v / 1000.0 if v > 1e12 else v


def _form5(rows):
    """Last five results, OLDEST first, as the video expects.

    The app stores recent_home / recent_away NEWEST first, either as rows
    ({result} or {gf, ga}) or as a plain string."""
    letters = []
    if isinstance(rows, str):
        letters = [c for c in rows.upper() if c in "WDL"]
    else:
        for r in rows or []:
            if not isinstance(r, dict):
                continue
            res = str(r.get("result") or "").strip().upper()[:1]
            if res in ("W", "D", "L"):
                letters.append(res)
                continue
            gf, ga = _num(r.get("gf")), _num(r.get("ga"))
            if gf is not None and ga is not None:
                letters.append("W" if gf > ga else "L" if gf < ga else "D")
    return "".join(reversed(letters[:5]))


def leg_to_pick(leg, study=None, final=None, results=False):
    """One saved single (a leg from selections_json) -> one pick for the video."""
    s = study or {}
    p = {
        "home": leg.get("home"),
        "away": leg.get("away"),
        "competition": leg.get("league"),
        "pick": leg.get("pick"),
        "odds": _num(leg.get("odds")),
        "model": _pct(leg.get("confidence")),
    }
    ko = _seconds(leg.get("kickoff_ts"))
    if ko:
        p["kickoff"] = datetime.datetime.fromtimestamp(ko, LAGOS).strftime("%H:%M")
    h, d, a = _pct(s.get("prob_home")), _pct(s.get("prob_draw")), _pct(s.get("prob_away"))
    if None not in (h, d, a):
        p.update(home_win=h, draw=d, away_win=a)
    xh, xa = _num(s.get("exp_home")), _num(s.get("exp_away"))
    if xh is not None and xa is not None:
        p.update(xg_home=round(xh, 2), xg_away=round(xa, 2))
    fh = _form5(s.get("recent_home") or s.get("home_form") or s.get("home_form_str"))
    fa = _form5(s.get("recent_away") or s.get("away_form") or s.get("away_form_str"))
    if fh and fa:
        p.update(form_home=fh, form_away=fa)
    for side in ("home", "away"):
        sc = _first(s, side + "_goals_scored_avg", side + "_gf", "fb_" + side + "_gf_avg")
        co = _first(s, side + "_goals_conceded_avg", side + "_ga", "fb_" + side + "_ga_avg")
        if sc is not None:
            p["scored_" + side] = round(sc, 2)
        if co is not None:
            p["conceded_" + side] = round(co, 2)
    if results:
        r = str(leg.get("result") or "").lower()
        p["result"] = r if r in ("won", "lost", "void") else "pending"
        if final and final.get("hs") is not None and final.get("aw") is not None:
            p["score"] = "{}-{}".format(int(final["hs"]), int(final["aw"]))
    return {k: v for k, v in p.items() if v not in (None, "")}


def build_brief(legs, day, mode="picks", study_for=None, final_for=None, stake_example=None,
                currency=None, currency_word=None):
    """legs -> the full file the video tool reads (picks or results)."""
    results = mode == "results"
    picks = [leg_to_pick(l, study_for(l) if study_for else None,
                         final_for(l) if (final_for and results) else None, results) for l in legs]
    picks = [p for p in picks if p.get("home") and p.get("away") and p.get("pick")
             and (p.get("odds") or 0) > 1 and p.get("model") is not None]
    comps = {p.get("competition") for p in picks}
    out = {"date": day}
    if results:
        out["mode"] = "results"
    if len(comps) == 1 and None not in comps:
        out["competition"] = comps.pop()
    if stake_example:
        out.update(stake_example=stake_example, currency=currency, currency_word=currency_word)
    if results and any(p["result"] == "pending" for p in picks):
        out["note_check"] = "Some games are not settled yet. Wait, or remove them before making the video."
    out["picks"] = picks
    return out


def todays_legs(conn, day, session="morning"):
    """Published singles for one Lagos date, newest batch first, one per match + pick.

    session: 'morning', 'evening' or 'all' (by when the batch was saved, Lagos time)."""
    rows = conn.run(
        "SELECT id, created_at, selections_json FROM sportybet_accumulators "
        "WHERE tier = 'singles' AND match_date = :d ORDER BY id DESC", d=day)
    seen, legs = set(), []
    for _id, created_at, sel in rows:
        if session != "all" and created_at is not None:
            hour = created_at.astimezone(LAGOS).hour if created_at.tzinfo else created_at.hour
            if (session == "morning") != (hour < MORNING_BEFORE_HOUR):
                continue
        try:
            batch = json.loads(sel) if isinstance(sel, str) else (sel or [])
        except ValueError:
            continue
        for leg in batch:
            if not isinstance(leg, dict) or not leg.get("code722"):
                continue                      # not published (no booking code)
            key = (leg.get("sb_event_id") or leg.get("match"), leg.get("pick"))
            if key in seen:
                continue                      # an older copy of the same single
            seen.add(key)
            legs.append(leg)
    legs.sort(key=lambda l: _seconds(l.get("kickoff_ts")) or 0)
    return legs


MONEY = {"usd": (100, "$", "dollars"), "ngn": (10000, "₦", "naira")}

PAGE = """<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Video brief</title><style>
body{{margin:0;background:#0B1020;color:#E7ECF6;font:16px/1.5 system-ui,sans-serif}}
main{{max-width:900px;margin:0 auto;padding:24px 16px}}
a{{color:#6E9BFF}} nav a{{margin-right:14px}} nav a.on{{color:#fff;font-weight:700;text-decoration:none}}
.box{{background:#131A2E;border:1px solid #243052;border-radius:14px;padding:16px;margin:16px 0}}
textarea{{width:100%;box-sizing:border-box;min-height:420px;background:#0B1020;color:#E7ECF6;border:1px solid #243052;border-radius:10px;padding:12px;font:13px/1.45 ui-monospace,monospace}}
button{{background:#3B6BFF;color:#fff;border:0;border-radius:10px;padding:12px 18px;font-weight:700;font-size:15px;cursor:pointer}}
.muted{{color:#8A96B3;font-size:14px}} table{{width:100%;border-collapse:collapse;font-size:14px}} td{{padding:6px 4px;border-top:1px solid #243052}}
</style></head><body><main>
<h1>Video brief · {day}</h1>
<nav>{tabs}</nav>
<div class="box"><table>{rows}</table><p class="muted">{count} singles · {note}</p></div>
<div class="box"><button onclick="navigator.clipboard.writeText(document.getElementById('j').value);this.textContent='Copied ✓'">Copy for the video</button>
<p class="muted">Paste into Claude Code with the cmvng video tool and say "make the video", or save as today.json and run: node video/make-video.mjs today.json</p>
<textarea id="j" readonly>{json}</textarea></div>
</main></body></html>"""


def render_page(day, mode, session, money, brief):
    q = lambda **kw: "?" + "&".join("{}={}".format(k, v) for k, v in dict(
        {"date": day, "mode": mode, "session": session, "money": money}, **kw).items())
    tabs = "".join('<a class="{}" href="{}">{}</a>'.format("on" if on else "", href, label) for label, href, on in (
        ("Picks", q(mode="picks"), mode == "picks"), ("Results", q(mode="results"), mode == "results"),
        ("Morning", q(session="morning"), session == "morning"), ("Evening", q(session="evening"), session == "evening"),
        ("All day", q(session="all"), session == "all"),
        ("$", q(money="usd"), money == "usd"), ("₦", q(money="ngn"), money == "ngn")))
    rows = "".join("<tr><td>{}</td><td>{} v {}</td><td>{}</td><td>{}</td><td>{}</td></tr>".format(
        html.escape(p.get("kickoff", "")), html.escape(p["home"]), html.escape(p["away"]), html.escape(p["pick"]),
        "{:.2f}".format(p["odds"]), html.escape(p.get("result", "{:.0f}%".format(p["model"])))) for p in brief["picks"])
    note = brief.get("note_check") or "Check it before you post."
    return PAGE.format(day=html.escape(day), tabs=tabs, rows=rows or "<tr><td>No published singles for this day yet.</td></tr>",
                       count=len(brief["picks"]), note=html.escape(note),
                       json=html.escape(json.dumps(brief, indent=2, ensure_ascii=False)))


def _json(v):
    if isinstance(v, (dict, list)):
        return v
    try:
        return json.loads(v) if v else None
    except (TypeError, ValueError):
        return None


def catalogue_rows(conn, day, legs, match_ids, leg_mid):
    """{id(leg): (stats_json, final_json)} from match_catalogue, via the app's own lookups."""
    ids, out = match_ids(conn, day), {}
    for leg in legs:
        mid = leg_mid(ids, leg)
        if mid is None:
            continue
        rows = conn.run("SELECT stats_json, final_json FROM match_catalogue WHERE id = :i", i=mid) or []
        if rows:
            out[id(leg)] = (_json(rows[0][0]), _json(rows[0][1]))
    return out


def register(app, get_db, require_admin, match_ids, leg_mid):
    from flask import request

    @app.route("/admin/video-brief")
    @require_admin
    def admin_video_brief():
        day = request.args.get("date") or datetime.datetime.now(LAGOS).strftime("%Y-%m-%d")
        mode = "results" if request.args.get("mode") == "results" else "picks"
        session = request.args.get("session") if request.args.get("session") in ("morning", "evening", "all") else "morning"
        money = request.args.get("money") if request.args.get("money") in MONEY else ("usd" if mode == "results" else "ngn")
        conn = None
        try:
            conn = get_db()
            legs = todays_legs(conn, day, session)
            cat = catalogue_rows(conn, day, legs, match_ids, leg_mid)
            stake, cur, word = MONEY[money]
            brief = build_brief(legs, day, mode,
                                study_for=lambda l: (cat.get(id(l)) or (None, None))[0],
                                final_for=lambda l: (cat.get(id(l)) or (None, None))[1],
                                stake_example=stake, currency=cur, currency_word=word)
        finally:
            if conn is not None:
                try:
                    conn.close()
                except Exception:
                    pass
        return render_page(day, mode, session, money, brief)

    return admin_video_brief
