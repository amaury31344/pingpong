"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { matchDelta } = require("./ranking.js");

test("exemples officiels : victoire normale et performance", () => {
  assert.equal(matchDelta(2015, 1955, "win", 1.25), 6.25);
  assert.equal(matchDelta(1955, 2015, "loss", 1.25), -5);
  assert.equal(matchDelta(1250, 1418, "win", 1), 13);
  assert.equal(matchDelta(1418, 1250, "loss", 1), -10);
});

test("gère les seuils, points égaux et coefficients", () => {
  assert.equal(matchDelta(500, 524.99, "win", 1), 6);
  assert.equal(matchDelta(500, 525, "win", 0.5), 3.5);
  assert.equal(matchDelta(500, 500, "loss", 1), -5);
  assert.equal(matchDelta(1000, 500, "win", 1), 0);
  assert.equal(matchDelta(500, 1000, "win", 1), 40);
  assert.equal(matchDelta(1000, 500, "loss", 1), -29);
});

test("rejette les entrées invalides", () => {
  assert.throws(() => matchDelta(NaN, 500, "win", 1));
  assert.throws(() => matchDelta(500, 500, "draw", 1));
  assert.throws(() => matchDelta(500, 500, "win", 0));
});
