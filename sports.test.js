"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { filterMatches, summarize } = require("./sports.js");

const matches = [
  { date: "2026-09-10", kind: "official", result: "win", playerReference: 554, opponentReference: 600 },
  { date: "2026-10-10", kind: "official", result: "loss", playerReference: 554, opponentReference: 500 },
  { date: "2026-10-11", kind: "official", result: "win", playerReference: 554, opponentReference: 554 },
  { date: "2026-10-12", kind: "friendly", result: "win" },
  { date: "2026-10-13", kind: "legacy", result: "loss", opponentReference: 500 }
];

test("filtre les matchs par type, résultat et dates inclusives", () => {
  const selected = filterMatches(matches, { kind: "official", result: "win", from: "2026-10-11", to: "2026-10-11" });
  assert.equal(selected.length, 1);
  assert.equal(selected[0].opponentReference, 554);
  assert.equal(filterMatches(matches, { kind: "all", result: "all", from: "2026-11-01", to: "2026-10-01" }).length, 0);
});

test("les références absentes ne sont pas assimilées à zéro", () => {
  const summary = summarize(matches);
  assert.equal(summary.played, 5);
  assert.equal(summary.wins, 3);
  assert.deepEqual(summary.groups.higher, { played: 1, wins: 1 });
  assert.deepEqual(summary.groups.lower, { played: 1, wins: 0 });
  assert.deepEqual(summary.groups.equal, { played: 1, wins: 1 });
  assert.equal(summary.groups.unknown, 2);
});
