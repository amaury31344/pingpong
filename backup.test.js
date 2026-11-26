"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateBackup } = require("./backup.js");

const original = {
  format: "ping-points-backup", version: 1,
  data: {
    profile: { firstName: "Alex", lastName: "Exemple", license: "", club: "Club test", city: "Ville test", startingPoints: 554 },
    matches: [{ id: "1", date: "2026-11-07", opponent: "Joueur exemple", result: "loss", kind: "official", delta: -2.5, playerReference: 554, opponentReference: 564, coefficient: 0.5, notes: "Travail de remise", score: "2-3", strength: "Service", improvement: "Remise" }],
    players: [{ id: "2", name: "Joueur exemple", city: "Ville test", club: "", contact: "" }],
    equipment: [{ id: "3", kind: "racket", name: "Raquette test", date: "2026-09-01", notes: "" }],
    goal: "Améliorer ma remise",
    goalTarget: { points: 600, dueDate: "2027-06-30" },
    arcadeRecords: { "v1:normal:touch:standard": 8 }
  }
};

test("un export peut être relu sans perdre de données", () => {
  const roundtrip = JSON.parse(JSON.stringify(original));
  assert.deepEqual(validateBackup(roundtrip), original.data);
});
test("les sauvegardes antérieures sans nouveaux champs restent lisibles", () => {
  const { goalTarget, equipment, ...data } = original.data;
  const { score, strength, improvement, ...match } = data.matches[0];
  assert.deepEqual(validateBackup({ ...original, data: { ...data, matches: [match] } }), { ...data, matches: [match] });
});
test("les sauvegardes invalides sont refusées avant toute restauration", () => {
  for (const corrupt of [
    { ...original, version: 2 },
    { ...original, data: { ...original.data, matches: "invalid" } },
    { ...original, data: { ...original.data, arcadeRecords: { "invalid": 5 } } },
    { ...original, data: { ...original.data, goalTarget: { points: 600, dueDate: "2026-02-31" } } },
    { ...original, data: { ...original.data, goalTarget: { points: -1, dueDate: "2027-06-30" } } },
    { ...original, data: { ...original.data, matches: [{ ...original.data.matches[0], date: "2026-02-31" }] } },
    { ...original, data: { ...original.data, matches: [{ ...original.data.matches[0], delta: null }] } },
    { ...original, data: { ...original.data, matches: [{ ...original.data.matches[0], score: 3 }] } },
    { ...original, data: { ...original.data, matches: [{ ...original.data.matches[0], improvement: "a".repeat(501) }] } },
    { ...original, data: { ...original.data, equipment: [{ ...original.data.equipment[0], date: "2026-02-31" }] } },
    { ...original, data: { ...original.data, equipment: [original.data.equipment[0], original.data.equipment[0]] } },
    { ...original, data: { ...original.data, equipment: [{ ...original.data.equipment[0], kind: "other" }] } }
  ]) assert.throws(() => validateBackup(corrupt));
  assert.equal(original.data.matches[0].opponent, "Joueur exemple");
});
