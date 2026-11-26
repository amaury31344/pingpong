"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
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
test("la bio et la photo sont conservées dans la sauvegarde", () => {
  const profile = { ...original.data.profile, bio: "J’aime jouer en équipe", photo: "data:image/jpeg;base64,/9j/2Q==" };
  const copy = JSON.parse(JSON.stringify({ ...original, data: { ...original.data, profile } }));
  assert.deepEqual(validateBackup(copy).profile, profile);
});
test("les sauvegardes invalides sont refusées avant toute restauration", () => {
  for (const corrupt of [
    { ...original, version: 2 },
    { ...original, data: { ...original.data, matches: "invalid" } },
    { ...original, data: { ...original.data, profile: { ...original.data.profile, bio: "a".repeat(301) } } },
    { ...original, data: { ...original.data, profile: { ...original.data.profile, photo: "data:image/svg+xml;base64,PHN2Zz4=" } } },
    { ...original, data: { ...original.data, profile: { ...original.data.profile, photo: "data:image/jpeg;base64," + "A".repeat(140001) } } },
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

test("l’export refuse une copie périmée après une modification dans un autre onglet", async () => {
  const source = fs.readFileSync("app.js", "utf8");
  const start = source.indexOf("window.PingApp = {");
  const end = source.indexOf('$("#backup-import").addEventListener', start);
  assert.ok(start >= 0 && end > start);
  const state = { stored: JSON.stringify(original.data), blob: null, downloads: 0, notice: "" };
  const button = { addEventListener(_type, callback) { this.click = callback; } };
  const context = {
    data: original.data, observedRaw: state.stored, STORAGE_KEY: "ping-points-data-v2",
    localStorage: { getItem() { return state.stored; } },
    PingBackup: { validateBackup }, window: {},
    document: { createElement() { return { click() { state.downloads++; } }; } },
    $: () => button, Blob,
    URL: { createObjectURL(blob) { state.blob = blob; return "blob:test"; }, revokeObjectURL() {} },
    setTimeout() {},
    showNotice(text) { state.notice = text; }
  };
  vm.runInNewContext(source.slice(start, end), context);
  button.click();
  assert.equal(state.downloads, 1);
  assert.deepEqual(JSON.parse(await state.blob.text()), original);

  state.stored = JSON.stringify({ ...original.data, goal: "Modification ailleurs" });
  button.click();
  assert.equal(state.downloads, 1);
  assert.match(state.notice, /autre onglet/i);
});
