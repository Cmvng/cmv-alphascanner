"""python3 -m unittest video/app-page/test_video_brief.py  (from the repo root)

Feeds legs shaped like the app's saved singles through the brief, then checks the
video tool itself accepts the output (node video/lib/input.mjs)."""
import datetime
import json
import os
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(__file__))
import video_brief as vb  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
UTC = datetime.timezone.utc


def leg(home, away, pick, odds, conf, eid, ko_h, result="pending", code="ABC123"):
    ko = datetime.datetime(2026, 10, 1, ko_h, 45, tzinfo=UTC).timestamp() * 1000   # ms, like the app
    return {"match": home + " vs " + away, "home": home, "away": away, "league": "UEFA Nations League",
            "pick": pick, "odds": odds, "confidence": conf, "sb_event_id": eid, "kickoff_ts": ko,
            "result": result, "code722": code}


STUDY = {"prob_home": 0.79, "prob_draw": 0.15, "prob_away": 0.06, "exp_home": 2.493, "exp_away": 0.66,
         "recent_home": [{"gf": 2, "ga": 0}, {"result": "L"}, {"gf": 1, "ga": 1}, {"gf": 3, "ga": 1}, {"gf": 0, "ga": 2}, {"gf": 5, "ga": 0}],
         "recent_away": "DWLWLW", "home_goals_scored_avg": 2.5, "away_gf": 1.1, "fb_home_ga_avg": 0.7, "away_goals_conceded_avg": 1.4}


class FakeConn:
    def __init__(self, rows):
        self.rows = rows

    def run(self, sql, **kw):
        assert "tier = 'singles'" in sql and kw == {"d": "2026-10-01"}
        return self.rows


def node_check(brief):
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(brief, f, ensure_ascii=False)
    js = ("import('./video/lib/input.mjs').then(m=>{const r=m.loadInput(process.argv[1]);"
          "console.log(JSON.stringify({n:r.picks.length,won:r.recap.won,ret:r.recap.returned,mode:r.cfg.mode}))})")
    out = subprocess.run(["node", "-e", js, f.name], cwd=ROOT, capture_output=True, text=True)
    os.unlink(f.name)
    if out.returncode:
        raise AssertionError(out.stderr)
    return json.loads(out.stdout)


class Brief(unittest.TestCase):
    def test_leg_to_pick(self):
        p = vb.leg_to_pick(leg("Germany", "Serbia", "Germany to Win", 1.21, 80, "e1", 18), STUDY)
        self.assertEqual(p["kickoff"], "19:45")                       # 18:45 UTC -> Lagos
        self.assertEqual((p["home_win"], p["draw"], p["away_win"]), (79.0, 15.0, 6.0))
        self.assertEqual((p["xg_home"], p["xg_away"]), (2.49, 0.66))
        self.assertEqual(p["form_home"], "LWDLW")                     # newest-first rows -> last 5, oldest first
        self.assertEqual(p["form_away"], "LWLWD")
        self.assertEqual((p["scored_home"], p["scored_away"], p["conceded_home"], p["conceded_away"]), (2.5, 1.1, 0.7, 1.4))
        self.assertNotIn("result", p)

    def test_todays_legs_dedupes_filters_and_sorts(self):
        morning = datetime.datetime(2026, 10, 1, 6, 40, tzinfo=UTC)
        evening = datetime.datetime(2026, 10, 1, 14, 40, tzinfo=UTC)
        rows = [
            (3, evening, json.dumps([leg("Wales", "Norway", "DC X2", 1.13, 92, "e3", 18)])),
            (2, morning, json.dumps([leg("Israel", "Kosovo", "Over 1.5", 1.28, 84, "e2", 16),
                                     leg("Germany", "Serbia", "Germany to Win", 1.21, 80, "e1", 18, code=None)])),
            (1, morning, json.dumps([leg("Israel", "Kosovo", "Over 1.5", 1.30, 83, "e2", 16)])),   # older copy
        ]
        got = vb.todays_legs(FakeConn(rows), "2026-10-01", "morning")
        self.assertEqual([(l["home"], l["odds"]) for l in got], [("Israel", 1.28)])
        self.assertEqual(len(vb.todays_legs(FakeConn(rows), "2026-10-01", "all")), 2)
        self.assertEqual([l["home"] for l in vb.todays_legs(FakeConn(rows), "2026-10-01", "evening")], ["Wales"])

    def test_picks_brief_is_accepted_by_the_video_tool(self):
        legs = [leg("Germany", "Serbia", "Germany to Win", 1.21, 80, "e1", 18), leg("Israel", "Kosovo", "Over 1.5", 1.28, 84, "e2", 16)]
        brief = vb.build_brief(legs, "2026-10-01", "picks", study_for=lambda l: STUDY, stake_example=10000, currency="₦", currency_word="naira")
        self.assertEqual(brief["competition"], "UEFA Nations League")
        self.assertEqual(node_check(brief), {"n": 2, "mode": "picks"})

    def test_results_brief(self):
        legs = [leg("Germany", "Serbia", "Germany to Win", 1.21, 80, "e1", 18, "won"),
                leg("Israel", "Kosovo", "Over 1.5", 1.28, 84, "e2", 16, "lost")]
        finals = {"e1": {"hs": 3, "aw": 0}, "e2": {"hs": 0, "aw": 1}}
        brief = vb.build_brief(legs, "2026-10-01", "results", final_for=lambda l: finals[l["sb_event_id"]],
                               stake_example=100, currency="$", currency_word="dollars")
        self.assertEqual([(p["result"], p["score"]) for p in brief["picks"]], [("won", "3-0"), ("lost", "0-1")])
        self.assertNotIn("note_check", brief)
        r = node_check(brief)
        self.assertEqual((r["n"], r["won"], r["mode"]), (2, 1, "results"))
        self.assertAlmostEqual(r["ret"], 25 * 1.21, places=2)        # 1 bar + 3 bars on $100: one bar $25, Germany $25

    def test_unsettled_game_is_flagged(self):
        brief = vb.build_brief([leg("A", "B", "A to Win", 2.0, 55, "e9", 18)], "2026-10-01", "results")
        self.assertEqual(brief["picks"][0]["result"], "pending")
        self.assertIn("not settled", brief["note_check"])

    def test_page_renders_and_escapes(self):
        brief = vb.build_brief([leg("A&B", "<C>", "A to Win", 2.0, 55, "e9", 18)], "2026-10-01", "picks")
        page = vb.render_page("2026-10-01", "picks", "morning", "ngn", brief)
        self.assertIn("A&amp;B v &lt;C&gt;", page)
        self.assertIn("Copy for the video", page)
        self.assertNotIn("<C>", page)


if __name__ == "__main__":
    unittest.main()
