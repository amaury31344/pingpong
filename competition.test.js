"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { confrontations, simulate } = require("./competition.js");

test("les confrontations retrouvent les matchs et leurs notes sans mélanger d'autres joueurs", () => {
  const matches = [
    { opponent: "Élodie Martin", date: "2025-01-01", notes: "service court" },
    { opponent: "Elodie  Martin", date: "2026-01-01", notes: "remise longue" },
    { opponent: "Élodie Martinot", date: "2026-02-01" }
  ];
  assert.deepEqual(confrontations(matches, "elodie martin").map(m => m.notes), ["remise longue", "service court"]);
  assert.deepEqual(confrontations(matches, " "), []);
});

test("le simulateur calcule les deux résultats avec des points de référence fixes", () => {
  const rows = simulate(500, 1, "Alice ; 500\nBob ; 600,5");
  assert.deepEqual(rows.map(({ win, loss }) => [win, loss]), [[6, -5], [10, -3]]);
  assert.throws(() => simulate(500, 1, "Alice ; "));
  assert.throws(() => simulate(500, 1, "Alice ; 5001"));
  assert.throws(() => simulate(500, 1, ""));
});
