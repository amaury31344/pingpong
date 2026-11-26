"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildProfile } = require("./directory-core.js");

const data = {
  profile: { startingPoints: 600, firstName: "Privé", license: "secret" },
  matches: [
    { date: "2026-09-01", kind: "official", result: "win", delta: 6, opponent: "Secret", notes: "Privé" },
    { date: "2026-09-03", kind: "friendly", result: "loss", delta: 0, opponent: "Secret" }
  ],
  players: [{ name: "Secret", contact: "Privé" }]
};

test("seuls les champs choisis et les matchs sans adversaire sont partagés", () => {
  const result = buildProfile(data, { name: " Alex ", club: " Club ", points: true, stats: true, matches: true });
  assert.deepEqual(result, {
    p_name: "Alex", p_club: "Club", p_points: 606, p_played: 2, p_wins: 1,
    p_matches: [{ date: "2026-09-03", result: "loss", kind: "friendly" }, { date: "2026-09-01", result: "win", kind: "official" }]
  });
  assert.doesNotMatch(JSON.stringify(result), /secret|privé/i);
});

test("les champs facultatifs restent privés par défaut et les points nécessitent une base", () => {
  assert.deepEqual(buildProfile(data, { name: "Alex", club: "", points: false, stats: false, matches: false }), {
    p_name: "Alex", p_club: null, p_points: null, p_played: null, p_wins: null, p_matches: null
  });
  assert.throws(() => buildProfile({ ...data, profile: null }, { name: "Alex", club: "", points: true }));
  assert.throws(() => buildProfile(data, { name: " ", club: "" }));
});

test("le partage des rencontres est limité aux dix dernières", () => {
  const matches = Array.from({ length: 11 }, (_, i) => ({ date: `2026-09-${String(i + 1).padStart(2, "0")}`, kind: "friendly", result: "win", delta: 0 }));
  const profile = buildProfile({ ...data, matches }, { name: "Alex", club: "", matches: true });
  assert.equal(profile.p_matches.length, 10);
  assert.equal(profile.p_matches[0].date, "2026-09-11");
  assert.equal(profile.p_matches.at(-1).date, "2026-09-02");
});
