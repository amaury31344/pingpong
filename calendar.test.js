"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { event } = require("./calendar");

test("exporte une séance en UTC et protège les textes du format calendrier", () => {
  const result = event({
    id: "12345678-1234-4234-8234-123456789abc", starts_at: "2030-01-02T18:00:00+01:00",
    title: "Ping, détente\nBEGIN:VEVENT", venue: "Salle; A", city: "Lille"
  }, "2029-01-01T10:00:00Z");
  assert.match(result, /DTSTART:20300102T170000Z/);
  assert.match(result, /SUMMARY:Ping\\, détente\\nBEGIN:VEVENT/);
  assert.match(result, /LOCATION:Salle\\; A\\, Lille/);
  assert.equal((result.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.doesNotMatch(result, /DTEND:/);
});

test("plie les lignes longues sans couper les caractères UTF-8 et refuse une date invalide", () => {
  const row = { id: "12345678-1234-4234-8234-123456789abc", starts_at: "2030-01-02T17:00:00Z", title: "é".repeat(90), venue: "A", city: "B" };
  const result = event(row, "2029-01-01T10:00:00Z");
  assert.ok(result.split("\r\n").every(line => Buffer.byteLength(line) <= 75));
  assert.match(result.replace(/\r\n /g, ""), new RegExp(`SUMMARY:${row.title}`));
  assert.throws(() => event({ ...row, starts_at: "invalide" }), /Date/);
});
